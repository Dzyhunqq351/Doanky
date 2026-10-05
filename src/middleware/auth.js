import { authError, resolveSession } from '../services/authService.js';
import { connectDatabase } from '../config/database.js';
export const COOKIE = process.env.AUTH_COOKIE || 'playroom_session';
export function cookieToken(req) {
  return (req.headers.cookie || '')
    .split(';')
    .map((v) => v.trim())
    .find((v) => v.startsWith(`${COOKIE}=`))
    ?.slice(COOKIE.length + 1);
}
export async function requireDatabase(_req, _res, next) {
  try {
    await connectDatabase();
    next();
  } catch (error) {
    console.error('MongoDB connection failed:', error.message);
    next(authError('Cơ sở dữ liệu chưa kết nối. Vui lòng thử lại sau.', 503));
  }
}
export function sameOrigin(req, _res, next) {
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return next();
  const origin = req.headers.origin;
  const expected = process.env.APP_ORIGIN || `${req.protocol}://${req.get('host')}`;
  if (req.headers['x-playroom'] !== '1' || (origin && origin !== expected))
    return next(authError('Yêu cầu không hợp lệ.', 403));
  next();
}
export async function requireUser(req, _res, next) {
  try {
    req.user = await resolveSession(cookieToken(req));
    if (!req.user) throw authError('Vui lòng đăng nhập để tiếp tục.', 401);
    next();
  } catch (error) {
    next(error);
  }
}
