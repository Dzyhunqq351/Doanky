import { readHub, readLeaderboard } from '../services/hubService.js';
import { saveResult } from '../services/localResultService.js';
export async function overview(req, res) {
  const game = ['flappy', 'pikachu', 'tetris'].includes(req.query.game) ? req.query.game : 'flappy';
  res.json(await readHub(String(req.user._id), game));
}
export async function result(req, res) {
  await saveResult(req.user, req.body || {});
  res.json({ ok: true });
}
export async function leaderboard(req, res) {
  const game = ['flappy', 'pikachu', 'tetris'].includes(req.query.game) ? req.query.game : 'flappy';
  res.json(await readLeaderboard(String(req.user._id), game));
}
