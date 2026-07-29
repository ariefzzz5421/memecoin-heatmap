const CACHE_KEY = 'chv:platform-pulse:v3';
const CACHE_TTL = 10_000;

function readCache() {
  try {
    const parsed = JSON.parse(localStorage.getItem(CACHE_KEY));
    if (!parsed || Date.now() - parsed.savedAt > CACHE_TTL) return null;
    return parsed.value;
  } catch {
    return null;
  }
}

function writeCache(value) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({ savedAt: Date.now(), value }));
  } catch {
    // The endpoint remains usable without browser storage.
  }
}

export async function fetchPlatformPulse({ force = false } = {}) {
  if (!force) {
    const cached = readCache();
    if (cached) return { ...cached, cached: true };
  }
  const response = await fetch(`/api/market?resource=sentiment&t=${Math.floor(Date.now() / 10_000)}`, {
    headers: { accept: 'application/json' },
  });
  if (!response.ok) throw new Error(`Backend HTTP ${response.status}`);
  const value = await response.json();
  if (!value?.ok) throw new Error(value?.error || 'Platform data is unavailable');
  writeCache(value);
  return { ...value, cached: value.cache === 'hit' };
}

export function clearPlatformPulseCache() {
  try {
    localStorage.removeItem(CACHE_KEY);
  } catch {
    // noop
  }
}
