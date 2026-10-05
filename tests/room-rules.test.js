import test from 'node:test';
import assert from 'node:assert/strict';
import { roomRules } from '../shared/roomRules.js';
import { createLocalMatch, localAction } from '../shared/localMatch.js';
test('Pikachu room rules validate limits and apply equally to both players', () => {
  assert.deepEqual(roomRules('pikachu'), {
    hints: 3,
    swaps: 5,
    ranking: 'score',
    timeLimit: 180000,
  });
  assert.deepEqual(roomRules('flappy', { timeLimit: 0 }), { timeLimit: 0 });
  assert.deepEqual(roomRules('tetris', { timeLimit: 30000 }), { timeLimit: 30000 });
  for (const timeLimit of [-1, 1000, 45000, '60000', NaN])
    assert.throws(() => roomRules('flappy', { timeLimit }));
  assert.throws(() => roomRules('pikachu', { ranking: 'invalid' }));
  for (const hints of [-1, 11, 1.5, '3', NaN]) assert.throws(() => roomRules('pikachu', { hints }));
  assert.throws(() => roomRules('pikachu', { swaps: 11 }));
  const m = createLocalMatch(
    'pikachu',
    'local',
    42,
    ['One', 'Two'],
    roomRules('pikachu', { hints: 0, swaps: 10 }),
  );
  assert.deepEqual(m.players[0].state, m.players[1].state);
  m.phase = 'playing';
  assert.throws(() => localAction(m, 0, { type: 'hint' }));
  localAction(m, 0, { type: 'shuffle' });
  assert.equal(m.players[0].state.score, -10);
  assert.equal(m.players[1].state.score, 0);
});
