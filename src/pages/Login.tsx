import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import '../styles/Login.scss';

interface LoginFormData {
  numeroColegiado: string;
  dpi: string;
  fechaNacimiento: string;
  password: string;
}

interface RegisterFormData {
  numeroColegiado: string;
  nombreCompleto: string;
  correo: string;
  dpi: string;
  fechaNacimiento: string;
  password: string;
  confirmPassword: string;
}

console.log('VITE_API_URL =', import.meta.env.VITE_API_URL);

const Login: React.FC = () => {
  const navigate = useNavigate();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [userType, setUserType] = useState<'voter' | 'admin' | null>(null);
  
  const [loginData, setLoginData] = useState<LoginFormData>({
    numeroColegiado: '',
    dpi: '',
    fechaNacimiento: '',
    password: ''
  });

  const [registerData, setRegisterData] = useState<RegisterFormData>({
    numeroColegiado: '',
    nombreCompleto: '',
    correo: '',
    dpi: '',
    fechaNacimiento: '',
    password: '',
    confirmPassword: ''
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  // Validaciones
  const validateDPI = (dpi: string): boolean => {
    return /^\d{13}$/.test(dpi);
  };

  const validateEmail = (email: string): boolean => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  const validatePassword = (password: string): boolean => {
    // Al menos 8 caracteres, una mayúscula, una minúscula y un número
    return /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/.test(password);
  };

  const handleQuickAccess = (type: 'voter' | 'admin') => {
    setUserType(type);
    setMode('login');
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    setLoading(true);

    const newErrors: Record<string, string> = {};

    if (!loginData.numeroColegiado) {
      newErrors.numeroColegiado = 'El número de colegiado es requerido';
    }

    if (!loginData.dpi || !validateDPI(loginData.dpi)) {
      newErrors.dpi = 'El DPI debe tener 13 dígitos';
    }

    if (!loginData.fechaNacimiento) {
      newErrors.fechaNacimiento = 'La fecha de nacimiento es requerida';
    }

    if (!loginData.password) {
      newErrors.password = 'La contraseña es requerida';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      setLoading(false);
      return;
    }

    try {
      // Aquí iría la llamada al backend
      const response = await fetch(`${import.meta.env.VITE_API_URL}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...loginData,
          userType: userType || 'voter'
        }),
      });

      const data = await response.json();

      if (response.ok) {
        // Guardar token JWT
        localStorage.setItem('token', data.token);
        localStorage.setItem('userRole', data.role);
        localStorage.setItem('userName', data.name);

        // Redirigir según el rol
        if (data.role === 'admin') {
          navigate('/admin/dashboard');
        } else {
          navigate('/voter/campaigns');
        }
      } else {
        setErrors({ general: data.message || 'Error al iniciar sesión' });
      }
    } catch (error) {
      setErrors({ general: 'Error de conexión. Intente nuevamente.' });
    } finally {
      setLoading(false);
    }
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    setLoading(true);

    const newErrors: Record<string, string> = {};

    if (!registerData.numeroColegiado) {
      newErrors.numeroColegiado = 'El número de colegiado es requerido';
    }

    if (!registerData.nombreCompleto) {
      newErrors.nombreCompleto = 'El nombre completo es requerido';
    }

    if (!registerData.correo || !validateEmail(registerData.correo)) {
      newErrors.correo = 'Ingrese un correo electrónico válido';
    }

    if (!registerData.dpi || !validateDPI(registerData.dpi)) {
      newErrors.dpi = 'El DPI debe tener 13 dígitos';
    }

    if (!registerData.fechaNacimiento) {
      newErrors.fechaNacimiento = 'La fecha de nacimiento es requerida';
    }

    if (!registerData.password || !validatePassword(registerData.password)) {
      newErrors.password = 'La contraseña debe tener al menos 8 caracteres, una mayúscula, una minúscula y un número';
    }

    if (registerData.password !== registerData.confirmPassword) {
      newErrors.confirmPassword = 'Las contraseñas no coinciden';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      setLoading(false);
      return;
    }

    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(registerData),
      });

      const data = await response.json();

      if (response.ok) {
        alert('Registro exitoso. Ahora puedes iniciar sesion.');
        setMode('login');
        setRegisterData({
          numeroColegiado: '',
          nombreCompleto: '',
          correo: '',
          dpi: '',
          fechaNacimiento: '',
          password: '',
          confirmPassword: ''
        });
      } else {
        setErrors({ general: data.message || 'Error al registrarse' });
      }
    } catch (error) {
      setErrors({ general: 'Error de conexión. Intente nuevamente.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-container">
        <div className="login-content">
          {/* Lado izquierdo - Información */}
          <div className="login-left">
            <div className="login-brand">
              <i className="fas fa-vote-yea"></i>
              <h2>Sistema de Votación</h2>
              <p>Colegio de Ingenieros de Guatemala</p>
            </div>
            <div className="login-info">
              <p>Plataforma segura para la elección de la Junta Directiva</p>
              <div className="feature-list">
                <div className="feature-item">
                  <i className="fas fa-shield-alt"></i>
                  <span>Sistema seguro y confiable</span>
                </div>
                <div className="feature-item">
                  <i className="fas fa-chart-bar"></i>
                  <span>Resultados en tiempo real</span>
                </div>
                <div className="feature-item">
                  <i className="fas fa-mobile-alt"></i>
                  <span>Acceso desde cualquier dispositivo</span>
                </div>
              </div>
            </div>
          </div>

          {/* Lado derecho - Formularios */}
          <div className="login-right">
            <div className="login-header">
              <h3>{mode === 'login' ? 'Iniciar Sesion' : 'Registrarse'}</h3>
            </div>

            {/* Selector de modo */}
            {!userType && mode === 'login' && (
              <div className="mode-selector">
                <button
                  className={`mode-btn ${mode === 'login' ? 'active' : ''}`}
                  onClick={() => setMode('login')}
                >
                  Iniciar Sesión
                </button>
                <button
                  className={`mode-btn ${mode === 'register' ? 'active' : ''}`}
                  onClick={() => setMode('register')}
                >
                  Registrarse
                </button>
              </div>
            )}

            {/* Selección rápida de usuario */}
            {!userType && mode === 'login' && (
              <div className="user-selection">
                <p className="selection-label">Acceso rápido:</p>
                
                <div className="user-card" onClick={() => handleQuickAccess('voter')}>
                  <div className="user-avatar voter">
                    <i className="fas fa-user"></i>
                  </div>
                  <div className="user-info">
                    <h5>Ingeniero Colegiado</h5>
                    <small>Acceso para votantes</small>
                  </div>
                </div>

                <div className="user-card" onClick={() => handleQuickAccess('admin')}>
                  <div className="user-avatar admin">
                    <i className="fas fa-user-shield"></i>
                  </div>
                  <div className="user-info">
                    <h5>Administrador</h5>
                    <small>Gestión de campañas y votaciones</small>
                  </div>
                </div>
              </div>
            )}

            {/* Formulario de Login */}
            {userType && mode === 'login' && (
              <form onSubmit={handleLoginSubmit} className="login-form">
                {errors.general && (
                  <div className="alert alert-danger">{errors.general}</div>
                )}

                <div className="form-group">
                  <label>Número de Colegiado</label>
                  <input
                    type="text"
                    className={`form-control ${errors.numeroColegiado ? 'error' : ''}`}
                    value={loginData.numeroColegiado}
                    onChange={(e) => setLoginData({ ...loginData, numeroColegiado: e.target.value })}
                    placeholder="Ingrese su número de colegiado"
                  />
                  {errors.numeroColegiado && (
                    <span className="error-message">{errors.numeroColegiado}</span>
                  )}
                </div>

                <div className="form-group">
                  <label>DPI</label>
                  <input
                    type="text"
                    className={`form-control ${errors.dpi ? 'error' : ''}`}
                    value={loginData.dpi}
                    onChange={(e) => setLoginData({ ...loginData, dpi: e.target.value })}
                    placeholder="13 dígitos"
                    maxLength={13}
                  />
                  {errors.dpi && (
                    <span className="error-message">{errors.dpi}</span>
                  )}
                </div>

                <div className="form-group">
                  <label>Fecha de Nacimiento</label>
                  <input
                    type="date"
                    className={`form-control ${errors.fechaNacimiento ? 'error' : ''}`}
                    value={loginData.fechaNacimiento}
                    onChange={(e) => setLoginData({ ...loginData, fechaNacimiento: e.target.value })}
                  />
                  {errors.fechaNacimiento && (
                    <span className="error-message">{errors.fechaNacimiento}</span>
                  )}
                </div>

                <div className="form-group">
                  <label>Contraseña</label>
                  <input
                    type="password"
                    className={`form-control ${errors.password ? 'error' : ''}`}
                    value={loginData.password}
                    onChange={(e) => setLoginData({ ...loginData, password: e.target.value })}
                    placeholder="Ingrese su contraseña"
                  />
                  {errors.password && (
                    <span className="error-message">{errors.password}</span>
                  )}
                </div>

                <button 
                  type="submit" 
                  className="btn-submit"
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <i className="fas fa-spinner fa-spin"></i> Ingresando...
                    </>
                  ) : (
                    <>
                      <i className="fas fa-sign-in-alt"></i> Ingresar
                    </>
                  )}
                </button>

                <button 
                  type="button" 
                  className="btn-back"
                  onClick={() => setUserType(null)}
                >
                  <i className="fas fa-arrow-left"></i> Volver a selección
                </button>
              </form>
            )}

            {/* Formulario de Registro */}
            {mode === 'register' && (
              <form onSubmit={handleRegisterSubmit} className="register-form">
                {errors.general && (
                  <div className="alert alert-danger">{errors.general}</div>
                )}

                <div className="form-group">
                  <label>Número de Colegiado *</label>
                  <input
                    type="text"
                    className={`form-control ${errors.numeroColegiado ? 'error' : ''}`}
                    value={registerData.numeroColegiado}
                    onChange={(e) => setRegisterData({ ...registerData, numeroColegiado: e.target.value })}
                    placeholder="Número único de colegiado"
                  />
                  {errors.numeroColegiado && (
                    <span className="error-message">{errors.numeroColegiado}</span>
                  )}
                </div>

                <div className="form-group">
                  <label>Nombre Completo *</label>
                  <input
                    type="text"
                    className={`form-control ${errors.nombreCompleto ? 'error' : ''}`}
                    value={registerData.nombreCompleto}
                    onChange={(e) => setRegisterData({ ...registerData, nombreCompleto: e.target.value })}
                    placeholder="Nombre y apellidos"
                  />
                  {errors.nombreCompleto && (
                    <span className="error-message">{errors.nombreCompleto}</span>
                  )}
                </div>

                <div className="form-group">
                  <label>Correo Electrónico *</label>
                  <input
                    type="email"
                    className={`form-control ${errors.correo ? 'error' : ''}`}
                    value={registerData.correo}
                    onChange={(e) => setRegisterData({ ...registerData, correo: e.target.value })}
                    placeholder="correo@ejemplo.com"
                  />
                  {errors.correo && (
                    <span className="error-message">{errors.correo}</span>
                  )}
                </div>

                <div className="form-group">
                  <label>DPI *</label>
                  <input
                    type="text"
                    className={`form-control ${errors.dpi ? 'error' : ''}`}
                    value={registerData.dpi}
                    onChange={(e) => setRegisterData({ ...registerData, dpi: e.target.value })}
                    placeholder="13 dígitos"
                    maxLength={13}
                  />
                  {errors.dpi && (
                    <span className="error-message">{errors.dpi}</span>
                  )}
                </div>

                <div className="form-group">
                  <label>Fecha de Nacimiento *</label>
                  <input
                    type="date"
                    className={`form-control ${errors.fechaNacimiento ? 'error' : ''}`}
                    value={registerData.fechaNacimiento}
                    onChange={(e) => setRegisterData({ ...registerData, fechaNacimiento: e.target.value })}
                  />
                  {errors.fechaNacimiento && (
                    <span className="error-message">{errors.fechaNacimiento}</span>
                  )}
                </div>

                <div className="form-group">
                  <label>Contraseña *</label>
                  <input
                    type="password"
                    className={`form-control ${errors.password ? 'error' : ''}`}
                    value={registerData.password}
                    onChange={(e) => setRegisterData({ ...registerData, password: e.target.value })}
                    placeholder="Mínimo 8 caracteres"
                  />
                  {errors.password && (
                    <span className="error-message">{errors.password}</span>
                  )}
                  <small className="form-hint">
                    Debe contener al menos 8 caracteres, una mayúscula, una minúscula y un número
                  </small>
                </div>

                <div className="form-group">
                  <label>Confirmar Contraseña *</label>
                  <input
                    type="password"
                    className={`form-control ${errors.confirmPassword ? 'error' : ''}`}
                    value={registerData.confirmPassword}
                    onChange={(e) => setRegisterData({ ...registerData, confirmPassword: e.target.value })}
                    placeholder="Repita su contraseña"
                  />
                  {errors.confirmPassword && (
                    <span className="error-message">{errors.confirmPassword}</span>
                  )}
                </div>

                <button 
                  type="submit" 
                  className="btn-submit"
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <i className="fas fa-spinner fa-spin"></i> Registrando...
                    </>
                  ) : (
                    <>
                      <i className="fas fa-user-plus"></i> Registrarse
                    </>
                  )}
                </button>

                <button 
                  type="button" 
                  className="btn-back"
                  onClick={() => setMode('login')}
                >
                  ¿Ya tienes cuenta? Inicia sesión
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;