const pool = require('../config/db');

const getAllNotifications = async (filters = {}) => {
  let query = `
    SELECT
      n.*,
      CASE WHEN n.user_id IS NOT NULL THEN u.first_name || ' ' || u.last_name ELSE NULL END as user_name,
      CASE WHEN n.patient_id IS NOT NULL THEN p.first_name || ' ' || p.last_name ELSE NULL END as patient_name
    FROM notifications n
    LEFT JOIN users u ON n.user_id = u.user_id
    LEFT JOIN patients p ON n.patient_id = p.patient_id
    WHERE n.status = 'active'
  `;

  const params = [];
  let paramIndex = 1;

  if (filters.user_id) {
    query += ` AND n.user_id = $${paramIndex}`;
    params.push(filters.user_id);
    paramIndex++;
  }

  if (filters.patient_id) {
    query += ` AND n.patient_id = $${paramIndex}`;
    params.push(filters.patient_id);
    paramIndex++;
  }

  if (filters.notification_type) {
    query += ` AND n.notification_type = $${paramIndex}`;
    params.push(filters.notification_type);
    paramIndex++;
  }

  if (filters.is_read !== undefined) {
    query += ` AND n.is_read = $${paramIndex}`;
    params.push(filters.is_read);
    paramIndex++;
  }

  if (filters.priority) {
    query += ` AND n.priority = $${paramIndex}`;
    params.push(filters.priority);
    paramIndex++;
  }

  // Filtrar notificaciones no expiradas
  if (filters.not_expired === true) {
    query += ` AND (n.expires_at IS NULL OR n.expires_at >= CURRENT_TIMESTAMP)`;
  }

  query += ` ORDER BY n.is_read ASC, n.priority DESC, n.date_time_registration DESC`;

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

const getNotificationById = async (notificationId) => {
  const query = `
    SELECT
      n.*,
      CASE WHEN n.user_id IS NOT NULL THEN u.first_name || ' ' || u.last_name ELSE NULL END as user_name,
      CASE WHEN n.patient_id IS NOT NULL THEN p.first_name || ' ' || p.last_name ELSE NULL END as patient_name
    FROM notifications n
    LEFT JOIN users u ON n.user_id = u.user_id
    LEFT JOIN patients p ON n.patient_id = p.patient_id
    WHERE n.notification_id = $1 AND n.status = 'active'
  `;

  const result = await pool.query(query, [notificationId]);
  return result.rows.length > 0 ? result.rows[0] : null;
};

const createNotification = async (notificationData) => {
  const query = `
    INSERT INTO notifications (
      user_id, patient_id, notification_type, notification_title,
      notification_message, notification_data, is_read, read_at, priority,
      expires_at, user_id_registration
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
    RETURNING *
  `;

  const values = [
    notificationData.user_id || null,
    notificationData.patient_id || null,
    notificationData.notification_type,
    notificationData.notification_title,
    notificationData.notification_message,
    notificationData.notification_data || null,
    notificationData.is_read || false,
    notificationData.read_at || null,
    notificationData.priority || 'normal',
    notificationData.expires_at || null,
    notificationData.user_id_registration
  ];

  const result = await pool.query(query, values);
  return result.rows[0];
};

const updateNotification = async (notificationId, notificationData) => {
  const fields = [];
  const values = [];
  let paramIndex = 1;

  const allowedFields = [
    'notification_type', 'notification_title', 'notification_message',
    'notification_data', 'is_read', 'read_at', 'priority', 'expires_at'
  ];

  allowedFields.forEach((field) => {
    if (notificationData[field] !== undefined) {
      fields.push(`${field} = $${paramIndex}`);
      values.push(notificationData[field]);
      paramIndex++;
    }
  });

  if (fields.length === 0) {
    throw new Error('No hay campos para actualizar');
  }

  fields.push(`user_id_modification = $${paramIndex}`);
  values.push(notificationData.user_id_modification);
  paramIndex++;

  fields.push(`date_time_modification = CURRENT_TIMESTAMP`);

  values.push(notificationId);

  const query = `
    UPDATE notifications SET ${fields.join(', ')}
    WHERE notification_id = $${paramIndex} AND status = 'active'
    RETURNING *
  `;

  const result = await pool.query(query, values);
  return result.rows.length > 0 ? result.rows[0] : null;
};

const markAsRead = async (notificationId, userId) => {
  const query = `
    UPDATE notifications SET
      is_read = true,
      read_at = CURRENT_TIMESTAMP,
      user_id_modification = $1,
      date_time_modification = CURRENT_TIMESTAMP
    WHERE notification_id = $2 AND status = 'active'
    RETURNING *
  `;

  const result = await pool.query(query, [userId, notificationId]);
  return result.rows.length > 0 ? result.rows[0] : null;
};

const markAllAsRead = async (userId) => {
  const query = `
    UPDATE notifications SET
      is_read = true,
      read_at = CURRENT_TIMESTAMP,
      user_id_modification = $1,
      date_time_modification = CURRENT_TIMESTAMP
    WHERE user_id = $1 AND is_read = false AND status = 'active'
    RETURNING COUNT(*) as updated_count
  `;

  const result = await pool.query(query, [userId]);
  return result.rows[0];
};

const deleteNotification = async (notificationId, userId) => {
  const query = `
    UPDATE notifications SET
      status = 'inactive',
      user_id_modification = $1,
      date_time_modification = CURRENT_TIMESTAMP
    WHERE notification_id = $2 AND status = 'active'
    RETURNING notification_id
  `;

  const result = await pool.query(query, [userId, notificationId]);
  return result.rowCount > 0;
};

const countNotifications = async (filters = {}) => {
  let query = `SELECT COUNT(*) as total FROM notifications n WHERE n.status = 'active'`;
  const params = [];
  let paramIndex = 1;

  if (filters.user_id) {
    query += ` AND n.user_id = $${paramIndex}`;
    params.push(filters.user_id);
    paramIndex++;
  }

  if (filters.patient_id) {
    query += ` AND n.patient_id = $${paramIndex}`;
    params.push(filters.patient_id);
    paramIndex++;
  }

  if (filters.notification_type) {
    query += ` AND n.notification_type = $${paramIndex}`;
    params.push(filters.notification_type);
    paramIndex++;
  }

  if (filters.is_read !== undefined) {
    query += ` AND n.is_read = $${paramIndex}`;
    params.push(filters.is_read);
    paramIndex++;
  }

  if (filters.priority) {
    query += ` AND n.priority = $${paramIndex}`;
    params.push(filters.priority);
  }

  if (filters.not_expired === true) {
    query += ` AND (n.expires_at IS NULL OR n.expires_at >= CURRENT_TIMESTAMP)`;
  }

  const result = await pool.query(query, params);
  return parseInt(result.rows[0].total);
};

const countUnreadNotifications = async (userId) => {
  const query = `
    SELECT COUNT(*) as total
    FROM notifications
    WHERE user_id = $1 AND is_read = false AND status = 'active'
      AND (expires_at IS NULL OR expires_at >= CURRENT_TIMESTAMP)
  `;

  const result = await pool.query(query, [userId]);
  return parseInt(result.rows[0].total);
};

/**
 * Cuenta notificaciones no leídas de un paciente
 */
const countUnreadPatientNotifications = async (patientId) => {
  const query = `
    SELECT COUNT(*) as total
    FROM notifications
    WHERE patient_id = $1 AND is_read = false AND status = 'active'
      AND (expires_at IS NULL OR expires_at >= CURRENT_TIMESTAMP)
  `;

  const result = await pool.query(query, [patientId]);
  return parseInt(result.rows[0].total);
};

/**
 * Marca notificación de paciente como leída
 */
const markPatientNotificationAsRead = async (notificationId, patientId) => {
  const query = `
    UPDATE notifications SET
      is_read = true,
      read_at = CURRENT_TIMESTAMP,
      date_time_modification = CURRENT_TIMESTAMP
    WHERE notification_id = $1 AND patient_id = $2 AND status = 'active'
    RETURNING *
  `;

  const result = await pool.query(query, [notificationId, patientId]);
  return result.rows.length > 0 ? result.rows[0] : null;
};

/**
 * Marca todas las notificaciones del paciente como leídas
 */
const markAllPatientNotificationsAsRead = async (patientId) => {
  const query = `
    UPDATE notifications SET
      is_read = true,
      read_at = CURRENT_TIMESTAMP,
      date_time_modification = CURRENT_TIMESTAMP
    WHERE patient_id = $1 AND is_read = false AND status = 'active'
    RETURNING COUNT(*) as updated_count
  `;

  const result = await pool.query(query, [patientId]);
  return result.rows[0];
};

/**
 * Genera notificaciones automáticas para cuotas próximas a vencer
 * @param {number} daysBefore - Días antes del vencimiento para notificar (default: 3)
 * @returns {Object} - Resumen de notificaciones generadas
 */
const generatePaymentReminderNotifications = async (daysBefore = 3) => {
  try {
    // Buscar cuotas pendientes con vencimiento en los próximos X días
    // que NO tengan ya una notificación generada para este período
    const query = `
      SELECT
        pi.income_id,
        pi.patient_id,
        pi.item_name,
        pi.final_amount,
        pi.amount_paid,
        pi.balance,
        pi.due_date,
        pi.quota_number,
        pi.quota_type,
        p.first_name as patient_first_name,
        p.last_name as patient_last_name,
        p.email as patient_email
      FROM procedure_income pi
      INNER JOIN patients p ON pi.patient_id = p.patient_id
      WHERE pi.status = 'active'
        AND pi.payment_status IN ('pending', 'partial')
        AND pi.due_date IS NOT NULL
        AND pi.due_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '${daysBefore} days'
        AND NOT EXISTS (
          SELECT 1 FROM notifications n
          WHERE n.patient_id = pi.patient_id
            AND n.notification_type = 'payment_reminder'
            AND n.notification_data->>'income_id' = pi.income_id::text
            AND n.date_time_registration >= CURRENT_DATE - INTERVAL '7 days'
            AND n.status = 'active'
        )
      ORDER BY pi.due_date ASC
    `;

    const pendingPayments = await pool.query(query);

    const generatedNotifications = [];

    for (const payment of pendingPayments.rows) {
      const daysUntilDue = Math.ceil(
        (new Date(payment.due_date) - new Date()) / (1000 * 60 * 60 * 24)
      );

      let title = '';
      let message = '';
      let priority = 'normal';

      if (daysUntilDue <= 0) {
        title = 'Pago vencido';
        message = `Tu cuota de "${payment.item_name}" venció el ${new Date(payment.due_date).toLocaleDateString('es-PE')}. Monto pendiente: S/. ${parseFloat(payment.balance || payment.final_amount).toFixed(2)}`;
        priority = 'high';
      } else if (daysUntilDue === 1) {
        title = 'Pago vence mañana';
        message = `Tu cuota de "${payment.item_name}" vence mañana. Monto a pagar: S/. ${parseFloat(payment.balance || payment.final_amount).toFixed(2)}`;
        priority = 'high';
      } else {
        title = `Pago próximo a vencer`;
        message = `Tu cuota de "${payment.item_name}" vence en ${daysUntilDue} días (${new Date(payment.due_date).toLocaleDateString('es-PE')}). Monto a pagar: S/. ${parseFloat(payment.balance || payment.final_amount).toFixed(2)}`;
        priority = 'normal';
      }

      const notificationData = {
        patient_id: payment.patient_id,
        notification_type: 'payment_reminder',
        notification_title: title,
        notification_message: message,
        notification_data: JSON.stringify({
          income_id: payment.income_id,
          item_name: payment.item_name,
          due_date: payment.due_date,
          amount: parseFloat(payment.balance || payment.final_amount),
          quota_number: payment.quota_number,
          quota_type: payment.quota_type
        }),
        priority: priority,
        expires_at: new Date(new Date(payment.due_date).getTime() + 7 * 24 * 60 * 60 * 1000), // Expira 7 días después del vencimiento
        user_id_registration: 1 // Sistema
      };

      const notification = await createNotification(notificationData);
      generatedNotifications.push(notification);
    }

    return {
      success: true,
      generated: generatedNotifications.length,
      notifications: generatedNotifications
    };
  } catch (error) {
    console.error('Error generando notificaciones de pago:', error);
    throw error;
  }
};

/**
 * Crea una notificación para el paciente cuando se registra un nuevo ingreso/cuota
 */
const createPaymentNotification = async (incomeData) => {
  try {
    const { patient_id, item_name, final_amount, due_date, quota_number, income_id } = incomeData;

    let message = `Se ha registrado un nuevo cargo: "${item_name}" por S/. ${parseFloat(final_amount).toFixed(2)}.`;
    if (due_date) {
      message += ` Fecha de vencimiento: ${new Date(due_date).toLocaleDateString('es-PE')}.`;
    }
    if (quota_number) {
      message += ` (Cuota ${quota_number})`;
    }

    const notificationData = {
      patient_id,
      notification_type: 'new_payment',
      notification_title: 'Nuevo cargo registrado',
      notification_message: message,
      notification_data: JSON.stringify({
        income_id,
        item_name,
        amount: parseFloat(final_amount),
        due_date,
        quota_number
      }),
      priority: 'normal',
      user_id_registration: 1
    };

    return await createNotification(notificationData);
  } catch (error) {
    console.error('Error creando notificación de pago:', error);
    throw error;
  }
};

module.exports = {
  getAllNotifications,
  getNotificationById,
  createNotification,
  updateNotification,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  countNotifications,
  countUnreadNotifications,
  countUnreadPatientNotifications,
  markPatientNotificationAsRead,
  markAllPatientNotificationsAsRead,
  generatePaymentReminderNotifications,
  createPaymentNotification
};
