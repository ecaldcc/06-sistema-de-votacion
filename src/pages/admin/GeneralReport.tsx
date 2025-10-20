import React from 'react';
import { useNavigate } from 'react-router-dom';
import { adminAPI } from '../../services/api';
import { useState, useEffect } from 'react';
import '../../styles/AdminDashboard.scss';

interface Report {
  totalCampaigns: number;
  activeCampaigns: number;
  finishedCampaigns: number;
  totalVotes: number;
  totalVoters: number;
  campaigns: any[];
}

const GeneralReport: React.FC = () => {
  const navigate = useNavigate();
  const [report, setReport] = useState<Report | null>(null);

  useEffect(() => {
    loadReport();
  }, []);

  const loadReport = async () => {
    try {
      const response = await adminAPI.getGeneralReport();
      setReport(response.report);
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const handlePrint = () => window.print();

  return (
    <div className="admin-dashboard">
      <nav className="admin-navbar">
        <div className="navbar-content">
          <div className="navbar-brand">
            <i className="fas fa-file-alt"></i>
            <span>Reporte General</span>
          </div>
          <div className="navbar-user">
            <button className="btn-back" onClick={() => navigate('/admin/dashboard')}>
              <i className="fas fa-arrow-left"></i> Volver
            </button>
            <button className="btn-logout" onClick={handlePrint}>
              <i className="fas fa-print"></i> Imprimir
            </button>
          </div>
        </div>
      </nav>

      <div className="dashboard-container">
        <h1>Reporte General del Sistema</h1>

        {report && (
          <>
            <div className="stats-grid">
              <div className="stat-card blue">
                <div className="stat-icon"><i className="fas fa-vote-yea"></i></div>
                <div className="stat-info">
                  <h3>{report.totalCampaigns}</h3>
                  <p>Total Campañas</p>
                </div>
              </div>
              <div className="stat-card green">
                <div className="stat-icon"><i className="fas fa-check-circle"></i></div>
                <div className="stat-info">
                  <h3>{report.activeCampaigns}</h3>
                  <p>Campañas Activas</p>
                </div>
              </div>
              <div className="stat-card purple">
                <div className="stat-icon"><i className="fas fa-chart-bar"></i></div>
                <div className="stat-info">
                  <h3>{report.totalVotes}</h3>
                  <p>Votos Totales</p>
                </div>
              </div>
              <div className="stat-card orange">
                <div className="stat-icon"><i className="fas fa-users"></i></div>
                <div className="stat-info">
                  <h3>{report.totalVoters}</h3>
                  <p>Votantes Registrados</p>
                </div>
              </div>
            </div>

            <h2>Campañas</h2>
            <table>
              <thead>
                <tr>
                  <th>Título</th>
                  <th>Estado</th>
                  <th>Votos</th>
                  <th>Fecha Inicio</th>
                  <th>Fecha Fin</th>
                </tr>
              </thead>
              <tbody>
                {report.campaigns.map(c => (
                  <tr key={c._id}>
                    <td>{c.titulo}</td>
                    <td><span className={`status-badge ${c.estado}`}>{c.estado}</span></td>
                    <td>{c.totalVotos}</td>
                    <td>{new Date(c.fechaInicio).toLocaleDateString('es-GT')}</td>
                    <td>{new Date(c.fechaFin).toLocaleDateString('es-GT')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        )}
      </div>
    </div>
  );
};

export default GeneralReport;