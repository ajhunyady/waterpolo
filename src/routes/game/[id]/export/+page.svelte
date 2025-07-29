<script lang="ts">
  import { gameStore } from '$lib/stores/gameStore';
  import { goto } from '$app/navigation';
  import { v4 as uuid } from 'uuid';
  import type { Player } from '$lib/types';

  // NOTE: removed unused/deprecated `page` import from '$app/stores'

  let opponentName = $state('');
  let date = $state(new Date().toISOString().slice(0,10));
  let homeTeamName = $state('Our Team');
  let periods = 4;
  let autoShotOnGoal = $state(true);

  // start w/ 13 empty roster slots
  let players: Player[] = $state(
    Array.from({length:13}).map((_,i)=>({id:uuid(),number:i+1,name:""}))
  );

  async function create() {
    const activePlayers = players.filter((p)=>p.name.trim() !== '');
    const id = await gameStore.createGame({homeTeamName,players:activePlayers,opponentName,date,periods,autoShotOnGoal});
    goto(`/game/${id}`);
  }
</script>

<div class="space-y-6">
  <h1 class="text-2xl font-bold">New Game</h1>

  <div class="grid gap-4">
    <label class="grid gap-1">
      <span class="text-sm font-medium">Opponent Name</span>
      <input bind:value={opponentName} class="input" placeholder="Opponent" />
    </label>

    <label class="grid gap-1">
      <span class="text-sm font-medium">Date</span>
      <input type="date" bind:value={date} class="input" />
    </label>

    <label class="grid gap-1">
      <span class="text-sm font-medium">Our Team Name</span>
      <input bind:value={homeTeamName} class="input" />
    </label>

    <label class="inline-flex items-center gap-2">
      <input type="checkbox" bind:checked={autoShotOnGoal} />
      <span>Auto-add Shot when logging Goal</span>
    </label>
  </div>

  <div class="space-y-2">
    <h2 class="text-xl font-semibold">Roster</h2>
    <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
      {#each players as p, i}
        <div class="flex gap-2 items-center bg-white p-2 rounded border">
          <input class="w-16 input text-center" type="number" bind:value={p.number} min="0" />
          <input class="flex-1 input" placeholder="Player name" bind:value={p.name} />
        </div>
      {/each}
    </div>
  </div>

  <button
    onclick={create}
    class="w-full py-4 rounded-lg bg-green-600 text-white text-xl font-bold"
  >
    Create Game
  </button>
</div>

<style lang="postcss">
  /* Make Tailwind utilities visible in this scoped style block */
  @reference "../../app.css";

  /* Shared input style (scoped to this component) */
  .input {
    @apply px-3 py-2 rounded border border-slate-300 bg-white text-lg;
  }
</style>
