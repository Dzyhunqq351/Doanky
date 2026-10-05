import { randomInt, createHmac } from 'node:crypto';
import User from '../models/User.js';
import Session from '../models/Session.js';
import PasswordReset from '../models/PasswordReset.js';
import { authError, checkPassword, hashPassword, authEvents } from './authService.js';
import { jwtKey } from './tokenService.js';
import { sendResetCode, mailConfigured } from './mailService.js';
export function normalizeEmail(value) {
  const email = typeof value === 'string' ? value.trim().toLowerCase() : '';
  if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
    throw authError('Email không hợp lệ.');
  return email;
}
export function validatePassword(value) {
  if (typeof value !== 'string' || value.length < 8 || value.length > 128)
    throw authError('Mật khẩu cần từ 8 đến 128 ký tự.');
  return value;
}
const hashCode = (id, code) => createHmac('sha256', jwtKey()).update(`${id}:${code}`).digest('hex');
async function revokeAll(userId) {
  const sessions = await Session.find({ userId }).lean();
  await Session.deleteMany({ userId });
  sessions.forEach((s) => authEvents.emit('revoked', s.tokenHash));
}
export async function changePassword(userId, input) {
  const password = validatePassword(input.newPassword);
  const user = await User.findById(userId).select('+passwordHash');
  if (
    !user ||
    typeof input.currentPassword !== 'string' ||
    input.currentPassword.length > 128 ||
    !(await checkPassword(input.currentPassword, user.passwordHash))
  )
    throw authError('Mật khẩu hiện tại không đúng.');
  const changed = await User.updateOne(
    { _id: userId, passwordHash: user.passwordHash },
    { $set: { passwordHash: await hashPassword(password) } },
  );
  if (!changed.modifiedCount) throw authError('Tài khoản vừa thay đổi. Vui lòng thử lại.', 409);
  await PasswordReset.deleteMany({ userId });
  await revokeAll(userId);
}
export async function updateEmail(userId, input) {
  const email = normalizeEmail(input.email);
  const user = await User.findById(userId).select('+passwordHash');
  if (
    !user ||
    typeof input.currentPassword !== 'string' ||
    input.currentPassword.length > 128 ||
    !(await checkPassword(input.currentPassword, user.passwordHash))
  )
    throw authError('Mật khẩu hiện tại không đúng.');
  try {
    user.email = email;
    await user.save();
    await PasswordReset.deleteMany({ userId });
    return user;
  } catch (error) {
    if (error.code === 11000) throw authError('Email đã được liên kết với tài khoản khác.', 409);
    throw error;
  }
}
export async function requestReset(input, deliver = sendResetCode) {
  const email = normalizeEmail(input.email);
  const username = typeof input.username === 'string' ? input.username.trim().toLowerCase() : '';
  if (!/^[a-z0-9_]{3,24}$/.test(username)) throw authError('Tên đăng nhập không hợp lệ.');
  if (deliver === sendResetCode && !mailConfigured())
    throw authError('Dịch vụ email chưa được cấu hình. Vui lòng thử lại sau.', 503);
  const user = await User.findOne({ username, email });
  if (!user) return;
  const now = new Date();
  const code = String(randomInt(0, 1000000)).padStart(6, '0');
  let reset;
  try {
    reset = await PasswordReset.findOneAndUpdate(
      { userId: user._id, sentAt: { $lte: new Date(+now - 60000) } },
      {
        $set: {
          codeHash: hashCode(user._id, code),
          attempts: 0,
          sentAt: now,
          expiresAt: new Date(+now + 600000),
        },
      },
      { upsert: true, new: true },
    );
  } catch (error) {
    if (error.code === 11000) return;
    throw error;
  }
  try {
    await deliver(email, code);
  } catch {
    await PasswordReset.deleteOne({ _id: reset._id, codeHash: reset.codeHash });
    throw authError('Không gửi được email. Vui lòng thử lại sau.', 503);
  }
}
export async function resetPassword(input) {
  const email = normalizeEmail(input.email);
  const password = validatePassword(input.newPassword);
  const username = typeof input.username === 'string' ? input.username.trim().toLowerCase() : '';
  if (typeof input.code !== 'string' || !/^\d{6}$/.test(input.code))
    throw authError('Nhập mã xác minh gồm 6 chữ số.');
  const user = await User.findOne({ username, email }).select('+passwordHash');
  const invalid = () => authError('Mã không đúng, đã hết hạn hoặc đã dùng hết số lần thử.');
  if (!user) throw invalid();
  const reset = await PasswordReset.findOneAndUpdate(
    { userId: user._id, expiresAt: { $gt: new Date() }, attempts: { $lt: 5 } },
    { $inc: { attempts: 1 } },
    { new: true },
  );
  if (!reset || reset.codeHash !== hashCode(user._id, input.code)) throw invalid();
  const consumed = await PasswordReset.deleteOne({
    _id: reset._id,
    codeHash: reset.codeHash,
    expiresAt: { $gt: new Date() },
  });
  if (!consumed.deletedCount) throw invalid();
  const changed = await User.updateOne(
    { _id: user._id, passwordHash: user.passwordHash, email },
    { $set: { passwordHash: await hashPassword(password) } },
  );
  if (!changed.modifiedCount) throw invalid();
  await revokeAll(user._id);
}
