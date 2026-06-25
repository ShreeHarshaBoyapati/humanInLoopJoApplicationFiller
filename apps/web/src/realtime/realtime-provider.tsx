import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';
import type { ServerEvent } from '@repo/shared-types';
import { RealtimeClient, resolveRealtimeUrl } from './realtime-client';
import { applyRealtimeEvent } from './realtime-handler';
import { useStore } from '../store';
import { getTokenFromCookie, resetAuthOnUserDeleted } from '../utils/auth-sync';
import { queryClient } from '../utils/query-client';

export interface RealtimeSyncProviderProps {
  children: React.ReactNode;
}

function isUserDeletedEvent(
  event: ServerEvent
): event is Extract<ServerEvent, { type: 'user.deleted' }> {
  return event.type === 'user.deleted';
}

export function RealtimeSyncProvider({ children }: RealtimeSyncProviderProps) {
  const reactQueryClient = useQueryClient();
  const navigate = useNavigate();
  const userId = useStore((state) => state.id);
  const clientRef = useRef<RealtimeClient | null>(null);

  useEffect(() => {
    if (!userId) {
      clientRef.current?.stop();
      clientRef.current = null;
      return;
    }

    const token = getTokenFromCookie();
    if (!token) return;

    const url = resolveRealtimeUrl();
    if (!url) return;

    const client = new RealtimeClient({
      url,
      token,
      onMessage: (event) => {
        if (isUserDeletedEvent(event)) {
          resetAuthOnUserDeleted({
            clearUser: () => useStore.getState().clearUser(),
            clearQueryCache: () => queryClient.clear(),
            showSnackbar: (message, options) => useStore.getState().showSnackbar(message, options),
            navigateToLogin: () => {
              navigate({ to: '/login' });
            },
          });
          client.stop();
          return;
        }
        applyRealtimeEvent(reactQueryClient, event);
      },
    });
    clientRef.current = client;
    client.start();

    return () => {
      client.stop();
      if (clientRef.current === client) {
        clientRef.current = null;
      }
    };
  }, [userId, reactQueryClient, navigate]);

  return <>{children}</>;
}
