import { Router } from 'express';
import mongoose from 'mongoose';
import { rateLimit } from 'express-rate-limit';
import auth from './auth.js';
import { sameOrigin, requireUser, requireDatabase } from '../middleware/auth.js';
import { connectDatabase } from '../config/database.js';
import { leaderboard, overview, result } from '../controllers/hubController.js';
const router = Router();
router.get('/health', async (_req, res) => {
  try {
    await connectDatabase();
    res.json({
      status: 'ok',
      database: 'connected',
      databaseName: mongoose.connection.name,
      mode: 'online-and-local',
      authentication: true,
    });
  } catch {
    res.status(503).json({
      status: 'degraded',
      database: 'disconnected',
      mode: 'online-and-local',
      authentication: true,
    });
  }
});
router.use(sameOrigin, requireDatabase);
router.use('/auth', auth);
router.use(requireUser);
router.use(
  rateLimit({
    windowMs: 60000,
    limit: 120,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    message: { message: 'Thao tác quá nhanh. Vui lòng thử lại.' },
  }),
);
router.get('/hub', overview);
router.get('/leaderboard', leaderboard);
router.post('/matches', result);
export default router;
