const express = require('express');
const router = express.Router();
const verificarToken = require('../middleware/authMiddleware');
const {
  getAppSettings,
  getAppSetting,
  getSettingByKey,
  getSettingsByCategory,
  getSettingsByBranch,
  createNewAppSetting,
  updateExistingAppSetting,
  updateSettingByKey,
  upsertSettingByKey,
  deleteExistingAppSetting
} = require('../controllers/appSettingsController');

// Middleware para verificar roles de escritura (solo admin y super_admin)
const verificarRolesEscritura = (req, res, next) => {
  const rol = req.user?.role_id;
  if (![1, 2].includes(rol)) {
    return res.status(403).json({ mensaje: 'Acceso denegado: Solo administradores pueden modificar configuraciones' });
  }
  next();
};

// Todas las rutas requieren autenticación
router.use(verificarToken);

// Rutas de LECTURA - accesibles por todos los usuarios autenticados
router.get('/category/:category', getSettingsByCategory);  // GET /api/settings/category/security
router.get('/branch/:branchId', getSettingsByBranch);      // GET /api/settings/branch/1 o /branch/global
router.get('/key/:key', getSettingByKey);                  // GET /api/settings/key/session_timeout
router.get('/', getAppSettings);                           // GET /api/settings
router.get('/:id', getAppSetting);                         // GET /api/settings/1

// Rutas de ESCRITURA - solo admin y super_admin
router.put('/key/:key', verificarRolesEscritura, updateSettingByKey);               // PUT /api/settings/key/session_timeout
router.put('/upsert/:key', verificarRolesEscritura, upsertSettingByKey);            // PUT /api/settings/upsert/session_timeout
router.post('/', verificarRolesEscritura, createNewAppSetting);                     // POST /api/settings
router.put('/:id', verificarRolesEscritura, updateExistingAppSetting);              // PUT /api/settings/1
router.delete('/:id', verificarRolesEscritura, deleteExistingAppSetting);           // DELETE /api/settings/1

module.exports = router;
