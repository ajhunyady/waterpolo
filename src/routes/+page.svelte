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

  /* Per‑game overflow menu */
  let openMenuFor: ID | null = $state(null);

  /* -------------------------------------------------
   * Subscribe to games index
   * ------------------------------------------------- */
  $effect(() => {
    const unsub = gamesStore.subscribe((v) => (games = v));
    return unsub;
  });

  /* Reverse‑chronological sort */
  const sortedGames: GamesIndexEntry[] = $derived([...games].sort((a, b) => {
    if (a.date && b.date && a.date !== b.date) return b.date.localeCompare(a.date);
    const ua = a.updatedAt ?? a.createdAt ?? 0;
    const ub = b.updatedAt ?? b.createdAt ?? 0;
    if (ua !== ub) return ub - ua;
    return b.id.localeCompare(a.id);
  }));

  /* Build derived score map */
  $effect(() => {
    if (typeof window === 'undefined') return;
    const next: Record<ID, HomeInfo> = {};
    for (const g of games) {
      const data = loadJSON<GameData | null>(`game_${g.id}`, null);
      next[g.id] = data
        ? { name: data.home.name || 'Our Team', score: computeScore(data) }
        : { name: 'Our Team', score: { home: 0, opponent: 0 } };
    }
    details = next;
  });

  /* Helpers ----------------------------------------------------- */
  function newGame() { goto('/game/new'); }

  function computeScore(g: GameData): Score {
    let home = 0, opponent = 0;
    for (const e of g.events as StatEvent[]) {
      if (e.type !== 'GOAL') continue;
      e.teamId === g.home.id ? home++ : opponent++;
    }
    return { home, opponent };
  }

  function scoreClass(s: Score) {
    if (s.home > s.opponent) return 'bg-green-600 text-white';
    if (s.home < s.opponent) return 'bg-red-600 text-white';
    return 'bg-slate-400 text-white';
  }

  /* Game card overflow menu */
  function toggleMenu(id: ID, e: MouseEvent) {
    e.stopPropagation(); e.preventDefault();
    openMenuFor = openMenuFor === id ? null : id;
    if (openMenuFor === id) {
      queueMicrotask(() =>
        document.querySelector<HTMLDivElement>(`[data-menu-for="${id}"]`)?.focus()
      );
    }
  }
  function closeMenu() { openMenuFor = null; }

  function deleteGame(id: ID, e?: MouseEvent) {
    e?.stopPropagation(); e?.preventDefault();
    if (confirm('Delete this game permanently?')) {
      gameStore.deleteGame(id);
      if (openMenuFor === id) openMenuFor = null;
    }
  }

  /* Global outside‑click / Esc */
  if (typeof window !== 'undefined') {
    window.addEventListener('click', () => { openMenuFor = null; });
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') openMenuFor = null;
    });
  }
</script>

<!-- Toolbar: only New‑Game button -------------------------------->
<div class="max-w-xl mx-auto flex justify-end mb-6">
  <button
    type="button"
    class="px-4 py-2 rounded bg-green-600 text-white font-semibold shadow hover:bg-green-700 active:scale-95 transition"
    onclick={newGame}
  >
    + New Game
  </button>
</div>

<!-- Main content -------------------------------------------------->
<div class="max-w-xl mx-auto space-y-6">
  {#if sortedGames.length === 0}
    <p class="p-4 text-center text-slate-500">No games yet.</p>
  {:else}
    <ul class="space-y-3">
      {#each sortedGames as g (g.id)}
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
            <!-- Overflow trigger -->
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
                data-menu-for={g.id}
                class="absolute z-20 top-10 right-2 w-40 bg-white border rounded-lg shadow-lg py-1 text-sm"
                onkeydown={(e) => { if (e.key === 'Escape') closeMenu(); }}
                onclick={(e) => e.stopPropagation()}
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

            <!-- Score badge -->
            {#if details[g.id]}
              <div
                class={`inline-block px-3 py-1 mb-2 rounded-full text-sm font-bold ${scoreClass(details[g.id].score)}`}
              >
                {details[g.id].score.home} : {details[g.id].score.opponent}
              </div>
            {/if}

            <!-- Names & date -->
            <div class="text-lg font-semibold leading-tight">
              {details[g.id]?.name ?? 'Our Team'}
              <span class="mx-1 text-slate-400">vs</span>
              {g.opponentName ?? 'Opponent'}
            </div>
            <div class="text-sm text-slate-500 mt-1">{g.date}</div>
          </div>
        </li>
      {/each}
    </ul>
  {/if}
</div>
