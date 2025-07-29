<script lang="ts">
  import { gameStore } from '$lib/stores/gameStore';
  import { goto } from '$app/navigation';
  import { page } from '$app/stores';
  import { teamStore } from '$lib/stores/teamStore';
  import { v4 as uuid } from 'uuid';
  import type { Player, ID } from '$lib/types';

  let opponentName = '';
  let date = new Date().toISOString().slice(0, 10);
  let homeTeamName = 'Our Team';
  let periods = 4;
  let autoShotOnGoal = true;

  // start w/ 13 empty roster slots
  let players: Player[] = Array.from({ length: 13 }).map((_, i) => ({
    id: uuid(),
    number: i + 1,
    name: ''
  }));

  // Load roster from ?teamId= if present
  $effect(() => {
    const tid = $page.url.searchParams.get('teamId') as ID | null;
    if (!tid) return;
    let cancelled = false;
    (async () => {
      const t = await teamStore.loadTeam(tid);
      if (cancelled || $page.url.searchParams.get('teamId') !== tid) return;
      if (!t) return;
      homeTeamName = t.name ?? '';
      players = (t.players ?? []).map((p) => ({
        id: uuid(),
        number: (p as any).number,
        name: p.name ?? ''
      }));
      if (players.length === 0) {
        players = [{ id: uuid(), number: 1, name: '' } as Player];
      }
    })();
    return () => { cancelled = true; };
  });

  async function create() {
    const activePlayers = players.filter((p) => p.name.trim() !== '');
    const id = await gameStore.createGame({
      homeTeamName,
      players: activePlayers,
      opponentName,
      date,
      periods,
      autoShotOnGoal
    });
    goto(`/game/${id}`);
  }
</script>

<div class="space-y-6 max-w-2xl mx-auto">
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
    type="button"
    onclick={create}
    class="w-full py-4 rounded-lg bg-green-600 text-white text-xl font-bold"
  >
    Create Game
  </button>
</div>
