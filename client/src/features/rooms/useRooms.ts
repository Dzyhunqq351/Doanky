import { useEffect, useRef, useState } from 'react';
import { io, type Socket } from 'socket.io-client';
import type { User } from '../../lib/api';
import type { LocalMatch, LocalGame } from '../../../../shared/localMatch.js';
export type Listing = {
  code: string;
  name: string;
  game: LocalGame;
  count: number;
  capacity: number;
  phase: string;
};
export type Room = {
  rules: {
    hints?: number;
    swaps?: number;
    ranking?: 'score' | 'time';
    timeLimit: number;
  };
  code: string;
  name: string;
  game: LocalGame;
  private: boolean;
  hostId: string;
  phase: string;
  players: (User & { connected: boolean })[];
  startsAt: number;
  now: number;
  matchId: string;
  match: LocalMatch | null;
  results: {
    playerId: string;
    name: string;
    score: number;
    elapsed: number;
    rank: number;
    completed?: boolean;
    forfeited?: boolean;
  }[];
  persistence: string;
};
export function useRooms(user: User | null) {
  const socket = useRef<Socket | null>(null),
    [room, setRoom] = useState<Room | null>(null),
    [list, setList] = useState<Listing[]>([]),
    [connected, setConnected] = useState(false),
    [error, setError] = useState('');
  useEffect(() => {
    if (!user) {
      setRoom(null);
      setList([]);
      return;
    }
    const s = io({ transports: ['websocket'], withCredentials: true });
    socket.current = s;
    s.on('connect', () => {
      setConnected(true);
      setError('');
    });
    s.on('disconnect', () => setConnected(false));
    s.on('connect_error', (e) => setError(e.message));
    s.on('replaced', () => {
      setError('Tài khoản đã mở phòng ở tab khác.');
      setRoom(null);
    });
    s.on('rooms', setList);
    s.on('room', setRoom);
    return () => {
      s.disconnect();
      socket.current = null;
      setConnected(false);
    };
  }, [user?.id, user?.name, user?.avatar]);
  async function send(event: string, input: unknown = {}) {
    const s = socket.current;
    if (!s?.connected) throw new Error('Đang kết nối lại máy chủ.');
    return new Promise<any>((resolve, reject) =>
      s
        .timeout(10000)
        .emit(
          event,
          input,
          (err: Error, reply: { ok: boolean; message?: string; data?: unknown }) => {
            if (err) reject(new Error('Máy chủ chưa phản hồi.'));
            else if (!reply.ok) reject(new Error(reply.message));
            else resolve(reply.data);
          },
        ),
    );
  }
  return { room, list, connected, error, send };
}
