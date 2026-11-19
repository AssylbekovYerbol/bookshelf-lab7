import { useSyncExternalStore } from 'react';
import { dataSourceStore } from '../services/service';

/** True while the catalogue on screen comes from the service-worker cache / bundled copy, not the network. */
export default function useDataSource() {
  return useSyncExternalStore(dataSourceStore.subscribe, dataSourceStore.getSnapshot).cached;
}
