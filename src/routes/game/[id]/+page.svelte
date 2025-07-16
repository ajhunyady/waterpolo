<script lang="ts">
  import { onMount } from 'svelte';
  import { gameStore } from '$lib/stores/gameStore';
  import type { ID, StatType, GameData } from '$lib/types';
  import type { PageData } from './$types';

  let { data }: { data: PageData } = $props();
  const gameId: ID = data.id as ID;

  let period = $state(1);
  let game: GameData | null = $state(null);

  const currentGameStore = gameStore.currentGame;
  $effect(() => {
    const unsub = currentGameStore.subscribe((v) => (game = v));
    return unsub;
  });

  onMount(() => {
    if (gameId) gameStore.loadGame(gameId);
  });

  /* ---- FIXED DERIVEDS ---- */
  type Totals = { goals: number; shots: number; assists: number; blocks: number };
  type PlayerTotalsMap = Record<ID, Totals>;
  type Score = { home: number; opponent: number };

  const playerTotals: PlayerTotalsMap = $derived(
    game ? computePlayerTotals(game) : ({} as PlayerTotalsMap)
  );

  const teamScore: Score = $derived(
    game ? computeTeamScore(game) : { home: 0, opponent: 0 }
  );
  /* ------------------------ */

  function logStat(playerId: ID | undefined, type: StatType) {
    if (!game) return;
    const teamId = playerId ? game.home.id : game.opponent.id;
    gameStore.addEvent({
      gameId: game.meta.id,
      teamId,
      playerId,
      type,
      period
    });
  }

  function nextPeriod() {
    if (!game) return;
    if (period < game.meta.periods) period += 1;
  }
  function prevPeriod() {
    if (period > 1) period -= 1;
  }
  function undo() {
    gameStore.undoLast();
  }

  // helpers...
  function computePlayerTotals(g: GameData): PlayerTotalsMap {
    const totals: PlayerTotalsMap = {} as PlayerTotalsMap;
    for (const p of g.home.players) {
      totals[p.id] = { goals: 0, shots: 0, assists: 0, blocks: 0 };
    }
    for (const e of g.events) {
      if (!e.playerId) continue;
      const t = totals[e.playerId];
      if (!t) continue;
      switch (e.type) {
        case 'GOAL': t.goals++; break;
        case 'SHOT': t.shots++; break;
        case 'ASSIST': t.assists++; break;
        case 'BLOCK': t.blocks++; break;
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
