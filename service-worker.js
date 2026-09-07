/**
 * ClimateGuard - Service Worker (offline-first static shell)
 *
 * - Static shell (HTML/CSS/JS/icons/manifest): stale-while-revalidate —
 *   instant paint from cache, refreshed in the background.
 * - Weather APIs (OpenWeatherMap, Open-Meteo): network-first with runtime
 *   cache fallback so forecasts survive short outages.
 * - Navigations: network-first, falling back to cache, then the cached
 *   start page so the app always boots a shell offline.
 */
const STATIC_CACHE = 'climateguard-static-v1';
const RUNTIME_CACHE = 'climateguard-runtime-v1';
const START_URL = 'pages/index.html';
const API_HOSTS = ['api.openweathermap.org', 'tile.openweathermap.org', 'api.open-meteo.com'];

const STATIC_ASSETS = [
  'index.html',
  'manifest.json',
  'pages/compare.html',
  'pages/emergency.html',
  'pages/hourly.html',
  'pages/index.html',
  'pages/map.html',
  'pages/risk-report.html',
  'pages/search.html',
  'pages/trip-planner.html',
  'pages/weekly.html',
  'css/animations.css',
  'css/base.css',
  'css/components.css',
  'css/extended.css',
  'css/layout.css',
  'css/map-page.css',
  'css/risk-report.css',
  'css/themes.css',
  'css/trip-planner.css',
  'css/weather-effects.css',
  'js/animation-engine.js',
  'js/api.js',
  'js/app.js',
  'js/config.js',
  'js/i18n.js',
  'js/particles.js',
  'js/pwa.js',
  'js/risk-engine.js',
  'js/settings-handler.js',
  'js/storage.js',
  'js/theme.js',
  'js/ui.js',
  'js/units.js',
  'js/weather-engine.js',
  'icons/apple-touch-icon.png',
  'icons/icon-192.png',
  'icons/icon-512.png',
  'icons/maskable-512.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then((cache) => cache.addAll(STATIC_ASSETS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys
          .filter((k) => k !== STATIC_CACHE && k !== RUNTIME_CACHE)
          .map((k) => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

function isApiRequest(url) {
  return API_HOSTS.some((h) => url.hostname.includes(h));
}

function isNavigation(request) {
  return request.mode === 'navigate' || request.destination === 'document';
}

// Static: serve cache instantly, refresh in background.
async function staleWhileRevalidate(request) {
  const cache = await caches.open(STATIC_CACHE);
  const cached = await cache.match(request);
  const network = fetch(request).then((res) => {
    if (res && res.ok) cache.put(request, res.clone());
    return res;
  }).catch(() => null);
  if (cached) return cached;
  const fresh = await network;
  if (fresh) return fresh;
  return fetch(request); // last resort: let it reject naturally
}

// Weather data: fresh when online, runtime cache when not.
async function networkFirst(request) {
  try {
    const res = await fetch(request);
    if (res && res.ok) {
      const cache = await caches.open(RUNTIME_CACHE);
      cache.put(request, res.clone());
    }
    return res;
  } catch (err) {
    const cached = await caches.match(request);
    if (cached) return cached;
    throw err;
  }
}

// Navigations: network, then cache, then the cached start page shell.
async function navigationFallback(request) {
  try {
    const res = await fetch(request);
    if (res && res.ok) {
      const cache = await caches.open(RUNTIME_CACHE);
      cache.put(request, res.clone());
    }
    return res;
  } catch (err) {
    const cached = await caches.match(request);
    if (cached) return cached;
    const shell = await caches.match(START_URL);
    if (shell) return shell;
    throw err;
  }
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (!request || request.method !== 'GET') return;
  const url = new URL(request.url);
  if (isApiRequest(url)) {
    event.respondWith(networkFirst(request));
  } else if (isNavigation(request)) {
    event.respondWith(navigationFallback(request));
  } else {
    event.respondWith(staleWhileRevalidate(request));
  }
});
