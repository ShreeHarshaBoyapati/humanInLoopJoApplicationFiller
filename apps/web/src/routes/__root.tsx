import { useEffect, useState } from 'react';
import {
  Link,
  Outlet,
  createRootRoute,
  redirect,
  useNavigate,
  useRouterState,
} from '@tanstack/react-router';
import { axiosInstance } from '../utils/axios.ts';
import styles from './style/__root.module.css';
import { LogoutConfirmModal } from '../components/logout-confirm-modal.tsx';
import {
  listenForExtensionAuth,
  getTokenFromCookie,
  notifyExtensionLogout,
  clearTokenAuth,
} from '../utils/auth-sync.ts';
import type { StoredAuth } from '@repo/shared-types';

export const Route = createRootRoute({
  component: RootComponent,
  loader: async ({ location }) => {
    const auth = getTokenFromCookie();
    const isAuthenticated = !!auth;
    const pathname = location.pathname;

    // Public routes that don't require authentication
    const isPublicRoute =
      pathname === '/login' || pathname === '/sign-up' || pathname === '/google-callback';

    if (isAuthenticated) {
      // If authenticated and on a public route, redirect to home
      if (isPublicRoute) {
        throw redirect({ to: '/' });
      }
    } else {
      // If not authenticated and not on a public route, redirect to login
      if (!isPublicRoute) {
        throw redirect({ to: '/login' });
      }
    }
  },
});

function RootComponent() {
  const navigate = useNavigate();
  const routerState = useRouterState();
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  const pathname = routerState.location.pathname;
  const isPublicRoute =
    pathname === '/login' || pathname === '/sign-up' || pathname === '/google-callback';

  // Listen for extension auth changes
  useEffect(() => {
    const cleanup = listenForExtensionAuth((authData: StoredAuth | null) => {
      console.log('==cleanup is getting called========');

      if (authData) {
        setIsAuthenticated(true);
        // Only navigate to home if not on a public route
        if (!isPublicRoute) {
          navigate({ to: '/' });
        }
      } else {
        setIsAuthenticated(false);
        // Only navigate to login if not on a public route
        if (!isPublicRoute) {
          navigate({ to: '/login' });
        }
      }
    });

    return cleanup;
  }, [navigate, isPublicRoute]);

  // Check existing auth on mount
  useEffect(() => {
    const auth = getTokenFromCookie();
    if (auth) {
      setIsAuthenticated(true);
    }
  }, []);

  const handleLogout = async () => {
    setShowLogoutModal(true);
  };

  const confirmLogout = async () => {
    setShowLogoutModal(false);

    try {
      await axiosInstance.post('/user/logout');
      clearTokenAuth();
      setIsAuthenticated(false);

      notifyExtensionLogout();
      navigate({ to: '/login' });
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const cancelLogout = () => {
    setShowLogoutModal(false);
  };

  return (
    <div className={styles.layoutWrapper}>
      {isAuthenticated && (
        <header className={styles.header}>
          <nav className={styles.nav}>
            <Link to="/" className={styles.navLink}>
              Home
            </Link>
            <button type="button" onClick={handleLogout} className={styles.logoutButton}>
              Logout
            </button>
          </nav>
        </header>
      )}
      <main className={styles.mainContent}>
        <Outlet />
      </main>
      <LogoutConfirmModal
        isOpen={showLogoutModal}
        onConfirm={confirmLogout}
        onCancel={cancelLogout}
      />
    </div>
  );
}
