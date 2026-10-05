export const W: number;
export const H: number;
export const FPS: number;
export const STEP: number;
export const PHYSICS: Readonly<{
  x: number;
  gravity: number;
  jump: number;
  maxFall: number;
  minFlapMs: number;
  rx: number;
  ry: number;
  birdW: number;
  birdH: number;
  ground: number;
  pipeW: number;
  pipeH: number;
  gap: number;
  dx: number;
  firstPipeFrame: number;
  pipeInterval: number;
}>;
export function advanceVertical(body: { y: number; v: number }, frames: number): void;
export function pipeY(seed: number, index: number): number;
export function visiblePipes(
  seed: number,
  frame: number,
  width: number,
  offset?: number,
): number[][];
