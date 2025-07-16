<!-- src/routes/+layout.svelte -->
<script lang="ts">
  import "../app.css"; // ensure Tailwind imported globally
  export let children: any;
</script>

<div class="min-h-screen bg-slate-100 text-slate-900 flex flex-col max-w-[100vw] overflow-x-hidden">
  <header class="p-2 sm:p-4 bg-slate-900 text-white text-center text-xl font-semibold select-none">Waterpolo Stats</header>
  <main class="flex-1 w-full max-w-5xl mx-auto p-2 sm:p-4">{@render children()}</main>
</div>
