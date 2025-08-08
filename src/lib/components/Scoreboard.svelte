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
  <div class="truncate text-xl font-semibold flex items-center justify-center gap-1">
    <span aria-hidden="true">🏠</span>
    {homeName}
  </div>
  <div class="text-3xl font-bold">{score.home} : {score.opponent}</div>
  <div class="truncate text-xl font-semibold flex items-center justify-center gap-1">
    <span aria-hidden="true">✈️</span>
    {opponentName}
  </div>
</div>
