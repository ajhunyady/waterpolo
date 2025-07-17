import type { Writable } from 'svelte/store';

/** Generic string identifier (UUID v4 in practice). */
export type ID = string;

/* ------------------------------------------------------------------ */
/*  Players & Teams                                                    */
/* ------------------------------------------------------------------ */

/**
 * Roster player.
 *
 * `active` — if `false`, the player is on the bench; if `true` or `undefined`,
 * the player is considered active/in play. We default undefined→active so that
 * older game records (created before bench support) behave as “all active.”
 */
export interface Player {
  id: ID;
  /** Jersey number; null allowed (unknown / not assigned). */
  number: number | null;
  name: string;
  /** Bench flag (false = bench; true/undefined = active). */
  active?: boolean;
}

/** Team definition. For opponents we usually persist an empty `players` list. */
export interface Team {
  id: ID;
  name: string;
  players: Player[];
  /** True if this represents the opponent aggregate squad. */
  isOpponent?: boolean;
}

/* ------------------------------------------------------------------ */
/*  Stat Types                                                         */
/* ------------------------------------------------------------------ */

/**
 * All supported stat event types.
 *
 * Positive-ish actions are first; negative actions last (useful for grouping).
 * DRAWN_EXCLUSION = you earned a man-up (exclusion on opponent).
 */
export type StatType =
  | 'GOAL'
  | 'SHOT'
  | 'ASSIST'
  | 'BLOCK'
  | 'STEAL'
  | 'DRAWN_EXCLUSION'
  | 'TURNOVER'
  | 'EXCLUSION';

/** Groupings used in UI layouts. */
export const POSITIVE_STATS: readonly StatType[] = [
  'GOAL',
  'SHOT',
  'ASSIST',
  'BLOCK',
  'STEAL',
  'DRAWN_EXCLUSION'
] as const;

export const NEGATIVE_STATS: readonly StatType[] = ['TURNOVER', 'EXCLUSION'] as const;

/** Sub-groups that mirror our 3-row player tile UI. */
export const PLAYER_TILE_ROW1: readonly StatType[] = ['GOAL', 'SHOT', 'ASSIST'] as const;
export const PLAYER_TILE_ROW2: readonly StatType[] = ['BLOCK', 'STEAL', 'DRAWN_EXCLUSION'] as const;
export const PLAYER_TILE_ROW3_NEG: readonly StatType[] = ['TURNOVER', 'EXCLUSION'] as const;

/* ------------------------------------------------------------------ */
/*  Event                                                              */
/* ------------------------------------------------------------------ */

/** A single logged stat action. */
export interface StatEvent {
  id: ID;
  gameId: ID;
  /** Which team generated the event. */
  teamId: ID;
  /**
   * Player that generated the event (optional for opponent aggregate
   * or team-level stats where we don’t have individual opponents).
   */
  playerId?: ID;
  type: StatType;
  /** 1-based period number. */
  period: number;
  /** Milliseconds since epoch (Date.now()). */
  ts: number;
  /**
   * Linked events: e.g., when a GOAL auto-creates a SHOT (if enabled),
   * we can link them. Not required.
   */
  linkedId?: ID;
}

/* ------------------------------------------------------------------ */
/*  Game Metadata & Data                                               */
/* ------------------------------------------------------------------ */

/** Non-game configuration captured when a game is created. */
export interface GameMeta {
  id: ID;
  createdAt: number;
  updatedAt: number;

  /** ISO date string YYYY-MM-DD. */
  date: string;

  location?: string;
  opponentName?: string;

  /** Number of regulation periods (default 4). */
  periods: number;

  /** If true, logging a GOAL auto-adds a SHOT event for that player. */
  autoShotOnGoal: boolean;

  /** Placeholder for future — track individual opponent players. */
  trackOpponentPlayers?: boolean;
}

/** Full persisted game record. */
export interface GameData {
  meta: GameMeta;
  /** Your team. */
  home: Team;
  /** Opponent aggregate. */
  opponent: Team;
  /** Timeline of all logged actions. */
  events: StatEvent[];
}

/**
 * Lightweight metadata stored in the games index list so the home page
 * can render quickly without loading full GameData for each row.
 */
export interface GamesIndexEntry {
  id: ID;
  opponentName?: string;
  date: string;
  createdAt: number;
  updatedAt: number;
}

/* ------------------------------------------------------------------ */
/*  Store API Shapes                                                   */
/* ------------------------------------------------------------------ */

/**
 * Arguments when creating a new game.
 * We require homeTeamName and players; everything else optional w/ defaults
 * (see implementation in gameStore.ts). :contentReference[oaicite:2]{index=2}
 */
export interface CreateGameArgs {
  homeTeamName: string;
  players: Player[];
  opponentName?: string;
  date?: string; // defaults to today
  periods?: number; // defaults to 4
  autoShotOnGoal?: boolean; // default true
  trackOpponentPlayers?: boolean; // default false
  location?: string;
}

/**
 * Arguments for adding an event to a game. The store fills in ts + id;
 * component callers supply the essentials. :contentReference[oaicite:3]{index=3}
 */
export interface AddEventArgs {
  gameId: ID;
  teamId: ID;
  playerId?: ID;
  type: StatType;
  period: number;
  ts?: number;
}

/**
 * GameStore public API surface (matches implementation). We keep Promise
 * return types broad to avoid churn while iterating fast; tighten later. :contentReference[oaicite:4]{index=4}
 */
export interface GameStoreApi {
  /** Index of saved games (lightweight metadata). */
  games: Writable<GamesIndexEntry[]>;

  /** Currently loaded game (full data) or null. */
  currentGame: Writable<GameData | null>;

  /**
   * Create a new game and persist it.
   * Returns the new game id.
   */
  createGame(init: CreateGameArgs): Promise<ID>;

  /** Load a game (by id) into `currentGame`. Returns loaded game (or null). */
  loadGame(id: ID): Promise<GameData | null>;

  /** Persist a full game record (replace existing). */
  saveGame(g: GameData): Promise<void>;

  /** Delete a game and update index. */
  deleteGame(id: ID): Promise<void>;

  /** Append a stat event (auto-SHOT logic handled internally). */
  addEvent(e: AddEventArgs): void;

  /** Remove an event by id (handles linked events). */
  removeEvent(id: ID): void;

  /** Undo the most recent event (store tracks its own stack). */
  undoLast(): void;
}
