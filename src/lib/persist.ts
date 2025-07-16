const STORAGE_PREFIX = 'wpstat_v1';

function key(path: string) {
  return `${STORAGE_PREFIX}:${path}`;
}

export function saveJSON(path: string, data: unknown) {
  if (typeof localStorage === 'undefined') return;
  localStorage.setItem(key(path), JSON.stringify(data));
}

export function loadJSON<T>(path: string, fallback: T): T {
  if (typeof localStorage === 'undefined') return fallback;
  const raw = localStorage.getItem(key(path));
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch (err) {
    console.warn('persist: parse error', err);
    return fallback;
  }
}

export function remove(path: string) {
  if (typeof localStorage === 'undefined') return;
  localStorage.removeItem(key(path));
}

export function listKeys(): string[] {
  if (typeof localStorage === 'undefined') return [];
  return Object.keys(localStorage).filter((k) => k.startsWith(`${STORAGE_PREFIX}:`));
}