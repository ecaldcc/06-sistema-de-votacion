import jwt from 'jsonwebtoken';
import User from '../models/user.js'

// Middleware para verificar JWT
export const authMiddleware = async (req, res, next) => {
  try {
    // Obtener token del header de autho
    const token = req.header('Authorization')?.replace('Bearer ', '');

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Acceso denegado. No se proporcionó token.'
      });
    }

    // Verificar token y codifica el token
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret_key_default');
    
    // Buscar usuario en la base de datos
    const user = await User.findById(decoded.userId).select('-password');
    
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Usuario no encontrado.'
      });
    }

    //verifica que el usuario este activo
    if (!user.isActive) {
      return res.status(401).json({
        success: false,
        message: 'Usuario inactivo.'
      });
    }

    // Agregar usuario a la request para usarlo a las rutas
    req.user = user;
    req.userId = decoded.userId;
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Token expirado. Por favor, inicia sesión nuevamente.',
        expired: true
      });
    }

    return res.status(401).json({
      success: false,
      message: 'Token inválido.'
    });
  }
};

// Middleware para verificar rol de administrador
export const adminMiddleware = (req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({
      success: false,
      message: 'Acceso denegado. Se requieren permisos de administrador.'
    });
  }
  next();
};

// Middleware para verificar rol de votante
export const voterMiddleware = (req, res, next) => {
  if (req.user.role !== 'voter' && req.user.role !== 'admin') {
    return res.status(403).json({
      success: false,
      message: 'Acceso denegado. Se requieren permisos de votante.'
    });
  }
  next();
};

