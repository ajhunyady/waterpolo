<script lang="ts">
  import { onMount } from 'svelte';
  import { gameStore } from '$lib/stores/gameStore';
  import type { ID, StatType, GameData, Player } from '$lib/types';
  import type { PageData } from './$types';

  /* props from +page.ts load */
  let { data }: { data: PageData } = $props();
  const gameId: ID = data.id as ID;

  /* local reactive state */
  let period = $state(1);
  let game: GameData | null = $state(null);

  /* subscribe to the actual Svelte store */
  const currentGameStore = gameStore.currentGame;
  $effect(() => {
    const unsub = currentGameStore.subscribe((v) => (game = v));
    return unsub;
  });

  /* load game once mounted in the browser (reads local storage) */
  onMount(() => {
    if (gameId) gameStore.loadGame(gameId);
  });

  /* ------------------------------------------------------------------ */
  /* Totals & scoreboard                                                */
  /* ------------------------------------------------------------------ */
  type Totals = {
    goals: number;
    shots: number;
    assists: number;
    blocks: number;
    steals: number;
    turnovers: number;
    exclusions: number;
    drawnExclusions: number;
  };
  type PlayerTotalsMap = Record<ID, Totals>;
  type Score = { home: number; opponent: number };
  type OppTotals = { goals: number; shots: number };

  const playerTotals = $derived.by<PlayerTotalsMap>(() => {
    return game ? computePlayerTotals(game) : ({} as PlayerTotalsMap);
  });

  const teamScore = $derived.by<Score>(() => {
    return game ? computeTeamScore(game) : { home: 0, opponent: 0 };
  });

  const opponentTotals = $derived.by<OppTotals>(() => {
    if (!game) return { goals: 0, shots: 0 };
    let goals = 0;
    let shots = 0;
    for (const e of game.events) {
      if (e.teamId !== game.opponent.id) continue;
      if (e.type === 'GOAL') goals++;
      else if (e.type === 'SHOT') shots++;
    }
    return { goals, shots };
  });

  /* ------------------------------------------------------------------ */
  /* Active vs Bench (active === true)                                  */
  /* ------------------------------------------------------------------ */
  const activePlayers = $derived.by<Player[]>(() => {
    if (!game) return [];
    return game.home.players.filter((p) => p.active === true);
  });

  const benchPlayers = $derived.by<Player[]>(() => {
    if (!game) return [];
    return game.home.players.filter((p) => p.active !== true);
  });

  /* ------------------------------------------------------------------ */
  /* Action stack for Undo (events + roster changes)                    */
  /* ------------------------------------------------------------------ */
  type ActionEvent = { kind: 'event' };
  type ActionRoster = { kind: 'roster'; playerId: ID; prevActive: boolean | undefined };
  type Action = ActionEvent | ActionRoster;
  let actionStack: Action[] = $state([]);

  /* ------------------------------------------------------------------ */
  /* Store interaction helpers                                          */
  /* ------------------------------------------------------------------ */

  function logStat(playerId: ID | undefined, type: StatType) {
    if (!game) return;
    // record in local action stack BEFORE changing state
    actionStack = [...actionStack, { kind: 'event' }];

    const teamId = playerId ? game.home.id : game.opponent.id;
    gameStore.addEvent({
      gameId: game.meta.id,
      teamId,
      playerId,
      type,
      period
    });
  }

  /**
   * Persist player.active change (no history).
   * Use setPlayerActive() below if you want it undoable.
   */
  function applyPlayerActive(id: ID, active: boolean | undefined) {
    if (!game) return;

    const newPlayers = game.home.players.map((pl) =>
      pl.id === id ? { ...pl, active } : pl
    );

    const newGame: GameData = {
      ...game,
      home: { ...game.home, players: newPlayers }
    };

    gameStore.saveGame(newGame); // persists + updates currentGame store
  }

  /** Toggle player.active WITH history (undoable). */
  function setPlayerActive(id: ID, isActive: boolean) {
    if (!game) return;
    const prev = game.home.players.find((p) => p.id === id)?.active;
    actionStack = [...actionStack, { kind: 'roster', playerId: id, prevActive: prev }];
    applyPlayerActive(id, isActive);
  }

  /** Undo last action: roster change OR stat event. */
  function undo() {
    if (actionStack.length === 0) {
      // fallback: still allow store undo for safety
      gameStore.undoLast();
      return;
    }
    const last = actionStack[actionStack.length - 1];
    actionStack = actionStack.slice(0, -1);

    if (last.kind === 'event') {
      gameStore.undoLast();
    } else {
      // roster
      applyPlayerActive(last.playerId, last.prevActive);
    }
  }

  function nextPeriod() {
    if (!game) return;
    if (period < game.meta.periods) period += 1;
  }
  function prevPeriod() {
    if (period > 1) period -= 1;
  }

  /* stop bubbling from mini-buttons so tile click doesn't also log a Goal */
  function stop<E extends Event>(e: E) {
    e.stopPropagation();
  }

  /** Click behavior: active -> log GOAL; bench -> activate. */
  function tileClick(p: Player) {
    if (p.active === true) {
      logStat(p.id, 'GOAL');
    } else {
      setPlayerActive(p.id, true);
    }
  }

  /* ------------------------------------------------------------------ */
  /* Computation helpers                                                */
  /* ------------------------------------------------------------------ */
  function emptyTotals(): Totals {
    return {
      goals: 0,
      shots: 0,
      assists: 0,
      blocks: 0,
      steals: 0,
      turnovers: 0,
      exclusions: 0,
      drawnExclusions: 0
    };
  }

  function computePlayerTotals(g: GameData): PlayerTotalsMap {
    const totals: PlayerTotalsMap = {} as PlayerTotalsMap;
    for (const p of g.home.players) totals[p.id] = emptyTotals();
    for (const e of g.events) {
      if (!e.playerId) continue;
      const t = totals[e.playerId];
      if (!t) continue;
      switch (e.type) {
        case 'GOAL': t.goals++; break;
        case 'SHOT': t.shots++; break;
        case 'ASSIST': t.assists++; break;
        case 'BLOCK': t.blocks++; break;
        case 'STEAL': t.steals++; break;
        case 'TURNOVER': t.turnovers++; break;
        case 'EXCLUSION': t.exclusions++; break;
        case 'DRAWN_EXCLUSION': t.drawnExclusions++; break;
      }
    }
    return totals;
  }

  function computeTeamScore(g: GameData): Score {
    let home = 0;
    let opponent = 0;
    for (const e of g.events) {
      if (e.type !== 'GOAL') continue;
      if (e.teamId === g.home.id) home++; else opponent++;
    }
    return { home, opponent };
  }
</script>

{#if game}
  {@const g = game!}
  <div class="space-y-6 max-w-5xl mx-auto">
    <!-- Scoreboard -->
    <div class="grid grid-cols-3 items-center gap-2 text-center">
      <div class="truncate text-xl font-semibold">{g.home.name}</div>
      <div class="text-3xl font-bold">{teamScore.home} : {teamScore.opponent}</div>
      <div class="truncate text-xl font-semibold">{g.opponent.name}</div>
    </div>

    <!-- Period Controls -->
    <div class="flex items-center justify-center gap-4">
      <button
        type="button"
        onclick={prevPeriod}
        class="px-3 py-1 rounded bg-slate-300 text-slate-800 disabled:opacity-40"
        disabled={period === 1}
      >-</button>
      <div class="text-lg font-medium">Period {period} / {g.meta.periods}</div>
      <button
        type="button"
        onclick={nextPeriod}
        class="px-3 py-1 rounded bg-slate-300 text-slate-800 disabled:opacity-40"
        disabled={period >= g.meta.periods}
      >+</button>
    </div>

    <!-- ACTIVE PLAYERS + OPPONENT TILE (desktop) -->
    <div class="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-4 items-start">
      <!-- Active Players -->
      <div class="space-y-2">
        <h2 class="text-lg font-semibold px-1">Active ({activePlayers.length})</h2>
        <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {#each activePlayers as p (p.id)}
            <div
              role="button"
              tabindex="0"
              class="relative p-3 rounded-lg bg-white border shadow flex flex-col gap-1 items-center text-center active:scale-95 transition-transform select-none"
              onclick={() => tileClick(p)}
              onkeydown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  tileClick(p);
                }
              }}
            >
              <!-- status badge -->
              <span class="absolute top-1 right-1 text-[10px] px-1.5 py-0.5 rounded-full bg-green-600 text-white font-bold">IN</span>
              <!-- quick bench toggle -->
              <button
                type="button"
                title="Move to bench"
                class="absolute top-1 left-1 text-xs px-1 py-0.5 rounded bg-slate-200 text-slate-700 hover:bg-slate-300"
                onclick={(e) => { stop(e); setPlayerActive(p.id, false); }}
              >↕</button>

              <div class="text-2xl font-bold leading-none">{p.number}</div>
              <div class="text-sm truncate w-full">{p.name}</div>

              <!-- totals row 1 -->
              <div class="text-xs text-slate-500 w-full">
                G:{playerTotals[p.id]?.goals ?? 0}
                &nbsp;S:{playerTotals[p.id]?.shots ?? 0}
                &nbsp;A:{playerTotals[p.id]?.assists ?? 0}
              </div>
              <!-- totals row 2 -->
              <div class="text-xs text-slate-500 w-full">
                B:{playerTotals[p.id]?.blocks ?? 0}
                &nbsp;St:{playerTotals[p.id]?.steals ?? 0}
                &nbsp;DEx:{playerTotals[p.id]?.drawnExclusions ?? 0}
              </div>
              <!-- totals row 3 (negative) -->
              <div class="text-xs text-red-600 w-full">
                TO:{playerTotals[p.id]?.turnovers ?? 0}
                &nbsp;Ex:{playerTotals[p.id]?.exclusions ?? 0}
              </div>

              <!-- mini stat pad row 1 -->
              <div class="mt-1 grid grid-cols-3 gap-1 w-full">
                <button type="button" class="px-1 py-0.5 rounded bg-green-600 text-white text-xs font-bold" onclick={(e) => { stop(e); logStat(p.id, 'GOAL'); }}>G</button>
                <button type="button" class="px-1 py-0.5 rounded bg-blue-600 text-white text-xs font-bold" onclick={(e) => { stop(e); logStat(p.id, 'SHOT'); }}>S</button>
                <button type="button" class="px-1 py-0.5 rounded bg-amber-500 text-white text-xs font-bold" onclick={(e) => { stop(e); logStat(p.id, 'ASSIST'); }}>A</button>
              </div>

              <!-- mini stat pad row 2 -->
              <div class="mt-1 grid grid-cols-3 gap-1 w-full">
                <button type="button" class="px-1 py-0.5 rounded bg-purple-600 text-white text-xs font-bold" onclick={(e) => { stop(e); logStat(p.id, 'BLOCK'); }}>B</button>
                <button type="button" class="px-1 py-0.5 rounded bg-teal-600 text-white text-xs font-bold" onclick={(e) => { stop(e); logStat(p.id, 'STEAL'); }}>St</button>
                <button type="button" class="px-1 py-0.5 rounded bg-indigo-600 text-white text-xs font-bold" onclick={(e) => { stop(e); logStat(p.id, 'DRAWN_EXCLUSION'); }}>DEx</button>
              </div>

              <!-- mini stat pad row 3 (negative) -->
              <div class="mt-1 grid grid-cols-2 gap-1 w-full">
                <button type="button" class="px-1 py-0.5 rounded bg-red-600 text-white text-xs font-bold" onclick={(e) => { stop(e); logStat(p.id, 'TURNOVER'); }}>TO</button>
                <button type="button" class="px-1 py-0.5 rounded bg-red-700 text-white text-xs font-bold" onclick={(e) => { stop(e); logStat(p.id, 'EXCLUSION'); }}>Ex</button>
              </div>
            </div>
          {/each}
        </div>
      </div>

      <!-- Opponent Tile (desktop / tablet landscape) -->
      <div
        role="button"
        tabindex="0"
        class="hidden md:flex md:self-start flex-col items-center gap-1 w-32 p-3 rounded-lg bg-slate-800 border border-slate-700 shadow text-center text-white active:scale-95 transition-transform select-none"
        title="Tap to log Opponent Goal"
        onclick={() => logStat(undefined,'GOAL')}
        onkeydown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            logStat(undefined,'GOAL');
          }
        }}
      >
        <div class="text-lg font-bold">Opponent</div>
        <div class="text-xs text-slate-300 w-full">
          G:{opponentTotals.goals} &nbsp;S:{opponentTotals.shots}
        </div>
        <div class="mt-1 grid grid-cols-2 gap-1 w-full">
          <button
            type="button"
            class="px-1 py-0.5 rounded bg-white text-slate-800 text-xs font-bold"
            onclick={(e) => { stop(e); logStat(undefined,'GOAL'); }}
          >G</button>
          <button
            type="button"
            class="px-1 py-0.5 rounded bg-white text-slate-800 text-xs font-bold"
            onclick={(e) => { stop(e); logStat(undefined,'SHOT'); }}
          >S</button>
        </div>
      </div>
    </div>

    <!-- Opponent Tile (mobile) -->
    <div
      role="button"
      tabindex="0"
      class="md:hidden flex flex-col items-center gap-1 w-full p-3 rounded-lg bg-slate-800 border border-slate-700 shadow text-center text-white active:scale-95 transition-transform select-none mt-4"
      title="Tap to log Opponent Goal"
      onclick={() => logStat(undefined,'GOAL')}
      onkeydown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          logStat(undefined,'GOAL');
        }
      }}
    >
      <div class="text-lg font-bold">Opponent</div>
      <div class="text-xs text-slate-300 w-full">
        G:{opponentTotals.goals} &nbsp;S:{opponentTotals.shots}
      </div>
      <div class="mt-1 grid grid-cols-2 gap-1 w-full">
        <button
          type="button"
          class="px-1 py-1 rounded bg-white text-slate-800 text-sm font-bold"
          onclick={(e) => { stop(e); logStat(undefined,'GOAL'); }}
        >G</button>
        <button
          type="button"
          class="px-1 py-1 rounded bg-white text-slate-800 text-sm font-bold"
          onclick={(e) => { stop(e); logStat(undefined,'SHOT'); }}
        >S</button>
      </div>
    </div>

    <!-- BENCH PLAYERS -->
    <div class="space-y-2">
      <h2 class="text-lg font-semibold px-1">Bench ({benchPlayers.length})</h2>
      {#if benchPlayers.length === 0}
        <p class="text-sm text-slate-500 px-1">No bench players.</p>
      {:else}
        <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {#each benchPlayers as p (p.id)}
            <div
              role="button"
              tabindex="0"
              class="relative p-3 rounded-lg bg-slate-100 border shadow flex flex-col gap-1 items-center text-center opacity-60 hover:opacity-80 transition select-none cursor-pointer"
              title="Tap to activate player"
              onclick={() => tileClick(p)}
              onkeydown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  tileClick(p);
                }
              }}
            >
              <!-- status badge -->
              <span class="absolute top-1 right-1 text-[10px] px-1.5 py-0.5 rounded-full bg-slate-500 text-white font-bold">BENCH</span>
              <!-- quick activate toggle -->
              <button
                type="button"
                title="Move to active"
                class="absolute top-1 left-1 text-xs px-1 py-0.5 rounded bg-slate-200 text-slate-700 hover:bg-slate-300"
                onclick={(e) => { stop(e); setPlayerActive(p.id, true); }}
              >↕</button>

              <div class="text-2xl font-bold leading-none">{p.number}</div>
              <div class="text-sm truncate w-full">{p.name}</div>

              <!-- totals (read-only) -->
              <div class="text-xs text-slate-500 w-full">
                G:{playerTotals[p.id]?.goals ?? 0}
                &nbsp;S:{playerTotals[p.id]?.shots ?? 0}
                &nbsp;A:{playerTotals[p.id]?.assists ?? 0}
              </div>
              <div class="text-xs text-slate-500 w-full">
                B:{playerTotals[p.id]?.blocks ?? 0}
                &nbsp;St:{playerTotals[p.id]?.steals ?? 0}
                &nbsp;DEx:{playerTotals[p.id]?.drawnExclusions ?? 0}
              </div>
              <div class="text-xs text-red-600 w-full">
                TO:{playerTotals[p.id]?.turnovers ?? 0}
                &nbsp;Ex:{playerTotals[p.id]?.exclusions ?? 0}
              </div>

              <!-- disabled stat pads -->
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
            </div>
          {/each}
        </div>
      {/if}
    </div>

    <!-- Controls -->
    <div class="flex gap-4 justify-center pt-4">
      <button type="button" class="px-4 py-2 rounded bg-amber-500 text-white font-semibold" onclick={undo}>Undo</button>
      <a href="/export/{g.meta.id}" class="px-4 py-2 rounded bg-blue-600 text-white font-semibold text-center">Export</a>
    </div>
  </div>
{:else}
  <p class="p-4 text-center text-lg text-slate-500">Loading...</p>
{/if}
