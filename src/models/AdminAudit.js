import mongoose from 'mongoose';
const schema = new mongoose.Schema(
  {
    actorId: { type: mongoose.Schema.Types.ObjectId, required: true },
    actor: String,
    action: String,
    target: String,
    reason: String,
    before: mongoose.Schema.Types.Mixed,
    after: mongoose.Schema.Types.Mixed,
    status: { type: String, enum: ['pending', 'applied', 'failed'], default: 'pending' },
  },
  { timestamps: true },
);
schema.index({ createdAt: -1 });
export default mongoose.model('AdminAudit', schema);
