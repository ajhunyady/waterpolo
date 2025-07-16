import { writable, get } from 'svelte/store';
import { v4 as uuid } from 'uuid';
import { saveJSON, loadJSON, remove, listKeys } from '$lib/persist';
import type { ID, Player, GameMeta, GameData, GamesIndexEntry, StatEvent, GameStoreApi } from '$lib/types';

const GAMES_INDEX_KEY = 'games_index';

function loadIndex(): GamesIndexEntry[] {
  return loadJSON<GamesIndexEntry[]>(GAMES_INDEX_KEY, []);
}

function saveIndex(ix: GamesIndexEntry[]) {
  saveJSON(GAMES_INDEX_KEY, ix);
}

function gameKey(id: ID) {
  return `game_${id}`;
}

function loadGameData(id: ID): GameData | null {
  return loadJSON<GameData | null>(gameKey(id), null);
}

function saveGameData(g: GameData) {
  saveJSON(gameKey(g.meta.id), g);
}

function deleteGameData(id: ID) {
  remove(gameKey(id));
}

// --- Svelte stores ---
const games = writable<GamesIndexEntry[]>(loadIndex());
const currentGame = writable<GameData | null>(null);

async function createGame(init: Partial<GameMeta> & { homeTeamName: string; players: Player[] }): Promise<ID> {
  const id = uuid();
  const now = Date.now();
  const meta: GameMeta = {
    id,
    createdAt: now,
    updatedAt: now,
    date: init.date ?? new Date().toISOString().slice(0, 10),
    location: init.location,
    opponentName: init.opponentName ?? 'Opponent',
    periods: init.periods ?? 4,
    autoShotOnGoal: init.autoShotOnGoal ?? true,
    trackOpponentPlayers: init.trackOpponentPlayers ?? false,
  };

  const home = {
    id: uuid(),
    name: init.homeTeamName,
    players: init.players.map((p) => ({ ...p, id: p.id ?? uuid() })),
  };

  const opponent = {
    id: uuid(),
    name: meta.opponentName ?? 'Opponent',
    players: [],
    isOpponent: true,
  };

  const game: GameData = { meta, home, opponent, events: [] };
  saveGameData(game);

  const entry: GamesIndexEntry = {
    id,
    opponentName: meta.opponentName,
    date: meta.date,
    createdAt: now,
    updatedAt: now,
  };
  games.update((g) => {
    const arr = [...g, entry];
    saveIndex(arr);
    return arr;
  });

  currentGame.set(game);
  return id;
}

async function loadGame(id: ID): Promise<GameData | null> {
  const g = loadGameData(id);
  currentGame.set(g);
  return g;
}

async function saveGame(g: GameData): Promise<void> {
  g.meta.updatedAt = Date.now();
  saveGameData(g);
  games.update((ix) => {
    const i = ix.findIndex((e) => e.id === g.meta.id);
    if (i !== -1) {
      ix[i] = {
        id: g.meta.id,
        opponentName: g.meta.opponentName,
        date: g.meta.date,
        createdAt: g.meta.createdAt,
        updatedAt: g.meta.updatedAt,
      };
    }
    saveIndex(ix);
    return [...ix];
  });
  currentGame.set({ ...g });
}

function addEvent(e: Omit<StatEvent, 'id' | 'ts'> & { ts?: number }) {
  const g = get(currentGame);
  if (!g) return;
  const ev: StatEvent = {
    id: uuid(),
    ts: e.ts ?? Date.now(),
    ...e,
  };
  g.events.push(ev);

  // auto-add linked SHOT if configured and ev is GOAL
  if (g.meta.autoShotOnGoal && e.type === 'GOAL') {
    const shot: StatEvent = {
      id: uuid(),
      ts: ev.ts,
      gameId: g.meta.id,
      teamId: e.teamId,
      playerId: e.playerId,
      type: 'SHOT',
      period: e.period,
      linkedId: ev.id,
    };
    ev.linkedId = shot.id;
    g.events.push(shot);
  }

  saveGame(g);
}

function removeEvent(id: ID) {
  const g = get(currentGame);
  if (!g) return;
  const idx = g.events.findIndex((e) => e.id === id);
  if (idx === -1) return;
  const ev = g.events[idx];

  // if this event has a linked event, remove that too
  if (ev.linkedId) {
    const idx2 = g.events.findIndex((e) => e.id === ev.linkedId);
    if (idx2 !== -1) g.events.splice(idx2, 1);
  } else {
    // check reverse linkage: if some other event links to this one
    const linked = g.events.findIndex((e) => e.linkedId === ev.id);
    if (linked !== -1) g.events.splice(linked, 1);
  }

  g.events.splice(idx, 1);
  saveGame(g);
}

function undoLast() {
  const g = get(currentGame);
  if (!g || g.events.length === 0) return;
  const last = g.events[g.events.length - 1];
  removeEvent(last.id);
}

async function deleteGame(id: ID) {
  deleteGameData(id);
  games.update((ix) => {
    const arr = ix.filter((e) => e.id !== id);
    saveIndex(arr);
    return arr;
  });
  const cur = get(currentGame);
  if (cur?.meta.id === id) currentGame.set(null);
}

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
};