import { createFileRoute, redirect } from '@tanstack/react-router';
import styles from './style/index.module.css';
import '@repo/ui/constants/css-constants.css';
import { getTokenFromCookie } from '../utils/auth-sync.ts';

export const Route = createFileRoute('/')({
  beforeLoad: () => {
    if (getTokenFromCookie()) {
      throw redirect({ to: '/dashboard' });
    }
  },
  component: function Index() {
    return (
      <div className={styles.container}>
        <main className={styles.main}>
          <h1 className={styles.heading}>Welcome to JobFillPro</h1>
          <p className={styles.description}>Select a tab from the navigation above.</p>
        </main>
      </div>
    );
  },
});
