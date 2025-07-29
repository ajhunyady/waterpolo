<script lang="ts">
  import { teamStore } from '$lib/stores/teamStore';
  import { onDestroy } from 'svelte';
  import type { TeamIndexEntry } from '$lib/stores/teamStore';
  import type { ID } from '$lib/types';

  // Bindable props
  let {
    selectedTeamId = $bindable(''),
    teamName = $bindable('')
  } = $props<{ selectedTeamId?: ID | ''; teamName?: string }>();

  let teams: TeamIndexEntry[] = $state([]);
  const unsub = teamStore.teams.subscribe((v) => (teams = v));
  onDestroy(() => unsub());

  // Keep teamName in sync if selectedTeamId changes externally
  $effect(() => {
    if (selectedTeamId) {
      const t = teams.find((tt) => tt.id === selectedTeamId);
      if (t && teamName !== t.name) teamName = t.name;
    }
  });

  function onInput(e: Event) {
    const value = (e.target as HTMLInputElement).value;
    teamName = value;
    const match = teams.find((t) => t.name === value);
    selectedTeamId = match?.id ?? '';
  }
</script>

<div class="relative">
  <input
    list="team-names"
    class="input"
    bind:value={teamName}
    oninput={onInput}
    placeholder="Our Team"
  />
  <datalist id="team-names">
    {#each teams as t}
      <option value={t.name}></option>
    {/each}
  </datalist>
</div>
