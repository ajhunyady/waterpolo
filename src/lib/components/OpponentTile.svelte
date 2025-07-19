<script lang="ts">
  import type { OppTotals } from '$lib/game/utils';

  let {
    totals,
    compact = false,
    onGoal,
    onShot
  }: {
    totals: OppTotals;
    compact?: boolean;
    onGoal: () => void;
    onShot: () => void;
  } = $props();

  function stop<E extends Event>(e: E) { e.stopPropagation(); }
  function tileClick() { onGoal(); }
</script>

<div
  role="button"
  tabindex="0"
  class="flex flex-col items-center gap-1 {compact ? 'w-full mt-4' : 'w-48 md:self-start'} p-3 rounded-lg bg-slate-800 border border-slate-700 shadow text-center text-white active:scale-95 transition-transform select-none"
  title="Tap to log Opponent Goal"
  onclick={tileClick}
  onkeydown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); tileClick(); } }}
>
  <div class="text-lg font-bold">Opponent</div>
  <div class="text-xs text-slate-300 w-full">
    G:{totals.goals} &nbsp;S:{totals.shots}
  </div>
  <div class="mt-1 grid grid-cols-2 gap-1 w-full">
    <button
      type="button"
      class="px-1 py-0.5 {compact ? 'py-1 text-sm' : ''} rounded bg-white text-slate-800 text-xs font-bold"
      onclick={(e) => { stop(e); onGoal(); }}
    >G</button>
    <button
      type="button"
      class="px-1 py-0.5 {compact ? 'py-1 text-sm' : ''} rounded bg-white text-slate-800 text-xs font-bold"
      onclick={(e) => { stop(e); onShot(); }}
    >S</button>
  </div>
</div>
