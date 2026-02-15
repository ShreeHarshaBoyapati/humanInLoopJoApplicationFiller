import { createFileRoute } from '@tanstack/react-router';
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
      <p>You are logged in.</p>
    </div>
  );
}
