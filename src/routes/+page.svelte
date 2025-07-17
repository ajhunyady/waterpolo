<script lang="ts">
  import { gameStore } from '$lib/stores/gameStore';
  import { goto } from '$app/navigation';
  import { loadJSON } from '$lib/persist';
  import type {
    GamesIndexEntry,
    GameData,
    ID,
    StatEvent
  } from '$lib/types';

  /* Subscribe to the index of saved games (lightweight metadata). */
  const gamesStore = gameStore.games;
  let games: GamesIndexEntry[] = $state([]);

  /* Cached per-game details we derive on demand (score + home team name). */
  interface Score {
    home: number;
    opponent: number;
  }
  interface HomeInfo {
    name: string;
    score: Score;
  }
  let details: Record<ID, HomeInfo> = $state({} as Record<ID, HomeInfo>);

  /* Subscribe to the games index. */
  $effect(() => {
    const unsub = gamesStore.subscribe((v) => (games = v));
    return unsub;
  });

  /* Whenever games index changes (or on first mount in browser), refresh details. */
  $effect(() => {
    if (typeof window === 'undefined') return; // SSR guard
    const next: Record<ID, HomeInfo> = {};
    for (const g of games) {
      const data = loadGameData(g.id);
      if (data) {
        next[g.id] = {
          name: data.home.name || 'Our Team',
          score: computeScore(data)
        };
      } else {
        // fallback if game record missing
        next[g.id] = {
          name: 'Our Team',
          score: { home: 0, opponent: 0 }
        };
      }
    }
    details = next;
  });

  function newGame() {
    goto('/game/new');
  }

  /** Load full GameData for given id without mutating global currentGame. */
  function loadGameData(id: ID): GameData | null {
    // gameStore persists games under game_${id}; persist.ts adds prefix internally.
    return loadJSON<GameData | null>(`game_${id}`, null);
  }

  function computeScore(g: GameData): Score {
    let home = 0;
    let opponent = 0;
    const homeId = g.home.id;
    for (const e of g.events as StatEvent[]) {
      if (e.type !== 'GOAL') continue;
      if (e.teamId === homeId) home++;
      else opponent++;
    }
    return { home, opponent };
  }

  /** Style helper: pick badge color based on win/loss/tie. */
  function scoreClass(s: Score): string {
    if (s.home > s.opponent) return 'bg-green-600 text-white';
    if (s.home < s.opponent) return 'bg-red-600 text-white';
    return 'bg-slate-400 text-white';
  }
</script>

<div class="max-w-xl mx-auto space-y-6">
  <div class="flex justify-end">
    <button
      type="button"
      class="px-4 py-2 rounded bg-green-600 text-white font-semibold shadow hover:bg-green-700 active:scale-95 transition"
      onclick={newGame}
    >
      + New Game
    </button>
  </div>

  {#if games.length === 0}
    <p class="p-4 text-center text-slate-500">No games yet.</p>
  {:else}
    <ul class="space-y-3">
      {#each games as g}
        {#key g.id}
          <li>
            <a
              href={`/game/${g.id}`}
              class="block p-4 rounded-xl border bg-white shadow hover:shadow-md hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500 transition"
            >
              {#if details[g.id]}
                <div
                  class={`inline-block px-3 py-1 mb-2 rounded-full text-sm font-bold ${scoreClass(details[g.id].score)}`}
                >
                  {details[g.id].score.home} : {details[g.id].score.opponent}
                </div>
              {:else}
                <div
                  class="inline-block px-3 py-1 mb-2 rounded-full text-sm font-bold bg-slate-300 text-slate-800"
                >
                  0 : 0
                </div>
              {/if}

              <div class="text-lg font-semibold leading-tight">
                {details[g.id]?.name ?? 'Our Team'}
                <span class="mx-1 text-slate-400">vs</span>
                {g.opponentName ?? 'Opponent'}
              </div>
              <div class="text-sm text-slate-500 mt-1">{g.date}</div>
            </a>
          </li>
        {/key}
      {/each}
    </ul>
  {/if}
</div>

<!-- no local <style>; global Tailwind handles everything -->
