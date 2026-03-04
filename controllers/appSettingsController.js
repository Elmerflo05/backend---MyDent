const {
  getAllAppSettings,
  getAppSettingByKey,
  getAppSettingById,
  getAppSettingsByCategory,
  getAppSettingsByBranch,
  createAppSetting,
  updateAppSetting,
  updateAppSettingByKey,
  upsertAppSetting,
  deleteAppSetting
} = require('../models/appSettingsModel');
const { logAuditEvent, AUDIT_ACTIONS } = require('../models/auditLogsModel');

const getAppSettings = async (req, res) => {
  try {
    const settings = await getAllAppSettings();
    res.json({ success: true, data: settings });
  } catch (error) {
    console.error('Error al obtener configuración:', error);
    res.status(500).json({ success: false, error: 'Error al obtener configuración' });
  }
};

const getAppSetting = async (req, res) => {
  try {
    const { id } = req.params;
    const setting = await getAppSettingById(parseInt(id));
    if (!setting) return res.status(404).json({ success: false, error: 'Configuración no encontrada' });
    res.json({ success: true, data: setting });
  } catch (error) {
    console.error('Error al obtener configuración:', error);
    res.status(500).json({ success: false, error: 'Error al obtener configuración' });
  }
};

const getSettingByKey = async (req, res) => {
  try {
    const { key } = req.params;
    const setting = await getAppSettingByKey(key);
    if (!setting) return res.status(404).json({ success: false, error: 'Configuración no encontrada' });
    res.json({ success: true, data: setting });
  } catch (error) {
    console.error('Error al obtener configuración:', error);
    res.status(500).json({ success: false, error: 'Error al obtener configuración' });
  }
};

const createNewAppSetting = async (req, res) => {
  try {
    if (!req.body.setting_key || !req.body.setting_value) {
      return res.status(400).json({ success: false, error: 'Faltan campos requeridos' });
    }
    const newSetting = await createAppSetting(req.body, req.user.user_id);
    res.status(201).json({ success: true, message: 'Configuración creada exitosamente', data: newSetting });
  } catch (error) {
    console.error('Error al crear configuración:', error);
    res.status(500).json({ success: false, error: 'Error al crear configuración' });
  }
};

const updateExistingAppSetting = async (req, res) => {
  try {
    const { id } = req.params;
    const updated = await updateAppSetting(parseInt(id), req.body, req.user.user_id);
    if (!updated) return res.status(404).json({ success: false, error: 'Configuración no encontrada' });
    res.json({ success: true, message: 'Configuración actualizada exitosamente', data: updated });
  } catch (error) {
    console.error('Error al actualizar configuración:', error);
    res.status(500).json({ success: false, error: 'Error al actualizar configuración' });
  }
};

const updateSettingByKey = async (req, res) => {
  try {
    const { key } = req.params;
    const { setting_value } = req.body;
    if (!setting_value) {
      return res.status(400).json({ success: false, error: 'El valor es requerido' });
    }
    const updated = await updateAppSettingByKey(key, setting_value, req.user.user_id);
    if (!updated) return res.status(404).json({ success: false, error: 'Configuración no encontrada' });
    res.json({ success: true, message: 'Configuración actualizada exitosamente', data: updated });
  } catch (error) {
    console.error('Error al actualizar configuración:', error);
    res.status(500).json({ success: false, error: 'Error al actualizar configuración' });
  }
};

const deleteExistingAppSetting = async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await deleteAppSetting(parseInt(id), req.user.user_id);
    if (!deleted) return res.status(404).json({ success: false, error: 'Configuración no encontrada' });
    res.json({ success: true, message: 'Configuración eliminada exitosamente' });
  } catch (error) {
    console.error('Error al eliminar configuración:', error);
    res.status(500).json({ success: false, error: 'Error al eliminar configuración' });
  }
};

/**
 * Obtiene configuraciones por categoría
 * GET /api/settings/category/:category
 */
const getSettingsByCategory = async (req, res) => {
  try {
    const { category } = req.params;
    const validCategories = ['security', 'notifications', 'clinic', 'appointments', 'contact'];

    if (!validCategories.includes(category)) {
      return res.status(400).json({
        success: false,
        error: `Categoría inválida. Debe ser una de: ${validCategories.join(', ')}`
      });
    }

    const settings = await getAppSettingsByCategory(category);
    res.json({ success: true, data: settings });
  } catch (error) {
    console.error('Error al obtener configuraciones por categoría:', error);
    res.status(500).json({ success: false, error: 'Error al obtener configuraciones' });
  }
};

/**
 * Obtiene configuraciones por sede (branch)
 * GET /api/settings/branch/:branchId
 */
const getSettingsByBranch = async (req, res) => {
  try {
    const { branchId } = req.params;
    const settings = await getAppSettingsByBranch(branchId === 'global' ? null : parseInt(branchId));
    res.json({ success: true, data: settings });
  } catch (error) {
    console.error('Error al obtener configuraciones por sede:', error);
    res.status(500).json({ success: false, error: 'Error al obtener configuraciones' });
  }
};

/**
 * Upsert: Crea o actualiza una configuración por clave
 * PUT /api/settings/upsert/:key
 */
const upsertSettingByKey = async (req, res) => {
  try {
    const { key } = req.params;
    const { setting_value, setting_type, setting_category, description, branch_id, is_public } = req.body;

    if (setting_value === undefined || setting_value === null) {
      return res.status(400).json({ success: false, error: 'El valor es requerido' });
    }

    // Obtener el valor anterior para auditoría
    const oldSetting = await getAppSettingByKey(key);
    const oldValue = oldSetting?.setting_value;

    const result = await upsertAppSetting(key, setting_value, req.user.user_id, {
      setting_type,
      setting_category,
      description,
      branch_id,
      is_public
    });

    // Registrar cambio de configuración en auditoría (especialmente para configuraciones de seguridad)
    if (setting_category === 'security' || key.includes('session') || key.includes('password') || key.includes('login') || key.includes('audit')) {
      await logAuditEvent({
        user_id: req.user.user_id,
        action_type: AUDIT_ACTIONS.SETTING_CHANGE,
        table_name: 'app_settings',
        record_id: result.setting_id,
        old_values: oldValue !== undefined ? { setting_key: key, setting_value: oldValue } : null,
        new_values: { setting_key: key, setting_value: setting_value },
        ip_address: req.ip || req.connection?.remoteAddress,
        user_agent: req.get('User-Agent'),
        description: `Cambio de configuración de seguridad: ${key}`
      });
    }

    res.json({ success: true, message: 'Configuración guardada exitosamente', data: result });
  } catch (error) {
    console.error('Error al guardar configuración:', error);
    res.status(500).json({ success: false, error: 'Error al guardar configuración' });
  }
};

module.exports = {
  getAppSettings,
  getAppSetting,
  getSettingByKey,
  getSettingsByCategory,
  getSettingsByBranch,
  createNewAppSetting,
  updateExistingAppSetting,
  updateSettingByKey,
  upsertSettingByKey,
  deleteExistingAppSetting
};
