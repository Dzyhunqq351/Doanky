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
  inputSeq?: Record<string, number>;
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
  const leaving = useRef(false);
  const socket = useRef<Socket | null>(null),
    [room, setRoom] = useState<Room | null>(null),
    [list, setList] = useState<Listing[]>([]),
    [connected, setConnected] = useState(false),
    [error, setError] = useState('');
  useEffect(() => {
    leaving.current = !!user && sessionStorage.getItem('playroom:leave') === user.id;
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
      if (leaving.current || sessionStorage.getItem('playroom:leave') === user.id) {
        leaving.current = true;
        s.timeout(5000).emit('room:leave', {}, (err: Error, reply: { ok: boolean }) => {
          if (!err && reply?.ok) {
            leaving.current = false;
            sessionStorage.removeItem('playroom:leave');
          }
        });
      }
    });
    s.on('disconnect', () => setConnected(false));
    s.on('connect_error', (e) => setError(e.message));
    s.on('room:error', (message: string) => setError(message));
    s.on('replaced', () => {
      setError('Tài khoản đã mở phòng ở tab khác.');
      setRoom(null);
    });
    s.on('rooms', setList);
    s.on('room', (next: Room | null) => {
      if (!leaving.current && sessionStorage.getItem('playroom:leave') !== user.id) setRoom(next);
    });
    return () => {
      s.disconnect();
      socket.current = null;
      setConnected(false);
    };
  }, [user?.id, user?.name, user?.avatar]);
  async function send(event: string, input: unknown = {}) {
    const s = socket.current;
    if (event === 'room:leave') {
      leaving.current = true;
      sessionStorage.setItem('playroom:leave', user?.id || '');
      setRoom(null);
      const url = new URL(location.href);
      url.searchParams.delete('room');
      history.replaceState(null, '', url);
      if (s?.connected) {
        s.timeout(4000).emit(event, input, (err: Error, reply: { ok: boolean }) => {
          if (!err && reply?.ok) {
            leaving.current = false;
            sessionStorage.removeItem('playroom:leave');
          } else {
            s.disconnect();
            s.connect();
          }
        });
      }
      return;
    }
    if (leaving.current) throw new Error('Đang rời phòng cũ. Vui lòng thử lại sau giây lát.');
    if (!s?.connected) throw new Error('Đang kết nối lại máy chủ.');
    return new Promise<any>((resolve, reject) =>
      s
        .timeout(10000)
        .emit(
          event,
          input,
          (err: Error, reply: { ok: boolean; message?: string; data?: unknown }) => {
            if (err) reject(new Error('Máy chủ chưa phản hồi.'));
            else if (!reply?.ok)
              reject(new Error(reply?.message || 'Phản hồi phòng không hợp lệ.'));
            else resolve(reply.data);
          },
        ),
    );
  }
  return { room, list, connected, error, send };
}
