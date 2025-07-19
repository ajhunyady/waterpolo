// src/lib/game/periodController.ts
import type { ID, GameData, StatEvent, AddEventArgs } from '$lib/types';

/** Shape of the period action pushed onto the page's action stack. */
export interface PeriodAction {
  kind: 'period';
  prev: number;
  next: number;
  eventId?: ID;
}

/** Dependencies the controller needs from the outside (DI for testability). */
export interface PeriodControllerDeps {
  /** Current full game object (null if not loaded yet). */
  getGame: () => GameData | null;
  /** Current period number (1-based). */
  getPeriod: () => number;
  /** Mutate the current period number (reactive in the page). */
  setPeriod: (p: number) => void;
  /** Push a PeriodAction into the page-level undo stack. */
  pushAction: (a: PeriodAction) => void;
  /** Add an event (delegates to gameStore.addEvent). */
  addEvent: (args: AddEventArgs) => void;
  /** Remove an event by id (delegates to gameStore.removeEvent) – used by external undo code. */
  removeEvent?: (id: ID) => void;
  /** Return maximum allowed periods for this game (0 if unknown). */
  maxPeriods: () => number;
}

export interface PeriodController {
  /** Move forward one period (idempotent PERIOD_START logging). */
  next(): void;
  /** Move backward one period (no event logging). */
  prev(): void;
  /** Ensure a PERIOD_START exists for a given target period (used internally). */
  ensurePeriodStart(prev: number, target: number): ID | undefined;
  /** Find existing PERIOD_START event for a period. */
  findPeriodStart(periodNum: number): StatEvent | undefined;
}

/**
 * Factory to create a period controller.
 * Encapsulates: forward/back navigation, idempotent PERIOD_START events, undo action creation.
 */
export function createPeriodController(deps: PeriodControllerDeps): PeriodController {
  const {
    getGame,
    getPeriod,
    setPeriod,
    pushAction,
    addEvent,
    maxPeriods
  } = deps;

  function findPeriodStart(periodNum: number): StatEvent | undefined {
    const g = getGame();
    if (!g) return;
    // Linear scan is fine for small event lists
    return g.events.find(e => e.type === 'PERIOD_START' && e.period === periodNum);
    // (If performance needed later, maintain an index map outside.)
  }

  /**
   * Create PERIOD_START if missing; always push a PeriodAction so undo restores prior period.
   * Returns the event id if a new event was created (or existing id if it already existed).
   */
  function ensurePeriodStart(prev: number, target: number): ID | undefined {
    const g = getGame();
    if (!g) return;

    if (prev === target) return;

    const existing = findPeriodStart(target);
    if (existing) {
      // We still record period navigation for undo, but eventId is undefined (no removal needed).
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

    // Retrieve the last event (should be the PERIOD_START we just added)
    const latest = getGame()?.events.at(-1);
    const evId = latest?.id as ID | undefined;

    pushAction({ kind: 'period', prev, next: target, eventId: evId });
    return evId;
  }

  function next() {
    const g = getGame();
    if (!g) return;
    const cur = getPeriod();
    const max = maxPeriods();
    if (cur >= max) return;
    const target = cur + 1;

    // Ensure (or create) PERIOD_START before mutating visible period
    ensurePeriodStart(cur, target);

    setPeriod(target);
  }

  function prev() {
    const g = getGame();
    if (!g) return;
    const cur = getPeriod();
    if (cur <= 1) return;
    setPeriod(cur - 1);
    // No event & no undo action needed for backwards move (matches your previous design).
  }

  return {
    next,
    prev,
    ensurePeriodStart,
    findPeriodStart
  };
}
