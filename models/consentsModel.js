const pool = require('../config/db');

// Consent Templates
const getAllConsentTemplates = async (filters = {}) => {
  let query = `SELECT * FROM consent_templates WHERE status = 'active'`;
  const params = [];
  let paramIndex = 1;

  if (filters.template_category) {
    query += ` AND template_category = $${paramIndex}`;
    params.push(filters.template_category);
    paramIndex++;
  }

  if (filters.search) {
    query += ` AND template_name ILIKE $${paramIndex}`;
    params.push(`%${filters.search}%`);
    paramIndex++;
  }

  query += ` ORDER BY template_name ASC`;

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

const getConsentTemplateById = async (templateId) => {
  const result = await pool.query(
    'SELECT * FROM consent_templates WHERE consent_template_id = $1 AND status = $2',
    [templateId, 'active']
  );
  return result.rows.length > 0 ? result.rows[0] : null;
};

const createConsentTemplate = async (templateData, userId) => {
  const query = `
    INSERT INTO consent_templates (
      template_name, template_code, template_category, template_content, version, user_id_registration
    ) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *
  `;
  const values = [
    templateData.template_name,
    templateData.template_code || null,
    templateData.template_category || 'general',
    templateData.template_content,
    templateData.version || 1,
    userId
  ];
  const result = await pool.query(query, values);
  return result.rows[0];
};

const updateConsentTemplate = async (templateId, templateData, userId) => {
  const query = `
    UPDATE consent_templates SET
      template_name = COALESCE($1, template_name),
      template_code = COALESCE($2, template_code),
      template_category = COALESCE($3, template_category),
      template_content = COALESCE($4, template_content),
      version = COALESCE($5, version),
      user_id_modification = $6,
      date_time_modification = CURRENT_TIMESTAMP
    WHERE consent_template_id = $7 AND status = 'active'
    RETURNING *
  `;
  const result = await pool.query(query, [
    templateData.template_name,
    templateData.template_code,
    templateData.template_category,
    templateData.template_content,
    templateData.version,
    userId,
    templateId
  ]);
  return result.rows.length > 0 ? result.rows[0] : null;
};

const deleteConsentTemplate = async (templateId, userId) => {
  const result = await pool.query(
    `UPDATE consent_templates SET status = 'inactive', user_id_modification = $1,
     date_time_modification = CURRENT_TIMESTAMP
     WHERE consent_template_id = $2 AND status = 'active' RETURNING consent_template_id`,
    [userId, templateId]
  );
  return result.rowCount > 0;
};

// Signed Consents
// Columnas de la tabla signed_consents:
// signed_consent_id, patient_id, consent_template_id, consultation_id, appointment_id,
// consent_date, consent_content, signature_data, signed_by, witness_name, witness_signature_data,
// notes, status, user_id_registration, date_time_registration, user_id_modification, date_time_modification

const getAllSignedConsents = async (filters = {}) => {
  let query = `
    SELECT
      sc.signed_consent_id,
      sc.patient_id,
      sc.consent_template_id,
      sc.consultation_id,
      sc.appointment_id,
      TO_CHAR(sc.consent_date, 'YYYY-MM-DD') as consent_date,
      sc.consent_content,
      sc.signature_data,
      sc.signed_by,
      sc.witness_name,
      sc.witness_signature_data,
      sc.notes,
      sc.status,
      sc.date_time_registration,
      p.first_name || ' ' || p.last_name as patient_name,
      p.identification_number,
      ct.template_name,
      ct.template_category
    FROM signed_consents sc
    INNER JOIN patients p ON sc.patient_id = p.patient_id
    LEFT JOIN consent_templates ct ON sc.consent_template_id = ct.consent_template_id
    WHERE sc.status = 'active'
  `;
  const params = [];
  let paramIndex = 1;

  if (filters.patient_id) {
    query += ` AND sc.patient_id = $${paramIndex}`;
    params.push(filters.patient_id);
    paramIndex++;
  }

  if (filters.consent_template_id) {
    query += ` AND sc.consent_template_id = $${paramIndex}`;
    params.push(filters.consent_template_id);
    paramIndex++;
  }

  query += ` ORDER BY sc.consent_date DESC`;

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

  // ====== LOG DE DIAGNÓSTICO DE FECHA ======
  if (result.rows.length > 0) {
    console.log('📅 [consentsModel] GET ALL - FECHAS DESDE BD:', {
      total_filas: result.rows.length,
      primer_consent_date: result.rows[0].consent_date,
      tipo_primer_consent_date: typeof result.rows[0].consent_date,
      esDate: result.rows[0].consent_date instanceof Date,
      toISOString: result.rows[0].consent_date instanceof Date ? result.rows[0].consent_date.toISOString() : 'N/A'
    });
  }

  return result.rows;
};

const getSignedConsentById = async (consentId) => {
  const query = `
    SELECT
      sc.signed_consent_id,
      sc.patient_id,
      sc.consent_template_id,
      sc.consultation_id,
      sc.appointment_id,
      TO_CHAR(sc.consent_date, 'YYYY-MM-DD') as consent_date,
      sc.consent_content,
      sc.signature_data,
      sc.signed_by,
      sc.witness_name,
      sc.witness_signature_data,
      sc.notes,
      sc.status,
      sc.date_time_registration,
      p.first_name || ' ' || p.last_name as patient_name,
      p.identification_number,
      ct.template_name,
      ct.template_category,
      ct.template_content as template_original_content
    FROM signed_consents sc
    INNER JOIN patients p ON sc.patient_id = p.patient_id
    LEFT JOIN consent_templates ct ON sc.consent_template_id = ct.consent_template_id
    WHERE sc.signed_consent_id = $1 AND sc.status = 'active'
  `;
  const result = await pool.query(query, [consentId]);

  // ====== LOG DE DIAGNÓSTICO DE FECHA ======
  if (result.rows.length > 0) {
    console.log('📅 [consentsModel] GET BY ID - FECHA DESDE BD:', {
      signed_consent_id: result.rows[0].signed_consent_id,
      consent_date: result.rows[0].consent_date,
      tipo_consent_date: typeof result.rows[0].consent_date,
      esDate: result.rows[0].consent_date instanceof Date,
      toISOString: result.rows[0].consent_date instanceof Date ? result.rows[0].consent_date.toISOString() : 'N/A'
    });
  }

  return result.rows.length > 0 ? result.rows[0] : null;
};

const createSignedConsent = async (consentData, userId) => {
  // ====== LOGS DE DIAGNÓSTICO DE FECHA ======
  console.log('📅 [consentsModel] CREATE - ENTRADA:', {
    consent_date_recibido: consentData.consent_date,
    tipo_consent_date: typeof consentData.consent_date,
    usará_fallback_new_Date: !consentData.consent_date
  });

  const query = `
    INSERT INTO signed_consents (
      patient_id, consent_template_id, consultation_id, appointment_id,
      consent_date, consent_content, signature_data, signed_by,
      witness_name, witness_signature_data, notes, user_id_registration
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
    RETURNING
      signed_consent_id,
      patient_id,
      consent_template_id,
      consultation_id,
      appointment_id,
      TO_CHAR(consent_date, 'YYYY-MM-DD') as consent_date,
      consent_content,
      signature_data,
      signed_by,
      witness_name,
      witness_signature_data,
      notes,
      status,
      date_time_registration
  `;

  // Determinar la fecha a usar
  const fechaAGuardar = consentData.consent_date || new Date();
  console.log('📅 [consentsModel] CREATE - FECHA A GUARDAR EN BD:', {
    fechaAGuardar,
    tipo_fechaAGuardar: typeof fechaAGuardar,
    esDate: fechaAGuardar instanceof Date
  });

  const values = [
    consentData.patient_id,
    consentData.consent_template_id || null,
    consentData.consultation_id || null,
    consentData.appointment_id || null,
    fechaAGuardar,
    consentData.consent_content,
    consentData.signature_data || null,
    consentData.signed_by || null,
    consentData.witness_name || null,
    consentData.witness_signature_data || null,
    consentData.notes || null,
    userId
  ];
  const result = await pool.query(query, values);

  // ====== LOG DEL RESULTADO ======
  console.log('📅 [consentsModel] CREATE - RESULTADO DE BD:', {
    consent_date_devuelto: result.rows[0].consent_date,
    tipo_consent_date_devuelto: typeof result.rows[0].consent_date
  });

  return result.rows[0];
};

const deleteSignedConsent = async (consentId, userId) => {
  const result = await pool.query(
    `UPDATE signed_consents SET status = 'inactive', user_id_modification = $1,
     date_time_modification = CURRENT_TIMESTAMP
     WHERE signed_consent_id = $2 AND status = 'active' RETURNING signed_consent_id`,
    [userId, consentId]
  );
  return result.rowCount > 0;
};

const countConsentTemplates = async (filters = {}) => {
  let query = `SELECT COUNT(*) as total FROM consent_templates WHERE status = 'active'`;
  const params = [];
  let paramIndex = 1;

  if (filters.template_category) {
    query += ` AND template_category = $${paramIndex}`;
    params.push(filters.template_category);
    paramIndex++;
  }

  if (filters.search) {
    query += ` AND template_name ILIKE $${paramIndex}`;
    params.push(`%${filters.search}%`);
  }

  const result = await pool.query(query, params);
  return parseInt(result.rows[0].total);
};

const countSignedConsents = async (filters = {}) => {
  let query = `SELECT COUNT(*) as total FROM signed_consents WHERE status = 'active'`;
  const params = [];
  let paramIndex = 1;

  if (filters.patient_id) {
    query += ` AND patient_id = $${paramIndex}`;
    params.push(filters.patient_id);
    paramIndex++;
  }

  if (filters.consent_template_id) {
    query += ` AND consent_template_id = $${paramIndex}`;
    params.push(filters.consent_template_id);
  }

  const result = await pool.query(query, params);
  return parseInt(result.rows[0].total);
};

module.exports = {
  getAllConsentTemplates,
  getConsentTemplateById,
  createConsentTemplate,
  updateConsentTemplate,
  deleteConsentTemplate,
  getAllSignedConsents,
  getSignedConsentById,
  createSignedConsent,
  deleteSignedConsent,
  countConsentTemplates,
  countSignedConsents
};
