/**
 * WebSocket client for the extension's background service worker.
 * Contract: "open WS, exponential backoff on close, forward messages".
 */
import type { ServerEvent } from '@repo/shared-types';

const INITIAL_BACKOFF_MS = 1000;
const MAX_BACKOFF_MS = 30_000;

let activeClientId: string | null = null;

export function getRealtimeClientId(): string | null {
  return activeClientId;
}

function generateClientId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

export type RealtimeMessageHandler = (event: ServerEvent) => void;
export type RealtimeStatusHandler = (status: 'connecting' | 'open' | 'closed') => void;

export interface RealtimeClientOptions {
  url: string;
  token: string;
  onMessage: RealtimeMessageHandler;
  onStatus?: RealtimeStatusHandler;
}

export class RealtimeClient {
  readonly clientId: string;
  private readonly options: RealtimeClientOptions;
  private ws: WebSocket | null = null;
  private retryAttempt = 0;
  private retryTimer: ReturnType<typeof setTimeout> | null = null;
  private stopped = false;

  constructor(options: RealtimeClientOptions) {
    this.options = options;
    this.clientId = generateClientId();
  }

  start(): void {
    this.stopped = false;
    activeClientId = this.clientId;
    this.connect();
  }

  stop(): void {
    this.stopped = true;
    if (activeClientId === this.clientId) {
      activeClientId = null;
    }
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

    const url = new URL(this.options.url);
    url.searchParams.set('clientId', this.clientId);
    const ws = new WebSocket(url.toString(), [this.options.token]);
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
  const fromEnv = import.meta.env.VITE_EXT_WS_URL as string | undefined;
  if (fromEnv && fromEnv.length > 0) return fromEnv;
  return 'ws://localhost:8000/ws';
}
