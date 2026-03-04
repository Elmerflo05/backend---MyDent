const pool = require('../config/db');
const { DEFAULT_APPOINTMENT_TYPE } = require('../constants/appointmentTypes');

/**
 * Obtener todas las citas con filtros
 */
const getAllAppointments = async (filters = {}) => {
  let query = `
    SELECT
      a.*,
      p.first_name || ' ' || p.last_name as patient_name,
      p.identification_number,
      p.phone as patient_phone,
      p.mobile as patient_mobile,
      u.first_name || ' ' || u.last_name as dentist_name,
      ast.status_name as appointment_status_name,
      LOWER(ast.status_code) as status_code,
      ast.status_color,
      s.specialty_name,
      b.branch_name,
      pr.promotion_name,
      (SELECT COUNT(*) FROM appointment_reschedules ar
       WHERE ar.appointment_id = a.appointment_id
       AND ar.status = 'approved') as reschedule_count
    FROM appointments a
    INNER JOIN patients p ON a.patient_id = p.patient_id
    INNER JOIN dentists d ON a.dentist_id = d.dentist_id
    INNER JOIN users u ON d.user_id = u.user_id
    LEFT JOIN appointment_statuses ast ON a.appointment_status_id = ast.appointment_status_id
    LEFT JOIN branches b ON a.branch_id = b.branch_id
    LEFT JOIN specialties s ON a.specialty_id = s.specialty_id
    LEFT JOIN promotions pr ON a.selected_promotion_id = pr.promotion_id
    WHERE a.status = 'active'
  `;

  const params = [];
  let paramIndex = 1;

  if (filters.branch_id) {
    query += ` AND a.branch_id = $${paramIndex}`;
    params.push(filters.branch_id);
    paramIndex++;
  }

  if (filters.dentist_id) {
    query += ` AND a.dentist_id = $${paramIndex}`;
    params.push(filters.dentist_id);
    paramIndex++;
  }

  if (filters.patient_id) {
    query += ` AND a.patient_id = $${paramIndex}`;
    params.push(filters.patient_id);
    paramIndex++;
  }

  if (filters.appointment_status_id) {
    query += ` AND a.appointment_status_id = $${paramIndex}`;
    params.push(filters.appointment_status_id);
    paramIndex++;
  }

  if (filters.date_from) {
    query += ` AND a.appointment_date >= $${paramIndex}`;
    params.push(filters.date_from);
    paramIndex++;
  }

  if (filters.date_to) {
    query += ` AND a.appointment_date <= $${paramIndex}`;
    params.push(filters.date_to);
    paramIndex++;
  }

  if (filters.search) {
    query += ` AND (
      p.first_name ILIKE $${paramIndex} OR
      p.last_name ILIKE $${paramIndex} OR
      p.identification_number ILIKE $${paramIndex}
    )`;
    params.push(`%${filters.search}%`);
    paramIndex++;
  }

  query += ` ORDER BY a.appointment_date DESC, a.start_time DESC`;

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
 * Obtener una cita por ID
 */
const getAppointmentById = async (appointmentId) => {
  const query = `
    SELECT
      a.*,
      p.first_name || ' ' || p.last_name as patient_name,
      p.identification_number,
      p.phone as patient_phone,
      p.mobile as patient_mobile,
      p.email as patient_email,
      u.first_name || ' ' || u.last_name as dentist_name,
      ast.status_name as appointment_status_name,
      LOWER(ast.status_code) as status_code,
      ast.status_color,
      s.specialty_name,
      b.branch_name,
      pr.promotion_name,
      pr.discount_value,
      pr.discount_type,
      (SELECT COUNT(*) FROM appointment_reschedules ar
       WHERE ar.appointment_id = a.appointment_id
       AND ar.status = 'approved') as reschedule_count
    FROM appointments a
    INNER JOIN patients p ON a.patient_id = p.patient_id
    INNER JOIN dentists d ON a.dentist_id = d.dentist_id
    INNER JOIN users u ON d.user_id = u.user_id
    INNER JOIN appointment_statuses ast ON a.appointment_status_id = ast.appointment_status_id
    INNER JOIN branches b ON a.branch_id = b.branch_id
    LEFT JOIN specialties s ON a.specialty_id = s.specialty_id
    LEFT JOIN promotions pr ON a.selected_promotion_id = pr.promotion_id
    WHERE a.appointment_id = $1 AND a.status = 'active'
  `;

  const result = await pool.query(query, [appointmentId]);
  return result.rows.length > 0 ? result.rows[0] : null;
};

/**
 * Crear una nueva cita
 */
const createAppointment = async (appointmentData) => {
  const {
    patient_id,
    dentist_id,
    branch_id,
    specialty_id,
    appointment_status_id,
    appointment_date,
    start_time,
    end_time,
    appointment_type,
    reason,
    notes,
    room,
    duration,
    price,
    payment_method,
    voucher,
    selected_promotion_id,
    user_id_registration,
    // Campos de aprobación automática (para roles autorizados)
    approved_at,
    approved_by,
    approval_notes
  } = appointmentData;

  const query = `
    INSERT INTO appointments (
      patient_id, dentist_id, branch_id, specialty_id, appointment_status_id,
      appointment_date, start_time, end_time, appointment_type, reason, notes,
      room, duration, price, payment_method, voucher, selected_promotion_id,
      user_id_registration, approved_at, approved_by, approval_notes
    ) VALUES (
      $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21
    ) RETURNING *
  `;

  const values = [
    patient_id,
    dentist_id,
    branch_id,
    specialty_id || null,
    appointment_status_id,
    appointment_date,
    start_time,
    end_time,
    appointment_type || DEFAULT_APPOINTMENT_TYPE,
    reason || null,
    notes || null,
    room || null,
    duration || 30,
    price || null,
    payment_method || null,
    voucher || null,
    selected_promotion_id || null,
    user_id_registration,
    approved_at || null,
    approved_by || null,
    approval_notes || null
  ];

  const result = await pool.query(query, values);
  return result.rows[0];
};

/**
 * Actualizar una cita
 */
const updateAppointment = async (appointmentId, appointmentData) => {
  const fields = [];
  const values = [];
  let paramIndex = 1;

  // Lista de campos permitidos en la tabla appointments
  const allowedFields = [
    'patient_id', 'dentist_id', 'branch_id', 'specialty_id',
    'appointment_status_id', 'appointment_date', 'start_time', 'end_time',
    'appointment_type', 'reason', 'notes', 'room', 'duration', 'price',
    'payment_method', 'voucher', 'selected_promotion_id',
    'confirmed', 'confirmed_at', 'confirmed_by',
    'cancelled_at', 'cancelled_by', 'cancellation_reason',
    'arrived_at', 'completed_at',
    'approved_at', 'approved_by', 'approval_notes',
    'rejected_at', 'rejected_by', 'rejection_reason',
    'no_show_at', 'no_show_notes'
  ];

  // Construir dinámicamente la query solo con campos válidos
  Object.keys(appointmentData).forEach((key) => {
    if (key !== 'user_id_modification' &&
        allowedFields.includes(key) &&
        appointmentData[key] !== undefined) {
      fields.push(`${key} = $${paramIndex}`);
      values.push(appointmentData[key]);
      paramIndex++;
    }
  });

  if (fields.length === 0) {
    throw new Error('No hay campos para actualizar');
  }

  fields.push(`user_id_modification = $${paramIndex}`);
  values.push(appointmentData.user_id_modification);
  paramIndex++;

  fields.push(`date_time_modification = CURRENT_TIMESTAMP`);

  values.push(appointmentId);

  const query = `
    UPDATE appointments SET ${fields.join(', ')}
    WHERE appointment_id = $${paramIndex} AND status = 'active'
    RETURNING *
  `;

  const result = await pool.query(query, values);
  return result.rows.length > 0 ? result.rows[0] : null;
};

/**
 * Cancelar una cita
 */
const cancelAppointment = async (appointmentId, userId, cancellationReason) => {
  const query = `
    UPDATE appointments SET
      appointment_status_id = 5,
      cancelled_at = CURRENT_TIMESTAMP,
      cancelled_by = $1,
      cancellation_reason = $2,
      user_id_modification = $1,
      date_time_modification = CURRENT_TIMESTAMP
    WHERE appointment_id = $3 AND status = 'active'
    RETURNING *
  `;

  const result = await pool.query(query, [userId, cancellationReason, appointmentId]);
  return result.rows.length > 0 ? result.rows[0] : null;
};

/**
 * Marcar paciente como llegado y cambiar estado a "En Proceso"
 */
const markAsArrived = async (appointmentId, userId) => {
  const query = `
    UPDATE appointments SET
      appointment_status_id = 3,
      arrived_at = CURRENT_TIMESTAMP,
      user_id_modification = $1,
      date_time_modification = CURRENT_TIMESTAMP
    WHERE appointment_id = $2 AND status = 'active'
    RETURNING *
  `;

  const result = await pool.query(query, [userId, appointmentId]);
  return result.rows.length > 0 ? result.rows[0] : null;
};

/**
 * Marcar cita como completada
 */
const markAsCompleted = async (appointmentId, userId) => {
  const query = `
    UPDATE appointments SET
      appointment_status_id = 4,
      completed_at = CURRENT_TIMESTAMP,
      user_id_modification = $1,
      date_time_modification = CURRENT_TIMESTAMP
    WHERE appointment_id = $2 AND status = 'active'
    RETURNING *
  `;

  const result = await pool.query(query, [userId, appointmentId]);
  return result.rows.length > 0 ? result.rows[0] : null;
};

/**
 * Eliminar una cita (soft delete)
 */
const deleteAppointment = async (appointmentId, userId) => {
  const query = `
    UPDATE appointments SET
      status = 'inactive',
      user_id_modification = $1,
      date_time_modification = CURRENT_TIMESTAMP
    WHERE appointment_id = $2 AND status = 'active'
    RETURNING appointment_id
  `;

  const result = await pool.query(query, [userId, appointmentId]);
  return result.rowCount > 0;
};

/**
 * Contar total de citas
 */
const countAppointments = async (filters = {}) => {
  let query = `
    SELECT COUNT(*) as total
    FROM appointments a
    INNER JOIN patients p ON a.patient_id = p.patient_id
    WHERE a.status = 'active'
  `;

  const params = [];
  let paramIndex = 1;

  if (filters.branch_id) {
    query += ` AND a.branch_id = $${paramIndex}`;
    params.push(filters.branch_id);
    paramIndex++;
  }

  if (filters.dentist_id) {
    query += ` AND a.dentist_id = $${paramIndex}`;
    params.push(filters.dentist_id);
    paramIndex++;
  }

  if (filters.patient_id) {
    query += ` AND a.patient_id = $${paramIndex}`;
    params.push(filters.patient_id);
    paramIndex++;
  }

  if (filters.appointment_status_id) {
    query += ` AND a.appointment_status_id = $${paramIndex}`;
    params.push(filters.appointment_status_id);
    paramIndex++;
  }

  if (filters.date_from) {
    query += ` AND a.appointment_date >= $${paramIndex}`;
    params.push(filters.date_from);
    paramIndex++;
  }

  if (filters.date_to) {
    query += ` AND a.appointment_date <= $${paramIndex}`;
    params.push(filters.date_to);
    paramIndex++;
  }

  if (filters.search) {
    query += ` AND (
      p.first_name ILIKE $${paramIndex} OR
      p.last_name ILIKE $${paramIndex} OR
      p.identification_number ILIKE $${paramIndex}
    )`;
    params.push(`%${filters.search}%`);
  }

  const result = await pool.query(query, params);
  return parseInt(result.rows[0].total);
};

/**
 * Aprobar una cita (cambiar de Pendiente de Aprobación a Programada)
 * Solo pueden aprobar: Superadmin, Admin de Sede, Recepcionista de Sede
 * NOTA: Según las reglas de negocio del trigger, desde estado 0 solo se puede ir a 1, 5 u 8
 *       Por lo tanto, la aprobación cambia a estado 1 (Programada)
 */
const approveAppointment = async (appointmentId, userId, approvalNotes = null) => {
  // Primero verificar que la cita existe y está en estado correcto
  const checkQuery = `
    SELECT appointment_id, appointment_status_id, status
    FROM appointments
    WHERE appointment_id = $1
  `;

  const checkResult = await pool.query(checkQuery, [appointmentId]);

  if (checkResult.rows.length === 0) {
    // Cita no existe
    return { error: 'NOT_FOUND', message: 'Cita no encontrada' };
  }

  const appointment = checkResult.rows[0];

  if (appointment.status !== 'active') {
    return { error: 'INACTIVE', message: 'La cita ha sido eliminada' };
  }

  if (appointment.appointment_status_id !== 0) {
    // Cita no está en estado "Pendiente de Aprobación"
    const statusNames = {
      1: 'Programada',
      2: 'Confirmada',
      3: 'En Proceso',
      4: 'Completada',
      5: 'Cancelada',
      6: 'No Asistió',
      7: 'Reprogramada',
      8: 'Rechazada'
    };
    return {
      error: 'INVALID_STATUS',
      message: `La cita ya está en estado "${statusNames[appointment.appointment_status_id] || 'Desconocido'}" y no puede ser aprobada`,
      current_status_id: appointment.appointment_status_id
    };
  }

  // Si llegamos aquí, la cita está en estado correcto, proceder con la aprobación
  // IMPORTANTE: Cambiar a estado 1 (Programada) según reglas del trigger
  const query = `
    UPDATE appointments SET
      appointment_status_id = 1,
      approved_at = CURRENT_TIMESTAMP,
      approved_by = $1,
      approval_notes = $2,
      user_id_modification = $1,
      date_time_modification = CURRENT_TIMESTAMP
    WHERE appointment_id = $3 AND status = 'active' AND appointment_status_id = 0
    RETURNING *
  `;

  const result = await pool.query(query, [userId, approvalNotes, appointmentId]);
  return result.rows.length > 0 ? result.rows[0] : null;
};

/**
 * Rechazar una cita (cambiar de Pendiente de Aprobación a Rechazada)
 * Solo pueden rechazar: Superadmin, Admin de Sede, Recepcionista de Sede
 * Motivo: Voucher inválido o no verificable
 * NOTA: Solo se pueden rechazar citas en estado "Pendiente de Aprobación" (status_id = 0)
 */
const rejectAppointment = async (appointmentId, userId, rejectionReason) => {
  // Primero verificar que la cita existe y está en estado correcto
  const checkQuery = `
    SELECT appointment_id, appointment_status_id, status
    FROM appointments
    WHERE appointment_id = $1 AND status = 'active'
  `;

  const checkResult = await pool.query(checkQuery, [appointmentId]);

  if (checkResult.rows.length === 0) {
    // Cita no existe o está inactiva
    return null;
  }

  const currentStatus = checkResult.rows[0].appointment_status_id;

  if (currentStatus !== 0) {
    // Cita no está en estado "Pendiente de Aprobación"
    // Retornar objeto especial con información del estado actual
    return {
      error: 'INVALID_STATUS',
      message: 'Solo se pueden rechazar citas en estado Pendiente de Aprobación',
      current_status_id: currentStatus
    };
  }

  // Si llegamos aquí, la cita está en estado correcto, proceder con el rechazo
  const query = `
    UPDATE appointments SET
      appointment_status_id = 8,
      rejected_at = CURRENT_TIMESTAMP,
      rejected_by = $1,
      rejection_reason = $2,
      user_id_modification = $1,
      date_time_modification = CURRENT_TIMESTAMP
    WHERE appointment_id = $3 AND status = 'active' AND appointment_status_id = 0
    RETURNING *
  `;

  const result = await pool.query(query, [userId, rejectionReason, appointmentId]);
  return result.rows.length > 0 ? result.rows[0] : null;
};

/**
 * Marcar cita como "No Asistió"
 */
const markAsNoShow = async (appointmentId, userId, notes = null) => {
  const query = `
    UPDATE appointments SET
      appointment_status_id = 6,
      no_show_at = CURRENT_TIMESTAMP,
      no_show_notes = $1,
      user_id_modification = $2,
      date_time_modification = CURRENT_TIMESTAMP
    WHERE appointment_id = $3 AND status = 'active'
    RETURNING *
  `;

  const result = await pool.query(query, [notes, userId, appointmentId]);
  return result.rows.length > 0 ? result.rows[0] : null;
};

/**
 * Actualizar estado de una cita
 */
const updateStatus = async (appointmentId, statusId, userId) => {
  const query = `
    UPDATE appointments SET
      appointment_status_id = $1,
      user_id_modification = $2,
      date_time_modification = CURRENT_TIMESTAMP
    WHERE appointment_id = $3 AND status = 'active'
    RETURNING *
  `;

  const result = await pool.query(query, [statusId, userId, appointmentId]);
  return result.rows.length > 0 ? result.rows[0] : null;
};

/**
 * Verificar disponibilidad de horario del odontologo
 * IMPORTANTE: No filtra por specialty_id ni branch_id porque:
 * - El odontologo es una persona fisica que no puede estar en dos lugares a la vez
 * - Si tiene cita en Sede A, tampoco puede tener cita en Sede B al mismo tiempo
 * - Si tiene cita de Ortodoncia, tampoco puede tener cita de Endodoncia al mismo tiempo
 */
const checkAvailability = async (params) => {
  const {
    dentist_id,
    appointment_date,
    start_time,
    end_time,
    exclude_appointment_id
  } = params;

  let query = `
    SELECT
      a.appointment_id,
      a.start_time,
      a.end_time,
      s.specialty_name,
      b.branch_name
    FROM appointments a
    LEFT JOIN specialties s ON a.specialty_id = s.specialty_id
    LEFT JOIN branches b ON a.branch_id = b.branch_id
    WHERE a.dentist_id = $1
      AND a.appointment_date = $2
      AND a.status = 'active'
      AND a.appointment_status_id IN (0, 1, 2, 3, 7)
      AND (
        (a.start_time >= $3 AND a.start_time < $4) OR
        (a.end_time > $3 AND a.end_time <= $4) OR
        (a.start_time <= $3 AND a.end_time >= $4)
      )
  `;

  const params_arr = [dentist_id, appointment_date, start_time, end_time];

  if (exclude_appointment_id) {
    query += ` AND a.appointment_id != $5`;
    params_arr.push(exclude_appointment_id);
  }

  query += ` LIMIT 1`;

  const result = await pool.query(query, params_arr);

  if (result.rows.length > 0) {
    // Hay conflicto - retornar informacion del conflicto
    return {
      available: false,
      conflict: result.rows[0]
    };
  }

  return { available: true };
};

/**
 * Crear propuesta de reprogramación
 */
const createRescheduleProposal = async (data) => {
  const query = `
    INSERT INTO appointment_reschedules (
      appointment_id,
      proposed_by_user_id,
      proposed_date,
      proposed_start_time,
      proposed_end_time,
      reason,
      status
    ) VALUES ($1, $2, $3, $4, $5, $6, $7)
    RETURNING *
  `;

  const values = [
    data.appointment_id,
    data.proposed_by_user_id,
    data.proposed_date,
    data.proposed_start_time,
    data.proposed_end_time,
    data.reason || null,
    data.status || 'pending'
  ];

  const result = await pool.query(query, values);
  return result.rows[0];
};

/**
 * Obtener propuesta de reprogramación
 */
const getRescheduleProposal = async (rescheduleId) => {
  const query = `
    SELECT * FROM appointment_reschedules
    WHERE reschedule_id = $1
  `;

  const result = await pool.query(query, [rescheduleId]);
  return result.rows.length > 0 ? result.rows[0] : null;
};

/**
 * Actualizar propuesta de reprogramación
 */
const updateRescheduleProposal = async (rescheduleId, data) => {
  const fields = [];
  const values = [];
  let paramIndex = 1;

  Object.keys(data).forEach((key) => {
    if (data[key] !== undefined) {
      fields.push(`${key} = $${paramIndex}`);
      values.push(data[key]);
      paramIndex++;
    }
  });

  if (fields.length === 0) {
    throw new Error('No hay campos para actualizar');
  }

  values.push(rescheduleId);

  const query = `
    UPDATE appointment_reschedules SET ${fields.join(', ')}
    WHERE reschedule_id = $${paramIndex}
    RETURNING *
  `;

  const result = await pool.query(query, values);
  return result.rows.length > 0 ? result.rows[0] : null;
};

/**
 * Agregar entrada al historial de estados
 */
const addStatusHistory = async (data) => {
  const query = `
    INSERT INTO appointment_status_history (
      appointment_id,
      old_status_id,
      new_status_id,
      changed_by_user_id,
      notes
    ) VALUES ($1, $2, $3, $4, $5)
    RETURNING *
  `;

  const values = [
    data.appointment_id,
    data.old_status_id,
    data.new_status_id,
    data.changed_by_user_id,
    data.notes || null
  ];

  const result = await pool.query(query, values);
  return result.rows[0];
};

module.exports = {
  getAllAppointments,
  getAppointmentById,
  createAppointment,
  updateAppointment,
  cancelAppointment,
  markAsArrived,
  markAsCompleted,
  deleteAppointment,
  countAppointments,
  approveAppointment,
  rejectAppointment,
  markAsNoShow,
  updateStatus,
  checkAvailability,
  createRescheduleProposal,
  getRescheduleProposal,
  updateRescheduleProposal,
  addStatusHistory
};
