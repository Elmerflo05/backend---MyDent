/**
 * Condition Procedure Pricing Model
 * Modelo para obtener precios de procedimientos de condiciones del odontograma
 *
 * ARQUITECTURA: Los precios viven en los PROCEDIMIENTOS, no en las CONDICIONES
 * - odontogram_condition_procedures: procedimientos con condicion de odontograma
 * - sub_procedures: procedimientos sin condicion de odontograma
 */

const pool = require('../config/db');
const { normalizePlanCode, getPriceColumnForPlan } = require('../constants/healthPlanCodes');
const { getPatientActiveCompany } = require('../services/pricingService');
const { getCorporatePrice } = require('./companyCorporatePricingModel');

// ============================================================================
// OBTENCION DE PROCEDIMIENTOS CON PRECIOS
// ============================================================================

/**
 * Obtener todos los procedimientos de una condicion con sus precios
 * @param {number} conditionId - ID de la condicion dental
 * @returns {Promise<Array>} Lista de procedimientos con precios
 */
const getProceduresWithPricesByConditionId = async (conditionId) => {
  const query = `
    SELECT
      cp.condition_procedure_id,
      cp.odontogram_condition_id,
      cp.procedure_code,
      cp.procedure_name,
      cp.specialty,
      cp.price_without_plan,
      cp.price_plan_personal,
      cp.price_plan_familiar,
      cp.price_plan_platinium,
      cp.price_plan_oro,
      cp.applies_to_state,
      cp.observations,
      cp.display_order,
      dc.condition_code,
      dc.condition_name,
      dc.category
    FROM odontogram_condition_procedures cp
    INNER JOIN odontogram_dental_conditions dc
      ON cp.odontogram_condition_id = dc.condition_id
    WHERE cp.odontogram_condition_id = $1
      AND cp.status = 'active'
    ORDER BY cp.display_order, cp.procedure_name
  `;

  const result = await pool.query(query, [conditionId]);
  return result.rows;
};

/**
 * Obtener procedimientos por codigo de condicion
 * @param {string} conditionCode - Codigo de la condicion dental
 * @returns {Promise<Array>} Lista de procedimientos con precios
 */
const getProceduresWithPricesByConditionCode = async (conditionCode) => {
  const query = `
    SELECT
      cp.condition_procedure_id,
      cp.odontogram_condition_id,
      cp.procedure_code,
      cp.procedure_name,
      cp.specialty,
      cp.price_without_plan,
      cp.price_plan_personal,
      cp.price_plan_familiar,
      cp.price_plan_platinium,
      cp.price_plan_oro,
      cp.applies_to_state,
      cp.observations,
      cp.display_order,
      dc.condition_code,
      dc.condition_name,
      dc.category
    FROM odontogram_condition_procedures cp
    INNER JOIN odontogram_dental_conditions dc
      ON cp.odontogram_condition_id = dc.condition_id
    WHERE dc.condition_code = $1
      AND dc.status = 'active'
      AND cp.status = 'active'
    ORDER BY cp.display_order, cp.procedure_name
  `;

  const result = await pool.query(query, [conditionCode]);
  return result.rows;
};

/**
 * Obtener un procedimiento especifico por ID
 * @param {number} procedureId - ID del procedimiento
 * @returns {Promise<Object|null>} Procedimiento con precios
 */
const getProcedureById = async (procedureId) => {
  const query = `
    SELECT
      cp.condition_procedure_id,
      cp.odontogram_condition_id,
      cp.procedure_code,
      cp.procedure_name,
      cp.specialty,
      cp.price_without_plan,
      cp.price_plan_personal,
      cp.price_plan_familiar,
      cp.price_plan_platinium,
      cp.price_plan_oro,
      cp.applies_to_state,
      cp.observations,
      cp.display_order,
      dc.condition_code,
      dc.condition_name,
      dc.category
    FROM odontogram_condition_procedures cp
    INNER JOIN odontogram_dental_conditions dc
      ON cp.odontogram_condition_id = dc.condition_id
    WHERE cp.condition_procedure_id = $1
      AND cp.status = 'active'
  `;

  const result = await pool.query(query, [procedureId]);
  return result.rows.length > 0 ? result.rows[0] : null;
};

// ============================================================================
// CALCULO DE PRECIOS POR PLAN DE SALUD
// ============================================================================

/**
 * Obtener precio de un procedimiento segun el plan
 * @param {number} procedureId - ID del procedimiento
 * @param {string|null} planCode - Codigo del plan de salud
 * @returns {Promise<Object>} Informacion de precios
 */
const getProcedurePriceByPlan = async (procedureId, planCode = null) => {
  const procedure = await getProcedureById(procedureId);

  if (!procedure) {
    throw new Error('Procedimiento no encontrado');
  }

  const priceWithoutPlan = parseFloat(procedure.price_without_plan) || 0;
  let priceWithPlan = priceWithoutPlan;
  let planApplied = null;

  if (planCode) {
    // Usar normalizePlanCode para manejar cualquier formato de plan_code
    const normalizedCode = normalizePlanCode(planCode);
    const planPriceField = getPriceColumnForPlan(planCode);

    if (planPriceField && procedure[planPriceField] !== null) {
      priceWithPlan = parseFloat(procedure[planPriceField]);
      planApplied = normalizedCode || planCode;
    }
    // Si es NULL (N.I.), mantener precio sin plan
  }

  const discount = priceWithoutPlan - priceWithPlan;
  const discountPercentage = priceWithoutPlan > 0
    ? Math.round((discount / priceWithoutPlan) * 100)
    : 0;

  return {
    condition_procedure_id: procedure.condition_procedure_id,
    procedure_code: procedure.procedure_code,
    procedure_name: procedure.procedure_name,
    specialty: procedure.specialty,
    condition_code: procedure.condition_code,
    condition_name: procedure.condition_name,
    price_without_plan: priceWithoutPlan,
    price_with_plan: priceWithPlan,
    discount_amount: discount,
    discount_percentage: discountPercentage,
    plan_applied: planApplied,
    is_included_in_plan: planApplied !== null && priceWithPlan < priceWithoutPlan,
    has_discount: discount > 0
  };
};

/**
 * Obtener precio de un procedimiento para un paciente especifico
 * Prioridad: empresa corporativa > plan de salud > precio regular
 * @param {number} procedureId - ID del procedimiento
 * @param {number} patientId - ID del paciente
 * @returns {Promise<Object>} Informacion de precios con plan aplicado
 */
const getProcedurePriceForPatient = async (procedureId, patientId) => {
  const procedure = await getProcedureById(procedureId);
  if (!procedure) {
    throw new Error('Procedimiento no encontrado');
  }

  const priceWithoutPlan = parseFloat(procedure.price_without_plan) || 0;

  // PRIORIDAD 1: Verificar empresa corporativa vigente
  const company = await getPatientActiveCompany(patientId);

  if (company) {
    const corporatePrice = await getCorporatePrice(company.company_id, 'condition_procedure', procedureId);

    const appliedPrice = corporatePrice !== null ? corporatePrice : priceWithoutPlan;
    const discount = priceWithoutPlan - appliedPrice;
    const discountPercentage = priceWithoutPlan > 0
      ? Math.round((discount / priceWithoutPlan) * 100)
      : 0;

    return {
      condition_procedure_id: procedure.condition_procedure_id,
      procedure_code: procedure.procedure_code,
      procedure_name: procedure.procedure_name,
      specialty: procedure.specialty,
      condition_code: procedure.condition_code,
      condition_name: procedure.condition_name,
      price_without_plan: priceWithoutPlan,
      price_with_plan: appliedPrice,
      discount_amount: discount,
      discount_percentage: discountPercentage,
      pricing_source: 'corporate',
      company_id: company.company_id,
      company_name: company.company_name,
      plan_applied: null,
      plan_name: null,
      coverage_type: 'corporate',
      is_included_in_plan: false,
      has_discount: discount > 0
    };
  }

  // PRIORIDAD 2: Verificar plan de salud
  const planQuery = `
    SELECT hp.plan_code, hp.plan_name, 'titular' as coverage_type
    FROM health_plan_subscriptions hps
    INNER JOIN health_plans hp ON hps.health_plan_id = hp.health_plan_id
    WHERE hps.patient_id = $1
      AND hps.status = 'active'
      AND hps.subscription_status = 'active'
      AND hps.approval_status = 'approved'
      AND (hps.end_date IS NULL OR hps.end_date >= CURRENT_DATE)
    UNION ALL
    SELECT hp.plan_code, hp.plan_name, 'dependiente' as coverage_type
    FROM health_plan_dependents hpd
    INNER JOIN health_plan_subscriptions hps ON hpd.subscription_id = hps.subscription_id
    INNER JOIN health_plans hp ON hps.health_plan_id = hp.health_plan_id
    WHERE hpd.patient_id = $1
      AND hpd.status = 'active'
      AND hpd.is_active = true
      AND hps.status = 'active'
      AND hps.subscription_status = 'active'
      AND hps.approval_status = 'approved'
      AND (hps.end_date IS NULL OR hps.end_date >= CURRENT_DATE)
    LIMIT 1
  `;

  const planResult = await pool.query(planQuery, [patientId]);
  const planInfo = planResult.rows.length > 0 ? planResult.rows[0] : null;

  const priceInfo = await getProcedurePriceByPlan(
    procedureId,
    planInfo ? planInfo.plan_code : null
  );

  return {
    ...priceInfo,
    pricing_source: planInfo ? 'health_plan' : 'regular',
    company_id: null,
    company_name: null,
    plan_name: planInfo ? planInfo.plan_name : null,
    coverage_type: planInfo ? planInfo.coverage_type : null
  };
};

/**
 * Obtener precios de multiples procedimientos para un paciente
 * @param {number[]} procedureIds - Array de IDs de procedimientos
 * @param {number} patientId - ID del paciente
 * @returns {Promise<Object>} Detalles y totales de precios
 */
const getMultipleProcedurePricesForPatient = async (procedureIds, patientId) => {
  const details = await Promise.all(
    procedureIds.map(id => getProcedurePriceForPatient(id, patientId))
  );

  const totals = details.reduce((acc, item) => ({
    total_without_plan: acc.total_without_plan + item.price_without_plan,
    total_with_plan: acc.total_with_plan + item.price_with_plan,
    total_discount: acc.total_discount + item.discount_amount
  }), {
    total_without_plan: 0,
    total_with_plan: 0,
    total_discount: 0
  });

  const plan = details.length > 0 && details[0].plan_applied
    ? {
        plan_code: details[0].plan_applied,
        plan_name: details[0].plan_name,
        coverage_type: details[0].coverage_type
      }
    : null;

  return {
    details,
    totals,
    plan,
    item_count: details.length
  };
};

// ============================================================================
// ACTUALIZACION DE PRECIOS DE PROCEDIMIENTOS
// ============================================================================

/**
 * Actualizar precios de un procedimiento
 * @param {number} procedureId - ID del procedimiento
 * @param {Object} prices - Objeto con precios {price_without_plan, price_plan_personal, ...}
 * @param {number} userId - ID del usuario que modifica
 * @returns {Promise<Object>} Procedimiento actualizado
 */
const updateProcedurePrices = async (procedureId, prices, userId) => {
  const query = `
    UPDATE odontogram_condition_procedures
    SET
      price_without_plan = COALESCE($1, price_without_plan),
      price_plan_personal = $2,
      price_plan_familiar = $3,
      price_plan_platinium = $4,
      price_plan_oro = $5,
      user_id_modification = $6,
      date_time_modification = NOW()
    WHERE condition_procedure_id = $7
      AND status = 'active'
    RETURNING *
  `;

  const values = [
    prices.price_without_plan,
    prices.price_plan_personal !== undefined ? prices.price_plan_personal : null,
    prices.price_plan_familiar !== undefined ? prices.price_plan_familiar : null,
    prices.price_plan_platinium !== undefined ? prices.price_plan_platinium : null,
    prices.price_plan_oro !== undefined ? prices.price_plan_oro : null,
    userId,
    procedureId
  ];

  const result = await pool.query(query, values);
  return result.rows.length > 0 ? result.rows[0] : null;
};

/**
 * Actualizar precios de todos los procedimientos de una condicion
 * @param {number} conditionId - ID de la condicion
 * @param {Object} prices - Precios a aplicar
 * @param {number} userId - ID del usuario que modifica
 * @returns {Promise<Array>} Procedimientos actualizados
 */
const updateAllProcedurePricesForCondition = async (conditionId, prices, userId) => {
  const query = `
    UPDATE odontogram_condition_procedures
    SET
      price_without_plan = COALESCE($1, price_without_plan),
      price_plan_personal = $2,
      price_plan_familiar = $3,
      price_plan_platinium = $4,
      price_plan_oro = $5,
      user_id_modification = $6,
      date_time_modification = NOW()
    WHERE odontogram_condition_id = $7
      AND status = 'active'
    RETURNING *
  `;

  const values = [
    prices.price_without_plan,
    prices.price_plan_personal !== undefined ? prices.price_plan_personal : null,
    prices.price_plan_familiar !== undefined ? prices.price_plan_familiar : null,
    prices.price_plan_platinium !== undefined ? prices.price_plan_platinium : null,
    prices.price_plan_oro !== undefined ? prices.price_plan_oro : null,
    userId,
    conditionId
  ];

  const result = await pool.query(query, values);
  return result.rows;
};

// ============================================================================
// ESTADISTICAS Y REPORTES
// ============================================================================

/**
 * Obtener estadisticas de precios por condicion
 * @returns {Promise<Array>} Estadisticas de precios
 */
const getPricingStatsByCondition = async () => {
  const query = `
    SELECT
      dc.condition_code,
      dc.condition_name,
      dc.category,
      COUNT(cp.condition_procedure_id) as procedure_count,
      MIN(cp.price_without_plan) as min_price,
      MAX(cp.price_without_plan) as max_price,
      ROUND(AVG(cp.price_without_plan)::numeric, 2) as avg_price,
      SUM(cp.price_without_plan) as total_price
    FROM odontogram_dental_conditions dc
    LEFT JOIN odontogram_condition_procedures cp
      ON dc.condition_id = cp.odontogram_condition_id
      AND cp.status = 'active'
    WHERE dc.status = 'active'
    GROUP BY dc.condition_id, dc.condition_code, dc.condition_name, dc.category
    HAVING COUNT(cp.condition_procedure_id) > 0
    ORDER BY dc.category, dc.condition_name
  `;

  const result = await pool.query(query);
  return result.rows;
};

/**
 * Obtener todas las condiciones con sus procedimientos y precios
 * (Vista unificada para el frontend)
 * @returns {Promise<Array>} Condiciones con procedimientos
 */
const getAllConditionsWithProceduresAndPrices = async () => {
  const query = `
    SELECT
      dc.condition_id,
      dc.condition_code,
      dc.condition_name,
      dc.category,
      dc.description,
      dc.symbol_type,
      dc.color_type,
      json_agg(
        json_build_object(
          'condition_procedure_id', cp.condition_procedure_id,
          'procedure_code', cp.procedure_code,
          'procedure_name', cp.procedure_name,
          'specialty', cp.specialty,
          'price_without_plan', cp.price_without_plan,
          'price_plan_personal', cp.price_plan_personal,
          'price_plan_familiar', cp.price_plan_familiar,
          'price_plan_platinium', cp.price_plan_platinium,
          'price_plan_oro', cp.price_plan_oro,
          'display_order', cp.display_order
        ) ORDER BY cp.display_order, cp.procedure_name
      ) FILTER (WHERE cp.condition_procedure_id IS NOT NULL) as procedures
    FROM odontogram_dental_conditions dc
    LEFT JOIN odontogram_condition_procedures cp
      ON dc.condition_id = cp.odontogram_condition_id
      AND cp.status = 'active'
    WHERE dc.status = 'active'
    GROUP BY dc.condition_id
    ORDER BY dc.category, dc.condition_name
  `;

  const result = await pool.query(query);
  return result.rows;
};

module.exports = {
  // Obtencion de procedimientos
  getProceduresWithPricesByConditionId,
  getProceduresWithPricesByConditionCode,
  getProcedureById,

  // Calculo de precios
  getProcedurePriceByPlan,
  getProcedurePriceForPatient,
  getMultipleProcedurePricesForPatient,

  // Actualizacion de precios
  updateProcedurePrices,
  updateAllProcedurePricesForCondition,

  // Estadisticas
  getPricingStatsByCondition,
  getAllConditionsWithProceduresAndPrices
};
