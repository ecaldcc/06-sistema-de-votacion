import express from 'express';
import Campaign from '../models/campaing.js';
import Vote from '../models/vote.js';
import User from '../models/user.js';
const router = express.Router();

import { authMiddleware, adminMiddleware } from '../middleware/auth-jwt.js';

// Variables para almacenar las funciones de broadcast
let broadcastToCampaign = null;
let broadcastToAll = null;

// Funcion para inyectar los broadcasts desde el servidor principal
export const setBroadcastFunctions = (broadcastCampaignFn, broadcastAllFn) => {
  broadcastToCampaign = broadcastCampaignFn;
  broadcastToAll = broadcastAllFn;
};

// Todas las rutas requieren autenticacion y permisos de admin
router.use(authMiddleware, adminMiddleware);

// ========== GESTION DE CAMPAÑAS ==========

// Crear campaña
router.post('/campaigns', async (req, res) => {
  try {
    const {
      titulo,
      descripcion,
      votosDisponibles,
      fechaInicio,
      fechaFin,
      candidatos
    } = req.body;

    // Validaciones
    if (!titulo || !descripcion || !fechaInicio || !fechaFin) {
      return res.status(400).json({
        success: false,
        message: 'Todos los campos requeridos deben estar completos.'
      });
    }

    if (new Date(fechaFin) <= new Date(fechaInicio)) {
      return res.status(400).json({
        success: false,
        message: 'La fecha de fin debe ser posterior a la fecha de inicio.'
      });
    }

    const campaign = new Campaign({
      titulo,
      descripcion,
      votosDisponibles: votosDisponibles || 1,
      fechaInicio: new Date(fechaInicio),
      fechaFin: new Date(fechaFin),
      candidatos: candidatos || [],
      createdBy: req.userId
    });

    await campaign.save();

    // WEBSOCKET: Notificar a todos sobre nueva campaña
    if (broadcastToAll) {
      broadcastToAll('new_campaign', {
        campaign: {
          _id: campaign._id.toString(),
          titulo: campaign.titulo,
          descripcion: campaign.descripcion,
          estado: campaign.estado
        }
      });
      console.log('Broadcast: Nueva campaña creada');
    }

    res.status(201).json({
      success: true,
      message: 'Campaña creada exitosamente.',
      campaign
    });

  } catch (error) {
    console.error('Error al crear campaña:', error);
    res.status(500).json({
      success: false,
      message: 'Error al crear campaña.',
      error: error.message
    });
  }
});

// Obtener todas las campañas (admin)
router.get('/campaigns', async (req, res) => {
  try {
    const campaigns = await Campaign.find()
      .populate('createdBy', 'nombreCompleto correo')
      .sort({ createdAt: -1 });

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

// Actualizar campaña
router.put('/campaigns/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    // No permitir actualizar ciertos campos si la campaña ya tiene votos
    const campaign = await Campaign.findById(id);
    if (!campaign) {
      return res.status(404).json({
        success: false,
        message: 'Campaña no encontrada.'
      });
    }

    if (campaign.totalVotos > 0 && updates.candidatos) {
      return res.status(400).json({
        success: false,
        message: 'No se pueden modificar los candidatos en una campaña que ya tiene votos.'
      });
    }

    // Validar fechas si se actualizan
    if (updates.fechaInicio && updates.fechaFin) {
      if (new Date(updates.fechaFin) <= new Date(updates.fechaInicio)) {
        return res.status(400).json({
          success: false,
          message: 'La fecha de fin debe ser posterior a la fecha de inicio.'
        });
      }
    }

    const updatedCampaign = await Campaign.findByIdAndUpdate(
      id,
      { ...updates, updatedAt: new Date() },
      { new: true, runValidators: true }
    );

    // WEBSOCKET: Notificar actualizacion de campaña
    if (broadcastToCampaign) {
      broadcastToCampaign(id, 'campaign_updated', {
        campaignId: id,
        updates: updates
      });
      console.log(` Broadcast: Campaña ${id} actualizada`);
    }

    res.json({
      success: true,
      message: 'Campaña actualizada exitosamente.',
      campaign: updatedCampaign
    });

  } catch (error) {
    console.error('Error al actualizar campaña:', error);
    res.status(500).json({
      success: false,
      message: 'Error al actualizar campaña.',
      error: error.message
    });
  }
});

// Eliminar campaña
router.delete('/campaigns/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const campaign = await Campaign.findById(id);
    if (!campaign) {
      return res.status(404).json({
        success: false,
        message: 'Campaña no encontrada.'
      });
    }

    // Verificar si tiene votos
    if (campaign.totalVotos > 0) {
      return res.status(400).json({
        success: false,
        message: 'No se puede eliminar una campaña que ya tiene votos. Considere deshabilitarla.'
      });
    }

    await Campaign.findByIdAndDelete(id);
    await Vote.deleteMany({ campaignId: id });

    // WEBSOCKET: Notificar eliminación de campaña
    if (broadcastToAll) {
      broadcastToAll('campaign_deleted', {
        campaignId: id
      });
      console.log(`Broadcast: Campaña ${id} eliminada`);
    }

    res.json({
      success: true,
      message: 'Campaña eliminada exitosamente.'
    });

  } catch (error) {
    console.error('Error al eliminar campaña:', error);
    res.status(500).json({
      success: false,
      message: 'Error al eliminar campaña.',
      error: error.message
    });
  }
});

// Habilitar/Deshabilitar campaña
router.patch('/campaigns/:id/toggle', async (req, res) => {
  try {
    const { id } = req.params;
    const { estado } = req.body;

    if (!['habilitada', 'deshabilitada', 'finalizada'].includes(estado)) {
      return res.status(400).json({
        success: false,
        message: 'Estado inválido.'
      });
    }

    const campaign = await Campaign.findByIdAndUpdate(
      id,
      { estado, updatedAt: new Date() },
      { new: true }
    );

    if (!campaign) {
      return res.status(404).json({
        success: false,
        message: 'Campaña no encontrada.'
      });
    }

    // WEBSOCKET: Notificar cambio de estado
    if (broadcastToCampaign && broadcastToAll) {
      // Notificar a los suscritos a la campaña específica
      broadcastToCampaign(id, 'campaign_toggled', {
        campaignId: id,
        newState: estado
      });
      
      // También notificar globalmente para actualizar listas
      broadcastToAll('campaign_toggled', {
        campaignId: id,
        newState: estado
      });
      
      console.log(`Broadcast: Campaña ${id} cambió a estado ${estado}`);
    }

    res.json({
      success: true,
      message: `Campaña ${estado} exitosamente.`,
      campaign
    });

  } catch (error) {
    console.error('Error al cambiar estado:', error);
    res.status(500).json({
      success: false,
      message: 'Error al cambiar estado de campaña.',
      error: error.message
    });
  }
});

// ========== GESTIoN DE CANDIDATOS ==========

// Agregar candidato a campaña
router.post('/campaigns/:id/candidates', async (req, res) => {
  try {
    const { id } = req.params;
    const { nombre, foto, propuestas } = req.body;

    if (!nombre) {
      return res.status(400).json({
        success: false,
        message: 'El nombre del candidato es requerido.'
      });
    }

    const campaign = await Campaign.findById(id);
    if (!campaign) {
      return res.status(404).json({
        success: false,
        message: 'Campaña no encontrada.'
      });
    }

    campaign.candidatos.push({
      nombre,
      foto: foto || '',
      propuestas: propuestas || '',
      votos: 0
    });

    await campaign.save();

    // WEBSOCKET: Notificar cambio en candidatos
    if (broadcastToCampaign) {
      broadcastToCampaign(id, 'campaign_updated', {
        campaignId: id,
        type: 'candidate_added'
      });
    }

    res.json({
      success: true,
      message: 'Candidato agregado exitosamente.',
      campaign
    });

  } catch (error) {
    console.error('Error al agregar candidato:', error);
    res.status(500).json({
      success: false,
      message: 'Error al agregar candidato.',
      error: error.message
    });
  }
});

// Actualizar candidato
router.put('/campaigns/:campaignId/candidates/:candidateId', async (req, res) => {
  try {
    const { campaignId, candidateId } = req.params;
    const { nombre, foto, propuestas } = req.body;

    const campaign = await Campaign.findById(campaignId);
    if (!campaign) {
      return res.status(404).json({
        success: false,
        message: 'Campaña no encontrada.'
      });
    }

    const candidate = campaign.candidatos.id(candidateId);
    if (!candidate) {
      return res.status(404).json({
        success: false,
        message: 'Candidato no encontrado.'
      });
    }

    if (nombre) candidate.nombre = nombre;
    if (foto !== undefined) candidate.foto = foto;
    if (propuestas !== undefined) candidate.propuestas = propuestas;

    await campaign.save();

    // WEBSOCKET: Notificar actualización de candidato
    if (broadcastToCampaign) {
      broadcastToCampaign(campaignId, 'campaign_updated', {
        campaignId,
        type: 'candidate_updated',
        candidateId
      });
    }

    res.json({
      success: true,
      message: 'Candidato actualizado exitosamente.',
      campaign
    });

  } catch (error) {
    console.error('Error al actualizar candidato:', error);
    res.status(500).json({
      success: false,
      message: 'Error al actualizar candidato.',
      error: error.message
    });
  }
});

// Eliminar candidato
router.delete('/campaigns/:campaignId/candidates/:candidateId', async (req, res) => {
  try {
    const { campaignId, candidateId } = req.params;

    const campaign = await Campaign.findById(campaignId);
    if (!campaign) {
      return res.status(404).json({
        success: false,
        message: 'Campaña no encontrada.'
      });
    }

    const candidate = campaign.candidatos.id(candidateId);
    if (!candidate) {
      return res.status(404).json({
        success: false,
        message: 'Candidato no encontrado.'
      });
    }

    // Verificar si el candidato tiene votos
    if (candidate.votos > 0) {
      return res.status(400).json({
        success: false,
        message: 'No se puede eliminar un candidato que ya tiene votos.'
      });
    }

    candidate.remove();
    await campaign.save();

    // WEBSOCKET: Notificar eliminación de candidato
    if (broadcastToCampaign) {
      broadcastToCampaign(campaignId, 'campaign_updated', {
        campaignId,
        type: 'candidate_deleted',
        candidateId
      });
    }

    res.json({
      success: true,
      message: 'Candidato eliminado exitosamente.',
      campaign
    });

  } catch (error) {
    console.error('Error al eliminar candidato:', error);
    res.status(500).json({
      success: false,
      message: 'Error al eliminar candidato.',
      error: error.message
    });
  }
});

// ========== REPORTES ==========

// Reporte general de votaciones
router.get('/reports/general', async (req, res) => {
  try {
    const totalCampaigns = await Campaign.countDocuments();
    const activeCampaigns = await Campaign.countDocuments({ estado: 'habilitada' });
    const finishedCampaigns = await Campaign.countDocuments({ estado: 'finalizada' });
    
    const campaigns = await Campaign.find().select('titulo descripcion totalVotos estado fechaInicio fechaFin candidatos');
    const totalVotes = campaigns.reduce((sum, campaign) => sum + campaign.totalVotos, 0);
    
    const totalVoters = await User.countDocuments({ role: 'voter' });

    res.json({
      success: true,
      report: {
        totalCampaigns,
        activeCampaigns,
        finishedCampaigns,
        totalVotes,
        totalVoters,
        campaigns
      }
    });

  } catch (error) {
    console.error('Error al generar reporte:', error);
    res.status(500).json({
      success: false,
      message: 'Error al generar reporte.',
      error: error.message
    });
  }
});

// Reporte detallado de una campaña
router.get('/reports/campaign/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const campaign = await Campaign.findById(id);
    if (!campaign) {
      return res.status(404).json({
        success: false,
        message: 'Campaña no encontrada.'
      });
    }

    const votes = await Vote.find({ campaignId: id })
      .populate('userId', 'nombreCompleto numeroColegiado')
      .sort({ votedAt: -1 });

    res.json({
      success: true,
      report: {
        campaign: {
          titulo: campaign.titulo,
          descripcion: campaign.descripcion,
          estado: campaign.estado,
          fechaInicio: campaign.fechaInicio,
          fechaFin: campaign.fechaFin,
          totalVotos: campaign.totalVotos,
          candidatos: campaign.candidatos
        },
        votes: votes.map(v => ({
          voter: v.userId.nombreCompleto,
          numeroColegiado: v.userId.numeroColegiado,
          votedAt: v.votedAt,
          candidateId: v.candidateId
        }))
      }
    });

  } catch (error) {
    console.error('Error al generar reporte de campaña:', error);
    res.status(500).json({
      success: false,
      message: 'Error al generar reporte de campaña.',
      error: error.message
    });
  }
});

// ========== GESTIoN DE USUARIOS ==========

// Obtener todos los votantes
router.get('/users/voters', async (req, res) => {
  try {
    const voters = await User.find({ role: 'voter' })
      .select('-password')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      voters
    });

  } catch (error) {
    console.error('Error al obtener votantes:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener votantes.',
      error: error.message
    });
  }
});

// Activar/Desactivar usuario
router.patch('/users/:id/toggle', async (req, res) => {
  try {
    const { id } = req.params;
    const { isActive } = req.body;

    const user = await User.findByIdAndUpdate(
      id,
      { isActive },
      { new: true }
    ).select('-password');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Usuario no encontrado.'
      });
    }

    //  WEBSOCKET: Notificar cambio de estado de usuario (opcional)
    if (broadcastToAll) {
      broadcastToAll('user_toggled', {
        userId: id,
        isActive
      });
    }

    res.json({
      success: true,
      message: `Usuario ${isActive ? 'activado' : 'desactivado'} exitosamente.`,
      user
    });

  } catch (error) {
    console.error('Error al cambiar estado de usuario:', error);
    res.status(500).json({
      success: false,
      message: 'Error al cambiar estado de usuario.',
      error: error.message
    });
  }
});

export default router;