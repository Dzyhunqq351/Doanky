import mongoose from 'mongoose';
const schema = new mongoose.Schema({
  tokenHash: { type: String, unique: true, required: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  expiresAt: { type: Date, required: true, expires: 0 },
});
schema.index({ userId: 1 });
export default mongoose.model('Session', schema);
