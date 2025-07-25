// src/lib/game/periodController.ts
import type { ID, GameData, StatEvent, AddEventArgs, GameMeta } from '$lib/types';
import { isTied } from './periodRules';

export interface PeriodAction {
  kind: 'period';
  prev: number;
  next: number;
  eventId?: ID;
}

export interface PeriodControllerDeps {
  getGame: () => GameData | null;
  getPeriod: () => number;
  setPeriod: (p: number) => void;
  pushAction: (a: PeriodAction) => void;
  addEvent: (args: AddEventArgs) => void;
  saveGame: (g: GameData) => void;         // needed to persist meta changes
  // Provide the computed max FOR NAVIGATION UI (includes OTs or shootout if created)
  // NOTE: this should reflect meta.totalPeriods or shootoutPeriod when present.
  getMax: () => number;
}

export interface PeriodController {
  next(): void;
  prev(): void;
  ensurePeriodStart(prev: number, target: number): ID | undefined;
  findPeriodStart(periodNum: number): StatEvent | undefined;
}

export function createPeriodController(deps: PeriodControllerDeps): PeriodController {
  const {
    getGame,
    getPeriod,
    setPeriod,
    pushAction,
    addEvent,
    saveGame,
    getMax
  } = deps;

  function findPeriodStart(periodNum: number): StatEvent | undefined {
    const g = getGame();
    if (!g) return;
    return g.events.find(e => e.type === 'PERIOD_START' && e.period === periodNum);
  }

  function ensurePeriodStart(prev: number, target: number): ID | undefined {
    const g = getGame();
    if (!g) return;
    if (prev === target) return;

    const existing = findPeriodStart(target);
    if (existing) {
      pushAction({ kind: 'period', prev, next: target, eventId: undefined });
      return existing.id as ID;
    }

    addEvent({
      gameId: g.meta.id,
      teamId: g.home.id,
      type: 'PERIOD_START',
      period: target,
      clock: 0
    });

    const latest = getGame()?.events.at(-1);
    const evId = latest?.id as ID | undefined;
    pushAction({ kind: 'period', prev, next: target, eventId: evId });
    return evId;
  }

  function promoteToNextStructure(g: GameData): boolean {
    const meta = g.meta;
    const curTotal = meta.totalPeriods ?? meta.periods;
    const reg = meta.periods;
    const usedOTs = Math.max(0, curTotal - reg);
    const maxOTs = meta.overtimePeriods ?? 0;

    // 1. Add another OT if we still have some left.
    if (usedOTs < maxOTs) {
      meta.totalPeriods = curTotal + 1;
      saveGame(g);
      return true;
    }

    // 2. If OTs exhausted, maybe start shootout.
    if (meta.shootoutEnabled && !meta.shootoutPeriod) {
      meta.shootoutPeriod = curTotal + 1;
      meta.totalPeriods = curTotal + 1;
      saveGame(g);
      return true;
    }

    return false;
  }

  function next() {
    const g = getGame();
    if (!g) return;

    const cur = getPeriod();
    let maxUI = getMax(); // reflects current total (reg + allocated OTs + maybe shootout)

    if (cur < maxUI) {
      const target = cur + 1;
      ensurePeriodStart(cur, target);
      setPeriod(target);
      return;
    }

    // We are at the last defined period; decide if we can *extend* structure.
    // Only extend if tied.
    if (!isTied(g)) {
      return; // game decided; no new phase
    }

    // Attempt to promote to next structure (another OT or shootout)
    const extended = promoteToNextStructure(g);
    if (!extended) return;

    // After extension, recompute max and move forward.
    maxUI = getMax();
    if (cur < maxUI) {
      const target = cur + 1;
      ensurePeriodStart(cur, target);
      setPeriod(target);
    }
  }

  function prev() {
    const g = getGame();
    if (!g) return;
    const cur = getPeriod();
    if (cur <= 1) return;
    setPeriod(cur - 1);
  }

  return {
    next,
    prev,
    ensurePeriodStart,
    findPeriodStart
  };
}
