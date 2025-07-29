<script lang="ts">
  import { gameStore } from '$lib/stores/gameStore';
  import { goto } from '$app/navigation';
  import { page } from '$app/stores';
  import { teamStore } from '$lib/stores/teamStore';
  import { v4 as uuid } from 'uuid';
  import type { Player, ID } from '$lib/types';
  import type { TeamIndexEntry } from '$lib/stores/teamStore';

  let opponentName = $state('');
  let date = $state(new Date().toISOString().slice(0, 10));
  let homeTeamName = $state('Our Team');
  let periods = 4;
  let autoShotOnGoal = $state(true);

  const teamsIdxStore = teamStore.teams;
  let teams: TeamIndexEntry[] = $state([]);
  let selectedTeamId: ID | '' = $state('');

  $effect(() => {
    const unsub = teamsIdxStore.subscribe((v) => (teams = v));
    return unsub;
  });

  // Pick up ?teamId= from URL on mount
  $effect(() => {
    const tid = $page.url.searchParams.get('teamId') as ID | null;
    if (tid && tid !== selectedTeamId) selectedTeamId = tid;
  });

  // start w/ 13 empty roster slots
  let players: Player[] = $state(
    Array.from({ length: 13 }).map((_, i) => ({
      id: uuid(),
      number: i + 1,
      name: ''
    }))
  );

  // Load roster when a team is selected
  $effect(() => {
    if (!selectedTeamId) return;
    let cancelled = false;
    const id = selectedTeamId;
    (async () => {
      const t = await teamStore.loadTeam(id as ID);
      if (cancelled || selectedTeamId !== id) return;
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

  function addPlayerRow() {
    players = [...players, { id: uuid(), number: players.length + 1, name: '' } as Player];
  }
  function removePlayerRow(id: ID) {
    players = players.filter((p) => p.id !== id);
  }

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

    {#if teams.length > 0}
      <label class="grid gap-1">
        <span class="text-sm font-medium">Use Saved Team</span>
        <select class="input" bind:value={selectedTeamId}>
          <option value="">Custom roster…</option>
          {#each teams as t}
            <option value={t.id}>{t.name}</option>
          {/each}
        </select>
      </label>
    {/if}

    <label class="inline-flex items-center gap-2">
      <input type="checkbox" bind:checked={autoShotOnGoal} />
      <span>Auto-add Shot when logging Goal</span>
    </label>
  </div>

  <div class="space-y-2">
    <h2 class="text-xl font-semibold">Roster</h2>
    <div class="space-y-2">
      {#each players as p (p.id)}
        <div class="grid grid-cols-12 gap-2 items-center bg-white p-2 rounded border">
          <input class="col-span-2 input text-center" type="number" bind:value={p.number} min="0" />
          <input class="col-span-9 input" placeholder="Player name" bind:value={p.name} />
          <button type="button" class="col-span-1 text-red-600 hover:text-red-700" onclick={() => removePlayerRow(p.id)} aria-label="Remove player" title="Remove player">
            <svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M3 6h18" />
              <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
              <path d="M10 11v6M14 11v6" />
              <path d="M9 6V4a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2" />
            </svg>
          </button>
        </div>
      {/each}
    </div>
    <div>
      <button type="button" class="mt-2 inline-flex items-center gap-2 rounded px-3 py-1.5 text-sm bg-slate-100 hover:bg-slate-200" onclick={addPlayerRow} aria-label="Add player" title="Add player">
        <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M12 5v14M5 12h14" />
        </svg>
        <span>Add player</span>
      </button>
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
