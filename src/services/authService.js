import { randomBytes, createHash, scrypt as derive, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';
import User from '../models/User.js';
import Session from '../models/Session.js';
import { EventEmitter } from 'node:events';
import { signSession, verifySession, SESSION_MS } from './tokenService.js';
export { SESSION_MS } from './tokenService.js';
export const authEvents = new EventEmitter();
const scrypt = promisify(derive);
export function authError(message, status = 400) {
  return Object.assign(new Error(message), { status });
}
export function publicUser(user) {
  return {
    id: String(user._id),
    username: user.username,
    name: user.name,
    avatar: user.avatar,
    email: user.email || '',
  };
}
export function credentials(input) {
  input = input && typeof input === 'object' ? input : {};
  const username = typeof input.username === 'string' ? input.username.trim().toLowerCase() : '';
  if (!/^[a-z0-9_]{3,24}$/.test(username))
    throw authError('Tên đăng nhập gồm 3–24 chữ cái, số hoặc dấu gạch dưới.');
  if (
    typeof input.password !== 'string' ||
    input.password.length < 8 ||
    input.password.length > 128
  )
    throw authError('Mật khẩu cần từ 8 đến 128 ký tự.');
  return { username, password: input.password };
}
export function profileInput(input) {
  input = input && typeof input === 'object' ? input : {};
  const name = typeof input.name === 'string' ? input.name.trim() : '';
  if (!name || name.length > 24 || /[\x00-\x1f]/.test(name))
    throw authError('Tên nhân vật cần từ 1 đến 24 ký tự.');
  const avatar = input.avatar ?? 0;
  if (!Number.isInteger(avatar) || avatar < 0 || avatar > 11)
    throw authError('Avatar không hợp lệ.');
  return { name, avatar };
}
export async function hashPassword(password) {
  const salt = randomBytes(16).toString('hex');
  const hash = await scrypt(password, salt, 64);
  return `${salt}:${hash.toString('hex')}`;
}
export async function checkPassword(password, value) {
  const [salt, encoded] = value.split(':');
  const hash = await scrypt(password, salt, 64);
  const expected = Buffer.from(encoded, 'hex');
  return expected.length === hash.length && timingSafeEqual(hash, expected);
}
const digest = (token) => createHash('sha256').update(token).digest('hex');
export async function createSession(user) {
  const token = await signSession(user._id);
  await Session.create({
    tokenHash: digest(token),
    userId: user._id,
    expiresAt: new Date(Date.now() + SESSION_MS),
  });
  return token;
}
export async function register(input) {
  const { username, password } = credentials(input);
  const email = typeof input.email === 'string' ? input.email.trim().toLowerCase() : '';
  if (email && (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)))
    throw authError('Email không hợp lệ.');
  const profile = profileInput({ name: input.name || username, avatar: randomBytes(1)[0] % 12 });
  try {
    return await User.create({
      username,
      ...profile,
      ...(email ? { email } : {}),
      passwordHash: await hashPassword(password),
    });
  } catch (error) {
    if (error.code === 11000) throw authError('Tên đăng nhập hoặc email đã được sử dụng.', 409);
    throw error;
  }
}
export async function login(input) {
  const { username, password } = credentials(input);
  const user = await User.findOne({ username }).select('+passwordHash');
  // Use a valid dummy hash to keep unknown-user password checks on the same code path.
  const valid = await checkPassword(
    password,
    user?.passwordHash || `${'0'.repeat(32)}:${'0'.repeat(128)}`,
  );
  if (!user || !valid) throw authError('Tên đăng nhập hoặc mật khẩu không đúng.', 401);
  return user;
}
export async function resolveSession(token) {
  return (await resolveLogin(token))?.user || null;
}
export async function resolveLogin(token) {
  const claims = await verifySession(token);
  if (!claims) return null;
  const session = await Session.findOne({
    tokenHash: digest(token),
    userId: claims.sub,
    expiresAt: { $gt: new Date() },
  });
  if (!session) return null;
  const user = await User.findById(session.userId);
  return user
    ? {
        user,
        tokenHash: session.tokenHash,
        expiresAt: Math.min(+session.expiresAt, claims.exp * 1000),
      }
    : null;
}
export async function revokeSession(token) {
  if (token) {
    const tokenHash = digest(token);
    await Session.deleteOne({ tokenHash });
    authEvents.emit('revoked', tokenHash);
  }
}
