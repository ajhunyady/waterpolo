<script lang="ts">
  import type { Player } from '$lib/types';
  import type { Totals } from '$lib/game/utils';

  let {
    player,
    totals,
    isActive,
    onToggleActive,
    onGoal,
    onShot,
    onAssist,
    onBlock,
    onSteal,
    onDrawnEx,
    onTurnover,
    onExclusion
  }: {
    player: Player;
    totals: Totals | undefined;
    isActive: boolean;
    onToggleActive: () => void;
    onGoal: () => void;
    onShot: () => void;
    onAssist: () => void;
    onBlock: () => void;
    onSteal: () => void;
    onDrawnEx: () => void;
    onTurnover: () => void;
    onExclusion: () => void;
  } = $props();

  function stop<E extends Event>(e: E) { e.stopPropagation(); }

  function tileClick() {
    // Active tile logs Goal, bench tile toggles active
    if (isActive) onGoal();
    else onToggleActive();
  }
</script>

<div
  role="button"
  tabindex="0"
  onclick={tileClick}
  onkeydown={(e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      tileClick();
    }
  }}
  class="relative p-3 rounded-lg border shadow flex flex-col gap-1 items-center text-center select-none transition-transform active:scale-95
    {isActive ? 'bg-white' : 'bg-slate-100 opacity-60 hover:opacity-80 cursor-pointer'}"
>
  {#if isActive}
    <span class="absolute top-1 right-1 text-[10px] px-1.5 py-0.5 rounded-full bg-green-600 text-white font-bold">IN</span>
  {:else}
    <span class="absolute top-1 right-1 text-[10px] px-1.5 py-0.5 rounded-full bg-slate-500 text-white font-bold">BENCH</span>
  {/if}

  <button
    type="button"
    title={isActive ? 'Move to bench' : 'Move to active'}
    class="absolute top-1 left-1 text-xs px-1 py-0.5 rounded bg-slate-200 text-slate-700 hover:bg-slate-300"
    onclick={(e) => { stop(e); onToggleActive(); }}
  >↕</button>

  <div class="text-2xl font-bold leading-none">{player.number}</div>
  <div class="text-sm truncate w-full">{player.name}</div>

  <div class="text-xs text-slate-500 w-full">
    G:{totals?.goals ?? 0}
    &nbsp;S:{totals?.shots ?? 0}
    &nbsp;A:{totals?.assists ?? 0}
  </div>
  <div class="text-xs text-slate-500 w-full">
    B:{totals?.blocks ?? 0}
    &nbsp;St:{totals?.steals ?? 0}
    &nbsp;DEx:{totals?.drawnExclusions ?? 0}
  </div>
  <div class="text-xs text-red-600 w-full">
    TO:{totals?.turnovers ?? 0}
    &nbsp;Ex:{totals?.exclusions ?? 0}
  </div>

  {#if isActive}
    <div class="mt-1 grid grid-cols-3 gap-1 w-full">
      <button type="button" class="px-1 py-0.5 rounded bg-green-600 text-white text-xs font-bold" onclick={(e) => { stop(e); onGoal(); }}>G</button>
      <button type="button" class="px-1 py-0.5 rounded bg-blue-600 text-white text-xs font-bold" onclick={(e) => { stop(e); onShot(); }}>S</button>
      <button type="button" class="px-1 py-0.5 rounded bg-amber-500 text-white text-xs font-bold" onclick={(e) => { stop(e); onAssist(); }}>A</button>
    </div>
    <div class="mt-1 grid grid-cols-3 gap-1 w-full">
      <button type="button" class="px-1 py-0.5 rounded bg-purple-600 text-white text-xs font-bold" onclick={(e) => { stop(e); onBlock(); }}>B</button>
      <button type="button" class="px-1 py-0.5 rounded bg-teal-600 text-white text-xs font-bold" onclick={(e) => { stop(e); onSteal(); }}>St</button>
      <button type="button" class="px-1 py-0.5 rounded bg-indigo-600 text-white text-xs font-bold" onclick={(e) => { stop(e); onDrawnEx(); }}>DEx</button>
    </div>
    <div class="mt-1 grid grid-cols-2 gap-1 w-full">
      <button type="button" class="px-1 py-0.5 rounded bg-red-600 text-white text-xs font-bold" onclick={(e) => { stop(e); onTurnover(); }}>TO</button>
      <button type="button" class="px-1 py-0.5 rounded bg-red-700 text-white text-xs font-bold" onclick={(e) => { stop(e); onExclusion(); }}>Ex</button>
    </div>
  {:else}
    <div class="mt-1 grid grid-cols-3 gap-1 w-full pointer-events-none">
      <div class="px-1 py-0.5 rounded bg-slate-300 text-white text-xs font-bold text-center">G</div>
      <div class="px-1 py-0.5 rounded bg-slate-300 text-white text-xs font-bold text-center">S</div>
      <div class="px-1 py-0.5 rounded bg-slate-300 text-white text-xs font-bold text-center">A</div>
    </div>
    <div class="mt-1 grid grid-cols-3 gap-1 w-full pointer-events-none">
      <div class="px-1 py-0.5 rounded bg-slate-300 text-white text-xs font-bold text-center">B</div>
      <div class="px-1 py-0.5 rounded bg-slate-300 text-white text-xs font-bold text-center">St</div>
      <div class="px-1 py-0.5 rounded bg-slate-300 text-white text-xs font-bold text-center">DEx</div>
    </div>
    <div class="mt-1 grid grid-cols-2 gap-1 w-full pointer-events-none">
      <div class="px-1 py-0.5 rounded bg-slate-300 text-white text-xs font-bold text-center">TO</div>
      <div class="px-1 py-0.5 rounded bg-slate-300 text-white text-xs font-bold text-center">Ex</div>
    </div>
  {/if}
</div>
