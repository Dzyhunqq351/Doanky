import test from 'node:test';
import assert from 'node:assert/strict';
import { createPikachu, connection, findPair, pikachuAction } from '../shared/pikachuEngine.js';
import {
  createTetris,
  tetrisAction,
  tickTetris,
  fits,
  resolveTetrisBuff,
} from '../shared/tetrisEngine.js';
import { createBird, resolveFlappyBuff, stepBird, PHYSICS } from '../shared/flappyEngine.js';
import { BENEFIT_RATE, pickBuff } from '../shared/buffPicker.js';
import { playBot } from '../shared/arcadeBot.js';
test('practice bots make legal moves and integer scores', () => {
  const p = createPikachu(42);
  playBot('pikachu', p);
  assert.equal(p.pairs, 1);
  assert.equal(p.score, 100);
  const t = createTetris(42, 0);
  for (let i = 0; i < 30 && !t.done; i++) playBot('tetris', t);
  assert.ok(t.score > 0);
  assert.ok(Number.isInteger(t.score));
  assert.equal(t.board.length, 20);
});
test('Pikachu paths: adjacent, outer border, blocked, mismatch, invalid indexes', () => {
  const b = Array(144).fill(2);
  b[0] = b[15] = 1;
  assert.ok(connection(b, 0, 15));
  b[17] = b[30] = 3;
  assert.equal(connection(b, 17, 30), null);
  assert.equal(connection(b, 0, 17), null);
  assert.equal(connection(b, -1, 5), null);
  assert.equal(connection(b, 0, 0), null);
  b.fill(0);
  b[17] = b[51] = 4;
  assert.ok(connection(b, 17, 51));
});
test('Pikachu fixed seed, deductions, limits, and complete solvability after deadlock recovery', () => {
  assert.deepEqual(createPikachu(3), createPikachu(3));
  const a = createPikachu(12);
  pikachuAction(a, { type: 'hint' });
  assert.equal(a.score, -30);
  assert.equal(a.hints, 2);
  assert.ok(connection(a.board, ...a.hint));
  pikachuAction(a, { type: 'shuffle' });
  assert.equal(a.score, -40);
  assert.equal(a.swaps, 4);
  assert.throws(() => arcadeRules({ hints: 11 }));
  assert.throws(() => arcadeRules({ swaps: -1 }));
  for (let seed = 1; seed <= 12; seed++) {
    const s = createPikachu(seed, 0, 0);
    assert.throws(() => pikachuAction(s, { type: 'hint' }));
    for (let i = 0; i < 72; i++) {
      const pair = findPair(s.board);
      assert.ok(pair, `seed ${seed}, step ${i}`);
      pikachuAction(s, { type: 'pair', a: pair[0], b: pair[1] });
    }
    assert.equal(s.done, true);
    assert.ok(Number.isInteger(s.score));
    assert.ok(s.buffMilestone >= 5, `seed ${seed} phải kích hoạt nhiều mốc buff`);
    assert.ok(s.buffNotice);
    assert.equal(s.pairs, 72);
  }
});
test('Tetris same bags, hold once, hard drop, line clearing, lock delay and top out', () => {
  const a = createTetris(44, 0),
    b = createTetris(44, 0);
  assert.deepEqual(a, b);
  const type = a.active.type;
  tetrisAction(a, 'hold');
  assert.equal(a.hold, type);
  const held = a.active.type;
  tetrisAction(a, 'hold');
  assert.equal(a.active.type, held);
  tetrisAction(a, 'drop');
  assert.equal(a.canHold, true);
  assert.ok(a.board.flat().some(Boolean));
  const s = createTetris(1, 0);
  s.board[19] = Array(10).fill(1);
  s.board[19][4] = s.board[19][5] = 0;
  s.active = {
    type: 'O',
    matrix: [
      [4, 4],
      [4, 4],
    ],
    x: 4,
    y: 0,
  };
  tetrisAction(s, 'drop');
  assert.equal(s.lines, 1);
  assert.ok(s.score >= 100);
  const ground = createTetris(1, 0);
  ground.active = {
    type: 'O',
    matrix: [
      [4, 4],
      [4, 4],
    ],
    x: 4,
    y: 18,
  };
  tickTetris(ground, 450);
  assert.equal(ground.board[19][4], 0);
  tickTetris(ground, 50);
  assert.equal(ground.board[19][4], 4);
  const wall = createTetris(1, 0);
  for (let i = 0; i < 20; i++) tetrisAction(wall, 'left');
  tetrisAction(wall, 'rotate');
  assert.ok(fits(wall));
  const over = createTetris(1, 0);
  over.board[0] = Array(10).fill(1);
  tetrisAction(over, 'hold');
  assert.equal(over.done, true);
});
test('creative buffs trigger once at score milestones and apply shared game state', () => {
  const pika = createPikachu(18);
  pika.score = 900;
  const pair = findPair(pika.board);
  pikachuAction(pika, { type: 'pair', a: pair[0], b: pair[1], elapsed: 1200 });
  assert.equal(pika.buffMilestone, 1);
  assert.ok(pika.buffNotice?.label);

  const first = createTetris(24, 0);
  const second = createTetris(24, 0);
  first.score = 1000;
  assert.ok(resolveTetrisBuff(first, second));
  assert.equal(first.buffMilestone, 1);
  assert.equal(resolveTetrisBuff(first, second), null);

  const bird = createBird(7);
  const rival = createBird(7);
  bird.pendingBuff = 'plus';
  assert.equal(resolveFlappyBuff(bird, rival), 'plus');
  assert.equal(bird.score, 10);
  assert.equal(bird.pendingBuff, null);
});
test('buff picker keeps a 60/40 benefit split and Flappy triggers every 10 points', () => {
  let beneficial = 0;
  for (let seed = 1; seed <= 10000; seed++) {
    const buff = pickBuff(seed, 1, [{ id: 'good', weight: 1 }], [{ id: 'bad', weight: 1 }]);
    if (buff.tone === 'good') beneficial++;
  }
  assert.equal(BENEFIT_RATE, 0.6);
  assert.ok(beneficial > 5700 && beneficial < 6300, `beneficial=${beneficial}`);

  const bird = createBird(9);
  bird.score = 9;
  bird.pipes.push({
    x: PHYSICS.x - PHYSICS.rx - PHYSICS.pipeW - 1,
    y: bird.y - PHYSICS.pipeH - PHYSICS.gap / 2,
    scored: false,
  });
  stepBird(bird);
  assert.equal(bird.score, 10);
  assert.equal(bird.buffMilestone, 1);
  assert.equal(bird.pickups.length, 1);
});
test('Flappy revive automatically resumes once after a crash or fall', () => {
  const bird = createBird(3);
  bird.score = 17;
  bird.revives = 1;
  bird.y = PHYSICS.ground;
  stepBird(bird);
  assert.equal(bird.alive, true);
  assert.equal(bird.revives, 0);
  assert.equal(bird.score, 17);
  assert.ok(bird.respawnGraceFrames > 0);
  assert.ok(bird.y < PHYSICS.ground - PHYSICS.ry);
});
