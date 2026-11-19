import { Link } from 'react-router-dom';
import useOnlineStatus from '../hooks/useOnlineStatus';

/** The offline screen: used by the /offline route and inline when a page cannot load without a network. */
export default function OfflineState({ onRetry, title = 'You are offline' }) {
  const { online, checking, retry } = useOnlineStatus();

  async function handleRetry() {
    const ok = await retry();
    if (ok) onRetry ? onRetry() : window.location.reload();
  }

  return (
    <div className="offline">
      <div className="panel offline__card">
        <div className="offline__icon" aria-hidden="true">
          📡
        </div>
        <h2 className="offline__title">{title}</h2>
        <p className="offline__text">
          We could not reach the server. Books and pages you have already opened stay available, and your changes are
          kept on this device. Everything works normally again as soon as the connection returns.
        </p>
        <div className="offline__actions">
          <button type="button" className="btn" onClick={handleRetry} disabled={checking}>
            {checking ? 'Checking…' : 'Retry connection'}
          </button>
          <Link to="/books" className="btn btn--ghost">
            Browse saved books
          </Link>
        </div>
        <p className="offline__status" role="status">
          {checking ? 'Checking your connection…' : online ? 'Connection restored.' : 'Still offline.'}
        </p>
      </div>
    </div>
  );
}
