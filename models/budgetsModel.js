const pool = require('../config/db');

/**
 * Obtener todos los presupuestos con detalles
 */
const getAllBudgets = async (filters = {}) => {
  let query = `
    SELECT
      b.*,
      p.first_name || ' ' || p.last_name as patient_name,
      p.identification_number,
      u.first_name || ' ' || u.last_name as dentist_name,
      bs.status_name as budget_status_name,
      bs.status_color,
      br.branch_name,
      tp.plan_name as treatment_plan_name
    FROM budgets b
    INNER JOIN patients p ON b.patient_id = p.patient_id
    INNER JOIN dentists d ON b.dentist_id = d.dentist_id
    INNER JOIN users u ON d.user_id = u.user_id
    INNER JOIN budget_statuses bs ON b.budget_status_id = bs.budget_status_id
    INNER JOIN branches br ON b.branch_id = br.branch_id
    LEFT JOIN treatment_plans tp ON b.treatment_plan_id = tp.treatment_plan_id
    WHERE b.status = 'active'
  `;

  const params = [];
  let paramIndex = 1;

  if (filters.patient_id) {
    query += ` AND b.patient_id = $${paramIndex}`;
    params.push(filters.patient_id);
    paramIndex++;
  }

  if (filters.dentist_id) {
    query += ` AND b.dentist_id = $${paramIndex}`;
    params.push(filters.dentist_id);
    paramIndex++;
  }

  if (filters.branch_id) {
    query += ` AND b.branch_id = $${paramIndex}`;
    params.push(filters.branch_id);
    paramIndex++;
  }

  if (filters.budget_status_id) {
    query += ` AND b.budget_status_id = $${paramIndex}`;
    params.push(filters.budget_status_id);
    paramIndex++;
  }

  if (filters.accepted_by_patient !== undefined) {
    query += ` AND b.accepted_by_patient = $${paramIndex}`;
    params.push(filters.accepted_by_patient);
    paramIndex++;
  }

  query += ` ORDER BY b.budget_date DESC, b.budget_id DESC`;

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
 * Obtener un presupuesto por ID con sus detalles
 */
const getBudgetById = async (budgetId) => {
  const budgetQuery = `
    SELECT
      b.*,
      p.first_name || ' ' || p.last_name as patient_name,
      p.identification_number,
      p.email as patient_email,
      p.phone as patient_phone,
      u.first_name || ' ' || u.last_name as dentist_name,
      bs.status_name as budget_status_name,
      bs.status_color,
      br.branch_name,
      tp.plan_name as treatment_plan_name
    FROM budgets b
    INNER JOIN patients p ON b.patient_id = p.patient_id
    INNER JOIN dentists d ON b.dentist_id = d.dentist_id
    INNER JOIN users u ON d.user_id = u.user_id
    INNER JOIN budget_statuses bs ON b.budget_status_id = bs.budget_status_id
    INNER JOIN branches br ON b.branch_id = br.branch_id
    LEFT JOIN treatment_plans tp ON b.treatment_plan_id = tp.treatment_plan_id
    WHERE b.budget_id = $1 AND b.status = 'active'
  `;

  const detailsQuery = `
    SELECT
      bd.*,
      dp.procedure_name,
      dp.procedure_code,
      tp.position_name as tooth_position_name,
      ts.surface_name as tooth_surface_name
    FROM budget_details bd
    INNER JOIN dental_procedures dp ON bd.dental_procedure_id = dp.dental_procedure_id
    LEFT JOIN tooth_positions tp ON bd.tooth_position_id = tp.tooth_position_id
    LEFT JOIN tooth_surfaces ts ON bd.tooth_surface_id = ts.tooth_surface_id
    WHERE bd.budget_id = $1 AND bd.status = 'active'
    ORDER BY bd.budget_detail_id ASC
  `;

  const [budgetResult, detailsResult] = await Promise.all([
    pool.query(budgetQuery, [budgetId]),
    pool.query(detailsQuery, [budgetId])
  ]);

  if (budgetResult.rows.length === 0) {
    return null;
  }

  return {
    ...budgetResult.rows[0],
    details: detailsResult.rows
  };
};

/**
 * Crear un presupuesto con sus detalles
 */
const createBudget = async (budgetData, budgetDetails) => {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // Insertar presupuesto
    const budgetQuery = `
      INSERT INTO budgets (
        patient_id, dentist_id, branch_id, treatment_plan_id, budget_status_id,
        budget_number, budget_date, valid_until, subtotal, discount_percentage,
        discount_amount, tax_percentage, tax_amount, total_amount, notes,
        user_id_registration
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
      RETURNING *
    `;

    const budgetValues = [
      budgetData.patient_id,
      budgetData.dentist_id,
      budgetData.branch_id,
      budgetData.treatment_plan_id || null,
      budgetData.budget_status_id,
      budgetData.budget_number || null,
      budgetData.budget_date,
      budgetData.valid_until || null,
      budgetData.subtotal,
      budgetData.discount_percentage || 0,
      budgetData.discount_amount || 0,
      budgetData.tax_percentage || 0,
      budgetData.tax_amount || 0,
      budgetData.total_amount,
      budgetData.notes || null,
      budgetData.user_id_registration
    ];

    const budgetResult = await client.query(budgetQuery, budgetValues);
    const newBudget = budgetResult.rows[0];

    // Insertar detalles del presupuesto
    if (budgetDetails && budgetDetails.length > 0) {
      const detailsQuery = `
        INSERT INTO budget_details (
          budget_id, dental_procedure_id, tooth_position_id, tooth_surface_id,
          description, quantity, unit_price, discount_percentage, discount_amount,
          subtotal, user_id_registration
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        RETURNING *
      `;

      const insertedDetails = [];
      for (const detail of budgetDetails) {
        const detailValues = [
          newBudget.budget_id,
          detail.dental_procedure_id,
          detail.tooth_position_id || null,
          detail.tooth_surface_id || null,
          detail.description || null,
          detail.quantity || 1,
          detail.unit_price,
          detail.discount_percentage || 0,
          detail.discount_amount || 0,
          detail.subtotal,
          budgetData.user_id_registration
        ];

        const detailResult = await client.query(detailsQuery, detailValues);
        insertedDetails.push(detailResult.rows[0]);
      }

      newBudget.details = insertedDetails;
    }

    await client.query('COMMIT');
    return newBudget;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

/**
 * Actualizar un presupuesto
 */
const updateBudget = async (budgetId, budgetData) => {
  const fields = [];
  const values = [];
  let paramIndex = 1;

  Object.keys(budgetData).forEach((key) => {
    if (key !== 'user_id_modification' && budgetData[key] !== undefined) {
      fields.push(`${key} = $${paramIndex}`);
      values.push(budgetData[key]);
      paramIndex++;
    }
  });

  if (fields.length === 0) {
    throw new Error('No hay campos para actualizar');
  }

  fields.push(`user_id_modification = $${paramIndex}`);
  values.push(budgetData.user_id_modification);
  paramIndex++;

  fields.push(`date_time_modification = CURRENT_TIMESTAMP`);

  values.push(budgetId);

  const query = `
    UPDATE budgets SET ${fields.join(', ')}
    WHERE budget_id = $${paramIndex} AND status = 'active'
    RETURNING *
  `;

  const result = await pool.query(query, values);
  return result.rows.length > 0 ? result.rows[0] : null;
};

/**
 * Aceptar presupuesto
 */
const acceptBudget = async (budgetId, userId) => {
  const query = `
    UPDATE budgets SET
      accepted_by_patient = true,
      accepted_date = CURRENT_DATE,
      user_id_modification = $1,
      date_time_modification = CURRENT_TIMESTAMP
    WHERE budget_id = $2 AND status = 'active'
    RETURNING *
  `;

  const result = await pool.query(query, [userId, budgetId]);
  return result.rows.length > 0 ? result.rows[0] : null;
};

/**
 * Eliminar un presupuesto (soft delete)
 */
const deleteBudget = async (budgetId, userId) => {
  const query = `
    UPDATE budgets SET
      status = 'inactive',
      user_id_modification = $1,
      date_time_modification = CURRENT_TIMESTAMP
    WHERE budget_id = $2 AND status = 'active'
    RETURNING budget_id
  `;

  const result = await pool.query(query, [userId, budgetId]);
  return result.rowCount > 0;
};

/**
 * Contar total de presupuestos
 */
const countBudgets = async (filters = {}) => {
  let query = `SELECT COUNT(*) as total FROM budgets b WHERE b.status = 'active'`;
  const params = [];
  let paramIndex = 1;

  if (filters.patient_id) {
    query += ` AND b.patient_id = $${paramIndex}`;
    params.push(filters.patient_id);
    paramIndex++;
  }

  if (filters.dentist_id) {
    query += ` AND b.dentist_id = $${paramIndex}`;
    params.push(filters.dentist_id);
    paramIndex++;
  }

  if (filters.branch_id) {
    query += ` AND b.branch_id = $${paramIndex}`;
    params.push(filters.branch_id);
    paramIndex++;
  }

  if (filters.budget_status_id) {
    query += ` AND b.budget_status_id = $${paramIndex}`;
    params.push(filters.budget_status_id);
    paramIndex++;
  }

  if (filters.accepted_by_patient !== undefined) {
    query += ` AND b.accepted_by_patient = $${paramIndex}`;
    params.push(filters.accepted_by_patient);
  }

  const result = await pool.query(query, params);
  return parseInt(result.rows[0].total);
};

/**
 * Agregar detalle a presupuesto
 */
const addBudgetDetail = async (budgetId, detailData, userId) => {
  const query = `
    INSERT INTO budget_details (
      budget_id, dental_procedure_id, tooth_position_id, tooth_surface_id,
      description, quantity, unit_price, discount_percentage, discount_amount,
      subtotal, user_id_registration
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
    RETURNING *
  `;

  const values = [
    budgetId,
    detailData.dental_procedure_id,
    detailData.tooth_position_id || null,
    detailData.tooth_surface_id || null,
    detailData.description || null,
    detailData.quantity || 1,
    detailData.unit_price,
    detailData.discount_percentage || 0,
    detailData.discount_amount || 0,
    detailData.subtotal,
    userId
  ];

  const result = await pool.query(query, values);
  return result.rows[0];
};

/**
 * Eliminar detalle de presupuesto
 */
const deleteBudgetDetail = async (budgetDetailId, userId) => {
  const query = `
    UPDATE budget_details SET
      status = 'inactive',
      user_id_modification = $1,
      date_time_modification = CURRENT_TIMESTAMP
    WHERE budget_detail_id = $2 AND status = 'active'
    RETURNING budget_detail_id
  `;

  const result = await pool.query(query, [userId, budgetDetailId]);
  return result.rowCount > 0;
};

module.exports = {
  getAllBudgets,
  getBudgetById,
  createBudget,
  updateBudget,
  acceptBudget,
  deleteBudget,
  countBudgets,
  addBudgetDetail,
  deleteBudgetDetail
};
