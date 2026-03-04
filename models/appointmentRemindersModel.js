const pool = require('../config/db');

const getAllAppointmentReminders = async (filters = {}) => {
  let query = `
    SELECT
      ar.*,
      a.appointment_date,
      a.appointment_time,
      p.first_name || ' ' || p.last_name as patient_name,
      p.phone_number as patient_phone,
      p.email as patient_email,
      rt.reminder_type_name,
      b.branch_name
    FROM appointment_reminders ar
    INNER JOIN appointments a ON ar.appointment_id = a.appointment_id
    INNER JOIN patients p ON a.patient_id = p.patient_id
    LEFT JOIN reminder_types rt ON ar.reminder_type_id = rt.reminder_type_id
    INNER JOIN branches b ON a.branch_id = b.branch_id
    WHERE ar.status = 'active'
  `;

  const params = [];
  let paramIndex = 1;

  if (filters.appointment_id) {
    query += ` AND ar.appointment_id = $${paramIndex}`;
    params.push(filters.appointment_id);
    paramIndex++;
  }

  if (filters.patient_id) {
    query += ` AND a.patient_id = $${paramIndex}`;
    params.push(filters.patient_id);
    paramIndex++;
  }

  if (filters.branch_id) {
    query += ` AND a.branch_id = $${paramIndex}`;
    params.push(filters.branch_id);
    paramIndex++;
  }

  if (filters.reminder_type_id) {
    query += ` AND ar.reminder_type_id = $${paramIndex}`;
    params.push(filters.reminder_type_id);
    paramIndex++;
  }

  if (filters.is_sent !== undefined) {
    query += ` AND ar.is_sent = $${paramIndex}`;
    params.push(filters.is_sent);
    paramIndex++;
  }

  if (filters.date_from) {
    query += ` AND ar.reminder_datetime >= $${paramIndex}`;
    params.push(filters.date_from);
    paramIndex++;
  }

  if (filters.date_to) {
    query += ` AND ar.reminder_datetime <= $${paramIndex}`;
    params.push(filters.date_to);
    paramIndex++;
  }

  query += ` ORDER BY ar.reminder_datetime DESC`;

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

const getAppointmentReminderById = async (reminderId) => {
  const query = `
    SELECT
      ar.*,
      a.appointment_date,
      a.appointment_time,
      p.first_name || ' ' || p.last_name as patient_name,
      p.phone_number as patient_phone,
      p.email as patient_email,
      rt.reminder_type_name,
      b.branch_name
    FROM appointment_reminders ar
    INNER JOIN appointments a ON ar.appointment_id = a.appointment_id
    INNER JOIN patients p ON a.patient_id = p.patient_id
    LEFT JOIN reminder_types rt ON ar.reminder_type_id = rt.reminder_type_id
    INNER JOIN branches b ON a.branch_id = b.branch_id
    WHERE ar.appointment_reminder_id = $1 AND ar.status = 'active'
  `;

  const result = await pool.query(query, [reminderId]);
  return result.rows.length > 0 ? result.rows[0] : null;
};

const createAppointmentReminder = async (reminderData) => {
  const query = `
    INSERT INTO appointment_reminders (
      appointment_id, reminder_type_id, reminder_datetime, message,
      is_sent, sent_at, user_id_registration
    ) VALUES ($1, $2, $3, $4, $5, $6, $7)
    RETURNING *
  `;

  const values = [
    reminderData.appointment_id,
    reminderData.reminder_type_id || null,
    reminderData.reminder_datetime,
    reminderData.message || null,
    reminderData.is_sent || false,
    reminderData.sent_at || null,
    reminderData.user_id_registration
  ];

  const result = await pool.query(query, values);
  return result.rows[0];
};

const updateAppointmentReminder = async (reminderId, reminderData) => {
  const fields = [];
  const values = [];
  let paramIndex = 1;

  const allowedFields = [
    'reminder_type_id', 'reminder_datetime', 'message', 'is_sent', 'sent_at'
  ];

  allowedFields.forEach((field) => {
    if (reminderData[field] !== undefined) {
      fields.push(`${field} = $${paramIndex}`);
      values.push(reminderData[field]);
      paramIndex++;
    }
  });

  if (fields.length === 0) {
    throw new Error('No hay campos para actualizar');
  }

  fields.push(`user_id_modification = $${paramIndex}`);
  values.push(reminderData.user_id_modification);
  paramIndex++;

  fields.push(`date_time_modification = CURRENT_TIMESTAMP`);

  values.push(reminderId);

  const query = `
    UPDATE appointment_reminders SET ${fields.join(', ')}
    WHERE appointment_reminder_id = $${paramIndex} AND status = 'active'
    RETURNING *
  `;

  const result = await pool.query(query, values);
  return result.rows.length > 0 ? result.rows[0] : null;
};

const markReminderAsSent = async (reminderId, userId) => {
  const query = `
    UPDATE appointment_reminders SET
      is_sent = true,
      sent_at = CURRENT_TIMESTAMP,
      user_id_modification = $1,
      date_time_modification = CURRENT_TIMESTAMP
    WHERE appointment_reminder_id = $2 AND status = 'active'
    RETURNING *
  `;

  const result = await pool.query(query, [userId, reminderId]);
  return result.rows.length > 0 ? result.rows[0] : null;
};

const deleteAppointmentReminder = async (reminderId, userId) => {
  const query = `
    UPDATE appointment_reminders SET
      status = 'inactive',
      user_id_modification = $1,
      date_time_modification = CURRENT_TIMESTAMP
    WHERE appointment_reminder_id = $2 AND status = 'active'
    RETURNING appointment_reminder_id
  `;

  const result = await pool.query(query, [userId, reminderId]);
  return result.rowCount > 0;
};

const countAppointmentReminders = async (filters = {}) => {
  let query = `
    SELECT COUNT(*) as total
    FROM appointment_reminders ar
    INNER JOIN appointments a ON ar.appointment_id = a.appointment_id
    WHERE ar.status = 'active'
  `;

  const params = [];
  let paramIndex = 1;

  if (filters.appointment_id) {
    query += ` AND ar.appointment_id = $${paramIndex}`;
    params.push(filters.appointment_id);
    paramIndex++;
  }

  if (filters.patient_id) {
    query += ` AND a.patient_id = $${paramIndex}`;
    params.push(filters.patient_id);
    paramIndex++;
  }

  if (filters.branch_id) {
    query += ` AND a.branch_id = $${paramIndex}`;
    params.push(filters.branch_id);
    paramIndex++;
  }

  if (filters.reminder_type_id) {
    query += ` AND ar.reminder_type_id = $${paramIndex}`;
    params.push(filters.reminder_type_id);
    paramIndex++;
  }

  if (filters.is_sent !== undefined) {
    query += ` AND ar.is_sent = $${paramIndex}`;
    params.push(filters.is_sent);
    paramIndex++;
  }

  if (filters.date_from) {
    query += ` AND ar.reminder_datetime >= $${paramIndex}`;
    params.push(filters.date_from);
    paramIndex++;
  }

  if (filters.date_to) {
    query += ` AND ar.reminder_datetime <= $${paramIndex}`;
    params.push(filters.date_to);
  }

  const result = await pool.query(query, params);
  return parseInt(result.rows[0].total);
};

module.exports = {
  getAllAppointmentReminders,
  getAppointmentReminderById,
  createAppointmentReminder,
  updateAppointmentReminder,
  markReminderAsSent,
  deleteAppointmentReminder,
  countAppointmentReminders
};
