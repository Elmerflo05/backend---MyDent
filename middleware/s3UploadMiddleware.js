/**
 * Middleware S3 Upload
 * Sube archivos desde el buffer de multer (memoryStorage) a Wasabi S3
 * Se ejecuta DESPUES de multer para cada ruta de upload
 */

const { uploadFile, generateFileKey } = require('../config/s3Client');

/**
 * Factory que crea un middleware para subir archivos a S3
 * @param {string|null} folder - Carpeta destino en S3 (ej: 'vouchers')
 * @param {object} [options] - Opciones adicionales
 * @param {string} [options.prefix] - Prefijo para el nombre del archivo
 * @param {function} [options.folderResolver] - Funcion (req, file) => string que resuelve la carpeta dinamicamente
 * @returns {function} Middleware de Express
 */
const s3Upload = (folder, options = {}) => {
  const { prefix = '', folderResolver } = options;

  return async (req, res, next) => {
    try {
      // Manejar req.file (single upload)
      if (req.file) {
        const targetFolder = folderResolver ? folderResolver(req, req.file) : folder;
        const s3Key = generateFileKey(targetFolder, req.file.originalname, prefix);

        await uploadFile(req.file.buffer, s3Key, req.file.mimetype);

        // Setear propiedades para compatibilidad con el resto del codigo
        req.file.s3Key = s3Key;
        req.file.filename = s3Key.split('/').pop();
        req.file.path = `/uploads/${s3Key}`;
      }

      // Manejar req.files (array upload)
      if (req.files && Array.isArray(req.files) && req.files.length > 0) {
        for (const file of req.files) {
          const targetFolder = folderResolver ? folderResolver(req, file) : folder;
          const s3Key = generateFileKey(targetFolder, file.originalname, prefix);

          await uploadFile(file.buffer, s3Key, file.mimetype);

          // Setear propiedades para compatibilidad
          file.s3Key = s3Key;
          file.filename = s3Key.split('/').pop();
          file.path = `/uploads/${s3Key}`;
        }
      }

      next();
    } catch (error) {
      console.error('[S3 Upload] Error al subir archivo a S3:', error);
      return res.status(500).json({
        success: false,
        error: 'Error al subir archivo al almacenamiento'
      });
    }
  };
};

module.exports = { s3Upload };
