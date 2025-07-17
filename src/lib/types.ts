import type { Writable } from 'svelte/store';

/** Generic string identifier (UUID v4 in practice). */
export type ID = string;

/* ------------------------------------------------------------------ */
/*  Players & Teams                                                    */
/* ------------------------------------------------------------------ */

export interface Player {
  id: ID;
  number: number | null;       // jersey number
  name: string;
  /** Bench flag (false = bench; true/undefined = active). */
  active?: boolean;
}

export interface Team {
  id: ID;
  name: string;
  players: Player[];            // roster; opponent may remain empty
  isOpponent?: boolean;
}

/* ------------------------------------------------------------------ */
/*  Stat Types                                                         */
/* ------------------------------------------------------------------ */

export type StatType =
  | 'GOAL'
  | 'SHOT'
  | 'ASSIST'
  | 'BLOCK'
  | 'STEAL'
  | 'DRAWN_EXCLUSION'
  | 'TURNOVER'
  | 'EXCLUSION'
  | 'SUB_IN'          // player entered game (bench -> active)
  | 'SUB_OUT'         // player exited game (active -> bench)
  | 'PERIOD_START';   // new period began (clock reset)

export const POSITIVE_STATS: readonly StatType[] = [
  'GOAL',
  'SHOT',
  'ASSIST',
  'BLOCK',
  'STEAL',
  'DRAWN_EXCLUSION'
] as const;

export const NEGATIVE_STATS: readonly StatType[] = ['TURNOVER', 'EXCLUSION'] as const;

/** Rows used in player tile mini stat pads */
export const PLAYER_TILE_ROW1: readonly StatType[] = ['GOAL', 'SHOT', 'ASSIST'] as const;
export const PLAYER_TILE_ROW2: readonly StatType[] = ['BLOCK', 'STEAL', 'DRAWN_EXCLUSION'] as const;
export const PLAYER_TILE_ROW3_NEG: readonly StatType[] = ['TURNOVER', 'EXCLUSION'] as const;

/* ------------------------------------------------------------------ */
/*  Event                                                              */
/* ------------------------------------------------------------------ */

export interface StatEvent {
  id: ID;
  gameId: ID;
  teamId: ID;         // which team generated event
  playerId?: ID;      // optional for opponent / team-level stats
  type: StatType;
  period: number;     // 1-4 (+OT possible)
  ts: number;         // ms since epoch (wall clock)
  /** ID of related event (e.g., auto-shot generated for a goal). */
  linkedId?: ID;

  /**
   * Seconds elapsed *within the period* when this event occurred.
   * 0 = start of the period. May be absent on legacy records; clients should backfill.
   */
  clock?: number;
}

/* ------------------------------------------------------------------ */
/*  Game Metadata & Data                                               */
/* ------------------------------------------------------------------ */

export interface GameMeta {
  id: ID;
  createdAt: number;
  updatedAt: number;
  date: string;               // ISO date of match (YYYY-MM-DD)
  location?: string;
  opponentName?: string;
  periods: number;            // default 4
  autoShotOnGoal: boolean;    // logging GOAL auto-adds SHOT
  trackOpponentPlayers: boolean; // future extension
}

export interface GameData {
  meta: GameMeta;
  home: Team;                 // your team
  opponent: Team;             // opponent aggregate
  events: StatEvent[];
}

export interface GamesIndexEntry {
  id: ID;
  opponentName?: string;
  date: string;
  createdAt: number;
  updatedAt: number;
}

/* ------------------------------------------------------------------ */
/*  Store API Argument Shapes                                          */
/* ------------------------------------------------------------------ */

export interface CreateGameArgs {
  homeTeamName: string;
  players: Player[];
  opponentName?: string;
  date?: string;
  periods?: number;
  autoShotOnGoal?: boolean;
  trackOpponentPlayers?: boolean;
  location?: string;
}

export interface AddEventArgs {
  gameId: ID;
  teamId: ID;
  playerId?: ID;
  type: StatType;
  period: number;
  ts?: number;
  /** Optional explicit clock; normally store auto-assigns next second within the period. */
  clock?: number;
}

/* ------------------------------------------------------------------ */
/*  Store Contract                                                     */
/* ------------------------------------------------------------------ */

export interface GameStoreApi {
  games: Writable<GamesIndexEntry[]>;
  currentGame: Writable<GameData | null>;

  createGame: (init: CreateGameArgs) => Promise<ID>;
  loadGame: (id: ID) => Promise<GameData | null>;
  saveGame: (g: GameData) => Promise<void>;
  deleteGame: (id: ID) => Promise<void>;

  addEvent: (e: AddEventArgs) => void;
  removeEvent: (id: ID) => void;
  undoLast: () => void;

  /** Update the clock (seconds within period) on an existing event & persist. */
  updateEventClock: (gameId: ID, eventId: ID, clock: number) => void;
}
