// src/lib/stores/teamStore.ts
import { writable, get } from 'svelte/store';
import { v4 as uuid } from 'uuid';
import { saveJSON, loadJSON, remove, listKeys } from '$lib/persist';
import type { Team, Player, ID } from '$lib/types';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */
export interface TeamIndexEntry {
  id: ID;
  name: string;
  playersCount: number;
  createdAt: number;
  updatedAt: number;
}

/* ------------------------------------------------------------------ */
/*  Storage keys                                                       */
/* ------------------------------------------------------------------ */
const TEAMS_INDEX_KEY = 'teams_index';
function teamKey(id: ID) {
  return `team_${id}`;
}

/* ------------------------------------------------------------------ */
/*  Index helpers                                                      */
/* ------------------------------------------------------------------ */
function loadIndex(): TeamIndexEntry[] {
  return loadJSON<TeamIndexEntry[]>(TEAMS_INDEX_KEY, []);
}

function saveIndex(ix: TeamIndexEntry[]) {
  saveJSON(TEAMS_INDEX_KEY, ix);
}

/* Optional: scan/refresh for orphaned records (not used by default) */
function refreshIndex() {
  const ix = loadIndex();
  const set = new Set(ix.map((e) => e.id));
  const keys = listKeys?.() ?? [];
  let changed = false;
  for (const k of keys) {
    if (k.startsWith('team_')) {
      const id = k.slice(5) as ID;
      if (!set.has(id)) {
        // Could attempt to resurrect, but disabled by default.
        // const data = loadJSON<Team | null>(k, null);
        // if (data) {
        //   ix.push({
        //     id,
        //     name: data.name,
        //     playersCount: data.players?.length ?? 0,
        //     createdAt: Date.now(),
        //     updatedAt: Date.now()
        //   });
        //   changed = true;
        // }
      }
    }
  }
  if (changed) saveIndex(ix);
}

/* ------------------------------------------------------------------ */
/*  Raw team persistence                                               */
/* ------------------------------------------------------------------ */
function loadTeamData(id: ID): Team | null {
  return loadJSON<Team | null>(teamKey(id), null);
}

function saveTeamData(team: Team) {
  saveJSON(teamKey(team.id as ID), team);
}

function deleteTeamData(id: ID) {
  remove(teamKey(id));
}

/* ------------------------------------------------------------------ */
/*  Svelte stores                                                      */
/* ------------------------------------------------------------------ */
const teams = writable<TeamIndexEntry[]>(loadIndex());
const currentTeam = writable<Team | null>(null);

/* ------------------------------------------------------------------ */
/*  CRUD                                                               */
/* ------------------------------------------------------------------ */
async function createTeam(name = 'New Team', players: Player[] = []): Promise<ID> {
  const id = uuid() as ID;
  const now = Date.now();

  const withIds = players.map((p) => ({ ...p, id: p.id ?? uuid() }));
  const team: Team = {
    id,
    name,
    players: withIds
  };

  saveTeamData(team);

  const entry: TeamIndexEntry = {
    id,
    name,
    playersCount: withIds.length,
    createdAt: now,
    updatedAt: now
  };

  teams.update((ix) => {
    const next = [...ix, entry];
    saveIndex(next);
    return next;
  });

  currentTeam.set(team);
  return id;
}

async function loadTeam(id: ID): Promise<Team | null> {
  const raw = loadTeamData(id);
  currentTeam.set(raw);
  return raw;
}

async function saveTeam(team: Team): Promise<void> {
  const now = Date.now();
  saveTeamData(team);

  teams.update((ix) => {
    const i = ix.findIndex((e) => e.id === (team.id as ID));
    const entry: TeamIndexEntry = {
      id: team.id as ID,
      name: team.name,
      playersCount: team.players?.length ?? 0,
      createdAt: i !== -1 ? ix[i].createdAt : now,
      updatedAt: now
    };
    if (i !== -1) {
      const next = [...ix];
      next[i] = entry;
      saveIndex(next);
      return next;
    } else {
      const next = [...ix, entry];
      saveIndex(next);
      return next;
    }
  });

  currentTeam.set({ ...team, players: [...(team.players ?? [])] });
}

async function deleteTeam(id: ID): Promise<void> {
  deleteTeamData(id);
  teams.update((ix) => {
    const next = ix.filter((e) => e.id !== id);
    saveIndex(next);
    return next;
  });
  const cur = get(currentTeam);
  if (cur?.id === id) currentTeam.set(null);
}

/* ------------------------------------------------------------------ */
/*  Exported API                                                       */
/* ------------------------------------------------------------------ */
export const teamStore = {
  teams,
  currentTeam,
  createTeam,
  loadTeam,
  saveTeam,
  deleteTeam,
};
