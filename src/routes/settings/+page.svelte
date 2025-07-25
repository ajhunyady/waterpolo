<script lang="ts">
  import { settingsStore } from '$lib/stores/settingsStore';
  import { get } from 'svelte/store';
  import OvertimeSettings from '$lib/components/OvertimeSettings.svelte';
  import type { AppSettings } from '$lib/settings';
  
  /* -------------------------------------------------------------
   * 1. Initialise local, bind‑friendly vars from the store
   * ----------------------------------------------------------- */
  let {
    defaultPeriods,
    defaultOvertimePeriods,
    defaultShootoutEnabled,
    autoShotOnGoal,
    trackOpponentPlayers
  } = get(settingsStore) as AppSettings;

  /* -------------------------------------------------------------
   * 2. Persist locals → store whenever any of them change
   *    (Svelte re‑runs this $: statement reactively)
   * ----------------------------------------------------------- */
  $: settingsStore.set({
    defaultPeriods,
    defaultOvertimePeriods,
    defaultShootoutEnabled,
    autoShotOnGoal,
    trackOpponentPlayers
  });
</script>

<main class="max-w-xl mx-auto space-y-8 p-6">
  <h1 class="text-2xl font-bold">Settings</h1>

  <!-- Game default settings --------------------------------------->
  <section class="space-y-4 p-4 rounded-lg bg-slate-50 border">
    <h2 class="text-lg font-semibold">Game Defaults</h2>

    <!-- Regulation periods --------------------------------------->
    <div class="flex gap-4 items-center">
      <label for="periods" class="w-48 text-sm font-medium">
        Regulation Periods
      </label>
      <input
        id="periods"
        type="number"
        min="1"
        class="w-24 px-2 py-1 border rounded"
        bind:value={defaultPeriods}
      />
    </div>

    <!-- Overtime & Shoot‑out picker ------------------------------->    
    <OvertimeSettings
      bind:overtimePeriods={defaultOvertimePeriods}
      bind:shootoutEnabled={defaultShootoutEnabled}
    />
  </section>

  <!-- Misc tracking toggles --------------------------------------->
  <section class="space-y-3 p-4 rounded-lg bg-slate-50 border">
    <h2 class="text-lg font-semibold">Stats & Tracking</h2>

    <label class="flex items-center gap-3">
      <input
        type="checkbox"
        class="h-4 w-4 border-gray-300 rounded"
        bind:checked={autoShotOnGoal}
      />
      <span class="text-sm">
        Automatically add a SHOT when logging a GOAL
      </span>
    </label>

    <label class="flex items-center gap-3">
      <input
        type="checkbox"
        class="h-4 w-4 border-gray-300 rounded"
        bind:checked={trackOpponentPlayers}
      />
      <span class="text-sm">Track opponent player stats</span>
    </label>
  </section>
</main>