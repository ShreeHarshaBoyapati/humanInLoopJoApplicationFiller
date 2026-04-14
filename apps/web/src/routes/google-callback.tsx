import { useEffect } from 'react';
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import axios from 'axios';
import type { ApiResponse } from '@repo/shared-types';
import { syncAuthToExtension, getTokenFromCookie } from '../utils/auth-sync.ts';

const API_URL = import.meta.env.VITE_WEB_BACKENDAPI || '';

export const Route = createFileRoute('/google-callback')({
  component: GoogleCallbackComponent,
});

function GoogleCallbackComponent() {
  const navigate = useNavigate();

  useEffect(() => {
    const processCallback = async () => {
      const urlParams = new URLSearchParams(window.location.search);
      const error = urlParams.get('error');
      const from = urlParams.get('from') || '/login';

      if (error) {
        console.error('Google OAuth error:', error);
        navigate({
          to: from === '/sign-up' ? '/sign-up' : '/login',
          search: { error: `Google authentication failed: ${error}` },
        });
        return;
      }

      try {
        // Get token from cookie (set by backend)
        const token = getTokenFromCookie();

        if (!token) {
          console.error('No token found in cookie');
          navigate({
            to: from === '/sign-up' ? '/sign-up' : '/login',
            search: { error: 'Authentication failed - no token' },
          });
          return;
        }

        // Verify token by fetching user data
        const response = await axios.get<ApiResponse<{ id: string; email: string }>>(
          `${API_URL}/user/me`,
          {
            withCredentials: true,
          }
        );

        if (response.data.success && response.data.data) {
          const timestamp = Date.now();

          // Sync token to extension
          syncAuthToExtension({ token, timestamp });

          // Navigate to home on success
          navigate({ to: '/' });
        } else {
          console.error('Failed to verify user:', response.data.message);
          navigate({
            to: from === '/sign-up' ? '/sign-up' : '/login',
            search: { error: 'Failed to complete authentication' },
          });
        }
      } catch (err) {
        console.error('Error processing OAuth callback:', err);
        navigate({
          to: from === '/sign-up' ? '/sign-up' : '/login',
          search: { error: 'Authentication failed' },
        });
      }
    };

    processCallback();
  }, [navigate]);

  return (
    <div
      style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}
    >
      <div>Completing Google authentication...</div>
    </div>
  );
}
