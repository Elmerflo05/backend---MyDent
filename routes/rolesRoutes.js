const express = require('express');
const router = express.Router();
const verificarToken = require('../middleware/authMiddleware');
const {
  getRoles,
  getRole,
  createNewRole,
  updateExistingRole,
  deleteExistingRole,
  getPermissions,
  getPermission,
  createNewPermission,
  updateExistingPermission,
  deleteExistingPermission,
  assignPermission,
  removePermission,
  syncPermissions
} = require('../controllers/rolesController');

// Middleware para validar los roles permitidos (solo administradores)
const verificarRolesPermitidos = (req, res, next) => {
  const rol = req.user?.role_id;
  if (![1, 2].includes(rol)) {
    return res.status(403).json({ mensaje: 'Acceso denegado: Solo administradores' });
  }
  next();
};

// Aplicar middlewares a todas las rutas
router.use(verificarToken);
router.use(verificarRolesPermitidos);

// Rutas de roles
router.get('/roles', getRoles);
router.get('/roles/:id', getRole);
router.post('/roles', createNewRole);
router.put('/roles/:id', updateExistingRole);
router.delete('/roles/:id', deleteExistingRole);

// Rutas de permisos
router.get('/permissions', getPermissions);
router.get('/permissions/:id', getPermission);
router.post('/permissions', createNewPermission);
router.put('/permissions/:id', updateExistingPermission);
router.delete('/permissions/:id', deleteExistingPermission);

// Rutas de asignación role-permission
router.post('/roles/:roleId/permissions', assignPermission);
router.delete('/roles/:roleId/permissions/:permissionId', removePermission);
router.put('/roles/:roleId/permissions/sync', syncPermissions);

module.exports = router;
