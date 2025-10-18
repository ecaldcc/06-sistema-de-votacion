import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { adminAPI } from '../../services/api';
import { Pie, Bar } from 'react-chartjs-2';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';
import '../../styles/CampaignReport.scss';

ChartJS.register(ArcElement, Tooltip, Legend);

interface Vote {
  voter: string;
  numeroColegiado: string;
  votedAt: string;
  candidateId: string;
}

interface Candidate {
  _id: string;
  nombre: string;
  votos: number;
}

interface CampaignData {
  titulo: string;
  descripcion: string;
  estado: string;
  fechaInicio: string;
  fechaFin: string;
  totalVotos: number;
  candidatos: Candidate[];
}

interface Report {
  campaign: CampaignData;
  votes: Vote[];
}

const CampaignReport: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [report, setReport] = useState<Report | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    if (id) {
      loadReport();
    }
  }, [id]);

  const loadReport = async () => {
    try {
      setLoading(true);
      const response = await adminAPI.getCampaignReport(id!);
      setReport(response.report);
    } catch (error) {
      console.error('Error al cargar reporte:', error);
      alert('Error al cargar el reporte');
      navigate('/admin/dashboard');
    } finally {
      setLoading(false);
    }
  };

  const getPieChartData = () => {
    if (!report) return null;

    return {
      labels: report.campaign.candidatos.map(c => c.nombre),
      datasets: [
        {
          data: report.campaign.candidatos.map(c => c.votos),
          backgroundColor: [
            'rgba(102, 126, 234, 0.8)',
            'rgba(118, 75, 162, 0.8)',
            'rgba(237, 100, 166, 0.8)',
            'rgba(255, 154, 158, 0.8)',
            'rgba(250, 208, 196, 0.8)',
            'rgba(66, 214, 164, 0.8)',
          ],
          borderColor: [
            'rgba(102, 126, 234, 1)',
            'rgba(118, 75, 162, 1)',
            'rgba(237, 100, 166, 1)',
            'rgba(255, 154, 158, 1)',
            'rgba(250, 208, 196, 1)',
            'rgba(66, 214, 164, 1)',
          ],
          borderWidth: 2,
        },
      ],
    };
  };

  const getBarChartData = () => {
    if (!report) return null;

    return {
      labels: report.campaign.candidatos.map(c => c.nombre),
      datasets: [
        {
          label: 'Votos',
          data: report.campaign.candidatos.map(c => c.votos),
          backgroundColor: 'rgba(102, 126, 234, 0.8)',
          borderColor: 'rgba(102, 126, 234, 1)',
          borderWidth: 2,
        },
      ],
    };
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom' as const,
      },
    },
  };

  const barChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          stepSize: 1,
        },
      },
    },
  };

  const getWinner = () => {
    if (!report || report.campaign.candidatos.length === 0) return null;

    const maxVotos = Math.max(...report.campaign.candidatos.map(c => c.votos));
    const winners = report.campaign.candidatos.filter(c => c.votos === maxVotos);

    if (winners.length === 1) {
      return winners[0];
    } else if (winners.length > 1) {
      return { nombre: 'Empate', votos: maxVotos };
    }

    return null;
  };

  const getParticipationRate = () => {
    if (!report) return 0;
    //cuando tengamos el total de votantes lo ponemos aca
    // Py lo calculamos basado en los votos emitidos
    return 100; // ahora solo mostrara el 100%
  };

  const handlePrint = () => {
    window.print();
  };

  const filteredVotes = report?.votes.filter(vote =>
    vote.voter.toLowerCase().includes(searchTerm.toLowerCase()) ||
    vote.numeroColegiado.includes(searchTerm)
  ) || [];

  if (loading) {
    return (
      <div className="loading-container">
        <div className="spinner"></div>
        <p>Cargando reporte...</p>
      </div>
    );
  }

  if (!report) {
    return (
      <div className="error-container">
        <i className="fas fa-exclamation-triangle"></i>
        <h3>Reporte no encontrado</h3>
        <button onClick={() => navigate('/admin/dashboard')} className="btn-back">
          Volver al Dashboard
        </button>
      </div>
    );
  }

  const winner = getWinner();

  return (
    <div className="campaign-report-page">
      <div className="report-header no-print">
        <div className="header-left">
          <button className="btn-back" onClick={() => navigate('/admin/dashboard')}>
            <i className="fas fa-arrow-left"></i> Volver al Dashboard
          </button>
        </div>

        <h1>Reporte Detallado</h1>

        <div className="header-right">
          <button className="btn-print" onClick={handlePrint}>
            <i className="fas fa-print"></i> Imprimir
          </button>
        </div>
      </div>

      <div className="report-container">
        {/* Información de la campaña */}
        <div className="campaign-info-card">
          <div className="info-header">
            <h2>{report.campaign.titulo}</h2>
            <span className={`status-badge ${report.campaign.estado}`}>
              {report.campaign.estado}
            </span>
          </div>
          <p className="description">{report.campaign.descripcion}</p>
          <div className="info-dates">
            <div className="date-item">
              <i className="fas fa-calendar-alt"></i>
              <span>Inicio: {new Date(report.campaign.fechaInicio).toLocaleString('es-GT')}</span>
            </div>
            <div className="date-item">
              <i className="fas fa-calendar-check"></i>
              <span>Fin: {new Date(report.campaign.fechaFin).toLocaleString('es-GT')}</span>
            </div>
          </div>
        </div>

        {/* Estadísticas principales */}
        <div className="stats-section">
          <div className="stat-box blue">
            <div className="stat-icon">
              <i className="fas fa-vote-yea"></i>
            </div>
            <div className="stat-content">
              <h3>{report.campaign.totalVotos}</h3>
              <p>Votos Totales</p>
            </div>
          </div>

          <div className="stat-box green">
            <div className="stat-icon">
              <i className="fas fa-users"></i>
            </div>
            <div className="stat-content">
              <h3>{report.campaign.candidatos.length}</h3>
              <p>Candidatos</p>
            </div>
          </div>

          <div className="stat-box purple">
            <div className="stat-icon">
              <i className="fas fa-percentage"></i>
            </div>
            <div className="stat-content">
              <h3>{getParticipationRate()}%</h3>
              <p>Participación</p>
            </div>
          </div>

          {winner && winner.nombre !== 'Empate' && (
            <div className="stat-box gold">
              <div className="stat-icon">
                <i className="fas fa-trophy"></i>
              </div>
              <div className="stat-content">
                <h3>{winner.votos}</h3>
                <p>Votos Ganador</p>
              </div>
            </div>
          )}
        </div>

        {/* Ganador */}
        {winner && (
          <div className="winner-section">
            <div className="winner-card">
              <i className="fas fa-trophy trophy-icon"></i>
              <div className="winner-info">
                {winner.nombre === 'Empate' ? (
                  <>
                    <h3>Empate Técnico</h3>
                    <p>Multiples candidatos con {winner.votos} votos</p>
                  </>
                ) : (
                  <>
                    <h3>Primer Lugar</h3>
                    <h2>{winner.nombre}</h2>
                    <p>{winner.votos} votos ({((winner.votos / report.campaign.totalVotos) * 100).toFixed(1)}%)</p>
                  </>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Gráficos */}
        <div className="charts-section">
          <div className="chart-card">
            <h3><i className="fas fa-chart-pie"></i> Distribución de Votos</h3>
            <div className="chart-container pie">
              {getPieChartData() && <Pie data={getPieChartData()!} options={chartOptions} />}
            </div>
          </div>

          <div className="chart-card">
            <h3><i className="fas fa-chart-bar"></i> Comparación de Votos</h3>
            <div className="chart-container bar">
              {getBarChartData() && <Bar data={getBarChartData()!} options={barChartOptions} />}
            </div>
          </div>
        </div>

        {/* Resultados por candidato */}
        <div className="candidates-results">
          <h3><i className="fas fa-list-ol"></i> Resultados por Candidato</h3>
          <div className="candidates-table">
            <table>
              <thead>
                <tr>
                  <th>Posición</th>
                  <th>Candidato</th>
                  <th>Votos</th>
                  <th>Porcentaje</th>
                  <th>Progreso</th>
                </tr>
              </thead>
              <tbody>
                {report.campaign.candidatos
                  .sort((a, b) => b.votos - a.votos)
                  .map((candidate, index) => (
                    <tr key={candidate._id}>
                      <td className="position">
                        {index === 0 ? (
                          <i className="fas fa-trophy gold-trophy"></i>
                        ) : (
                          <span>#{index + 1}</span>
                        )}
                      </td>
                      <td className="candidate-name">{candidate.nombre}</td>
                      <td className="votes">{candidate.votos}</td>
                      <td className="percentage">
                        {report.campaign.totalVotos > 0
                          ? ((candidate.votos / report.campaign.totalVotos) * 100).toFixed(1)
                          : 0}%
                      </td>
                      <td className="progress-cell">
                        <div className="progress-bar">
                          <div
                            className="progress-fill"
                            style={{
                              width: report.campaign.totalVotos > 0
                                ? `${(candidate.votos / report.campaign.totalVotos) * 100}%`
                                : '0%'
                            }}
                          ></div>
                        </div>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Listado de votos */}
        <div className="votes-list-section">
          <div className="section-header">
            <h3><i className="fas fa-users"></i> Registro de Votos ({report.votes.length})</h3>
            <div className="search-box no-print">
              <i className="fas fa-search"></i>
              <input
                type="text"
                placeholder="Buscar por nombre o número de colegiado..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>

          <div className="votes-table">
            <table>
              <thead>
                <tr>
                  <th>#</th>
                  <th>Votante</th>
                  <th>No. Colegiado</th>
                  <th>Fecha y Hora</th>
                  <th>Candidato Seleccionado</th>
                </tr>
              </thead>
              <tbody>
                {filteredVotes.length > 0 ? (
                  filteredVotes.map((vote, index) => {
                    const candidate = report.campaign.candidatos.find(
                      c => c._id === vote.candidateId
                    );
                    return (
                      <tr key={index}>
                        <td>{index + 1}</td>
                        <td>{vote.voter}</td>
                        <td>{vote.numeroColegiado}</td>
                        <td>{new Date(vote.votedAt).toLocaleString('es-GT')}</td>
                        <td>{candidate?.nombre || 'N/A'}</td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={5} className="no-data">
                      {searchTerm ? 'No se encontraron resultados' : 'No hay votos registrados'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Información adicional */}
        <div className="additional-info">
          <div className="info-box">
            <h4><i className="fas fa-info-circle"></i> Información del Reporte</h4>
            <p><strong>Fecha de Generación:</strong> {new Date().toLocaleString('es-GT')}</p>
            <p><strong>Estado de la Campaña:</strong> {report.campaign.estado}</p>
            <p><strong>Total de Votos Emitidos:</strong> {report.campaign.totalVotos}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CampaignReport;