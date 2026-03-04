/**
 * Model: procedureHistoryModel.js
 * Modelo para el historial clinico de procedimientos realizados
 */

const pool = require('../config/db');
const { formatDateYMD } = require('../utils/dateUtils');

/**
 * Obtener historial de procedimientos con filtros
 */
const getAllProcedureHistory = async (filters = {}) => {
  let query = `
    SELECT
      ph.*,
      p.first_name || ' ' || p.last_name as patient_name,
      p.identification_number as patient_dni,
      u.first_name || ' ' || u.last_name as dentist_name,
      d.professional_license as dentist_cop,
      tp.tooth_number,
      tp.tooth_name,
      ts.surface_code,
      ts.surface_name,
      c.consultation_date,
      ddc.condition_label as definitive_condition_label,
      ddc.selected_procedure_id,
      ddc.procedure_price as definitive_procedure_price,
      ocp.procedure_name as selected_procedure_name
    FROM procedure_history ph
    INNER JOIN patients p ON ph.patient_id = p.patient_id
    INNER JOIN dentists d ON ph.performed_by_dentist_id = d.dentist_id
    INNER JOIN users u ON d.user_id = u.user_id
    INNER JOIN consultations c ON ph.consultation_id = c.consultation_id
    LEFT JOIN tooth_positions tp ON ph.tooth_position_id = tp.tooth_position_id
    LEFT JOIN tooth_surfaces ts ON ph.tooth_surface_id = ts.tooth_surface_id
    LEFT JOIN definitive_diagnosis_conditions ddc ON ph.definitive_condition_id = ddc.definitive_condition_id
    LEFT JOIN odontogram_condition_procedures ocp ON ddc.selected_procedure_id = ocp.condition_procedure_id
    WHERE ph.status = 'active'
  `;

  const params = [];
  let paramIndex = 1;

  if (filters.patient_id) {
    query += ` AND ph.patient_id = $${paramIndex}`;
    params.push(filters.patient_id);
    paramIndex++;
  }

  if (filters.consultation_id) {
    query += ` AND ph.consultation_id = $${paramIndex}`;
    params.push(filters.consultation_id);
    paramIndex++;
  }

  if (filters.dentist_id) {
    query += ` AND ph.performed_by_dentist_id = $${paramIndex}`;
    params.push(filters.dentist_id);
    paramIndex++;
  }

  if (filters.procedure_type) {
    query += ` AND ph.procedure_type = $${paramIndex}`;
    params.push(filters.procedure_type);
    paramIndex++;
  }

  if (filters.date_from) {
    query += ` AND ph.performed_date >= $${paramIndex}`;
    params.push(filters.date_from);
    paramIndex++;
  }

  if (filters.date_to) {
    query += ` AND ph.performed_date <= $${paramIndex}`;
    params.push(filters.date_to);
    paramIndex++;
  }

  query += ` ORDER BY ph.performed_date DESC, ph.performed_time DESC`;

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
 * Obtener procedimiento por ID
 */
const getProcedureHistoryById = async (procedureHistoryId) => {
  const query = `
    SELECT
      ph.*,
      p.first_name || ' ' || p.last_name as patient_name,
      p.identification_number as patient_dni,
      u.first_name || ' ' || u.last_name as dentist_name,
      d.professional_license as dentist_cop,
      tp.tooth_number,
      tp.tooth_name,
      ts.surface_code,
      ts.surface_name,
      c.consultation_date,
      ddc.condition_label as definitive_condition_label,
      ddc.selected_procedure_id,
      ddc.procedure_price as definitive_procedure_price,
      ocp.procedure_name as selected_procedure_name
    FROM procedure_history ph
    INNER JOIN patients p ON ph.patient_id = p.patient_id
    INNER JOIN dentists d ON ph.performed_by_dentist_id = d.dentist_id
    INNER JOIN users u ON d.user_id = u.user_id
    INNER JOIN consultations c ON ph.consultation_id = c.consultation_id
    LEFT JOIN tooth_positions tp ON ph.tooth_position_id = tp.tooth_position_id
    LEFT JOIN tooth_surfaces ts ON ph.tooth_surface_id = ts.tooth_surface_id
    LEFT JOIN definitive_diagnosis_conditions ddc ON ph.definitive_condition_id = ddc.definitive_condition_id
    LEFT JOIN odontogram_condition_procedures ocp ON ddc.selected_procedure_id = ocp.condition_procedure_id
    WHERE ph.procedure_history_id = $1 AND ph.status = 'active'
  `;

  const result = await pool.query(query, [procedureHistoryId]);
  return result.rows[0] || null;
};

/**
 * Crear nuevo registro de procedimiento
 * Incluye soporte para definitive_condition_id (FK al diagnostico definitivo)
 */
const createProcedureHistory = async (data) => {
  const query = `
    INSERT INTO procedure_history (
      consultation_id,
      patient_id,
      tooth_position_id,
      tooth_surface_id,
      procedure_name,
      procedure_code,
      procedure_type,
      procedure_status,
      procedure_result,
      performed_by_dentist_id,
      performed_date,
      performed_time,
      clinical_notes,
      complications,
      next_steps,
      treatment_plan_item_id,
      additional_service_id,
      odontogram_condition_id,
      definitive_condition_id,
      user_id_registration
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20)
    RETURNING *
  `;

  const params = [
    data.consultation_id,
    data.patient_id,
    data.tooth_position_id || null,
    data.tooth_surface_id || null,
    data.procedure_name,
    data.procedure_code || null,
    data.procedure_type || 'odontogram',
    data.procedure_status || 'completed',
    data.procedure_result || 'successful',
    data.performed_by_dentist_id,
    data.performed_date || formatDateYMD(),
    data.performed_time || new Date().toTimeString().split(' ')[0],
    data.clinical_notes || null,
    data.complications || null,
    data.next_steps || null,
    data.treatment_plan_item_id || null,
    data.additional_service_id || null,
    data.odontogram_condition_id || null,
    data.definitive_condition_id || null,
    data.user_id_registration
  ];

  const result = await pool.query(query, params);
  return result.rows[0];
};

/**
 * Actualizar registro de procedimiento
 */
const updateProcedureHistory = async (procedureHistoryId, data, userId) => {
  const query = `
    UPDATE procedure_history SET
      procedure_status = COALESCE($1, procedure_status),
      procedure_result = COALESCE($2, procedure_result),
      clinical_notes = COALESCE($3, clinical_notes),
      complications = COALESCE($4, complications),
      next_steps = COALESCE($5, next_steps),
      user_id_modification = $6,
      date_time_modification = NOW()
    WHERE procedure_history_id = $7 AND status = 'active'
    RETURNING *
  `;

  const params = [
    data.procedure_status,
    data.procedure_result,
    data.clinical_notes,
    data.complications,
    data.next_steps,
    userId,
    procedureHistoryId
  ];

  const result = await pool.query(query, params);
  return result.rows[0] || null;
};

/**
 * Eliminar (soft delete) registro de procedimiento
 */
const deleteProcedureHistory = async (procedureHistoryId, userId) => {
  const query = `
    UPDATE procedure_history SET
      status = 'inactive',
      user_id_modification = $1,
      date_time_modification = NOW()
    WHERE procedure_history_id = $2 AND status = 'active'
    RETURNING *
  `;

  const result = await pool.query(query, [userId, procedureHistoryId]);
  return result.rows[0] || null;
};

/**
 * Contar procedimientos con filtros
 */
const countProcedureHistory = async (filters = {}) => {
  let query = `
    SELECT COUNT(*) as total
    FROM procedure_history ph
    WHERE ph.status = 'active'
  `;

  const params = [];
  let paramIndex = 1;

  if (filters.patient_id) {
    query += ` AND ph.patient_id = $${paramIndex}`;
    params.push(filters.patient_id);
    paramIndex++;
  }

  if (filters.consultation_id) {
    query += ` AND ph.consultation_id = $${paramIndex}`;
    params.push(filters.consultation_id);
    paramIndex++;
  }

  if (filters.dentist_id) {
    query += ` AND ph.performed_by_dentist_id = $${paramIndex}`;
    params.push(filters.dentist_id);
    paramIndex++;
  }

  const result = await pool.query(query, params);
  return parseInt(result.rows[0].total);
};

/**
 * Obtener historial por paciente (para TreatmentPerformed)
 * Incluye informacion del diagnostico definitivo vinculado
 */
const getPatientProcedureHistory = async (patientId) => {
  const query = `
    SELECT
      ph.*,
      u.first_name || ' ' || u.last_name as dentist_name,
      d.professional_license as dentist_cop,
      tp.tooth_number,
      tp.tooth_name,
      ts.surface_code,
      ts.surface_name,
      ddc.condition_label as definitive_condition_label,
      ddc.selected_procedure_id,
      ddc.procedure_price as definitive_procedure_price,
      ocp.procedure_name as selected_procedure_name
    FROM procedure_history ph
    INNER JOIN dentists d ON ph.performed_by_dentist_id = d.dentist_id
    INNER JOIN users u ON d.user_id = u.user_id
    LEFT JOIN tooth_positions tp ON ph.tooth_position_id = tp.tooth_position_id
    LEFT JOIN tooth_surfaces ts ON ph.tooth_surface_id = ts.tooth_surface_id
    LEFT JOIN definitive_diagnosis_conditions ddc ON ph.definitive_condition_id = ddc.definitive_condition_id
    LEFT JOIN odontogram_condition_procedures ocp ON ddc.selected_procedure_id = ocp.condition_procedure_id
    WHERE ph.patient_id = $1 AND ph.status = 'active'
    ORDER BY ph.performed_date DESC, ph.performed_time DESC
  `;

  const result = await pool.query(query, [patientId]);
  return result.rows;
};

module.exports = {
  getAllProcedureHistory,
  getProcedureHistoryById,
  createProcedureHistory,
  updateProcedureHistory,
  deleteProcedureHistory,
  countProcedureHistory,
  getPatientProcedureHistory
};
