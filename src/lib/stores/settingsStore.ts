import { writable } from 'svelte/store';
import { loadJSON, saveJSON } from '$lib/persist';
import type { AppSettings } from '$lib/settings';

const SETTINGS_KEY = 'app_settings_v1';

const DEFAULT_SETTINGS: AppSettings = {
  defaultPeriods: 4,
  defaultOvertimePeriods: 2,
  defaultShootoutEnabled: false,
  autoShotOnGoal: true,
  trackOpponentPlayers: false
};

const initial = loadJSON<AppSettings>(SETTINGS_KEY, DEFAULT_SETTINGS);

export const settingsStore = writable<AppSettings>(initial);

// persist on every change
settingsStore.subscribe((v) => saveJSON(SETTINGS_KEY, v));