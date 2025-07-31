<script lang="ts">
  import type { ID, StatType, GameData, Player, StatEvent } from '$lib/types';
  import type { PageData } from './$types';
  import { onMount } from 'svelte';
  import { gameStore } from '$lib/stores/gameStore';
  import { createPeriodController } from '$lib/game/periodController';
  import { periodLabel } from '$lib/game/periodRules';
  import Scoreboard from '$lib/components/Scoreboard.svelte';
  import PeriodControls from '$lib/components/PeriodControls.svelte';
  import PlayerTile from '$lib/components/PlayerTile.svelte';
  import OpponentTile from '$lib/components/OpponentTile.svelte';
  import OvertimeSettings from '$lib/components/OvertimeSettings.svelte';
  import EventLog from '$lib/components/EventLog.svelte';
  import {
    computePlayerTotals,
    computeTeamScore,
    computeOpponentTotals,
    sortEventsDesc,
    type PlayerTotalsMap,
    type Score,
    type OppTotals
  } from '$lib/game/utils';

  
  /* ----- route data ----- */
  let { data }: { data: PageData } = $props();
  const gameId: ID = data.id as ID;

  /* ----- state ----- */
  let period = $state(1);
  let game: GameData | null = $state(null);
  let loadError: string | null = $state(null);

  /* ----- subscribe to current game store ----- */
  const currentGameStore = gameStore.currentGame;
  $effect(() => {
    const unsub = currentGameStore.subscribe((v) => {
      game = v;
    });
    return unsub;
  });

  onMount(async () => {
    if (!gameId) {
      loadError = 'Missing game id';
      return;
    }
    try {
      await gameStore.loadGame(gameId);
    } catch (e) {
      loadError = (e as Error).message ?? 'Failed to load game';
    }
  });

  /* ----- derived values ----- */
  const playerTotals = $derived.by<PlayerTotalsMap>(() =>
    game ? computePlayerTotals(game) : ({} as PlayerTotalsMap)
  );
  const teamScore = $derived.by<Score>(() =>
    game ? computeTeamScore(game) : { home: 0, opponent: 0 }
  );
  const opponentTotals = $derived.by<OppTotals>(() =>
    game ? computeOpponentTotals(game) : { goals: 0, shots: 0 }
  );
  const activePlayers = $derived.by<Player[]>(() =>
    game ? game.home.players.filter((p) => p.active === true) : []
  );
  const benchPlayers = $derived.by<Player[]>(() =>
    game ? game.home.players.filter((p) => p.active !== true) : []
  );
  const sortedEvents = $derived.by<StatEvent[]>(() =>
    game ? sortEventsDesc(game) : []
  );

  /* ----- undo stack (page-level) ----- */
  type ActionEvent = { kind: 'event' };
  type ActionRoster = { kind: 'roster'; playerId: ID; prevActive: boolean | undefined };
  type ActionClock = { kind: 'clock'; eventId: ID; prevClock: number | undefined };
  type ActionPeriod = { kind: 'period'; prev: number; next: number; eventId?: ID };
  type Action = ActionEvent | ActionRoster | ActionClock | ActionPeriod;
  let actionStack: Action[] = $state([]);

  /* ----- period controller (encapsulated logic) ----- */
   const dynamicMax = $derived.by<number>(() => {
     if (!game) return 0;
    return (
      game.meta.totalPeriods ??
      (game.meta.periods +
        (game.meta.overtimePeriods ?? 0) +
        (game.meta.shootoutEnabled ? 1 : 0))
    );
  });

  const periodController = createPeriodController({
    getGame: () => game,
    getPeriod: () => period,
    setPeriod: (p) => { period = p; },
    pushAction: (a) => { actionStack = [...actionStack, a]; },
    addEvent: (args) => gameStore.addEvent(args),
    saveGame: (g) => gameStore.saveGame(g),
    getMax: () => dynamicMax
  });

  /* ----- event logging helpers ----- */
  function logStat(playerId: ID | undefined, type: StatType) {
    if (!game) return;
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

  function logSubEvent(playerId: ID, becameActive: boolean) {
    if (!game) return;
    actionStack = [...actionStack, { kind: 'event' }];
    gameStore.addEvent({
      gameId: game.meta.id,
      teamId: game.home.id,
      playerId,
      type: becameActive ? 'SUB_IN' : 'SUB_OUT',
      period
    });
  }

  /* ----- roster helpers ----- */
  function applyPlayerActive(id: ID, active: boolean | undefined) {
    if (!game) return;
    const newPlayers = game.home.players.map((pl) =>
      pl.id === id ? { ...pl, active } : pl
    );
    const newGame: GameData = {
      ...game,
      home: { ...game.home, players: newPlayers }
    };
    gameStore.saveGame(newGame);
  }

  function setPlayerActive(id: ID, isActive: boolean) {
    if (!game) return;
    const prev = game.home.players.find((p) => p.id === id)?.active;
    actionStack = [
      ...actionStack,
      { kind: 'roster', playerId: id, prevActive: prev }
    ];
    applyPlayerActive(id, isActive);
    logSubEvent(id, isActive);
  }

  /* ----- clock editing ----- */
  function setEventClock(eventId: ID, clock: number) {
    if (!game) return;
    const prev = game.events.find((e) => e.id === eventId)?.clock;
    actionStack = [
      ...actionStack,
      { kind: 'clock', eventId, prevClock: prev }
    ];
    gameStore.updateEventClock(game.meta.id, eventId, clock);
  }

  /* ----- undo ----- */
  function undo() {
    if (actionStack.length === 0) {
      gameStore.undoLast();
      return;
    }
    const last = actionStack.at(-1)!;
    actionStack = actionStack.slice(0, -1);

    if (last.kind === 'event') {
      gameStore.undoLast();
    } else if (last.kind === 'roster') {
      applyPlayerActive(last.playerId, last.prevActive);
    } else if (last.kind === 'clock') {
      gameStore.updateEventClock(
        gameId,
        last.eventId,
        last.prevClock ?? 0
      );
    } else if (last.kind === 'period') {
      if (last.eventId) gameStore.removeEvent(last.eventId);
      period = last.prev;
    }
  }
</script>

{#if game}
  {@const g = game!}
  <div class="space-y-6 max-w-5xl mx-auto">

    <!-- Score & Period Controls -->
    <div class="space-y-1">
      <Scoreboard
        homeName={g.home.name}
        opponentName={g.opponent.name}
        score={teamScore}
      />
      <PeriodControls
        period={period}
        max={dynamicMax}
        labelFor={(p) => game ? periodLabel(p, game.meta) : String(p)}
        onPrev={() => periodController.prev()}
        onNext={() => periodController.next()}
      />
    </div>

    <!-- OverTime control -->
    <OvertimeSettings />

    <!-- Active + Opponent Desktop -->
    <div class="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-4 items-start">
      <div class="space-y-2">
        <h2 class="text-lg font-semibold px-1">
          Active ({activePlayers.length})
        </h2>
        <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {#each activePlayers as p (p.id)}
            <PlayerTile
              player={p}
              totals={playerTotals[p.id]}
              isActive={true}
              onToggleActive={() => setPlayerActive(p.id, false)}
              onGoal={() => logStat(p.id, 'GOAL')}
              onShot={() => logStat(p.id, 'SHOT')}
              onAssist={() => logStat(p.id, 'ASSIST')}
              onBlock={() => logStat(p.id, 'BLOCK')}
              onSteal={() => logStat(p.id, 'STEAL')}
              onDrawnEx={() => logStat(p.id, 'DRAWN_EXCLUSION')}
              onTurnover={() => logStat(p.id, 'TURNOVER')}
              onExclusion={() => logStat(p.id, 'EXCLUSION')}
            />
          {/each}
        </div>
      </div>

      <div class="hidden md:block">
        <OpponentTile
          totals={opponentTotals}
          onGoal={() => logStat(undefined, 'GOAL')}
          onShot={() => logStat(undefined, 'SHOT')}
        />
      </div>
    </div>

    <!-- Opponent Mobile -->
    <div class="md:hidden">
      <OpponentTile
        totals={opponentTotals}
        compact={true}
        onGoal={() => logStat(undefined, 'GOAL')}
        onShot={() => logStat(undefined, 'SHOT')}
      />
    </div>

    <!-- Bench -->
    <div class="space-y-2">
      <h2 class="text-lg font-semibold px-1">
        Bench ({benchPlayers.length})
      </h2>
      {#if benchPlayers.length === 0}
        <p class="text-sm text-slate-500 px-1">No bench players.</p>
      {:else}
        <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {#each benchPlayers as p (p.id)}
            <PlayerTile
              player={p}
              totals={playerTotals[p.id]}
              isActive={false}
              onToggleActive={() => setPlayerActive(p.id, true)}
              onGoal={() => logStat(p.id, 'GOAL')}
              onShot={() => logStat(p.id, 'SHOT')}
              onAssist={() => logStat(p.id, 'ASSIST')}
              onBlock={() => logStat(p.id, 'BLOCK')}
              onSteal={() => logStat(p.id, 'STEAL')}
              onDrawnEx={() => logStat(p.id, 'DRAWN_EXCLUSION')}
              onTurnover={() => logStat(p.id, 'TURNOVER')}
              onExclusion={() => logStat(p.id, 'EXCLUSION')}
            />
          {/each}
        </div>
      {/if}
    </div>

    <!-- Event Log -->
    <EventLog
      game={g}
      events={sortedEvents}
      onClockChange={(eventId, clock) => setEventClock(eventId, clock)}
    />

    <!-- Controls -->
    <div class="flex gap-4 justify-center pt-4">
      <button
        type="button"
        class="px-4 py-2 rounded bg-amber-500 text-white font-semibold"
        onclick={undo}
      >
        Undo
      </button>
      <a
        href={`/game/${g.meta.id}/export`}
        class="inline-flex items-center justify-center rounded-md bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
      >
        Export
      </a>
    </div>
  </div>
{:else if loadError}
  <p class="p-4 text-center text-red-600">{loadError}</p>
{:else}
  <p class="p-4 text-center text-lg text-slate-500">Loading...</p>
{/if}