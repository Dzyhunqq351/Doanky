import type { LocalMatch } from './localMatch.js';
export type DuelRules = {
  hints: number;
  swaps: number;
  ranking: 'score' | 'time';
  timeLimit?: number;
};
export function createDuel(names: string[], rules: DuelRules): LocalMatch;
export function dealTurn(match: LocalMatch): void;
export function duelAction(match: LocalMatch, index: number, input: Record<string, unknown>): void;
export function abandonDuel(match: LocalMatch, index: number): void;
export function duelResults(match: LocalMatch): {
  index: number;
  name: string;
  score: number;
  elapsed: number;
  completed: boolean;
  forfeited: boolean;
  rank: number;
}[];
