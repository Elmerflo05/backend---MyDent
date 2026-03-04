const pool = require('../config/db');

// Health Plans
const getAllHealthPlans = async (filters = {}) => {
  let query = `
    SELECT *
    FROM health_plans
    WHERE status = 'active'
  `;

  const params = [];
  let paramIndex = 1;

  if (filters.plan_type) {
    query += ` AND plan_type = $${paramIndex}`;
    params.push(filters.plan_type);
    paramIndex++;
  }

  if (filters.is_active !== undefined) {
    query += ` AND is_active = $${paramIndex}`;
    params.push(filters.is_active);
    paramIndex++;
  }

  if (filters.search) {
    query += ` AND (plan_name ILIKE $${paramIndex} OR plan_code ILIKE $${paramIndex})`;
    params.push(`%${filters.search}%`);
    paramIndex++;
  }

  query += ` ORDER BY plan_name ASC`;

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

const getHealthPlanById = async (planId) => {
  const query = `SELECT * FROM health_plans WHERE health_plan_id = $1 AND status = 'active'`;
  const result = await pool.query(query, [planId]);
  return result.rows.length > 0 ? result.rows[0] : null;
};

const createHealthPlan = async (planData) => {
  const query = `
    INSERT INTO health_plans (
      plan_name, plan_code, plan_type, description, monthly_fee,
      enrollment_fee, coverage_details, max_subscribers, is_active,
      user_id_registration
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
    RETURNING *
  `;

  const values = [
    planData.plan_name,
    planData.plan_code || null,
    planData.plan_type,
    planData.description || null,
    planData.monthly_fee || null,
    planData.enrollment_fee || null,
    planData.coverage_details || null,
    planData.max_subscribers || null,
    planData.is_active !== undefined ? planData.is_active : true,
    planData.user_id_registration
  ];

  const result = await pool.query(query, values);
  return result.rows[0];
};

const updateHealthPlan = async (planId, planData) => {
  const fields = [];
  const values = [];
  let paramIndex = 1;

  const allowedFields = [
    'plan_name', 'plan_code', 'plan_type', 'description', 'monthly_fee',
    'enrollment_fee', 'coverage_details', 'max_subscribers', 'is_active'
  ];

  allowedFields.forEach((field) => {
    if (planData[field] !== undefined) {
      fields.push(`${field} = $${paramIndex}`);
      values.push(planData[field]);
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
    UPDATE health_plans SET ${fields.join(', ')}
    WHERE health_plan_id = $${paramIndex} AND status = 'active'
    RETURNING *
  `;

  const result = await pool.query(query, values);
  return result.rows.length > 0 ? result.rows[0] : null;
};

const deleteHealthPlan = async (planId, userId) => {
  const query = `
    UPDATE health_plans SET
      status = 'inactive',
      user_id_modification = $1,
      date_time_modification = CURRENT_TIMESTAMP
    WHERE health_plan_id = $2 AND status = 'active'
    RETURNING health_plan_id
  `;

  const result = await pool.query(query, [userId, planId]);
  return result.rowCount > 0;
};

const countHealthPlans = async (filters = {}) => {
  let query = `SELECT COUNT(*) as total FROM health_plans WHERE status = 'active'`;
  const params = [];
  let paramIndex = 1;

  if (filters.plan_type) {
    query += ` AND plan_type = $${paramIndex}`;
    params.push(filters.plan_type);
    paramIndex++;
  }

  if (filters.is_active !== undefined) {
    query += ` AND is_active = $${paramIndex}`;
    params.push(filters.is_active);
    paramIndex++;
  }

  if (filters.search) {
    query += ` AND (plan_name ILIKE $${paramIndex} OR plan_code ILIKE $${paramIndex})`;
    params.push(`%${filters.search}%`);
  }

  const result = await pool.query(query, params);
  return parseInt(result.rows[0].total);
};

// Health Plan Subscriptions
const getAllHealthPlanSubscriptions = async (filters = {}) => {
  let query = `
    SELECT
      hps.*,
      hp.plan_name,
      hp.plan_code,
      hp.plan_type,
      hp.monthly_fee,
      p.first_name || ' ' || p.last_name as patient_name,
      p.identification_number
    FROM health_plan_subscriptions hps
    INNER JOIN health_plans hp ON hps.health_plan_id = hp.health_plan_id
    INNER JOIN patients p ON hps.patient_id = p.patient_id
    WHERE hps.status = 'active'
  `;

  const params = [];
  let paramIndex = 1;

  if (filters.health_plan_id) {
    query += ` AND hps.health_plan_id = $${paramIndex}`;
    params.push(filters.health_plan_id);
    paramIndex++;
  }

  if (filters.patient_id) {
    query += ` AND hps.patient_id = $${paramIndex}`;
    params.push(filters.patient_id);
    paramIndex++;
  }

  if (filters.subscription_status) {
    query += ` AND hps.subscription_status = $${paramIndex}`;
    params.push(filters.subscription_status);
    paramIndex++;
  }

  if (filters.date_from) {
    query += ` AND hps.start_date >= $${paramIndex}`;
    params.push(filters.date_from);
    paramIndex++;
  }

  if (filters.date_to) {
    query += ` AND (hps.end_date IS NULL OR hps.end_date <= $${paramIndex})`;
    params.push(filters.date_to);
    paramIndex++;
  }

  query += ` ORDER BY hps.start_date DESC, hps.subscription_id DESC`;

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

const getHealthPlanSubscriptionById = async (subscriptionId) => {
  const query = `
    SELECT
      hps.*,
      hp.plan_name,
      hp.plan_code,
      hp.plan_type,
      hp.monthly_fee,
      hp.enrollment_fee,
      hp.coverage_details,
      p.first_name || ' ' || p.last_name as patient_name,
      p.identification_number,
      p.email as patient_email,
      p.phone as patient_phone
    FROM health_plan_subscriptions hps
    INNER JOIN health_plans hp ON hps.health_plan_id = hp.health_plan_id
    INNER JOIN patients p ON hps.patient_id = p.patient_id
    WHERE hps.subscription_id = $1 AND hps.status = 'active'
  `;

  const result = await pool.query(query, [subscriptionId]);
  return result.rows.length > 0 ? result.rows[0] : null;
};

const createHealthPlanSubscription = async (subscriptionData) => {
  const query = `
    INSERT INTO health_plan_subscriptions (
      health_plan_id, patient_id, subscription_number, start_date, end_date,
      subscription_status, policy_number, subscriber_name, subscriber_relationship,
      copay_amount, notes, user_id_registration
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
    RETURNING *
  `;

  const values = [
    subscriptionData.health_plan_id,
    subscriptionData.patient_id,
    subscriptionData.subscription_number || null,
    subscriptionData.start_date,
    subscriptionData.end_date || null,
    subscriptionData.subscription_status || 'active',
    subscriptionData.policy_number || null,
    subscriptionData.subscriber_name || null,
    subscriptionData.subscriber_relationship || null,
    subscriptionData.copay_amount || null,
    subscriptionData.notes || null,
    subscriptionData.user_id_registration
  ];

  const result = await pool.query(query, values);
  return result.rows[0];
};

const updateHealthPlanSubscription = async (subscriptionId, subscriptionData) => {
  const fields = [];
  const values = [];
  let paramIndex = 1;

  const allowedFields = [
    'subscription_number', 'start_date', 'end_date', 'subscription_status',
    'policy_number', 'subscriber_name', 'subscriber_relationship',
    'copay_amount', 'notes'
  ];

  allowedFields.forEach((field) => {
    if (subscriptionData[field] !== undefined) {
      fields.push(`${field} = $${paramIndex}`);
      values.push(subscriptionData[field]);
      paramIndex++;
    }
  });

  if (fields.length === 0) {
    throw new Error('No hay campos para actualizar');
  }

  fields.push(`user_id_modification = $${paramIndex}`);
  values.push(subscriptionData.user_id_modification);
  paramIndex++;

  fields.push(`date_time_modification = CURRENT_TIMESTAMP`);

  values.push(subscriptionId);

  const query = `
    UPDATE health_plan_subscriptions SET ${fields.join(', ')}
    WHERE subscription_id = $${paramIndex} AND status = 'active'
    RETURNING *
  `;

  const result = await pool.query(query, values);
  return result.rows.length > 0 ? result.rows[0] : null;
};

const deleteHealthPlanSubscription = async (subscriptionId, userId) => {
  const query = `
    UPDATE health_plan_subscriptions SET
      status = 'inactive',
      user_id_modification = $1,
      date_time_modification = CURRENT_TIMESTAMP
    WHERE subscription_id = $2 AND status = 'active'
    RETURNING subscription_id
  `;

  const result = await pool.query(query, [userId, subscriptionId]);
  return result.rowCount > 0;
};

const countHealthPlanSubscriptions = async (filters = {}) => {
  let query = `SELECT COUNT(*) as total FROM health_plan_subscriptions hps WHERE hps.status = 'active'`;
  const params = [];
  let paramIndex = 1;

  if (filters.health_plan_id) {
    query += ` AND hps.health_plan_id = $${paramIndex}`;
    params.push(filters.health_plan_id);
    paramIndex++;
  }

  if (filters.patient_id) {
    query += ` AND hps.patient_id = $${paramIndex}`;
    params.push(filters.patient_id);
    paramIndex++;
  }

  if (filters.subscription_status) {
    query += ` AND hps.subscription_status = $${paramIndex}`;
    params.push(filters.subscription_status);
    paramIndex++;
  }

  if (filters.date_from) {
    query += ` AND hps.start_date >= $${paramIndex}`;
    params.push(filters.date_from);
    paramIndex++;
  }

  if (filters.date_to) {
    query += ` AND (hps.end_date IS NULL OR hps.end_date <= $${paramIndex})`;
    params.push(filters.date_to);
  }

  const result = await pool.query(query, params);
  return parseInt(result.rows[0].total);
};

// Health Plan Terms

// Obtener TODOS los términos de todos los planes (para gestión admin)
const getAllTermsAcrossPlans = async () => {
  const query = `
    SELECT hpt.*, hp.plan_name
    FROM health_plan_terms hpt
    INNER JOIN health_plans hp ON hpt.health_plan_id = hp.health_plan_id
    WHERE hpt.status = 'active'
    ORDER BY hpt.date_time_registration DESC, hpt.health_plan_term_id DESC
  `;

  const result = await pool.query(query);
  return result.rows;
};

const getAllHealthPlanTerms = async (healthPlanId) => {
  const query = `
    SELECT *
    FROM health_plan_terms
    WHERE health_plan_id = $1 AND status = 'active'
    ORDER BY effective_date DESC, health_plan_term_id DESC
  `;

  const result = await pool.query(query, [healthPlanId]);
  return result.rows;
};

const getHealthPlanTermById = async (termId) => {
  const query = `SELECT * FROM health_plan_terms WHERE health_plan_term_id = $1 AND status = 'active'`;
  const result = await pool.query(query, [termId]);
  return result.rows.length > 0 ? result.rows[0] : null;
};

const createHealthPlanTerm = async (termData) => {
  const query = `
    INSERT INTO health_plan_terms (
      health_plan_id, term_type, term_description, term_value,
      effective_date, expiry_date, user_id_registration
    ) VALUES ($1, $2, $3, $4, $5, $6, $7)
    RETURNING *
  `;

  const values = [
    termData.health_plan_id,
    termData.term_type,
    termData.term_description,
    termData.term_value || null,
    termData.effective_date || null,
    termData.expiry_date || null,
    termData.user_id_registration
  ];

  const result = await pool.query(query, values);
  return result.rows[0];
};

const updateHealthPlanTerm = async (termId, termData) => {
  const fields = [];
  const values = [];
  let paramIndex = 1;

  const allowedFields = [
    'term_type', 'term_description', 'term_value', 'effective_date', 'expiry_date'
  ];

  allowedFields.forEach((field) => {
    if (termData[field] !== undefined) {
      fields.push(`${field} = $${paramIndex}`);
      values.push(termData[field]);
      paramIndex++;
    }
  });

  if (fields.length === 0) {
    throw new Error('No hay campos para actualizar');
  }

  fields.push(`user_id_modification = $${paramIndex}`);
  values.push(termData.user_id_modification);
  paramIndex++;

  fields.push(`date_time_modification = CURRENT_TIMESTAMP`);

  values.push(termId);

  const query = `
    UPDATE health_plan_terms SET ${fields.join(', ')}
    WHERE health_plan_term_id = $${paramIndex} AND status = 'active'
    RETURNING *
  `;

  const result = await pool.query(query, values);
  return result.rows.length > 0 ? result.rows[0] : null;
};

const deleteHealthPlanTerm = async (termId, userId) => {
  const query = `
    UPDATE health_plan_terms SET
      status = 'inactive',
      user_id_modification = $1,
      date_time_modification = CURRENT_TIMESTAMP
    WHERE health_plan_term_id = $2 AND status = 'active'
    RETURNING health_plan_term_id
  `;

  const result = await pool.query(query, [userId, termId]);
  return result.rowCount > 0;
};

module.exports = {
  getAllHealthPlans,
  getHealthPlanById,
  createHealthPlan,
  updateHealthPlan,
  deleteHealthPlan,
  countHealthPlans,
  getAllHealthPlanSubscriptions,
  getHealthPlanSubscriptionById,
  createHealthPlanSubscription,
  updateHealthPlanSubscription,
  deleteHealthPlanSubscription,
  countHealthPlanSubscriptions,
  getAllTermsAcrossPlans,
  getAllHealthPlanTerms,
  getHealthPlanTermById,
  createHealthPlanTerm,
  updateHealthPlanTerm,
  deleteHealthPlanTerm
};
