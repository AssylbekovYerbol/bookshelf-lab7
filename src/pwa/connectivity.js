/**
 * Connectivity store. `navigator.onLine` alone is not reliable (it is true when connected to a router
 * without internet), so besides the online / offline events there is a real probe: a tiny request that
 * the service worker lets through to the network (the ?ping query is never cached).
 */

let state = { online: typeof navigator === 'undefined' ? true : navigator.onLine, checking: false };
const listeners = new Set();

function setState(patch) {
  state = { ...state, ...patch };
  listeners.forEach((listener) => listener());
}

export const connectivityStore = {
  subscribe(listener) {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
  getSnapshot: () => state,
};

/** Real network check. Resolves to true / false and updates the store. */
export async function checkConnection() {
  setState({ checking: true });
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 5000);
    const response = await fetch(`${import.meta.env.BASE_URL}manifest.json?ping=${Date.now()}`, {
      cache: 'no-store',
      signal: controller.signal,
    });
    clearTimeout(timer);
    const online = response.ok;
    setState({ online, checking: false });
    return online;
  } catch {
    setState({ online: false, checking: false });
    return false;
  }
}

if (typeof window !== 'undefined') {
  window.addEventListener('offline', () => setState({ online: false }));
  window.addEventListener('online', () => {
    setState({ online: true });
    checkConnection(); // confirm that the connection really works
  });
}
