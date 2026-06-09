import type { WebSocket } from 'ws';
import type { ServerEvent } from '@repo/shared-types';
import logger from '../utils/logger.js';

const rooms = new Map<string, Set<WebSocket>>();
const wsToRoom = new WeakMap<WebSocket, string>();

function addToRoom(userId: string, ws: WebSocket): number {
  let room = rooms.get(userId);
  if (!room) {
    room = new Set();
    rooms.set(userId, room);
  }
  room.add(ws);
  wsToRoom.set(ws, userId);
  return room.size;
}

function removeFromRoom(ws: WebSocket): { userId: string; peerCount: number } | undefined {
  const userId = wsToRoom.get(ws);
  if (!userId) return undefined;
  wsToRoom.delete(ws);

  const room = rooms.get(userId);
  if (!room) return undefined;
  room.delete(ws);
  if (room.size === 0) rooms.delete(userId);
  return { userId, peerCount: room.size };
}

export function addClient(userId: string, ws: WebSocket): number {
  logger.info(`[ws] adding client to room user:${userId}`);
  return addToRoom(userId, ws);
}

export function removeClient(ws: WebSocket): { userId: string; peerCount: number } | undefined {
  return removeFromRoom(ws);
}

export function peerCount(userId: string): number {
  return rooms.get(userId)?.size ?? 0;
}

export function broadcast(userId: string, event: ServerEvent): void {
  const room = rooms.get(userId);
  if (!room || room.size === 0) return;

  const payload = JSON.stringify(event);

  for (const client of room) {
    if (client.readyState === client.OPEN) {
      client.send(payload);
    }
  }
}
