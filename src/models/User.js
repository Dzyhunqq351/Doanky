import mongoose from 'mongoose';
const schema = new mongoose.Schema(
  {
    username: { type: String, unique: true, required: true },
    email: { type: String, trim: true, lowercase: true },
    name: { type: String, required: true },
    avatar: { type: Number, default: 0 },
    passwordHash: { type: String, required: true, select: false },
  },
  { timestamps: true },
);
schema.index(
  { email: 1 },
  { unique: true, partialFilterExpression: { email: { $type: 'string' } } },
);
export default mongoose.model('User', schema);
