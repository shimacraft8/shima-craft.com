const PROGRESS_KEY = 'amami-road-quest.progress.v1';
const API_KEY_STORAGE = 'amami-road-quest.embed-key.v1';
const API_KEY_SESSION = 'amami-road-quest.embed-key.session.v1';

function safeParse(value, fallback) {
  try { return value ? JSON.parse(value) : fallback; } catch { return fallback; }
}

export function loadProgress() {
  return safeParse(localStorage.getItem(PROGRESS_KEY), {});
}

export function saveRouteResult(routeId, result) {
  const current = loadProgress();
  const previous = current[routeId] ?? {};
  current[routeId] = {
    bestScore: Math.max(previous.bestScore ?? 0, result.score ?? 0),
    completed: Boolean(previous.completed || result.goalReached),
    lastPlayedAt: new Date().toISOString()
  };
  localStorage.setItem(PROGRESS_KEY, JSON.stringify(current));
}

export function saveApiKey(apiKey, remember) {
  clearApiKey();
  if (!apiKey) return;
  (remember ? localStorage : sessionStorage).setItem(remember ? API_KEY_STORAGE : API_KEY_SESSION, apiKey);
}

export function loadSiteConfigKey() {
  const key = globalThis.__AMAMI_CONFIG__?.embedApiKey;
  return typeof key === 'string' ? key.trim() : '';
}

export function loadApiKey() {
  return loadSiteConfigKey() || sessionStorage.getItem(API_KEY_SESSION) || localStorage.getItem(API_KEY_STORAGE) || '';
}

export function isApiKeyRemembered() {
  return Boolean(localStorage.getItem(API_KEY_STORAGE));
}

export function clearApiKey() {
  localStorage.removeItem(API_KEY_STORAGE);
  sessionStorage.removeItem(API_KEY_SESSION);
}
