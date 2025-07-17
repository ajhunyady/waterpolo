<!-- src/routes/+layout.svelte -->
<script lang="ts">
  import "../app.css"; // ensure Tailwind imported globally
  export let children: any;
</script>

<div class="min-h-screen flex flex-col bg-slate-50 text-slate-900">
  <header class="p-4 border-b bg-gray-900 shadow-sm">
    <a href="/" class="text-2xl text-white font-bold tracking-tight">
      Waterpolo Stats
    </a>
  </header>

  <main class="flex-1 p-4">
    {@render children()}
  </main>
</div>

<style lang="postcss">
  /* Bring Tailwind utilities/theme into this scoped style block if needed. */
  @reference "../app.css";
</style>