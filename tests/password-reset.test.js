import test from 'node:test';
import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import mongoose from 'mongoose';
import User from '../src/models/User.js';
import Session from '../src/models/Session.js';
import PasswordReset from '../src/models/PasswordReset.js';
import { register, login, createSession, resolveSession } from '../src/services/authService.js';
import {
  requestReset,
  resetPassword,
  changePassword,
  updateEmail,
} from '../src/services/passwordService.js';
import app from '../src/app.js';

process.env.JWT_SECRET = randomBytes(32).toString('hex');
test('Password recovery binds email and username, limits attempts, consumes code and revokes sessions', async (t) => {
  await mongoose.connect(
    process.env.TEST_MONGODB_URI || 'mongodb://127.0.0.1:27017/playroom_password_test',
    { serverSelectionTimeoutMS: 10000 },
  );
  await Promise.all([User.init(), Session.init(), PasswordReset.init()]);
  const username = `reset_${randomBytes(5).toString('hex')}`;
  let user;
  t.after(async () => {
    if (user) {
      await PasswordReset.deleteMany({ userId: user._id });
      await Session.deleteMany({ userId: user._id });
      await User.deleteOne({ _id: user._id });
    }
    await mongoose.disconnect();
  });
  user = await register({ username, name: 'Recovery QA', password: 'initial password 123' });
  await assert.rejects(
    updateEmail(user._id, { email: 'qa@example.com', currentPassword: 'incorrect' }),
  );
  const email = `${username}@example.com`;
  await updateEmail(user._id, { email, currentPassword: 'initial password 123' });
  let delivered = [];
  const deliver = async (address, code) => delivered.push({ address, code });
  await requestReset({ username, email: 'wrong@example.com' }, deliver);
  assert.equal(delivered.length, 0);
  await requestReset({ username, email }, deliver);
  assert.equal(delivered.length, 1);
  assert.match(delivered[0].code, /^\d{6}$/);
  const stored = await PasswordReset.findOne({ userId: user._id }).lean();
  assert.notEqual(stored.codeHash, delivered[0].code);
  await requestReset({ username, email }, deliver);
  assert.equal(delivered.length, 1, 'resend cooldown');
  const wrong = delivered[0].code === '000000' ? '000001' : '000000';
  for (let i = 0; i < 5; i++)
    await assert.rejects(
      resetPassword({ username, email, code: wrong, newPassword: 'new password 123' }),
    );
  await assert.rejects(
    resetPassword({ username, email, code: delivered[0].code, newPassword: 'new password 123' }),
  );
  await PasswordReset.updateOne({ userId: user._id }, { $set: { sentAt: new Date(0) } });
  await requestReset({ username, email }, deliver);
  const code = delivered.at(-1).code;
  await PasswordReset.updateOne({ userId: user._id }, { $set: { expiresAt: new Date(0) } });
  await assert.rejects(resetPassword({ username, email, code, newPassword: 'new password 123' }));
  await PasswordReset.updateOne({ userId: user._id }, { $set: { sentAt: new Date(0) } });
  await requestReset({ username, email }, deliver);
  const token = await createSession(user);
  const payload = { username, email, code: delivered.at(-1).code, newPassword: 'new password 123' };
  const results = await Promise.allSettled([resetPassword(payload), resetPassword(payload)]);
  assert.equal(
    results.filter((r) => r.status === 'fulfilled').length,
    1,
    'code consumed once under concurrency',
  );
  assert.equal(await resolveSession(token), null);
  await assert.rejects(login({ username, password: 'initial password 123' }));
  assert.equal(
    String((await login({ username, password: payload.newPassword }))._id),
    String(user._id),
  );
  await assert.rejects(
    changePassword(user._id, { currentPassword: 'wrong', newPassword: 'changed password 123' }),
  );
  const token2 = await createSession(user);
  // Exercise the authenticated HTTP change-password endpoint and cookie removal.
  const server = app.listen(0, '127.0.0.1');
  await new Promise((resolve) => server.once('listening', resolve));
  try {
    const response = await fetch(
      `http://127.0.0.1:${server.address().port}/api/auth/change-password`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Playroom': '1',
          Cookie: `playroom_session=${token2}`,
        },
        body: JSON.stringify({
          currentPassword: payload.newPassword,
          newPassword: 'changed password 123',
        }),
      },
    );
    assert.equal(response.status, 200);
    assert.match(response.headers.get('set-cookie'), /Expires=/);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
  assert.equal(await resolveSession(token2), null);
  await assert.rejects(login({ username, password: payload.newPassword }));
  assert.ok(await login({ username, password: 'changed password 123' }));
});
