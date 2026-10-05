import mongoose from 'mongoose';
import { randomBytes } from 'node:crypto';
import app from '../src/app.js';
import { register } from '../src/services/authService.js';
import User from '../src/models/User.js';
import Match from '../src/models/Match.js';
import Session from '../src/models/Session.js';
process.env.JWT_SECRET = randomBytes(32).toString('hex');
await mongoose.connect('mongodb://127.0.0.1:27017/playroom_ui_test');
const username = `qa_${randomBytes(4).toString('hex')}`;
const user = await register({ username, name: 'Người chơi thử', password: 'PreviewOnly123!', email: `${username}@example.com` });
await Match.create({ matchId: username, accountId: user._id, game: 'flappy', mode: 'local', endedAt: new Date(), results: [
  { playerId: String(user._id), name: user.name, avatar: 0, score: 45, rank: 1, elapsed: 85000 },
  { playerId: 'local-2', name: 'Người chơi 2', avatar: 2, score: 31, rank: 2, elapsed: 64000 },
] });
const server = app.listen(3001, '127.0.0.1', () => console.log(`Preview user: ${username}`));
async function cleanup() {
  await Session.deleteMany({ userId: user._id });
  await Match.deleteMany({ accountId: user._id });
  await User.deleteOne({ _id: user._id, username });
  server.close();
  await mongoose.disconnect();
  process.exit(0);
}
process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);
process.stdin.resume();
process.stdin.on('data', cleanup);
