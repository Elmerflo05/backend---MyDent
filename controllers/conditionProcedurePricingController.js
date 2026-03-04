/**
 * Condition Procedure Pricing Controller
 * Controlador para APIs de precios de procedimientos de condiciones
 *
 * Los precios ahora viven en los PROCEDIMIENTOS, no en las CONDICIONES
 */

const {
  getProceduresWithPricesByConditionId,
  getProceduresWithPricesByConditionCode,
  getProcedureById,
  getProcedurePriceByPlan,
  getProcedurePriceForPatient,
  getMultipleProcedurePricesForPatient,
  updateProcedurePrices,
  updateAllProcedurePricesForCondition,
  getPricingStatsByCondition,
  getAllConditionsWithProceduresAndPrices
} = require('../models/conditionProcedurePricingModel');

// ============================================================================
// OBTENCION DE PROCEDIMIENTOS CON PRECIOS
// ============================================================================

/**
 * Obtener procedimientos de una condicion por ID
 * GET /api/condition-procedures/condition/:conditionId/procedures
 */
const getProceduresByConditionId = async (req, res) => {
  try {
    const { conditionId } = req.params;

    const procedures = await getProceduresWithPricesByConditionId(parseInt(conditionId));

    res.json({
      success: true,
      data: procedures,
      count: procedures.length
    });
  } catch (error) {
    console.error('Error al obtener procedimientos de condicion:', error);
    res.status(500).json({
      success: false,
      error: 'Error al obtener procedimientos'
    });
  }
};

/**
 * Obtener procedimientos de una condicion por codigo
 * GET /api/condition-procedures/condition/code/:conditionCode/procedures
 */
const getProceduresByConditionCode = async (req, res) => {
  try {
    const { conditionCode } = req.params;

    const procedures = await getProceduresWithPricesByConditionCode(conditionCode);

    res.json({
      success: true,
      data: procedures,
      count: procedures.length
    });
  } catch (error) {
    console.error('Error al obtener procedimientos por codigo:', error);
    res.status(500).json({
      success: false,
      error: 'Error al obtener procedimientos'
    });
  }
};

/**
 * Obtener un procedimiento especifico
 * GET /api/condition-procedures/:procedureId
 */
const getProcedure = async (req, res) => {
  try {
    const { procedureId } = req.params;

    const procedure = await getProcedureById(parseInt(procedureId));

    if (!procedure) {
      return res.status(404).json({
        success: false,
        error: 'Procedimiento no encontrado'
      });
    }

    res.json({
      success: true,
      data: procedure
    });
  } catch (error) {
    console.error('Error al obtener procedimiento:', error);
    res.status(500).json({
      success: false,
      error: 'Error al obtener procedimiento'
    });
  }
};

// ============================================================================
// CALCULO DE PRECIOS
// ============================================================================

/**
 * Obtener precio de un procedimiento segun plan
 * GET /api/condition-procedures/:procedureId/price?plan_code=personal
 */
const getProcedurePrice = async (req, res) => {
  try {
    const { procedureId } = req.params;
    const { plan_code } = req.query;

    const priceInfo = await getProcedurePriceByPlan(
      parseInt(procedureId),
      plan_code || null
    );

    res.json({
      success: true,
      data: priceInfo
    });
  } catch (error) {
    console.error('Error al obtener precio:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Error al obtener precio'
    });
  }
};

/**
 * Obtener precio de un procedimiento para un paciente
 * GET /api/condition-procedures/:procedureId/price-for-patient/:patientId
 */
const getProcedurePriceForPatientController = async (req, res) => {
  try {
    const { procedureId, patientId } = req.params;

    const priceInfo = await getProcedurePriceForPatient(
      parseInt(procedureId),
      parseInt(patientId)
    );

    res.json({
      success: true,
      data: priceInfo
    });
  } catch (error) {
    console.error('Error al obtener precio para paciente:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Error al obtener precio'
    });
  }
};

/**
 * Calcular precios de multiples procedimientos para un paciente
 * POST /api/condition-procedures/calculate-multiple/patient/:patientId
 * Body: { procedure_ids: [1, 2, 3] }
 */
const calculateMultiplePrices = async (req, res) => {
  try {
    const { patientId } = req.params;
    const { procedure_ids } = req.body;

    if (!procedure_ids || !Array.isArray(procedure_ids)) {
      return res.status(400).json({
        success: false,
        error: 'Se requiere un array de IDs de procedimientos'
      });
    }

    const result = await getMultipleProcedurePricesForPatient(
      procedure_ids.map(id => parseInt(id)),
      parseInt(patientId)
    );

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('Error al calcular precios multiples:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Error al calcular precios'
    });
  }
};

// ============================================================================
// ACTUALIZACION DE PRECIOS
// ============================================================================

/**
 * Actualizar precios de un procedimiento
 * PUT /api/condition-procedures/:procedureId/prices
 * Body: { price_without_plan, price_plan_personal, price_plan_familiar, ... }
 */
const updateProcedurePricesController = async (req, res) => {
  try {
    const { procedureId } = req.params;
    const prices = req.body;
    const userId = req.user.user_id;

    const updatedProcedure = await updateProcedurePrices(
      parseInt(procedureId),
      prices,
      userId
    );

    if (!updatedProcedure) {
      return res.status(404).json({
        success: false,
        error: 'Procedimiento no encontrado'
      });
    }

    res.json({
      success: true,
      message: 'Precios actualizados exitosamente',
      data: updatedProcedure
    });
  } catch (error) {
    console.error('Error al actualizar precios:', error);
    res.status(500).json({
      success: false,
      error: 'Error al actualizar precios'
    });
  }
};

/**
 * Actualizar precios de todos los procedimientos de una condicion
 * PUT /api/condition-procedures/condition/:conditionId/prices
 * Body: { price_without_plan, price_plan_personal, price_plan_familiar, ... }
 */
const updateConditionProcedurePrices = async (req, res) => {
  try {
    const { conditionId } = req.params;
    const prices = req.body;
    const userId = req.user.user_id;

    const updatedProcedures = await updateAllProcedurePricesForCondition(
      parseInt(conditionId),
      prices,
      userId
    );

    res.json({
      success: true,
      message: `${updatedProcedures.length} procedimientos actualizados`,
      data: updatedProcedures
    });
  } catch (error) {
    console.error('Error al actualizar precios de condicion:', error);
    res.status(500).json({
      success: false,
      error: 'Error al actualizar precios'
    });
  }
};

// ============================================================================
// ESTADISTICAS Y REPORTES
// ============================================================================

/**
 * Obtener estadisticas de precios por condicion
 * GET /api/condition-procedures/stats/by-condition
 */
const getPricingStats = async (req, res) => {
  try {
    const stats = await getPricingStatsByCondition();

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Error al obtener estadisticas:', error);
    res.status(500).json({
      success: false,
      error: 'Error al obtener estadisticas'
    });
  }
};

/**
 * Obtener todas las condiciones con procedimientos y precios
 * GET /api/condition-procedures/all-with-prices
 */
const getAllWithPrices = async (req, res) => {
  try {
    const conditions = await getAllConditionsWithProceduresAndPrices();

    res.json({
      success: true,
      data: conditions,
      count: conditions.length
    });
  } catch (error) {
    console.error('Error al obtener condiciones con precios:', error);
    res.status(500).json({
      success: false,
      error: 'Error al obtener datos'
    });
  }
};

module.exports = {
  // Obtencion de procedimientos
  getProceduresByConditionId,
  getProceduresByConditionCode,
  getProcedure,

  // Calculo de precios
  getProcedurePrice,
  getProcedurePriceForPatientController,
  calculateMultiplePrices,

  // Actualizacion de precios
  updateProcedurePricesController,
  updateConditionProcedurePrices,

  // Estadisticas
  getPricingStats,
  getAllWithPrices
};
