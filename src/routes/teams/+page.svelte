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
  async function deleteTeam(id: ID) {
    if (confirm('Delete this team? This cannot be undone.')) {
      await teamStore.deleteTeam(id);
    }
  }
</script>

<!-- Page header -->
<div class="max-w-4xl mx-auto mb-6 flex items-center justify-between">
  <h1 class="text-2xl font-bold">Teams</h1>
  <button
    type="button"
    class="px-4 py-2 rounded bg-green-600 text-white font-semibold shadow hover:bg-green-700 active:scale-95 transition"
    onclick={newTeam}
  >
    + New Team
  </button>
</div>

<!-- Teams list -->
<div class="max-w-4xl mx-auto">
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
              <div class="flex items-center gap-2">
                <button
                  type="button"
                  class="px-2 py-1 rounded bg-slate-100 text-slate-700 hover:bg-slate-200"
                  onclick={() => editTeam(t.id)}
                >
                  Edit
                </button>
                <button
                  type="button"
                  class="px-2 py-1 rounded bg-green-600 text-white hover:bg-green-700"
                  onclick={() => useInNewGame(t.id)}
                >
                  Use
                </button>
                <button
                  type="button"
                  class="px-2 py-1 rounded bg-red-50 text-red-700 hover:bg-red-100"
                  onclick={() => deleteTeam(t.id)}
                >
                  Delete
                </button>
              </div>
            </div>
          </li>
        {/each}
      </ul>
    {/if}
  </div>
</div>
