import mongoose from 'mongoose';

/**
 * Configuración de conexión a MongoDB Atlas
 * Maneja la conexión a la base de datos con opciones optimizadas para producción
 */

// Opciones de conexión optimizadas
const options = {
  // Opciones recomendadas para Mongoose 7.x
  serverSelectionTimeoutMS: 5000, // Timeout si no puede conectar al servidor
  socketTimeoutMS: 45000, // Timeout para operaciones individuales
};

/**
 * Conecta a MongoDB Atlas
 * @returns {Promise<void>}
 */
const connectDB = async () => {
  try {
    // Obtener URI de las variables de entorno
    const mongoURI = process.env.MONGODB_URI;

    if (!mongoURI) {
      throw new Error(' MONGODB_URI no esta definida en las variables de entorno');
    }

    // Log de conexion (oculta credenciales)
    const uriPreview = mongoURI.includes('@') 
      ? `mongodb+srv://***:***@${mongoURI.split('@')[1].split('?')[0]}...`
      : 'mongodb://localhost...';
    
    console.log(` Conectando a MongoDB: ${uriPreview}`);

    // Conectar a MongoDB
    const conn = await mongoose.connect(mongoURI, options);

    console.log(` MongoDB conectado: ${conn.connection.host}`);
    console.log(` Base de datos: ${conn.connection.name}`);

    // Event listeners para el estado de la conexión
    mongoose.connection.on('disconnected', () => {
      console.log(' MongoDB desconectado');
    });

    mongoose.connection.on('error', (err) => {
      console.error(' Error en MongoDB:', err.message);
    });

    // Manejador de cierre graceful
    process.on('SIGINT', async () => {
      await mongoose.connection.close();
      console.log('🔌 MongoDB desconectado por cierre de aplicación');
      process.exit(0);
    });

  } catch (error) {
    console.error(' Error al conectar a MongoDB:', error.message);
    
    // En desarrollo, mostrar más detalles
    if (process.env.NODE_ENV === 'development') {
      console.error('Stack trace:', error.stack);
    }
    
    // Salir del proceso si no puede conectar
    process.exit(1);
  }
};

/**
 * Verifica si la conexión está activa
 * @returns {boolean}
 */
export const isConnected = () => {
  return mongoose.connection.readyState === 1;
};

/**
 * Cierra la conexión a MongoDB
 * @returns {Promise<void>}
 */
export const disconnectDB = async () => {
  try {
    await mongoose.connection.close();
    console.log(' Conexion a MongoDB cerrada correctamente');
  } catch (error) {
    console.error('Error al cerrar conexión:', error.message);
    throw error;
  }
};

export default connectDB;