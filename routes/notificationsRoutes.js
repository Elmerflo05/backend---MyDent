const express = require('express');
const router = express.Router();
const verificarToken = require('../middleware/authMiddleware');
const {
  getNotifications,
  getNotification,
  createNewNotification,
  updateExistingNotification,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  getUnreadCount,
  deleteExistingNotification,
  generatePaymentReminders,
  createNewPaymentNotification
} = require('../controllers/notificationsController');

// Middleware para validar los roles permitidos
const verificarRolesPermitidos = (req, res, next) => {
  const rol = req.user?.role_id;
  if (![1, 2, 3, 4, 5, 6, 7].includes(rol)) {
    return res.status(403).json({ mensaje: 'Acceso denegado: Rol no autorizado' });
  }
  next();
};

// Middleware para validar roles administrativos (superadmin, admin, recepcionista)
const verificarRolesAdmin = (req, res, next) => {
  const rol = req.user?.role_id;
  if (![1, 2, 3].includes(rol)) {
    return res.status(403).json({ mensaje: 'Acceso denegado: Solo administradores' });
  }
  next();
};

// Aplicar middlewares a todas las rutas
router.use(verificarToken);
router.use(verificarRolesPermitidos);

// Rutas de notificaciones
router.get('/', getNotifications);
router.get('/unread-count', getUnreadCount);
router.get('/:id', getNotification);
router.post('/', createNewNotification);
router.put('/:id', updateExistingNotification);
router.put('/:id/read', markNotificationAsRead);
router.put('/mark-all-read/all', markAllNotificationsAsRead);
router.delete('/:id', deleteExistingNotification);

// Rutas administrativas para generación de notificaciones
router.post('/generate-payment-reminders', verificarRolesAdmin, generatePaymentReminders);
router.post('/payment-notification', verificarRolesAdmin, createNewPaymentNotification);

module.exports = router;
