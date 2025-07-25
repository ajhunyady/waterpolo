<!-- src/routes/+layout.svelte -->
<script lang="ts">
  import "../app.css";          // Tailwind globally
  export let children: any;

  /* avatar dropdown state (layout‑wide) */
  let avatarOpen = false;

  /* navigate without importing goto everywhere */
  function openSettings() {
    window.location.href = "/settings";
  }

  /* close on outside click / Esc */
  if (typeof window !== "undefined") {
    window.addEventListener("click", () => (avatarOpen = false));
    window.addEventListener("keydown", (e) => {
      if (e.key === "Escape") avatarOpen = false;
    });
  }
</script>

<div class="min-h-screen flex flex-col bg-slate-50 text-slate-900">
  <!-- Header ---------------------------------------------------->
  <header class="p-4 border-b bg-gray-900 shadow-sm">
    <div class="max-w-xl mx-auto flex items-center justify-between">
      <a href="/" class="text-2xl text-white font-bold tracking-tight">
        Waterpolo Stats
      </a>

      <!-- avatar button + dropdown -->
      <div class="relative">
        <button
          type="button"
          aria-label="User menu"
          title="User menu"
          class="w-9 h-9 flex items-center justify-center text-2xl text-slate-300 hover:text-white active:scale-95 transition"
          onclick={(e) => {
            e.stopPropagation();
            avatarOpen = !avatarOpen;
          }}
        >
          👤
        </button>

      {#if avatarOpen}
        <div
          role="menu"
          tabindex="-1"
          aria-label="User menu"
          class="absolute right-0 mt-2 w-44 bg-white border rounded-lg shadow-lg py-1 text-sm z-30"
          onclick={(e) => e.stopPropagation()}
          onkeydown={(e) => {
            // keep the menu from closing on keyboard activation inside
            if (e.key === 'Escape') avatarOpen = false;
            if (e.key === ' ' || e.key === 'Enter') e.stopPropagation();
          }}
        >
          <button
            type="button"
            role="menuitem"
            class="w-full text-left px-3 py-2 hover:bg-slate-50 flex items-center gap-2"
            onclick={() => { avatarOpen = false; openSettings(); }}
          >
            ⚙️ <span>Settings</span>
          </button>
        </div>
      {/if}

      </div>
    </div>
  </header>

  <!-- Main slot ----------------------------------------------->
  <main class="flex-1 p-4">
    {@render children()}
  </main>
</div>

<style lang="postcss">
  /* Reference Tailwind utilities if you need scoped styles. */
  @reference "../app.css";
</style>