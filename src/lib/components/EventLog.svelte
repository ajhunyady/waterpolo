<script lang="ts">
  import type { GameData, ID, StatEvent } from '$lib/types';
  import { formatClock, clampNum, statLabel } from '$lib/game/utils';

  let {
    game,
    events,
    onClockChange
  }: {
    game: GameData;
    events: StatEvent[];
    onClockChange: (eventId: ID, clock: number) => void;
  } = $props();

  let editing: ID | null = $state(null);
  let editMin = $state(0);
  let editSec = $state(0);

  function start(ev: StatEvent) {
    editing = ev.id;
    const sec = ev.clock ?? 0;
    editMin = Math.floor(sec / 60);
    editSec = sec % 60;
  }
  function cancel() { editing = null; }
  function commit() {
    if (!editing) return;
    const m = clampNum(editMin, 0, 99);
    const s = clampNum(editSec, 0, 59);
    onClockChange(editing, m * 60 + s);
    editing = null;
  }

  let el: HTMLDivElement | null = $state(null);
  $effect(() => {
    const _len = events.length;
    if (el) queueMicrotask(() => { if (el) el.scrollTop = 0; });
  });
</script>

<div class="space-y-2 mt-6 w-full">
  <h2 class="text-lg font-semibold px-1">Event Log</h2>
  {#if events.length === 0}
    <p class="text-sm text-slate-500 px-1">No events yet.</p>
  {:else}
    <div
      bind:this={el}
      class="max-h-64 overflow-y-auto border border-slate-200 rounded divide-y divide-slate-200 bg-white"
    >
      {#each events as ev (ev.id)}
        {#if ev.type === 'PERIOD_START'}
          <div class="flex items-center gap-2 px-2 py-1 text-sm bg-amber-50 text-amber-700">
            <span class="font-mono">{formatClock(ev.clock)}</span>
            <span class="ml-auto font-semibold">P{ev.period} Start</span>
          </div>
        {:else}
          <div
            class="flex items-center gap-2 px-2 py-1 text-sm"
            class:bg-slate-50={ev.teamId === game.home.id}
            class:bg-slate-800={ev.teamId === game.opponent.id}
            class:text-white={ev.teamId === game.opponent.id}
          >
            {#if editing === ev.id}
              <div class="flex items-center gap-0.5">
                <input
                  type="number"
                  min="0"
                  max="99"
                  bind:value={editMin}
                  class="w-10 px-1 py-0.5 rounded border text-xs text-center text-slate-800"
                  onkeydown={(e) => { if (e.key === 'Enter') commit(); if (e.key === 'Escape') cancel(); }}
                />
                <span>:</span>
                <input
                  type="number"
                  min="0"
                  max="59"
                  bind:value={editSec}
                  class="w-10 px-1 py-0.5 rounded border text-xs text-center text-slate-800"
                  onkeydown={(e) => { if (e.key === 'Enter') commit(); if (e.key === 'Escape') cancel(); }}
                />
                <button type="button" class="ml-1 px-1 py-0.5 rounded bg-green-600 text-white text-xs" onclick={commit}>✓</button>
                <button type="button" class="px-1 py-0.5 rounded bg-slate-400 text-white text-xs" onclick={cancel}>✕</button>
              </div>
            {:else}
              <button
                type="button"
                class="font-mono underline decoration-dotted"
                onclick={() => start(ev)}
              >{formatClock(ev.clock)}</button>
            {/if}

            <span class="w-8 text-center shrink-0">P{ev.period}</span>

            {#if ev.teamId === game.home.id && ev.playerId}
              {@const pl = game.home.players.find((p) => p.id === ev.playerId)}
              <span class="truncate">#{pl?.number ?? '?'} {pl?.name ?? 'Unknown'}</span>
            {:else}
              <span class="truncate italic opacity-90">Opp</span>
            {/if}

            <span class="ml-auto font-semibold">{statLabel(ev.type)}</span>
          </div>
        {/if}
      {/each}
    </div>
  {/if}
</div>
