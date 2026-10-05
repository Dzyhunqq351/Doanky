import { Router } from 'express';
import { rateLimit } from 'express-rate-limit';
import * as controller from '../controllers/authController.js';
import { requireUser } from '../middleware/auth.js';
const router = Router();
const limit = rateLimit({
  windowMs: 15 * 60000,
  limit: 30,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { message: 'Bạn thử quá nhiều lần. Vui lòng chờ 15 phút.' },
});
router.post('/register', limit, controller.register);
router.post('/login', limit, controller.login);
router.post('/forgot-password', limit, controller.forgotPassword);
router.post('/reset-password', limit, controller.resetPassword);
router.post('/change-password', requireUser, limit, controller.changePassword);
router.patch('/email', requireUser, limit, controller.email);
router.post('/logout', controller.logout);
router.get('/me', requireUser, controller.me);
router.patch('/profile', requireUser, controller.profile);
export default router;
