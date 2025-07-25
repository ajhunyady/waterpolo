<!-- src/lib/components/OvertimeSettings.svelte -->
<script lang="ts">
  /**
   * Props are optional but **bindable** so parents can do:
   * <OvertimeSettings bind:overtimePeriods bind:shootoutEnabled />
   */
  let {
    overtimePeriods = $bindable(0),      // number of OT periods (optional)
    shootoutEnabled = $bindable(false)   // shoot‑out enabled (optional)
  } = $props<{ overtimePeriods?: number; shootoutEnabled?: boolean }>();
</script>

<div class="flex items-center space-x-6 p-4 bg-gray-50 rounded-lg">
  <div class="flex flex-col">
    <label for="overtime" class="text-sm font-medium text-gray-700">
      Overtime Periods
    </label>
    <input
      id="overtime"
      type="number"
      min="0"
      bind:value={overtimePeriods}
      class="mt-1 w-20 px-2 py-1 border rounded"
    />
  </div>

  <div class="flex items-center">
    <input
      id="shootout"
      type="checkbox"
      bind:checked={shootoutEnabled}
      class="h-4 w-4 border-gray-300 rounded"
    />
    <label for="shootout" class="ml-2 text-sm font-medium text-gray-700">
      Shootout Enabled
    </label>
  </div>
</div>
