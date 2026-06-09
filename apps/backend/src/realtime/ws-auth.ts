import type { IncomingMessage } from 'http';
import { verifyToken } from '../utils/auth.js';
import { getUserRepository } from '../database/repositories/index.js';
import logger from '../utils/logger.js';

export interface AuthedClient {
  userId: string;
  sessionId: string;
}

export class WsAuthError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'WsAuthError';
  }
}

function readProtocolHeader(req: IncomingMessage): string | undefined {
  const raw = req.headers['sec-websocket-protocol'];
  if (Array.isArray(raw)) return raw[0];
  return raw;
}

export async function authenticateUpgrade(req: IncomingMessage): Promise<AuthedClient> {
  const header = readProtocolHeader(req);
  if (!header) {
    throw new WsAuthError('Missing Sec-WebSocket-Protocol header');
  }

  const trimmed = header.trim();
  const bearerPrefix = 'Bearer ';
  const token = trimmed.startsWith(bearerPrefix) ? trimmed.slice(bearerPrefix.length) : trimmed;

  if (!token) {
    throw new WsAuthError('Sec-WebSocket-Protocol must be a non-empty token');
  }

  let decoded: { userId: string; sessionId: string };
  try {
    decoded = verifyToken(token) as { userId: string; sessionId: string };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Invalid token';
    throw new WsAuthError(message);
  }

  const userRepository = getUserRepository();
  const user = await userRepository.findOne({ where: { id: decoded.userId } });
  if (!user) {
    throw new WsAuthError('Invalid');
  }
  logger.info(`[ws] authenticated user:${decoded.userId} session:${decoded.sessionId}`);
  return { userId: decoded.userId, sessionId: decoded.sessionId };
}

export function writeUnauthorized(socket: {
  write: (data: string) => void;
  destroy: () => void;
}): void {
  socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
  socket.destroy();
}
