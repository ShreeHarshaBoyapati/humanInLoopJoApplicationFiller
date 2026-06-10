import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { RealtimeClient, resolveRealtimeUrl } from './realtime-client';
import { applyRealtimeEvent } from './realtime-handler';
import { useStore } from '../store';
import { getTokenFromCookie } from '../utils/auth-sync';

export interface RealtimeSyncProviderProps {
  children: React.ReactNode;
}

export function RealtimeSyncProvider({ children }: RealtimeSyncProviderProps) {
  const queryClient = useQueryClient();
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
        applyRealtimeEvent(queryClient, event);
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
  }, [userId, queryClient]);

  return <>{children}</>;
}
