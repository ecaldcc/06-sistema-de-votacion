import express from 'express';
import Vote from '../models/vote.js';
import Campaign from '../models/campaing.js';
import User from '../models/user.js';
import { authMiddleware, voterMiddleware } from '../middleware/auth-jwt.js';

const router = express.Router();

// Variable para almacenar la funcion de broadcast (se inyectara desde server.js)
let broadcastToCampaign = null;

// Función para inyectar el broadcast desde el servidor principal
export const setBroadcastFunction = (broadcastFn) => {
  broadcastToCampaign = broadcastFn;
};

// Emitir voto
router.post('/', authMiddleware, voterMiddleware, async (req, res) => {
  try {
    const { campaignId, candidateId } = req.body;

    if (!campaignId || !candidateId) {
      return res.status(400).json({
        success: false,
        message: 'Campaña y candidato son requeridos.'
      });
    }

    // Verificar que la campaña existe
    const campaign = await Campaign.findById(campaignId);
    if (!campaign) {
      return res.status(404).json({
        success: false,
        message: 'Campaña no encontrada.'
      });
    }

    // verificar que la campaña este habilitada
    if (campaign.estado !== 'habilitada') {
      return res.status(400).json({
        success: false,
        message: 'Esta campaña no esta habilitada para votacion.'
      });
    }

    // Verificar que no ha expirado
    const now = new Date();
    if (campaign.fechaFin < now) {
      campaign.estado = 'finalizada';
      await campaign.save();
      return res.status(400).json({
        success: false,
        message: 'El tiempo de votacion ha finalizado.'
      });
    }

    if (campaign.fechaInicio > now) {
      return res.status(400).json({
        success: false,
        message: 'La votacion aun no ha iniciado.'
      });
    }

    // Verificar que el candidato existe en la campaña
    const candidate = campaign.candidatos.id(candidateId);
    if (!candidate) {
      return res.status(404).json({
        success: false,
        message: 'Candidato no encontrado en esta campaña.'
      });
    }

    // Verificar que el usuario no ha votado ya
    const existingVote = await Vote.findOne({
      campaignId,
      userId: req.userId
    });

    if (existingVote) {
      return res.status(400).json({
        success: false,
        message: 'Ya has votado en esta campaña.'
      });
    }

    // Obtener información del usuario
    const user = await User.findById(req.userId).select('nombreCompleto numeroColegiado');

    // Crear el voto
    const vote = new Vote({
      campaignId,
      userId: req.userId,
      candidateId,
      ipAddress: req.ip,
      userAgent: req.get('user-agent')
    });

    await vote.save();

    // Actualizar contadores
    candidate.votos += 1;
    campaign.totalVotos += 1;
    await campaign.save();

    // Actualizar votedCampaigns del usuario
    await User.findByIdAndUpdate(req.userId, {
      $push: {
        votedCampaigns: {
          campaignId,
          votedAt: new Date()
        }
      }
    });

    // WEBSOCKET: Broadcast del nuevo voto a todos los suscritos a esta campaña
    if (broadcastToCampaign) {
      broadcastToCampaign(campaignId.toString(), 'vote_cast', {
        campaignId: campaignId.toString(),
        candidateId: candidateId.toString(),
        voterName: user.nombreCompleto,
        numeroColegiado: user.numeroColegiado,
        candidateName: candidate.nombre,
        newVoteCount: candidate.votos,
        totalVotes: campaign.totalVotos,
        timestamp: new Date()
      });
      console.log(`Broadcast: Voto emitido en campaña ${campaignId}`);
    }

    res.json({
      success: true,
      message: 'Voto registrado exitosamente.',
      vote: {
        campaignId,
        candidateId,
        votedAt: vote.votedAt
      }
    });

  } catch (error) {
    console.error('Error al votar:', error);
    
    // Error de duplicado (por si el índice único lo detecta)
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'Ya has votado en esta campaña.'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Error al registrar voto.',
      error: error.message
    });
  }
});


// Obtener votos de una campaña (solo vista)
router.get('/campaign/:campaignId', authMiddleware, async (req, res) => {
  try {
    const { campaignId } = req.params;

    const campaign = await Campaign.findById(campaignId);
    if (!campaign) {
      return res.status(404).json({
        success: false,
        message: 'Campaña no encontrada.'
      });
    }

    // Contar votos por candidato
    const voteCount = await Vote.aggregate([
      { $match: { campaignId: campaign._id } },
      { $group: {
        _id: '$candidateId',
        count: { $sum: 1 }
      }}
    ]);

    res.json({
      success: true,
      campaign: {
        id: campaign._id,
        titulo: campaign.titulo,
        totalVotos: campaign.totalVotos,
        candidatos: campaign.candidatos.map(c => ({
          id: c._id,
          nombre: c.nombre,
          votos: c.votos
        }))
      },
      voteCount
    });

  } catch (error) {
    console.error('Error al obtener votos:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener votos.',
      error: error.message
    });
  }
});

export default router;