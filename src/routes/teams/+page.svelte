<!-- src/routes/teams/+page.svelte -->
<script lang="ts">
  import { teamStore } from '$lib/stores/teamStore';
  import { goto } from '$app/navigation';
  import type { ID } from '$lib/types';
  import type { TeamIndexEntry } from '$lib/stores/teamStore';

  /* Subscribe to teams index */
  const teamsIdxStore = teamStore.teams;
  let teams: TeamIndexEntry[] = $state([]);

  $effect(() => {
    const unsub = teamsIdxStore.subscribe((v) => (teams = v));
    return unsub;
  });

  function sortTeams(a: TeamIndexEntry, b: TeamIndexEntry) {
    if (a.updatedAt !== b.updatedAt) return b.updatedAt - a.updatedAt;
    return a.name.localeCompare(b.name);
  }
  const sortedTeams = $derived([...teams].sort(sortTeams));

  function newTeam() {
    goto('/teams/new');
  }
  function editTeam(id: ID) {
    goto(`/teams/${encodeURIComponent(id)}`);
  }
  function useInNewGame(id: ID) {
    goto(`/game/new?teamId=${encodeURIComponent(id)}`);
  }
</script>

<!-- Page header -->
<div class="page-container mb-6 flex items-center justify-between">
  <h1 class="text-2xl font-bold">Teams</h1>
  <button
    type="button"
    class="inline-flex items-center justify-center rounded-md bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
    onclick={newTeam}
  >
    + New Team
  </button>
</div>

<!-- Teams list -->
<div class="page-container">
  <div class="rounded-2xl bg-white shadow ring-1 ring-gray-200 p-4">
    {#if sortedTeams.length === 0}
      <p class="text-sm text-slate-500">No teams yet.</p>
    {:else}
      <ul class="space-y-2">
        {#each sortedTeams as t (t.id)}
          <li class="p-3 rounded-lg border hover:bg-slate-50 transition">
            <div class="flex items-center justify-between gap-2">
              <div class="min-w-0">
                <div class="font-medium truncate">{t.name}</div>
                <div class="text-xs text-slate-500">{t.playersCount} players</div>
              </div>

              <!-- Icon actions -->
              <div class="flex items-center gap-1.5">
                <!-- Edit -->
                <button
                  type="button"
                  class="p-2 rounded-full text-slate-600 hover:text-slate-800 hover:bg-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
                  aria-label="Edit team"
                  title="Edit team"
                  onclick={() => editTeam(t.id)}
                >
                  <!-- Simple pencil (filled) -->
                  <svg class="w-5 h-5" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                    <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25z"></path>
                    <path d="M20.71 7.04a1 1 0 0 0 0-1.41l-2.34-2.34a1 1 0 0 0-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"></path>
                  </svg>
                </button>

                <!-- Use in New Game -->
                <button
                  type="button"
                  class="p-2 rounded-full text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
                  aria-label="Use in new game"
                  title="Use in new game"
                  onclick={() => useInNewGame(t.id)}
                >
                  <!-- Play triangle -->
                  <svg class="w-5 h-5" viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M8 5v14l11-7-11-7z" fill="currentColor"></path>
                  </svg>
                </button>

              </div>
            </div>
          </li>
        {/each}
      </ul>
    {/if}
  </div>
</div>
