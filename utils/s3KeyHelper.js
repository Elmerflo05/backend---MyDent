/**
 * Helper para convertir rutas de BD a keys de S3
 */

/**
 * Extrae la key de S3 desde una ruta almacenada en la BD
 * Ejemplo: "/uploads/vouchers/file.jpg" -> "vouchers/file.jpg"
 *          "uploads/vouchers/file.jpg"  -> "vouchers/file.jpg"
 * @param {string} dbPath - Ruta almacenada en la base de datos
 * @returns {string|null} Key de S3 o null si la ruta es invalida
 */
const extractS3Key = (dbPath) => {
  if (!dbPath) return null;
  // Remover prefijo /uploads/ o uploads/
  return dbPath.replace(/^\/?uploads\//, '');
};

module.exports = { extractS3Key };
