import type { ServerEvent } from '@repo/shared-types';

const INITIAL_BACKOFF_MS = 1000;
const MAX_BACKOFF_MS = 30_000;

export type RealtimeMessageHandler = (event: ServerEvent) => void;
export type RealtimeStatusHandler = (status: 'connecting' | 'open' | 'closed') => void;

export interface RealtimeClientOptions {
  url: string;
  token: string;
  onMessage: RealtimeMessageHandler;
  onStatus?: RealtimeStatusHandler;
}

export class RealtimeClient {
  private readonly options: RealtimeClientOptions;

  private ws: WebSocket | null = null;

  private retryAttempt = 0;

  private retryTimer: ReturnType<typeof setTimeout> | null = null;

  private stopped = false;

  constructor(options: RealtimeClientOptions) {
    this.options = options;
  }

  start(): void {
    this.stopped = false;
    this.connect();
  }

  stop(): void {
    this.stopped = true;
    if (this.retryTimer !== null) {
      clearTimeout(this.retryTimer);
      this.retryTimer = null;
    }
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  private connect(): void {
    if (this.stopped) return;

    this.options.onStatus?.('connecting');

    const ws = new WebSocket(this.options.url, [this.options.token]);
    this.ws = ws;

    ws.addEventListener('open', () => {
      this.retryAttempt = 0;
      this.options.onStatus?.('open');
    });

    ws.addEventListener('message', (e) => {
      let parsed: ServerEvent;
      try {
        parsed = JSON.parse(typeof e.data === 'string' ? e.data : '') as ServerEvent;
      } catch {
        return;
      }
      this.options.onMessage(parsed);
    });

    ws.addEventListener('error', () => {
      // The 'close' event fires right after; reconnect is driven from there.
    });

    ws.addEventListener('close', () => {
      this.ws = null;
      this.options.onStatus?.('closed');
      if (this.stopped) return;
      this.scheduleReconnect();
    });
  }

  private scheduleReconnect(): void {
    if (this.retryTimer !== null) return;
    const delay = Math.min(INITIAL_BACKOFF_MS * 2 ** this.retryAttempt, MAX_BACKOFF_MS);
    this.retryAttempt += 1;
    this.retryTimer = setTimeout(() => {
      this.retryTimer = null;
      this.connect();
    }, delay);
  }
}

export function resolveRealtimeUrl(): string {
  const fromEnv = import.meta.env.VITE_WS_URL as string | undefined;
  if (fromEnv && fromEnv.length > 0) return fromEnv;
  if (typeof window === 'undefined') return '';
  const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
  return `${protocol}://${window.location.host}/ws`;
}
