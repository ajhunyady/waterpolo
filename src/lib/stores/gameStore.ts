import { writable, get } from 'svelte/store';
import { settingsStore } from '$lib/stores/settingsStore';
import { v4 as uuid } from 'uuid';
import { saveJSON, loadJSON, remove, listKeys } from '$lib/persist';
import type {
  ID,
  Player,
  Team,
  GameMeta,
  GameData,
  GamesIndexEntry,
  StatEvent,
  StatType,
  CreateGameArgs,
  AddEventArgs,
  GameStoreApi
} from '$lib/types';

/* ------------------------------------------------------------------ */
/*  Storage Keys                                                       */
/* ------------------------------------------------------------------ */

const GAMES_INDEX_KEY = 'games_index';
function gameKey(id: ID) {
  return `game_${id}`;
}

/* ------------------------------------------------------------------ */
/*  Index helpers                                                      */
/* ------------------------------------------------------------------ */

function loadIndex(): GamesIndexEntry[] {
  return loadJSON<GamesIndexEntry[]>(GAMES_INDEX_KEY, []);
}

function saveIndex(ix: GamesIndexEntry[]) {
  saveJSON(GAMES_INDEX_KEY, ix);
}

/**
 * Optionally scan localStorage for orphaned game_* keys that
 * are not referenced in the index (can drift if user clears
 * part of storage). Not invoked by default.
 */
function refreshIndex() {
  const ix = loadIndex();
  const set = new Set(ix.map((e) => e.id));
  const keys = listKeys?.() ?? [];
  let changed = false;
  for (const k of keys) {
    if (k.startsWith('game_')) {
      const id = k.slice(5);
      if (!set.has(id as ID)) {
        // remove orphaned game key OR (alternatively) add it back to index
        // remove(k);
        // OR attempt to resurrect (commented out by default)
        // const data = loadJSON<GameData | null>(k, null);
        // if (data) {
        //   ix.push({
        //     id: data.meta.id,
        //     opponentName: data.meta.opponentName,
        //     date: data.meta.date,
        //     createdAt: data.meta.createdAt,
        //     updatedAt: data.meta.updatedAt
        //   });
        //   changed = true;
        // }
      }
    }
  }
  if (changed) saveIndex(ix);
}

/* ------------------------------------------------------------------ */
/*  Raw game persistence                                               */
/* ------------------------------------------------------------------ */

function loadGameData(id: ID): GameData | null {
  return loadJSON<GameData | null>(gameKey(id), null);
}

function saveGameData(g: GameData) {
  saveJSON(gameKey(g.meta.id), g);
}

function deleteGameData(id: ID) {
  remove(gameKey(id));
}

/* ------------------------------------------------------------------ */
/*  Utilities                                                          */
/* ------------------------------------------------------------------ */

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

/** create opponent pseudo-team */
function mkOpponent(name?: string): Team {
  return {
    id: uuid(),
    name: name ?? 'Opponent',
    players: [],
    isOpponent: true
  };
}

/** Normalize create args & fill defaults */
function normalizeCreateArgs({
  homeTeamName,
  players,
  opponentName,
  date = todayISO(),
  periods,
  autoShotOnGoal,
  trackOpponentPlayers,
  location,
  overtimePeriods,
  shootoutEnabled
}: CreateGameArgs) {
  const s = get(settingsStore);
  return {
    homeTeamName,
    players,
    opponentName,
    date,
    periods: periods ?? s.defaultPeriods,
    autoShotOnGoal: autoShotOnGoal ?? s.autoShotOnGoal,
    trackOpponentPlayers: trackOpponentPlayers ?? s.trackOpponentPlayers,
    location,
    overtimePeriods: overtimePeriods ?? s.defaultOvertimePeriods,
    shootoutEnabled: shootoutEnabled ?? s.defaultShootoutEnabled
  };
}

/**
 * Sequential clock backfill for legacy games that lack `clock`.
 * We reset a separate counter for each *period* so historical data displays correctly.
 */
function backfillClocks(g: GameData): GameData {
  if (g.events.every((e) => typeof e.clock === 'number')) return g;
  const counters = new Map<number, number>(); // per-period counters
  const events = g.events.map((e) => {
    if (typeof e.clock === 'number') return e;
    const cur = counters.get(e.period) ?? 0;
    counters.set(e.period, cur + 1);
    return { ...e, clock: cur };
  });
  return { ...g, events };
}

/**
 * Compute the next clock second *within the specified period*.
 * If `explicit` is provided, use it; otherwise find the max clock among events in that period.
 * First event in a new period => 0.
 */
function nextClock(g: GameData, period: number, explicit?: number): number {
  if (typeof explicit === 'number' && explicit >= 0) return explicit;
  let max = -1;
  for (const e of g.events) {
    if (e.period !== period) continue;
    if (typeof e.clock === 'number' && e.clock > max) max = e.clock;
  }
  return max + 1;
}

/** Sort helper — ensure events are in ascending (period, clock) order. */
function sortEventsByClock(events: StatEvent[]): StatEvent[] {
  return [...events].sort((a, b) => {
    if (a.period !== b.period) return a.period - b.period;
    const ca = typeof a.clock === 'number' ? a.clock : Number.MAX_SAFE_INTEGER;
    const cb = typeof b.clock === 'number' ? b.clock : Number.MAX_SAFE_INTEGER;
    if (ca !== cb) return ca - cb;
    return a.ts - b.ts;
  });
}

/* ------------------------------------------------------------------ */
/*  Svelte stores                                                      */
/* ------------------------------------------------------------------ */

const games = writable<GamesIndexEntry[]>(loadIndex());
const currentGame = writable<GameData | null>(null);

/* internal undo stack for *events only* (page layer extends undo) */
const undoStack: ID[] = [];

/* ------------------------------------------------------------------ */
/*  CRUD                                                               */
/* ------------------------------------------------------------------ */

/**
 * Create new game, persist metadata & full object, update index and set as current.
 */
async function createGame(init: CreateGameArgs): Promise<ID> {
  const {
    homeTeamName,
    players,
    opponentName,
    date,
    periods,
    autoShotOnGoal,
    trackOpponentPlayers,
    location,
    overtimePeriods,
    shootoutEnabled
  } = normalizeCreateArgs(init);

  const id = uuid();
  const now = Date.now();

  const meta: GameMeta = {
    id,
    createdAt: now,
    updatedAt: now,
    date,
    location,
    opponentName,
    periods,
    autoShotOnGoal,
    trackOpponentPlayers,
    overtimePeriods,
    shootoutEnabled,
    totalPeriods: periods + (overtimePeriods ?? 0) + (shootoutEnabled ? 1 : 0)
  };

  const home: Team = {
    id: uuid(),
    name: homeTeamName,
    players: players.map((p) => ({ ...p, id: p.id ?? uuid() }))
  };

  const opponent: Team = mkOpponent(opponentName);

  const game: GameData = {
    meta,
    home,
    opponent,
    events: []
  };

  saveGameData(game);

  const entry: GamesIndexEntry = {
    id,
    opponentName,
    date,
    createdAt: now,
    updatedAt: now
  };
  games.update((g) => {
    const arr = [...g, entry];
    saveIndex(arr);
    return arr;
  });

  currentGame.set(game);
  return id;
}

/**
 * Load a game by id, migrating clocks if needed, and set as current.
 * Returns null if not found.
 */
async function loadGame(id: ID): Promise<GameData | null> {
  const raw = loadGameData(id);
  if (!raw) {
    currentGame.set(null);
    return null;
  }
  const migrated = backfillClocks(raw);
  if (migrated !== raw) {
    saveGameData(migrated);
  }
  currentGame.set(migrated);
  return migrated;
}

/**
 * Persist updated game object and update index metadata entry.
 */
async function saveGame(g: GameData): Promise<void> {
  g.meta.updatedAt = Date.now();
  saveGameData(g);

  games.update((ix) => {
    const i = ix.findIndex((e) => e.id === g.meta.id);
    const entry: GamesIndexEntry = {
      id: g.meta.id,
      opponentName: g.meta.opponentName,
      date: g.meta.date,
      createdAt: g.meta.createdAt,
      updatedAt: g.meta.updatedAt
    };
    if (i !== -1) {
      ix[i] = entry;
      saveIndex(ix);
      return [...ix];
    } else {
      const arr = [...ix, entry];
      saveIndex(arr);
      return arr;
    }
  });

  // set a *new object* to ensure reactivity
  currentGame.set({ ...g, home: { ...g.home }, opponent: { ...g.opponent }, events: [...g.events] });
}

/* ------------------------------------------------------------------ */
/*  Events                                                             */
/* ------------------------------------------------------------------ */

/**
 * Append an event (and optional auto-generated shot), adjust clocks, persist.
 */
function addEvent(args: AddEventArgs): void {
  const g = get(currentGame);
  if (!g || g.meta.id !== args.gameId) return;

  const ts = args.ts ?? Date.now();
  const clock = nextClock(g, args.period, args.clock);
  const id = uuid();

  const ev: StatEvent = {
    id,
    ts,
    clock,
    gameId: args.gameId,
    teamId: args.teamId,
    playerId: args.playerId,
    type: args.type,
    period: args.period
  };

  g.events.push(ev);

  // auto-add linked SHOT if configured and ev is GOAL
  if (g.meta.autoShotOnGoal && args.type === 'GOAL' && args.playerId) {
    const shotId = uuid();
    const shot: StatEvent = {
      id: shotId,
      ts,          // same timestamp
      clock,       // same period second as goal
      gameId: g.meta.id,
      teamId: args.teamId,
      playerId: args.playerId,
      type: 'SHOT',
      period: args.period,
      linkedId: id
    };
    ev.linkedId = shotId;
    g.events.push(shot);
  }

  // Keep events in consistent order early (useful if UI reads after single add)
  g.events = sortEventsByClock(g.events);

  undoStack.push(ev.id);

  saveGame(g); // persists + updates currentGame
}

/**
 * Remove an event and any linked pair (goal/shot), then persist.
 */
function removeEvent(id: ID): void {
  const g = get(currentGame);
  if (!g) return;
  const idx = g.events.findIndex((e) => e.id === id);
  if (idx === -1) return;
  const ev = g.events[idx];

  if (ev.linkedId) {
    const idx2 = g.events.findIndex((e) => e.id === ev.linkedId);
    if (idx2 !== -1) g.events.splice(idx2, 1);
  } else {
    const linked = g.events.findIndex((e) => e.linkedId === ev.id);
    if (linked !== -1) g.events.splice(linked, 1);
  }

  g.events.splice(idx, 1);
  saveGame(g);
}

/** Undo last event (store-level only; page handles extended undo types). */
function undoLast(): void {
  const g = get(currentGame);
  if (!g || g.events.length === 0) return;
  const last = g.events[g.events.length - 1];
  removeEvent(last.id);
}

/** Update an event's clock & persist (keeps order sorted by period+clock). */
function updateEventClock(gameId: ID, eventId: ID, clock: number): void {
  const g = get(currentGame);
  if (!g || g.meta.id !== gameId) return;
  const ev = g.events.find((e) => e.id === eventId);
  if (!ev) return;
  ev.clock = clock;
  g.events = sortEventsByClock(g.events);
  saveGame(g);
}

/* ------------------------------------------------------------------ */
/*  Delete Game                                                        */
/* ------------------------------------------------------------------ */

/**
 * Permanently delete a game (record + index entry) and clear currentGame if active.
 */
async function deleteGame(id: ID): Promise<void> {
  deleteGameData(id);
  games.update((ix) => {
    const arr = ix.filter((e) => e.id !== id);
    saveIndex(arr);
    return arr;
  });
  const cur = get(currentGame);
  if (cur?.meta.id === id) currentGame.set(null);
}

/* ------------------------------------------------------------------ */
/*  Exported API                                                       */
/* ------------------------------------------------------------------ */

export const gameStore: GameStoreApi = {
  games,
  currentGame,
  createGame,
  loadGame,
  saveGame,
  deleteGame,
  addEvent,
  removeEvent,
  undoLast,
  updateEventClock
};
