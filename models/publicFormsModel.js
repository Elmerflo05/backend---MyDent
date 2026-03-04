const pool = require('../config/db');

// Public Forms
const getAllPublicForms = async () => {
  const query = `SELECT * FROM public_forms WHERE status = 'active' AND is_active = true ORDER BY form_name ASC`;
  const result = await pool.query(query);
  return result.rows;
};

const getPublicFormById = async (formId) => {
  const result = await pool.query(
    'SELECT * FROM public_forms WHERE public_form_id = $1 AND status = $2',
    [formId, 'active']
  );
  return result.rows.length > 0 ? result.rows[0] : null;
};

const createPublicForm = async (formData, userId) => {
  const query = `
    INSERT INTO public_forms (
      form_name, form_type, form_description, form_fields, is_active, user_id_registration
    ) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *
  `;
  const values = [
    formData.form_name,
    formData.form_type || 'general',
    formData.form_description || null,
    formData.form_fields || null,
    formData.is_active !== false,
    userId
  ];
  const result = await pool.query(query, values);
  return result.rows[0];
};

const updatePublicForm = async (formId, formData, userId) => {
  const query = `
    UPDATE public_forms SET
      form_name = COALESCE($1, form_name),
      form_type = COALESCE($2, form_type),
      form_description = COALESCE($3, form_description),
      form_fields = COALESCE($4, form_fields),
      is_active = COALESCE($5, is_active),
      user_id_modification = $6,
      date_time_modification = CURRENT_TIMESTAMP
    WHERE public_form_id = $7 AND status = 'active'
    RETURNING *
  `;
  const result = await pool.query(query, [
    formData.form_name, formData.form_type, formData.form_description,
    formData.form_fields, formData.is_active, userId, formId
  ]);
  return result.rows.length > 0 ? result.rows[0] : null;
};

const deletePublicForm = async (formId, userId) => {
  const result = await pool.query(
    `UPDATE public_forms SET status = 'inactive', user_id_modification = $1,
     date_time_modification = CURRENT_TIMESTAMP
     WHERE public_form_id = $2 AND status = 'active' RETURNING public_form_id`,
    [userId, formId]
  );
  return result.rowCount > 0;
};

// Public Form Submissions
const getAllFormSubmissions = async (filters = {}) => {
  let query = `
    SELECT pfs.*, pf.form_name, pf.form_type
    FROM public_form_submissions pfs
    LEFT JOIN public_forms pf ON pfs.public_form_id = pf.public_form_id
    WHERE pfs.status = 'active'
  `;
  const params = [];
  let paramIndex = 1;

  if (filters.public_form_id) {
    query += ` AND pfs.public_form_id = $${paramIndex}`;
    params.push(filters.public_form_id);
    paramIndex++;
  }

  if (filters.submission_status) {
    query += ` AND pfs.submission_status = $${paramIndex}`;
    params.push(filters.submission_status);
    paramIndex++;
  }

  query += ` ORDER BY pfs.submission_date DESC`;

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

const getFormSubmissionById = async (submissionId) => {
  const query = `
    SELECT pfs.*, pf.form_name, pf.form_type, pf.form_fields
    FROM public_form_submissions pfs
    LEFT JOIN public_forms pf ON pfs.public_form_id = pf.public_form_id
    WHERE pfs.public_form_submission_id = $1 AND pfs.status = 'active'
  `;
  const result = await pool.query(query, [submissionId]);
  return result.rows.length > 0 ? result.rows[0] : null;
};

const createFormSubmission = async (submissionData) => {
  const query = `
    INSERT INTO public_form_submissions (
      public_form_id, submission_data, submitter_name, submitter_email,
      submitter_phone, submission_date, submission_status
    ) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *
  `;
  const values = [
    submissionData.public_form_id || null,
    submissionData.submission_data || null,
    submissionData.submitter_name || null,
    submissionData.submitter_email || null,
    submissionData.submitter_phone || null,
    submissionData.submission_date || new Date(),
    submissionData.submission_status || 'pending'
  ];
  const result = await pool.query(query, values);
  return result.rows[0];
};

const updateFormSubmission = async (submissionId, submissionData, userId) => {
  const query = `
    UPDATE public_form_submissions SET
      submission_status = COALESCE($1, submission_status),
      user_id_modification = $2,
      date_time_modification = CURRENT_TIMESTAMP
    WHERE public_form_submission_id = $3 AND status = 'active'
    RETURNING *
  `;
  const result = await pool.query(query, [submissionData.submission_status, userId, submissionId]);
  return result.rows.length > 0 ? result.rows[0] : null;
};

const deleteFormSubmission = async (submissionId, userId) => {
  const result = await pool.query(
    `UPDATE public_form_submissions SET status = 'inactive', user_id_modification = $1,
     date_time_modification = CURRENT_TIMESTAMP
     WHERE public_form_submission_id = $2 AND status = 'active' RETURNING public_form_submission_id`,
    [userId, submissionId]
  );
  return result.rowCount > 0;
};

const countFormSubmissions = async (filters = {}) => {
  let query = `SELECT COUNT(*) as total FROM public_form_submissions WHERE status = 'active'`;
  const params = [];
  let paramIndex = 1;

  if (filters.public_form_id) {
    query += ` AND public_form_id = $${paramIndex}`;
    params.push(filters.public_form_id);
    paramIndex++;
  }

  if (filters.submission_status) {
    query += ` AND submission_status = $${paramIndex}`;
    params.push(filters.submission_status);
  }

  const result = await pool.query(query, params);
  return parseInt(result.rows[0].total);
};

module.exports = {
  getAllPublicForms,
  getPublicFormById,
  createPublicForm,
  updatePublicForm,
  deletePublicForm,
  getAllFormSubmissions,
  getFormSubmissionById,
  createFormSubmission,
  updateFormSubmission,
  deleteFormSubmission,
  countFormSubmissions
};
