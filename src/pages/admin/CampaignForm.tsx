import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { adminAPI, campaignsAPI } from '../../services/api';
import '../../styles/CampaignForm.scss';

interface Candidate {
  _id?: string;
  nombre: string;
  foto: string;
  propuestas: string;
}

const CampaignForm: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEditing = !!id;

  const [formData, setFormData] = useState({
    titulo: '',
    descripcion: '',
    votosDisponibles: 1,
    fechaInicio: '',
    fechaFin: ''
  });

  const [candidatos, setCandidatos] = useState<Candidate[]>([]);
  const [newCandidate, setNewCandidate] = useState<Candidate>({
    nombre: '',
    foto: '',
    propuestas: ''
  });

  const [showCandidateForm, setShowCandidateForm] = useState(false);
  const [editingCandidateIndex, setEditingCandidateIndex] = useState<number | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isEditing) {
      loadCampaignData();
    }
  }, [id]);

  const loadCampaignData = async () => {
    try {
      const response = await campaignsAPI.getById(id!);
      const campaign = response.campaign;

      // Convertir las fechas UTC a formato local para el input date
      const startDate = new Date(campaign.fechaInicio);
      const endDate = new Date(campaign.fechaFin);

      setFormData({
        titulo: campaign.titulo,
        descripcion: campaign.descripcion,
        votosDisponibles: campaign.votosDisponibles,
        fechaInicio: formatDateForInput(startDate),
        fechaFin: formatDateForInput(endDate)
      });

      setCandidatos(campaign.candidatos);
    } catch (error) {
      console.error('Error al cargar campaña:', error);
      alert('Error al cargar la campaña');
      navigate('/admin/dashboard');
    }
  };

  // Convertir fecha a formato YYYY-MM-DD para el input
  const formatDateForInput = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // Convertir fecha local a ISO string con hora al mediodía para evitar problemas de zona horaria
  const convertToISOString = (dateString: string): string => {
    // Crear fecha con hora al mediodía (12:00) para evitar cambios de día por zona horaria
    const [year, month, day] = dateString.split('-');
    const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day), 12, 0, 0);
    return date.toISOString();
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.titulo.trim()) {
      newErrors.titulo = 'El título es requerido';
    }

    if (!formData.descripcion.trim()) {
      newErrors.descripcion = 'La descripción es requerida';
    }

    if (formData.votosDisponibles < 1) {
      newErrors.votosDisponibles = 'Debe haber al menos 1 voto disponible';
    }

    if (!formData.fechaInicio) {
      newErrors.fechaInicio = 'La fecha de inicio es requerida';
    }

    if (!formData.fechaFin) {
      newErrors.fechaFin = 'La fecha de fin es requerida';
    }

    if (formData.fechaInicio && formData.fechaFin) {
      if (new Date(formData.fechaFin) <= new Date(formData.fechaInicio)) {
        newErrors.fechaFin = 'La fecha de fin debe ser posterior a la fecha de inicio';
      }
    }

    if (candidatos.length < 2) {
      newErrors.candidatos = 'Debe haber al menos 2 candidatos';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    try {
      setLoading(true);

      const campaignData = {
        ...formData,
        fechaInicio: convertToISOString(formData.fechaInicio),
        fechaFin: convertToISOString(formData.fechaFin),
        candidatos: candidatos.map(({ _id, ...rest }) => rest)
      };

      if (isEditing) {
        await adminAPI.updateCampaign(id!, campaignData);
        alert('Campaña actualizada exitosamente');
      } else {
        await adminAPI.createCampaign(campaignData);
        alert('Campaña creada exitosamente');
      }

      navigate('/admin/dashboard');
    } catch (error: any) {
      console.error('Error al guardar campaña:', error);
      alert(error.response?.data?.message || 'Error al guardar la campaña');
    } finally {
      setLoading(false);
    }
  };

  const handleAddCandidate = () => {
    if (!newCandidate.nombre.trim()) {
      alert('El nombre del candidato es requerido');
      return;
    }

    if (editingCandidateIndex !== null) {
      const updated = [...candidatos];
      updated[editingCandidateIndex] = newCandidate;
      setCandidatos(updated);
      setEditingCandidateIndex(null);
    } else {
      setCandidatos([...candidatos, newCandidate]);
    }

    setNewCandidate({ nombre: '', foto: '', propuestas: '' });
    setShowCandidateForm(false);
  };

  const handleEditCandidate = (index: number) => {
    setNewCandidate(candidatos[index]);
    setEditingCandidateIndex(index);
    setShowCandidateForm(true);
  };

  const handleDeleteCandidate = (index: number) => {
    if (window.confirm('¿Está seguro de eliminar este candidato?')) {
      setCandidatos(candidatos.filter((_, i) => i !== index));
    }
  };

  return (
    <div className="campaign-form-page">
      <div className="form-header">
        <button className="btn-back" onClick={() => navigate('/admin/dashboard')}>
          <i className="fas fa-arrow-left"></i> Volver al Dashboard
        </button>
        <h1>{isEditing ? 'Editar Campaña' : 'Nueva Campaña'}</h1>
      </div>

      <div className="form-container">
        <form onSubmit={handleSubmit}>
          {/* Información básica */}
          <div className="form-section">
            <h3><i className="fas fa-info-circle"></i> Información Básica</h3>

            <div className="form-group">
              <label>Título de la Campaña *</label>
              <input
                type="text"
                className={errors.titulo ? 'error' : ''}
                value={formData.titulo}
                onChange={(e) => setFormData({ ...formData, titulo: e.target.value })}
                placeholder="Ej: Elección Junta Directiva 2025"
              />
              {errors.titulo && <span className="error-message">{errors.titulo}</span>}
            </div>

            <div className="form-group">
              <label>Descripción *</label>
              <textarea
                className={errors.descripcion ? 'error' : ''}
                value={formData.descripcion}
                onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
                placeholder="Describe el propósito de esta votación"
                rows={4}
              />
              {errors.descripcion && <span className="error-message">{errors.descripcion}</span>}
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Votos Disponibles *</label>
                <input
                  type="number"
                  min="1"
                  className={errors.votosDisponibles ? 'error' : ''}
                  value={formData.votosDisponibles}
                  onChange={(e) => setFormData({ ...formData, votosDisponibles: parseInt(e.target.value) })}
                />
                {errors.votosDisponibles && <span className="error-message">{errors.votosDisponibles}</span>}
              </div>

              <div className="form-group">
                <label>Fecha de Inicio *</label>
                <input
                  type="date"
                  className={errors.fechaInicio ? 'error' : ''}
                  value={formData.fechaInicio}
                  onChange={(e) => setFormData({ ...formData, fechaInicio: e.target.value })}
                />
                {errors.fechaInicio && <span className="error-message">{errors.fechaInicio}</span>}
              </div>

              <div className="form-group">
                <label>Fecha de Fin *</label>
                <input
                  type="date"
                  className={errors.fechaFin ? 'error' : ''}
                  value={formData.fechaFin}
                  onChange={(e) => setFormData({ ...formData, fechaFin: e.target.value })}
                />
                {errors.fechaFin && <span className="error-message">{errors.fechaFin}</span>}
              </div>
            </div>
          </div>

          {/* Candidatos */}
          <div className="form-section">
            <div className="section-header">
              <h3><i className="fas fa-users"></i> Candidatos ({candidatos.length})</h3>
              <button
                type="button"
                className="btn-add"
                onClick={() => {
                  setShowCandidateForm(true);
                  setNewCandidate({ nombre: '', foto: '', propuestas: '' });
                  setEditingCandidateIndex(null);
                }}
              >
                <i className="fas fa-plus"></i> Agregar Candidato
              </button>
            </div>

            {errors.candidatos && (
              <div className="alert-error">
                <i className="fas fa-exclamation-triangle"></i> {errors.candidatos}
              </div>
            )}

            {showCandidateForm && (
              <div className="candidate-form">
                <h4>{editingCandidateIndex !== null ? 'Editar' : 'Nuevo'} Candidato</h4>

                <div className="form-group">
                  <label>Nombre Completo *</label>
                  <input
                    type="text"
                    value={newCandidate.nombre}
                    onChange={(e) => setNewCandidate({ ...newCandidate, nombre: e.target.value })}
                    placeholder="Ing. Juan Pérez"
                  />
                </div>

                <div className="form-group">
                  <label>URL de Foto</label>
                  <input
                    type="text"
                    value={newCandidate.foto}
                    onChange={(e) => setNewCandidate({ ...newCandidate, foto: e.target.value })}
                    placeholder="https://ejemplo.com/foto.jpg"
                  />
                </div>

                <div className="form-group">
                  <label>Propuestas</label>
                  <textarea
                    value={newCandidate.propuestas}
                    onChange={(e) => setNewCandidate({ ...newCandidate, propuestas: e.target.value })}
                    placeholder="Describe las propuestas del candidato"
                    rows={3}
                  />
                </div>

                <div className="form-actions">
                  <button type="button" className="btn-save" onClick={handleAddCandidate}>
                    <i className="fas fa-check"></i> {editingCandidateIndex !== null ? 'Actualizar' : 'Agregar'}
                  </button>
                  <button
                    type="button"
                    className="btn-cancel"
                    onClick={() => {
                      setShowCandidateForm(false);
                      setNewCandidate({ nombre: '', foto: '', propuestas: '' });
                      setEditingCandidateIndex(null);
                    }}
                  >
                    <i className="fas fa-times"></i> Cancelar
                  </button>
                </div>
              </div>
            )}

            <div className="candidates-list">
              {candidatos.map((candidate, index) => (
                <div key={index} className="candidate-item">
                  <div className="candidate-avatar">
                    {candidate.foto ? (
                      <img src={candidate.foto} alt={candidate.nombre} />
                    ) : (
                      <i className="fas fa-user"></i>
                    )}
                  </div>
                  <div className="candidate-info">
                    <h4>{candidate.nombre}</h4>
                    {candidate.propuestas && <p>{candidate.propuestas.substring(0, 100)}...</p>}
                  </div>
                  <div className="candidate-actions">
                    <button type="button" onClick={() => handleEditCandidate(index)}>
                      <i className="fas fa-edit"></i>
                    </button>
                    <button type="button" onClick={() => handleDeleteCandidate(index)}>
                      <i className="fas fa-trash"></i>
                    </button>
                  </div>
                </div>
              ))}

              {candidatos.length === 0 && (
                <div className="no-candidates">
                  <i className="fas fa-users-slash"></i>
                  <p>No hay candidatos agregados</p>
                </div>
              )}
            </div>
          </div>

          {/* Botones de acción */}
          <div className="form-footer">
            <button type="submit" className="btn-submit" disabled={loading}>
              {loading ? (
                <>
                  <i className="fas fa-spinner fa-spin"></i> Guardando...
                </>
              ) : (
                <>
                  <i className="fas fa-save"></i> {isEditing ? 'Actualizar' : 'Crear'} Campaña
                </>
              )}
            </button>
            <button
              type="button"
              className="btn-cancel-form"
              onClick={() => navigate('/admin/dashboard')}
              disabled={loading}
            >
              Cancelar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CampaignForm;