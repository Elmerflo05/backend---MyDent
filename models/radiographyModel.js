const pool = require('../config/db');
const { formatDateYMD } = require('../utils/dateUtils');

const getAllRadiographyRequests = async (filters = {}) => {
  let query = `
    SELECT
      rr.*,
      CASE
        WHEN rr.patient_id IS NOT NULL THEN p.first_name || ' ' || p.last_name
        ELSE NULL
      END as patient_name,
      p.identification_number,
      CASE
        WHEN rr.dentist_id IS NOT NULL THEN u.first_name || ' ' || u.last_name
        ELSE NULL
      END as dentist_name,
      b.branch_name,
      CASE
        WHEN rr.performed_by IS NOT NULL
        THEN u_performed.first_name || ' ' || u_performed.last_name
        ELSE NULL
      END as performed_by_name,
      u_creator.role_id as creator_role_id
    FROM radiography_requests rr
    LEFT JOIN patients p ON rr.patient_id = p.patient_id
    LEFT JOIN dentists d ON rr.dentist_id = d.dentist_id
    LEFT JOIN users u ON d.user_id = u.user_id
    LEFT JOIN branches b ON rr.branch_id = b.branch_id
    LEFT JOIN users u_performed ON rr.performed_by = u_performed.user_id
    LEFT JOIN users u_creator ON rr.user_id_registration = u_creator.user_id
    WHERE rr.status = 'active'
  `;

  const params = [];
  let paramIndex = 1;

  if (filters.patient_id) {
    query += ` AND rr.patient_id = $${paramIndex}`;
    params.push(filters.patient_id);
    paramIndex++;
  }

  if (filters.dentist_id) {
    query += ` AND rr.dentist_id = $${paramIndex}`;
    params.push(filters.dentist_id);
    paramIndex++;
  }

  if (filters.branch_id) {
    query += ` AND rr.branch_id = $${paramIndex}`;
    params.push(filters.branch_id);
    paramIndex++;
  }

  if (filters.consultation_id) {
    query += ` AND rr.consultation_id = $${paramIndex}`;
    params.push(filters.consultation_id);
    paramIndex++;
  }

  if (filters.radiography_type) {
    query += ` AND rr.radiography_type = $${paramIndex}`;
    params.push(filters.radiography_type);
    paramIndex++;
  }

  if (filters.request_status) {
    query += ` AND rr.request_status = $${paramIndex}`;
    params.push(filters.request_status);
    paramIndex++;
  }

  if (filters.urgency) {
    query += ` AND rr.urgency = $${paramIndex}`;
    params.push(filters.urgency);
    paramIndex++;
  }

  if (filters.date_from) {
    query += ` AND rr.request_date >= $${paramIndex}`;
    params.push(filters.date_from);
    paramIndex++;
  }

  if (filters.date_to) {
    query += ` AND rr.request_date <= $${paramIndex}`;
    params.push(filters.date_to);
    paramIndex++;
  }

  // Filtro por origen de la solicitud (internal/external)
  // 'external' = creadas por usuarios con role_id = 7 (external_client)
  // 'internal' = creadas por usuarios con role_id != 7 (personal interno)
  if (filters.source === 'external') {
    query += ` AND u_creator.role_id = 7`;
  } else if (filters.source === 'internal') {
    query += ` AND (u_creator.role_id IS NULL OR u_creator.role_id != 7)`;
  }

  query += ` ORDER BY rr.request_date DESC, rr.radiography_request_id DESC`;

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

const getRadiographyRequestById = async (requestId) => {
  const query = `
    SELECT
      rr.*,
      CASE
        WHEN rr.patient_id IS NOT NULL THEN p.first_name || ' ' || p.last_name
        ELSE NULL
      END as patient_name,
      p.identification_number,
      p.email as patient_email,
      p.mobile as patient_phone,
      p.birth_date,
      CASE
        WHEN rr.dentist_id IS NOT NULL THEN u.first_name || ' ' || u.last_name
        ELSE NULL
      END as dentist_name,
      u.phone as dentist_phone,
      b.branch_name,
      b.address as branch_address,
      b.phone as branch_phone,
      CASE
        WHEN rr.performed_by IS NOT NULL
        THEN u_performed.first_name || ' ' || u_performed.last_name
        ELSE NULL
      END as performed_by_name
    FROM radiography_requests rr
    LEFT JOIN patients p ON rr.patient_id = p.patient_id
    LEFT JOIN dentists d ON rr.dentist_id = d.dentist_id
    LEFT JOIN users u ON d.user_id = u.user_id
    LEFT JOIN branches b ON rr.branch_id = b.branch_id
    LEFT JOIN users u_performed ON rr.performed_by = u_performed.user_id
    WHERE rr.radiography_request_id = $1 AND rr.status = 'active'
  `;

  const result = await pool.query(query, [requestId]);
  return result.rows.length > 0 ? result.rows[0] : null;
};

const createRadiographyRequest = async (requestData) => {
  const query = `
    INSERT INTO radiography_requests (
      patient_id, dentist_id, branch_id, consultation_id, request_date,
      radiography_type, area_of_interest, clinical_indication, urgency,
      request_status, performed_date, performed_by, image_url, findings,
      notes, request_data, pricing_data, user_id_registration
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)
    RETURNING *
  `;

  const values = [
    requestData.patient_id || null,    // Puede ser null para solicitudes PanoCef
    requestData.dentist_id || null,    // Puede ser null para solicitudes PanoCef
    requestData.branch_id || 1,        // Sede principal por defecto
    requestData.consultation_id || null,
    requestData.request_date,
    requestData.radiography_type,
    requestData.area_of_interest || null,
    requestData.clinical_indication || null,
    requestData.urgency || 'normal',
    requestData.request_status || 'pending',
    requestData.performed_date || null,
    requestData.performed_by || null,
    requestData.image_url || null,
    requestData.findings || null,
    requestData.notes || null,
    requestData.request_data ? JSON.stringify(requestData.request_data) : null,
    requestData.pricing_data ? JSON.stringify(requestData.pricing_data) : null,
    requestData.user_id_registration
  ];

  const result = await pool.query(query, values);
  return result.rows[0];
};

const updateRadiographyRequest = async (requestId, requestData) => {
  const fields = [];
  const values = [];
  let paramIndex = 1;

  const allowedFields = [
    'consultation_id', 'request_date', 'radiography_type', 'area_of_interest',
    'clinical_indication', 'urgency', 'request_status', 'performed_date',
    'performed_by', 'image_url', 'findings', 'notes'
  ];

  // Campos normales
  allowedFields.forEach((field) => {
    if (requestData[field] !== undefined) {
      fields.push(`${field} = $${paramIndex}`);
      values.push(requestData[field]);
      paramIndex++;
    }
  });

  // Campos JSON (necesitan stringify)
  if (requestData.request_data !== undefined) {
    fields.push(`request_data = $${paramIndex}`);
    values.push(requestData.request_data ? JSON.stringify(requestData.request_data) : null);
    paramIndex++;
  }

  if (requestData.pricing_data !== undefined) {
    fields.push(`pricing_data = $${paramIndex}`);
    values.push(requestData.pricing_data ? JSON.stringify(requestData.pricing_data) : null);
    paramIndex++;
  }

  if (fields.length === 0) {
    throw new Error('No hay campos para actualizar');
  }

  fields.push(`user_id_modification = $${paramIndex}`);
  values.push(requestData.user_id_modification);
  paramIndex++;

  fields.push(`date_time_modification = CURRENT_TIMESTAMP`);

  values.push(requestId);

  const query = `
    UPDATE radiography_requests SET ${fields.join(', ')}
    WHERE radiography_request_id = $${paramIndex} AND status = 'active'
    RETURNING *
  `;

  const result = await pool.query(query, values);
  return result.rows.length > 0 ? result.rows[0] : null;
};

/**
 * Busca la última solicitud de radiografía activa por consultation_id
 * Ordenada por date_time_registration DESC (timestamp preciso del servidor)
 * con fallback al id para casos con NULL.
 */
const findByConsultationId = async (consultationId) => {
  if (!consultationId) return null;

  const query = `
    SELECT * FROM radiography_requests
    WHERE consultation_id = $1 AND status = 'active'
    ORDER BY date_time_registration DESC NULLS LAST, radiography_request_id DESC
    LIMIT 1
  `;

  const result = await pool.query(query, [consultationId]);
  return result.rows.length > 0 ? result.rows[0] : null;
};

/**
 * Busca solicitud por appointment_id
 */
const findByAppointmentId = async (appointmentId) => {
  if (!appointmentId) return null;

  const query = `
    SELECT rr.* FROM radiography_requests rr
    INNER JOIN consultations c ON rr.consultation_id = c.consultation_id
    WHERE c.appointment_id = $1 AND rr.status = 'active'
    ORDER BY rr.radiography_request_id DESC
    LIMIT 1
  `;

  const result = await pool.query(query, [appointmentId]);
  return result.rows.length > 0 ? result.rows[0] : null;
};

/**
 * Estados considerados "editables" por el doctor:
 * Si la última solicitud activa está en uno de estos estados, el siguiente
 * Guardar ACTUALIZA. En cualquier otro estado, CREA una solicitud nueva.
 * Regla del negocio: mientras el técnico no haya tocado la solicitud (pending),
 * el doctor puede seguir refinando; una vez procesada, el siguiente save es otra intención.
 */
const EDITABLE_REQUEST_STATUSES = ['pending'];

/**
 * Hash determinista de cualquier string a un entero de 32 bits (para pg_advisory_xact_lock
 * cuando no tenemos un consultation_id numérico todavía — ej. primer save antes de que
 * la consulta exista en BD).
 */
const hashStringToInt = (str) => {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = ((h << 5) - h + str.charCodeAt(i)) | 0;
  }
  return h;
};

/**
 * Obtiene una solicitud activa por id (consulta simple, sin JOINs).
 */
const getActiveRequestById = async (client, requestId) => {
  const query = `
    SELECT * FROM radiography_requests
    WHERE radiography_request_id = $1 AND status = 'active'
    LIMIT 1
  `;
  const result = await client.query(query, [requestId]);
  return result.rows.length > 0 ? result.rows[0] : null;
};

/**
 * Versión transaccional del find-by-consultation que usa un client específico.
 */
const findByConsultationIdTx = async (client, consultationId) => {
  if (!consultationId) return null;
  const query = `
    SELECT * FROM radiography_requests
    WHERE consultation_id = $1 AND status = 'active'
    ORDER BY date_time_registration DESC NULLS LAST, radiography_request_id DESC
    LIMIT 1
  `;
  const result = await client.query(query, [consultationId]);
  return result.rows.length > 0 ? result.rows[0] : null;
};

/**
 * Versión transaccional del find-by-appointment.
 */
const findByAppointmentIdTx = async (client, appointmentId) => {
  if (!appointmentId) return null;
  const query = `
    SELECT rr.* FROM radiography_requests rr
    INNER JOIN consultations c ON rr.consultation_id = c.consultation_id
    WHERE c.appointment_id = $1 AND rr.status = 'active'
    ORDER BY rr.date_time_registration DESC NULLS LAST, rr.radiography_request_id DESC
    LIMIT 1
  `;
  const result = await client.query(query, [appointmentId]);
  return result.rows.length > 0 ? result.rows[0] : null;
};

/**
 * Upsert de solicitud de radiografía (lógica server-side) envuelto en una transacción
 * con pg_advisory_xact_lock para serializar concurrencia sobre la misma consulta.
 *
 * Reglas de búsqueda del registro existente (en orden):
 *   1. Si el FE envía `radiography_request_id` (hint tras un INSERT previo), se usa.
 *   2. Si se proveyó consultation_id, se busca la última activa de esa consulta.
 *   3. Si se proveyó appointment_id, se busca por esa cita.
 *
 * Si el candidato encontrado está en estado editable ('pending') → UPDATE;
 * en cualquier otro caso (no existe, o ya fue procesada) → INSERT nuevo registro.
 */
const upsertRadiographyRequest = async (requestData) => {
  const {
    radiography_request_id, // hint: id previo que el FE ya conoce (puede ser undefined)
    patient_id,
    dentist_id,
    branch_id,
    consultation_id,
    appointment_id,
    request_date,
    radiography_type,
    area_of_interest,
    clinical_indication,
    urgency,
    request_status,
    notes,
    request_data,
    pricing_data,
    user_id_registration
  } = requestData;

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Bloqueo de transacción para serializar upserts concurrentes de la misma consulta.
    // Si aún no hay consultation_id (primer save antes de que se cree la consulta),
    // caemos a una clave derivada de (dentist_id, patient_id) para que dos saves simultáneos
    // del mismo doctor sobre el mismo paciente también queden serializados.
    const lockKey = consultation_id
      ? Number(consultation_id)
      : hashStringToInt(`rr:d:${dentist_id || 0}:p:${patient_id || 0}:a:${appointment_id || 0}`);
    await client.query('SELECT pg_advisory_xact_lock($1)', [lockKey]);

    // Buscar el registro existente por la mejor pista disponible
    let existingRequest = null;

    if (radiography_request_id) {
      existingRequest = await getActiveRequestById(client, radiography_request_id);
    }

    if (!existingRequest && consultation_id) {
      existingRequest = await findByConsultationIdTx(client, consultation_id);
    }

    if (!existingRequest && appointment_id) {
      existingRequest = await findByAppointmentIdTx(client, appointment_id);
    }

    const isEditable =
      existingRequest && EDITABLE_REQUEST_STATUSES.includes(existingRequest.request_status);

    if (isEditable) {
      // Actualizar solicitud existente.
      // Además, si el registro encontrado quedó con consultation_id NULL (porque el primer
      // save ocurrió antes de que la consulta existiera en BD) y ahora sí tenemos uno,
      // lo completamos en el mismo UPDATE para "adoptar" el registro huérfano.
      const updateQuery = `
        UPDATE radiography_requests SET
          radiography_type = COALESCE($1, radiography_type),
          area_of_interest = $2,
          clinical_indication = $3,
          urgency = COALESCE($4, urgency),
          notes = $5,
          request_data = $6,
          pricing_data = $7,
          consultation_id = COALESCE(consultation_id, $8),
          user_id_modification = $9,
          date_time_modification = CURRENT_TIMESTAMP
        WHERE radiography_request_id = $10 AND status = 'active'
        RETURNING *
      `;

      const updateValues = [
        radiography_type || 'diagnostic_plan',
        area_of_interest || null,
        clinical_indication || null,
        urgency || 'normal',
        notes || null,
        request_data ? JSON.stringify(request_data) : existingRequest.request_data,
        pricing_data ? JSON.stringify(pricing_data) : existingRequest.pricing_data,
        consultation_id || null,
        user_id_registration,
        existingRequest.radiography_request_id
      ];

      const result = await client.query(updateQuery, updateValues);
      await client.query('COMMIT');
      return { ...result.rows[0], wasUpdated: true };
    }

    // Crear nueva solicitud
    const insertQuery = `
      INSERT INTO radiography_requests (
        patient_id, dentist_id, branch_id, consultation_id, request_date,
        radiography_type, area_of_interest, clinical_indication, urgency,
        request_status, notes, request_data, pricing_data, user_id_registration
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
      RETURNING *
    `;

    const insertValues = [
      patient_id || null,
      dentist_id || null,
      branch_id || 1,
      consultation_id || null,
      request_date || formatDateYMD(),
      radiography_type || 'diagnostic_plan',
      area_of_interest || null,
      clinical_indication || null,
      urgency || 'normal',
      request_status || 'pending',
      notes || null,
      request_data ? JSON.stringify(request_data) : null,
      pricing_data ? JSON.stringify(pricing_data) : null,
      user_id_registration
    ];

    const result = await client.query(insertQuery, insertValues);
    await client.query('COMMIT');
    return { ...result.rows[0], wasUpdated: false };
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    throw err;
  } finally {
    client.release();
  }
};

/**
 * Estados permitidos para eliminación (soft-delete).
 * Solo solicitudes aún no tocadas por el técnico pueden borrarse.
 */
const DELETABLE_REQUEST_STATUSES = ['pending'];

/**
 * Soft-delete de una solicitud de radiografía.
 * Devuelve un objeto con el resultado:
 *   - { ok: true } si se eliminó.
 *   - { ok: false, reason: 'not_found' } si no existe o ya estaba inactiva.
 *   - { ok: false, reason: 'not_deletable', currentStatus } si existe pero no está en un estado permitido.
 */
const deleteRadiographyRequest = async (requestId, userId) => {
  const checkQuery = `
    SELECT radiography_request_id, request_status
    FROM radiography_requests
    WHERE radiography_request_id = $1 AND status = 'active'
  `;
  const checkResult = await pool.query(checkQuery, [requestId]);

  if (checkResult.rowCount === 0) {
    return { ok: false, reason: 'not_found' };
  }

  const currentStatus = checkResult.rows[0].request_status;

  if (!DELETABLE_REQUEST_STATUSES.includes(currentStatus)) {
    return { ok: false, reason: 'not_deletable', currentStatus };
  }

  const updateQuery = `
    UPDATE radiography_requests SET
      status = 'inactive',
      user_id_modification = $1,
      date_time_modification = CURRENT_TIMESTAMP
    WHERE radiography_request_id = $2 AND status = 'active'
    RETURNING radiography_request_id
  `;

  const result = await pool.query(updateQuery, [userId, requestId]);
  return result.rowCount > 0 ? { ok: true } : { ok: false, reason: 'not_found' };
};

const countRadiographyRequests = async (filters = {}) => {
  // Base query con JOIN para filtrar por source
  let query = `
    SELECT COUNT(*) as total
    FROM radiography_requests rr
    LEFT JOIN users u_creator ON rr.user_id_registration = u_creator.user_id
    WHERE rr.status = 'active'
  `;
  const params = [];
  let paramIndex = 1;

  if (filters.patient_id) {
    query += ` AND rr.patient_id = $${paramIndex}`;
    params.push(filters.patient_id);
    paramIndex++;
  }

  if (filters.dentist_id) {
    query += ` AND rr.dentist_id = $${paramIndex}`;
    params.push(filters.dentist_id);
    paramIndex++;
  }

  if (filters.branch_id) {
    query += ` AND rr.branch_id = $${paramIndex}`;
    params.push(filters.branch_id);
    paramIndex++;
  }

  if (filters.consultation_id) {
    query += ` AND rr.consultation_id = $${paramIndex}`;
    params.push(filters.consultation_id);
    paramIndex++;
  }

  if (filters.radiography_type) {
    query += ` AND rr.radiography_type = $${paramIndex}`;
    params.push(filters.radiography_type);
    paramIndex++;
  }

  if (filters.request_status) {
    query += ` AND rr.request_status = $${paramIndex}`;
    params.push(filters.request_status);
    paramIndex++;
  }

  if (filters.urgency) {
    query += ` AND rr.urgency = $${paramIndex}`;
    params.push(filters.urgency);
    paramIndex++;
  }

  if (filters.date_from) {
    query += ` AND rr.request_date >= $${paramIndex}`;
    params.push(filters.date_from);
    paramIndex++;
  }

  if (filters.date_to) {
    query += ` AND rr.request_date <= $${paramIndex}`;
    params.push(filters.date_to);
    paramIndex++;
  }

  // Filtro por origen de la solicitud (internal/external)
  if (filters.source === 'external') {
    query += ` AND u_creator.role_id = 7`;
  } else if (filters.source === 'internal') {
    query += ` AND (u_creator.role_id IS NULL OR u_creator.role_id != 7)`;
  }

  const result = await pool.query(query, params);
  return parseInt(result.rows[0].total);
};

module.exports = {
  getAllRadiographyRequests,
  getRadiographyRequestById,
  createRadiographyRequest,
  updateRadiographyRequest,
  deleteRadiographyRequest,
  countRadiographyRequests,
  findByConsultationId,
  findByAppointmentId,
  upsertRadiographyRequest
};
