const pool = require('../config/db');

const getAllMedicalHistories = async (filters = {}) => {
  let query = `
    SELECT
      mh.*,
      p.first_name || ' ' || p.last_name as patient_name,
      p.identification_number,
      p.date_of_birth,
      p.email as patient_email
    FROM medical_histories mh
    INNER JOIN patients p ON mh.patient_id = p.patient_id
    WHERE mh.status = 'active'
  `;

  const params = [];
  let paramIndex = 1;

  if (filters.patient_id) {
    query += ` AND mh.patient_id = $${paramIndex}`;
    params.push(filters.patient_id);
    paramIndex++;
  }

  if (filters.has_allergies !== undefined) {
    query += ` AND mh.has_allergies = $${paramIndex}`;
    params.push(filters.has_allergies);
    paramIndex++;
  }

  if (filters.has_chronic_diseases !== undefined) {
    query += ` AND mh.has_chronic_diseases = $${paramIndex}`;
    params.push(filters.has_chronic_diseases);
    paramIndex++;
  }

  if (filters.has_diabetes !== undefined) {
    query += ` AND mh.has_diabetes = $${paramIndex}`;
    params.push(filters.has_diabetes);
    paramIndex++;
  }

  if (filters.has_hypertension !== undefined) {
    query += ` AND mh.has_hypertension = $${paramIndex}`;
    params.push(filters.has_hypertension);
    paramIndex++;
  }

  query += ` ORDER BY mh.date_time_registration DESC`;

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

const getMedicalHistoryById = async (historyId) => {
  const query = `
    SELECT
      mh.*,
      p.first_name || ' ' || p.last_name as patient_name,
      p.identification_number,
      p.date_of_birth,
      p.email as patient_email,
      p.phone as patient_phone,
      p.gender_id,
      g.gender_name
    FROM medical_histories mh
    INNER JOIN patients p ON mh.patient_id = p.patient_id
    LEFT JOIN genders g ON p.gender_id = g.gender_id
    WHERE mh.medical_history_id = $1 AND mh.status = 'active'
  `;

  const result = await pool.query(query, [historyId]);
  return result.rows.length > 0 ? result.rows[0] : null;
};

const getMedicalHistoryByPatient = async (patientId) => {
  const query = `
    SELECT
      mh.*,
      p.first_name || ' ' || p.last_name as patient_name,
      p.identification_number,
      p.birth_date
    FROM medical_histories mh
    INNER JOIN patients p ON mh.patient_id = p.patient_id
    WHERE mh.patient_id = $1 AND mh.status = 'active'
    ORDER BY mh.date_time_registration DESC
    LIMIT 1
  `;

  const result = await pool.query(query, [patientId]);
  return result.rows.length > 0 ? result.rows[0] : null;
};

const createMedicalHistory = async (historyData) => {
  const query = `
    INSERT INTO medical_histories (
      patient_id, has_allergies, allergies_description, has_chronic_diseases,
      chronic_diseases_description, has_medications, current_medications,
      has_surgeries, surgeries_description, has_bleeding_disorders,
      bleeding_disorders_description, has_diabetes, has_hypertension,
      has_heart_disease, heart_disease_description, is_pregnant,
      pregnancy_months, is_breastfeeding, smokes, smoking_frequency,
      drinks_alcohol, alcohol_frequency, last_dental_visit,
      dental_visit_reason, additional_notes, user_id_registration,
      pathological_background
    ) VALUES (
      $1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
      $11, $12, $13, $14, $15, $16, $17, $18, $19, $20,
      $21, $22, $23, $24, $25, $26, $27
    )
    RETURNING *
  `;

  // Procesar pathological_background: asegurar que sea un array JSON valido
  const pathologicalBackground = Array.isArray(historyData.pathological_background)
    ? JSON.stringify(historyData.pathological_background)
    : '[]';

  const values = [
    historyData.patient_id,
    historyData.has_allergies || false,
    historyData.allergies_description || null,
    historyData.has_chronic_diseases || false,
    historyData.chronic_diseases_description || null,
    historyData.has_medications || false,
    historyData.current_medications || null,
    historyData.has_surgeries || false,
    historyData.surgeries_description || null,
    historyData.has_bleeding_disorders || false,
    historyData.bleeding_disorders_description || null,
    historyData.has_diabetes || false,
    historyData.has_hypertension || false,
    historyData.has_heart_disease || false,
    historyData.heart_disease_description || null,
    historyData.is_pregnant || null,
    historyData.pregnancy_months || null,
    historyData.is_breastfeeding || null,
    historyData.smokes || false,
    historyData.smoking_frequency || null,
    historyData.drinks_alcohol || false,
    historyData.alcohol_frequency || null,
    historyData.last_dental_visit || null,
    historyData.dental_visit_reason || null,
    historyData.additional_notes || null,
    historyData.user_id_registration,
    pathologicalBackground
  ];

  const result = await pool.query(query, values);
  return result.rows[0];
};

const updateMedicalHistory = async (historyId, historyData) => {
  const fields = [];
  const values = [];
  let paramIndex = 1;

  const allowedFields = [
    'has_allergies', 'allergies_description', 'has_chronic_diseases',
    'chronic_diseases_description', 'has_medications', 'current_medications',
    'has_surgeries', 'surgeries_description', 'has_bleeding_disorders',
    'bleeding_disorders_description', 'has_diabetes', 'has_hypertension',
    'has_heart_disease', 'heart_disease_description', 'is_pregnant',
    'pregnancy_months', 'is_breastfeeding', 'smokes', 'smoking_frequency',
    'drinks_alcohol', 'alcohol_frequency', 'last_dental_visit',
    'dental_visit_reason', 'additional_notes', 'pathological_background'
  ];

  allowedFields.forEach((field) => {
    if (historyData[field] !== undefined) {
      // Manejo especial para pathological_background (JSONB)
      if (field === 'pathological_background') {
        fields.push(`${field} = $${paramIndex}`);
        const value = Array.isArray(historyData[field])
          ? JSON.stringify(historyData[field])
          : '[]';
        values.push(value);
      } else {
        fields.push(`${field} = $${paramIndex}`);
        values.push(historyData[field]);
      }
      paramIndex++;
    }
  });

  if (fields.length === 0) {
    throw new Error('No hay campos para actualizar');
  }

  fields.push(`user_id_modification = $${paramIndex}`);
  values.push(historyData.user_id_modification);
  paramIndex++;

  fields.push(`date_time_modification = CURRENT_TIMESTAMP`);

  values.push(historyId);

  const query = `
    UPDATE medical_histories SET ${fields.join(', ')}
    WHERE medical_history_id = $${paramIndex} AND status = 'active'
    RETURNING *
  `;

  const result = await pool.query(query, values);
  return result.rows.length > 0 ? result.rows[0] : null;
};

const deleteMedicalHistory = async (historyId, userId) => {
  const query = `
    UPDATE medical_histories SET
      status = 'inactive',
      user_id_modification = $1,
      date_time_modification = CURRENT_TIMESTAMP
    WHERE medical_history_id = $2 AND status = 'active'
    RETURNING medical_history_id
  `;

  const result = await pool.query(query, [userId, historyId]);
  return result.rowCount > 0;
};

const countMedicalHistories = async (filters = {}) => {
  let query = `SELECT COUNT(*) as total FROM medical_histories mh WHERE mh.status = 'active'`;
  const params = [];
  let paramIndex = 1;

  if (filters.patient_id) {
    query += ` AND mh.patient_id = $${paramIndex}`;
    params.push(filters.patient_id);
    paramIndex++;
  }

  if (filters.has_allergies !== undefined) {
    query += ` AND mh.has_allergies = $${paramIndex}`;
    params.push(filters.has_allergies);
    paramIndex++;
  }

  if (filters.has_chronic_diseases !== undefined) {
    query += ` AND mh.has_chronic_diseases = $${paramIndex}`;
    params.push(filters.has_chronic_diseases);
    paramIndex++;
  }

  if (filters.has_diabetes !== undefined) {
    query += ` AND mh.has_diabetes = $${paramIndex}`;
    params.push(filters.has_diabetes);
    paramIndex++;
  }

  if (filters.has_hypertension !== undefined) {
    query += ` AND mh.has_hypertension = $${paramIndex}`;
    params.push(filters.has_hypertension);
  }

  const result = await pool.query(query, params);
  return parseInt(result.rows[0].total);
};

/**
 * Upsert de historia médica:
 * Si existe una historia médica activa para el paciente, la actualiza.
 * Si no existe, crea una nueva.
 */
const upsertMedicalHistory = async (historyData) => {
  const { patient_id, user_id_registration } = historyData;

  // Buscar historia médica existente para el paciente
  const existingHistory = await getMedicalHistoryByPatient(patient_id);

  if (existingHistory) {
    // Actualizar historia existente
    const updateQuery = `
      UPDATE medical_histories SET
        has_allergies = COALESCE($1, has_allergies),
        allergies_description = $2,
        has_chronic_diseases = COALESCE($3, has_chronic_diseases),
        chronic_diseases_description = $4,
        has_medications = COALESCE($5, has_medications),
        current_medications = $6,
        has_surgeries = COALESCE($7, has_surgeries),
        surgeries_description = $8,
        has_bleeding_disorders = COALESCE($9, has_bleeding_disorders),
        bleeding_disorders_description = $10,
        has_diabetes = COALESCE($11, has_diabetes),
        has_hypertension = COALESCE($12, has_hypertension),
        has_heart_disease = COALESCE($13, has_heart_disease),
        heart_disease_description = $14,
        is_pregnant = $15,
        pregnancy_months = $16,
        is_breastfeeding = $17,
        smokes = COALESCE($18, smokes),
        smoking_frequency = $19,
        drinks_alcohol = COALESCE($20, drinks_alcohol),
        alcohol_frequency = $21,
        last_dental_visit = $22,
        dental_visit_reason = $23,
        additional_notes = $24,
        user_id_modification = $25,
        date_time_modification = CURRENT_TIMESTAMP,
        pathological_background = COALESCE($27, pathological_background)
      WHERE medical_history_id = $26 AND status = 'active'
      RETURNING *
    `;

    // Procesar pathological_background para JSONB
    const pathologicalBackground = historyData.pathological_background !== undefined
      ? (Array.isArray(historyData.pathological_background)
        ? JSON.stringify(historyData.pathological_background)
        : historyData.pathological_background)
      : (existingHistory.pathological_background
        ? JSON.stringify(existingHistory.pathological_background)
        : '[]');

    const updateValues = [
      historyData.has_allergies ?? existingHistory.has_allergies,
      historyData.allergies_description ?? existingHistory.allergies_description,
      historyData.has_chronic_diseases ?? existingHistory.has_chronic_diseases,
      historyData.chronic_diseases_description ?? existingHistory.chronic_diseases_description,
      historyData.has_medications ?? existingHistory.has_medications,
      historyData.current_medications ?? existingHistory.current_medications,
      historyData.has_surgeries ?? existingHistory.has_surgeries,
      historyData.surgeries_description ?? existingHistory.surgeries_description,
      historyData.has_bleeding_disorders ?? existingHistory.has_bleeding_disorders,
      historyData.bleeding_disorders_description ?? existingHistory.bleeding_disorders_description,
      historyData.has_diabetes ?? existingHistory.has_diabetes,
      historyData.has_hypertension ?? existingHistory.has_hypertension,
      historyData.has_heart_disease ?? existingHistory.has_heart_disease,
      historyData.heart_disease_description ?? existingHistory.heart_disease_description,
      historyData.is_pregnant ?? existingHistory.is_pregnant,
      historyData.pregnancy_months ?? existingHistory.pregnancy_months,
      historyData.is_breastfeeding ?? existingHistory.is_breastfeeding,
      historyData.smokes ?? existingHistory.smokes,
      historyData.smoking_frequency ?? existingHistory.smoking_frequency,
      historyData.drinks_alcohol ?? existingHistory.drinks_alcohol,
      historyData.alcohol_frequency ?? existingHistory.alcohol_frequency,
      historyData.last_dental_visit ?? existingHistory.last_dental_visit,
      historyData.dental_visit_reason ?? existingHistory.dental_visit_reason,
      historyData.additional_notes ?? existingHistory.additional_notes,
      user_id_registration,
      existingHistory.medical_history_id,
      pathologicalBackground
    ];

    const result = await pool.query(updateQuery, updateValues);
    return { ...result.rows[0], wasUpdated: true };
  }

  // Crear nueva historia médica
  const newHistory = await createMedicalHistory(historyData);
  return { ...newHistory, wasUpdated: false };
};

module.exports = {
  getAllMedicalHistories,
  getMedicalHistoryById,
  getMedicalHistoryByPatient,
  createMedicalHistory,
  updateMedicalHistory,
  deleteMedicalHistory,
  countMedicalHistories,
  upsertMedicalHistory
};
