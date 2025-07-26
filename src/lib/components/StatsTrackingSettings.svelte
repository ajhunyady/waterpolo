<script lang="ts">
  /**
   * Bindable props (Svelte 5 runes):
   *  - autoShotOnGoal: boolean
   *  - trackOpponentPlayers: boolean
   */
  let {
    autoShotOnGoal = $bindable(false),
    trackOpponentPlayers = $bindable(false)
  } = $props<{ autoShotOnGoal?: boolean; trackOpponentPlayers?: boolean }>();

  function onToggleASOG(e: Event) {
    autoShotOnGoal = (e.target as HTMLInputElement).checked;
  }
  function onToggleTOP(e: Event) {
    trackOpponentPlayers = (e.target as HTMLInputElement).checked;
  }
</script>

<!-- Match the simple, stacked style used by OvertimeSettings -->
<div class="space-y-3">
  <label class="flex items-center gap-3">
    <input
      type="checkbox"
      class="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-600"
      checked={autoShotOnGoal}
      onchange={onToggleASOG}
    />
    <span class="text-sm text-gray-700">
      Automatically add a <span class="font-medium">SHOT</span> when logging a <span class="font-medium">GOAL</span>
    </span>
  </label>

  <label class="flex items-center gap-3">
    <input
      type="checkbox"
      class="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-600"
      checked={trackOpponentPlayers}
      onchange={onToggleTOP}
    />
    <span class="text-sm text-gray-700">Track opponent player stats</span>
  </label>
</div>