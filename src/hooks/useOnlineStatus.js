import { useSyncExternalStore } from 'react';
import { checkConnection, connectivityStore } from '../pwa/connectivity';

/** { online, checking, retry } — retry() performs a real network probe. */
export default function useOnlineStatus() {
  const state = useSyncExternalStore(connectivityStore.subscribe, connectivityStore.getSnapshot);
  return { ...state, retry: checkConnection };
}
