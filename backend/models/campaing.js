// models/Campaign.js
import mongoose from 'mongoose';

const candidateSchema = new mongoose.Schema({
  nombre: {
    type: String,
    required: true
  },
  foto: String,
  propuestas: String,
  votos: {
    type: Number,
    default: 0
  }
});

const campaignSchema = new mongoose.Schema({
  titulo: {
    type: String,
    required: true,
    trim: true
  },
  descripcion: {
    type: String,
    required: true
  },
  votosDisponibles: {
    type: Number,
    required: true,
    default: 1,
    min: 1
  },
  estado: {
    type: String,
    enum: ['habilitada', 'deshabilitada', 'finalizada'],
    default: 'deshabilitada'
  },
  fechaInicio: {
    type: Date,
    required: true
  },
  fechaFin: {
    type: Date,
    required: true
  },
  candidatos: [candidateSchema],
  totalVotos: {
    type: Number,
    default: 0
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Actualizar updatedAt antes de guardar
campaignSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

export default mongoose.model('Campaign', campaignSchema);
