// src/lib/game/periodRules.ts
import type { GameData, GameMeta } from '$lib/types';

export interface Score {
  home: number;
  opponent: number;
}

export function computeScore(g: GameData): Score {
  let home = 0, opponent = 0;
  const homeId = g.home.id;
  for (const e of g.events) {
    if (e.type === 'GOAL') {
      if (e.teamId === homeId) home++; else opponent++;
    }
  }
  return { home, opponent };
}

export function isTied(g: GameData): boolean {
  const s = computeScore(g);
  return s.home === s.opponent;
}

/**
 * Return a display label for a given period number considering regulation,
 * dynamic OTs, and optional shootout.
 */
export function periodLabel(p: number, meta: GameMeta): string {
  const reg = meta.periods;
  if (meta.shootoutPeriod && p === meta.shootoutPeriod) return 'SO';
  if (p <= reg) return String(p);
  // Inside overtime region:
  const otIndex = p - reg;
  return otIndex > 1 ? `OT${otIndex}` : 'OT';
}
