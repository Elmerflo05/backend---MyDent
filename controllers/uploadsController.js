/**
 * Controlador para manejo de uploads de archivos
 */

const { deleteFile } = require('../config/s3Client');

/**
 * Subir voucher de pago
 * POST /api/uploads/voucher
 */
const uploadVoucher = async (req, res) => {
  try {
    // Verificar que se haya subido un archivo
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No se recibió ningún archivo'
      });
    }

    // Obtener información del archivo
    const file = req.file;
    const filePath = `/uploads/vouchers/${file.filename}`;

    // Responder con la ruta del archivo
    return res.status(200).json({
      success: true,
      message: 'Voucher subido exitosamente',
      data: {
        filename: file.filename,
        originalName: file.originalname,
        filePath: filePath,
        fileSize: file.size,
        mimeType: file.mimetype
      }
    });
  } catch (error) {
    console.error('Error al subir voucher:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al subir el voucher',
      error: error.message
    });
  }
};

/**
 * Eliminar un archivo de voucher
 * DELETE /api/uploads/voucher/:filename
 */
const deleteVoucher = async (req, res) => {
  try {
    const { filename } = req.params;

    if (!filename) {
      return res.status(400).json({
        success: false,
        message: 'Nombre de archivo requerido'
      });
    }

    // Construir la key de S3
    const s3Key = `vouchers/${filename}`;

    // Eliminar el archivo de S3
    await deleteFile(s3Key);

    return res.status(200).json({
      success: true,
      message: 'Voucher eliminado exitosamente'
    });
  } catch (error) {
    console.error('Error al eliminar voucher:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al eliminar el voucher',
      error: error.message
    });
  }
};

module.exports = {
  uploadVoucher,
  deleteVoucher
};
