import { Router } from 'express';
import mongoose from 'mongoose';
import User from '../models/User.js';
import Match from '../models/Match.js';
import GameSetting from '../models/GameSetting.js';
import AdminAudit from '../models/AdminAudit.js';
import PasswordReset from '../models/PasswordReset.js';
import {
  authError,
  publicUser,
  profileInput,
  hashPassword,
  register,
} from '../services/authService.js';
import { normalizeEmail, validatePassword, revokeAll } from '../services/passwordService.js';
import { readGames, gameIds, modeIds, defaultGame } from '../services/gameSettingsService.js';

const router = Router();
router.use((req, _res, next) =>
  req.user.role === 'superadmin' ? next() : next(authError('Bạn không có quyền quản trị.', 403)),
);
const id = (value) => {
  if (typeof value !== 'string' || !/^[a-f0-9]{24}$/i.test(value))
    throw authError('Mã dữ liệu không hợp lệ.');
  return value;
};
const pageOf = (req) => Math.max(1, Math.min(10000, Number.parseInt(req.query.page, 10) || 1));
const text = (value, limit, label) => {
  if (typeof value !== 'string' || !value.trim() || value.trim().length > limit)
    throw authError(`${label} cần từ 1 đến ${limit} ký tự.`);
  return value.trim();
};
const view = (user) => ({
  ...publicUser(user),
  blocked: !!user.blocked,
  createdAt: user.createdAt,
  updatedAt: user.updatedAt,
});
async function audited(req, action, target, before, after, mutate) {
  const reason = text(req.body.reason, 240, 'Lý do');
  const entry = await AdminAudit.create({
    actorId: req.user._id,
    actor: req.user.username,
    action,
    target,
    before,
    after,
    reason,
  });
  try {
    const value = await mutate();
    await AdminAudit.updateOne({ _id: entry._id }, { $set: { status: 'applied' } });
    return value;
  } catch (error) {
    await AdminAudit.updateOne({ _id: entry._id }, { $set: { status: 'failed' } });
    if (error.code === 11000) throw authError('Email đã được tài khoản khác sử dụng.', 409);
    throw error;
  }
}
router.get('/overview', async (_req, res) => {
  const [users, blocked, matches, hidden, games, recent] = await Promise.all([
    User.countDocuments(),
    User.countDocuments({ blocked: true }),
    Match.countDocuments(),
    Match.countDocuments({ hidden: true }),
    Match.aggregate([
      { $match: { hidden: { $ne: true } } },
      { $group: { _id: '$game', plays: { $sum: 1 } } },
    ]),
    AdminAudit.find().sort({ createdAt: -1 }).limit(6).select('-before -after').lean(),
  ]);
  res.json({
    users,
    blocked,
    matches,
    hidden,
    games,
    recent,
    database: mongoose.connection.readyState === 1,
  });
});
router.get('/users', async (req, res) => {
  const page = pageOf(req),
    query = {};
  const search = String(req.query.search || '')
    .trim()
    .slice(0, 64);
  if (search) {
    const pattern = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    query.$or = ['username', 'name', 'email'].map((key) => ({
      [key]: { $regex: pattern, $options: 'i' },
    }));
  }
  if (req.query.status === 'blocked') query.blocked = true;
  if (req.query.status === 'active') query.blocked = { $ne: true };
  const [rows, total] = await Promise.all([
    User.find(query)
      .sort({ createdAt: -1, _id: -1 })
      .skip((page - 1) * 20)
      .limit(20)
      .lean(),
    User.countDocuments(query),
  ]);
  res.json({ rows: rows.map(view), total, page });
});
router.patch('/users/:id', async (req, res) => {
  const user = await User.findById(id(req.params.id));
  if (!user) throw authError('Không tìm thấy tài khoản.', 404);
  // Admin accounts are maintained via their own profile and the bootstrap CLI.
  if (user.role === 'superadmin')
    throw authError('Tài khoản quản trị được bảo vệ. Đổi thông tin của bạn trong Hồ sơ.', 403);
  const profile = profileInput(req.body);
  const email = req.body.email ? normalizeEmail(req.body.email) : '';
  if (typeof req.body.blocked !== 'boolean') throw authError('Trạng thái tài khoản không hợp lệ.');
  if (req.body.version !== user.updatedAt.toISOString())
    throw authError('Dữ liệu vừa thay đổi. Tải lại trước khi sửa.', 409);
  const patch = { ...profile, blocked: req.body.blocked, ...(email ? { email } : {}) };
  const changed = await audited(
    req,
    'user.update',
    user.username,
    view(user),
    { ...patch, email },
    async () => {
      const result = await User.findOneAndUpdate(
        { _id: user._id, updatedAt: user.updatedAt },
        { $set: patch, ...(!email ? { $unset: { email: 1 } } : {}) },
        { new: true, runValidators: true },
      );
      if (!result) throw authError('Dữ liệu vừa thay đổi. Tải lại trước khi sửa.', 409);
      await PasswordReset.deleteMany({ userId: user._id });
      await revokeAll(user._id);
      return result;
    },
  );
  res.json({ user: view(changed) });
});
router.post('/users', async (req, res) => {
  const user = await audited(
    req,
    'user.create',
    String(req.body.username || '').slice(0, 24),
    {},
    { role: 'user' },
    () => register(req.body),
  );
  res.status(201).json({ user: view(user) });
});
router.post('/users/:id/password', async (req, res) => {
  const password = validatePassword(req.body.password);
  const user = await User.findById(id(req.params.id));
  if (!user) throw authError('Không tìm thấy tài khoản.', 404);
  if (user.role === 'superadmin')
    throw authError('Dùng chức năng đổi mật khẩu trong Hồ sơ cho tài khoản quản trị.', 403);
  const passwordHash = await hashPassword(password);
  await audited(req, 'user.password', user.username, {}, { sessionsRevoked: true }, async () => {
    await User.updateOne({ _id: user._id }, { $set: { passwordHash } });
    await PasswordReset.deleteMany({ userId: user._id });
    await revokeAll(user._id);
  });
  res.json({ ok: true });
});
router.get('/games', async (_req, res) => res.json({ rows: await readGames() }));
router.patch('/games/:game', async (req, res) => {
  const game = req.params.game;
  if (!gameIds.includes(game)) throw authError('Game không hợp lệ.');
  if (
    typeof req.body.enabled !== 'boolean' ||
    !Array.isArray(req.body.modes) ||
    req.body.modes.some((m) => !modeIds.includes(m) || (game === 'pikachu' && m === 'bot'))
  )
    throw authError('Cấu hình game không hợp lệ.');
  const modes = [...new Set(req.body.modes)];
  if (req.body.enabled && !modes.length) throw authError('Game mở cần ít nhất một chế độ chơi.');
  const description = typeof req.body.description === 'string' ? req.body.description.trim() : '';
  if (description.length > 240) throw authError('Mô tả tối đa 240 ký tự.');
  const patch = {
    enabled: req.body.enabled,
    modes,
    description,
    maintenanceMessage: text(req.body.maintenanceMessage, 160, 'Thông báo bảo trì'),
  };
  const before = (await GameSetting.findOne({ game }).lean()) || defaultGame(game);
  if ((req.body.version || null) !== (before.updatedAt?.toISOString() || null))
    throw authError('Cấu hình vừa thay đổi. Tải lại trước khi sửa.', 409);
  const row = await audited(req, 'game.update', game, before, patch, async () => {
    if (!before._id) return GameSetting.create({ game, ...patch });
    const changed = await GameSetting.findOneAndUpdate(
      { game, updatedAt: before.updatedAt },
      { $set: patch },
      { new: true },
    );
    if (!changed) throw authError('Cấu hình vừa thay đổi. Tải lại trước khi sửa.', 409);
    return changed;
  });
  res.json({ game: row });
});
router.get('/matches', async (req, res) => {
  const query = {},
    page = pageOf(req);
  if (gameIds.includes(req.query.game)) query.game = req.query.game;
  if (modeIds.includes(req.query.mode)) query.mode = req.query.mode;
  if (req.query.status === 'hidden') query.hidden = true;
  if (req.query.status === 'visible') query.hidden = { $ne: true };
  if (req.query.userId) query.accountId = id(req.query.userId);
  const [rows, total] = await Promise.all([
    Match.find(query)
      .sort({ endedAt: -1, _id: -1 })
      .skip((page - 1) * 20)
      .limit(20)
      .lean(),
    Match.countDocuments(query),
  ]);
  res.json({ rows, total, page });
});
router.patch('/matches/:id', async (req, res) => {
  if (typeof req.body.hidden !== 'boolean') throw authError('Trạng thái kết quả không hợp lệ.');
  const match = await Match.findById(id(req.params.id)).lean();
  if (!match) throw authError('Không tìm thấy lượt chơi.', 404);
  await audited(
    req,
    'match.moderate',
    match.matchId,
    { hidden: !!match.hidden },
    { hidden: req.body.hidden },
    () => Match.updateOne({ _id: match._id }, { $set: { hidden: req.body.hidden } }),
  );
  res.json({ ok: true });
});
router.get('/audit', async (req, res) => {
  const page = pageOf(req);
  const [rows, total] = await Promise.all([
    AdminAudit.find()
      .sort({ createdAt: -1, _id: -1 })
      .skip((page - 1) * 20)
      .limit(20)
      .lean(),
    AdminAudit.countDocuments(),
  ]);
  res.json({ rows, total, page });
});
export default router;
