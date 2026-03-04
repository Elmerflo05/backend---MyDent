const express = require('express');
const router = express.Router();
const verificarToken = require('../middleware/authMiddleware');
const validateAppointmentDuration = require('../middlewares/validateAppointmentDuration');
const {
  validateAppointmentPermission,
  validate24HourCancellation,
  validateWorkingHours,
  rateLimitReschedule
} = require('../middlewares/validateAppointmentPermissions');
const {
  getAppointments,
  getAppointment,
  createNewAppointment,
  updateExistingAppointment,
  cancelExistingAppointment,
  markAppointmentAsArrived,
  markAppointmentAsCompleted,
  deleteExistingAppointment,
  approveAppointmentRequest,
  rejectAppointmentRequest,
  markAppointmentAsNoShow,
  rescheduleAppointment,
  approveReschedule,
  rejectReschedule,
  resubmitVoucher
} = require('../controllers/appointmentsController');

// Middleware para validar los roles permitidos
const verificarRolesPermitidos = (req, res, next) => {
  const rol = req.user?.role_id;
  // Roles permitidos: 1-7 (incluyendo pacientes = 7)
  if (![1, 2, 3, 4, 5, 6, 7].includes(rol)) {
    return res.status(403).json({ mensaje: 'Acceso denegado: Rol no autorizado' });
  }
  next();
};

// Aplicar middlewares a todas las rutas
router.use(verificarToken);
router.use(verificarRolesPermitidos);

// Rutas de citas
router.get('/', getAppointments);
router.get('/:id', getAppointment);

// Validar duración y horarios laborales en creación y actualización de citas
router.post('/', validateAppointmentDuration, validateWorkingHours, createNewAppointment);
router.put('/:id', validateAppointmentDuration, validateWorkingHours, updateExistingAppointment);

// Rutas de cambio de estado (no requieren validación de duración)
// FIX GAP #3: Agregar validación de permisos en cancelación
// Nota: Incluir nombres en español (BD) e inglés (código legacy)
router.put(
  '/:id/cancel',
  validateAppointmentPermission([
    'super_admin', 'Super Administrador',
    'admin', 'Administrador de Sede',
    'receptionist', 'Recepcionista',
    'doctor', 'Odontólogo',
    'patient', 'Paciente'
  ]),
  validate24HourCancellation,
  cancelExistingAppointment
);
router.put('/:id/arrived', markAppointmentAsArrived);
router.put('/:id/completed', markAppointmentAsCompleted);

// Rutas de aprobación (solo Superadmin, Admin Sede, Recepcionista)
router.put('/:id/approve', approveAppointmentRequest);
router.put('/:id/reject', rejectAppointmentRequest);

// Nuevas rutas de gestión de estados con validaciones de permisos
router.post(
  '/:id/mark-no-show',
  validateAppointmentPermission(['admin', 'Administrador de Sede', 'receptionist', 'Recepcionista']),
  markAppointmentAsNoShow
);

router.post(
  '/:id/reschedule',
  validateAppointmentPermission([
    'admin', 'Administrador de Sede',
    'receptionist', 'Recepcionista',
    'doctor', 'Odontólogo',
    'patient', 'Paciente'
  ]),
  validateAppointmentDuration,
  validateWorkingHours,
  rateLimitReschedule,
  rescheduleAppointment
);

router.post(
  '/:id/approve-reschedule',
  validateAppointmentPermission(['admin', 'Administrador de Sede', 'receptionist', 'Recepcionista']),
  approveReschedule
);

router.post(
  '/:id/reject-reschedule',
  validateAppointmentPermission(['admin', 'Administrador de Sede', 'receptionist', 'Recepcionista']),
  rejectReschedule
);

router.post(
  '/:id/resubmit-voucher',
  validateAppointmentPermission(['patient', 'Paciente']),
  resubmitVoucher
);

router.delete('/:id', deleteExistingAppointment);

module.exports = router;
