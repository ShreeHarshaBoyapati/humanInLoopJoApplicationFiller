import { Link, Outlet, createRootRoute, redirect, useRouterState } from '@tanstack/react-router';
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
      console.warn('Chrome runtime not detected, treating as unauthenticated');
      if (location.pathname !== '/login' && location.pathname !== '/new-user') {
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
    console.log('isAuthenticated===========', isAuthenticated);

    if (isAuthenticated) {
      if (location.pathname === '/login' || location.pathname === '/new-user') {
        throw redirect({ to: '/' });
      }
    } else {
      if (location.pathname !== '/login' && location.pathname !== '/new-user') {
        console.log('======got to final');

        throw redirect({ to: '/login' });
      }
    }
  },
});

function RootComponent() {
  const routerState = useRouterState();
  const isLoginPage =
    routerState.location.pathname === '/login' || routerState.location.pathname === '/new-user';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' }}>
      {!isLoginPage && (
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
        </>
      )}
      <main className={styles.mainContent}>
        <Outlet />
      </main>
      {/* <TanStackRouterDevtools position="bottom-right" /> */}
    </div>
  );
}
