<script lang="ts">
  // Bindable props: overtimePeriods (0/1/2) and shootoutEnabled (boolean)
  let {
    overtimePeriods = $bindable(0),
    shootoutEnabled = $bindable(false)
  } = $props<{ overtimePeriods?: number; shootoutEnabled?: boolean }>();

  // Keep the select's bound value as a string to match <option value="...">
  let lastCount = $state((overtimePeriods === 2 ? "2" : "1") as "1" | "2");

  // Derived flag from stored numeric value
  const otEnabled = $derived(overtimePeriods > 0);

  // Sync select if parent changes overtimePeriods externally
  $effect(() => {
    if (overtimePeriods === 1 || overtimePeriods === 2) {
      lastCount = String(overtimePeriods) as "1" | "2";
    }
  });

  function toggleOT(e: Event) {
    const checked = (e.target as HTMLInputElement).checked;
    overtimePeriods = checked ? 2 : 0; // backend stays 0/1/2
  }

  function changeSelect() {
    // lastCount already updated by bind:value; commit to backend if enabled
    if (otEnabled) overtimePeriods = Number(lastCount);
  }

  function toggleShootout(e: Event) {
    shootoutEnabled = (e.target as HTMLInputElement).checked;
  }
</script>

<div class="space-y-3">
  <!-- One-line: label, enable checkbox, and 1/2 select -->
  <div class="flex items-center gap-3 flex-wrap">
    <label for="enable-ot" class="inline-flex items-center gap-2">
      <input
        id="enable-ot"
        type="checkbox"
        class="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-600"
        checked={otEnabled}
        onchange={toggleOT}
      />
      <span class="text-sm text-gray-700">Enable Overtime - Periods </span>
    </label>

    <select
      id="ot-periods"
      class="block w-32 rounded-md border-0 py-1.5 text-gray-900 shadow-sm
             ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-indigo-600
             disabled:opacity-50 disabled:cursor-not-allowed"
      bind:value={lastCount}
      onchange={changeSelect}
      disabled={!otEnabled}
      aria-labelledby="ot-label"
    >
      <option value="1">1</option>
      <option value="2">2</option>
    </select>
  </div>

  <!-- Shootout toggle (separate) -->
  <label class="mt-2 flex items-center gap-3">
    <input
      id="shootout"
      type="checkbox"
      class="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-600"
      checked={shootoutEnabled}
      onchange={toggleShootout}
    />
    <span class="text-sm text-gray-700">Enable shootout</span>
  </label>
</div>
