const pool = require('../config/db');

const getAllTreatmentPlans = async (filters = {}) => {
  let query = `
    SELECT
      tp.*,
      p.first_name || ' ' || p.last_name as patient_name,
      p.identification_number,
      u.first_name || ' ' || u.last_name as dentist_name,
      tps.status_name as plan_status_name,
      tps.status_color,
      b.branch_name
    FROM treatment_plans tp
    INNER JOIN patients p ON tp.patient_id = p.patient_id
    INNER JOIN dentists d ON tp.dentist_id = d.dentist_id
    INNER JOIN users u ON d.user_id = u.user_id
    INNER JOIN treatment_plan_statuses tps ON tp.treatment_plan_status_id = tps.treatment_plan_status_id
    INNER JOIN branches b ON tp.branch_id = b.branch_id
    WHERE tp.status = 'active'
  `;

  const params = [];
  let paramIndex = 1;

  if (filters.patient_id) {
    query += ` AND tp.patient_id = $${paramIndex}`;
    params.push(filters.patient_id);
    paramIndex++;
  }

  if (filters.dentist_id) {
    query += ` AND tp.dentist_id = $${paramIndex}`;
    params.push(filters.dentist_id);
    paramIndex++;
  }

  if (filters.branch_id) {
    query += ` AND tp.branch_id = $${paramIndex}`;
    params.push(filters.branch_id);
    paramIndex++;
  }

  if (filters.treatment_plan_status_id) {
    query += ` AND tp.treatment_plan_status_id = $${paramIndex}`;
    params.push(filters.treatment_plan_status_id);
    paramIndex++;
  }

  if (filters.approved_by_patient !== undefined) {
    query += ` AND tp.approved_by_patient = $${paramIndex}`;
    params.push(filters.approved_by_patient);
    paramIndex++;
  }

  query += ` ORDER BY tp.plan_date DESC`;

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

const getTreatmentPlanById = async (planId) => {
  const planQuery = `
    SELECT
      tp.*,
      p.first_name || ' ' || p.last_name as patient_name,
      p.identification_number,
      p.email as patient_email,
      u.first_name || ' ' || u.last_name as dentist_name,
      tps.status_name as plan_status_name,
      tps.status_color,
      b.branch_name
    FROM treatment_plans tp
    INNER JOIN patients p ON tp.patient_id = p.patient_id
    INNER JOIN dentists d ON tp.dentist_id = d.dentist_id
    INNER JOIN users u ON d.user_id = u.user_id
    INNER JOIN treatment_plan_statuses tps ON tp.treatment_plan_status_id = tps.treatment_plan_status_id
    INNER JOIN branches b ON tp.branch_id = b.branch_id
    WHERE tp.treatment_plan_id = $1 AND tp.status = 'active'
  `;

  const proceduresQuery = `
    SELECT
      tpp.*,
      dp.procedure_name,
      dp.procedure_code,
      tp_pos.position_name,
      ts.surface_name
    FROM treatment_plan_procedures tpp
    INNER JOIN dental_procedures dp ON tpp.dental_procedure_id = dp.dental_procedure_id
    LEFT JOIN tooth_positions tp_pos ON tpp.tooth_position_id = tp_pos.tooth_position_id
    LEFT JOIN tooth_surfaces ts ON tpp.tooth_surface_id = ts.tooth_surface_id
    WHERE tpp.treatment_plan_id = $1 AND tpp.status = 'active'
    ORDER BY tpp.procedure_order ASC NULLS LAST, tpp.plan_procedure_id ASC
  `;

  const [planResult, proceduresResult] = await Promise.all([
    pool.query(planQuery, [planId]),
    pool.query(proceduresQuery, [planId])
  ]);

  if (planResult.rows.length === 0) {
    return null;
  }

  return {
    ...planResult.rows[0],
    procedures: proceduresResult.rows
  };
};

const createTreatmentPlan = async (planData, procedures) => {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // Insertar plan de tratamiento
    const planQuery = `
      INSERT INTO treatment_plans (
        patient_id, dentist_id, branch_id, treatment_plan_status_id, plan_name,
        plan_date, start_date, end_date, total_estimated_cost, description,
        notes, user_id_registration
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      RETURNING *
    `;

    const planValues = [
      planData.patient_id,
      planData.dentist_id,
      planData.branch_id,
      planData.treatment_plan_status_id,
      planData.plan_name,
      planData.plan_date,
      planData.start_date || null,
      planData.end_date || null,
      planData.total_estimated_cost || null,
      planData.description || null,
      planData.notes || null,
      planData.user_id_registration
    ];

    const planResult = await client.query(planQuery, planValues);
    const newPlan = planResult.rows[0];

    // Insertar procedimientos del plan
    if (procedures && procedures.length > 0) {
      const proceduresQuery = `
        INSERT INTO treatment_plan_procedures (
          treatment_plan_id, dental_procedure_id, tooth_position_id, tooth_surface_id,
          procedure_order, estimated_cost, notes, user_id_registration
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING *
      `;

      const insertedProcedures = [];
      for (const procedure of procedures) {
        const procedureValues = [
          newPlan.treatment_plan_id,
          procedure.dental_procedure_id,
          procedure.tooth_position_id || null,
          procedure.tooth_surface_id || null,
          procedure.procedure_order || null,
          procedure.estimated_cost || null,
          procedure.notes || null,
          planData.user_id_registration
        ];

        const procedureResult = await client.query(proceduresQuery, procedureValues);
        insertedProcedures.push(procedureResult.rows[0]);
      }

      newPlan.procedures = insertedProcedures;
    }

    await client.query('COMMIT');
    return newPlan;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

const updateTreatmentPlan = async (planId, planData) => {
  const fields = [];
  const values = [];
  let paramIndex = 1;

  Object.keys(planData).forEach((key) => {
    if (key !== 'user_id_modification' && planData[key] !== undefined) {
      fields.push(`${key} = $${paramIndex}`);
      values.push(planData[key]);
      paramIndex++;
    }
  });

  if (fields.length === 0) {
    throw new Error('No hay campos para actualizar');
  }

  fields.push(`user_id_modification = $${paramIndex}`);
  values.push(planData.user_id_modification);
  paramIndex++;

  fields.push(`date_time_modification = CURRENT_TIMESTAMP`);

  values.push(planId);

  const query = `
    UPDATE treatment_plans SET ${fields.join(', ')}
    WHERE treatment_plan_id = $${paramIndex} AND status = 'active'
    RETURNING *
  `;

  const result = await pool.query(query, values);
  return result.rows.length > 0 ? result.rows[0] : null;
};

const approveTreatmentPlan = async (planId, userId) => {
  const query = `
    UPDATE treatment_plans SET
      approved_by_patient = true,
      approved_date = CURRENT_DATE,
      user_id_modification = $1,
      date_time_modification = CURRENT_TIMESTAMP
    WHERE treatment_plan_id = $2 AND status = 'active'
    RETURNING *
  `;

  const result = await pool.query(query, [userId, planId]);
  return result.rows.length > 0 ? result.rows[0] : null;
};

const deleteTreatmentPlan = async (planId, userId) => {
  const query = `
    UPDATE treatment_plans SET
      status = 'inactive',
      user_id_modification = $1,
      date_time_modification = CURRENT_TIMESTAMP
    WHERE treatment_plan_id = $2 AND status = 'active'
    RETURNING treatment_plan_id
  `;

  const result = await pool.query(query, [userId, planId]);
  return result.rowCount > 0;
};

const countTreatmentPlans = async (filters = {}) => {
  let query = `SELECT COUNT(*) as total FROM treatment_plans tp WHERE tp.status = 'active'`;
  const params = [];
  let paramIndex = 1;

  if (filters.patient_id) {
    query += ` AND tp.patient_id = $${paramIndex}`;
    params.push(filters.patient_id);
    paramIndex++;
  }

  if (filters.dentist_id) {
    query += ` AND tp.dentist_id = $${paramIndex}`;
    params.push(filters.dentist_id);
    paramIndex++;
  }

  if (filters.branch_id) {
    query += ` AND tp.branch_id = $${paramIndex}`;
    params.push(filters.branch_id);
    paramIndex++;
  }

  if (filters.treatment_plan_status_id) {
    query += ` AND tp.treatment_plan_status_id = $${paramIndex}`;
    params.push(filters.treatment_plan_status_id);
    paramIndex++;
  }

  if (filters.approved_by_patient !== undefined) {
    query += ` AND tp.approved_by_patient = $${paramIndex}`;
    params.push(filters.approved_by_patient);
  }

  const result = await pool.query(query, params);
  return parseInt(result.rows[0].total);
};

// Procedimientos del plan
const addProcedure = async (procedureData, userId) => {
  const {
    treatment_plan_id,
    dental_procedure_id,
    tooth_position_id,
    tooth_surface_id,
    procedure_order,
    estimated_cost,
    notes
  } = procedureData;

  const query = `
    INSERT INTO treatment_plan_procedures (
      treatment_plan_id, dental_procedure_id, tooth_position_id, tooth_surface_id,
      procedure_order, estimated_cost, notes, user_id_registration
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    RETURNING *
  `;

  const values = [
    treatment_plan_id,
    dental_procedure_id,
    tooth_position_id || null,
    tooth_surface_id || null,
    procedure_order || null,
    estimated_cost || null,
    notes || null,
    userId
  ];

  const result = await pool.query(query, values);
  return result.rows[0];
};

const updateProcedure = async (procedureId, procedureData, userId) => {
  const fields = [];
  const values = [];
  let paramIndex = 1;

  const allowedFields = [
    'tooth_position_id', 'tooth_surface_id', 'procedure_order', 'estimated_cost',
    'actual_cost', 'is_completed', 'completed_date', 'notes'
  ];

  allowedFields.forEach((field) => {
    if (procedureData[field] !== undefined) {
      fields.push(`${field} = $${paramIndex}`);
      values.push(procedureData[field]);
      paramIndex++;
    }
  });

  if (fields.length === 0) {
    throw new Error('No hay campos para actualizar');
  }

  fields.push(`user_id_modification = $${paramIndex}`);
  values.push(userId);
  paramIndex++;

  fields.push(`date_time_modification = CURRENT_TIMESTAMP`);

  values.push(procedureId);

  const query = `
    UPDATE treatment_plan_procedures SET ${fields.join(', ')}
    WHERE plan_procedure_id = $${paramIndex} AND status = 'active'
    RETURNING *
  `;

  const result = await pool.query(query, values);
  return result.rows.length > 0 ? result.rows[0] : null;
};

const deleteProcedure = async (procedureId, userId) => {
  const query = `
    UPDATE treatment_plan_procedures SET
      status = 'inactive',
      user_id_modification = $1,
      date_time_modification = CURRENT_TIMESTAMP
    WHERE plan_procedure_id = $2 AND status = 'active'
    RETURNING plan_procedure_id
  `;

  const result = await pool.query(query, [userId, procedureId]);
  return result.rowCount > 0;
};

module.exports = {
  getAllTreatmentPlans,
  getTreatmentPlanById,
  createTreatmentPlan,
  updateTreatmentPlan,
  approveTreatmentPlan,
  deleteTreatmentPlan,
  countTreatmentPlans,
  addProcedure,
  updateProcedure,
  deleteProcedure
};
