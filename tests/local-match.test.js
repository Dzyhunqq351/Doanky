import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createLocalMatch,
  localAction,
  stepLocalMatch,
  finishLocalMatch,
  localResults,
} from '../shared/localMatch.js';
import { TETRIS_KEYS, flappyPlayer } from '../shared/controls.js';
import { roomRules } from '../shared/roomRules.js';
test('Flappy local round shares map, simultaneous start, independent controls and no automatic respawn', () => {
  const m = createLocalMatch('flappy', 'local', 543, ['One', 'Two']);
  assert.deepEqual(m.players[0].state, m.players[1].state);
  assert.equal(localAction(m, 0, { type: 'flap' }), false);
  m.phase = 'playing';
  for (let i = 0; i < 10; i++) stepLocalMatch(m, 16.667);
  const other = m.players[1].state.v;
  localAction(m, 0, { type: 'flap' });
  assert.equal(m.players[1].state.v, other);
  assert.notEqual(m.players[0].state.v, other);
  for (let i = 0; i < 200; i++) stepLocalMatch(m, 16.667);
  assert.equal(m.phase, 'results');
  assert.ok(m.players.every((p) => p.finishedAt !== null));
  assert.equal(localAction(m, 0, { type: 'flap' }), false);
});
test('Tetris local play has no timer while a room rule can end both boards at its limit', () => {
  const m = createLocalMatch('tetris', 'local', 87, ['One', 'Two']);
  assert.equal(m.limit, 0);
  m.phase = 'playing';
  assert.deepEqual(m.players[0].state.next, m.players[1].state.next);
  const second = structuredClone(m.players[1].state);
  localAction(m, 0, { type: 'drop' });
  assert.deepEqual(m.players[1].state, second);
  assert.ok(m.players[0].state.score > 0);
  localAction(m, 1, { type: 'drop' });
  assert.deepEqual(m.players[0].state.board, m.players[1].state.board);
  m.elapsed = 179950;
  stepLocalMatch(m, 100);
  assert.equal(m.phase, 'playing');
  assert.equal(m.elapsed, 180050);
  assert.ok(localResults(m).every((p) => Number.isInteger(p.score)));

  const timed = createLocalMatch(
    'tetris',
    'local',
    87,
    ['One', 'Two'],
    roomRules('tetris', { timeLimit: 30000 }),
  );
  timed.phase = 'playing';
  timed.elapsed = 29950;
  stepLocalMatch(timed, 100);
  assert.equal(timed.phase, 'results');
  assert.equal(timed.elapsed, 30000);
});
test('paused matches freeze both players and Pikachu uses identical boards with legal assist penalties', () => {
  const m = createLocalMatch('pikachu', 'local', 23, ['One', 'Two']);
  assert.deepEqual(m.players[0].state.board, m.players[1].state.board);
  m.phase = 'playing';
  localAction(m, 0, { type: 'hint' });
  localAction(m, 0, { type: 'shuffle' });
  assert.equal(m.players[0].state.score, -40);
  assert.equal(m.players[1].state.score, 0);
  m.phase = 'paused';
  const snapshot = structuredClone(m);
  stepLocalMatch(m, 100);
  assert.deepEqual(m, snapshot);
  finishLocalMatch(m);
  assert.equal(m.phase, 'results');
  assert.equal(localResults(m)[0].index, 1);
});
test('physical key maps do not overlap and numpad zero is distinct from the number row', () => {
  assert.deepEqual(
    Object.keys(TETRIS_KEYS.p1).filter((k) => k in TETRIS_KEYS.p2),
    [],
  );
  assert.equal(TETRIS_KEYS.p1.Space, 'drop');
  assert.equal(TETRIS_KEYS.p2.Numpad0, 'drop');
  assert.equal(TETRIS_KEYS.p2.Digit0, undefined);
  assert.equal(flappyPlayer('Space', 'local'), 0);
  assert.equal(flappyPlayer('ArrowUp', 'local'), 1);
  assert.equal(flappyPlayer('Numpad0', 'local'), 1);
  assert.equal(flappyPlayer('ArrowUp', 'single'), 0);
});
