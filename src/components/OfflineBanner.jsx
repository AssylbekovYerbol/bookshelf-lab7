import useDataSource from '../hooks/useDataSource';
import useOnlineStatus from '../hooks/useOnlineStatus';

/**
 * Top-of-page notice. Offline → "you are offline"; online but the catalogue came from the cache → "saved data".
 * Disappears by itself when fresh data arrives / the connection returns.
 */
export default function OfflineBanner() {
  const { online, checking, retry } = useOnlineStatus();
  const cached = useDataSource();
  if (online && !cached) return null;

  return (
    <div className={`banner ${online ? 'banner--info' : 'banner--warn'}`} role="status">
      <p>
        {online
          ? 'You are viewing saved data from your last visit. Reload to fetch the latest catalogue.'
          : 'You are offline. Pages and books you have already opened are still available — showing saved data.'}
      </p>
      <button type="button" className="btn btn--ghost banner__btn" onClick={retry} disabled={checking}>
        {checking ? 'Checking…' : 'Retry connection'}
      </button>
    </div>
  );
}
