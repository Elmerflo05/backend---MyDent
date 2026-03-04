/**
 * Health Plan Dependents Model
 * Modelo para dependientes del Plan Familiar
 */

const pool = require('../config/db');
const { normalizePlanCode, PLAN_CODES } = require('../constants/healthPlanCodes');

// ============================================================================
// CRUD BASICO
// ============================================================================

/**
 * Obtener todos los dependientes de una suscripcion
 */
const getDependentsBySubscription = async (subscriptionId) => {
  const query = `
    SELECT
      hpd.*,
      p.first_name,
      p.last_name,
      p.identification_number,
      p.email,
      p.phone,
      p.birth_date
    FROM health_plan_dependents hpd
    INNER JOIN patients p ON hpd.patient_id = p.patient_id
    WHERE hpd.subscription_id = $1
      AND hpd.status = 'active'
    ORDER BY hpd.date_time_registration ASC
  `;

  const result = await pool.query(query, [subscriptionId]);
  return result.rows;
};

/**
 * Obtener dependiente por ID
 */
const getDependentById = async (dependentId) => {
  const query = `
    SELECT
      hpd.*,
      p.first_name,
      p.last_name,
      p.identification_number,
      p.email,
      p.phone,
      p.birth_date,
      hps.subscription_number,
      hp.plan_name
    FROM health_plan_dependents hpd
    INNER JOIN patients p ON hpd.patient_id = p.patient_id
    INNER JOIN health_plan_subscriptions hps ON hpd.subscription_id = hps.subscription_id
    INNER JOIN health_plans hp ON hps.health_plan_id = hp.health_plan_id
    WHERE hpd.dependent_id = $1 AND hpd.status = 'active'
  `;

  const result = await pool.query(query, [dependentId]);
  return result.rows.length > 0 ? result.rows[0] : null;
};

/**
 * Verificar si un paciente ya es dependiente en una suscripcion
 */
const checkDependentExists = async (subscriptionId, patientId) => {
  const query = `
    SELECT dependent_id
    FROM health_plan_dependents
    WHERE subscription_id = $1 AND patient_id = $2 AND status = 'active'
  `;

  const result = await pool.query(query, [subscriptionId, patientId]);
  return result.rows.length > 0;
};

/**
 * Verificar si un paciente es titular de la suscripcion
 */
const isPatientTitular = async (subscriptionId, patientId) => {
  const query = `
    SELECT subscription_id
    FROM health_plan_subscriptions
    WHERE subscription_id = $1 AND patient_id = $2 AND status = 'active'
  `;

  const result = await pool.query(query, [subscriptionId, patientId]);
  return result.rows.length > 0;
};

/**
 * Agregar dependiente a una suscripcion
 */
const addDependent = async (data) => {
  // Verificar que la suscripcion es de tipo familiar
  const planQuery = `
    SELECT hp.plan_code
    FROM health_plan_subscriptions hps
    INNER JOIN health_plans hp ON hps.health_plan_id = hp.health_plan_id
    WHERE hps.subscription_id = $1 AND hps.status = 'active'
  `;

  const planResult = await pool.query(planQuery, [data.subscription_id]);

  if (planResult.rows.length === 0) {
    throw new Error('Suscripcion no encontrada');
  }

  // Normalizar plan_code para comparación (maneja cualquier formato)
  const normalizedPlanCode = normalizePlanCode(planResult.rows[0].plan_code);
  if (normalizedPlanCode !== PLAN_CODES.FAMILIAR) {
    throw new Error('Solo el Plan Familiar permite agregar dependientes');
  }

  // Verificar que el paciente no sea el titular
  const isTitular = await isPatientTitular(data.subscription_id, data.patient_id);
  if (isTitular) {
    throw new Error('El paciente es el titular de la suscripcion, no puede ser dependiente');
  }

  // Verificar que no exista ya como dependiente
  const exists = await checkDependentExists(data.subscription_id, data.patient_id);
  if (exists) {
    throw new Error('El paciente ya es dependiente de esta suscripcion');
  }

  const query = `
    INSERT INTO health_plan_dependents (
      subscription_id, patient_id, relationship, relationship_description,
      is_active, user_id_registration
    ) VALUES ($1, $2, $3, $4, $5, $6)
    RETURNING *
  `;

  const values = [
    data.subscription_id,
    data.patient_id,
    data.relationship,
    data.relationship_description || null,
    data.is_active !== undefined ? data.is_active : true,
    data.user_id_registration
  ];

  const result = await pool.query(query, values);
  return result.rows[0];
};

/**
 * Actualizar dependiente
 */
const updateDependent = async (dependentId, data) => {
  const fields = [];
  const values = [];
  let paramIndex = 1;

  const allowedFields = ['relationship', 'relationship_description', 'is_active'];

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

  values.push(dependentId);

  const query = `
    UPDATE health_plan_dependents SET ${fields.join(', ')}
    WHERE dependent_id = $${paramIndex} AND status = 'active'
    RETURNING *
  `;

  const result = await pool.query(query, values);
  return result.rows.length > 0 ? result.rows[0] : null;
};

/**
 * Eliminar dependiente (soft delete)
 */
const removeDependent = async (dependentId, userId) => {
  const query = `
    UPDATE health_plan_dependents SET
      status = 'inactive',
      is_active = false,
      user_id_modification = $1,
      date_time_modification = CURRENT_TIMESTAMP
    WHERE dependent_id = $2 AND status = 'active'
    RETURNING dependent_id
  `;

  const result = await pool.query(query, [userId, dependentId]);
  return result.rowCount > 0;
};

/**
 * Contar dependientes de una suscripcion
 */
const countDependents = async (subscriptionId) => {
  const query = `
    SELECT COUNT(*) as total
    FROM health_plan_dependents
    WHERE subscription_id = $1 AND status = 'active' AND is_active = true
  `;

  const result = await pool.query(query, [subscriptionId]);
  return parseInt(result.rows[0].total);
};

// ============================================================================
// VERIFICACIONES DE COBERTURA
// ============================================================================

/**
 * Verificar si un paciente tiene cobertura por plan (titular o dependiente)
 * Retorna la informacion del plan si tiene cobertura
 */
const getPatientCoverage = async (patientId) => {
  // Primero verificar si es titular
  const titularQuery = `
    SELECT
      hps.subscription_id,
      hps.subscription_status,
      hps.approval_status,
      hps.start_date,
      hps.end_date,
      hps.first_free_consultation_used,
      hp.health_plan_id,
      hp.plan_name,
      hp.plan_code,
      hp.monthly_fee,
      'titular' as coverage_type
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

  let result = await pool.query(titularQuery, [patientId]);

  if (result.rows.length > 0) {
    return result.rows[0];
  }

  // Si no es titular, verificar si es dependiente
  const dependentQuery = `
    SELECT
      hps.subscription_id,
      hps.subscription_status,
      hps.approval_status,
      hps.start_date,
      hps.end_date,
      hps.first_free_consultation_used,
      hp.health_plan_id,
      hp.plan_name,
      hp.plan_code,
      hp.monthly_fee,
      'dependiente' as coverage_type,
      hpd.relationship,
      titular.first_name || ' ' || titular.last_name as titular_name
    FROM health_plan_dependents hpd
    INNER JOIN health_plan_subscriptions hps ON hpd.subscription_id = hps.subscription_id
    INNER JOIN health_plans hp ON hps.health_plan_id = hp.health_plan_id
    INNER JOIN patients titular ON hps.patient_id = titular.patient_id
    WHERE hpd.patient_id = $1
      AND hpd.status = 'active'
      AND hpd.is_active = true
      AND hps.status = 'active'
      AND hps.subscription_status = 'active'
      AND hps.approval_status = 'approved'
      AND (hps.end_date IS NULL OR hps.end_date >= CURRENT_DATE)
    ORDER BY hps.start_date DESC
    LIMIT 1
  `;

  result = await pool.query(dependentQuery, [patientId]);

  if (result.rows.length > 0) {
    return result.rows[0];
  }

  return null;
};

/**
 * Obtener todos los pacientes cubiertos por una suscripcion (titular + dependientes)
 */
const getCoveredPatients = async (subscriptionId) => {
  // Obtener titular
  const titularQuery = `
    SELECT
      p.patient_id,
      p.first_name,
      p.last_name,
      p.identification_number,
      'titular' as type,
      NULL as relationship
    FROM health_plan_subscriptions hps
    INNER JOIN patients p ON hps.patient_id = p.patient_id
    WHERE hps.subscription_id = $1 AND hps.status = 'active'
  `;

  const titularResult = await pool.query(titularQuery, [subscriptionId]);

  // Obtener dependientes
  const dependentsQuery = `
    SELECT
      p.patient_id,
      p.first_name,
      p.last_name,
      p.identification_number,
      'dependiente' as type,
      hpd.relationship
    FROM health_plan_dependents hpd
    INNER JOIN patients p ON hpd.patient_id = p.patient_id
    WHERE hpd.subscription_id = $1
      AND hpd.status = 'active'
      AND hpd.is_active = true
  `;

  const dependentsResult = await pool.query(dependentsQuery, [subscriptionId]);

  return [...titularResult.rows, ...dependentsResult.rows];
};

module.exports = {
  // CRUD
  getDependentsBySubscription,
  getDependentById,
  addDependent,
  updateDependent,
  removeDependent,
  countDependents,

  // Verificaciones
  checkDependentExists,
  isPatientTitular,
  getPatientCoverage,
  getCoveredPatients
};
