/**
 * Rutas para manejo de uploads de archivos
 */

const express = require('express');
const router = express.Router();
const { uploadVoucher: uploadVoucherController, deleteVoucher } = require('../controllers/uploadsController');
const { uploadVoucher: uploadVoucherMiddleware } = require('../config/multerConfig');
const { s3Upload } = require('../middleware/s3UploadMiddleware');
const verificarToken = require('../middleware/authMiddleware');

/**
 * POST /api/uploads/voucher
 * Subir voucher de pago
 * Requiere autenticación
 */
router.post('/voucher', verificarToken, uploadVoucherMiddleware.single('voucher'), s3Upload('vouchers', { prefix: 'voucher' }), uploadVoucherController);

/**
 * DELETE /api/uploads/voucher/:filename
 * Eliminar voucher de pago
 * Requiere autenticación
 */
router.delete('/voucher/:filename', verificarToken, deleteVoucher);

module.exports = router;
