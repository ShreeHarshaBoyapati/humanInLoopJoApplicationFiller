import { useState } from 'react';
import { createFileRoute, useNavigate, useSearch } from '@tanstack/react-router';
import { axiosInstance } from '../utils/axios.ts';
import styles from './style/login.module.css';
import { EnhancedTextField as TextField } from '@repo/ui/text-field.tsx';
import { EnhancedButton as Button } from '@repo/ui/button.tsx';
import { VerificationCode } from '@repo/ui/verification-code.tsx';
import type { ApiResponse } from '@repo/shared-types';
import { syncAuthToExtension } from '../utils/auth-sync.ts';
import MailIcon from '@mui/icons-material/Mail';
import styleConstants from '@repo/ui/constants/style-constants.js';

const API_URL = import.meta.env.VITE_WEB_BACKENDAPI || '';

interface LoginSearchSchema {
  error?: string;
}

export const Route = createFileRoute('/login')({
  component: LoginComponent,
  validateSearch: (search: Record<string, unknown>): LoginSearchSchema => {
    return {
      error: search.error as string | undefined,
    };
  },
});

function LoginComponent() {
  const navigate = useNavigate();
  const searchParams = useSearch({ from: '/login' }) as LoginSearchSchema;
  const [step, setStep] = useState<'email' | 'code'>('email');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [resendCoolDown, setResendCoolDown] = useState(0);

  const apiError = searchParams.error || '';

  const handleSendCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await axiosInstance.post<ApiResponse>('/user/send-code', {
        email,
      });

      if (response.data.success) {
        setStep('code');
        // Start resend cooldown
        setResendCoolDown(60);
        const interval = setInterval(() => {
          setResendCoolDown((prev) => {
            if (prev <= 1) {
              clearInterval(interval);
              return 0;
            }
            return prev - 1;
          });
        }, 1000);
      } else {
        setError(response.data.message || 'Failed to send verification code.');
      }
    } catch (err: unknown) {
      if ((err as { response?: { data?: ApiResponse } }).response?.data) {
        const errorData = (err as { response: { data: ApiResponse } }).response.data;
        setError(errorData.message || 'Failed to send verification code.');
      } else {
        console.error('Send code error:', err);
        setError('Unable to connect to server. Please try again later.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await axiosInstance.post<
        ApiResponse<{ token: string; id: string; email: string }>
      >('/user/verify-code', {
        email,
        code,
      });

      if (response.data.success && response.data.data) {
        const timestamp = Date.now();
        const authData = {
          userId: response.data.data.id,
          email: response.data.data.email,
          timestamp,
        };

        // Sync to extension
        syncAuthToExtension(authData);
        navigate({ to: '/' });
      } else {
        setError(response.data.message || 'Verification failed. Please try again.');
      }
    } catch (err: unknown) {
      if ((err as { response?: { data?: ApiResponse } }).response?.data) {
        const errorData = (err as { response: { data: ApiResponse } }).response.data;
        setError(errorData.message || 'Failed to verify code.');
      } else {
        console.error('Verify code error:', err);
        setError('Unable to connect to server. Please try again later.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleResendCode = async () => {
    if (resendCoolDown > 0) return;

    setLoading(true);
    setError('');

    try {
      const response = await axiosInstance.post<ApiResponse>('/user/send-code', {
        email,
      });

      if (response.data.success) {
        // Start resend cooldown
        setResendCoolDown(60);
        const interval = setInterval(() => {
          setResendCoolDown((prev) => {
            if (prev <= 1) {
              clearInterval(interval);
              return 0;
            }
            return prev - 1;
          });
        }, 1000);
      } else {
        setError(response.data.message || 'Failed to resend verification code.');
      }
    } catch (err: unknown) {
      if ((err as { response?: { data?: ApiResponse } }).response?.data) {
        const errorData = (err as { response: { data: ApiResponse } }).response.data;
        setError(errorData.message || 'Failed to resend verification code.');
      } else {
        console.error('Resend code error:', err);
        setError('Unable to connect to server. Please try again later.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    setStep('email');
    setCode('');
    setError('');
  };

  const features = [
    { icon: 'AI', text: 'AI-powered job application filling' },
    { icon: '✓', text: 'Save time on repetitive applications' },
    { icon: '⚡', text: 'Smart resume matching & optimization' },
    { icon: '🔒', text: 'Secure & private data handling' },
  ];

  return (
    <div className={styles.container}>
      <div className={styles.contentWrapper}>
        {/* Left Side - Welcome Section */}
        <div className={styles.welcomeSection}>
          <div className={styles.brandName}>JFP</div>
          <h1 className={styles.welcomeTitle}>
            Welcome back to <span className={styles.welcomeTitleHighlight}>Job Filler Pro</span>
          </h1>
          <p className={styles.welcomeSubtitle}>
            Streamline your job search with intelligent automation. Let AI handle the tedious
            application process while you focus on what matters most.
          </p>
          <ul className={styles.featureList}>
            {features.map((feature, index) => (
              <li key={index} className={styles.featureItem}>
                <span className={styles.featureIcon}>{feature.icon}</span>
                {feature.text}
              </li>
            ))}
          </ul>
        </div>

        {/* Right Side - Form Section */}
        <div className={styles.formSection}>
          <div className={styles.card}>
            <h2 className={styles.title}>{`Let's Get Started`}</h2>
            {step === 'email' ? (
              <form onSubmit={handleSendCode} className={styles.form}>
                <div className={styles.fieldsContainer}>
                  <TextField
                    startIcon={<MailIcon sx={{ color: styleConstants.white900 }} />}
                    type="email"
                    placeholder="Enter your email"
                    value={email}
                    onChange={(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
                      setEmail(e.target.value)
                    }
                    id="email"
                    testId="email-input"
                  />
                </div>
                {error && <div className={styles.error}>{error}</div>}
                <div className={styles.buttonContainer}>
                  <Button
                    type="submit"
                    disabled={loading || !email}
                    label={loading ? 'Sending code...' : 'Send Verification Code'}
                    colorTheme="secondary"
                    size="medium"
                    testId="send-code-button"
                    customProps={{
                      props: { sx: { width: 'fit-content', maxWidth: 'fit-content' } },
                    }}
                  />
                </div>
                <div className={styles.divider}>
                  <span className={styles.dividerText}>OR</span>
                </div>
                <div className={styles.googleButtonContainer}>
                  <Button
                    type="button"
                    label="Continue with Google"
                    colorTheme="secondary"
                    size="medium"
                    onClick={() => {
                      const callbackUrl = encodeURIComponent(
                        `${window.location.origin}/google-callback?from=${encodeURIComponent('/login')}`
                      );
                      window.location.href = `${API_URL}/user/google?callback=${callbackUrl}`;
                    }}
                    testId="google-login-button"
                    startIcon={
                      <svg
                        className={styles.googleIcon}
                        viewBox="0 0 24 24"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <path
                          d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                          fill="#4285F4"
                        />
                        <path
                          d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                          fill="#34A853"
                        />
                        <path
                          d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                          fill="#FBBC05"
                        />
                        <path
                          d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                          fill="#EA4335"
                        />
                      </svg>
                    }
                    customProps={{
                      props: { sx: { width: 'fit-content', maxWidth: 'fit-content' } },
                    }}
                  />
                </div>
                {apiError && <div className={styles.apiError}>{apiError}</div>}
              </form>
            ) : (
              <form onSubmit={handleVerifyCode} className={styles.form}>
                <div className={styles.fieldsContainer}>
                  <p className={styles.codeSentText}>
                    We sent a verification code to <strong>{email}</strong>
                  </p>
                  <VerificationCode
                    length={6}
                    value={code}
                    onChange={setCode}
                    onComplete={(completedCode) => {
                      setCode(completedCode);
                    }}
                    label="Verification Code"
                    testId="code-input"
                    size="medium"
                    autoFocus={true}
                  />
                </div>
                {error && <div className={styles.error}>{error}</div>}
                <div className={styles.buttonContainer}>
                  <Button
                    type="submit"
                    disabled={loading}
                    label={loading ? 'Verifying...' : 'Verify & Continue'}
                    colorTheme="secondary"
                    size="medium"
                    testId="verify-code-button"
                    customProps={{
                      props: { sx: { width: 'fit-content', maxWidth: 'fit-content' } },
                    }}
                  />
                </div>
                <div className={styles.resendContainer}>
                  <button
                    type="button"
                    className={styles.resendButton}
                    onClick={handleResendCode}
                    disabled={resendCoolDown > 0 || loading}
                    data-testid="resend-code-button"
                  >
                    {resendCoolDown > 0
                      ? `Resend code in ${resendCoolDown}s`
                      : "Didn't receive the code? Resend"}
                  </button>
                  <button type="button" className={styles.backButton} onClick={handleBack}>
                    Use a different email
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
