import type { BirdState } from './flappyEngine.js';
export type BirdVisual = {
  y: number;
  v: number;
  frame: number;
  seed: number;
  alive: boolean;
  grace: number;
};
export function presentBird(
  state: BirdState,
  visual: BirdVisual | null,
  input: { dt: number; age: number; running: boolean; pendingFlap: boolean },
): BirdVisual;
