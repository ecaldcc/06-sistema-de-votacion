// src/components/CampaignDetail.tsx

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { campaignsAPI, votesAPI } from '../../services/api';
import { wsService, WSEventType } from '../../services/websocketService';
import { Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
} from 'chart.js';
import '../../styles/CampaignDetail.scss';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

// ... (Las interfaces Campaign y Candidate no cambian) ...
interface Candidate {
  _id: string;
  nombre: string;
  foto?: string;
  propuestas?: string;
  votos: number;
}

interface Campaign {
  _id: string;
  titulo: string;
  descripcion: string;
  votosDisponibles: number;
  estado: string;
  fechaInicio: string;
  fechaFin: string;
  candidatos: Candidate[];
  totalVotos: number;
}

const CampaignDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [campaign, setCampaign] = useState<Campaign | null>(null);

  // ==================================================================
  //ESTADO PARA CONTROLAR LA CARGA INICIAL
  // ==================================================================
  const [initialLoadComplete, setInitialLoadComplete] = useState(false);

  const [hasVoted, setHasVoted] = useState(false);
  const [selectedCandidate, setSelectedCandidate] = useState<string | null>(null);
  const [voting, setVoting] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState('');

  useEffect(() => {
    if (id) {
      loadCampaignData();
      
      const WS_URL = import.meta.env.VITE_WS_URL;
      if (WS_URL) {
        try {
          if (!wsService.isConnected()) wsService.connect(WS_URL);
          wsService.subscribeToCampaign(id);

          const handleVoteCast = (data: any) => {
            if (data.campaignId === id) loadCampaignData();
          };
          const handleCampaignUpdated = (data: any) => {
            if (data.campaignId === id) loadCampaignData();
          };

          wsService.on(WSEventType.VOTE_CAST, handleVoteCast);
          wsService.on(WSEventType.CAMPAIGN_UPDATED, handleCampaignUpdated);

          return () => {
            wsService.off(WSEventType.VOTE_CAST, handleVoteCast);
            wsService.off(WSEventType.CAMPAIGN_UPDATED, handleCampaignUpdated);
            wsService.unsubscribeFromCampaign(id);
          };
        } catch (error) {
          console.error('Error en la conexion WebSocket:', error);
        }
      }
    }
  }, [id]);

  useEffect(() => {
    if (campaign && campaign.estado === 'habilitada') {
      const interval = setInterval(() => updateTimeRemaining(), 1000);
      return () => clearInterval(interval);
    }
  }, [campaign]);

  // ==================================================================
  // 2. AJUSTE EN LA FUNCION DE CARGA DE DATOS
  // ==================================================================
  const loadCampaignData = async () => {
    try {
      const [campaignRes, votedRes] = await Promise.all([
        campaignsAPI.getById(id!),
        campaignsAPI.checkVoted(id!)
      ]);
      setCampaign(campaignRes.campaign);
      setHasVoted(votedRes.hasVoted);
    } catch (error) {
      console.error('Error al cargar campaña:', error);
      setCampaign(null);
    } finally {
      // Marcamos que la carga inicial ha terminado, haya tenido éxito o no.
      setInitialLoadComplete(true);
    }
  };
  
  const handleVote = async () => {
    if (!selectedCandidate || !campaign) return;
    try {
      setVoting(true);
      await votesAPI.cast({
        campaignId: campaign._id,
        candidateId: selectedCandidate
      });
      alert('¡Voto registrado exitosamente!');
      setHasVoted(true); // Actualiza localmente y espera al WebSocket para los resultados.
    } catch (error: any) {
      console.error('Error al votar:', error);
      alert(error.response?.data?.message || 'Error al registrar el voto');
    } finally {
      setVoting(false);
    }
  };


  const updateTimeRemaining = () => {
    if (!campaign) return;
    const now = new Date().getTime();
    const end = new Date(campaign.fechaFin).getTime();
    const diff = end - now;
    if (diff <= 0) {
      setTimeRemaining('Finalizada');
      return;
    }
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);
    if (days > 0) setTimeRemaining(`${days}d ${hours}h ${minutes}m ${seconds}s`);
    else if (hours > 0) setTimeRemaining(`${hours}h ${minutes}m ${seconds}s`);
    else if (minutes > 0) setTimeRemaining(`${minutes}m ${seconds}s`);
    else setTimeRemaining(`${seconds}s`);
  };
  const getChartData = () => {
    if (!campaign) return null;
    return {
      labels: campaign.candidatos.map(c => c.nombre),
      datasets: [{
        label: 'Votos',
        data: campaign.candidatos.map(c => c.votos),
        backgroundColor: [
          'rgba(102, 126, 234, 0.8)', 'rgba(118, 75, 162, 0.8)',
          'rgba(237, 100, 166, 0.8)', 'rgba(255, 154, 158, 0.8)',
          'rgba(250, 208, 196, 0.8)',
        ],
        borderColor: [
          'rgba(102, 126, 234, 1)', 'rgba(118, 75, 162, 1)',
          'rgba(237, 100, 166, 1)', 'rgba(255, 154, 158, 1)',
          'rgba(250, 208, 196, 1)',
        ],
        borderWidth: 2,
      }],
    };
  };
  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      title: {
        display: true,
        text: 'Resultados de Votación',
        font: { size: 18, weight: 'bold' as const }
      },
    },
    scales: { y: { beginAtZero: true, ticks: { stepSize: 1 } } },
  };


  // Si la carga inicial no ha terminado, no renderices nada.
  if (!initialLoadComplete) {
    return null;
  }

  // Si la carga inicial ya termino Y la campaña sigue siendo nula,
  // entonces sí es un error real y mostramos el mensaje.
  if (!campaign) {
    return (
      <div className="error-container">
        <i className="fas fa-exclamation-triangle"></i>
        <h3>Campaña no encontrada</h3>
        <button onClick={() => navigate('/voter/campaigns')} className="btn-back">
          Volver a campañas
        </button>
      </div>
    );
  }

  // Si la carga termino y tenemos una campaña, renderiza todo el componente.
  return (
    <div className="campaign-detail-page">
        <div className="detail-header">
            <button className="btn-back-arrow" onClick={() => navigate('/voter/campaigns')}>
                <i className="fas fa-arrow-left"></i> Volver
            </button>
            <div className="header-info">
                <h1>{campaign.titulo}</h1>
                <span className={`status-badge ${campaign.estado}`}>
                    {campaign.estado === 'habilitada' ? 'Activa' : campaign.estado === 'finalizada' ? 'Finalizada' : 'Deshabilitada'}
                </span>
            </div>
        </div>
        <div className="detail-container">
            <div className="campaign-info-section">
                <div className="info-card">
                    <h3><i className="fas fa-info-circle"></i> Descripción</h3>
                    <p>{campaign.descripcion}</p>
                </div>
                <div className="info-stats">
                    <div className="stat-box">
                        <i className="fas fa-users"></i>
                        <div>
                            <h4>{campaign.candidatos.length}</h4>
                            <span>Candidatos</span>
                        </div>
                    </div>
                    <div className="stat-box">
                        <i className="fas fa-vote-yea"></i>
                        <div>
                            <h4>{campaign.totalVotos}</h4>
                            <span>Votos Totales</span>
                        </div>
                    </div>
                    <div className="stat-box">
                        <i className="fas fa-check-circle"></i>
                        <div>
                            <h4>{campaign.votosDisponibles}</h4>
                            <span>Votos Disponibles</span>
                        </div>
                    </div>
                </div>
                {campaign.estado === 'habilitada' && (
                <div className="time-remaining-card">
                    <i className="fas fa-clock"></i>
                    <div>
                        <h4>Tiempo Restante</h4>
                        <p className="countdown">{timeRemaining}</p>
                    </div>
                </div>
                )}
                {hasVoted && (
                <div className="voted-alert">
                    <i className="fas fa-check-circle"></i>
                    <p>Ya has votado en esta campaña</p>
                </div>
                )}
            </div>
            <div className="chart-section">
                <div className="chart-container">
                    {getChartData() && <Bar data={getChartData()!} options={chartOptions} />}
                </div>
            </div>
            <div className="candidates-section">
                <h3><i className="fas fa-users"></i> Candidatos</h3>
                <div className="candidates-grid">
                    {campaign.candidatos.map((candidate) => (
                    <div
                        key={candidate._id}
                        className={`candidate-card ${selectedCandidate === candidate._id ? 'selected' : ''} ${hasVoted || campaign.estado !== 'habilitada' ? 'disabled' : ''}`}
                        onClick={() => {
                        if (!hasVoted && campaign.estado === 'habilitada') {
                            setSelectedCandidate(candidate._id);
                        }
                        }}
                    >
                        <div className="candidate-header">
                            <div className="candidate-avatar">
                                {candidate.foto ? (
                                <img src={candidate.foto} alt={candidate.nombre} />
                                ) : (
                                <i className="fas fa-user"></i>
                                )}
                            </div>
                            <div className="candidate-info">
                                <h4>{candidate.nombre}</h4>
                                <span className="vote-count">
                                <i className="fas fa-vote-yea"></i> {candidate.votos} votos
                                </span>
                            </div>
                        </div>
                        {candidate.propuestas && (
                        <div className="candidate-proposals">
                            <h5><i className="fas fa-lightbulb"></i> Propuestas:</h5>
                            <p>{candidate.propuestas}</p>
                        </div>
                        )}
                        {selectedCandidate === candidate._id && !hasVoted && campaign.estado === 'habilitada' && (
                        <div className="selected-indicator">
                            <i className="fas fa-check-circle"></i> Seleccionado
                        </div>
                        )}
                    </div>
                    ))}
                </div>
                {!hasVoted && campaign.estado === 'habilitada' && (
                <div className="vote-action">
                    <button
                        className="btn-vote"
                        disabled={!selectedCandidate || voting}
                        onClick={handleVote}
                    >
                        {voting ? (
                        <><i className="fas fa-spinner fa-spin"></i> Registrando voto...</>
                        ) : (
                        <><i className="fas fa-vote-yea"></i> Confirmar Voto</>
                        )}
                    </button>
                    {selectedCandidate && (
                    <p className="vote-hint">
                        <i className="fas fa-info-circle"></i> Estás votando por:{' '}
                        <strong>{campaign.candidatos.find(c => c._id === selectedCandidate)?.nombre}</strong>
                    </p>
                    )}
                </div>
                )}
            </div>
        </div>
    </div>
  );
};

export default CampaignDetail;