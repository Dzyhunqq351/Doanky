import User from '../models/User.js';
import * as auth from '../services/authService.js';
import { COOKIE, cookieToken } from '../middleware/auth.js';
import * as passwords from '../services/passwordService.js';
const cookieOptions = () => ({
  httpOnly: true,
  sameSite: 'strict',
  secure: process.env.NODE_ENV === 'production',
  path: '/',
});
async function establish(req, res, user) {
  await auth.revokeSession(cookieToken(req));
  res.cookie(COOKIE, await auth.createSession(user), {
    ...cookieOptions(),
    maxAge: auth.SESSION_MS,
  });
  res.json({ user: auth.publicUser(user) });
}
export const register = async (req, res) => establish(req, res, await auth.register(req.body));
export const login = async (req, res) => establish(req, res, await auth.login(req.body));
export const me = (req, res) => res.json({ user: auth.publicUser(req.user) });
export async function logout(req, res) {
  await auth.revokeSession(cookieToken(req));
  res.clearCookie(COOKIE, cookieOptions());
  res.json({ ok: true });
}
export async function profile(req, res) {
  const user = await User.findByIdAndUpdate(req.user._id, auth.profileInput(req.body), {
    new: true,
  });
  res.json({ user: auth.publicUser(user) });
}
export async function changePassword(req, res) {
  await passwords.changePassword(req.user._id, req.body || {});
  res.clearCookie(COOKIE, cookieOptions());
  res.json({ ok: true });
}
export async function email(req, res) {
  res.json({ user: auth.publicUser(await passwords.updateEmail(req.user._id, req.body || {})) });
}
export async function forgotPassword(req, res) {
  await passwords.requestReset(req.body || {});
  res.json({
    message:
      'Nếu email và tên đăng nhập khớp, mã xác minh sẽ được gửi. Kiểm tra cả thư rác; chờ 60 giây trước khi gửi lại.',
  });
}
export async function resetPassword(req, res) {
  await passwords.resetPassword(req.body || {});
  res.json({ ok: true });
}
