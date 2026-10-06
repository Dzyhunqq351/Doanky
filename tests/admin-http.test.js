import test from 'node:test';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';
import { randomBytes } from 'node:crypto';
import app from '../src/app.js';
import User from '../src/models/User.js';
import Match from '../src/models/Match.js';
import AdminAudit from '../src/models/AdminAudit.js';
import { checkPassword } from '../src/services/authService.js';
process.env.JWT_SECRET = randomBytes(32).toString('hex');
test('admin permissions, user management, maintenance, moderation and audit persist in MongoDB', async (t) => {
  const database = 'playroom_admin_test_' + randomBytes(6).toString('hex');
  try {
    await mongoose.connect('mongodb://127.0.0.1:27017/' + database, {
      serverSelectionTimeoutMS: 1500,
    });
  } catch {
    t.skip('MongoDB required');
    return;
  }
  const server = app.listen(0, '127.0.0.1');
  await new Promise((r) => server.once('listening', r));
  t.after(async () => {
    await new Promise((r) => server.close(r));
    // Only the uniquely named database created by this test may be removed.
    if (mongoose.connection.name === database && database.startsWith('playroom_admin_test_'))
      await mongoose.connection.dropDatabase();
    await mongoose.disconnect();
  });
  const base = `http://127.0.0.1:${server.address().port}/api`;
  async function request(path, method = 'GET', body, cookie = '') {
    const response = await fetch(base + path, {
      method,
      headers: { 'Content-Type': 'application/json', 'X-Playroom': '1', Cookie: cookie },
      body: body ? JSON.stringify(body) : undefined,
    });
    return {
      status: response.status,
      body: await response.json(),
      cookie: response.headers.get('set-cookie')?.split(';')[0],
    };
  }
  const root = await request('/auth/register', 'POST', {
    username: 'rootqa',
    password: 'test password 123',
    role: 'superadmin',
  });
  assert.equal(root.body.user.role, 'user');
  const ordinary = await request('/auth/register', 'POST', {
    username: 'playerqa',
    password: 'test password 123',
  });
  assert.equal((await request('/admin/users')).status, 401);
  assert.equal((await request('/admin/users', 'GET', null, ordinary.cookie)).status, 403);
  await User.updateOne({ _id: root.body.user.id }, { $set: { role: 'superadmin' } });
  const admin = (path, method, body) => request('/admin' + path, method, body, root.cookie);
  assert.equal((await admin('/overview')).status, 200);
  const list = await admin('/users?search=playerqa');
  const player = list.body.rows[0];
  assert.equal(list.body.total, 1);
  assert.equal(JSON.stringify(list.body).includes('passwordHash'), false);
  assert.equal((await admin('/users?search=%5B.*')).body.total, 0);
  assert.equal(
    (await admin('/users/' + root.body.user.id, 'PATCH', { blocked: true })).status,
    403,
  );
  const change = {
    name: 'Tên mới',
    email: 'player@example.test',
    avatar: 1,
    blocked: true,
    reason: 'Test khóa',
    version: player.updatedAt,
  };
  assert.equal((await admin('/users/' + player.id, 'PATCH', change)).status, 200);
  assert.equal((await request('/auth/me', 'GET', null, ordinary.cookie)).status, 401);
  assert.equal(
    (await request('/auth/login', 'POST', { username: 'playerqa', password: 'test password 123' }))
      .status,
    403,
  );
  assert.equal((await admin('/users/' + player.id, 'PATCH', change)).status, 409);
  const fresh = (await admin('/users?search=playerqa')).body.rows[0];
  assert.equal(
    (
      await admin('/users/' + player.id, 'PATCH', {
        ...change,
        blocked: false,
        version: fresh.updatedAt,
      })
    ).status,
    200,
  );
  const secret = 'replacement password 456';
  assert.equal(
    (
      await admin('/users/' + player.id + '/password', 'POST', {
        password: secret,
        reason: 'Test reset',
      })
    ).status,
    200,
  );
  const stored = await User.findById(player.id).select('+passwordHash');
  assert.equal(await checkPassword(secret, stored.passwordHash), true);
  assert.equal(
    (await request('/auth/login', 'POST', { username: 'playerqa', password: secret })).status,
    200,
  );
  const created = await admin('/users', 'POST', {
    username: 'addedqa',
    name: 'Thêm mới',
    password: 'another password',
    role: 'superadmin',
    reason: 'Test thêm người dùng',
  });
  assert.equal(created.status, 201);
  assert.equal(created.body.user.role, 'user');
  const settings = {
    enabled: false,
    modes: ['single', 'local', 'online'],
    description: 'Bản thử nghiệm',
    maintenanceMessage: 'Đang kiểm tra',
    reason: 'Test bảo trì',
    version: null,
  };
  assert.equal((await admin('/games/flappy', 'PATCH', settings)).status, 200);
  assert.equal(
    (await request('/games/flappy/access', 'POST', { mode: 'single' }, root.cookie)).status,
    403,
  );
  assert.equal(
    (await request('/games', 'GET', null, root.cookie)).body.games.find((g) => g.game === 'flappy')
      .description,
    'Bản thử nghiệm',
  );
  assert.equal((await admin('/games/flappy', 'PATCH', settings)).status, 409);
  const config = (await admin('/games')).body.rows.find((g) => g.game === 'flappy');
  assert.equal(
    (
      await admin('/games/flappy', 'PATCH', {
        ...settings,
        enabled: true,
        modes: ['single'],
        version: config.updatedAt,
      })
    ).status,
    200,
  );
  assert.equal(
    (await request('/games/flappy/access', 'POST', { mode: 'single' }, root.cookie)).status,
    200,
  );
  assert.equal(
    (await request('/games/flappy/access', 'POST', { mode: 'online' }, root.cookie)).status,
    403,
  );
  const match = await Match.create({
    matchId: 'admin-qa',
    accountId: player.id,
    game: 'flappy',
    mode: 'single',
    endedAt: new Date(),
    results: [{ playerId: player.id, name: 'QA', score: 42, elapsed: 60000, rank: 1 }],
  });
  assert.equal(
    (await request('/leaderboard?game=flappy', 'GET', null, root.cookie)).body.top.length,
    1,
  );
  assert.equal(
    (await admin('/matches/' + match.id, 'PATCH', { hidden: true, reason: 'Test ẩn' })).status,
    200,
  );
  assert.equal(
    (await request('/leaderboard?game=flappy', 'GET', null, root.cookie)).body.top.length,
    0,
  );
  assert.equal(
    (await admin('/matches/' + match.id, 'PATCH', { hidden: false, reason: 'Test khôi phục' }))
      .status,
    200,
  );
  assert.equal(
    (await request('/leaderboard?game=flappy', 'GET', null, root.cookie)).body.top.length,
    1,
  );
  const audit = await AdminAudit.find().lean();
  assert.ok(audit.length >= 8);
  assert.ok(audit.every((row) => row.status === 'applied'));
  assert.equal(JSON.stringify(audit).includes(secret), false);
  assert.equal(JSON.stringify(audit).includes('passwordHash'), false);
});
