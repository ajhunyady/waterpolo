<script lang="ts">
  // Svelte 5 rune style:
  let { period, max, onPrev, onNext } = $props<{
    period: number;
    max: number;
    onPrev: () => void;
    onNext: () => void;
  }>();
</script>

<div class="flex items-center justify-center gap-2">
  <button onclick={() => onPrev?.()} disabled={period <= 1}>Prev</button>
  <span>{period} / {max}</span>
  <button onclick={() => onNext?.()} disabled={period >= max}>Next</button>
</div>
