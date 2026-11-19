import usePageTitle from '../hooks/usePageTitle';
import useOnlineStatus from '../hooks/useOnlineStatus';
import { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import OfflineState from '../components/OfflineState.jsx';

/** /offline — precached with the rest of the app, so it opens without a network. */
export default function OfflinePage() {
  usePageTitle('Offline');
  const navigate = useNavigate();
  const location = useLocation();
  const { online } = useOnlineStatus();

  // Connection is back: return to the page the user came from.
  useEffect(() => {
    if (online && location.state?.from) navigate(location.state.from, { replace: true });
  }, [online, location.state, navigate]);

  return <OfflineState onRetry={() => navigate(location.state?.from ?? '/', { replace: true })} />;
}
