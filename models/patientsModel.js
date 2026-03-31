const pool = require('../config/db');

/**
 * Obtener todos los pacientes con paginación y filtros
 * @param {Object} filters - Filtros de búsqueda
 * @returns {Promise<Array>} Lista de pacientes
 */
const getAllPatients = async (filters = {}) => {
  let query = `
    SELECT
      p.*,
      p.is_new_client,
      it.type_name as identification_type_name,
      g.gender_name,
      bt.blood_type_name,
      ms.status_name as marital_status_name,
      c.company_name,
      b.branch_name,
      hp.health_plan_id as active_health_plan_id,
      hp.plan_name as health_plan_name,
      hp.plan_code as health_plan_code,
      hp.plan_type as health_plan_type
    FROM patients p
    LEFT JOIN identification_types it ON p.identification_type_id = it.identification_type_id
    LEFT JOIN genders g ON p.gender_id = g.gender_id
    LEFT JOIN blood_types bt ON p.blood_type_id = bt.blood_type_id
    LEFT JOIN marital_statuses ms ON p.marital_status_id = ms.marital_status_id
    LEFT JOIN companies c ON p.company_id = c.company_id
    LEFT JOIN branches b ON p.branch_id = b.branch_id
    LEFT JOIN health_plan_subscriptions hps ON p.patient_id = hps.patient_id
      AND hps.status = 'active'
      AND hps.approval_status = 'approved'
      AND hps.subscription_status = 'active'
    LEFT JOIN health_plans hp ON hps.health_plan_id = hp.health_plan_id AND hp.is_active = true
    WHERE p.status = 'active'
  `;

  const params = [];
  let paramIndex = 1;

  // Filtros
  if (filters.branch_id) {
    // Incluir pacientes que pertenecen a la sede O que tienen tratamientos/deudas en esa sede
    query += ` AND (
      p.branch_id = $${paramIndex}
      OR p.patient_id IN (
        SELECT DISTINCT patient_id FROM procedure_income
        WHERE branch_id = $${paramIndex} AND status = 'active'
      )
      OR p.patient_id IN (
        SELECT DISTINCT patient_id FROM appointments
        WHERE branch_id = $${paramIndex} AND status = 'active'
      )
    )`;
    params.push(filters.branch_id);
    paramIndex++;
  }

  if (filters.search) {
    query += ` AND (
      p.first_name ILIKE $${paramIndex} OR
      p.last_name ILIKE $${paramIndex} OR
      p.identification_number ILIKE $${paramIndex} OR
      p.email ILIKE $${paramIndex} OR
      p.medical_record_number ILIKE $${paramIndex}
    )`;
    params.push(`%${filters.search}%`);
    paramIndex++;
  }

  if (filters.company_id) {
    query += ` AND p.company_id = $${paramIndex}`;
    params.push(filters.company_id);
    paramIndex++;
  }

  query += ` ORDER BY p.date_time_registration DESC`;

  // Paginación
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
 * Obtener un paciente por ID
 * @param {number} patientId - ID del paciente
 * @returns {Promise<Object|null>} Paciente encontrado
 */
const getPatientById = async (patientId) => {
  const query = `
    SELECT
      p.*,
      p.is_new_client,
      it.type_name as identification_type_name,
      g.gender_name,
      bt.blood_type_name,
      ms.status_name as marital_status_name,
      c.company_name,
      b.branch_name,
      hp.health_plan_id as active_health_plan_id,
      hp.plan_name as health_plan_name,
      hp.plan_code as health_plan_code,
      hp.plan_type as health_plan_type
    FROM patients p
    LEFT JOIN identification_types it ON p.identification_type_id = it.identification_type_id
    LEFT JOIN genders g ON p.gender_id = g.gender_id
    LEFT JOIN blood_types bt ON p.blood_type_id = bt.blood_type_id
    LEFT JOIN marital_statuses ms ON p.marital_status_id = ms.marital_status_id
    LEFT JOIN companies c ON p.company_id = c.company_id
    LEFT JOIN branches b ON p.branch_id = b.branch_id
    LEFT JOIN health_plan_subscriptions hps ON p.patient_id = hps.patient_id
      AND hps.status = 'active'
      AND hps.approval_status = 'approved'
      AND hps.subscription_status = 'active'
    LEFT JOIN health_plans hp ON hps.health_plan_id = hp.health_plan_id AND hp.is_active = true
    WHERE p.patient_id = $1 AND p.status = 'active'
  `;

  const result = await pool.query(query, [patientId]);
  return result.rows.length > 0 ? result.rows[0] : null;
};

/**
 * Crear un nuevo paciente
 * @param {Object} patientData - Datos del paciente
 * @returns {Promise<Object>} Paciente creado
 */
const createPatient = async (patientData) => {
  const {
    branch_id,
    company_id,
    identification_type_id,
    identification_number,
    first_name,
    last_name,
    birth_date,
    gender_id,
    blood_type_id,
    marital_status_id,
    email,
    phone,
    mobile,
    address,
    city,
    state,
    country,
    postal_code,
    emergency_contact_name,
    emergency_contact_phone,
    emergency_contact_relationship,
    photo_url,
    occupation,
    notes,
    is_basic_registration,
    medical_record_number,
    user_id_registration,
    is_new_client
  } = patientData;

  const query = `
    INSERT INTO patients (
      branch_id, company_id, identification_type_id, identification_number,
      first_name, last_name, birth_date, gender_id, blood_type_id,
      marital_status_id, email, phone, mobile, address, city, state,
      country, postal_code, emergency_contact_name, emergency_contact_phone,
      emergency_contact_relationship, photo_url, occupation, notes,
      is_basic_registration, medical_record_number, user_id_registration,
      is_new_client
    ) VALUES (
      $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15,
      $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28
    ) RETURNING *
  `;

  const values = [
    branch_id,
    company_id || null,
    identification_type_id || null,
    identification_number,
    first_name,
    last_name,
    birth_date,
    gender_id || null,
    blood_type_id || null,
    marital_status_id || null,
    email || null,
    phone || null,
    mobile,
    address || null,
    city || null,
    state || null,
    country || 'Perú',
    postal_code || null,
    emergency_contact_name || null,
    emergency_contact_phone || null,
    emergency_contact_relationship || null,
    photo_url || null,
    occupation || null,
    notes || null,
    is_basic_registration !== undefined ? is_basic_registration : true,
    medical_record_number || null,
    user_id_registration,
    is_new_client !== undefined ? is_new_client : true
  ];

  const result = await pool.query(query, values);
  return result.rows[0];
};

/**
 * Actualizar un paciente
 * @param {number} patientId - ID del paciente
 * @param {Object} patientData - Datos a actualizar
 * @returns {Promise<Object>} Paciente actualizado
 */
const updatePatient = async (patientId, patientData) => {
  const allowedFields = {
    branch_id: 'branch_id',
    company_id: 'company_id',
    identification_type_id: 'identification_type_id',
    identification_number: 'identification_number',
    first_name: 'first_name',
    last_name: 'last_name',
    birth_date: 'birth_date',
    gender_id: 'gender_id',
    blood_type_id: 'blood_type_id',
    marital_status_id: 'marital_status_id',
    email: 'email',
    phone: 'phone',
    mobile: 'mobile',
    address: 'address',
    city: 'city',
    state: 'state',
    country: 'country',
    postal_code: 'postal_code',
    emergency_contact_name: 'emergency_contact_name',
    emergency_contact_phone: 'emergency_contact_phone',
    emergency_contact_relationship: 'emergency_contact_relationship',
    photo_url: 'photo_url',
    occupation: 'occupation',
    notes: 'notes',
    is_basic_registration: 'is_basic_registration',
    completed_at: 'completed_at',
    medical_record_number: 'medical_record_number',
    is_new_client: 'is_new_client'
  };

  const setClauses = [];
  const values = [];
  let paramIndex = 1;

  for (const [jsKey, dbColumn] of Object.entries(allowedFields)) {
    if (patientData[jsKey] !== undefined) {
      setClauses.push(`${dbColumn} = $${paramIndex}`);
      values.push(patientData[jsKey]);
      paramIndex++;
    }
  }

  // Always update audit fields
  setClauses.push(`user_id_modification = $${paramIndex}`);
  values.push(patientData.user_id_modification);
  paramIndex++;

  setClauses.push(`date_time_modification = CURRENT_TIMESTAMP`);

  if (setClauses.length === 2) {
    // Only audit fields, nothing to update
    return await getPatientById(patientId);
  }

  values.push(patientId);

  const query = `
    UPDATE patients SET
      ${setClauses.join(',\n      ')}
    WHERE patient_id = $${paramIndex} AND status = 'active'
    RETURNING *
  `;

  const result = await pool.query(query, values);
  return result.rows.length > 0 ? result.rows[0] : null;
};

/**
 * Eliminar un paciente (soft delete)
 * @param {number} patientId - ID del paciente
 * @param {number} userId - ID del usuario que elimina
 * @returns {Promise<boolean>} true si se eliminó correctamente
 */
const deletePatient = async (patientId, userId) => {
  const query = `
    UPDATE patients SET
      status = 'inactive',
      user_id_modification = $1,
      date_time_modification = CURRENT_TIMESTAMP
    WHERE patient_id = $2 AND status = 'active'
    RETURNING patient_id
  `;

  const result = await pool.query(query, [userId, patientId]);
  return result.rowCount > 0;
};

/**
 * Contar total de pacientes (para paginación)
 * @param {Object} filters - Filtros de búsqueda
 * @returns {Promise<number>} Total de pacientes
 */
const countPatients = async (filters = {}) => {
  let query = `SELECT COUNT(*) as total FROM patients p WHERE p.status = 'active'`;
  const params = [];
  let paramIndex = 1;

  if (filters.branch_id) {
    // Incluir pacientes que pertenecen a la sede O que tienen tratamientos/deudas en esa sede
    query += ` AND (
      p.branch_id = $${paramIndex}
      OR p.patient_id IN (
        SELECT DISTINCT patient_id FROM procedure_income
        WHERE branch_id = $${paramIndex} AND status = 'active'
      )
      OR p.patient_id IN (
        SELECT DISTINCT patient_id FROM appointments
        WHERE branch_id = $${paramIndex} AND status = 'active'
      )
    )`;
    params.push(filters.branch_id);
    paramIndex++;
  }

  if (filters.search) {
    query += ` AND (
      p.first_name ILIKE $${paramIndex} OR
      p.last_name ILIKE $${paramIndex} OR
      p.identification_number ILIKE $${paramIndex} OR
      p.email ILIKE $${paramIndex} OR
      p.medical_record_number ILIKE $${paramIndex}
    )`;
    params.push(`%${filters.search}%`);
    paramIndex++;
  }

  if (filters.company_id) {
    query += ` AND p.company_id = $${paramIndex}`;
    params.push(filters.company_id);
  }

  const result = await pool.query(query, params);
  return parseInt(result.rows[0].total);
};

/**
 * Sincronizar branch_id entre patients y users
 * Esta función asegura que users.branch_id y patients.branch_id estén sincronizados
 * @param {number} patientId - ID del paciente
 * @param {number} branchId - ID de la sede (puede ser null)
 * @param {number} userId - ID del usuario que realiza el cambio
 * @returns {Promise<Object>} Resultado de la sincronización
 */
const syncPatientBranch = async (patientId, branchId, userId) => {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // 1. Obtener user_id del paciente
    const patientResult = await client.query(
      'SELECT user_id FROM patients WHERE patient_id = $1 AND status = $2',
      [patientId, 'active']
    );

    if (patientResult.rows.length === 0) {
      throw new Error('Paciente no encontrado');
    }

    const userIdPatient = patientResult.rows[0].user_id;

    // 2. Actualizar branch_id en patients
    await client.query(
      `UPDATE patients
       SET branch_id = $1,
           user_id_modification = $2,
           date_time_modification = CURRENT_TIMESTAMP
       WHERE patient_id = $3`,
      [branchId, userId, patientId]
    );

    // 3. Si el paciente tiene usuario vinculado, sincronizar users.branch_id
    if (userIdPatient) {
      await client.query(
        `UPDATE users
         SET branch_id = $1,
             user_id_modification = $2,
             date_time_modification = CURRENT_TIMESTAMP
         WHERE user_id = $3`,
        [branchId, userId, userIdPatient]
      );
    }

    await client.query('COMMIT');

    return {
      success: true,
      message: 'Sincronización exitosa',
      patient_id: patientId,
      user_id: userIdPatient,
      branch_id: branchId
    };

  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

/**
 * Buscar paciente por DNI (identification_number)
 * @param {string} dni - Número de documento del paciente
 * @returns {Promise<Object|null>} Paciente encontrado o null
 */
const getPatientByDni = async (dni) => {
  const query = `
    SELECT
      p.patient_id,
      p.identification_number as dni,
      p.first_name,
      p.last_name,
      p.email,
      p.phone,
      p.mobile,
      p.birth_date,
      p.address,
      p.branch_id,
      b.branch_name
    FROM patients p
    LEFT JOIN branches b ON p.branch_id = b.branch_id
    WHERE p.identification_number = $1
      AND p.status = 'active'
    LIMIT 1
  `;

  const result = await pool.query(query, [dni]);
  return result.rows.length > 0 ? result.rows[0] : null;
};

module.exports = {
  getAllPatients,
  getPatientById,
  getPatientByDni,
  createPatient,
  updatePatient,
  deletePatient,
  countPatients,
  syncPatientBranch
};
