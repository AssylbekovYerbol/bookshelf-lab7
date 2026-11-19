import { useEffect, useState } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import useInstallPrompt from '../hooks/useInstallPrompt';
import ConnectionStatus from './ConnectionStatus.jsx';

const LINKS = [
  { to: '/', label: 'Home', end: true },
  { to: '/books', label: 'Books' },
  { to: '/dashboard', label: 'Dashboard' },
  { to: '/about', label: 'About' },
];

const linkClass = ({ isActive }) => `nav__link${isActive ? ' is-active' : ''}`;
const ghostClass = ({ isActive }) => `btn btn--ghost nav__login${isActive ? ' is-active' : ''}`;

export default function NavBar() {
  const { user, loading, logout } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const [signingOut, setSigningOut] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const location = useLocation();
  const { canInstall, install } = useInstallPrompt();

  // The mobile menu closes after every navigation and on Escape.
  useEffect(() => {
    setMenuOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (!menuOpen) return undefined;
    const onKey = (event) => event.key === 'Escape' && setMenuOpen(false);
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [menuOpen]);

  async function handleLogout() {
    if (signingOut) return;
    setSigningOut(true);
    const ok = await logout();
    setSigningOut(false);
    if (ok) {
      showToast('You have been signed out.');
      navigate('/', { replace: true });
    }
  }

  let account;
  if (loading) {
    account = <span className="nav__placeholder" aria-hidden="true" />; // session is being restored: avoid a flash of "Log in"
  } else if (user) {
    account = (
      <>
        <NavLink to="/profile" className={ghostClass}>
          Profile
        </NavLink>
        <button type="button" className="btn nav__login" onClick={handleLogout} disabled={signingOut}>
          {signingOut ? 'Signing out…' : 'Log out'}
        </button>
      </>
    );
  } else {
    account = (
      <>
        <NavLink to="/login" className={ghostClass}>
          Log in
        </NavLink>
        <NavLink to="/signup" className="btn nav__login">
          Sign up
        </NavLink>
      </>
    );
  }

  return (
    <header className="header">
      <div className="container header__inner">
        <Link to="/" className="brand" aria-label="Bookshelf — home">
          <span className="header__logo" aria-hidden="true">
            📚
          </span>
          <span className="header__title">Bookshelf</span>
        </Link>

        <ConnectionStatus />

        <button
          type="button"
          className="nav-toggle"
          aria-expanded={menuOpen}
          aria-controls="site-menu"
          aria-label={menuOpen ? 'Close menu' : 'Open menu'}
          onClick={() => setMenuOpen((open) => !open)}
        >
          <span className="nav-toggle__bars" aria-hidden="true" />
        </button>

        <div id="site-menu" className={`menu${menuOpen ? ' is-open' : ''}`}>
          <nav className="nav" aria-label="Main">
            {LINKS.map((link) => (
              <NavLink key={link.to} to={link.to} end={link.end} className={linkClass}>
                {link.label}
              </NavLink>
            ))}
          </nav>

          <div className="nav__account">
            {canInstall && (
              <button type="button" className="btn btn--ghost nav__login" onClick={install}>
                ⬇ Install app
              </button>
            )}
            {account}
          </div>
        </div>
      </div>
    </header>
  );
}
