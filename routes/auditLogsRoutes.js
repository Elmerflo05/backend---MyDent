const express = require('express');
const router = express.Router();
const verificarToken = require('../middleware/authMiddleware');
const {
  getAuditLogs,
  getAuditLog,
  getAuditStats,
  getAvailableActions
} = require('../controllers/auditLogsController');

const verificarRolesPermitidos = (req, res, next) => {
  const rol = req.user?.role_id;
  if (![1, 2].includes(rol)) {
    return res.status(403).json({ mensaje: 'Acceso denegado: Solo administradores' });
  }
  next();
};

router.use(verificarToken);
router.use(verificarRolesPermitidos);

// Audit Logs - Solo lectura
router.get('/stats', getAuditStats);
router.get('/actions', getAvailableActions);
router.get('/', getAuditLogs);
router.get('/:id', getAuditLog);

module.exports = router;
