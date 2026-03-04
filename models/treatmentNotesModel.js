const pool = require('../config/db');

const getAllTreatmentNotes = async (filters = {}) => {
  let query = `
    SELECT
      tn.*,
      t.treatment_name,
      p.first_name || ' ' || p.last_name as patient_name,
      p.identification_number,
      u.first_name || ' ' || u.last_name as dentist_name,
      b.branch_name
    FROM treatment_notes tn
    INNER JOIN treatments t ON tn.treatment_id = t.treatment_id
    INNER JOIN patients p ON t.patient_id = p.patient_id
    INNER JOIN dentists d ON t.dentist_id = d.dentist_id
    INNER JOIN users u ON d.user_id = u.user_id
    INNER JOIN branches b ON t.branch_id = b.branch_id
    WHERE tn.status = 'active'
  `;

  const params = [];
  let paramIndex = 1;

  if (filters.treatment_id) {
    query += ` AND tn.treatment_id = $${paramIndex}`;
    params.push(filters.treatment_id);
    paramIndex++;
  }

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

  if (filters.note_type) {
    query += ` AND tn.note_type = $${paramIndex}`;
    params.push(filters.note_type);
    paramIndex++;
  }

  if (filters.date_from) {
    query += ` AND tn.note_date >= $${paramIndex}`;
    params.push(filters.date_from);
    paramIndex++;
  }

  if (filters.date_to) {
    query += ` AND tn.note_date <= $${paramIndex}`;
    params.push(filters.date_to);
    paramIndex++;
  }

  query += ` ORDER BY tn.note_date DESC, tn.date_time_registration DESC`;

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

const getTreatmentNoteById = async (noteId) => {
  const query = `
    SELECT
      tn.*,
      t.treatment_name,
      p.first_name || ' ' || p.last_name as patient_name,
      p.identification_number,
      u.first_name || ' ' || u.last_name as dentist_name,
      b.branch_name
    FROM treatment_notes tn
    INNER JOIN treatments t ON tn.treatment_id = t.treatment_id
    INNER JOIN patients p ON t.patient_id = p.patient_id
    INNER JOIN dentists d ON t.dentist_id = d.dentist_id
    INNER JOIN users u ON d.user_id = u.user_id
    INNER JOIN branches b ON t.branch_id = b.branch_id
    WHERE tn.treatment_note_id = $1 AND tn.status = 'active'
  `;

  const result = await pool.query(query, [noteId]);
  return result.rows.length > 0 ? result.rows[0] : null;
};

const createTreatmentNote = async (noteData) => {
  const query = `
    INSERT INTO treatment_notes (
      treatment_id, note_date, note_type, note_title, note_content,
      observations, attachments, user_id_registration
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    RETURNING *
  `;

  const values = [
    noteData.treatment_id,
    noteData.note_date || new Date(),
    noteData.note_type || 'general',
    noteData.note_title || null,
    noteData.note_content,
    noteData.observations || null,
    noteData.attachments || null,
    noteData.user_id_registration
  ];

  const result = await pool.query(query, values);
  return result.rows[0];
};

const updateTreatmentNote = async (noteId, noteData) => {
  const fields = [];
  const values = [];
  let paramIndex = 1;

  const allowedFields = [
    'note_date', 'note_type', 'note_title', 'note_content',
    'observations', 'attachments'
  ];

  allowedFields.forEach((field) => {
    if (noteData[field] !== undefined) {
      fields.push(`${field} = $${paramIndex}`);
      values.push(noteData[field]);
      paramIndex++;
    }
  });

  if (fields.length === 0) {
    throw new Error('No hay campos para actualizar');
  }

  fields.push(`user_id_modification = $${paramIndex}`);
  values.push(noteData.user_id_modification);
  paramIndex++;

  fields.push(`date_time_modification = CURRENT_TIMESTAMP`);

  values.push(noteId);

  const query = `
    UPDATE treatment_notes SET ${fields.join(', ')}
    WHERE treatment_note_id = $${paramIndex} AND status = 'active'
    RETURNING *
  `;

  const result = await pool.query(query, values);
  return result.rows.length > 0 ? result.rows[0] : null;
};

const deleteTreatmentNote = async (noteId, userId) => {
  const query = `
    UPDATE treatment_notes SET
      status = 'inactive',
      user_id_modification = $1,
      date_time_modification = CURRENT_TIMESTAMP
    WHERE treatment_note_id = $2 AND status = 'active'
    RETURNING treatment_note_id
  `;

  const result = await pool.query(query, [userId, noteId]);
  return result.rowCount > 0;
};

const countTreatmentNotes = async (filters = {}) => {
  let query = `
    SELECT COUNT(*) as total
    FROM treatment_notes tn
    INNER JOIN treatments t ON tn.treatment_id = t.treatment_id
    WHERE tn.status = 'active'
  `;

  const params = [];
  let paramIndex = 1;

  if (filters.treatment_id) {
    query += ` AND tn.treatment_id = $${paramIndex}`;
    params.push(filters.treatment_id);
    paramIndex++;
  }

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

  if (filters.note_type) {
    query += ` AND tn.note_type = $${paramIndex}`;
    params.push(filters.note_type);
    paramIndex++;
  }

  if (filters.date_from) {
    query += ` AND tn.note_date >= $${paramIndex}`;
    params.push(filters.date_from);
    paramIndex++;
  }

  if (filters.date_to) {
    query += ` AND tn.note_date <= $${paramIndex}`;
    params.push(filters.date_to);
  }

  const result = await pool.query(query, params);
  return parseInt(result.rows[0].total);
};

module.exports = {
  getAllTreatmentNotes,
  getTreatmentNoteById,
  createTreatmentNote,
  updateTreatmentNote,
  deleteTreatmentNote,
  countTreatmentNotes
};
