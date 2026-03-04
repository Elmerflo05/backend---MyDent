const express = require('express');
const router = express.Router();
const verificarToken = require('../middleware/authMiddleware');
const {
  getAppointmentReminders,
  getAppointmentReminder,
  createNewAppointmentReminder,
  updateExistingAppointmentReminder,
  markAsSent,
  deleteExistingAppointmentReminder
} = require('../controllers/appointmentRemindersController');

// Middleware para validar los roles permitidos
const verificarRolesPermitidos = (req, res, next) => {
  const rol = req.user?.role_id;
  if (![1, 2, 3, 4, 5, 6].includes(rol)) {
    return res.status(403).json({ mensaje: 'Acceso denegado: Rol no autorizado' });
  }
  next();
};

// Aplicar middlewares a todas las rutas
router.use(verificarToken);
router.use(verificarRolesPermitidos);

// Rutas de recordatorios de citas
router.get('/', getAppointmentReminders);
router.get('/:id', getAppointmentReminder);
router.post('/', createNewAppointmentReminder);
router.put('/:id', updateExistingAppointmentReminder);
router.put('/:id/mark-sent', markAsSent);
router.delete('/:id', deleteExistingAppointmentReminder);

module.exports = router;
