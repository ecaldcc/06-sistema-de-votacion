import express from 'express';
import Campaign from '../models/campaing.js';
import { authMiddleware, voterMiddleware } from '../middleware/auth-jwt.js';
import Vote from '../models/vote.js';

const router = express.Router();
// Obtener todas las campañas (para votantes)
router.get('/', authMiddleware, voterMiddleware, async (req, res) => {
  try {
    const campaigns = await Campaign.find()
      .select('-createdBy')
      .sort({ createdAt: -1 });

    // Verificar si las campañas deben actualizarse a finalizadas
    const now = new Date();
    for (let campaign of campaigns) {
      if (campaign.estado === 'habilitada' && campaign.fechaFin < now) {
        campaign.estado = 'finalizada';
        await campaign.save();
      }
    }

    res.json({
      success: true,
      campaigns
    });
  } catch (error) {
    console.error('Error al obtener campañas:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener campañas.',
      error: error.message
    });
  }
});

// Obtener una campaña específica
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const campaign = await Campaign.findById(req.params.id);

    if (!campaign) {
      return res.status(404).json({
        success: false,
        message: 'Campaña no encontrada.'
      });
    }

    // Verificar si debe finalizarse
    const now = new Date();
    if (campaign.estado === 'habilitada' && campaign.fechaFin < now) {
      campaign.estado = 'finalizada';
      await campaign.save();
    }

    res.json({
      success: true,
      campaign
    });
  } catch (error) {
    console.error('Error al obtener campaña:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener campaña.',
      error: error.message
    });
  }
});

// Verificar si el usuario ya votó en una campaña
router.get('/:id/voted', authMiddleware, voterMiddleware, async (req, res) => {
  try {
    const campaign = await Campaign.findById(req.params.id);

    if (!campaign) {
      return res.status(404).json({
        success: false,
        message: 'Campaña no encontrada.'
      });
    }

    // Buscar si el usuario ya votó
    const existingVote = await Vote.findOne({
      campaignId: req.params.id,
      userId: req.userId
    });

    res.json({
      success: true,
      hasVoted: !!existingVote,
      votedAt: existingVote?.votedAt
    });
  } catch (error) {
    console.error('Error al verificar voto:', error);
    res.status(500).json({
      success: false,
      message: 'Error al verificar voto.',
      error: error.message
    });
  }
});

export default router;