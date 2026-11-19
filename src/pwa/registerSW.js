/**
 * Service worker registration + update handling.
 *
 * A tiny external store (subscribe / getSnapshot) so React components can read the state with
 * useSyncExternalStore (see hooks/useServiceWorker.js).
 *
 *   needRefresh   a new version is installed and waiting → show the "Update" button
 *   offlineReady  the app was cached for the first time → "available offline" notice
 *
 * Update flow: new sw.js found → installs (pre-caches the new shell) → waits → user presses "Update" →
 * we send SKIP_WAITING → the new worker activates, deletes old caches and claims the page →
 * `controllerchange` → the page reloads once and runs the new version. No manual cache clearing needed.
 */

let state = { needRefresh: false, offlineReady: false };
const listeners = new Set();
let registration = null;
let reloading = false;

function setState(patch) {
  state = { ...state, ...patch };
  listeners.forEach((listener) => listener());
}

export const swStore = {
  subscribe(listener) {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
  getSnapshot: () => state,
};

export function dismissSwNotices() {
  setState({ needRefresh: false, offlineReady: false });
}

/** Activates the waiting worker; the page reloads when it has taken control. */
export function applyUpdate() {
  if (registration?.waiting) registration.waiting.postMessage({ type: 'SKIP_WAITING' });
  else window.location.reload();
}

/** Looks for a new sw.js right now (also called on a timer and when the tab becomes visible). */
export function checkForUpdate() {
  registration?.update().catch(() => {}); // offline / server down: just try again later
}

export function registerServiceWorker() {
  if (!('serviceWorker' in navigator) || !import.meta.env.PROD) return;

  const base = import.meta.env.BASE_URL;
  const hadController = Boolean(navigator.serviceWorker.controller);

  navigator.serviceWorker.addEventListener('controllerchange', () => {
    // First install: the worker claims the page, nothing to reload. Update: load the new version once.
    if (!hadController || reloading) return;
    reloading = true;
    window.location.reload();
  });

  window.addEventListener('load', async () => {
    try {
      registration = await navigator.serviceWorker.register(`${base}sw.js`, { scope: base });
    } catch (error) {
      console.warn('Service worker registration failed:', error);
      return;
    }

    // A new version may already be waiting (the user closed the tab before pressing "Update").
    if (registration.waiting && navigator.serviceWorker.controller) setState({ needRefresh: true });

    registration.addEventListener('updatefound', () => {
      const worker = registration.installing;
      if (!worker) return;
      worker.addEventListener('statechange', () => {
        if (worker.state !== 'installed') return;
        if (navigator.serviceWorker.controller) setState({ needRefresh: true }); // update ready
        else setState({ offlineReady: true }); // first install finished
      });
    });

    setInterval(checkForUpdate, 60 * 60 * 1000);
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') checkForUpdate();
    });
  });
}
