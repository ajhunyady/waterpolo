<script lang="ts">
  import { gameStore } from '$lib/stores/gameStore';
  import { goto } from '$app/navigation';
  import { get } from 'svelte/store';

  const { games } = gameStore;

  function newGame() {
    goto('/game/new');
  }

  function openGame(id: string) {
    goto(`/game/${id}`);
  }
</script>

<div class="space-y-4">
  <button class="w-full py-4 rounded-lg bg-blue-600 text-white text-xl font-bold" on:click={newGame}>
    + New Game
  </button>

  {#if $games.length === 0}
    <p class="text-center text-slate-500">No games yet.</p>
  {:else}
    <ul class="divide-y divide-slate-300 bg-white rounded-lg shadow">
      {#each $games as g}
        <li class="p-4 flex items-center justify-between" role="button" tabindex="0" on:click={() => openGame(g.id)}>
          <div>
            <div class="font-semibold">vs {g.opponentName}</div>
            <div class="text-sm text-slate-500">{g.date}</div>
          </div>
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="size-5 opacity-70">
            <path stroke-linecap="round" stroke-linejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
          </svg>
        </li>
      {/each}
    </ul>
  {/if}
</div>