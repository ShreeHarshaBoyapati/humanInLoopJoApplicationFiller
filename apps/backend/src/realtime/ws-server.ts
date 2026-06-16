import type { Server as HttpServer, IncomingMessage } from 'http';
import type { Duplex } from 'stream';
import { WebSocketServer, WebSocket } from 'ws';
import type { HelloEvent } from '@repo/shared-types';
import { authenticateUpgrade, writeUnauthorized, WsAuthError } from './ws-auth.js';
import { addClient, removeClient, peerCount } from './ws-hub.js';
import logger from '../utils/logger.js';

const WS_PATH = '/ws';

function parsePath(reqUrl: string): string {
  const qIdx = reqUrl.indexOf('?');
  return qIdx === -1 ? reqUrl : reqUrl.slice(0, qIdx);
}

function parseQuery(reqUrl: string): Record<string, string> {
  const qIdx = reqUrl.indexOf('?');
  if (qIdx === -1 || qIdx === reqUrl.length - 1) return {};
  const params = new URLSearchParams(reqUrl.slice(qIdx + 1));
  const result: Record<string, string> = {};
  params.forEach((value, key) => {
    result[key] = value;
  });
  return result;
}

function handleProtocols(protocols: Set<string>, _request: IncomingMessage): string | false {
  if (protocols.size === 1) {
    const only = protocols.values().next().value;
    if (only !== undefined) return only;
  }
  return false;
}

function sendHello(ws: WebSocket, userId: string): void {
  const hello: HelloEvent = {
    type: 'hello',
    userId,
    peerCount: peerCount(userId),
  };
  ws.send(JSON.stringify(hello));
}

export function attachWebSocketServer(httpServer: HttpServer): WebSocketServer {
  const wss = new WebSocketServer({ noServer: true, handleProtocols });

  httpServer.on('upgrade', (req: IncomingMessage, socket: Duplex, head: Buffer) => {
    const path = parsePath(req.url ?? '');
    if (path !== WS_PATH) {
      socket.destroy();
      return;
    }

    authenticateUpgrade(req).then(
      (client) => {
        logger.info(`[ws] upgrade successful user:${client.userId}`);
        wss.handleUpgrade(req, socket, head, (ws) => {
          wss.emit('connection', ws, req, client);
        });
      },
      (err: unknown) => {
        const message = err instanceof WsAuthError ? err.message : 'Unauthorized';
        console.warn(`[ws] rejecting upgrade: ${message}`);
        writeUnauthorized(socket);
      }
    );
  });

  wss.on('connection', (ws: WebSocket, req: IncomingMessage, client: { userId: string }) => {
    logger.info(`[ws] new connection user:${client.userId}`);
    const { userId } = client;
    const query = parseQuery(req.url ?? '');
    addClient(userId, ws, query.clientId);
    console.log(`[ws] connected user:${userId} peerCount=${peerCount(userId)}`);
    sendHello(ws, userId);

    ws.on('close', () => {
      removeClient(ws);
      console.log(`[ws] disconnected user:${userId} peerCount=${peerCount(userId)}`);
    });

    ws.on('error', (err) => {
      console.error(`[ws] socket error user:${userId}`, err);
    });
  });

  return wss;
}
