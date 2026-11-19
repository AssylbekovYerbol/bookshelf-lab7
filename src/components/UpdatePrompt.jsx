import useServiceWorker from '../hooks/useServiceWorker';

/** Bottom sheet: "new version available → Update" / "ready to work offline". */
export default function UpdatePrompt() {
  const { needRefresh, offlineReady, update, dismiss } = useServiceWorker();
  if (!needRefresh && !offlineReady) return null;

  return (
    <div className="sw-prompt" role="alertdialog" aria-live="assertive" aria-label="Application update">
      <p className="sw-prompt__text">
        {needRefresh
          ? 'A new version of Bookshelf is available.'
          : 'Bookshelf is ready to work offline.'}
      </p>
      <div className="sw-prompt__actions">
        {needRefresh && (
          <button type="button" className="btn" onClick={update}>
            Update now
          </button>
        )}
        <button type="button" className="btn btn--ghost" onClick={dismiss}>
          {needRefresh ? 'Later' : 'OK'}
        </button>
      </div>
    </div>
  );
}
