import type { WebSocket } from 'ws';
import type {
  RealtimeResource,
  RealtimeAction,
  ResourceChangedEvent,
  ServerEvent,
} from '@repo/shared-types';
import logger from '../utils/logger.js';

const rooms = new Map<string, Set<WebSocket>>();
const wsToRoom = new WeakMap<WebSocket, string>();
const wsToClientId = new WeakMap<WebSocket, string>();

function addToRoom(userId: string, ws: WebSocket, clientId?: string): number {
  let room = rooms.get(userId);
  if (!room) {
    room = new Set();
    rooms.set(userId, room);
  }
  room.add(ws);
  wsToRoom.set(ws, userId);
  if (clientId) wsToClientId.set(ws, clientId);
  return room.size;
}

function removeFromRoom(ws: WebSocket): { userId: string; peerCount: number } | undefined {
  const userId = wsToRoom.get(ws);
  if (!userId) return undefined;
  wsToRoom.delete(ws);
  wsToClientId.delete(ws);

  const room = rooms.get(userId);
  if (!room) return undefined;
  room.delete(ws);
  if (room.size === 0) rooms.delete(userId);
  return { userId, peerCount: room.size };
}

export function addClient(userId: string, ws: WebSocket, clientId?: string): number {
  logger.info(`[ws] adding client to room user:${userId} clientId:${clientId ?? 'none'}`);
  return addToRoom(userId, ws, clientId);
}

export function removeClient(ws: WebSocket): { userId: string; peerCount: number } | undefined {
  return removeFromRoom(ws);
}

export function peerCount(userId: string): number {
  return rooms.get(userId)?.size ?? 0;
}

export function broadcast(userId: string, event: ServerEvent, originatorClientId?: string): void {
  const room = rooms.get(userId);
  if (!room || room.size === 0) return;

  const payload = JSON.stringify(event);

  for (const client of room) {
    if (client.readyState !== client.OPEN) continue;
    if (originatorClientId && wsToClientId.get(client) === originatorClientId) continue;

    try {
      client.send(payload);
    } catch (err) {
      logger.error(
        { err, userId },
        '[ws] send failed during broadcast; dropping message for this socket'
      );
    }
  }
}

export function emit<T = unknown, R = unknown>(
  userId: string,
  resource: RealtimeResource,
  action: RealtimeAction,
  id: string,
  data?: T,
  related?: R[],
  originatorClientId?: string
): void {
  const event: ResourceChangedEvent<T> = {
    type: 'resource.changed',
    resource,
    action,
    id,
    data,
    related: related as T[] | undefined,
  };
  try {
    broadcast(userId, event, originatorClientId);
  } catch (err) {
    logger.error({ err, userId, resource, action, id }, '[ws] emit failed; swallowed');
  }
}
