import { findPair, pikachuAction } from './pikachuEngine.js';
import { tetrisAction, fits } from './tetrisEngine.js';
export function playBot(game, state) {
  if (state.done) return;
  if (game === 'pikachu') {
    const pair = findPair(state.board);
    if (pair) pikachuAction(state, { type: 'pair', a: pair[0], b: pair[1] });
    return;
  }
  let best = null;
  for (let rotation = 0; rotation < 4; rotation++)
    for (let x = -2; x < 10; x++) {
      const trial = structuredClone(state);
      for (let i = 0; i < rotation; i++) tetrisAction(trial, 'rotate');
      if (!fits(trial, trial.active.matrix, x, trial.active.y)) continue;
      trial.active.x = x;
      tetrisAction(trial, 'drop');
      let height = 0,
        holes = 0,
        bump = 0,
        previous = 0;
      for (let c = 0; c < 10; c++) {
        let top = 20;
        for (let y = 0; y < 20; y++) {
          if (trial.board[y][c] && top === 20) top = y;
          else if (!trial.board[y][c] && top < 20) holes++;
        }
        const h = 20 - top;
        height += h;
        if (c) bump += Math.abs(previous - h);
        previous = h;
      }
      const value =
        (trial.lines - state.lines) * 18 -
        height * 0.6 -
        holes * 8 -
        bump * 0.4 -
        (trial.done ? 10000 : 0);
      if (!best || value > best.value) best = { value, rotation, x };
    }
  if (!best) {
    tetrisAction(state, 'drop');
    return;
  }
  for (let i = 0; i < best.rotation; i++) tetrisAction(state, 'rotate');
  while (state.active.x !== best.x) {
    const before = state.active.x;
    tetrisAction(state, best.x < before ? 'left' : 'right');
    if (before === state.active.x) break;
  }
  tetrisAction(state, 'drop');
}
