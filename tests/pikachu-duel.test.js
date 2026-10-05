import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createDuel,
  dealTurn,
  duelAction,
  duelResults,
  abandonDuel,
} from '../shared/pikachuDuel.js';
import { validateResult } from '../src/services/localResultService.js';
test('Pikachu turn handoff hides future board, blocks wrong player and resets personal clock', () => {
  const m = createDuel(['One', 'Two'], {
    hints: 3,
    swaps: 5,
    ranking: 'time',
    timeLimit: 7 * 60 * 1000,
  });
  assert.equal(m.limit, 420000);
  dealTurn(m);
  m.phase = 'playing';
  m.elapsed = 5000;
  assert.equal(m.players[1].state.board, undefined);
  assert.throws(() => duelAction(m, 1, { type: 'hint' }));
  m.players[0].state.board.fill(0);
  m.players[0].state.board[0] = m.players[0].state.board[1] = 1;
  duelAction(m, 0, { type: 'pair', a: 0, b: 1 });
  assert.equal(m.phase, 'turn-ready');
  assert.equal(m.elapsed, 0);
  assert.equal(m.players[0].finishedAt, 5000);
  assert.equal(m.players[0].completed, true);
  assert.throws(() => duelAction(m, 1, { type: 'hint' }));
  dealTurn(m);
  assert.notEqual(m.players[0].state.seed, m.players[1].state.seed);
  assert.equal(m.players[1].state.hints, 3);
  assert.equal(m.players[1].state.swaps, 5);
  m.phase = 'playing';
  m.elapsed = 100;
  duelAction(m, 1, { type: 'finish-turn' });
  assert.equal(m.phase, 'results');
  assert.equal(duelResults(m)[0].index, 0);
});
test('Pikachu rankings use selected criterion, completion and forfeits; ties share rank', () => {
  const m = createDuel(['One', 'Two'], { hints: 3, swaps: 5, ranking: 'score' });
  m.players.forEach((p, i) => {
    p.state.score = 7000 - i * 100;
    p.finishedAt = 60000 - i * 10000;
    p.completed = true;
  });
  assert.equal(duelResults(m)[0].index, 0);
  m.ranking = 'time';
  assert.equal(duelResults(m)[0].index, 1);
  m.players[1].finishedAt = 60000;
  m.players[1].state.score = 7000;
  assert.deepEqual(
    duelResults(m).map((p) => p.rank),
    [1, 1],
  );
  abandonDuel(m, 0);
  assert.equal(duelResults(m)[0].index, 1);
});
test('Local saved Pikachu ranks match the selected time rule', () => {
  const m = validateResult(
    { _id: 'account', name: 'One', avatar: 0 },
    {
      id: '11111111-1111-4111-8111-111111111111',
      game: 'pikachu',
      mode: 'local',
      ranking: 'time',
      results: [
        { score: 7200, elapsed: 90000, completed: true },
        { name: 'Two', score: 7170, elapsed: 60000, completed: true },
      ],
    },
  );
  assert.equal(m.results[0].name, 'Two');
  assert.equal(m.ranking, 'time');
});
