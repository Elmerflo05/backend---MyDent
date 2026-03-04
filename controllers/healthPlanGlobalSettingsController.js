const {
  getGlobalSettings,
  updateGlobalSettings
} = require('../models/healthPlanGlobalSettingsModel');

/**
 * Mapea de snake_case (DB) a camelCase (API)
 */
const mapToApiFormat = (dbRecord) => {
  if (!dbRecord) return null;

  return {
    id: dbRecord.setting_id ? dbRecord.setting_id.toString() : '1',
    graceDays: dbRecord.grace_days,
    reminderDaysBefore: Array.isArray(dbRecord.reminder_days_before)
      ? dbRecord.reminder_days_before
      : JSON.parse(dbRecord.reminder_days_before || '[7, 3, 1]'),
    enableEmailNotifications: dbRecord.enable_email_notifications,
    enableInAppNotifications: dbRecord.enable_in_app_notifications,
    voucherRequired: dbRecord.voucher_required,
    autoApproveVouchers: dbRecord.auto_approve_vouchers,
    updatedAt: dbRecord.date_time_modification || dbRecord.date_time_registration,
    updatedBy: (dbRecord.user_id_modification || dbRecord.user_id_registration || '1').toString()
  };
};

/**
 * Mapea de camelCase (API) a snake_case (DB)
 */
const mapToDbFormat = (apiData) => {
  const dbData = {};

  if (apiData.graceDays !== undefined) dbData.grace_days = apiData.graceDays;
  if (apiData.reminderDaysBefore !== undefined) dbData.reminder_days_before = apiData.reminderDaysBefore;
  if (apiData.enableEmailNotifications !== undefined) dbData.enable_email_notifications = apiData.enableEmailNotifications;
  if (apiData.enableInAppNotifications !== undefined) dbData.enable_in_app_notifications = apiData.enableInAppNotifications;
  if (apiData.voucherRequired !== undefined) dbData.voucher_required = apiData.voucherRequired;
  if (apiData.autoApproveVouchers !== undefined) dbData.auto_approve_vouchers = apiData.autoApproveVouchers;

  return dbData;
};

/**
 * GET / - Obtener configuración global
 */
const getSettings = async (req, res) => {
  try {
    const settings = await getGlobalSettings();
    const apiSettings = mapToApiFormat(settings);

    res.json({ success: true, data: apiSettings });
  } catch (error) {
    console.error('Error al obtener configuración global de planes de salud:', error);
    res.status(500).json({
      success: false,
      error: 'Error al obtener configuración global de planes de salud'
    });
  }
};

/**
 * PUT / - Actualizar configuración global (solo super_admin)
 */
const updateSettings = async (req, res) => {
  try {
    // Validaciones básicas
    const { graceDays, reminderDaysBefore } = req.body;

    if (graceDays !== undefined) {
      if (typeof graceDays !== 'number' || graceDays < 0 || graceDays > 30) {
        return res.status(400).json({
          success: false,
          error: 'Los días de gracia deben ser un número entre 0 y 30'
        });
      }
    }

    if (reminderDaysBefore !== undefined) {
      if (!Array.isArray(reminderDaysBefore)) {
        return res.status(400).json({
          success: false,
          error: 'Los días de recordatorio deben ser un array'
        });
      }

      const isValid = reminderDaysBefore.every(day =>
        typeof day === 'number' && day > 0 && day <= 30
      );

      if (!isValid) {
        return res.status(400).json({
          success: false,
          error: 'Cada día de recordatorio debe ser un número entre 1 y 30'
        });
      }
    }

    // Mapear datos de la API al formato de la DB
    const dbData = mapToDbFormat(req.body);

    // Actualizar en la base de datos
    const updated = await updateGlobalSettings(dbData, req.user.user_id);

    // Mapear respuesta de DB a formato API
    const apiSettings = mapToApiFormat(updated);

    res.json({
      success: true,
      message: 'Configuración actualizada exitosamente',
      data: apiSettings
    });
  } catch (error) {
    console.error('Error al actualizar configuración global de planes de salud:', error);
    res.status(500).json({
      success: false,
      error: 'Error al actualizar configuración global de planes de salud'
    });
  }
};

module.exports = {
  getSettings,
  updateSettings
};
