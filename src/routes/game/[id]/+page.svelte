<script lang="ts">
  import { onMount } from 'svelte';
  import { page } from '$app/state'; // Svelte 5+ location for page store
  import { gameStore } from '$lib/stores/gameStore';
  import type { ID, StatType, GameData } from '$lib/types';

  // Grab the *actual* Svelte stores from the API object
  const currentGame = gameStore.currentGame; // Writable<GameData|null>

  // Current period (UI control)
  let period = 1;

  // Load the game when the route param changes (browser only)
  $: gameId = $page.params.id as ID;

  onMount(() => {
    if (gameId) gameStore.loadGame(gameId);
  });

  // Derived reactive data
  $: game = $currentGame as GameData | null;
  $: playerTotals = game ? computePlayerTotals(game) : {};
  $: teamScore = game ? computeTeamScore(game) : { home: 0, opponent: 0 };

  function logStat(playerId: ID | undefined, type: StatType) {
    if (!game) return;
    const teamId = playerId ? game.home.id : game.opponent.id;
    gameStore.addEvent({
      gameId: game.meta.id,
      teamId,
      playerId,
      type,
      period
    });
  }

  function nextPeriod() {
    if (!game) return;
    if (period < game.meta.periods) period += 1;
  }
  function prevPeriod() {
    if (period > 1) period -= 1;
  }

  function undo() {
    gameStore.undoLast();
  }

  // --- derived helpers ---
  function computePlayerTotals(g: GameData) {
    const totals: Record<ID, { goals: number; shots: number; assists: number; blocks: number }> = {};
    for (const p of g.home.players) {
      totals[p.id] = { goals: 0, shots: 0, assists: 0, blocks: 0 };
    }
    for (const e of g.events) {
      if (!e.playerId) continue; // opponent team aggregate only
      const t = totals[e.playerId];
      if (!t) continue;
      switch (e.type) {
        case 'GOAL': t.goals++; break;
        case 'SHOT': t.shots++; break;
        case 'ASSIST': t.assists++; break;
        case 'BLOCK': t.blocks++; break;
      }
    }
    return totals;
  }

  function computeTeamScore(g: GameData) {
    let home = 0;
    let opponent = 0;
    for (const e of g.events) {
      if (e.type !== 'GOAL') continue;
      if (e.teamId === g.home.id) home++;
      else opponent++;
    }
    return { home, opponent };
  }
</script>

{#if !game}
  <p class="p-4 text-center text-lg text-slate-500">Loading...</p>
{:else}
  <div class="space-y-6 max-w-4xl mx-auto">
    <!-- Scoreboard -->
    <div class="grid grid-cols-3 items-center gap-2 text-center">
      <div class="truncate text-xl font-semibold">{game.home.name}</div>
      <div class="text-3xl font-bold">{teamScore.home} : {teamScore.opponent}</div>
      <div class="truncate text-xl font-semibold">{game.opponent.name}</div>
    </div>

    <!-- Period Controls -->
    <div class="flex items-center justify-center gap-4">
      <button type="button" on:click={prevPeriod} class="px-3 py-1 rounded bg-slate-300 text-slate-800 disabled:opacity-40" disabled={period === 1}>-</button>
      <div class="text-lg font-medium">Period {period} / {game.meta.periods}</div>
      <button type="button" on:click={nextPeriod} class="px-3 py-1 rounded bg-slate-300 text-slate-800 disabled:opacity-40" disabled={period >= game.meta.periods}>+</button>
    </div>

    <!-- Player Grid -->
    <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
      {#each game.home.players as p}
        <button
          type="button"
          class="p-3 rounded-lg bg-white border shadow flex flex-col gap-1 items-center text-center active:scale-95 transition-transform"
          on:click={() => logStat(p.id, 'GOAL')}
          on:contextmenu|preventDefault={() => logStat(p.id, 'SHOT')}
        >
          <div class="text-2xl font-bold leading-none">{p.number}</div>
          <div class="text-sm truncate w-full">{p.name}</div>
          <div class="text-xs text-slate-500 w-full">
            G:{playerTotals[p.id]?.goals ?? 0}
            &nbsp;S:{playerTotals[p.id]?.shots ?? 0}
            &nbsp;A:{playerTotals[p.id]?.assists ?? 0}
            &nbsp;B:{playerTotals[p.id]?.blocks ?? 0}
          </div>
        </button>
      {/each}
    </div>

    <!-- Opponent aggregate stat buttons -->
    <div class="grid grid-cols-4 gap-2">
      <button type="button" class="py-3 rounded bg-slate-800 text-white font-bold" on:click={() => logStat(undefined,'GOAL')}>Opp Goal</button>
      <button type="button" class="py-3 rounded bg-slate-800 text-white font-bold" on:click={() => logStat(undefined,'SHOT')}>Opp Shot</button>
      <button type="button" class="py-3 rounded bg-slate-800 text-white font-bold" on:click={() => logStat(undefined,'ASSIST')}>Opp Ast</button>
      <button type="button" class="py-3 rounded bg-slate-800 text-white font-bold" on:click={() => logStat(undefined,'BLOCK')}>Opp Block</button>
    </div>

    <!-- Controls -->
    <div class="flex gap-4 justify-center pt-4">
      <button type="button" class="px-4 py-2 rounded bg-amber-500 text-white font-semibold" on:click={undo}>Undo</button>
      <a href="/export/{game.meta.id}" class="px-4 py-2 rounded bg-blue-600 text-white font-semibold text-center">Export</a>
    </div>
  </div>
{/if}
