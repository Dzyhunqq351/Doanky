import test from 'node:test';
import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import { SignJWT, decodeJwt } from 'jose';
import { jwtKey, signSession, verifySession } from '../src/services/tokenService.js';

process.env.JWT_SECRET = randomBytes(32).toString('hex');
const subject = '1234567890abcdef12345678';

test('JWT verifies identity, unique session ID and fixed seven-day lifetime', async () => {
  const a = await signSession(subject),
    b = await signSession(subject);
  const claims = await verifySession(a);
  assert.equal(claims.sub, subject);
  assert.equal(claims.exp - claims.iat, 7 * 86400);
  assert.notEqual(claims.jti, decodeJwt(b).jti);
  assert.equal(claims.iss, 'playroom');
  assert.equal(claims.aud, 'playroom-web');
});

test('JWT rejects forgery, expiry, wrong issuer/audience/algorithm and missing claims', async () => {
  const now = Math.floor(Date.now() / 1000);
  const claims = {
    sub: subject,
    jti: 'test',
    iss: 'playroom',
    aud: 'playroom-web',
    iat: now,
    exp: now + 60,
  };
  for (const change of [
    { exp: now - 1 },
    { iss: 'other' },
    { aud: 'other' },
    { sub: 'bad-id' },
    { jti: undefined },
    { exp: undefined },
    { iat: now + 60 },
  ]) {
    const token = await new SignJWT({ ...claims, ...change })
      .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
      .sign(jwtKey());
    assert.equal(await verifySession(token), null);
  }
  const wrongKey = await new SignJWT(claims)
    .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
    .sign(randomBytes(32));
  const wrongAlgorithm = await new SignJWT(claims)
    .setProtectedHeader({ alg: 'HS384', typ: 'JWT' })
    .sign(jwtKey());
  for (const token of [
    wrongKey,
    wrongAlgorithm,
    undefined,
    '',
    'invalid',
    'a'.repeat(2049),
    'eyJhbGciOiJub25lIn0.e30.',
  ])
    assert.equal(await verifySession(token), null);
});

test('JWT fails closed without a sufficiently long configured secret', () => {
  const saved = process.env.JWT_SECRET;
  try {
    for (const value of ['', 'secret', 'ab'.repeat(31)]) {
      process.env.JWT_SECRET = value;
      assert.throws(jwtKey, /JWT_SECRET/);
    }
  } finally {
    process.env.JWT_SECRET = saved;
  }
});
