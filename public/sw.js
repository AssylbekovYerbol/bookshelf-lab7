/* Bookshelf service worker (hand-written, no Workbox).
 *
 * The Vite plugin in vite.config.js replaces the two placeholders below at build time:
 *   __BUILD_ID__           → hash of the build output (a new build always gives a new cache name)
 *   __PRECACHE_MANIFEST__  → list of built files (JS / CSS chunks, icons, offline page …)
 *
 * Lifecycle
 *   install   → pre-cache the app shell into a versioned cache. The worker does NOT call skipWaiting():
 *               it waits until the user presses "Update" in the app (message SKIP_WAITING).
 *   activate  → delete every cache of this app that is not in the current set, then take control.
 *   fetch     → strategies below.
 *
 * Strategies
 *   navigations          → app shell from the pre-cache (SPA), offline.html if even that is missing
 *   pre-cached files     → cache-first
 *   images / fonts       → cache-first runtime cache (max 60 entries)
 *   /api/ (public data)  → network-first with timeout, falls back to the cache (max 40 entries)
 *   anything cross-origin (Firebase Auth, Google …), non-GET, ?ping → never touched, never cached
 */

const BUILD_ID = '__BUILD_ID__';
const PRECACHE_MANIFEST = /*__PRECACHE_MANIFEST__*/ [];

const PREFIX = 'bookshelf-';
const PRECACHE = `${PREFIX}precache-${BUILD_ID}`;
const STATIC_CACHE = `${PREFIX}static-v1`;
const API_CACHE = `${PREFIX}api-v1`;
const CURRENT_CACHES = [PRECACHE, STATIC_CACHE, API_CACHE];

const STATIC_MAX_ENTRIES = 60;
const API_MAX_ENTRIES = 40;
const API_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;
const API_NETWORK_TIMEOUT_MS = 4000;

// The worker lives at <base>sw.js, so its own directory is the app's base path.
const BASE = new URL('./', self.location).pathname; // "/" or "/repo/"
const SHELL_URL = BASE; // index.html is served for "<base>"
const OFFLINE_URL = `${BASE}offline.html`;

// ---------------------------------------------------------------- install

self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(PRECACHE);
      const urls = new Set([SHELL_URL, OFFLINE_URL, ...PRECACHE_MANIFEST.map((file) => `${BASE}${file}`)]);
      // `cache: 'reload'` bypasses the HTTP cache so the new version is really downloaded.
      await Promise.all(
        [...urls].map(async (url) => {
          const response = await fetch(new Request(url, { cache: 'reload' }));
          if (!response.ok) throw new Error(`Pre-cache failed for ${url}: ${response.status}`);
          await cache.put(url, response);
        }),
      );
    })(),
  );
});

// ---------------------------------------------------------------- activate

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const names = await caches.keys();
      await Promise.all(
        names
          .filter((name) => name.startsWith(PREFIX) && !CURRENT_CACHES.includes(name)) // outdated versions
          .map((name) => caches.delete(name)),
      );
      await self.clients.claim();
    })(),
  );
});

// The page asks the waiting worker to take over when the user presses "Update".
self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') self.skipWaiting();
  if (event.data?.type === 'GET_VERSION') event.source?.postMessage({ type: 'VERSION', buildId: BUILD_ID });
});

// ---------------------------------------------------------------- helpers

async function trimCache(cacheName, maxEntries) {
  const cache = await caches.open(cacheName);
  const keys = await cache.keys(); // oldest first (insertion order)
  const overflow = keys.length - maxEntries;
  for (let i = 0; i < overflow; i += 1) await cache.delete(keys[i]);
}

/** Copy of a response with extra headers (a Response is immutable). */
function withHeaders(response, extra) {
  const headers = new Headers(response.headers);
  Object.entries(extra).forEach(([name, value]) => headers.set(name, value));
  return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
}

function isCacheable(request, response) {
  return (
    request.method === 'GET' &&
    !request.headers.has('Authorization') && // never store private / authenticated requests
    response &&
    response.status === 200 &&
    response.type !== 'opaque' &&
    !response.headers.has('Set-Cookie')
  );
}

// ---------------------------------------------------------------- strategies

/** Navigations: the SPA shell comes from the pre-cache, so every route works offline. */
async function handleNavigation(request) {
  const precache = await caches.open(PRECACHE);
  const shell = await precache.match(SHELL_URL);
  if (shell) return shell;
  try {
    return await fetch(request);
  } catch {
    return (await precache.match(OFFLINE_URL)) || Response.error();
  }
}

/** Cache-first: serve from the cache, otherwise fetch once and remember it. */
async function cacheFirst(request, cacheName, maxEntries) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  if (cached) return cached;
  const response = await fetch(request);
  if (isCacheable(request, response)) {
    await cache.put(request, response.clone());
    trimCache(cacheName, maxEntries);
  }
  return response;
}

/** Network-first: fresh data when online; the last good copy (marked as cached) when not. */
async function networkFirst(request, cacheName, maxEntries) {
  const cache = await caches.open(cacheName);

  const fromCache = async () => {
    const cached = await cache.match(request);
    if (!cached) return null;
    const age = Date.now() - Number(cached.headers.get('X-SW-Cached-At') || 0);
    return withHeaders(cached, { 'X-Served-From': 'sw-cache', 'X-SW-Age': String(age) });
  };

  try {
    const response = await Promise.race([
      fetch(request),
      new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), API_NETWORK_TIMEOUT_MS)),
    ]);
    if (isCacheable(request, response)) {
      await cache.put(request, withHeaders(response.clone(), { 'X-SW-Cached-At': String(Date.now()) }));
      trimCache(cacheName, maxEntries);
    }
    return response;
  } catch (error) {
    const cached = await fromCache();
    if (cached) return cached;
    throw error; // nothing cached: the page's own error handling shows a message
  }
}

/** Removes API entries older than API_MAX_AGE_MS (runs after activation of each new worker). */
async function purgeExpiredApi() {
  const cache = await caches.open(API_CACHE);
  for (const request of await cache.keys()) {
    const response = await cache.match(request);
    const cachedAt = Number(response?.headers.get('X-SW-Cached-At') || 0);
    if (cachedAt && Date.now() - cachedAt > API_MAX_AGE_MS) await cache.delete(request);
  }
}
self.addEventListener('activate', (event) => event.waitUntil(purgeExpiredApi()));

// ---------------------------------------------------------------- fetch

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return; // Firebase Auth, Google sign-in, fonts CDN … → network only
  if (!url.pathname.startsWith(BASE)) return;
  if (url.searchParams.has('ping')) return; // connectivity probes must hit the real network
  if (request.headers.has('Authorization')) return;

  if (request.mode === 'navigate') {
    event.respondWith(handleNavigation(request));
    return;
  }

  const path = url.pathname.slice(BASE.length);

  if (path.startsWith('api/')) {
    event.respondWith(networkFirst(request, API_CACHE, API_MAX_ENTRIES));
    return;
  }

  event.respondWith(
    (async () => {
      // Built JS / CSS, icons, manifest, offline page: cache-first from the versioned pre-cache.
      const precached = await (await caches.open(PRECACHE)).match(request, { ignoreSearch: true });
      if (precached) return precached;

      if (['image', 'font'].includes(request.destination)) {
        return cacheFirst(request, STATIC_CACHE, STATIC_MAX_ENTRIES);
      }
      return fetch(request);
    })(),
  );
});
