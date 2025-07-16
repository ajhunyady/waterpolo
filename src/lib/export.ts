import type { GameData } from '$lib/types';

export function gameToJSON(game: GameData): string {
  return JSON.stringify(game, null, 2);
}

export function downloadJSON(game: GameData) {
  const blob = new Blob([gameToJSON(game)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  triggerDownload(url, `${filenameBase(game)}.json`);
}

export function gameToCSV(game: GameData): string {
  // Simple flat export: ts,date,period,team,player,number,type
  const rows = [
    ['ts', 'date', 'period', 'team', 'player', 'number', 'type'],
  ];
  const playerLookup: Record<string, { name: string; number: number | null }> = {};
  for (const p of game.home.players) {
    playerLookup[p.id] = { name: p.name, number: p.number };
  }
  for (const ev of game.events) {
    const pl = ev.playerId ? playerLookup[ev.playerId] : undefined;
    rows.push([
      String(ev.ts),
      game.meta.date,
      String(ev.period),
      ev.teamId === game.home.id ? game.home.name : game.opponent.name,
      pl?.name ?? '',
      pl?.number != null ? String(pl.number) : '',
      ev.type,
    ]);
  }
  return rows.map((r) => r.map(csvEscape).join(',')).join('\n');
}

function csvEscape(v: string) {
  if (v.includes(',') || v.includes('"') || v.includes('\n')) {
    return '"' + v.replace(/"/g, '""') + '"';
  }
  return v;
}

function filenameBase(game: GameData): string {
  const opp = game.meta.opponentName?.replace(/\s+/g, '_') ?? 'opponent';
  return `${game.meta.date}_${opp}`;
}

export function downloadCSV(game: GameData) {
  const blob = new Blob([gameToCSV(game)], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  triggerDownload(url, `${filenameBase(game)}.csv`);
}

function triggerDownload(url: string, filename: string) {
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.style.display = 'none';
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, 0);
}