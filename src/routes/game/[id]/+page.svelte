<script lang="ts">
  import { onMount } from 'svelte';
  import { page } from '$app/stores';
  import { goto } from '$app/navigation';
  import { gameStore } from '$lib/stores/gameStore';
  import { get } from 'svelte/store';
  import { totalsByPlayer, score } from '$lib/stats';
  import type { ID } from '$lib/types';

  let period = 1; // manual period tracker (future: clock)
  let gameId: ID;

  $: gameId = $page.params.id;

  let loading = true;
  let game = $gameStore.currentGame; // local alias

  const { currentGame } = gameStore;

  onMount(async () => {
    // load from store if not already loaded or if different gameId
    const cur = get(currentGame);
    if (!cur || cur.meta.id !== gameId) {
      await gameStore.loadGame(gameId);
    }
    loading = false;
  });

  $: game = $currentGame;
  $: teamScore = game ? score(game) : {home:0,opponent:0};
  $: playerTotals = game ? totalsByPlayer(game) : {};

  function logStat(playerId: ID | undefined, type: 'GOAL'|'SHOT'|'ASSIST'|'BLOCK') {
    if (!game) return;
    const teamId = playerId ? game.home.id : game.opponent.id;
    gameStore.addEvent({ gameId: game.meta.id, teamId, playerId, type, period });
  }

  function logOpponent(type: 'GOAL'|'SHOT'|'ASSIST'|'BLOCK') {
    if (!game) return;
    gameStore.addEvent({ gameId: game.meta.id, teamId: game.opponent.id, type, period });
  }

  function undo() {
    gameStore.undoLast();
  }

  function toExport() {
    goto(`/game/${gameId}/export`);
  }
</script>

{#if loading}
  <p>Loading...</p>
{:else if !game}
  <p>Game not found.</p>
{:else}
  <div class="flex flex-col gap-4">
    <!-- Scoreboard -->
    <div class="grid grid-cols-3 items-center text-center bg-white rounded-lg shadow p-2 text-xl font-bold">
      <div>{game.home.name}</div>
      <div class="text-3xl">{teamScore.home} : {teamScore.opponent}</div>
      <div> {game.opponent.name} </div>
    </div>

    <!-- Period Selector -->
    <div class="flex items-center justify-center gap-2 text-lg">
      <span>Period:</span>
      {#each Array(game.meta.periods) as _,i}
        <button class="px-3 py-1 rounded border text-lg {period===i+1?'bg-blue-600 text-white':''}" on:click={() => period=i+1}>{i+1}</button>
      {/each}
    </div>

    <!-- Player Grid -->
    <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
      {#each game.home.players as p}
        <div class="player-tile" on:click={() => logStat(p.id,'GOAL')}>
          <div class="text-2xl font-bold">{p.number}</div>
          <div class="truncate">{p.name}</div>
          <div class="text-sm opacity-70">
            G:{playerTotals[p.id]?.goals ?? 0} S:{playerTotals[p.id]?.shots ?? 0} A:{playerTotals[p.id]?.assists ?? 0} B:{playerTotals[p.id]?.blocks ?? 0}
          </div>
        </div>
      {/each}
    </div>

    <!-- Stat Buttons Row -->
    <div class="grid grid-cols-4 gap-2 mt-4">
      <button class="stat-btn goal" on:click={() => logStat(undefined,'GOAL')}>Opp Goal</button>
      <button class="stat-btn shot" on:click={() => logStat(undefined,'SHOT')}>Opp Shot</button>
      <button class="stat-btn assist" on:click={() => logStat(undefined,'ASSIST')}>Opp Ast</button>
      <button class="stat-btn block" on:click={() => logStat(undefined,'BLOCK')}>Opp Block</button>
    </div>

    <!-- Action Buttons -->
    <div class="flex gap-2 mt-6">
      <button class="flex-1 py-3 rounded bg-yellow-500 text-white text-xl font-bold" on:click={undo}>Undo</button>
      <button class="flex-1 py-3 rounded bg-slate-700 text-white text-xl font-bold" on:click={toExport}>Export</button>
    </div>
  </div>
{/if}

<style>
  .player-tile {@apply select-none bg-white rounded-lg shadow p-3 text-center active:scale-[0.97] transition-transform;} /* default action logs GOAL */
  .stat-btn {@apply py-4 rounded-lg text-white text-xl font-bold active:scale-[0.97] transition-transform;}
  .goal {@apply bg-green-600;}
  .shot {@apply bg-blue-600;}
  .assist {@apply bg-purple-600;}
  .block {@apply bg-orange-600;}
</style>