import { randomUUID } from 'node:crypto';
import { SignJWT, jwtVerify } from 'jose';

export const SESSION_MS = 7 * 86400000;
const issuer = 'playroom';
const audience = 'playroom-web';

export function jwtKey() {
  const secret = process.env.JWT_SECRET;
  if (!secret || !/^[a-f0-9]{64,}$/i.test(secret) || secret.length % 2)
    throw new Error('JWT_SECRET cần ít nhất 32 byte ngẫu nhiên dạng hex. Chạy npm run auth:setup.');
  return Buffer.from(secret, 'hex');
}

export async function signSession(userId) {
  const now = Math.floor(Date.now() / 1000);
  return new SignJWT({})
    .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
    .setSubject(String(userId))
    .setJti(randomUUID())
    .setIssuer(issuer)
    .setAudience(audience)
    .setIssuedAt(now)
    .setExpirationTime(now + SESSION_MS / 1000)
    .sign(jwtKey());
}

export async function verifySession(token) {
  if (typeof token !== 'string' || token.length > 2048) return null;
  const key = jwtKey();
  try {
    const { payload } = await jwtVerify(token, key, {
      algorithms: ['HS256'],
      issuer,
      audience,
      typ: 'JWT',
      requiredClaims: ['sub', 'jti', 'iat', 'exp'],
      maxTokenAge: '7d',
    });
    if (!/^[a-f0-9]{24}$/.test(payload.sub) || typeof payload.jti !== 'string') return null;
    return payload;
  } catch {
    return null;
  }
}
