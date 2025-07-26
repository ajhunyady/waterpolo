<script lang="ts">
  import { settingsStore } from '$lib/stores/settingsStore';
  import { get } from 'svelte/store';
  import { goto } from '$app/navigation';
  import OvertimeSettings from '$lib/components/OvertimeSettings.svelte';
  import type { AppSettings } from '$lib/settings';

  // Load once from store; edits are local until Save
  let initial: AppSettings = get(settingsStore);

  let defaultPeriods = initial.defaultPeriods;
  let defaultOvertimePeriods = initial.defaultOvertimePeriods;
  let defaultShootoutEnabled = initial.defaultShootoutEnabled;
  let autoShotOnGoal = initial.autoShotOnGoal;
  let trackOpponentPlayers = initial.trackOpponentPlayers;

  function current(): AppSettings {
    return {
      defaultPeriods: Math.max(1, Number(defaultPeriods || 1)),
      defaultOvertimePeriods: Math.max(0, Number(defaultOvertimePeriods || 0)),
      defaultShootoutEnabled: !!defaultShootoutEnabled,
      autoShotOnGoal: !!autoShotOnGoal,
      trackOpponentPlayers: !!trackOpponentPlayers
    };
  }

  function saveAndExit() {
    const next = current();
    settingsStore.set(next);
    initial = next;
    goto('/');
  }
  function cancelAndExit() {
    goto('/'); // discard: just leave without saving
  }
</script>

<!-- Outer section styled like Tailwind UI contact sections -->
<section class="relative isolate bg-white">
  <div class="mx-auto max-w-7xl px-6 py-8 lg:px-8">
    <div class="grid grid-cols-1 overflow-hidden rounded-2xl bg-white shadow ring-1 ring-gray-200 lg:grid-cols-3">

      <!-- Left dark panel (inspired by contact sections) -->
      <div class="bg-gray-900 px-6 py-10 sm:px-10 lg:col-span-1">
        <div class="mx-auto max-w-md">
          <h2 class="text-2xl font-bold tracking-tight text-white">Settings</h2>
          <p class="mt-3 text-sm leading-6 text-gray-300">
            Configure default game rules and stat tracking. These values will be used
            when you create a new game; you can still override them per‑game.
          </p>

          <dl class="mt-8 space-y-6 text-sm text-gray-300">
            <div class="flex gap-3">
              <span class="inline-flex h-6 w-6 items-center justify-center rounded-md bg-white/10 text-white">⏱️</span>
              <div>
                <dt class="font-semibold text-white">Periods & Overtime</dt>
                <dd class="mt-1 text-gray-300">Choose regulation periods, overtime periods, and shootout.</dd>
              </div>
            </div>
            <div class="flex gap-3">
              <span class="inline-flex h-6 w-6 items-center justify-center rounded-md bg-white/10 text-white">📊</span>
              <div>
                <dt class="font-semibold text-white">Stats & Tracking</dt>
                <dd class="mt-1 text-gray-300">Control automatic shots and whether to track opponent players.</dd>
              </div>
            </div>
          </dl>
        </div>
      </div>

      <!-- Right form panel -->
      <div class="px-6 py-10 sm:p-10 lg:col-span-2">
        <div class="mx-auto max-w-2xl">
          <!-- Game Defaults -->
          <div class="grid grid-cols-1 gap-x-8 gap-y-8 sm:grid-cols-6">
            <div class="sm:col-span-6">
              <h3 class="text-base font-semibold leading-7 text-gray-900">Game defaults</h3>
              <p class="mt-1 text-sm leading-6 text-gray-500">Used when creating a new game.</p>
            </div>

            <!-- Regulation periods -->
            <div class="sm:col-span-3">
              <label for="periods" class="block text-sm font-medium leading-6 text-gray-900">
                Regulation periods
              </label>
              <div class="mt-2">
                <input
                  id="periods"
                  type="number"
                  min="1"
                  class="block w-full rounded-md border-0 py-1.5 px-2 text-gray-900 shadow-sm
                         ring-1 ring-inset ring-gray-300 placeholder:text-gray-400
                         focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
                  value={defaultPeriods}
                  oninput={(e) => {
                    const v = parseInt((e.target as HTMLInputElement).value, 10);
                    defaultPeriods = Number.isFinite(v) ? Math.max(1, v) : 1;
                  }}
                />
              </div>
            </div>

            <!-- Overtime / Shootout -->
            <div class="sm:col-span-6">
              <fieldset class="mt-2 rounded-md ring-1 ring-gray-200 p-4">
                <legend class="px-1 text-sm font-medium text-gray-900">Overtime & shootout</legend>
                <div class="mt-3">
                  <OvertimeSettings
                    bind:overtimePeriods={defaultOvertimePeriods}
                    bind:shootoutEnabled={defaultShootoutEnabled}
                  />
                </div>
              </fieldset>
            </div>

            <!-- Stats & Tracking -->
            <div class="sm:col-span-6">
              <h3 class="text-base font-semibold leading-7 text-gray-900">Stats & tracking</h3>
              <div class="mt-4 space-y-4">
                <label class="flex gap-3 items-center">
                  <input
                    type="checkbox"
                    class="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-600"
                    checked={autoShotOnGoal}
                    onchange={(e) => (autoShotOnGoal = (e.target as HTMLInputElement).checked)}
                  />
                  <span class="text-sm text-gray-700">Automatically add a <span class="font-medium">SHOT</span> when logging a <span class="font-medium">GOAL</span></span>
                </label>

                <label class="flex gap-3 items-center">
                  <input
                    type="checkbox"
                    class="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-600"
                    checked={trackOpponentPlayers}
                    onchange={(e) => (trackOpponentPlayers = (e.target as HTMLInputElement).checked)}
                  />
                  <span class="text-sm text-gray-700">Track opponent player stats</span>
                </label>
              </div>
            </div>
          </div>

          <!-- Bottom actions 25% / 75% -->
          <div class="mt-10">
            <div class="grid grid-cols-4 gap-4">
              <!-- Cancel (25%) -->
              <button
                type="button"
                class="col-span-1 inline-flex justify-center rounded-md border border-gray-300 bg-white
                       px-4 py-2.5 text-sm font-semibold text-gray-700 shadow-sm hover:bg-gray-50
                       focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gray-300"
                onclick={cancelAndExit}
                title="Discard changes and return"
              >
                Cancel
              </button>

              <!-- Save (75%) -->
              <button
                type="button"
                class="col-span-3 inline-flex justify-center rounded-md bg-indigo-600
                       px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500
                       focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
                onclick={saveAndExit}
                title="Save changes and return"
              >
                Save
              </button>
            </div>

            <!-- Mobile hint spacing -->
            <p class="mt-3 text-xs text-gray-500">
              Changes apply to new games.
            </p>
          </div>
        </div>
      </div>
      <!-- /Right panel -->

    </div>
  </div>
</section>
