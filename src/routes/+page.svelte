<script lang="ts">
  import { gameStore } from '$lib/stores/gameStore';
  import { goto } from '$app/navigation';
  import type { GamesIndexEntry } from '$lib/types';

  // Subscribe to actual Svelte store from gameStore API
  const gamesStore = gameStore.games;
  let games: GamesIndexEntry[] = $state([]);

  $effect(() => {
    const unsub = gamesStore.subscribe((v) => (games = v));
    return unsub;
  });

  function newGame() {
    goto('/game/new');
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
          <!-- Use semantic interactive element: anchor, not clickable <li>. -->
          <a
            href={`/game/${g.id}`}
            class="block p-4 rounded border bg-white shadow hover:bg-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500"
          >
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