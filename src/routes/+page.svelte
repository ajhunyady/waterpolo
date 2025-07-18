<script lang="ts">
  import { gameStore } from '$lib/stores/gameStore';
  import { goto } from '$app/navigation';
  import { loadJSON } from '$lib/persist';
  import type { GamesIndexEntry, GameData, ID, StatEvent } from '$lib/types';

  /* Index store subscription */
  const gamesStore = gameStore.games;
  let games: GamesIndexEntry[] = $state([]);

  /* Derived details (home team name + score) */
  interface Score { home: number; opponent: number; }
  interface HomeInfo { name: string; score: Score; }
  let details: Record<ID, HomeInfo> = $state({} as Record<ID, HomeInfo>);

  /* Overflow menu state */
  let openMenuFor: ID | null = $state(null);

  /* Subscribe to index */
  $effect(() => {
    const unsub = gamesStore.subscribe((v) => (games = v));
    return unsub;
  });

  /* Populate derived details whenever games list changes (client only) */
  $effect(() => {
    if (typeof window === 'undefined') return;
    const next: Record<ID, HomeInfo> = {};
    for (const g of games) {
      const data = loadGameData(g.id);
      if (data) {
        next[g.id] = {
          name: data.home.name || 'Our Team',
          score: computeScore(data)
        };
      } else {
        next[g.id] = {
          name: 'Our Team',
          score: { home: 0, opponent: 0 }
        };
      }
    }
    details = next;
  });

  function newGame() {
    goto('/game/new');
  }

  function loadGameData(id: ID): GameData | null {
    return loadJSON<GameData | null>(`game_${id}`, null);
  }

  function computeScore(g: GameData): Score {
    let home = 0;
    let opponent = 0;
    const homeId = g.home.id;
    for (const e of g.events as StatEvent[]) {
      if (e.type !== 'GOAL') continue;
      if (e.teamId === homeId) home++;
      else opponent++;
    }
    return { home, opponent };
  }

  function scoreClass(s: Score): string {
    if (s.home > s.opponent) return 'bg-green-600 text-white';
    if (s.home < s.opponent) return 'bg-red-600 text-white';
    return 'bg-slate-400 text-white';
  }

  function toggleMenu(id: ID, e: MouseEvent) {
    e.stopPropagation();
    e.preventDefault();
    openMenuFor = openMenuFor === id ? null : id;
    if (openMenuFor === id) {
      queueMicrotask(() => {
        const menu = document.querySelector<HTMLDivElement>(`[data-menu-for="${id}"]`);
        menu?.focus();
      });
    }
  }

  function closeMenu() {
    openMenuFor = null;
  }

  function deleteGame(id: ID, e?: MouseEvent) {
    if (e) {
      e.stopPropagation();
      e.preventDefault();
    }
    if (confirm('Delete this game permanently? This cannot be undone.')) {
      gameStore.deleteGame(id);
      if (openMenuFor === id) openMenuFor = null;
    }
  }

  // Outside click to close menu
  if (typeof window !== 'undefined') {
    window.addEventListener('click', () => {
      if (openMenuFor) openMenuFor = null;
    });
  }
</script>

<div class="max-w-xl mx-auto space-y-6">
  <div class="flex justify-end">
    <button
      type="button"
      class="px-4 py-2 rounded bg-green-600 text-white font-semibold shadow hover:bg-green-700 active:scale-95 transition"
      onclick={newGame}
    >
      + New Game
    </button>
  </div>

  {#if games.length === 0}
    <p class="p-4 text-center text-slate-500">No games yet.</p>
  {:else}
    <ul class="space-y-3">
      {#each games as g}
        {#key g.id}
          <li>
            <div
              role="button"
              tabindex="0"
              onclick={() => goto(`/game/${g.id}`)}
              onkeydown={(ev) => {
                if (ev.key === 'Enter' || ev.key === ' ') {
                  ev.preventDefault();
                  goto(`/game/${g.id}`);
                }
                if (ev.key === 'Escape') closeMenu();
              }}
              class="relative p-4 rounded-xl border bg-white shadow hover:shadow-md hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500 transition cursor-pointer"
            >
              <!-- Overflow Menu Trigger -->
              <button
                type="button"
                aria-haspopup="menu"
                aria-expanded={openMenuFor === g.id}
                aria-label="Game actions"
                class="absolute top-2 right-2 w-8 h-8 inline-flex items-center justify-center rounded-full text-slate-500 hover:bg-slate-100 hover:text-slate-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-500"
                onclick={(e) => toggleMenu(g.id, e)}
              >⋯</button>

            {#if openMenuFor === g.id}
              <div
                role="menu"
                tabindex="-1"
                aria-label="Game actions"
                class="absolute z-20 top-10 right-2 w-40 bg-white border rounded-lg shadow-lg py-1 text-sm"
                onkeydown={(e) => { if (e.key === 'Escape') closeMenu(); }}
                onclick={(e) => { e.stopPropagation(); }}
              >
                <button
                  role="menuitem"
                  type="button"
                  class="w-full text-left px-3 py-2 hover:bg-red-50 hover:text-red-700 flex items-center gap-2"
                  onclick={(e) => { e.stopPropagation(); deleteGame(g.id, e); }}
                >
                  🗑️ <span>Delete</span>
                </button>
              </div>
            {/if}


              <!-- Score Badge -->
              {#if details[g.id]}
                <div
                  class={`inline-block px-3 py-1 mb-2 rounded-full text-sm font-bold ${scoreClass(details[g.id].score)}`}
                >
                  {details[g.id].score.home} : {details[g.id].score.opponent}
                </div>
              {:else}
                <div class="inline-block px-3 py-1 mb-2 rounded-full text-sm font-bold bg-slate-300 text-slate-800">
                  0 : 0
                </div>
              {/if}

              <!-- Names & Date -->
              <div class="text-lg font-semibold leading-tight">
                {details[g.id]?.name ?? 'Our Team'}
                <span class="mx-1 text-slate-400">vs</span>
                {g.opponentName ?? 'Opponent'}
              </div>
              <div class="text-sm text-slate-500 mt-1">{g.date}</div>
            </div>
          </li>
        {/key}
      {/each}
    </ul>
  {/if}
</div>
