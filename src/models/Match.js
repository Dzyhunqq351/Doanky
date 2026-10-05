import mongoose from 'mongoose';
const result = new mongoose.Schema(
  {
    playerId: String,
    name: String,
    avatar: Number,
    score: Number,
    elapsed: Number,
    rank: Number,
    completed: Boolean,
    forfeited: Boolean,
  },
  { _id: false },
);
const schema = new mongoose.Schema(
  {
    matchId: { type: String, unique: true, required: true },
    accountId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    game: { type: String, enum: ['flappy', 'pikachu', 'tetris'], required: true },
    mode: { type: String, enum: ['single', 'local', 'bot', 'online'], required: true },
    endedAt: { type: Date, required: true },
    ranking: { type: String, enum: ['score', 'time'], default: 'score' },
    results: [result],
  },
  { timestamps: true },
);
schema.index({ accountId: 1, endedAt: -1 });
schema.index({ game: 1, endedAt: -1 });
export default mongoose.model('Match', schema);
