/**
 * Rutas: Laboratory Service Prices
 *
 * Base: /api/laboratory/service-prices
 *
 * Control de Acceso:
 * - Lectura: super_admin, admin, imaging_technician, external_client (roles 1, 2, 5, 8)
 * - Escritura: solo super_admin (role_id 1)
 */

const express = require('express');
const router = express.Router();
const verificarToken = require('../middleware/authMiddleware');

const {
  getAllPrices,
  getTomografia3DPrices,
  getRadiografiasPrices,
  getAllPricingCombined,
  getPriceByCode,
  getServiceStats,
  updatePrice,
  updatePriceByServiceCode,
  updateTomografia3DPrices,
  updateRadiografiasPrices
} = require('../controllers/laboratoryServicePricesController');

// Middleware para verificar acceso de lectura
// Roles permitidos: super_admin (1), admin (2), doctor (3), receptionist (4), imaging_technician (5), external_client (8)
// Los doctores necesitan ver precios para el Paso 4: Plan para el Diagnóstico Definitivo
const verificarAccesoLectura = (req, res, next) => {
  const rolesPermitidos = [1, 2, 3, 4, 5, 7];

  if (!rolesPermitidos.includes(req.user.role_id)) {
    return res.status(403).json({
      success: false,
      error: 'No tiene permisos para acceder a los precios de laboratorio'
    });
  }

  next();
};

// Middleware para verificar super_admin (escritura)
const verificarSuperAdmin = (req, res, next) => {
  if (req.user.role_id !== 1) {
    return res.status(403).json({
      success: false,
      error: 'Solo el super administrador puede modificar precios'
    });
  }

  next();
};

// Todas las rutas requieren autenticación
router.use(verificarToken);

// ============================================
// RUTAS DE LECTURA (roles 1, 2, 5, 8)
// ============================================

// GET /api/laboratory/service-prices
// Obtiene todos los servicios con sus precios
// Query params: ?category=tomografia3d|radiografias&subcategory=xxx&grouped=true
router.get('/', verificarAccesoLectura, getAllPrices);

// GET /api/laboratory/service-prices/tomografia3d
// Obtiene precios de Tomografía 3D (formato legacy para frontend)
// Query params: ?format=structured (opcional, para formato completo)
router.get('/tomografia3d', verificarAccesoLectura, getTomografia3DPrices);

// GET /api/laboratory/service-prices/radiografias
// Obtiene precios de Radiografías (formato legacy para frontend)
// Query params: ?format=structured (opcional, para formato completo)
router.get('/radiografias', verificarAccesoLectura, getRadiografiasPrices);

// GET /api/laboratory/service-prices/all
// Obtiene ambas categorías en formato legacy
router.get('/all', verificarAccesoLectura, getAllPricingCombined);

// GET /api/laboratory/service-prices/stats
// Obtiene estadísticas (conteo por categoría)
router.get('/stats', verificarAccesoLectura, getServiceStats);

// GET /api/laboratory/service-prices/code/:serviceCode
// Obtiene un servicio específico por su código
router.get('/code/:serviceCode', verificarAccesoLectura, getPriceByCode);

// ============================================
// RUTAS DE ESCRITURA (solo super_admin - role 1)
// ============================================

// PUT /api/laboratory/service-prices/tomografia3d
// Actualiza múltiples precios de Tomografía 3D (formato legacy bulk)
router.put('/tomografia3d', verificarSuperAdmin, updateTomografia3DPrices);

// PUT /api/laboratory/service-prices/radiografias
// Actualiza múltiples precios de Radiografías (formato legacy bulk)
router.put('/radiografias', verificarSuperAdmin, updateRadiografiasPrices);

// PUT /api/laboratory/service-prices/:id
// Actualiza un servicio específico por ID
router.put('/:id', verificarSuperAdmin, updatePrice);

// PUT /api/laboratory/service-prices/code/:serviceCode
// Actualiza un servicio específico por código
router.put('/code/:serviceCode', verificarSuperAdmin, updatePriceByServiceCode);

module.exports = router;
