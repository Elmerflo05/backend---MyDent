const pool = require('../config/db');

const getAllTreatments = async (filters = {}) => {
  let query = `
    SELECT
      t.*,
      p.first_name || ' ' || p.last_name as patient_name,
      u.first_name || ' ' || u.last_name as dentist_name,
      dp.procedure_name,
      ts.status_name as treatment_status_name,
      b.branch_name
    FROM treatments t
    INNER JOIN patients p ON t.patient_id = p.patient_id
    INNER JOIN dentists d ON t.dentist_id = d.dentist_id
    INNER JOIN users u ON d.user_id = u.user_id
    INNER JOIN dental_procedures dp ON t.dental_procedure_id = dp.dental_procedure_id
    INNER JOIN treatment_statuses ts ON t.treatment_status_id = ts.treatment_status_id
    INNER JOIN branches b ON t.branch_id = b.branch_id
    WHERE t.status = 'active'
  `;

  const params = [];
  let paramIndex = 1;

  if (filters.patient_id) {
    query += ` AND t.patient_id = $${paramIndex}`;
    params.push(filters.patient_id);
    paramIndex++;
  }

  if (filters.dentist_id) {
    query += ` AND t.dentist_id = $${paramIndex}`;
    params.push(filters.dentist_id);
    paramIndex++;
  }

  if (filters.branch_id) {
    query += ` AND t.branch_id = $${paramIndex}`;
    params.push(filters.branch_id);
    paramIndex++;
  }

  if (filters.treatment_status_id) {
    query += ` AND t.treatment_status_id = $${paramIndex}`;
    params.push(filters.treatment_status_id);
    paramIndex++;
  }

  query += ` ORDER BY t.treatment_date DESC`;

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

const getTreatmentById = async (treatmentId) => {
  const query = `
    SELECT
      t.*,
      p.first_name || ' ' || p.last_name as patient_name,
      u.first_name || ' ' || u.last_name as dentist_name,
      dp.procedure_name,
      dp.procedure_code,
      ts.status_name as treatment_status_name,
      b.branch_name
    FROM treatments t
    INNER JOIN patients p ON t.patient_id = p.patient_id
    INNER JOIN dentists d ON t.dentist_id = d.dentist_id
    INNER JOIN users u ON d.user_id = u.user_id
    INNER JOIN dental_procedures dp ON t.dental_procedure_id = dp.dental_procedure_id
    INNER JOIN treatment_statuses ts ON t.treatment_status_id = ts.treatment_status_id
    INNER JOIN branches b ON t.branch_id = b.branch_id
    WHERE t.treatment_id = $1 AND t.status = 'active'
  `;

  const result = await pool.query(query, [treatmentId]);
  return result.rows.length > 0 ? result.rows[0] : null;
};

const createTreatment = async (treatmentData) => {
  const {
    patient_id,
    dentist_id,
    branch_id,
    dental_procedure_id,
    treatment_plan_id,
    consultation_id,
    appointment_id,
    treatment_status_id,
    treatment_date,
    tooth_position_id,
    tooth_surface_id,
    description,
    notes,
    cost,
    paid_amount,
    discount_amount,
    final_cost,
    user_id_registration
  } = treatmentData;

  const query = `
    INSERT INTO treatments (
      patient_id, dentist_id, branch_id, dental_procedure_id, treatment_plan_id,
      consultation_id, appointment_id, treatment_status_id, treatment_date,
      tooth_position_id, tooth_surface_id, description, notes, cost, paid_amount,
      discount_amount, final_cost, user_id_registration
    ) VALUES (
      $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18
    ) RETURNING *
  `;

  const values = [
    patient_id,
    dentist_id,
    branch_id,
    dental_procedure_id,
    treatment_plan_id || null,
    consultation_id || null,
    appointment_id || null,
    treatment_status_id,
    treatment_date,
    tooth_position_id || null,
    tooth_surface_id || null,
    description || null,
    notes || null,
    cost,
    paid_amount || 0,
    discount_amount || 0,
    final_cost,
    user_id_registration
  ];

  const result = await pool.query(query, values);
  return result.rows[0];
};

const updateTreatment = async (treatmentId, treatmentData) => {
  const fields = [];
  const values = [];
  let paramIndex = 1;

  Object.keys(treatmentData).forEach((key) => {
    if (key !== 'user_id_modification' && treatmentData[key] !== undefined) {
      fields.push(`${key} = $${paramIndex}`);
      values.push(treatmentData[key]);
      paramIndex++;
    }
  });

  if (fields.length === 0) {
    throw new Error('No hay campos para actualizar');
  }

  fields.push(`user_id_modification = $${paramIndex}`);
  values.push(treatmentData.user_id_modification);
  paramIndex++;

  fields.push(`date_time_modification = CURRENT_TIMESTAMP`);

  values.push(treatmentId);

  const query = `
    UPDATE treatments SET ${fields.join(', ')}
    WHERE treatment_id = $${paramIndex} AND status = 'active'
    RETURNING *
  `;

  const result = await pool.query(query, values);
  return result.rows.length > 0 ? result.rows[0] : null;
};

const deleteTreatment = async (treatmentId, userId) => {
  const query = `
    UPDATE treatments SET
      status = 'inactive',
      user_id_modification = $1,
      date_time_modification = CURRENT_TIMESTAMP
    WHERE treatment_id = $2 AND status = 'active'
    RETURNING treatment_id
  `;

  const result = await pool.query(query, [userId, treatmentId]);
  return result.rowCount > 0;
};

const countTreatments = async (filters = {}) => {
  let query = `SELECT COUNT(*) as total FROM treatments t WHERE t.status = 'active'`;
  const params = [];
  let paramIndex = 1;

  if (filters.patient_id) {
    query += ` AND t.patient_id = $${paramIndex}`;
    params.push(filters.patient_id);
    paramIndex++;
  }

  if (filters.dentist_id) {
    query += ` AND t.dentist_id = $${paramIndex}`;
    params.push(filters.dentist_id);
    paramIndex++;
  }

  if (filters.branch_id) {
    query += ` AND t.branch_id = $${paramIndex}`;
    params.push(filters.branch_id);
    paramIndex++;
  }

  if (filters.treatment_status_id) {
    query += ` AND t.treatment_status_id = $${paramIndex}`;
    params.push(filters.treatment_status_id);
  }

  const result = await pool.query(query, params);
  return parseInt(result.rows[0].total);
};

module.exports = {
  getAllTreatments,
  getTreatmentById,
  createTreatment,
  updateTreatment,
  deleteTreatment,
  countTreatments
};
