// Classic-style tuning in a 360 x 640 logical playfield, independent of display refresh rate.
// Reference: CodeExplainedRepo/Original-Flappy-bird-JavaScript (60 Hz feel).
// These are shared by the authoritative server and the local motion predictor.
export const W = 360;
export const H = 640;
export const FPS = 60;
export const STEP = 1000 / FPS;
export const PHYSICS = Object.freeze({
  x: W * 0.29,
  gravity: 0.32,
  jump: 6,
  maxFall: 8.5,
  minFlapMs: 50,
  rx: 15,
  ry: 12,
  birdW: 42,
  birdH: 30,
  ground: H * 0.861,
  pipeW: W * 0.164,
  pipeH: H * 0.888,
  gap: 120,
  dx: 2.25,
  firstPipeFrame: 30,
  pipeInterval: 100,
});

// Exact integration, including terminal speed. Splitting a time interval into
// 30/60/120/144 Hz render frames produces the same trajectory.
export function advanceVertical(body, frames) {
  if (frames <= 0) return;
  const accelerating = Math.min(frames, Math.max(0, (PHYSICS.maxFall - body.v) / PHYSICS.gravity));
  body.y += body.v * accelerating + 0.5 * PHYSICS.gravity * accelerating * accelerating;
  body.v = Math.min(PHYSICS.maxFall, body.v + PHYSICS.gravity * accelerating);
  body.y += body.v * (frames - accelerating);
  if (body.y < PHYSICS.ry) {
    body.y = PHYSICS.ry;
    body.v = Math.max(0, body.v);
  }
  body.y = Math.min(body.y, PHYSICS.ground - PHYSICS.ry);
}

// A map is a seed + a pipe index. It never depends on a device, retry count,
// viewport width or wall clock. Infinite rounds also get the same endless map.
export function pipeY(seed, index) {
  let n = (seed + Math.imul(index + 1, 0x9e3779b9)) >>> 0;
  n = Math.imul(n ^ (n >>> 16), 0x21f0aaad);
  n = Math.imul(n ^ (n >>> 15), 0x735a2d97);
  n = (n ^ (n >>> 15)) >>> 0;
  return -H * 0.35 * (1 + n / 4294967296);
}
export function visiblePipes(seed, frame, width, offset = 0) {
  const spacing = PHYSICS.pipeInterval * PHYSICS.dx;
  const firstX = W + (PHYSICS.firstPipeFrame - frame) * PHYSICS.dx + offset;
  const first = Math.max(0, Math.ceil((-PHYSICS.pipeW - firstX) / spacing));
  const last = Math.floor((width - firstX) / spacing);
  const pipes = [];
  for (let i = first; i <= last; i++) pipes.push([firstX + i * spacing, pipeY(seed, i)]);
  return pipes;
}
