import useOnlineStatus from '../hooks/useOnlineStatus';

/** Small pill in the header: green "Online" / red "Offline". */
export default function ConnectionStatus() {
  const { online } = useOnlineStatus();
  return (
    <span className={`conn ${online ? 'conn--online' : 'conn--offline'}`} role="status" aria-live="polite">
      <span className="conn__dot" aria-hidden="true" />
      <span className="conn__label">{online ? 'Online' : 'Offline'}</span>
    </span>
  );
}
