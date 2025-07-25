<script lang="ts">
  let { period, max, onPrev, onNext, labelFor } = $props<{
    period: number;
    max: number;
    onPrev: () => void;
    onNext: () => void;
    labelFor?: (p: number) => string;
  }>();
  const lab = (p: number) => labelFor ? labelFor(p) : String(p);
</script>

<div class="flex items-center justify-center gap-6 my-2">
  <button
    type="button"
    class="px-4 py-1.5 rounded-md bg-slate-200 hover:bg-slate-300 disabled:opacity-40 disabled:cursor-not-allowed"
    onclick={() => onPrev?.()}
    disabled={period <= 1}
  >Prev</button>

  <span class="w-28 text-center tabular-nums text-lg font-semibold">
    {lab(period)} / {lab(max)}
  </span>

  <button
    type="button"
    class="px-4 py-1.5 rounded-md bg-slate-200 hover:bg-slate-300 disabled:opacity-40 disabled:cursor-not-allowed"
    onclick={() => onNext?.()}
    disabled={period >= max}
  >Next</button>
</div>
