/**
 * Sub-Procedures Model
 * Modelo para sub-procedimientos con precios diferenciados por plan de salud
 */

const pool = require('../config/db');
const { normalizePlanCode, getPriceColumnForPlan } = require('../constants/healthPlanCodes');

// ============================================================================
// CRUD BASICO
// ============================================================================

/**
 * Obtener todos los sub-procedimientos
 */
const getAllSubProcedures = async (filters = {}) => {
  let query = `
    SELECT *
    FROM sub_procedures
    WHERE status = 'active'
  `;

  const params = [];
  let paramIndex = 1;

  if (filters.specialty) {
    query += ` AND specialty = $${paramIndex}`;
    params.push(filters.specialty);
    paramIndex++;
  }

  if (filters.is_active !== undefined) {
    query += ` AND is_active = $${paramIndex}`;
    params.push(filters.is_active);
    paramIndex++;
  }

  if (filters.search) {
    query += ` AND (sub_procedure_name ILIKE $${paramIndex} OR sub_procedure_code ILIKE $${paramIndex} OR description ILIKE $${paramIndex})`;
    params.push(`%${filters.search}%`);
    paramIndex++;
  }

  if (filters.odontogram_condition_code) {
    query += ` AND odontogram_condition_code = $${paramIndex}`;
    params.push(filters.odontogram_condition_code);
    paramIndex++;
  }

  query += ` ORDER BY specialty, sub_procedure_name ASC`;

  if (filters.limit) {
    query += ` LIMIT $${paramIndex}`;
    params.push(filters.limit);
    paramIndex++;
  }

  if (filters.offset) {
    query += ` OFFSET $${paramIndex}`;
    params.push(filters.offset);
  }

  const result = await pool.query(query, params);
  return result.rows;
};

/**
 * Obtener sub-procedimiento por ID
 */
const getSubProcedureById = async (subProcedureId) => {
  const query = `
    SELECT *
    FROM sub_procedures
    WHERE sub_procedure_id = $1 AND status = 'active'
  `;
  const result = await pool.query(query, [subProcedureId]);
  return result.rows.length > 0 ? result.rows[0] : null;
};

/**
 * Obtener sub-procedimiento por codigo
 */
const getSubProcedureByCode = async (subProcedureCode) => {
  const query = `
    SELECT *
    FROM sub_procedures
    WHERE sub_procedure_code = $1 AND status = 'active'
  `;
  const result = await pool.query(query, [subProcedureCode]);
  return result.rows.length > 0 ? result.rows[0] : null;
};

/**
 * Crear sub-procedimiento
 */
const createSubProcedure = async (data) => {
  const query = `
    INSERT INTO sub_procedures (
      sub_procedure_code, sub_procedure_name, specialty, description,
      odontogram_condition_code, price_without_plan, price_plan_personal,
      price_plan_familiar, price_plan_platinium, price_plan_oro,
      estimated_duration, requires_anesthesia, is_active,
      user_id_registration
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
    RETURNING *
  `;

  const values = [
    data.sub_procedure_code || null,
    data.sub_procedure_name,
    data.specialty || null,
    data.description || null,
    data.odontogram_condition_code || null,
    data.price_without_plan,
    data.price_plan_personal || null,
    data.price_plan_familiar || null,
    data.price_plan_platinium || null,
    data.price_plan_oro || null,
    data.estimated_duration || 30,
    data.requires_anesthesia || false,
    data.is_active !== undefined ? data.is_active : true,
    data.user_id_registration
  ];

  const result = await pool.query(query, values);
  return result.rows[0];
};

/**
 * Actualizar sub-procedimiento
 */
const updateSubProcedure = async (subProcedureId, data) => {
  const fields = [];
  const values = [];
  let paramIndex = 1;

  const allowedFields = [
    'sub_procedure_code', 'sub_procedure_name', 'specialty', 'description',
    'odontogram_condition_code', 'price_without_plan', 'price_plan_personal',
    'price_plan_familiar', 'price_plan_platinium', 'price_plan_oro',
    'estimated_duration', 'requires_anesthesia', 'is_active'
  ];

  allowedFields.forEach((field) => {
    if (data[field] !== undefined) {
      fields.push(`${field} = $${paramIndex}`);
      values.push(data[field]);
      paramIndex++;
    }
  });

  if (fields.length === 0) {
    throw new Error('No hay campos para actualizar');
  }

  fields.push(`user_id_modification = $${paramIndex}`);
  values.push(data.user_id_modification);
  paramIndex++;

  fields.push(`date_time_modification = CURRENT_TIMESTAMP`);

  values.push(subProcedureId);

  const query = `
    UPDATE sub_procedures SET ${fields.join(', ')}
    WHERE sub_procedure_id = $${paramIndex} AND status = 'active'
    RETURNING *
  `;

  const result = await pool.query(query, values);
  return result.rows.length > 0 ? result.rows[0] : null;
};

/**
 * Eliminar sub-procedimiento (soft delete)
 */
const deleteSubProcedure = async (subProcedureId, userId) => {
  const query = `
    UPDATE sub_procedures SET
      status = 'inactive',
      user_id_modification = $1,
      date_time_modification = CURRENT_TIMESTAMP
    WHERE sub_procedure_id = $2 AND status = 'active'
    RETURNING sub_procedure_id
  `;

  const result = await pool.query(query, [userId, subProcedureId]);
  return result.rowCount > 0;
};

/**
 * Contar sub-procedimientos
 */
const countSubProcedures = async (filters = {}) => {
  let query = `SELECT COUNT(*) as total FROM sub_procedures WHERE status = 'active'`;
  const params = [];
  let paramIndex = 1;

  if (filters.specialty) {
    query += ` AND specialty = $${paramIndex}`;
    params.push(filters.specialty);
    paramIndex++;
  }

  if (filters.is_active !== undefined) {
    query += ` AND is_active = $${paramIndex}`;
    params.push(filters.is_active);
    paramIndex++;
  }

  if (filters.search) {
    query += ` AND (sub_procedure_name ILIKE $${paramIndex} OR sub_procedure_code ILIKE $${paramIndex})`;
    params.push(`%${filters.search}%`);
  }

  const result = await pool.query(query, params);
  return parseInt(result.rows[0].total);
};

// ============================================================================
// LOGICA DE PRECIOS POR PLAN
// ============================================================================

/**
 * Obtener precio de un sub-procedimiento segun el plan del paciente
 * @param {number} subProcedureId - ID del sub-procedimiento
 * @param {string|null} planCode - Codigo del plan (formato normalizado: personal, familiar, platinium, oro)
 * @returns {object} Objeto con precio_original, precio_plan, descuento, plan_aplicado
 */
const getPriceByPlan = async (subProcedureId, planCode = null) => {
  const subProcedure = await getSubProcedureById(subProcedureId);

  if (!subProcedure) {
    throw new Error('Sub-procedimiento no encontrado');
  }

  const priceWithoutPlan = parseFloat(subProcedure.price_without_plan) || 0;
  let priceWithPlan = priceWithoutPlan;
  let planApplied = null;

  if (planCode) {
    // Usar normalizePlanCode para manejar cualquier formato de plan_code
    const normalizedCode = normalizePlanCode(planCode);
    const planPriceField = getPriceColumnForPlan(planCode);

    if (planPriceField && subProcedure[planPriceField] !== null) {
      // Si tiene precio especifico del plan, usarlo
      priceWithPlan = parseFloat(subProcedure[planPriceField]);
      planApplied = normalizedCode || planCode;
    }
    // Si es NULL (N.I), mantener precio sin plan
  }

  const discount = priceWithoutPlan - priceWithPlan;
  const discountPercentage = priceWithoutPlan > 0
    ? Math.round((discount / priceWithoutPlan) * 100)
    : 0;

  return {
    sub_procedure_id: subProcedure.sub_procedure_id,
    sub_procedure_code: subProcedure.sub_procedure_code,
    sub_procedure_name: subProcedure.sub_procedure_name,
    price_without_plan: priceWithoutPlan,
    price_with_plan: priceWithPlan,
    discount_amount: discount,
    discount_percentage: discountPercentage,
    plan_applied: planApplied,
    is_included_in_plan: planApplied !== null && priceWithPlan < priceWithoutPlan
  };
};

/**
 * Obtener precio de sub-procedimiento para un paciente especifico
 * Detecta automaticamente el plan activo del paciente
 */
const getPriceForPatient = async (subProcedureId, patientId) => {
  // Primero obtener el plan activo del paciente
  const planQuery = `
    SELECT hp.plan_code
    FROM health_plan_subscriptions hps
    INNER JOIN health_plans hp ON hps.health_plan_id = hp.health_plan_id
    WHERE hps.patient_id = $1
      AND hps.status = 'active'
      AND hps.subscription_status = 'active'
      AND hps.approval_status = 'approved'
      AND (hps.end_date IS NULL OR hps.end_date >= CURRENT_DATE)
    ORDER BY hps.start_date DESC
    LIMIT 1
  `;

  const planResult = await pool.query(planQuery, [patientId]);
  const planCode = planResult.rows.length > 0 ? planResult.rows[0].plan_code : null;

  return await getPriceByPlan(subProcedureId, planCode);
};

/**
 * Obtener precio de sub-procedimiento por codigo para un paciente
 */
const getPriceByCodeForPatient = async (subProcedureCode, patientId) => {
  const subProcedure = await getSubProcedureByCode(subProcedureCode);

  if (!subProcedure) {
    throw new Error('Sub-procedimiento no encontrado');
  }

  return await getPriceForPatient(subProcedure.sub_procedure_id, patientId);
};

/**
 * Obtener todas las especialidades disponibles
 */
const getSpecialties = async () => {
  const query = `
    SELECT DISTINCT specialty
    FROM sub_procedures
    WHERE status = 'active' AND specialty IS NOT NULL
    ORDER BY specialty ASC
  `;

  const result = await pool.query(query);
  return result.rows.map(row => row.specialty);
};

/**
 * Obtener sub-procedimientos por especialidad con precios de un plan especifico
 */
const getSubProceduresBySpecialtyWithPlanPrices = async (specialty, planCode = null) => {
  const subProcedures = await getAllSubProcedures({ specialty, is_active: true });

  const subProceduresWithPrices = await Promise.all(
    subProcedures.map(async (sp) => {
      const priceInfo = await getPriceByPlan(sp.sub_procedure_id, planCode);
      return {
        ...sp,
        ...priceInfo
      };
    })
  );

  return subProceduresWithPrices;
};

module.exports = {
  // CRUD basico
  getAllSubProcedures,
  getSubProcedureById,
  getSubProcedureByCode,
  createSubProcedure,
  updateSubProcedure,
  deleteSubProcedure,
  countSubProcedures,

  // Logica de precios
  getPriceByPlan,
  getPriceForPatient,
  getPriceByCodeForPatient,

  // Utilidades
  getSpecialties,
  getSubProceduresBySpecialtyWithPlanPrices
};
