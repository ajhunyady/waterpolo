<script lang="ts">
  import { teamStore } from '$lib/stores/teamStore';
  import { goto } from '$app/navigation';
  import { v4 as uuid } from 'uuid';
  import type { Player, ID } from '$lib/types';

  let teamName = $state('');
  let players = $state<Player[]>([]);

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
    const cleaned = players
      .map((p) => ({ ...p, name: (p.name ?? '').trim() }))
      .filter((p) => p.name.length > 0);

    await teamStore.createTeam(teamName.trim() || 'Untitled Team', cleaned);
    goto('/teams');
  }
  function cancel() {
    goto('/teams');
  }

  // Start with two blank rows on first mount
  $effect(() => {
    if (players.length === 0) { addPlayerRow(); addPlayerRow(); }
  });
</script>

<div class="mx-auto w-full max-w-3xl px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
  <!-- Page heading -->
  <div class="mb-4 sm:mb-6">
    <h1 class="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">Create Team</h1>
    <p class="mt-1 text-sm text-slate-500">Add your roster. You can edit later anytime.</p>
  </div>

  <div class="rounded-2xl bg-white shadow ring-1 ring-gray-200">
    <!-- Card body -->
    <div class="p-4 sm:p-6 space-y-6">
      <!-- Team name -->
      <div>
        <label for="team-name" class="block text-sm font-medium text-gray-900">Team name</label>
        <input
          id="team-name"
          type="text"
          class="mt-2 block w-full rounded-lg border-0 p-2 text-gray-900 shadow-sm
                 ring-1 ring-inset ring-gray-300 placeholder:text-gray-400
                 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm"
          placeholder="e.g., Sharks 14U"
          value={teamName}
          oninput={(e) => (teamName = (e.target as HTMLInputElement).value)}
        />
      </div>

      <!-- Players -->
      <section aria-labelledby="players-heading" class="space-y-3">
        <div class="flex items-center justify-between">
          <h2 id="players-heading" class="text-base font-semibold text-gray-900">Players</h2>
          <button
            type="button"
            class="inline-flex items-center gap-2 rounded-full px-3 py-2 text-sm font-medium
                   text-slate-700 bg-slate-100 hover:bg-slate-200 active:scale-95 transition"
            aria-label="Add player"
            title="Add player"
            onclick={addPlayerRow}
          >
            <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
                 stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <path d="M12 5v14M5 12h14" />
            </svg>
            <span class="hidden sm:inline">Add</span>
          </button>
        </div>

        <div class="space-y-2" role="group" aria-labelledby="players-heading">
          {#each players as p (p.id)}
            <!-- Mobile-first row -->
            <div class="grid grid-cols-12 gap-2 items-center p-1">
              <!-- Number -->
              <div class="col-span-3 sm:col-span-2">
                <label class="sr-only" for={"num-"+p.id}>Number</label>
                <input
                  id={"num-"+p.id}
                  class="block w-full rounded-lg border-0 p-2 text-gray-900 shadow-sm
                        ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-indigo-600
                        sm:text-sm text-center"
                  type="number"
                  min="0"
                  inputmode="numeric"
                  placeholder="#"
                  value={(p as any).number ?? ''}
                  oninput={(e) => {
                    const raw = (e.target as HTMLInputElement).value.trim();
                    setPlayerNumber(p.id as ID, raw === '' ? undefined : Number(raw));
                  }}
                />
              </div>

              <!-- Name + Delete inline -->
              <div class="col-span-9 sm:col-span-10 flex items-center gap-2 min-w-0">
                <label class="sr-only" for={"name-"+p.id}>Player name</label>
                <input
                  id={"name-"+p.id}
                  class="flex-1 min-w-0 rounded-lg border-0 p-2 text-gray-900 shadow-sm
                        ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-indigo-600
                        sm:text-sm"
                  placeholder="Player name"
                  value={p.name ?? ''}
                  oninput={(e) => setPlayerName(p.id as ID, (e.target as HTMLInputElement).value)}
                />

                <button
                  type="button"
                  class="shrink-0 inline-flex items-center justify-center rounded-full p-2 text-red-600
                        hover:text-red-700 hover:bg-red-50 focus-visible:outline focus-visible:outline-2
                        focus-visible:outline-offset-2 focus-visible:outline-red-600"
                  aria-label="Remove player"
                  title="Remove player"
                  onclick={() => removePlayerRow(p.id as ID)}
                >
                  <svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
                      stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                    <path d="M3 6h18" />
                    <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                    <path d="M10 11v6M14 11v6" />
                    <path d="M9 6V4a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2" />
                  </svg>
                </button>
              </div>
            </div>
          {/each}

        </div>

        <!-- Add button (mobile duplicate) -->
        <div class="sm:hidden">
          <button
            type="button"
            class="mt-1 w-full inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5
                   text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 active:scale-95 transition"
            onclick={addPlayerRow}
          >
            <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
                 stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <path d="M12 5v14M5 12h14" />
            </svg>
            Add player
          </button>
        </div>
      </section>
    </div>

    <!-- Bottom actions (non-sticky) -->
    <div class="px-4 sm:px-6 py-3 sm:py-4 border-t rounded-b-2xl">
      <div class="grid grid-cols-4 gap-3">
        <!-- 25% Cancel -->
        <button
          type="button"
          class="col-span-1 inline-flex items-center justify-center gap-2 rounded-xl border border-gray-300 bg-white
                 px-4 py-2.5 text-sm font-semibold text-gray-700 shadow-sm hover:bg-gray-50"
          onclick={cancel}
          aria-label="Cancel"
          title="Cancel"
        >
          <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
               stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <path d="M6 6l12 12M18 6L6 18" />
          </svg>
          <span>Cancel</span>
        </button>

        <!-- 75% Save -->
        <button
          type="button"
          class="col-span-3 inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600
                 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500
                 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
          onclick={saveAndExit}
          aria-label="Save team"
          title="Save team"
        >
          <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
               stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <path d="M5 13l4 4L19 7" />
          </svg>
          <span>Save</span>
        </button>
      </div>
    </div>
  </div>
</div>
