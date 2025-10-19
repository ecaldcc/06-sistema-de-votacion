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

// indice para evitar votos duplicados de un usuario en la misma campaña, solo deja votar una vez por campaña
voteSchema.index({ campaignId: 1, userId: 1 }, { unique: true });

export default mongoose.model('Vote', voteSchema);

