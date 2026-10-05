export type PikachuState = {
  board: number[];
  score: number;
  hints: number;
  swaps: number;
  pairs: number;
  done: boolean;
  hint: number[] | null;
  path: number[][] | null;
  revision: number;
  autoShuffle: boolean;
  buffMilestone: number;
  scoreMultiplierUntil: number;
  timeCredit: number;
  buffNotice: BuffNotice | null;
};
export type BuffNotice = { id: string; label: string; tone: 'good' | 'bad'; serial: number };
export type TetrisState = {
  board: number[][];
  score: number;
  lines: number;
  level: number;
  done: boolean;
  hold: string | null;
  canHold: boolean;
  next: string[];
  active: { type: string; matrix: number[][]; x: number; y: number };
  elapsed: number;
  speedFactor: number;
  speedUntil: number;
  scoreMultiplierUntil: number;
  buffMilestone: number;
  buffNotice: BuffNotice | null;
};
export const clockText = (ms: number) =>
  `${Math.floor(Math.max(0, ms) / 60000)}:${String(Math.floor(Math.max(0, ms) / 1000) % 60).padStart(2, '0')}`;
export const creatureFiles = [
  1, 4, 7, 10, 12, 15, 19, 23, 25, 27, 29, 32, 35, 37, 39, 41, 43, 46, 48, 50, 52, 54, 56, 58, 60,
  63, 66, 69, 72, 74, 77, 79, 81, 84, 86, 90,
];
export const creatures = creatureFiles.map((n) => `Linh vật ${n}`);
export const matrices: Record<string, number[][]> = {
  I: [[1, 1, 1, 1]],
  J: [
    [2, 0, 0],
    [2, 2, 2],
  ],
  L: [
    [0, 0, 3],
    [3, 3, 3],
  ],
  O: [
    [4, 4],
    [4, 4],
  ],
  S: [
    [0, 5, 5],
    [5, 5, 0],
  ],
  T: [
    [0, 6, 0],
    [6, 6, 6],
  ],
  Z: [
    [7, 7, 0],
    [0, 7, 7],
  ],
};
