const express = require('express');
const router = express.Router();
const verificarToken = require('../middleware/authMiddleware');
const {
  getPaymentMethods,
  getActivePaymentMethods,
  getPaymentMethod,
  createNewPaymentMethod,
  updateExistingPaymentMethod,
  deleteExistingPaymentMethod,
  uploadQrImage,
  deleteQrImage
} = require('../controllers/branchPaymentMethodsController');
const { uploadQrImage: uploadQrMiddleware } = require('../config/multerConfig');
const { s3Upload } = require('../middleware/s3UploadMiddleware');

// Middleware para roles administrativos (pueden gestionar métodos de pago)
const verificarRolesAdmin = (req, res, next) => {
  const rol = req.user?.role_id;
  // super_admin(1), admin(2)
  if (![1, 2].includes(rol)) {
    return res.status(403).json({
      success: false,
      error: 'Acceso denegado: Solo administradores pueden gestionar métodos de pago'
    });
  }
  next();
};

// Middleware para roles que pueden ver métodos de pago (incluyendo pacientes)
const verificarRolesLectura = (req, res, next) => {
  const rol = req.user?.role_id;
  // Todos los roles autenticados pueden ver métodos de pago activos
  if (![1, 2, 3, 4, 5, 6, 7].includes(rol)) {
    return res.status(403).json({
      success: false,
      error: 'Acceso denegado'
    });
  }
  next();
};

// Aplicar autenticación a todas las rutas
router.use(verificarToken);

// Rutas de LECTURA
router.get('/', verificarRolesLectura, getPaymentMethods);
router.get('/active', verificarRolesLectura, getActivePaymentMethods);
router.get('/:id', verificarRolesLectura, getPaymentMethod);

// Rutas de ESCRITURA (Solo admin)
router.post('/', verificarRolesAdmin, createNewPaymentMethod);
router.put('/:id', verificarRolesAdmin, updateExistingPaymentMethod);
router.delete('/:id', verificarRolesAdmin, deleteExistingPaymentMethod);

// Rutas de QR Image (Solo admin)
router.post('/:id/qr-image', verificarRolesAdmin, uploadQrMiddleware.single('qr_image'), s3Upload('payment-qr', { prefix: 'qr' }), uploadQrImage);
router.delete('/:id/qr-image', verificarRolesAdmin, deleteQrImage);

module.exports = router;
