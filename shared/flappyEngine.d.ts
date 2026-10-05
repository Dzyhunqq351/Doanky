export { W, H, FPS, STEP, PHYSICS } from './flappyPhysics.js';
export type BirdState = {
  y: number;
  v: number;
  frame: number;
  pipes: { x: number; y: number; scored: boolean }[];
  score: number;
  seed: number;
  alive: boolean;
  pickups: {
    x: number;
    y: number;
    id: string;
    tone?: 'good' | 'bad';
    serial: number;
    taken?: boolean;
  }[];
  revives: number;
  invincible: number;
  frozenFrames: number;
  reverseFrames: number;
  respawnGraceFrames: number;
  buffMilestone: number;
  pendingBuff: string | null;
  buffNotice: { id: string; label: string; tone: 'good' | 'bad'; serial: number } | null;
};
export function createBird(seed?: number): BirdState;
export function flap(bird: BirdState): void;
export function stepBird(bird: BirdState): boolean;
export function resolveFlappyBuff(bird: BirdState, opponent?: BirdState): string | null;
export function frameOf(bird: BirdState): {
  y: number;
  v: number;
  frame: number;
  score: number;
  alive: boolean;
  pipes: number[][];
};
