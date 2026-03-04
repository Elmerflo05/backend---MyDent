/**
 * Model: evolutionOdontogramModel.js
 * Modelo para el odontograma de evolucion (estado visual de progreso de tratamientos)
 */

const pool = require('../config/db');
const { formatDateYMD } = require('../utils/dateUtils');

/**
 * Obtener evolucion de odontograma con filtros
 */
const getAllEvolutionOdontogram = async (filters = {}) => {
  let query = `
    SELECT
      eo.*,
      p.first_name || ' ' || p.last_name as patient_name,
      p.identification_number as patient_dni,
      u.first_name || ' ' || u.last_name as dentist_name,
      d.professional_license as dentist_cop,
      tp.tooth_number,
      tp.tooth_name,
      ts.surface_code,
      ts.surface_name
    FROM evolution_odontogram eo
    INNER JOIN patients p ON eo.patient_id = p.patient_id
    INNER JOIN dentists d ON eo.registered_by_dentist_id = d.dentist_id
    INNER JOIN users u ON d.user_id = u.user_id
    INNER JOIN tooth_positions tp ON eo.tooth_position_id = tp.tooth_position_id
    LEFT JOIN tooth_surfaces ts ON eo.tooth_surface_id = ts.tooth_surface_id
    WHERE eo.status = 'active'
  `;

  const params = [];
  let paramIndex = 1;

  if (filters.patient_id) {
    query += ` AND eo.patient_id = $${paramIndex}`;
    params.push(filters.patient_id);
    paramIndex++;
  }

  if (filters.consultation_id) {
    query += ` AND eo.consultation_id = $${paramIndex}`;
    params.push(filters.consultation_id);
    paramIndex++;
  }

  if (filters.condition_status) {
    query += ` AND eo.condition_status = $${paramIndex}`;
    params.push(filters.condition_status);
    paramIndex++;
  }

  if (filters.tooth_position_id) {
    query += ` AND eo.tooth_position_id = $${paramIndex}`;
    params.push(filters.tooth_position_id);
    paramIndex++;
  }

  query += ` ORDER BY eo.registered_date DESC, tp.tooth_number`;

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
 * Obtener evolucion por ID
 */
const getEvolutionOdontogramById = async (evolutionId) => {
  const query = `
    SELECT
      eo.*,
      p.first_name || ' ' || p.last_name as patient_name,
      p.identification_number as patient_dni,
      u.first_name || ' ' || u.last_name as dentist_name,
      d.professional_license as dentist_cop,
      tp.tooth_number,
      tp.tooth_name,
      ts.surface_code,
      ts.surface_name
    FROM evolution_odontogram eo
    INNER JOIN patients p ON eo.patient_id = p.patient_id
    INNER JOIN dentists d ON eo.registered_by_dentist_id = d.dentist_id
    INNER JOIN users u ON d.user_id = u.user_id
    INNER JOIN tooth_positions tp ON eo.tooth_position_id = tp.tooth_position_id
    LEFT JOIN tooth_surfaces ts ON eo.tooth_surface_id = ts.tooth_surface_id
    WHERE eo.evolution_id = $1 AND eo.status = 'active'
  `;

  const result = await pool.query(query, [evolutionId]);
  return result.rows[0] || null;
};

/**
 * Crear nuevo registro de evolucion
 */
const createEvolutionOdontogram = async (data) => {
  const query = `
    INSERT INTO evolution_odontogram (
      patient_id,
      consultation_id,
      procedure_history_id,
      income_id,
      tooth_position_id,
      tooth_surface_id,
      condition_status,
      original_condition_id,
      original_condition_name,
      registered_by_dentist_id,
      registered_date,
      clinical_observation,
      user_id_registration
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
    RETURNING *
  `;

  const params = [
    data.patient_id,
    data.consultation_id,
    data.procedure_history_id || null,
    data.income_id || null,
    data.tooth_position_id,
    data.tooth_surface_id || null,
    data.condition_status || 'pending',
    data.original_condition_id || null,
    data.original_condition_name || null,
    data.registered_by_dentist_id,
    data.registered_date || formatDateYMD(),
    data.clinical_observation || null,
    data.user_id_registration
  ];

  const result = await pool.query(query, params);
  return result.rows[0];
};

/**
 * Actualizar estado de evolucion
 */
const updateEvolutionOdontogram = async (evolutionId, data, userId) => {
  const query = `
    UPDATE evolution_odontogram SET
      condition_status = COALESCE($1, condition_status),
      clinical_observation = COALESCE($2, clinical_observation),
      procedure_history_id = COALESCE($3, procedure_history_id),
      income_id = COALESCE($4, income_id),
      user_id_modification = $5,
      date_time_modification = NOW()
    WHERE evolution_id = $6 AND status = 'active'
    RETURNING *
  `;

  const params = [
    data.condition_status,
    data.clinical_observation,
    data.procedure_history_id,
    data.income_id,
    userId,
    evolutionId
  ];

  const result = await pool.query(query, params);
  return result.rows[0] || null;
};

/**
 * Eliminar (soft delete) registro de evolucion
 */
const deleteEvolutionOdontogram = async (evolutionId, userId) => {
  const query = `
    UPDATE evolution_odontogram SET
      status = 'inactive',
      user_id_modification = $1,
      date_time_modification = NOW()
    WHERE evolution_id = $2 AND status = 'active'
    RETURNING *
  `;

  const result = await pool.query(query, [userId, evolutionId]);
  return result.rows[0] || null;
};

/**
 * Obtener evolucion del odontograma por paciente
 * Devuelve el estado actual de cada diente del paciente
 */
const getPatientEvolutionOdontogram = async (patientId) => {
  const query = `
    SELECT
      eo.*,
      tp.tooth_number,
      tp.tooth_name,
      tp.quadrant,
      tp.is_adult,
      ts.surface_code,
      ts.surface_name,
      u.first_name || ' ' || u.last_name as dentist_name
    FROM evolution_odontogram eo
    INNER JOIN tooth_positions tp ON eo.tooth_position_id = tp.tooth_position_id
    LEFT JOIN tooth_surfaces ts ON eo.tooth_surface_id = ts.tooth_surface_id
    LEFT JOIN dentists d ON eo.registered_by_dentist_id = d.dentist_id
    LEFT JOIN users u ON d.user_id = u.user_id
    WHERE eo.patient_id = $1 AND eo.status = 'active'
    ORDER BY tp.tooth_number, eo.registered_date DESC
  `;

  const result = await pool.query(query, [patientId]);
  return result.rows;
};

/**
 * Obtener ultimo estado de evolucion de un diente especifico
 */
const getToothEvolutionStatus = async (patientId, toothPositionId, toothSurfaceId = null) => {
  let query = `
    SELECT
      eo.*,
      tp.tooth_number,
      tp.tooth_name,
      ts.surface_code,
      ts.surface_name
    FROM evolution_odontogram eo
    INNER JOIN tooth_positions tp ON eo.tooth_position_id = tp.tooth_position_id
    LEFT JOIN tooth_surfaces ts ON eo.tooth_surface_id = ts.tooth_surface_id
    WHERE eo.patient_id = $1
      AND eo.tooth_position_id = $2
      AND eo.status = 'active'
  `;

  const params = [patientId, toothPositionId];

  if (toothSurfaceId) {
    query += ` AND eo.tooth_surface_id = $3`;
    params.push(toothSurfaceId);
  }

  query += ` ORDER BY eo.registered_date DESC LIMIT 1`;

  const result = await pool.query(query, params);
  return result.rows[0] || null;
};

/**
 * Obtener resumen de evolucion por paciente (conteo por estado)
 */
const getPatientEvolutionSummary = async (patientId) => {
  const query = `
    SELECT
      eo.condition_status,
      COUNT(*) as count,
      COUNT(DISTINCT eo.tooth_position_id) as teeth_count
    FROM evolution_odontogram eo
    WHERE eo.patient_id = $1 AND eo.status = 'active'
    GROUP BY eo.condition_status
  `;

  const result = await pool.query(query, [patientId]);
  return result.rows;
};

/**
 * Verificar si existe evolucion para un diente/superficie especifica
 */
const checkEvolutionExists = async (patientId, toothPositionId, toothSurfaceId = null, originalConditionId = null) => {
  let query = `
    SELECT evolution_id, condition_status
    FROM evolution_odontogram
    WHERE patient_id = $1
      AND tooth_position_id = $2
      AND status = 'active'
  `;

  const params = [patientId, toothPositionId];
  let paramIndex = 3;

  if (toothSurfaceId) {
    query += ` AND tooth_surface_id = $${paramIndex}`;
    params.push(toothSurfaceId);
    paramIndex++;
  }

  if (originalConditionId) {
    query += ` AND original_condition_id = $${paramIndex}`;
    params.push(originalConditionId);
  }

  const result = await pool.query(query, params);
  return result.rows[0] || null;
};

/**
 * Actualizar o crear evolucion (upsert)
 */
const upsertEvolutionOdontogram = async (data, userId) => {
  // Verificar si existe por paciente + diente + superficie + condicion
  const existing = await checkEvolutionExists(
    data.patient_id,
    data.tooth_position_id,
    data.tooth_surface_id,
    data.original_condition_id
  );

  if (existing) {
    // Actualizar existente
    return updateEvolutionOdontogram(existing.evolution_id, data, userId);
  } else {
    // Crear nuevo
    return createEvolutionOdontogram({ ...data, user_id_registration: userId });
  }
};

module.exports = {
  getAllEvolutionOdontogram,
  getEvolutionOdontogramById,
  createEvolutionOdontogram,
  updateEvolutionOdontogram,
  deleteEvolutionOdontogram,
  getPatientEvolutionOdontogram,
  getToothEvolutionStatus,
  getPatientEvolutionSummary,
  checkEvolutionExists,
  upsertEvolutionOdontogram
};
