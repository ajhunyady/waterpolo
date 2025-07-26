<!-- src/routes/teams/[id]/+page.svelte -->
<script lang="ts">
  import { teamStore } from '$lib/stores/teamStore';
  import { goto } from '$app/navigation';
  import { page } from '$app/stores';
  import { v4 as uuid } from 'uuid';
  import type { Player, Team, ID } from '$lib/types';

  let loadError: string | null = $state(null);

  let teamId: ID | null = $state(null);
  let teamName = $state('');
  let players = $state<Player[]>([]);

  $effect(() => {
    // read the current param (this makes the effect re-run when it changes)
    const id = $page.params.id as ID | undefined;

    if (!id) {
      teamId = null;
      loadError = 'Missing team id.';
      players = [];
      return; // nothing to do
    }

    teamId = id;

    let cancelled = false;
    (async () => {
      const t = await teamStore.loadTeam(id);

      // abort if the effect was cleaned up or the id changed
      if (cancelled || $page.params.id !== id) return;

      if (!t) {
        loadError = 'Team not found.';
        return;
      }

      loadError = null;
      teamName = t.name ?? '';
      players = (t.players ?? []).map((p) => ({
        id: p.id ?? uuid(),
        name: p.name ?? '',
        number: (p as any).number,
        active: false
      }));

      if (players.length === 0) {
        players = [{ id: uuid(), name: '', active: false } as Player];
      }
    })();

    // cleanup runs before next effect and on unmount
    return () => { cancelled = true; };
  });

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
    players = players.map((p) => (p.id === id ? ({ ...p, number: num } as any) : p));
  }

  async function saveAndExit() {
    if (!teamId) return;
    const cleaned = players
      .map((p) => ({ ...p, name: (p.name ?? '').trim() }))
      .filter((p) => p.name.length > 0);

    const team: Team = {
      id: teamId,
      name: teamName.trim() || 'Untitled Team',
      players: cleaned
    };
    await teamStore.saveTeam(team);
    goto('/teams');
  }
  function cancel() {
    goto('/teams');
  }
</script>

<div class="max-w-4xl mx-auto mb-6 flex items-center justify-between">
  <h1 class="text-2xl font-bold">Edit Team</h1>
</div>

<div class="max-w-4xl mx-auto">
  <div class="rounded-2xl bg-white shadow ring-1 ring-gray-200 p-6">
    {#if loadError}
      <p class="text-sm text-red-600">{loadError}</p>
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

      <!-- Players -->
      <div class="mb-4">
        <div class="flex items-center justify-between mb-2">
          <h3 id="players-heading" class="text-lg font-medium text-gray-900">Players</h3>
          <button
            type="button"
            class="px-3 py-1.5 rounded bg-slate-100 text-slate-700 hover:bg-slate-200"
            onclick={addPlayerRow}
          >
            + Add player
          </button>
        </div>

        <div class="space-y-2" role="group" aria-labelledby="players-heading">
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
      </div>

      <!-- Actions -->
      <div class="grid grid-cols-4 gap-3">
        <button
          type="button"
          class="col-span-1 px-4 py-2 rounded border border-slate-300 text-slate-700 hover:bg-slate-50"
          onclick={cancel}
        >
          Cancel
        </button>
        <button
          type="button"
          class="col-span-3 px-4 py-2 rounded bg-indigo-600 text-white font-semibold shadow hover:bg-indigo-700"
          onclick={saveAndExit}
        >
          Save Changes
        </button>
      </div>
    {/if}
  </div>
</div>
