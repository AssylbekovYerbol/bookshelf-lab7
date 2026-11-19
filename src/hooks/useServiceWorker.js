import { useSyncExternalStore } from 'react';
import { applyUpdate, dismissSwNotices, swStore } from '../pwa/registerSW';

/** { needRefresh, offlineReady, update, dismiss } */
export default function useServiceWorker() {
  const state = useSyncExternalStore(swStore.subscribe, swStore.getSnapshot);
  return { ...state, update: applyUpdate, dismiss: dismissSwNotices };
}
