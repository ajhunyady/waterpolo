import type { Writable } from 'svelte/store';

export type ID = string;

export interface Player {
  id: ID;
  number: number | null; // jersey number
  name: string;
  active?: boolean; // bench filtering
}

export interface Team {
  id: ID;
  name: string;
  players: Player[]; // for your team; opponent aggregate may be empty
  isOpponent?: boolean; // flag
}

export type StatType = 'GOAL' | 'SHOT' | 'ASSIST' | 'BLOCK';

export interface StatEvent {
  id: ID;
  gameId: ID;
  teamId: ID; // which team generated event
  playerId?: ID; // optional for opponent / team-level stats
  type: StatType;
  period: number; // 1-4 (+OT possible)
  ts: number; // ms since epoch
  // Linked behavior: if a GOAL auto-creates a SHOT, shotEventId references it (or vice versa)
  linkedId?: ID;
}

export interface GameMeta {
  id: ID;
  createdAt: number;
  updatedAt: number;
  date: string; // ISO date of match (YYYY-MM-DD)
  location?: string;
  opponentName?: string;
  periods: number; // default 4
  autoShotOnGoal: boolean; // config: logging GOAL auto-adds SHOT
  trackOpponentPlayers: boolean; // future extension
}

export interface GameData {
  meta: GameMeta;
  home: Team; // your team
  opponent: Team; // opponent aggregated
  events: StatEvent[];
}

export interface GamesIndexEntry {
  id: ID;
  opponentName?: string;
  date: string;
  createdAt: number;
  updatedAt: number;
}

// Store contract (for typing convenience in components)
export interface GameStoreApi {
  games: Writable<GamesIndexEntry[]>;
  currentGame: Writable<GameData | null>;
  createGame: (init: Partial<GameMeta> & { homeTeamName: string; players: Player[] }) => Promise<ID>;
  loadGame: (id: ID) => Promise<GameData | null>;
  saveGame: (g: GameData) => Promise<void>;
  deleteGame: (id: ID) => Promise<void>;
  addEvent: (e: Omit<StatEvent, 'id' | 'ts'> & { ts?: number }) => void;
  removeEvent: (id: ID) => void;
  undoLast: () => void;
}