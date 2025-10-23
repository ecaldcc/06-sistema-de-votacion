import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Obtener la ruta del directorio actual
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Cargar variables de entorno desde la raíz del proyecto
dotenv.config({ path: path.join(__dirname, '../.env') });

// Importar configuración de base de datos
import connectDB, { disconnectDB } from '../config/conexion.js';

// Importar modelos
import User from '../models/user.js';
import Campaign from '../models/campaing.js';
import Vote from '../models/vote.js';

const seedDatabase = async () => {
  try {
    console.log('Iniciando seed de base de datos...\n');

    // Conectar a MongoDB
    await connectDB();

    // Limpiar base de datos
    console.log('Limpiando base de datos...');
    await User.deleteMany({});
    await Campaign.deleteMany({});
    await Vote.deleteMany({});
    console.log('Base de datos limpiada\n');

    // ========================================
    // CREAR USUARIO ADMINISTRADOR
    // ========================================
    console.log(' Creando usuario administrador...');
    const admin = await User.create({
      numeroColegiado: 'ADMIN001',
      nombreCompleto: 'Administrador Sistema',
      correo: 'admin@colegio.gt',
      dpi: '1234567890101',
      fechaNacimiento: new Date('1990-01-01'),
      password: 'Admin123',
      role: 'admin',
      isActive: true
    });
    console.log('Administrador creado\n');

    // ========================================
    // CREAR USUARIOS VOTANTES
    // ========================================
    console.log(' Creando usuarios votantes...');
    
    const voter1 = await User.create({
      numeroColegiado: 'ING001',
      nombreCompleto: 'Henry Cabrera',
      correo: 'hcabrera@example.com',
      dpi: '2345678901234',
      fechaNacimiento: new Date('1995-03-15'),
      password: 'Voter123',
      role: 'voter',
      isActive: true
    });

    const voter2 = await User.create({
      numeroColegiado: 'ING002',
      nombreCompleto: 'Alvaro Gonzalez',
      correo: 'agonzalez@example.com',
      dpi: '3456789012345',
      fechaNacimiento: new Date('1993-07-22'),
      password: 'Voter123',
      role: 'voter',
      isActive: true
    });

    const voter3 = await User.create({
      numeroColegiado: 'ING003',
      nombreCompleto: 'Walter de Leon',
      correo: 'wdeleon@example.com',
      dpi: '4567890123456',
      fechaNacimiento: new Date('1998-11-08'),
      password: 'Voter123',
      role: 'voter',
      isActive: true
    });

    console.log(' 3 votantes creados\n');

    // ========================================
    // CREAR CAMPAÑA DE EJEMPLO
    // ========================================
    console.log(' Creando campaña de ejemplo...');
    
    const now = new Date();
    const fechaFin = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // 7 días

    const campaign = await Campaign.create({
      titulo: 'Eleccion Junta Directiva 2025',
      descripcion: 'Eleccion de la nueva Junta Directiva del Colegio de Ingenieros de Guatemala para el periodo 2025-2027',
      votosDisponibles: 1,
      estado: 'habilitada',
      fechaInicio: now,
      fechaFin: fechaFin,
      candidatos: [
        {
          nombre: 'Ing. Henry Peak',
          foto: 'https://via.placeholder.com/150',
          propuestas: 'Modernizacion de procesos y digitalización del colegio.',
          votos: 0
        },
        {
          nombre: 'Ing. Alvaro Gonzalez',
          foto: 'https://via.placeholder.com/150',
          propuestas: 'Fortalecimiento de la capacitación continua para colegiados.',
          votos: 0
        },
        {
          nombre: 'Ing. Walter de Leon',
          foto: 'https://via.placeholder.com/150',
          propuestas: 'Expansion de convenios con universidades e industria.',
          votos: 0
        },
        {
          nombre: 'Ing. Jose Canche',
          foto: 'https://via.placeholder.com/150',
          propuestas: 'Mejora en servicios de certificacion y tramitologia.',
          votos: 0
        }
      ],
      totalVotos: 0,
      createdBy: admin._id
    });

    console.log(' Campaña creada\n');

    // ========================================
    // RESUMEN
    // ========================================
    console.log('═'.repeat(60));
    console.log(' SEED COMPLETADO EXITOSAMENTE');
    console.log('═'.repeat(60));
    console.log('\n CREDENCIALES DE PRUEBA:\n');
    
    console.log('ADMINISTRADOR:');
    console.log('Número de Colegiado: ADMIN001');
    console.log('DPI: 1234567890101');
    console.log('Fecha Nacimiento: 1990-01-01');
    console.log('Password: Admin123\n');
    
    console.log('VOTANTE 1:');
    console.log('Numero de Colegiado: ING001');
    console.log('DPI: 2345678901234');
    console.log('Fecha Nacimiento: 1995-03-15');
    console.log('Password: Voter123\n');
    
    console.log('VOTANTE 2:');
    console.log('Número de Colegiado: ING002');
    console.log('DPI: 3456789012345');
    console.log('Fecha Nacimiento: 1993-07-22');
    console.log('Password: Voter123\n');
    
    console.log('VOTANTE 3:');
    console.log('Numero de Colegiado: ING003');
    console.log('DPI: 4567890123456');
    console.log('Fecha Nacimiento: 1998-11-08');
    console.log('Password: Voter123\n');
    
    console.log('═'.repeat(60));

    // Cerrar conexión
    await disconnectDB();
    process.exit(0);

  } catch (error) {
    console.error(' Error en seed:', error);
    await disconnectDB();
    process.exit(1);
  }
};

seedDatabase();