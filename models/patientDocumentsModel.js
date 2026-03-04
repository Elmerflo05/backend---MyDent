const pool = require('../config/db');

const getAllPatientDocuments = async (filters = {}) => {
  let query = `
    SELECT
      pd.*,
      p.first_name || ' ' || p.last_name as patient_name,
      p.identification_number
    FROM patient_documents pd
    INNER JOIN patients p ON pd.patient_id = p.patient_id
    WHERE pd.status = 'active'
  `;

  const params = [];
  let paramIndex = 1;

  if (filters.patient_id) {
    query += ` AND pd.patient_id = $${paramIndex}`;
    params.push(filters.patient_id);
    paramIndex++;
  }

  if (filters.document_type) {
    query += ` AND pd.document_type = $${paramIndex}`;
    params.push(filters.document_type);
    paramIndex++;
  }

  if (filters.search) {
    query += ` AND pd.document_name ILIKE $${paramIndex}`;
    params.push(`%${filters.search}%`);
    paramIndex++;
  }

  query += ` ORDER BY pd.upload_date DESC`;

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

const getPatientDocumentById = async (documentId) => {
  const query = `
    SELECT
      pd.*,
      p.first_name || ' ' || p.last_name as patient_name,
      p.identification_number
    FROM patient_documents pd
    INNER JOIN patients p ON pd.patient_id = p.patient_id
    WHERE pd.patient_document_id = $1 AND pd.status = 'active'
  `;

  const result = await pool.query(query, [documentId]);
  return result.rows.length > 0 ? result.rows[0] : null;
};

const createPatientDocument = async (documentData) => {
  const query = `
    INSERT INTO patient_documents (
      patient_id, document_type, document_name, file_path,
      file_size, mime_type, upload_date, description, user_id_registration
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    RETURNING *
  `;

  const values = [
    documentData.patient_id,
    documentData.document_type || 'general',
    documentData.document_name,
    documentData.file_path,
    documentData.file_size || null,
    documentData.mime_type || null,
    documentData.upload_date || new Date(),
    documentData.description || null,
    documentData.user_id_registration
  ];

  const result = await pool.query(query, values);
  return result.rows[0];
};

const updatePatientDocument = async (documentId, documentData) => {
  const fields = [];
  const values = [];
  let paramIndex = 1;

  const allowedFields = ['document_type', 'document_name', 'description'];

  allowedFields.forEach((field) => {
    if (documentData[field] !== undefined) {
      fields.push(`${field} = $${paramIndex}`);
      values.push(documentData[field]);
      paramIndex++;
    }
  });

  if (fields.length === 0) {
    throw new Error('No hay campos para actualizar');
  }

  fields.push(`user_id_modification = $${paramIndex}`);
  values.push(documentData.user_id_modification);
  paramIndex++;

  fields.push(`date_time_modification = CURRENT_TIMESTAMP`);

  values.push(documentId);

  const query = `
    UPDATE patient_documents SET ${fields.join(', ')}
    WHERE patient_document_id = $${paramIndex} AND status = 'active'
    RETURNING *
  `;

  const result = await pool.query(query, values);
  return result.rows.length > 0 ? result.rows[0] : null;
};

const deletePatientDocument = async (documentId, userId) => {
  const query = `
    UPDATE patient_documents SET
      status = 'inactive',
      user_id_modification = $1,
      date_time_modification = CURRENT_TIMESTAMP
    WHERE patient_document_id = $2 AND status = 'active'
    RETURNING patient_document_id
  `;

  const result = await pool.query(query, [userId, documentId]);
  return result.rowCount > 0;
};

const countPatientDocuments = async (filters = {}) => {
  let query = `
    SELECT COUNT(*) as total
    FROM patient_documents pd
    WHERE pd.status = 'active'
  `;

  const params = [];
  let paramIndex = 1;

  if (filters.patient_id) {
    query += ` AND pd.patient_id = $${paramIndex}`;
    params.push(filters.patient_id);
    paramIndex++;
  }

  if (filters.document_type) {
    query += ` AND pd.document_type = $${paramIndex}`;
    params.push(filters.document_type);
    paramIndex++;
  }

  if (filters.search) {
    query += ` AND pd.document_name ILIKE $${paramIndex}`;
    params.push(`%${filters.search}%`);
  }

  const result = await pool.query(query, params);
  return parseInt(result.rows[0].total);
};

module.exports = {
  getAllPatientDocuments,
  getPatientDocumentById,
  createPatientDocument,
  updatePatientDocument,
  deletePatientDocument,
  countPatientDocuments
};
