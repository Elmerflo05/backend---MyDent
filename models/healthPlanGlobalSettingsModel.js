const pool = require('../config/db');

/**
 * Obtener configuración global de planes de salud
 * Siempre retorna un único registro
 */
const getGlobalSettings = async () => {
  const query = `
    SELECT * FROM health_plan_global_settings
    WHERE status = 'active'
    ORDER BY setting_id ASC
    LIMIT 1
  `;
  const result = await pool.query(query);

  // Si no existe registro, retornar valores por defecto
  if (result.rows.length === 0) {
    return {
      setting_id: null,
      grace_days: 3,
      reminder_days_before: [7, 3, 1],
      enable_email_notifications: true,
      enable_in_app_notifications: true,
      voucher_required: true,
      auto_approve_vouchers: false,
      status: 'active',
      user_id_registration: null,
      date_time_registration: null,
      user_id_modification: null,
      date_time_modification: null
    };
  }

  return result.rows[0];
};

/**
 * Actualizar configuración global
 * Si no existe registro, lo crea. Si existe, lo actualiza.
 */
const updateGlobalSettings = async (data, userId) => {
  // Primero verificar si existe un registro
  const existing = await pool.query(
    'SELECT setting_id FROM health_plan_global_settings WHERE status = $1 LIMIT 1',
    ['active']
  );

  if (existing.rows.length === 0) {
    // Crear nuevo registro
    const insertQuery = `
      INSERT INTO health_plan_global_settings (
        grace_days,
        reminder_days_before,
        enable_email_notifications,
        enable_in_app_notifications,
        voucher_required,
        auto_approve_vouchers,
        status,
        user_id_registration,
        date_time_registration
      ) VALUES ($1, $2, $3, $4, $5, $6, 'active', $7, CURRENT_TIMESTAMP)
      RETURNING *
    `;

    const values = [
      data.grace_days !== undefined ? data.grace_days : 3,
      data.reminder_days_before !== undefined ? JSON.stringify(data.reminder_days_before) : '[7, 3, 1]',
      data.enable_email_notifications !== undefined ? data.enable_email_notifications : true,
      data.enable_in_app_notifications !== undefined ? data.enable_in_app_notifications : true,
      data.voucher_required !== undefined ? data.voucher_required : true,
      data.auto_approve_vouchers !== undefined ? data.auto_approve_vouchers : false,
      userId
    ];

    const result = await pool.query(insertQuery, values);
    return result.rows[0];
  } else {
    // Actualizar registro existente
    const updateQuery = `
      UPDATE health_plan_global_settings SET
        grace_days = COALESCE($1, grace_days),
        reminder_days_before = COALESCE($2, reminder_days_before),
        enable_email_notifications = COALESCE($3, enable_email_notifications),
        enable_in_app_notifications = COALESCE($4, enable_in_app_notifications),
        voucher_required = COALESCE($5, voucher_required),
        auto_approve_vouchers = COALESCE($6, auto_approve_vouchers),
        user_id_modification = $7,
        date_time_modification = CURRENT_TIMESTAMP
      WHERE setting_id = $8 AND status = 'active'
      RETURNING *
    `;

    const values = [
      data.grace_days !== undefined ? data.grace_days : null,
      data.reminder_days_before !== undefined ? JSON.stringify(data.reminder_days_before) : null,
      data.enable_email_notifications !== undefined ? data.enable_email_notifications : null,
      data.enable_in_app_notifications !== undefined ? data.enable_in_app_notifications : null,
      data.voucher_required !== undefined ? data.voucher_required : null,
      data.auto_approve_vouchers !== undefined ? data.auto_approve_vouchers : null,
      userId,
      existing.rows[0].setting_id
    ];

    const result = await pool.query(updateQuery, values);
    return result.rows[0];
  }
};

module.exports = {
  getGlobalSettings,
  updateGlobalSettings
};
