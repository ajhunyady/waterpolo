<script lang="ts">
  import { gameStore } from '$lib/stores/gameStore';
  import { goto } from '$app/navigation';
  import { page } from '$app/stores';
  import { teamStore } from '$lib/stores/teamStore';
  import TeamAutocomplete from '$lib/components/TeamAutocomplete.svelte';
  import { v4 as uuid } from 'uuid';
  import type { Player, ID } from '$lib/types';
  import type { TeamIndexEntry } from '$lib/stores/teamStore';

  let opponentName = $state('');
  let date = $state(new Date().toISOString().slice(0, 10));
  let homeTeamName = $state('');
  let periods = 4;
  let autoShotOnGoal = $state(true);
  let editingDate = $state(false);
  let prevDate = '';

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

  // function to generate a blank roster
  function defaultPlayers() {
    return Array.from({ length: 13 }).map((_, i) => ({
      id: uuid(),
      number: i + 1,
      name: ''
    })) as Player[];
  }

  // start w/ 13 empty roster slots
  let players: Player[] = $state(defaultPlayers());

  // Load roster when a team is selected or reset when using a custom roster
  $effect(() => {
    if (!selectedTeamId) {
      homeTeamName = '';
      players = defaultPlayers();
      return;
    }
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
    return () => {
      cancelled = true;
    };
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

<div class="space-y-6 page-container">
  <div class="flex items-center justify-between">
    <h1 class="text-2xl font-bold">New Game</h1>
    {#if editingDate}
      <input
        type="date"
        bind:value={date}
        class="input w-auto"
        onblur={() => {
          if (!date) date = prevDate;
          editingDate = false;
        }}
        onkeydown={(e) => {
          if (e.key === 'Enter' || e.key === 'Escape') {
            if (!date) date = prevDate;
            editingDate = false;
          }
        }}
      />
    {:else}
      <span class="inline-flex items-center text-lg font-semibold text-slate-700">
        <span>{date}</span>
        <button
          type="button"
          class="ml-2 inline-flex items-center justify-center p-2 rounded-full text-blue-600 hover:text-blue-700 hover:bg-blue-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
          aria-label="Edit date"
          title="Edit date"
          onclick={() => {
            prevDate = date;
            editingDate = true;
          }}
        >
          <!-- Pencil icon -->
          <svg class="w-6 h-6" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25z"></path>
            <path d="M20.71 7.04a1 1 0 0 0 0-1.41l-2.34-2.34a1 1 0 0 0-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"></path>
          </svg>
        </button>
      </span>
    {/if}
  </div>

  <div class="grid gap-4">
    <label class="grid gap-1">
      <span class="text-sm font-medium">Opponent Name</span>
      <input bind:value={opponentName} class="input" placeholder="Opponent" />
    </label>
    <label class="grid gap-1">
      <span class="text-sm font-medium">Team</span>
      <TeamAutocomplete bind:selectedTeamId bind:teamName={homeTeamName} />
    </label>

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
    class="w-full rounded-lg bg-indigo-600 px-4 py-4 text-xl font-bold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
  >
    Create Game
  </button>
</div>
