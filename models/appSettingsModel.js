const pool = require('../config/db');

const getAllAppSettings = async () => {
  const query = `SELECT * FROM app_settings WHERE status = 'active' ORDER BY setting_key ASC`;
  const result = await pool.query(query);
  return result.rows;
};

const getAppSettingByKey = async (settingKey) => {
  const result = await pool.query(
    'SELECT * FROM app_settings WHERE setting_key = $1 AND status = $2',
    [settingKey, 'active']
  );
  return result.rows.length > 0 ? result.rows[0] : null;
};

const getAppSettingById = async (settingId) => {
  const result = await pool.query(
    'SELECT * FROM app_settings WHERE app_setting_id = $1 AND status = $2',
    [settingId, 'active']
  );
  return result.rows.length > 0 ? result.rows[0] : null;
};

const createAppSetting = async (settingData, userId) => {
  const query = `
    INSERT INTO app_settings (
      setting_key, setting_value, setting_type, setting_category,
      description, branch_id, is_public, user_id_registration
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *
  `;
  const values = [
    settingData.setting_key,
    settingData.setting_value,
    settingData.setting_type || 'string',
    settingData.setting_category || null,
    settingData.description || null,
    settingData.branch_id || null,
    settingData.is_public || false,
    userId
  ];
  const result = await pool.query(query, values);
  return result.rows[0];
};

const updateAppSetting = async (settingId, settingData, userId) => {
  const query = `
    UPDATE app_settings SET
      setting_value = COALESCE($1, setting_value),
      setting_type = COALESCE($2, setting_type),
      setting_category = COALESCE($3, setting_category),
      description = COALESCE($4, description),
      is_public = COALESCE($5, is_public),
      user_id_modification = $6,
      date_time_modification = CURRENT_TIMESTAMP
    WHERE app_setting_id = $7 AND status = 'active'
    RETURNING *
  `;
  const result = await pool.query(query, [
    settingData.setting_value,
    settingData.setting_type,
    settingData.setting_category,
    settingData.description,
    settingData.is_public,
    userId,
    settingId
  ]);
  return result.rows.length > 0 ? result.rows[0] : null;
};

const updateAppSettingByKey = async (settingKey, settingValue, userId) => {
  const query = `
    UPDATE app_settings SET
      setting_value = $1,
      user_id_modification = $2,
      date_time_modification = CURRENT_TIMESTAMP
    WHERE setting_key = $3 AND status = 'active'
    RETURNING *
  `;
  const result = await pool.query(query, [settingValue, userId, settingKey]);
  return result.rows.length > 0 ? result.rows[0] : null;
};

const deleteAppSetting = async (settingId, userId) => {
  const result = await pool.query(
    `UPDATE app_settings SET status = 'inactive', user_id_modification = $1,
     date_time_modification = CURRENT_TIMESTAMP
     WHERE app_setting_id = $2 AND status = 'active' RETURNING app_setting_id`,
    [userId, settingId]
  );
  return result.rowCount > 0;
};

/**
 * Obtiene configuraciones por categoría
 * @param {string} category - Categoría (security, notifications, clinic, appointments)
 * @returns {Promise<Array>} Lista de configuraciones
 */
const getAppSettingsByCategory = async (category) => {
  const query = `
    SELECT * FROM app_settings
    WHERE setting_category = $1 AND status = 'active'
    ORDER BY setting_key ASC
  `;
  const result = await pool.query(query, [category]);
  return result.rows;
};

/**
 * Obtiene configuraciones por branch_id (sede)
 * @param {number|null} branchId - ID de la sede (null para globales)
 * @returns {Promise<Array>} Lista de configuraciones
 */
const getAppSettingsByBranch = async (branchId) => {
  const query = branchId
    ? `SELECT * FROM app_settings WHERE branch_id = $1 AND status = 'active' ORDER BY setting_key ASC`
    : `SELECT * FROM app_settings WHERE branch_id IS NULL AND status = 'active' ORDER BY setting_key ASC`;
  const result = branchId
    ? await pool.query(query, [branchId])
    : await pool.query(query);
  return result.rows;
};

/**
 * Upsert: Actualiza si existe, crea si no existe
 * @param {string} settingKey - Clave de la configuración
 * @param {string} settingValue - Valor de la configuración
 * @param {number} userId - ID del usuario que realiza la operación
 * @param {Object} additionalData - Datos adicionales (setting_type, setting_category, etc.)
 * @returns {Promise<Object>} Configuración creada o actualizada
 */
const upsertAppSetting = async (settingKey, settingValue, userId, additionalData = {}) => {
  // Primero intentar actualizar
  const updateResult = await pool.query(
    `UPDATE app_settings SET
      setting_value = $1,
      setting_type = COALESCE($2, setting_type),
      setting_category = COALESCE($3, setting_category),
      user_id_modification = $4,
      date_time_modification = CURRENT_TIMESTAMP
    WHERE setting_key = $5 AND status = 'active'
    RETURNING *`,
    [settingValue, additionalData.setting_type, additionalData.setting_category, userId, settingKey]
  );

  if (updateResult.rows.length > 0) {
    return updateResult.rows[0];
  }

  // Si no existe, crear
  const insertResult = await pool.query(
    `INSERT INTO app_settings (
      setting_key, setting_value, setting_type, setting_category,
      description, branch_id, is_public, user_id_registration
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
    [
      settingKey,
      settingValue,
      additionalData.setting_type || 'string',
      additionalData.setting_category || null,
      additionalData.description || null,
      additionalData.branch_id || null,
      additionalData.is_public || false,
      userId
    ]
  );

  return insertResult.rows[0];
};

module.exports = {
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
};
