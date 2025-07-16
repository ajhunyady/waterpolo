import type { GameData, StatEvent, StatType, ID } from '$lib/types';

export interface PlayerTotals {
  goals: number;
  shots: number;
  assists: number;
  blocks: number;
}

export const emptyTotals = (): PlayerTotals => ({ goals: 0, shots: 0, assists: 0, blocks: 0 });

function tallyEvent(t: PlayerTotals, type: StatType) {
  if (type === 'GOAL') t.goals += 1;
  else if (type === 'SHOT') t.shots += 1;
  else if (type === 'ASSIST') t.assists += 1;
  else if (type === 'BLOCK') t.blocks += 1;
}

export function totalsByPlayer(game: GameData): Record<ID, PlayerTotals> {
  const out: Record<ID, PlayerTotals> = {};
  for (const p of game.home.players) out[p.id] = emptyTotals();
  for (const ev of game.events) {
    if (ev.teamId !== game.home.id) continue; // only your team in player detail
    if (!ev.playerId) continue;
    tallyEvent(out[ev.playerId] ?? (out[ev.playerId] = emptyTotals()), ev.type);
  }
  return out;
}

export interface TeamTotals extends PlayerTotals {}

export function totalsByTeam(game: GameData): Record<ID, TeamTotals> {
  const out: Record<ID, TeamTotals> = {
    [game.home.id]: emptyTotals(),
    [game.opponent.id]: emptyTotals(),
  };
  for (const ev of game.events) {
    tallyEvent(out[ev.teamId] ?? (out[ev.teamId] = emptyTotals()), ev.type);
  }
  return out;
}

export function score(game: GameData): { home: number; opponent: number } {
  const tt = totalsByTeam(game);
  return {
    home: tt[game.home.id]?.goals ?? 0,
    opponent: tt[game.opponent.id]?.goals ?? 0,
  };
}