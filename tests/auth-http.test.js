import test from 'node:test';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';
import { randomBytes } from 'node:crypto';
import app from '../src/app.js';
import User from '../src/models/User.js';
import Session from '../src/models/Session.js';
import Match from '../src/models/Match.js';
import { attachRooms } from '../src/routes/socket.js';
import { io as client } from 'socket.io-client';
import { decodeJwt } from 'jose';
process.env.JWT_SECRET = randomBytes(32).toString('hex');
const databaseUri = process.env.TEST_MONGODB_URI || 'mongodb://127.0.0.1:27017/playroom_auth_test';
test('HTTP auth, CSRF, private account history, idempotent save, logout and expiry', async (t) => {
  try {
    await mongoose.connect(databaseUri, {
      serverSelectionTimeoutMS: 1500,
    });
  } catch {
    t.skip('MongoDB is required for HTTP auth integration');
    return;
  }
  const prefix = `qa_${randomBytes(5).toString('hex')}`,
    ids = [];
  const server = app.listen(0, '127.0.0.1');
  const { io, rooms } = attachRooms(server),
    sockets = [];
  await new Promise((r) => server.once('listening', r));
  const base = `http://127.0.0.1:${server.address().port}`;
  t.after(async () => {
    sockets.forEach((s) => s.disconnect());
    rooms.stop();
    await new Promise((r) => io.close(r));
    await Session.deleteMany({ userId: { $in: ids } });
    await Match.deleteMany({ 'results.playerId': { $in: ids.map(String) } });
    await User.deleteMany({ _id: { $in: ids }, username: { $in: [prefix, prefix + '_2'] } });
    await mongoose.disconnect();
  });
  async function request(path, method = 'GET', body, cookie = '', headers = {}) {
    const r = await fetch(base + '/api' + path, {
      method,
      headers: {
        'Content-Type': 'application/json',
        'X-Playroom': '1',
        Cookie: cookie,
        ...headers,
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    return { status: r.status, body: await r.json(), cookie: r.headers.get('set-cookie') };
  }
  assert.equal((await request('/hub')).status, 401);
  const input = { username: prefix, name: 'Test Account', password: 'test password 123' };
  assert.equal(
    (await request('/auth/register', 'POST', input, '', { Origin: 'https://untrusted.example' }))
      .status,
    403,
  );
  const reg = await request('/auth/register', 'POST', input);
  assert.equal(reg.status, 200);
  ids.push(reg.body.user.id);
  const cookie = reg.cookie.split(';')[0];
  const token = cookie.slice(cookie.indexOf('=') + 1);
  assert.equal(decodeJwt(token).sub, reg.body.user.id);
  assert.equal(decodeJwt(token).iss, 'playroom');
  const parts = token.split('.');
  parts[1] = Buffer.from(
    JSON.stringify({ ...decodeJwt(token), sub: '000000000000000000000000' }),
  ).toString('base64url');
  assert.equal(
    (await request('/auth/me', 'GET', undefined, cookie.split('=')[0] + '=' + parts.join('.')))
      .status,
    401,
  );
  assert.match(reg.cookie, /HttpOnly/);
  assert.match(reg.cookie, /SameSite=Strict/);
  assert.ok(!JSON.stringify(reg.body).includes('password'));
  const stored = await User.findById(reg.body.user.id).select('+passwordHash');
  assert.notEqual(stored.passwordHash, input.password);
  // Reopen MongoDB: both the account and signed session survive connection loss.
  await mongoose.disconnect();
  await mongoose.connect(databaseUri);
  assert.equal(
    (await request('/auth/me', 'GET', undefined, cookie)).body.user.id,
    reg.body.user.id,
  );
  assert.equal((await User.findById(reg.body.user.id)).username, prefix);
  assert.equal((await request('/auth/register', 'POST', input)).status, 409);
  assert.equal(
    (await request('/auth/login', 'POST', { ...input, password: 'incorrect 123' })).status,
    401,
  );
  const other = await request('/auth/register', 'POST', { ...input, username: prefix + '_2' });
  ids.push(other.body.user.id);
  const otherCookie = other.cookie.split(';')[0];
  const result = {
    id: '22222222-2222-4222-8222-222222222222',
    game: 'flappy',
    mode: 'local',
    results: [
      { score: 5, elapsed: 5000 },
      { name: 'Guest', score: 2, elapsed: 4000 },
    ],
  };
  assert.equal((await request('/matches', 'POST', result)).status, 401);
  assert.equal(
    (await request('/matches', 'POST', result, cookie, { 'X-Playroom': '' })).status,
    403,
  );
  assert.equal((await request('/matches', 'POST', result, cookie)).status, 200);
  assert.equal((await request('/matches', 'POST', result, cookie)).status, 200);
  const history = await request('/hub?game=flappy', 'GET', undefined, cookie);
  assert.equal(history.body.history.length, 1);
  assert.equal(history.body.records[0].score, 5);
  const leaderboard = await request('/leaderboard?game=flappy', 'GET', undefined, cookie);
  assert.equal(leaderboard.status, 200);
  assert.equal(leaderboard.body.me.playerId, ids[0]);
  assert.equal(leaderboard.body.me.score, 5);
  assert.equal(leaderboard.body.top[0].playerId, ids[0]);
  assert.equal(leaderboard.body.totalPlayers, 1);
  assert.equal(
    (await request('/hub?playerId=' + ids[0], 'GET', undefined, otherCookie)).body.history.length,
    0,
  );
  assert.equal(
    (await request('/auth/profile', 'PATCH', { name: 'Changed', avatar: 4 }, cookie)).body.user
      .name,
    'Changed',
  );
  async function socketFor(cookie) {
    const s = client(base, {
      transports: ['websocket'],
      extraHeaders: { Cookie: cookie },
      reconnection: false,
    });
    sockets.push(s);
    await new Promise((resolve, reject) => {
      s.once('connect', resolve);
      s.once('connect_error', reject);
    });
    return s;
  }
  const anonymous = client(base, { transports: ['websocket'], reconnection: false });
  sockets.push(anonymous);
  const denied = await new Promise((r) => anonymous.once('connect_error', r));
  assert.match(denied.message, /đăng nhập/);
  await assert.rejects(socketFor(cookie.split('=')[0] + '=' + parts.join('.')), /đăng nhập/);
  const host = await socketFor(cookie),
    peer = await socketFor(otherCookie);
  const call = (s, event, input = {}) =>
    new Promise((resolve, reject) =>
      s
        .timeout(2000)
        .emit(event, input, (err, reply) =>
          err ? reject(err) : reply.ok ? resolve(reply.data) : reject(new Error(reply.message)),
        ),
    );
  for (const game of ['flappy', 'tetris', 'pikachu']) {
    await assert.rejects(call(host, 'room:create', { game, rules: { hints: 11 } }));
    const { code } = await call(host, 'room:create', {
      game,
      private: true,
      password: 'room1234',
      rules: { hints: 10, swaps: 2 },
    });
    assert.equal(code.length, 8);
    assert.equal(rooms.list().length, 0);
    await assert.rejects(call(peer, 'room:join', { code, password: 'incorrect' }));
    await call(peer, 'room:join', { code, password: 'room1234' });
    await assert.rejects(call(peer, 'room:start'));
    await call(host, 'room:start');
    const r = rooms.rooms.get(code);
    if (game === 'pikachu') {
      assert.equal(r.match.players[0].state.hints, 10);
      assert.equal(rooms.snapshot(r).rules.swaps, 2);
    }
    assert.deepEqual(r.match.players[0].state, r.match.players[1].state);
    assert.ok(!JSON.stringify(rooms.snapshot(r)).includes('passwordHash'));
    await assert.rejects(
      call(host, 'room:action', {
        matchId: r.matchId,
        type: game === 'flappy' ? 'flap' : game === 'tetris' ? 'drop' : 'hint',
      }),
    );
    r.startsAt = Date.now() - 10;
    r.match.phase = 'playing';
    const untouched = structuredClone(r.match.players[1].state);
    await call(host, 'room:action', {
      matchId: r.matchId,
      playerId: ids[1],
      type: game === 'flappy' ? 'flap' : game === 'tetris' ? 'drop' : 'hint',
    });
    if (game !== 'flappy') assert.deepEqual(r.match.players[1].state, untouched);
    const persisted = new Promise((resolve) => {
      const listener = (value) => {
        if (value?.matchId === r.matchId && value.persistence === 'saved') {
          host.off('room', listener);
          resolve();
        }
      };
      host.on('room', listener);
    });
    if (game === 'pikachu') {
      const hostState = structuredClone(r.match.players[0].state);
      await call(peer, 'room:action', { matchId: r.matchId, type: 'hint' });
      assert.deepEqual(r.match.players[0].state, hostState);
      const peerView = rooms.snapshot(r, ids[1]);
      assert.equal(peerView.match.players[0].state.hidden, true);
      assert.equal(peerView.match.players[0].state.board, undefined);
      assert.ok(Array.isArray(peerView.match.players[1].state.board));
    }
    await call(host, 'room:stop');
    await persisted;
    const saved = await Match.find({ matchId: { $in: ids.map((id) => `${id}:${r.matchId}`) } });
    assert.equal(saved.length, 2);
    await call(peer, 'room:leave');
    await call(host, 'room:leave');
  }
  const revoked = new Promise((r) => host.once('disconnect', r));
  assert.equal((await request('/auth/logout', 'POST', {}, cookie)).status, 200);
  await revoked;
  assert.equal(host.connected, false);
  assert.equal((await request('/auth/me', 'GET', undefined, cookie)).status, 401);
  const login = await request('/auth/login', 'POST', input);
  assert.equal(login.status, 200);
  await Session.updateMany({ userId: ids[0] }, { $set: { expiresAt: new Date(0) } });
  assert.equal(
    (await request('/auth/me', 'GET', undefined, login.cookie.split(';')[0])).status,
    401,
  );
});
