/**
 * Pricing Routes
 * Rutas para el servicio de precios segun planes de salud
 */

const express = require('express');
const router = express.Router();
const verificarToken = require('../middleware/authMiddleware');
const {
  getActivePlan,
  calculatePrice,
  calculatePriceByCode,
  calculateMultiplePrices,
  checkFirstFreeConsultation,
  useFirstConsultation,
  getCoverageSummary
} = require('../controllers/pricingController');

// Middleware para validar roles con permiso de lectura
const verificarRolesLectura = (req, res, next) => {
  const rol = req.user?.role_id;
  if (![1, 2, 3, 4, 5, 6, 7].includes(rol)) {
    return res.status(403).json({ mensaje: 'Acceso denegado: Rol no autorizado' });
  }
  next();
};

// Middleware para dentistas y admin (pueden usar primera consulta)
const verificarDentistaOAdmin = (req, res, next) => {
  const rol = req.user?.role_id;
  if (![1, 2, 3].includes(rol)) {
    return res.status(403).json({ mensaje: 'Acceso denegado: Solo dentistas y administradores' });
  }
  next();
};

// Aplicar autenticacion a todas las rutas
router.use(verificarToken);

// ============================================================================
// CONSULTA DE PLAN Y COBERTURA
// ============================================================================

// Obtener plan activo de un paciente
router.get('/patient/:patientId/active-plan', verificarRolesLectura, getActivePlan);

// Obtener resumen de cobertura (para mostrar al dentista)
router.get('/patient/:patientId/coverage-summary', verificarRolesLectura, getCoverageSummary);

// ============================================================================
// CALCULO DE PRECIOS
// ============================================================================

// Calcular precio de un sub-procedimiento para un paciente
router.get('/calculate/:subProcedureId/patient/:patientId', verificarRolesLectura, calculatePrice);

// Calcular precio por codigo de sub-procedimiento
router.get('/calculate/code/:code/patient/:patientId', verificarRolesLectura, calculatePriceByCode);

// Calcular precios de multiples sub-procedimientos
router.post('/calculate-multiple/patient/:patientId', verificarRolesLectura, calculateMultiplePrices);

// ============================================================================
// PRIMERA CONSULTA GRATIS
// ============================================================================

// Verificar disponibilidad de primera consulta gratis
router.get('/patient/:patientId/first-free-consultation', verificarRolesLectura, checkFirstFreeConsultation);

// Usar primera consulta gratis (marcar como usada)
router.post('/patient/:patientId/use-first-free-consultation', verificarDentistaOAdmin, useFirstConsultation);

module.exports = router;
