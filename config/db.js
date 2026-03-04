const { Pool, types } = require('pg');
const path = require('path');

// Configurar el parser de fechas DATE (OID 1082) para devolver strings sin conversión de timezone
// Esto evita problemas de desfase de fechas entre servidor UTC y clientes en otras zonas horarias
types.setTypeParser(1082, (val) => val);

// Cargar variables de entorno segun el entorno
const envFile = process.env.NODE_ENV === 'production'
  ? '.env'
  : '.env.development';

require('dotenv').config({
  path: path.resolve(__dirname, '..', envFile)
});

// Fallback a .env si no existe el archivo especifico
if (!process.env.DB_HOST && !process.env.DATABASE_URL) {
  require('dotenv').config({
    path: path.resolve(__dirname, '..', '.env')
  });
}

// Determinar si estamos en Railway (produccion) o local
const isProduction = process.env.NODE_ENV === 'production' || process.env.RAILWAY_ENVIRONMENT;

// Configuracion del pool de conexiones
const poolConfig = isProduction && process.env.DATABASE_URL
  ? {
      // Railway: usar DATABASE_URL directamente
      connectionString: process.env.DATABASE_URL,
      ssl: {
        rejectUnauthorized: false
      },
      timezone: 'America/Lima'
    }
  : {
      // Desarrollo local: usar variables individuales
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || 'sql',
      database: process.env.DB_NAME || 'db_my_dent_sistema_odontologico',
      port: parseInt(process.env.DB_PORT || '5432'),
      timezone: 'America/Lima'
    };

const pool = new Pool(poolConfig);

// Log de conexion (solo en desarrollo)
if (!isProduction) {
  console.log(`[DB] Conectando a: ${poolConfig.host || 'Railway'}:${poolConfig.port || 'default'} / ${poolConfig.database || 'via DATABASE_URL'}`);
}

module.exports = pool;
