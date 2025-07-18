<script lang="ts">
  import { onMount } from 'svelte';
  import { gameStore } from '$lib/stores/gameStore';
  import type { ID, StatType, GameData, Player, StatEvent } from '$lib/types';
  import type { PageData } from './$types';

  import Scoreboard from '$lib/components/Scoreboard.svelte';
  import PeriodControls from '$lib/components/PeriodControls.svelte';
  import PlayerTile from '$lib/components/PlayerTile.svelte';
  import OpponentTile from '$lib/components/OpponentTile.svelte';
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

  let { data }: { data: PageData } = $props();
  const gameId: ID = data.id as ID;

  /* state */
  let period = $state(1);
  let game: GameData | null = $state(null);

  /* subscribe to store */
  const currentGameStore = gameStore.currentGame;
  $effect(() => {
    const unsub = currentGameStore.subscribe((v) => (game = v));
    return unsub;
  });

  onMount(() => {
    if (gameId) gameStore.loadGame(gameId);
  });

  /* derived */
  const playerTotals = $derived.by<PlayerTotalsMap>(() => game ? computePlayerTotals(game) : ({} as PlayerTotalsMap));
  const teamScore = $derived.by<Score>(() => game ? computeTeamScore(game) : { home: 0, opponent: 0 });
  const opponentTotals = $derived.by<OppTotals>(() => game ? computeOpponentTotals(game) : { goals: 0, shots: 0 });
  const activePlayers = $derived.by<Player[]>(() => game ? game.home.players.filter((p) => p.active === true) : []);
  const benchPlayers = $derived.by<Player[]>(() => game ? game.home.players.filter((p) => p.active !== true) : []);
  const sortedEvents = $derived.by<StatEvent[]>(() => game ? sortEventsDesc(game) : []);

  /* undo stack */
  type ActionEvent = { kind: 'event' };
  type ActionRoster = { kind: 'roster'; playerId: ID; prevActive: boolean | undefined };
  type ActionClock = { kind: 'clock'; eventId: ID; prevClock: number | undefined };
  type ActionPeriod = { kind: 'period'; prev: number; next: number; eventId?: ID };
  type Action = ActionEvent | ActionRoster | ActionClock | ActionPeriod;
  let actionStack: Action[] = $state([]);

  /* -------- logging helpers -------- */
  function logStat(playerId: ID | undefined, type: StatType) {
    if (!game) return;
    actionStack = [...actionStack, { kind: 'event' }];
    const teamId = playerId ? game.home.id : game.opponent.id;
    gameStore.addEvent({ gameId: game.meta.id, teamId, playerId, type, period });
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

  function logPeriodStart(newPeriod: number) {
    if (!game) return;
    const prevPeriod = period;
    gameStore.addEvent({
      gameId: game.meta.id,
      teamId: game.home.id,
      type: 'PERIOD_START',
      period: newPeriod,
      clock: 0
    });
    const ev = game?.events[game.events.length - 1];
    const evId = ev?.id as ID | undefined;
    actionStack = [...actionStack, { kind: 'period', prev: prevPeriod, next: newPeriod, eventId: evId }];
  }

  /* -------- roster helpers -------- */
  function applyPlayerActive(id: ID, active: boolean | undefined) {
    if (!game) return;
    const newPlayers = game.home.players.map((pl) => (pl.id === id ? { ...pl, active } : pl));
    const newGame: GameData = { ...game, home: { ...game.home, players: newPlayers } };
    gameStore.saveGame(newGame);
  }

  function setPlayerActive(id: ID, isActive: boolean) {
    if (!game) return;
    const prev = game.home.players.find((p) => p.id === id)?.active;
    actionStack = [...actionStack, { kind: 'roster', playerId: id, prevActive: prev }];
    applyPlayerActive(id, isActive);
    logSubEvent(id, isActive);
  }

  /* -------- clock editing -------- */
  function setEventClock(eventId: ID, clock: number) {
    if (!game) return;
    const prev = game.events.find((e) => e.id === eventId)?.clock;
    actionStack = [...actionStack, { kind: 'clock', eventId, prevClock: prev }];
    gameStore.updateEventClock(game.meta.id, eventId, clock);
  }

  /* -------- undo -------- */
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
      gameStore.updateEventClock(gameId, last.eventId, last.prevClock ?? 0);
    } else if (last.kind === 'period') {
      if (last.eventId) gameStore.removeEvent(last.eventId);
      period = last.prev;
    }
  }

  /* -------- period controls -------- */
  function nextPeriod() {
    if (!game) return;
    if (period < game.meta.periods) {
      const newP = period + 1;
      period = newP;
      logPeriodStart(newP);
    }
  }
  function prevPeriod() {
    if (period > 1) period -= 1;
  }

  /* quick tile click: if active, log Goal; if bench, activate */
  function tileClick(p: Player) {
    if (p.active === true) logStat(p.id, 'GOAL');
    else setPlayerActive(p.id, true);
  }
</script>

{#if game}
  {@const g = game!}
  <div class="space-y-6 max-w-5xl mx-auto">
    <Scoreboard homeName={g.home.name} opponentName={g.opponent.name} score={teamScore} />

    <PeriodControls period={period} max={g.meta.periods} onPrev={prevPeriod} onNext={nextPeriod} />

    <!-- Active + Opponent Desktop -->
    <div class="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-4 items-start">
      <div class="space-y-2">
        <h2 class="text-lg font-semibold px-1">Active ({activePlayers.length})</h2>
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
      <h2 class="text-lg font-semibold px-1">Bench ({benchPlayers.length})</h2>
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
      on:clockchange={(e) => setEventClock(e.detail.eventId, e.detail.clock)}
    />

    <!-- Controls -->
    <div class="flex gap-4 justify-center pt-4">
      <button type="button" class="px-4 py-2 rounded bg-amber-500 text-white font-semibold" onclick={undo}>Undo</button>
      <a href="/export/{g.meta.id}" class="px-4 py-2 rounded bg-blue-600 text-white font-semibold text-center">Export</a>
    </div>
  </div>
{:else}
  <p class="p-4 text-center text-lg text-slate-500">Loading...</p>
{/if}
