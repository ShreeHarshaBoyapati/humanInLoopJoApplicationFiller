import { createFileRoute } from '@tanstack/react-router';
import { SyntheticEvent, useState } from 'react';
import { EnhancedTextField, EnhancedButton } from '@repo/ui';
import { VerificationCode } from '@repo/ui/verification-code.tsx';
import MailIcon from '@mui/icons-material/Mail';
import styles from './style/login.module.css';
import styleConstants from '@repo/ui/constants/style-constants.js';

interface LoginResponse {
  success: boolean;
  token?: string;
  error?: string;
}

export const Route = createFileRoute('/login')({
  validateSearch: (search: Record<string, unknown>): { message?: string } => {
    return {
      message: (search.message as string) || undefined,
    };
  },
  component: LoginComponent,
});

function LoginComponent() {
  const search = Route.useSearch();
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [codeSent, setCodeSent] = useState(false);
  const [error, setError] = useState(search.message || '');
  const [loading, setLoading] = useState(false);

  const handleSendCode = async (e: SyntheticEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      if (typeof chrome !== 'undefined' && chrome.runtime) {
        const response = await new Promise<LoginResponse>((resolve) => {
          chrome.runtime.sendMessage({ action: 'SEND_CODE', payload: { email } }, (res) => {
            if (chrome.runtime.lastError) {
              resolve({ success: false, error: chrome.runtime.lastError.message });
            } else {
              resolve(res);
            }
          });
        });

        if (response.success) {
          setCodeSent(true);
        } else {
          throw new Error(response.error || 'Failed to send code');
        }
      } else {
        console.warn('Chrome runtime not available');
        setError('Chrome runtime not available. Cannot send code via background script.');
      }
    } catch (err: unknown) {
      console.error('Send code error:', err);
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('An unexpected error occurred');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyCode = async (e: SyntheticEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      if (typeof chrome !== 'undefined' && chrome.runtime) {
        const response = await new Promise<LoginResponse>((resolve) => {
          chrome.runtime.sendMessage({ action: 'VERIFY_CODE', payload: { email, code } }, (res) => {
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
          throw new Error(response.error || 'Verification failed');
        }
      } else {
        console.warn('Chrome runtime not available');
        setError('Chrome runtime not available. Cannot verify code via background script.');
      }
    } catch (err: unknown) {
      console.error('Verify code error:', err);
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('An unexpected error occurred');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setLoading(true);
    setError('');

    try {
      if (typeof chrome !== 'undefined' && chrome.runtime) {
        const response = await new Promise<{ success: boolean; error?: string }>((resolve) => {
          chrome.runtime.sendMessage({ action: 'GOOGLE_LOGIN_INTERACTIVE' }, (res) => {
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
          throw new Error(response.error || 'Google login failed');
        }
      } else {
        console.warn('Chrome runtime not available');
        setError('Chrome runtime not available. Cannot login via background script.');
      }
    } catch (err: unknown) {
      console.error('Google login error:', err);
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
      {!codeSent ? (
        <form onSubmit={handleSendCode} className={styles.form}>
          <div>
            <EnhancedTextField
              type="email"
              value={email}
              startIcon={<MailIcon sx={{ color: styleConstants.white900 }} />}
              onChange={(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
                setEmail(e.target.value)
              }
              placeholder="Enter your email"
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
            disabled={loading || !email}
            label={loading ? 'Sending...' : 'Send Verification Code'}
            colorTheme="secondary"
            size="medium"
            customProps={{ props: { sx: { width: 'fit-content', maxWidth: 'fit-content' } } }}
          />
        </form>
      ) : (
        <form onSubmit={handleVerifyCode} className={styles.form}>
          <div>
            <EnhancedTextField
              type="text"
              value={email}
              startIcon={<MailIcon sx={{ color: styleConstants.white900 }} />}
              placeholder="Email"
              disabled
            />
            <VerificationCode
              length={6}
              value={code}
              onChange={setCode}
              onComplete={(completedCode) => {
                setCode(completedCode);
              }}
              size="medium"
              autoFocus={true}
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
              disabled={loading || !code}
              label={loading ? 'Verifying...' : 'Verify Code'}
              colorTheme="secondary"
              size="medium"
              customProps={{ props: { sx: { width: '100%' } } }}
            />
            <EnhancedButton
              type="button"
              onClick={() => {
                setCodeSent(false);
                setCode('');
                setError('');
              }}
              label="Change Email"
              colorTheme="secondary"
              size="medium"
              customProps={{ props: { sx: { maxWidth: 'fit-content' } } }}
            />
          </div>
        </form>
      )}
      <div className={styles.orDiv}>
        <div />
        <span>OR</span>
        <div />
      </div>
      <div className={styles.googleLogin}>
        <EnhancedButton
          type="button"
          onClick={handleGoogleLogin}
          disabled={loading}
          label={loading ? 'Signing in...' : 'Sign in with Google'}
          colorTheme="secondary"
          size="medium"
          customProps={{
            props: {
              sx: { maxWidth: 'fit-content' },
            },
          }}
        />
      </div>
    </div>
  );
}
