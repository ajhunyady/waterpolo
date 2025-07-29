<!-- src/routes/+layout.svelte -->
<script lang="ts">
  import "../app.css";
  export let children: any;

  let avatarOpen = false;

  function openSettings() {
    window.location.href = "/settings";
  }
  function openTeams() {
    window.location.href = "/teams";
  }

  // Close on outside click or Escape
  if (typeof window !== "undefined") {
    window.addEventListener("click", () => (avatarOpen = false));
    window.addEventListener("keydown", (e) => {
      if (e.key === "Escape") avatarOpen = false;
    });
  }
</script>

<div class="min-h-screen flex flex-col bg-slate-50 text-slate-900">
  <!-- Header (always one row; avatar never drops) ----------------->
  <header class="border-b bg-gray-900 shadow-sm">
    <div class="w-full max-w-screen-xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
      <div class="flex flex-nowrap items-center justify-between gap-3">
        <!-- Brand: allow truncation so the avatar never wraps -->
        <a
          href="/"
          class="min-w-0 overflow-hidden text-ellipsis whitespace-nowrap text-xl sm:text-2xl text-white font-bold tracking-tight"
        >
          Waterpolo&nbsp;Stats
        </a>

        <!-- Right-side controls (no shrink so they stay visible) -->
        <nav class="flex items-center gap-3 shrink-0">
          <div class="relative shrink-0">
            <button
              type="button"
              aria-label="User menu"
              aria-haspopup="menu"
              aria-expanded={avatarOpen}
              title="User menu"
              class="w-9 h-9 flex items-center justify-center text-white hover:text-white/80 active:scale-95 transition"
              onclick={(e) => {
                e.stopPropagation();
                avatarOpen = !avatarOpen;
              }}
            >
              <!-- High-contrast outline avatar for dark headers -->
              <svg
                aria-hidden="true"
                class="w-6 h-6 md:w-7 md:h-7"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2.4"
                stroke-linecap="round"
                stroke-linejoin="round"
              >
                <circle cx="12" cy="7.5" r="4.2" />
                <path d="M4.2 20.5a7.8 7.8 0 0 1 15.6 0" />
              </svg>
            </button>

            {#if avatarOpen}
              <div
                role="menu"
                tabindex="-1"
                aria-label="User menu"
                class="absolute right-0 mt-2 w-44 sm:w-48 bg-white border rounded-lg shadow-lg py-1 text-sm z-30"
                onclick={(e) => e.stopPropagation()}
                onkeydown={(e) => { if (e.key === 'Escape') avatarOpen = false; }}
              >
                <!-- Teams (new) -->
                <button
                  type="button"
                  role="menuitem"
                  class="w-full text-left px-3 py-2 hover:bg-slate-50 flex items-center gap-2"
                  onclick={() => { avatarOpen = false; openTeams(); }}
                >
                  👥 <span>Teams</span>
                </button>

                <!-- Settings -->
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
        </nav>
      </div>
    </div>
  </header>

  <!-- Main slot ----------------------------------------------->
  <main class="flex-1 px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
    {@render children()}
  </main>
</div>

<style lang="postcss">
  @reference "../app.css";
</style>
