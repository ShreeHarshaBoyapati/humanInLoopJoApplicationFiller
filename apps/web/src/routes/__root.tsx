import { useEffect, useState } from 'react';
import { Link, Outlet, createRootRoute, redirect, useNavigate } from '@tanstack/react-router';
import { axiosInstance } from '../utils/axios.ts';
import styles from './style/__root.module.css';
import { LogoutConfirmModal } from '../components/logout-confirm-modal.tsx';
import {
  listenForExtensionAuth,
  getLocalStorageAuth,
  setLocalStorageAuth,
  clearLocalStorageAuth,
  notifyExtensionLogout,
} from '../utils/auth-sync.ts';
import type { StoredAuth } from '@repo/shared-types';

export const Route = createRootRoute({
  component: RootComponent,
  loader: async ({ location }) => {
    const auth = getLocalStorageAuth();
    const isAuthenticated = !!auth;
    const isLoginPage = location.pathname === '/login';
    if (isAuthenticated) {
      if (isLoginPage) {
        throw redirect({ to: '/' });
      }
    } else {
      if (!isLoginPage) {
        throw redirect({ to: '/login' });
      }
    }
  },
});

function RootComponent() {
  const navigate = useNavigate();
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Listen for extension auth changes
  useEffect(() => {
    const cleanup = listenForExtensionAuth((authData: StoredAuth | null) => {
      if (authData) {
        // Extension has auth data - update localStorage
        setLocalStorageAuth(authData);
        setIsAuthenticated(true);
        navigate({ to: '/' });
      } else {
        // Extension logged out - clear localStorage and redirect
        clearLocalStorageAuth();
        setIsAuthenticated(false);
        navigate({ to: '/login' });
      }
    });

    return cleanup;
  }, [navigate]);

  // Check existing auth on mount
  useEffect(() => {
    const auth = getLocalStorageAuth();
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
      // Call backend logout
      await axiosInstance.post('/user/logout');
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      // Clear local auth
      clearLocalStorageAuth();
      setIsAuthenticated(false);

      // Notify extension
      notifyExtensionLogout();

      // Redirect to login
      navigate({ to: '/login' });
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
