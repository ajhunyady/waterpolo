<script lang="ts">
  import type { Score } from '$lib/game/utils';

  let {
    homeName,
    opponentName,
    score
  }: {
    homeName: string;
    opponentName: string;
    score: Score;
  } = $props();
</script>

<div class="grid grid-cols-3 items-center gap-2 text-center">
  <div class="truncate text-xl font-semibold">{homeName}</div>
  <div class="text-3xl font-bold">{score.home} : {score.opponent}</div>
  <div class="truncate text-xl font-semibold">{opponentName}</div>
</div>
