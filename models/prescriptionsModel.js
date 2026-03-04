const pool = require('../config/db');

// ==================== PRESCRIPTION ITEMS ====================

/**
 * Crea items de prescripcion en una transaccion
 * @param {Object} client - Cliente de pool para transaccion
 * @param {number} prescriptionId - ID de la prescripcion cabecera
 * @param {Array} items - Array de items a crear
 * @param {number} userId - ID del usuario que registra
 */
const createPrescriptionItems = async (client, prescriptionId, items, userId) => {
  const createdItems = [];

  for (const item of items) {
    const query = `
      INSERT INTO prescription_items (
        prescription_id, medication_id, medication_name, concentration,
        quantity, instructions, user_id_registration
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `;

    const values = [
      prescriptionId,
      item.medication_id || null,
      item.medication_name,
      item.concentration || null,
      item.quantity,
      item.instructions,
      userId
    ];

    const result = await client.query(query, values);
    createdItems.push(result.rows[0]);
  }

  return createdItems;
};

/**
 * Obtiene items de una prescripcion
 */
const getPrescriptionItems = async (prescriptionId) => {
  const query = `
    SELECT
      pi.*,
      m.medication_name as catalog_medication_name,
      m.generic_name,
      m.medication_type
    FROM prescription_items pi
    LEFT JOIN medications m ON pi.medication_id = m.medication_id
    WHERE pi.prescription_id = $1 AND pi.status = 'active'
    ORDER BY pi.prescription_item_id ASC
  `;

  const result = await pool.query(query, [prescriptionId]);
  return result.rows;
};

/**
 * Elimina items de una prescripcion (soft delete)
 */
const deletePrescriptionItems = async (client, prescriptionId) => {
  const query = `
    UPDATE prescription_items
    SET status = 'inactive'
    WHERE prescription_id = $1
    RETURNING prescription_item_id
  `;

  const result = await client.query(query, [prescriptionId]);
  return result.rowCount;
};

// ==================== PRESCRIPTIONS ====================

const getAllPrescriptions = async (filters = {}) => {
  let query = `
    SELECT
      pr.*,
      p.first_name || ' ' || p.last_name as patient_name,
      p.identification_number,
      u.first_name || ' ' || u.last_name as dentist_name,
      b.branch_name
    FROM prescriptions pr
    INNER JOIN patients p ON pr.patient_id = p.patient_id
    INNER JOIN dentists d ON pr.dentist_id = d.dentist_id
    INNER JOIN users u ON d.user_id = u.user_id
    INNER JOIN branches b ON pr.branch_id = b.branch_id
    WHERE pr.status = 'active'
  `;

  const params = [];
  let paramIndex = 1;

  if (filters.patient_id) {
    query += ` AND pr.patient_id = $${paramIndex}`;
    params.push(filters.patient_id);
    paramIndex++;
  }

  if (filters.dentist_id) {
    query += ` AND pr.dentist_id = $${paramIndex}`;
    params.push(filters.dentist_id);
    paramIndex++;
  }

  if (filters.branch_id) {
    query += ` AND pr.branch_id = $${paramIndex}`;
    params.push(filters.branch_id);
    paramIndex++;
  }

  if (filters.appointment_id) {
    query += ` AND pr.appointment_id = $${paramIndex}`;
    params.push(filters.appointment_id);
    paramIndex++;
  }

  if (filters.date_from) {
    query += ` AND pr.prescription_date >= $${paramIndex}`;
    params.push(filters.date_from);
    paramIndex++;
  }

  if (filters.date_to) {
    query += ` AND pr.prescription_date <= $${paramIndex}`;
    params.push(filters.date_to);
    paramIndex++;
  }

  query += ` ORDER BY pr.prescription_date DESC, pr.prescription_id DESC`;

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

const getPrescriptionById = async (prescriptionId) => {
  const query = `
    SELECT
      pr.*,
      p.first_name || ' ' || p.last_name as patient_name,
      p.identification_number,
      p.email as patient_email,
      p.phone as patient_phone,
      p.birth_date,
      u.first_name || ' ' || u.last_name as dentist_name,
      u.phone as dentist_phone,
      b.branch_name,
      b.address as branch_address,
      b.phone as branch_phone
    FROM prescriptions pr
    INNER JOIN patients p ON pr.patient_id = p.patient_id
    INNER JOIN dentists d ON pr.dentist_id = d.dentist_id
    INNER JOIN users u ON d.user_id = u.user_id
    INNER JOIN branches b ON pr.branch_id = b.branch_id
    WHERE pr.prescription_id = $1 AND pr.status = 'active'
  `;

  const result = await pool.query(query, [prescriptionId]);
  return result.rows.length > 0 ? result.rows[0] : null;
};

/**
 * Crea una prescripcion simple (sin items)
 * @deprecated Usar createPrescriptionWithItems para nuevas implementaciones
 */
const createPrescription = async (prescriptionData) => {
  const query = `
    INSERT INTO prescriptions (
      patient_id, dentist_id, branch_id, appointment_id, consultation_id,
      prescription_date, signature, notes, user_id_registration
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    RETURNING *
  `;

  const values = [
    prescriptionData.patient_id,
    prescriptionData.dentist_id,
    prescriptionData.branch_id,
    prescriptionData.appointment_id || null,
    prescriptionData.consultation_id || null,
    prescriptionData.prescription_date,
    prescriptionData.signature || null,
    prescriptionData.notes || null,
    prescriptionData.user_id_registration
  ];

  const result = await pool.query(query, values);
  return result.rows[0];
};

/**
 * Crea una prescripcion completa con items usando transaccion
 * @param {Object} prescriptionData - Datos de la cabecera
 * @param {Array} items - Items de la receta (medicamentos)
 */
const createPrescriptionWithItems = async (prescriptionData, items = []) => {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // 1. Crear cabecera de prescripcion
    const headerQuery = `
      INSERT INTO prescriptions (
        patient_id, dentist_id, branch_id, appointment_id, consultation_id,
        prescription_date, signature, notes, user_id_registration
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *
    `;

    const headerValues = [
      prescriptionData.patient_id,
      prescriptionData.dentist_id,
      prescriptionData.branch_id,
      prescriptionData.appointment_id || null,
      prescriptionData.consultation_id || null,
      prescriptionData.prescription_date,
      prescriptionData.signature || null,
      prescriptionData.notes || null,
      prescriptionData.user_id_registration
    ];

    const headerResult = await client.query(headerQuery, headerValues);
    const prescription = headerResult.rows[0];

    // 2. Crear items de prescripcion
    let prescriptionItems = [];
    if (items && items.length > 0) {
      prescriptionItems = await createPrescriptionItems(
        client,
        prescription.prescription_id,
        items,
        prescriptionData.user_id_registration
      );
    }

    await client.query('COMMIT');

    return {
      ...prescription,
      items: prescriptionItems
    };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

/**
 * Obtiene prescripcion por consultation_id
 */
const getPrescriptionByConsultationId = async (consultationId) => {
  const query = `
    SELECT
      pr.*,
      p.first_name || ' ' || p.last_name as patient_name,
      p.identification_number,
      u.first_name || ' ' || u.last_name as dentist_name,
      b.branch_name
    FROM prescriptions pr
    INNER JOIN patients p ON pr.patient_id = p.patient_id
    INNER JOIN dentists d ON pr.dentist_id = d.dentist_id
    INNER JOIN users u ON d.user_id = u.user_id
    INNER JOIN branches b ON pr.branch_id = b.branch_id
    WHERE pr.consultation_id = $1 AND pr.status = 'active'
    ORDER BY pr.prescription_id DESC
    LIMIT 1
  `;

  const result = await pool.query(query, [consultationId]);

  if (result.rows.length === 0) {
    return null;
  }

  const prescription = result.rows[0];

  // Obtener items
  const items = await getPrescriptionItems(prescription.prescription_id);

  return {
    ...prescription,
    items
  };
};

/**
 * Obtiene prescripcion completa con items por ID
 */
const getPrescriptionWithItems = async (prescriptionId) => {
  const query = `
    SELECT
      pr.*,
      p.first_name || ' ' || p.last_name as patient_name,
      p.identification_number,
      p.email as patient_email,
      p.phone as patient_phone,
      p.birth_date,
      u.first_name || ' ' || u.last_name as dentist_name,
      u.phone as dentist_phone,
      d.professional_license as dentist_license,
      b.branch_name,
      b.address as branch_address,
      b.phone as branch_phone
    FROM prescriptions pr
    INNER JOIN patients p ON pr.patient_id = p.patient_id
    INNER JOIN dentists d ON pr.dentist_id = d.dentist_id
    INNER JOIN users u ON d.user_id = u.user_id
    INNER JOIN branches b ON pr.branch_id = b.branch_id
    WHERE pr.prescription_id = $1 AND pr.status = 'active'
  `;

  const result = await pool.query(query, [prescriptionId]);

  if (result.rows.length === 0) {
    return null;
  }

  const prescription = result.rows[0];

  // Obtener items
  const items = await getPrescriptionItems(prescriptionId);

  return {
    ...prescription,
    items
  };
};

const updatePrescription = async (prescriptionId, prescriptionData) => {
  const fields = [];
  const values = [];
  let paramIndex = 1;

  const allowedFields = [
    'appointment_id', 'consultation_id', 'prescription_date', 'signature', 'notes'
  ];

  allowedFields.forEach((field) => {
    if (prescriptionData[field] !== undefined) {
      fields.push(`${field} = $${paramIndex}`);
      values.push(prescriptionData[field]);
      paramIndex++;
    }
  });

  if (fields.length === 0) {
    throw new Error('No hay campos para actualizar');
  }

  fields.push(`user_id_modification = $${paramIndex}`);
  values.push(prescriptionData.user_id_modification);
  paramIndex++;

  fields.push(`date_time_modification = CURRENT_TIMESTAMP`);

  values.push(prescriptionId);

  const query = `
    UPDATE prescriptions SET ${fields.join(', ')}
    WHERE prescription_id = $${paramIndex} AND status = 'active'
    RETURNING *
  `;

  const result = await pool.query(query, values);
  return result.rows.length > 0 ? result.rows[0] : null;
};

const deletePrescription = async (prescriptionId, userId) => {
  const query = `
    UPDATE prescriptions SET
      status = 'inactive',
      user_id_modification = $1,
      date_time_modification = CURRENT_TIMESTAMP
    WHERE prescription_id = $2 AND status = 'active'
    RETURNING prescription_id
  `;

  const result = await pool.query(query, [userId, prescriptionId]);
  return result.rowCount > 0;
};

const countPrescriptions = async (filters = {}) => {
  let query = `SELECT COUNT(*) as total FROM prescriptions pr WHERE pr.status = 'active'`;
  const params = [];
  let paramIndex = 1;

  if (filters.patient_id) {
    query += ` AND pr.patient_id = $${paramIndex}`;
    params.push(filters.patient_id);
    paramIndex++;
  }

  if (filters.dentist_id) {
    query += ` AND pr.dentist_id = $${paramIndex}`;
    params.push(filters.dentist_id);
    paramIndex++;
  }

  if (filters.branch_id) {
    query += ` AND pr.branch_id = $${paramIndex}`;
    params.push(filters.branch_id);
    paramIndex++;
  }

  if (filters.appointment_id) {
    query += ` AND pr.appointment_id = $${paramIndex}`;
    params.push(filters.appointment_id);
    paramIndex++;
  }

  if (filters.date_from) {
    query += ` AND pr.prescription_date >= $${paramIndex}`;
    params.push(filters.date_from);
    paramIndex++;
  }

  if (filters.date_to) {
    query += ` AND pr.prescription_date <= $${paramIndex}`;
    params.push(filters.date_to);
  }

  const result = await pool.query(query, params);
  return parseInt(result.rows[0].total);
};

// Medications (catálogo)
const getAllMedications = async (filters = {}) => {
  let query = `
    SELECT *
    FROM medications
    WHERE status = 'active'
  `;

  const params = [];
  let paramIndex = 1;

  if (filters.medication_type) {
    query += ` AND medication_type = $${paramIndex}`;
    params.push(filters.medication_type);
    paramIndex++;
  }

  if (filters.search) {
    query += ` AND (medication_name ILIKE $${paramIndex} OR generic_name ILIKE $${paramIndex})`;
    params.push(`%${filters.search}%`);
    paramIndex++;
  }

  query += ` ORDER BY medication_name ASC`;

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

const getMedicationById = async (medicationId) => {
  const query = `SELECT * FROM medications WHERE medication_id = $1 AND status = 'active'`;
  const result = await pool.query(query, [medicationId]);
  return result.rows.length > 0 ? result.rows[0] : null;
};

const createMedication = async (medicationData, userId) => {
  const query = `
    INSERT INTO medications (
      medication_name, generic_name, medication_type, concentration, description, user_id_registration
    ) VALUES ($1, $2, $3, $4, $5, $6)
    RETURNING *
  `;

  const values = [
    medicationData.medication_name,
    medicationData.generic_name || null,
    medicationData.medication_type || null,
    medicationData.concentration || null,
    medicationData.description || null,
    userId
  ];

  const result = await pool.query(query, values);
  return result.rows[0];
};

const updateMedication = async (medicationId, medicationData, userId) => {
  const fields = [];
  const values = [];
  let paramIndex = 1;

  const allowedFields = ['medication_name', 'generic_name', 'medication_type', 'concentration', 'description'];

  allowedFields.forEach((field) => {
    if (medicationData[field] !== undefined) {
      fields.push(`${field} = $${paramIndex}`);
      values.push(medicationData[field]);
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

  values.push(medicationId);

  const query = `
    UPDATE medications SET ${fields.join(', ')}
    WHERE medication_id = $${paramIndex} AND status = 'active'
    RETURNING *
  `;

  const result = await pool.query(query, values);
  return result.rows.length > 0 ? result.rows[0] : null;
};

const deleteMedication = async (medicationId, userId) => {
  const query = `
    UPDATE medications SET
      status = 'inactive',
      user_id_modification = $1,
      date_time_modification = CURRENT_TIMESTAMP
    WHERE medication_id = $2 AND status = 'active'
    RETURNING medication_id
  `;

  const result = await pool.query(query, [userId, medicationId]);
  return result.rowCount > 0;
};

const countMedications = async (filters = {}) => {
  let query = `SELECT COUNT(*) as total FROM medications WHERE status = 'active'`;
  const params = [];
  let paramIndex = 1;

  if (filters.medication_type) {
    query += ` AND medication_type = $${paramIndex}`;
    params.push(filters.medication_type);
    paramIndex++;
  }

  if (filters.search) {
    query += ` AND (medication_name ILIKE $${paramIndex} OR generic_name ILIKE $${paramIndex})`;
    params.push(`%${filters.search}%`);
  }

  const result = await pool.query(query, params);
  return parseInt(result.rows[0].total);
};

module.exports = {
  // Prescriptions
  getAllPrescriptions,
  getPrescriptionById,
  getPrescriptionWithItems,
  getPrescriptionByConsultationId,
  createPrescription,
  createPrescriptionWithItems,
  updatePrescription,
  deletePrescription,
  countPrescriptions,
  // Prescription Items
  getPrescriptionItems,
  createPrescriptionItems,
  deletePrescriptionItems,
  // Medications (catalogo)
  getAllMedications,
  getMedicationById,
  createMedication,
  updateMedication,
  deleteMedication,
  countMedications
};
