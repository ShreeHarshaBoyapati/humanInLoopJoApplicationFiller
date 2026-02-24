import { createFileRoute, Link } from '@tanstack/react-router';
import { Card } from '@repo/ui';
import styles from './style/index.module.css';

interface LogoutResponse {
  success: boolean;
  error?: string;
}

export const Route = createFileRoute('/')({
  component: HomeComponent,
});

function HomeComponent() {
  const handleLogout = () => {
    if (typeof chrome !== 'undefined' && chrome.runtime) {
      chrome.runtime.sendMessage({ action: 'LOGOUT' }, (response: LogoutResponse) => {
        if (response?.success) {
          window.location.reload();
        } else {
          console.error('Logout failed', response?.error);
        }
      });
    } else {
      alert('Logout clicked (chrome runtime unavailable)');
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h3>Welcome Home!</h3>
        <button onClick={handleLogout} className={styles.logoutButton}>
          Logout
        </button>
      </div>
      <p>Manage your job applications easily.</p>

      <div className={styles.cardsContainer}>
        <Card title="Add New Job" href="#" className={styles.actionCard}>
          <Link to="/job" className={styles.cardLink}>
            Click here to save a new interesting job in your tracker.
          </Link>
        </Card>

        <Card title="View Recent Jobs" href="#" className={styles.actionCard}>
          <Link to="/recent-jobs" className={styles.cardLink}>
            View and manage your 5 most recently tracked jobs.
          </Link>
        </Card>
      </div>
    </div>
  );
}
