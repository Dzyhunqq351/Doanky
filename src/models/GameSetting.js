import mongoose from 'mongoose';
const schema = new mongoose.Schema(
  {
    game: { type: String, enum: ['flappy', 'pikachu', 'tetris'], unique: true, required: true },
    enabled: { type: Boolean, default: true },
    description: { type: String, default: '' },
    maintenanceMessage: { type: String, default: 'Game đang bảo trì. Vui lòng quay lại sau.' },
    modes: { type: [String], default: ['single', 'local', 'bot', 'online'] },
  },
  { timestamps: true },
);
export default mongoose.model('GameSetting', schema);
