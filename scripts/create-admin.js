import 'dotenv/config';
import mongoose from 'mongoose';
import { connectDatabase } from '../src/config/database.js';
import User from '../src/models/User.js';
import AdminAudit from '../src/models/AdminAudit.js';
import PasswordReset from '../src/models/PasswordReset.js';
import { credentials, hashPassword } from '../src/services/authService.js';
import { revokeAll } from '../src/services/passwordService.js';

// Run only from a trusted terminal. Never expose bootstrap through HTTP.
try {
  const { username, password } = credentials({
    username: process.argv[2] || 'admin',
    password: process.env.ADMIN_BOOTSTRAP_PASSWORD,
  });
  delete process.env.ADMIN_BOOTSTRAP_PASSWORD;
  await connectDatabase();
  const existing = await User.findOne({ username });
  const passwordHash = await hashPassword(password);
  const user = existing || new User({ username, name: 'Quản trị viên', avatar: 9 });
  user.role = 'superadmin';
  user.blocked = false;
  user.passwordHash = passwordHash;
  await user.save();
  await revokeAll(user._id);
  await PasswordReset.deleteMany({ userId: user._id });
  await AdminAudit.create({
    actorId: user._id,
    actor: username,
    action: 'admin.bootstrap',
    target: username,
    reason: 'Khởi tạo quản trị từ terminal được cấp quyền.',
    before: {},
    after: { role: 'superadmin' },
    status: 'applied',
  });
  console.log(`Đã cấu hình quản trị @${username}. Mật khẩu được băm; các phiên cũ đã thu hồi.`);
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
} finally {
  await mongoose.disconnect();
}
