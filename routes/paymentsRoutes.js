const express = require('express');
const router = express.Router();
const verificarToken = require('../middleware/authMiddleware');
const {
  getPayments,
  getPayment,
  createNewPayment,
  updateExistingPayment,
  deleteExistingPayment,
  addVoucherToPayment,
  removeVoucherFromPayment
} = require('../controllers/paymentsController');

// Middleware para validar los roles permitidos
// Roles: 1=SuperAdmin, 2=Admin, 3=Doctor, 4=Recepcionista, 5=LabTechnician, 6=ImagingTech, 7=Paciente
const verificarRolesPermitidos = (req, res, next) => {
  const rol = req.user?.role_id;
  // Permitir acceso a staff (1-6) y pacientes (7) para ver sus propios pagos
  if (![1, 2, 3, 4, 5, 6, 7].includes(rol)) {
    return res.status(403).json({ mensaje: 'Acceso denegado: Rol no autorizado' });
  }
  next();
};

// Middleware para restringir escritura solo a staff (no pacientes)
const verificarRolesEscritura = (req, res, next) => {
  const rol = req.user?.role_id;
  if (![1, 2, 3, 4, 5, 6].includes(rol)) {
    return res.status(403).json({ mensaje: 'Acceso denegado: Solo personal autorizado puede modificar' });
  }
  next();
};

// Aplicar middlewares a todas las rutas
router.use(verificarToken);
router.use(verificarRolesPermitidos);

// Rutas de pagos - Lectura (pacientes pueden acceder)
router.get('/', getPayments);
router.get('/:id', getPayment);

// Rutas de pagos - Escritura (solo staff)
router.post('/', verificarRolesEscritura, createNewPayment);
router.put('/:id', verificarRolesEscritura, updateExistingPayment);
router.delete('/:id', verificarRolesEscritura, deleteExistingPayment);

// Rutas de comprobantes - Escritura (solo staff)
router.post('/:id/vouchers', verificarRolesEscritura, addVoucherToPayment);
router.delete('/vouchers/:voucherId', verificarRolesEscritura, removeVoucherFromPayment);

module.exports = router;
