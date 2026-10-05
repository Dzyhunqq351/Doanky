import test from 'node:test';
import assert from 'node:assert/strict';
import {
  credentials,
  hashPassword,
  checkPassword,
  profileInput,
} from '../src/services/authService.js';
import { validateResult } from '../src/services/localResultService.js';
import { summarizeHub, summarizeLeaderboard } from '../src/services/hubService.js';
test('passwords are salted, spaces remain meaningful, invalid credentials are rejected', async () => {
  const a = await hashPassword('secret 123'),
    b = await hashPassword('secret 123');
  assert.notEqual(a, b);
  assert.equal(await checkPassword('secret 123', a), true);
  assert.equal(await checkPassword('secret123', a), false);
  assert.throws(() => credentials({ username: 'ab', password: 'longpass123' }));
  assert.throws(() => credentials({ username: 'valid', password: 'short' }));
  assert.equal(credentials({ username: ' PLAYER ', password: 'password123' }).username, 'player');
  assert.throws(() => profileInput({ name: 'ok', avatar: 20 }));
});
test('local results bind to account, sanitize player identity and reject impossible shape', () => {
  const user = { _id: 'account-1', name: 'Owner', avatar: 1 };
  const input = {
    id: '11111111-1111-4111-8111-111111111111',
    game: 'tetris',
    mode: 'local',
    results: [
      { name: 'Forged', playerId: 'victim', score: 10, elapsed: 1000 },
      { name: 'Guest', score: 20, elapsed: 1500 },
    ],
  };
  const m = validateResult(user, input);
  assert.equal(m.results[1].playerId, 'account-1');
  assert.equal(m.results[1].name, 'Owner');
  assert.equal(m.accountId, user._id);
  assert.throws(() => validateResult(user, null));
  assert.throws(() => validateResult(user, { ...input, results: [null, null] }));
  const mine = summarizeHub([m], 'account-1', 'tetris'),
    other = summarizeHub([m], 'victim', 'tetris');
  assert.equal(mine.history[0].score, 10);
  assert.equal(other.history.length, 0);
  input.results[0].score = 1.5;
  assert.throws(() => validateResult(user, input));
});

test('leaderboard keeps each account best score and returns current rank', () => {
  const matches = [
    {
      accountId: 'a',
      results: [{ playerId: 'a', name: 'An', avatar: 1, score: 40 }],
    },
    {
      accountId: 'b',
      results: [{ playerId: 'b', name: 'Binh', avatar: 2, score: 70 }],
    },
    {
      accountId: 'a',
      results: [{ playerId: 'a', name: 'An', avatar: 1, score: 90 }],
    },
  ];
  const board = summarizeLeaderboard(matches, 'b');
  assert.deepEqual(
    board.top.map((row) => [row.name, row.score, row.played]),
    [
      ['An', 90, 2],
      ['Binh', 70, 1],
    ],
  );
  assert.equal(board.me.rank, 2);
  assert.equal(board.totalPlayers, 2);
});
