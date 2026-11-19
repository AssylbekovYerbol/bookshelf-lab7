import { Suspense, useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { ToastProvider } from '../context/ToastContext.jsx';
import Loader from '../components/Loader.jsx';
import NavBar from '../components/NavBar.jsx';
import OfflineBanner from '../components/OfflineBanner.jsx';
import UpdatePrompt from '../components/UpdatePrompt.jsx';

/** Scrolls to the top when the user navigates to another page (but not when only the query string changes). */
function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}

/** Shared frame of every page: NavBar on top, the current page in <Outlet />, footer at the bottom. */
export default function RootLayout() {
  return (
    <ToastProvider>
      <div className="app">
        <ScrollToTop />
        <NavBar />
        <OfflineBanner />
        <main className="container">
          <Suspense fallback={<Loader label="Loading page…" />}>
            <Outlet />
          </Suspense>
        </main>
        <footer className="footer">
          <p>Bookshelf · React project · works offline · data is simulated and stored in your browser.</p>
        </footer>
        <UpdatePrompt />
      </div>
    </ToastProvider>
  );
}
