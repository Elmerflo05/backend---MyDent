/**
 * Configuracion de Multer para imagenes del examen clinico
 * Usa memoryStorage para subir a S3 via middleware posterior
 *
 * Carpetas destino en S3:
 * - Extraoral: integral_atention/step_1_clinical_examination/extraoral_clinical_examination
 * - Intraoral: integral_atention/step_1_clinical_examination/intraoral_clinical_examination
 *
 * Formato de nombre: {patient_id}_{consultation_id}_{timestamp}_{originalname}
 */

const multer = require('multer');
const path = require('path');
const { deleteFile } = require('./s3Client');
const { extractS3Key } = require('../utils/s3KeyHelper');

// Storage en memoria (el buffer se sube a S3 en el middleware s3Upload)
const memoryStorage = multer.memoryStorage();

/**
 * Filtro de archivos para imagenes clinicas
 * Permite: JPG, JPEG, PNG, GIF, WEBP
 */
const clinicalExamImageFilter = (req, file, cb) => {
  const allowedMimeTypes = [
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/gif',
    'image/webp'
  ];

  const allowedExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
  const ext = path.extname(file.originalname).toLowerCase();

  if (allowedMimeTypes.includes(file.mimetype) || allowedExtensions.includes(ext)) {
    cb(null, true);
  } else {
    cb(new Error('Tipo de archivo no permitido. Solo se permiten imagenes JPG, PNG, GIF o WEBP.'), false);
  }
};

/**
 * Configuracion de Multer para imagenes extraorales
 */
const uploadExtraoralImages = multer({
  storage: memoryStorage,
  fileFilter: clinicalExamImageFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB maximo por archivo
    files: 10 // Maximo 10 archivos por subida
  }
});

/**
 * Configuracion de Multer para imagenes intraorales
 */
const uploadIntraoralImages = multer({
  storage: memoryStorage,
  fileFilter: clinicalExamImageFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB maximo por archivo
    files: 10 // Maximo 10 archivos por subida
  }
});

/**
 * Funcion helper para obtener la ruta relativa de una imagen
 * @param {string} filename - Nombre del archivo
 * @param {'extraoral' | 'intraoral'} type - Tipo de examen
 * @returns {string} Ruta relativa del archivo
 */
const getImageRelativePath = (filename, type) => {
  const basePath = 'uploads/integral_atention/step_1_clinical_examination';
  if (type === 'extraoral') {
    return `${basePath}/extraoral_clinical_examination/${filename}`;
  } else {
    return `${basePath}/intraoral_clinical_examination/${filename}`;
  }
};

/**
 * Funcion para eliminar una imagen de S3
 * @param {string} relativePath - Ruta relativa del archivo (ej: uploads/integral_atention/.../file.jpg)
 * @returns {Promise<boolean>} true si se elimino correctamente
 */
const deleteImage = async (relativePath) => {
  try {
    const s3Key = extractS3Key(relativePath);
    if (!s3Key) return false;
    await deleteFile(s3Key);
    return true;
  } catch (error) {
    console.error('Error al eliminar imagen de S3:', error);
    return false;
  }
};

module.exports = {
  uploadExtraoralImages,
  uploadIntraoralImages,
  getImageRelativePath,
  deleteImage
};
