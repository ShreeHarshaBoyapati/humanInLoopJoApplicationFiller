import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { SyntheticEvent, useState } from 'react';
import { EnhancedTextField, EnhancedButton } from '@repo/ui';
import PersonIcon from '@mui/icons-material/Person';
import styles from './style/login.module.css';
import styleConstants from '@repo/ui/constants/style-constants.js';
import LockIcon from '@mui/icons-material/Lock';
import VisibilityIcon from '@mui/icons-material/Visibility';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';

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
  const [passVisible, setPassVisible] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

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
      <div className={styles.signUp}>
        <p>New to job filler?</p>
        <EnhancedButton
          type="button"
          onClick={() => navigate({ to: '/new-user' })}
          label="Create new user"
          colorTheme="secondary"
          size="medium"
          customProps={{ props: { sx: { maxWidth: 'fit-content' } } }}
        />
        <div className={styles.orDiv}>
          <div />
          <span>OR</span>
          <div />
        </div>
      </div>
      <form onSubmit={handleLogin} className={styles.form}>
        <div>
          <EnhancedTextField
            type="email"
            value={email}
            startIcon={<PersonIcon sx={{ color: styleConstants.white900 }} />}
            onChange={(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
              setEmail(e.target.value)
            }
            placeholder="Enter your email"
          />
          <EnhancedTextField
            type={!passVisible ? 'password' : 'text'}
            value={password}
            startIcon={<LockIcon sx={{ color: styleConstants.white900 }} />}
            endIcon={
              !passVisible ? (
                <VisibilityIcon sx={{ color: styleConstants.white900 }} />
              ) : (
                <VisibilityOffIcon sx={{ color: styleConstants.white900 }} />
              )
            }
            onChange={(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
              setPassword(e.target.value)
            }
            placeholder="Enter your password"
            customProps={{
              childProps: {
                endIconProps: {
                  onClick: () => {
                    setPassVisible((prev) => !prev);
                  },
                  sx: {
                    cursor: 'pointer',
                  },
                },
              },
            }}
          />
        </div>
        {error && (
          <div className={styles.error}>
            {error.split('. ').map((line, index) => (
              <p key={index}>{line}</p>
            ))}
          </div>
        )}
        <EnhancedButton
          type="submit"
          disabled={loading}
          label={loading ? 'Logging in...' : 'Login'}
          colorTheme="primary"
          size="medium"
          customProps={{ props: { sx: { width: '100%', maxWidth: '154px' } } }}
        />
      </form>
    </div>
  );
}
