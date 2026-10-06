import { PHYSICS, STEP, advanceVertical } from './flappyPhysics.js';

// Presentation only: collision, score, buffs and results always stay server-owned.
export function presentBird(state, visual, { dt, age, running, pendingFlap }) {
  const reset =
    !visual ||
    visual.seed !== state.seed ||
    visual.alive !== state.alive ||
    state.respawnGraceFrames > (visual.grace || 0) + 10;
  const shown = reset
    ? {
        y: state.y,
        v: state.v,
        frame: state.frame,
        seed: state.seed,
        alive: state.alive,
        grace: state.respawnGraceFrames,
      }
    : { ...visual };
  shown.grace = state.respawnGraceFrames;
  if (!running || !state.alive || state.frozenFrames > 0) {
    return { ...shown, y: state.y, v: state.v, frame: state.frame };
  }
  const frames = Math.min(3, Math.max(0, dt / STEP));
  const extrapolate = Math.min(150, Math.max(0, age)) / STEP;
  const target = { y: state.y, v: state.v };
  advanceVertical(target, extrapolate);
  // Stop extrapolation during a network stall, never let a disconnected canvas
  // run indefinitely ahead of authoritative pipes.
  if (age < 200) {
    advanceVertical(shown, frames);
    shown.frame += frames;
  }
  const blend = 1 - Math.exp(-Math.max(0, dt) / 100);
  shown.frame += (state.frame + extrapolate - shown.frame) * blend;
  // Do not pull a fresh local flap back toward a snapshot that predates it.
  if (!pendingFlap) {
    shown.y += (target.y - shown.y) * blend;
    shown.v += (target.v - shown.v) * blend;
  }
  shown.y = Math.max(PHYSICS.ry, Math.min(PHYSICS.ground - PHYSICS.ry, shown.y));
  return shown;
}
