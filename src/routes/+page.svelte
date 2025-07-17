<script lang="ts">
  import { gameStore } from '$lib/stores/gameStore';
  import { goto } from '$app/navigation';
  import { loadJSON } from '$lib/persist';
  import type { GamesIndexEntry, GameData, ID, StatEvent } from '$lib/types';

  /* Subscribe to the actual Svelte store exported by gameStore. */
  const gamesStore = gameStore.games;
  let games: GamesIndexEntry[] = $state([]);

  /* Score cache keyed by game id */
  interface Score { home: number; opponent: number; }
  let scores: Record<ID, Score> = $state({} as Record<ID, Score>);

  /* Whenever games list changes, refresh scores from storage (browser only). */
  $effect(() => {
    // don't run in SSR (localStorage undefined)
    if (typeof window === 'undefined') return;
    const next: Record<ID, Score> = {};
    for (const g of games) {
      const data = loadGameData(g.id);
      next[g.id] = data ? computeScore(data) : { home: 0, opponent: 0 };
    }
    scores = next;
  });

  $effect(() => {
    const unsub = gamesStore.subscribe((v) => (games = v));
    return unsub;
  });

  function newGame() {
    goto('/game/new');
  }

  /** load full GameData for a given id without mutating currentGame */
  function loadGameData(id: ID): GameData | null {
    // gameStore's internal storage key is `game_${id}`. (See gameStore.ts.) :contentReference[oaicite:3]{index=3}
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
</script>

<div class="max-w-xl mx-auto space-y-6">
  <div class="flex justify-end">
    <button
      type="button"
      class="px-4 py-2 rounded bg-green-600 text-white font-semibold"
      onclick={newGame}
    >
      + New Game
    </button>
  </div>

  {#if games.length === 0}
    <p class="p-4 text-center text-slate-500">No games yet.</p>
  {:else}
    <ul class="space-y-2">
      {#each games as g}
        <li>
          <a
            href={`/game/${g.id}`}
            class="block p-4 rounded border bg-white shadow hover:bg-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500"
          >
            <div class="text-xl font-bold leading-none">
              {#if scores[g.id]}
                {scores[g.id].home} : {scores[g.id].opponent}
              {:else}
                0 : 0
              {/if}
            </div>
            <div class="text-lg font-semibold">
              vs {g.opponentName ?? 'Opponent'}
            </div>
            <div class="text-sm text-slate-500">{g.date}</div>
          </a>
        </li>
      {/each}
    </ul>
  {/if}
</div>

<!-- no local <style>; global Tailwind handles everything -->
