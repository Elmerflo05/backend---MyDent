/**
 * Condition Procedure Pricing Routes
 * Rutas para APIs de precios de procedimientos de condiciones
 */

const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');

const {
  getProceduresByConditionId,
  getProceduresByConditionCode,
  getProcedure,
  getProcedurePrice,
  getProcedurePriceForPatientController,
  calculateMultiplePrices,
  updateProcedurePricesController,
  updateConditionProcedurePrices,
  getPricingStats,
  getAllWithPrices
} = require('../controllers/conditionProcedurePricingController');

// ============================================================================
// RUTAS PUBLICAS (solo lectura)
// ============================================================================

// Obtener procedimientos de una condicion por ID
// GET /api/condition-procedure-pricing/condition/:conditionId/procedures
router.get('/condition/:conditionId/procedures', getProceduresByConditionId);

// Obtener procedimientos de una condicion por codigo
// GET /api/condition-procedure-pricing/condition/code/:conditionCode/procedures
router.get('/condition/code/:conditionCode/procedures', getProceduresByConditionCode);

// Obtener un procedimiento especifico
// GET /api/condition-procedure-pricing/procedure/:procedureId
router.get('/procedure/:procedureId', getProcedure);

// Obtener precio de un procedimiento segun plan
// GET /api/condition-procedure-pricing/procedure/:procedureId/price?plan_code=personal
router.get('/procedure/:procedureId/price', getProcedurePrice);

// Obtener precio de un procedimiento para un paciente
// GET /api/condition-procedure-pricing/procedure/:procedureId/price-for-patient/:patientId
router.get('/procedure/:procedureId/price-for-patient/:patientId', getProcedurePriceForPatientController);

// Obtener todas las condiciones con procedimientos y precios
// GET /api/condition-procedure-pricing/all-with-prices
router.get('/all-with-prices', getAllWithPrices);

// ============================================================================
// RUTAS PROTEGIDAS (requieren autenticacion)
// ============================================================================

// Calcular precios de multiples procedimientos para un paciente
// POST /api/condition-procedure-pricing/calculate-multiple/patient/:patientId
router.post('/calculate-multiple/patient/:patientId', authMiddleware, calculateMultiplePrices);

// Actualizar precios de un procedimiento
// PUT /api/condition-procedure-pricing/procedure/:procedureId/prices
router.put('/procedure/:procedureId/prices', authMiddleware, updateProcedurePricesController);

// Actualizar precios de todos los procedimientos de una condicion
// PUT /api/condition-procedure-pricing/condition/:conditionId/prices
router.put('/condition/:conditionId/prices', authMiddleware, updateConditionProcedurePrices);

// Obtener estadisticas de precios por condicion
// GET /api/condition-procedure-pricing/stats/by-condition
router.get('/stats/by-condition', authMiddleware, getPricingStats);

module.exports = router;
