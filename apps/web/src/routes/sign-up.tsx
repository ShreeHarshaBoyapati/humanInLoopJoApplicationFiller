import { useState } from 'react';
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import axios from 'axios';
import styles from './style/sign-up.module.css';
import { EnhancedTextField as TextField } from '@repo/ui/text-field.tsx';
import { EnhancedButton as Button } from '@repo/ui/button.tsx';
import type { ApiResponse } from '@repo/shared-types';

const API_URL = import.meta.env.VITE_WEB_BACKENDAPI || '';

export const Route = createFileRoute('/sign-up')({
  component: SignUpComponent,
});

function SignUpComponent() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (field: string) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData((prev) => ({
      ...prev,
      [field]: e.target.value,
    }));
    // Clear error when user types
    if (error) setError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validate passwords match
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    // Validate password length
    if (formData.password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }

    setLoading(true);

    try {
      const response = await axios.post<ApiResponse>(`${API_URL}/user`, {
        email: formData.email,
        password: formData.password,
      });

      if (response.data.success) {
        navigate({ to: '/login' });
      } else {
        setError(response.data.message || 'Registration failed. Please try again.');
      }
    } catch (err: unknown) {
      if (axios.isAxiosError(err) && err.response?.data) {
        const errorData = err.response.data as ApiResponse;
        setError(errorData.message || 'Registration failed. Please try again.');
      } else {
        console.error('Registration error:', err);
        setError('Unable to connect to server. Please try again later.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignUp = () => {
    console.log('Google OAuth sign up clicked');
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
            Welcome to <span className={styles.welcomeTitleHighlight}>Job Filler Pro</span>
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
            <h2 className={styles.title}>Sign Up</h2>
            <form onSubmit={handleSubmit} className={styles.form}>
              <div className={styles.fieldsContainer}>
                <TextField
                  label="Email"
                  type="email"
                  placeholder="Enter your email"
                  value={formData.email}
                  onChange={handleChange('email')}
                  id="email"
                  testId="email-input"
                />
                <TextField
                  label="Password"
                  type="password"
                  placeholder="Enter your password"
                  value={formData.password}
                  onChange={handleChange('password')}
                  id="password"
                  testId="password-input"
                />
                <TextField
                  label="Confirm Password"
                  type="password"
                  placeholder="Confirm your password"
                  value={formData.confirmPassword}
                  onChange={handleChange('confirmPassword')}
                  id="confirm-password"
                  testId="confirm-password-input"
                />
              </div>
              {error && <div className={styles.error}>{error}</div>}
              <div className={styles.buttonContainer}>
                <Button
                  type="submit"
                  disabled={loading}
                  label={loading ? 'Signing up...' : 'Sign Up'}
                  colorTheme="primary"
                  size="medium"
                  testId="sign-up-button"
                />
              </div>
              <div className={styles.divider}>
                <span className={styles.dividerText}>OR</span>
              </div>
              <div className={styles.googleButtonContainer}>
                <Button
                  type="button"
                  label="Sign up with Google"
                  colorTheme="secondary"
                  size="medium"
                  onClick={handleGoogleSignUp}
                  testId="google-sign-up-button"
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
                />
              </div>
              <div className={styles.loginLink}>
                <span className={styles.linkText}>Already a user? </span>
                <button
                  type="button"
                  className={styles.linkButton}
                  onClick={() => navigate({ to: '/login' })}
                  data-testid="login-link"
                >
                  Log In
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
