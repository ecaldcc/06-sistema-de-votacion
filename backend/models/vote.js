// models/Vote.js
import mongoose from 'mongoose';

const voteSchema = new mongoose.Schema({
  campaignId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Campaign',
    required: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  candidateId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true
  },
  votedAt: {
    type: Date,
    default: Date.now
  },
  ipAddress: String,
  userAgent: String
});

// Índice compuesto para evitar votos duplicados por usuario en la misma campaña
voteSchema.index({ campaignId: 1, userId: 1 }, { unique: true });

export default mongoose.model('Vote', voteSchema);

