import express from 'express';
import jwt from 'jsonwebtoken';
import User from '../models/user.js';
import { authMiddleware, adminMiddleware, voterMiddleware } from '../middleware/auth-jwt.js';

const router = express.Router();

// Generar JWT
const generateToken = (userId, role) => {
  const expiresIn = process.env.JWT_EXPIRATION || '24h';
  return jwt.sign(
    { userId, role },
    process.env.JWT_SECRET || 'secret_key_default',
    { expiresIn }
  );
};

// Registro de votantes
router.post('/register', async (req, res) => {
  try {
    const {
      numeroColegiado,
      nombreCompleto,
      correo,
      dpi,
      fechaNacimiento,
      password
    } = req.body;

    // Validaciones
    if (!numeroColegiado || !nombreCompleto || !correo || !dpi || !fechaNacimiento || !password) {
      return res.status(400).json({
        success: false,
        message: 'Todos los campos son requeridos.'
      });
    }

    // Validar formato de DPI
    if (!/^\d{13}$/.test(dpi)) {
      return res.status(400).json({
        success: false,
        message: 'El DPI debe tener exactamente 13 dígitos.'
      });
    }

    // Validar formato de correo
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo)) {
      return res.status(400).json({
        success: false,
        message: 'Formato de correo electrónico inválido.'
      });
    }

    // Validar contraseña segura
    if (!/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/.test(password)) {
      return res.status(400).json({
        success: false,
        message: 'La contraseña debe tener al menos 8 caracteres, una mayúscula, una minúscula y un número.'
      });
    }

    // Verificar si ya existe el usuario
    const existingUser = await User.findOne({
      $or: [
        { numeroColegiado },
        { correo },
        { dpi }
      ]
    });

    if (existingUser) {
      let message = 'Ya existe un usuario con ';
      if (existingUser.numeroColegiado === numeroColegiado) {
        message += 'ese número de colegiado.';
      } else if (existingUser.correo === correo) {
        message += 'ese correo electrónico.';
      } else {
        message += 'ese DPI.';
      }
      return res.status(400).json({
        success: false,
        message
      });
    }

    // Crear nuevo usuario
    const user = new User({
      numeroColegiado,
      nombreCompleto,
      correo,
      dpi,
      fechaNacimiento: new Date(fechaNacimiento),
      password,
      role: 'voter'
    });

    await user.save();

    res.status(201).json({
      success: true,
      message: 'Usuario registrado exitosamente. Ya puedes iniciar sesión.'
    });

  } catch (error) {
    console.error('Error en registro:', error);
    res.status(500).json({
      success: false,
      message: 'Error al registrar usuario.',
      error: error.message
    });
  }
});

// Login
router.post('/login', async (req, res) => {
  try {
    const { numeroColegiado, dpi, fechaNacimiento, password, userType } = req.body;

    // Validaciones
    if (!numeroColegiado || !dpi || !fechaNacimiento || !password) {
      return res.status(400).json({
        success: false,
        message: 'Todos los campos son requeridos.'
      });
    }

    // Buscar usuario
    const user = await User.findOne({ numeroColegiado });

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Credenciales inválidas.'
      });
    }

    // Verificar DPI
    if (user.dpi !== dpi) {
      return res.status(401).json({
        success: false,
        message: 'Credenciales inválidas.'
      });
    }

    // Verificar fecha de nacimiento
    const userBirthDate = new Date(user.fechaNacimiento).toISOString().split('T')[0];
    const inputBirthDate = new Date(fechaNacimiento).toISOString().split('T')[0];
    
    if (userBirthDate !== inputBirthDate) {
      return res.status(401).json({
        success: false,
        message: 'Credenciales inválidas.'
      });
    }

    // Verificar contraseña
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Credenciales inválidas.'
      });
    }

    // Verificar tipo de usuario si se especificó
    if (userType && userType === 'admin' && user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'No tienes permisos de administrador.'
      });
    }

    if (!user.isActive) {
      return res.status(403).json({
        success: false,
        message: 'Tu cuenta ha sido desactivada.'
      });
    }

    // Generar token
    const token = generateToken(user._id, user.role);

    res.json({
      success: true,
      token,
      role: user.role,
      name: user.nombreCompleto,
      numeroColegiado: user.numeroColegiado,
      message: 'Inicio de sesión exitoso.'
    });

  } catch (error) {
    console.error('Error en login:', error);
    res.status(500).json({
      success: false,
      message: 'Error al iniciar sesión.',
      error: error.message
    });
  }
});

// Verificar token
router.get('/verify', authMiddleware, async (req, res) => {
  res.json({
    success: true,
    user: {
      id: req.user._id,
      numeroColegiado: req.user.numeroColegiado,
      nombreCompleto: req.user.nombreCompleto,
      correo: req.user.correo,
      role: req.user.role
    }
  });
});

// Cerrar sesión (opcional - del lado del cliente se elimina el token)
router.post('/logout', authMiddleware, async (req, res) => {
  res.json({
    success: true,
    message: 'Sesión cerrada exitosamente.'
  });
});

export default router;