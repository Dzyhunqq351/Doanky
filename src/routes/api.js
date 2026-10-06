import { Router } from 'express';
import mongoose from 'mongoose';
import { rateLimit } from 'express-rate-limit';
import auth from './auth.js';
import admin from './admin.js';
import { readGames, assertGameAccess } from '../services/gameSettingsService.js';
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
router.use('/admin', admin);
router.get('/games', async (_req, res) => res.json({ games: await readGames() }));
router.post('/games/:game/access', async (req, res) => {
  await assertGameAccess(req.params.game, req.body.mode);
  res.json({ ok: true });
});
router.get('/leaderboard', leaderboard);
router.post('/matches', result);
export default router;
