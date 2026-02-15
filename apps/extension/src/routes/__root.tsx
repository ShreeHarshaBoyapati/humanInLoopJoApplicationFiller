import { Link, Outlet, createRootRoute, redirect } from '@tanstack/react-router';
import { TanStackRouterDevtools } from '@tanstack/react-router-devtools';
import styles from './style/__root.module.css';

interface AuthCheckResponse {
  isAuthenticated: boolean;
}

export const Route = createRootRoute({
  component: RootComponent,
  loader: async ({ location }) => {
    // Check if chrome runtime is available (for dev/preview safety)
    if (typeof chrome === 'undefined' || !chrome.runtime) {
      console.warn('Chrome runtime not detected, skipping auth check');
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
  // black: #16171D for the background
  // white: #FFFFFF for the text
  // blue: #06B6D4 for the links
  // grey: #3B3440 for the borders
  return (
    <>
      <div className={styles.container}>
        <Link
          to="/"
          className={styles.link}
          activeProps={{
            className: styles.activeLink,
          }}
          activeOptions={{ exact: true }}
        >
          Home
        </Link>{' '}
        <Link
          to="/about"
          className={styles.link}
          activeProps={{
            className: styles.activeLink,
          }}
        >
          About
        </Link>
      </div>
      <hr />
      <Outlet />
      <TanStackRouterDevtools position="bottom-right" />
    </>
  );
}
