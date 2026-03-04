/**
 * Prisma Client Instance
 * Cliente singleton de Prisma para acceso type-safe a PostgreSQL
 *
 * Uso:
 * const prisma = require('./config/prisma');
 * const users = await prisma.users.findMany();
 */

const { PrismaClient } = require('@prisma/client');

// Singleton instance
let prisma;

if (process.env.NODE_ENV === 'production') {
  prisma = new PrismaClient();
} else {
  // En desarrollo, usar una instancia global para evitar múltiples conexiones
  if (!global.prisma) {
    global.prisma = new PrismaClient({
      log: ['query', 'info', 'warn', 'error'], // Logging en desarrollo
    });
  }
  prisma = global.prisma;
}

// Manejar cierre graceful
process.on('beforeExit', async () => {
  await prisma.$disconnect();
});

module.exports = prisma;
