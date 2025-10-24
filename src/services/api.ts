import axios, { AxiosError, type AxiosInstance } from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'https://votacion-backend-w7t6.onrender.com/api';

const api: AxiosInstance = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Variable para evitar multiples alertas
let sessionExpiredAlertShown = false;

// Interceptor para agregar token JWT a las peticiones
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Interceptor para manejar errores de autenticacion
api.interceptors.response.use(
  (response) => response,
  (error: AxiosError<any>) => {
    // Error 401: No autorizado o token expirado
    if (error.response?.status === 401) {
      const isExpired = error.response?.data?.expired || 
                       error.response?.data?.message?.includes('expirado') ||
                       error.response?.data?.message?.includes('expired');
      
      // Limpiar datos de sesión
      localStorage.removeItem('token');
      localStorage.removeItem('userRole');
      localStorage.removeItem('userName');
      
      // Mostrar alerta solo una vez
      if (!sessionExpiredAlertShown) {
        sessionExpiredAlertShown = true;
        
        if (isExpired) {
          alert('Tu sesión ha expirado. Por favor, inicia sesión nuevamente.');
        } else {
          alert('Tu sesión no es válida. Por favor, inicia sesión nuevamente.');
        }
        
        // Redirigir al login despues de un pequeño delay
        setTimeout(() => {
          sessionExpiredAlertShown = false; // Reset para futuras sesiones
          window.location.href = '/login';
        }, 500);
      }
    }
    
    return Promise.reject(error);
  }
);

// ========== AUTH ==========
export const authAPI = {
  register: async (data: {
    numeroColegiado: string;
    nombreCompleto: string;
    correo: string;
    dpi: string;
    fechaNacimiento: string;
    password: string;
  }) => {
    const response = await api.post('/auth/register', data);
    return response.data;
  },

  login: async (data: {
    numeroColegiado: string;
    dpi: string;
    fechaNacimiento: string;
    password: string;
    userType?: string;
  }) => {
    const response = await api.post('/auth/login', data);
    return response.data;
  },

  verify: async () => {
    const response = await api.get('/auth/verify');
    return response.data;
  },

  logout: async () => {
    try {
      const response = await api.post('/auth/logout');
      return response.data;
    } catch (error) {
      // Ignorar errores en logout (por si el token ya expiró)
      console.log('Error en logout (ignorado):', error);
    } finally {
      // Siempre limpiar el localStorage
      localStorage.removeItem('token');
      localStorage.removeItem('userRole');
      localStorage.removeItem('userName');
    }
  },
};

// ========== CAMPAIGNS ==========
export const campaignsAPI = {
  getAll: async () => {
    const response = await api.get('/campaigns');
    return response.data;
  },

  getById: async (id: string) => {
    const response = await api.get(`/campaigns/${id}`);
    return response.data;
  },

  checkVoted: async (id: string) => {
    const response = await api.get(`/campaigns/${id}/voted`);
    return response.data;
  },
};

// ========== VOTES ==========
export const votesAPI = {
  cast: async (data: { campaignId: string; candidateId: string }) => {
    const response = await api.post('/votes', data);
    return response.data;
  },

  getCampaignVotes: async (campaignId: string) => {
    const response = await api.get(`/votes/campaign/${campaignId}`);
    return response.data;
  },
};

// ========== ADMIN ==========
export const adminAPI = {
  // Campañas
  createCampaign: async (data: any) => {
    const response = await api.post('/admin/campaigns', data);
    return response.data;
  },

  getAllCampaigns: async () => {
    const response = await api.get('/admin/campaigns');
    return response.data;
  },

  updateCampaign: async (id: string, data: any) => {
    const response = await api.put(`/admin/campaigns/${id}`, data);
    return response.data;
  },

  deleteCampaign: async (id: string) => {
    const response = await api.delete(`/admin/campaigns/${id}`);
    return response.data;
  },

  toggleCampaign: async (id: string, estado: string) => {
    const response = await api.patch(`/admin/campaigns/${id}/toggle`, { estado });
    return response.data;
  },

  // Candidatos
  addCandidate: async (campaignId: string, data: any) => {
    const response = await api.post(`/admin/campaigns/${campaignId}/candidates`, data);
    return response.data;
  },

  updateCandidate: async (campaignId: string, candidateId: string, data: any) => {
    const response = await api.put(`/admin/campaigns/${campaignId}/candidates/${candidateId}`, data);
    return response.data;
  },

  deleteCandidate: async (campaignId: string, candidateId: string) => {
    const response = await api.delete(`/admin/campaigns/${campaignId}/candidates/${candidateId}`);
    return response.data;
  },

  // Reportes
  getGeneralReport: async () => {
    const response = await api.get('/admin/reports/general');
    return response.data;
  },

  getCampaignReport: async (id: string) => {
    const response = await api.get(`/admin/reports/campaign/${id}`);
    return response.data;
  },

  // Usuarios
  getVoters: async () => {
    const response = await api.get('/admin/users/voters');
    return response.data;
  },

  toggleUser: async (id: string, isActive: boolean) => {
    const response = await api.patch(`/admin/users/${id}/toggle`, { isActive });
    return response.data;
  },
};

export default api;