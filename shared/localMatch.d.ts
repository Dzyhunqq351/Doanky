import type { BirdState } from './flappyEngine.js';
import type { PikachuState, TetrisState } from '../client/src/lib/arcade';
export type LocalGame = 'flappy' | 'tetris' | 'pikachu';
export type LocalMode = 'single' | 'local' | 'bot';
export type LocalMatch = {
  game: LocalGame;
  mode: LocalMode;
  seed: number;
  phase: 'ready' | 'countdown' | 'playing' | 'paused' | 'results' | 'turn-ready';
  turn?: number;
  ranking?: 'score' | 'time';
  elapsed: number;
  limit: number;
  players: {
    name: string;
    finishedAt: number | null;
    forfeited?: boolean;
    state: BirdState | TetrisState | PikachuState;
  }[];
};
export function createLocalMatch(
  game: LocalGame,
  mode: LocalMode,
  seed: number,
  names: string[],
  rules?: { hints?: number; swaps?: number; timeLimit?: number; ranking?: 'score' | 'time' },
): LocalMatch;
export function localAction(
  match: LocalMatch,
  index: number,
  input: Record<string, unknown>,
): boolean;
export function stepLocalMatch(match: LocalMatch, dt: number): void;
export function finishLocalMatch(match: LocalMatch): void;
export function localResults(match: LocalMatch): {
  index: number;
  name: string;
  score: number;
  elapsed: number;
  lines: number;
  pairs: number;
  completed?: boolean;
  forfeited?: boolean;
  rank: number;
}[];
