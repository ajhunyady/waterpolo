<!-- src/routes/teams/+page.svelte -->
<script lang="ts">
  import { teamStore } from '$lib/stores/teamStore';
  import { goto } from '$app/navigation';
  import { v4 as uuid } from 'uuid';
  import type { Team, Player, ID } from '$lib/types';
  import type { TeamIndexEntry } from '$lib/stores/teamStore';

  /* Teams index subscription */
  const teamsIdxStore = teamStore.teams;
  let teams: TeamIndexEntry[] = $state([]);

  $effect(() => {
    const unsub = teamsIdxStore.subscribe((v) => (teams = v));
    return unsub;
  });

  /* Editor state */
  type Mode = 'idle' | 'create' | 'edit';
  let mode: Mode = $state('idle');
  let editingId: ID | null = $state(null);

  /* Form model */
  let teamName = $state('');
  let players = $state<Player[]>([]);

  function startCreate() {
    mode = 'create';
    editingId = null;
    teamName = '';
    players = [];
    addPlayerRow(); addPlayerRow(); // a couple of rows to start
  }

  async function startEdit(id: ID) {
    const t = await teamStore.loadTeam(id);
    if (!t) return;
    mode = 'edit';
    editingId = id;
    teamName = t.name ?? '';
    players = (t.players ?? []).map((p) => ({
      id: p.id ?? uuid(),
      name: p.name ?? '',
      number: (p as any).number, // optional if your type supports it
      active: false
    }));
    if (players.length === 0) addPlayerRow();
  }

  function cancelEdit() {
    mode = 'idle';
    editingId = null;
    teamName = '';
    players = [];
  }

  function addPlayerRow() {
    players = [...players, { id: uuid(), name: '', active: false } as Player];
  }

  function removePlayerRow(id: ID) {
    players = players.filter((p) => p.id !== id);
  }

  function setPlayerName(id: ID, name: string) {
    players = players.map((p) => (p.id === id ? { ...p, name } : p));
  }

  function setPlayerNumber(id: ID, num: number | undefined) {
    players = players.map((p) => (p.id === id ? { ...p, number: num } as any : p));
  }

  async function saveTeam() {
    const cleaned = players
      .map((p) => ({ ...p, name: (p.name ?? '').trim() }))
      .filter((p) => p.name.length > 0);

    const team: Team = {
      id: (editingId ?? uuid()) as ID,
      name: teamName.trim() || 'Untitled Team',
      players: cleaned
    };

    await teamStore.saveTeam(team);
    mode = 'idle';
    editingId = null;
    teamName = '';
    players = [];
  }

  async function createTeamAndSave() {
    const id = await teamStore.createTeam(teamName.trim() || 'Untitled Team', players);
    // load created into editor idle state (optional)
    mode = 'idle';
    editingId = null;
    teamName = '';
    players = [];
  }

  async function deleteTeam(id: ID) {
    if (confirm('Delete this team? This cannot be undone.')) {
      await teamStore.deleteTeam(id);
      if (editingId === id) cancelEdit();
    }
  }

  function useInNewGame(id: ID) {
    goto(`/game/new?teamId=${encodeURIComponent(id)}`);
  }

  function sortTeams(a: TeamIndexEntry, b: TeamIndexEntry) {
    if (a.updatedAt !== b.updatedAt) return b.updatedAt - a.updatedAt;
    return a.name.localeCompare(b.name);
  }

  const sortedTeams = $derived([...teams].sort(sortTeams));
</script>

<!-- Page header -->
<div class="max-w-4xl mx-auto mb-6 flex items-center justify-between">
  <h1 class="text-2xl font-bold">Teams</h1>
  <button
    type="button"
    class="px-4 py-2 rounded bg-green-600 text-white font-semibold shadow hover:bg-green-700 active:scale-95 transition"
    onclick={startCreate}
  >
    + New Team
  </button>
</div>

<div class="max-w-4xl mx-auto grid grid-cols-1 gap-6 lg:grid-cols-3">
  <!-- Left: Editor (spans 2 cols on desktop) -->
  <section class="lg:col-span-2">
    <div class="rounded-2xl bg-white shadow ring-1 ring-gray-200 p-6">
      <h2 class="text-lg font-semibold mb-4">
        {mode === 'create' ? 'Create Team' : mode === 'edit' ? 'Edit Team' : 'Team Editor'}
      </h2>

      {#if mode === 'idle'}
        <p class="text-sm text-slate-500">Select a team to edit or click <span class="font-semibold">New Team</span> to create one.</p>
      {:else}
        <!-- Team name -->
        <div class="mb-4">
          <label for="team-name" class="block text-sm font-medium text-gray-900">Team name</label>
          <input
            id="team-name"
            type="text"
            class="mt-1 block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm
                   ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm"
            value={teamName}
            oninput={(e) => teamName = (e.target as HTMLInputElement).value}
          />
        </div>

        <!-- Players table -->
        <div class="mb-4">
          <div class="flex items-center mb-2">
            <h3 id="players-heading" class="text-lg font-medium text-gray-900">Players</h3>
          </div>

          <div class="space-y-2">
            {#each players as p (p.id)}
              <div class="grid grid-cols-12 gap-2 items-center">
                <input
                  class="col-span-2 rounded-md border-0 py-1.5 text-gray-900 shadow-sm
                         ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm text-center"
                  type="number"
                  min="0"
                  placeholder="#"
                  value={(p as any).number ?? ''}
                  oninput={(e) => {
                    const raw = (e.target as HTMLInputElement).value.trim();
                    setPlayerNumber(p.id as ID, raw === '' ? undefined : Number(raw));
                  }}
                />
                <input
                  class="col-span-8 rounded-md border-0 py-1.5 text-gray-900 shadow-sm
                         ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm"
                  placeholder="Player name"
                  value={p.name ?? ''}
                  oninput={(e) => setPlayerName(p.id as ID, (e.target as HTMLInputElement).value)}
                />                
                <button
                  type="button"
                  class="col-span-2 px-3 py-1.5 rounded bg-red-50 text-red-700 hover:bg-red-100"
                  onclick={() => removePlayerRow(p.id as ID)}
                  title="Remove player"
                >
                  Remove
                </button>
              </div>
            {/each}
          </div>

          <div class="flex justify-end mt-4">
            <button
              type="button"
              class="px-3 py-1.5 rounded bg-slate-100 text-slate-700 hover:bg-slate-200"
              onclick={addPlayerRow}
            >
              + Add player
            </button>
          </div>

        </div>

        <!-- Editor actions -->
        <div class="grid grid-cols-4 gap-3">
          <button
            type="button"
            class="col-span-1 px-4 py-2 rounded border border-slate-300 text-slate-700 hover:bg-slate-50"
            onclick={cancelEdit}
          >
            Cancel
          </button>

          {#if mode === 'create'}
            <button
              type="button"
              class="col-span-3 px-4 py-2 rounded bg-indigo-600 text-white font-semibold shadow hover:bg-indigo-700"
              onclick={createTeamAndSave}
            >
              Save Team
            </button>
          {:else if mode === 'edit'}
            <button
              type="button"
              class="col-span-3 px-4 py-2 rounded bg-indigo-600 text-white font-semibold shadow hover:bg-indigo-700"
              onclick={saveTeam}
            >
              Save Changes
            </button>
          {/if}
        </div>
      {/if}
    </div>
  </section>

  <!-- Right: Team list -->
  <aside class="lg:col-span-1">
    <div class="rounded-2xl bg-white shadow ring-1 ring-gray-200 p-4">
      <h3 class="text-base font-semibold mb-3">Your Teams</h3>

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
                    onclick={() => startEdit(t.id)}
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
  </aside>
</div>