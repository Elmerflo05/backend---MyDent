/**
 * Rutas para gestión de precios de servicios de laboratorio
 *
 * Base: /api/laboratory/pricing
 *
 * Endpoints:
 * - GET  /                  - Obtener todos los precios
 * - GET  /tomografia3d      - Obtener precios de Tomografía 3D
 * - PUT  /tomografia3d      - Actualizar precios de Tomografía 3D (solo super_admin)
 * - GET  /radiografias      - Obtener precios de Radiografías
 * - PUT  /radiografias      - Actualizar precios de Radiografías (solo super_admin)
 */

const express = require('express');
const router = express.Router();
const verificarToken = require('../middleware/authMiddleware');
const {
  getAllPrices,
  getTomografia3DPrices,
  updateTomografia3DPrices,
  getRadiografiasPrices,
  updateRadiografiasPrices
} = require('../controllers/laboratoryPricingController');

/**
 * Middleware para verificar rol de super_admin
 * Solo el super_admin puede modificar precios
 */
const verificarSuperAdmin = (req, res, next) => {
  const roleId = req.user?.role_id;

  // role_id 1 = super_admin
  if (roleId !== 1) {
    return res.status(403).json({
      success: false,
      error: 'Acceso denegado: Solo el superadministrador puede modificar precios'
    });
  }

  next();
};

/**
 * Middleware para verificar roles que pueden ver precios
 * super_admin, admin, imaging_technician, external_client
 */
const verificarAccesoLectura = (req, res, next) => {
  const roleId = req.user?.role_id;

  // Roles permitidos: 1=super_admin, 2=admin, 5=imaging_technician, 8=external_client
  const rolesPermitidos = [1, 2, 5, 7];

  if (!rolesPermitidos.includes(roleId)) {
    return res.status(403).json({
      success: false,
      error: 'Acceso denegado: No tiene permisos para ver precios'
    });
  }

  next();
};

// Aplicar autenticación a todas las rutas
router.use(verificarToken);

// ============================================================================
// RUTAS DE LECTURA (GET) - Acceso para roles autorizados
// ============================================================================

/**
 * GET /api/laboratory/pricing
 * Obtener todos los precios (Tomografía 3D + Radiografías)
 */
router.get('/', verificarAccesoLectura, getAllPrices);

/**
 * GET /api/laboratory/pricing/tomografia3d
 * Obtener precios de Tomografía 3D
 */
router.get('/tomografia3d', verificarAccesoLectura, getTomografia3DPrices);

/**
 * GET /api/laboratory/pricing/radiografias
 * Obtener precios de Radiografías
 */
router.get('/radiografias', verificarAccesoLectura, getRadiografiasPrices);

// ============================================================================
// RUTAS DE ESCRITURA (PUT) - Solo super_admin
// ============================================================================

/**
 * PUT /api/laboratory/pricing/tomografia3d
 * Actualizar precios de Tomografía 3D
 */
router.put('/tomografia3d', verificarSuperAdmin, updateTomografia3DPrices);

/**
 * PUT /api/laboratory/pricing/radiografias
 * Actualizar precios de Radiografías
 */
router.put('/radiografias', verificarSuperAdmin, updateRadiografiasPrices);

module.exports = router;
