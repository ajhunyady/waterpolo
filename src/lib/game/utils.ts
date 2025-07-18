import type { GameData, ID, StatType } from '$lib/types';

/* ---------- Formatting ---------- */

export function formatClock(sec?: number): string {
  if (sec == null || sec < 0) return '--:--';
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

export function clampNum(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

export function statLabel(t: StatType): string {
  switch (t) {
    case 'GOAL': return 'Goal';
    case 'SHOT': return 'Shot';
    case 'ASSIST': return 'Ast';
    case 'BLOCK': return 'Blk';
    case 'STEAL': return 'Stl';
    case 'DRAWN_EXCLUSION': return 'D Ex';
    case 'TURNOVER': return 'TO';
    case 'EXCLUSION': return 'Ex';
    case 'SUB_IN': return 'In';
    case 'SUB_OUT': return 'Out';
    case 'PERIOD_START': return 'Start';
    default: return t;
  }
}

/* ---------- Totals ---------- */

export interface Totals {
  goals: number;
  shots: number;
  assists: number;
  blocks: number;
  steals: number;
  turnovers: number;
  exclusions: number;
  drawnExclusions: number;
}

export function emptyTotals(): Totals {
  return {
    goals: 0,
    shots: 0,
    assists: 0,
    blocks: 0,
    steals: 0,
    turnovers: 0,
    exclusions: 0,
    drawnExclusions: 0
  };
}

export type PlayerTotalsMap = Record<ID, Totals>;
export interface Score { home: number; opponent: number; }
export interface OppTotals { goals: number; shots: number; }

export function computePlayerTotals(g: GameData): PlayerTotalsMap {
  const totals: PlayerTotalsMap = {} as PlayerTotalsMap;
  for (const p of g.home.players) totals[p.id] = emptyTotals();
  for (const e of g.events) {
    if (!e.playerId) continue;
    const t = totals[e.playerId];
    if (!t) continue;
    switch (e.type) {
      case 'GOAL': t.goals++; break;
      case 'SHOT': t.shots++; break;
      case 'ASSIST': t.assists++; break;
      case 'BLOCK': t.blocks++; break;
      case 'STEAL': t.steals++; break;
      case 'TURNOVER': t.turnovers++; break;
      case 'EXCLUSION': t.exclusions++; break;
      case 'DRAWN_EXCLUSION': t.drawnExclusions++; break;
      // ignore SUB_* and PERIOD_START
    }
  }
  return totals;
}

export function computeTeamScore(g: GameData): Score {
  let home = 0;
  let opponent = 0;
  for (const e of g.events) {
    if (e.type !== 'GOAL') continue;
    if (e.teamId === g.home.id) home++; else opponent++;
  }
  return { home, opponent };
}

export function computeOpponentTotals(g: GameData): OppTotals {
  let goals = 0;
  let shots = 0;
  for (const e of g.events) {
    if (e.teamId !== g.opponent.id) continue;
    if (e.type === 'GOAL') goals++;
    else if (e.type === 'SHOT') shots++;
  }
  return { goals, shots };
}

/* ---------- Sorting ---------- */
/** newest period first; within period, descending clock */
export function sortEventsDesc(g: GameData) {
  return [...g.events].sort((a, b) => {
    if (a.period !== b.period) return b.period - a.period;
    const ca = typeof a.clock === 'number' ? a.clock : Number.NEGATIVE_INFINITY;
    const cb = typeof b.clock === 'number' ? b.clock : Number.NEGATIVE_INFINITY;
    if (ca !== cb) return cb - ca;
    return b.ts - a.ts;
  });
}
