import { Gamepad2, Trophy, UserRound } from 'lucide-react';
export const pages = [
  { id: 'overview', label: 'Trò chơi', icon: Gamepad2 },
  { id: 'history', label: 'Thành tích', icon: Trophy },
  { id: 'profile', label: 'Hồ sơ', icon: UserRound },
] as const;
export type Page = (typeof pages)[number]['id'];
export type Entry = {
  id: string;
  game: string;
  mode: string;
  at: string;
  score: number;
  rank: number;
  players: number;
  participants?: {
    name: string;
    avatar: number;
    score: number;
    rank: number;
    elapsed: number;
    me: boolean;
  }[];
  duration: number;
  attempts: number;
  ranking?: 'score' | 'time';
};
export type HubData = { history: Entry[]; records: Entry[] };
export const names: Record<string, string> = {
  flappy: 'Flappy Bird',
  pikachu: 'Pikachu',
  tetris: 'Tetris',
};
export const time = (ms: number) =>
  `${Math.floor(ms / 60000)}:${String(Math.floor(ms / 1000) % 60).padStart(2, '0')}`;
