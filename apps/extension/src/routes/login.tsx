import { createFileRoute } from '@tanstack/react-router';
import { SyntheticEvent, useState } from 'react';
import styles from './style/login.module.css';

interface LoginResponse {
  success: boolean;
  token?: string;
  error?: string;
}

export const Route = createFileRoute('/login')({
  component: LoginComponent,
});

function LoginComponent() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: SyntheticEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      if (typeof chrome !== 'undefined' && chrome.runtime) {
        const response = await new Promise<LoginResponse>((resolve) => {
          chrome.runtime.sendMessage({ action: 'LOGIN', payload: { email, password } }, (res) => {
            if (chrome.runtime.lastError) {
              resolve({ success: false, error: chrome.runtime.lastError.message });
            } else {
              resolve(res);
            }
          });
        });

        if (response.success) {
          window.location.reload();
        } else {
          throw new Error(response.error || 'Login failed');
        }
      } else {
        // Dev mode fallback (if running outside extension context)
        console.warn('Chrome runtime not available, simulating login');
        alert('Chrome runtime not available. Cannot login via background script.');
      }
    } catch (err: unknown) {
      console.error('Login error:', err);
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('An unexpected error occurred');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.container}>
      <h2 className={styles.heading}>Login</h2>
      {error && <div className={styles.error}>{error}</div>}
      <form onSubmit={handleLogin} className={styles.form}>
        <div className={styles.inputGroup}>
          <label className={styles.label}>Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={styles.input}
            required
            placeholder="Enter your email"
          />
        </div>
        <div className={styles.inputGroup}>
          <label className={styles.label}>Password</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={styles.input}
            required
            placeholder="Enter your password"
          />
        </div>
        <button type="submit" disabled={loading} className={styles.button}>
          {loading ? 'Logging in...' : 'Login'}
        </button>
      </form>
    </div>
  );
}
