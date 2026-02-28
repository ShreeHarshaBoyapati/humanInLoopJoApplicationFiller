import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { SyntheticEvent, useState } from 'react';
import { EnhancedTextField, EnhancedButton } from '@repo/ui';
import PersonIcon from '@mui/icons-material/Person';
import styles from './style/login.module.css';
import styleConstants from '@repo/ui/constants/style-constants.js';
import LockIcon from '@mui/icons-material/Lock';
import VisibilityIcon from '@mui/icons-material/Visibility';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';

interface NewUserResponse {
  success: boolean;
  error?: string;
}

export const Route = createFileRoute('/new-user')({
  component: NewUserComponent,
});

function NewUserComponent() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passVisible, setPassVisible] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleRegister = async (e: SyntheticEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      if (typeof chrome !== 'undefined' && chrome.runtime) {
        const response = await new Promise<NewUserResponse>((resolve) => {
          chrome.runtime.sendMessage({ action: 'NewUser', payload: { email, password } }, (res) => {
            if (chrome.runtime.lastError) {
              resolve({ success: false, error: chrome.runtime.lastError.message });
            } else {
              resolve(res);
            }
          });
        });

        if (response.success) {
          navigate({ to: '/login' });
        } else {
          throw new Error(response.error || 'Registration failed');
        }
      } else {
        // Dev mode fallback
        console.warn('Chrome runtime not available, simulating registration');
        alert('Chrome runtime not available. Cannot register via background script.');
      }
    } catch (err: unknown) {
      console.error('Registration error:', err);
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
      <h2 className={styles.heading}>Sign up</h2>
      <form onSubmit={handleRegister} className={styles.form}>
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
        <div className={styles.buttonGroup}>
          <EnhancedButton
            type="submit"
            disabled={loading}
            label={loading ? 'Creating...' : 'Create User'}
            colorTheme="primary"
            size="medium"
            customProps={{ props: { sx: { width: '100%' } } }}
          />
          <EnhancedButton
            type="button"
            onClick={() => navigate({ to: '/login' })}
            label="Back to Login"
            colorTheme="secondary"
            size="medium"
            customProps={{ props: { sx: { maxWidth: 'fit-content' } } }}
          />
        </div>
      </form>
    </div>
  );
}
