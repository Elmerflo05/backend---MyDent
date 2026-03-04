const express = require('express');
const router = express.Router();
const verificarToken = require('../middleware/authMiddleware');
const {
  getSettings,
  updateSettings
} = require('../controllers/healthPlanGlobalSettingsController');

/**
 * Middleware para verificar que solo super_admin puede modificar
 * Cualquier usuario autenticado puede ver la configuración
 */
const verificarSuperAdmin = (req, res, next) => {
  const rol = req.user?.role_id;

  if (rol !== 1) {
    return res.status(403).json({
      success: false,
      error: 'Acceso denegado: Solo el super administrador puede modificar esta configuración'
    });
  }

  next();
};

// Todas las rutas requieren autenticación
router.use(verificarToken);

// GET / - Obtener configuración (cualquier usuario autenticado)
router.get('/', getSettings);

// PUT / - Actualizar configuración (solo super_admin)
router.put('/', verificarSuperAdmin, updateSettings);

module.exports = router;
