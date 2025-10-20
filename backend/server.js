import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

// Importar configuración de base de datos
import connectDB from './config/conexion.js';

// Importar rutas
import authRoutes from './routes/auth.js';
import campaignRoutes from './routes/campaingR.js';
import voteRoutes from './routes/voteR.js';
import adminRoutes from './routes/adminR.js';

// Cargar variables de entorno
dotenv.config();

const app = express();

// ============================================
// MIDDLEWARE
// ============================================

// CORS - Configuración para producción y desarrollo
const corsOptions = {
  origin: process.env.NODE_ENV === 'production' 
    ? process.env.FRONTEND_URL  // URL de tu frontend en producción
    : ['http://localhost:5174', 'http://localhost:5173'], // URLs de desarrollo
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
};

app.use(cors(corsOptions));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Middleware de logging en desarrollo
if (process.env.NODE_ENV === 'development') {
  app.use((req, res, next) => {
    console.log(`${req.method} ${req.path}`);
    next();
  });
}

// ============================================
// CONEXIÓN A BASE DE DATOS
// ============================================

// Conectar a MongoDB antes de iniciar el servidor
await connectDB();

// ============================================
// RUTAS
// ============================================

// Ruta raiz
app.get('/', (req, res) => {
  res.json({ 
    success: true,
    message: 'API Sistema de Votacion - Colegio de Ingenieros',
    version: '1.0.0',
    environment: process.env.NODE_ENV || 'development'
  });
});

// Health check - útil para Render
app.get('/health', (req, res) => {
  res.json({ 
    success: true,
    status: 'healthy',
    timestamp: new Date().toISOString()
  });
});

// Rutas de la API
app.use('/api/auth', authRoutes);
app.use('/api/campaigns', campaignRoutes);
app.use('/api/votes', voteRoutes);
app.use('/api/admin', adminRoutes);

// Ruta 404 - No encontrada
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'Ruta no encontrada'
  });
});

// ============================================
// MANEJO DE ERRORES GLOBAL
// ============================================

app.use((err, req, res, next) => {
  console.error(' Error capturado:', err.stack);
  
  res.status(err.status || 500).json({ 
    success: false, 
    message: err.message || 'Error interno del servidor',
    error: process.env.NODE_ENV === 'development' ? err.stack : undefined
  });
});

// ============================================
// INICIAR SERVIDOR
// ============================================

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log('═'.repeat(50));
  console.log(`Servidor corriendo en puerto ${PORT}`);
  console.log(`Entorno: ${process.env.NODE_ENV || 'development'}`);
  console.log(`URL: http://localhost:${PORT}`);
  console.log('═'.repeat(50));
});