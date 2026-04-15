import {
  Link,
  Outlet,
  createRootRoute,
  redirect,
  useRouterState,
  useNavigate,
} from '@tanstack/react-router';
import { useEffect } from 'react';
import HomeRoundedIcon from '@mui/icons-material/HomeRounded';
import WorkOutlineIcon from '@mui/icons-material/WorkOutline';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import PersonOutlineIcon from '@mui/icons-material/PersonOutline';
import scrollStyles from '@repo/ui/scroll-bar.module.css';
import styles from './style/__root.module.css';

interface AuthCheckResponse {
  isAuthenticated: boolean;
}

export const Route = createRootRoute({
  component: RootComponent,
  loader: async ({ location }) => {
    // Check if chrome runtime is available (for dev/preview safety)
    if (typeof chrome === 'undefined' || !chrome.runtime) {
      console.warn('Chrome runtime not detected, treating as unauthenticated');
      if (location.pathname !== '/login') {
        throw redirect({ to: '/login' });
      }
      return;
    }

    const response = await new Promise<AuthCheckResponse>((resolve) => {
      chrome.runtime.sendMessage({ action: 'CHECK_AUTH' }, (res) => {
        // Handle potential error or undefined response
        if (chrome.runtime.lastError) {
          console.error('Auth check failed:', chrome.runtime.lastError);
          resolve({ isAuthenticated: false });
        } else {
          resolve(res || { isAuthenticated: false });
        }
      });
    });

    const { isAuthenticated } = response;

    if (isAuthenticated) {
      if (location.pathname === '/login' || location.pathname === '/') {
        const storage = await new Promise<{ quickSaveActive?: boolean }>((resolve) => {
          chrome.storage.local.get(['quickSaveActive'], (res) => resolve(res));
        });
        if (storage.quickSaveActive) {
          throw redirect({ to: '/job' });
        }
      }

      if (location.pathname === '/login') {
        throw redirect({ to: '/' });
      }
    } else {
      if (location.pathname !== '/login') {
        throw redirect({ to: '/login' });
      }
    }
  },
});

function RootComponent() {
  const routerState = useRouterState();
  const navigate = useNavigate();

  useEffect(() => {
    if (typeof chrome !== 'undefined' && chrome.runtime) {
      const handleMessage = (message: { action: string; payload?: { message?: string } }) => {
        if (message.action === 'LOGOUT_TRIGGERED') {
          navigate({
            to: '/login',
            search: { message: message.payload?.message },
            replace: true,
          });
        }
      };

      chrome.runtime.onMessage.addListener(handleMessage);
      return () => {
        chrome.runtime.onMessage.removeListener(handleMessage);
      };
    }
  }, [navigate]);
  const isLoginPage = routerState.location.pathname === '/login';

  if (isLoginPage) {
    return (
      <div className={styles.layoutWrapper}>
        <main className={styles.mainContent}>
          <Outlet />
        </main>
      </div>
    );
  }

  return (
    <div className={styles.layoutWrapper}>
      <main className={`${styles.mainContent} ${scrollStyles.scrollbarVerticalContainer}`}>
        <Outlet />
      </main>

      <nav className={styles.bottomNav}>
        <Link
          to="/"
          className={styles.navItem}
          activeProps={{ className: `${styles.navItem} ${styles.navItemActive}` }}
          activeOptions={{ exact: true }}
        >
          <HomeRoundedIcon />
          <span>Home</span>
        </Link>
        <Link
          to="/recent-jobs"
          className={styles.navItem}
          activeProps={{ className: `${styles.navItem} ${styles.navItemActive}` }}
        >
          <WorkOutlineIcon />
          <span>Jobs</span>
        </Link>
        <Link
          to="/autofill"
          className={styles.navItem}
          activeProps={{ className: `${styles.navItem} ${styles.navItemActive}` }}
        >
          <AutoAwesomeIcon />
          <span>Autofill</span>
        </Link>
        <Link
          to="/profile"
          className={styles.navItem}
          activeProps={{ className: `${styles.navItem} ${styles.navItemActive}` }}
        >
          <PersonOutlineIcon />
          <span>Profile</span>
        </Link>
      </nav>
    </div>
  );
}
