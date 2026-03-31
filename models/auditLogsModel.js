const pool = require('../config/db');

const getAllAuditLogs = async (filters = {}) => {
  let query = `
    SELECT al.*, u.first_name || ' ' || u.last_name as user_name, u.email as user_email
    FROM audit_logs al
    LEFT JOIN users u ON al.user_id = u.user_id
    WHERE 1=1
  `;
  const params = [];
  let paramIndex = 1;

  if (filters.user_id) {
    query += ` AND al.user_id = $${paramIndex}`;
    params.push(filters.user_id);
    paramIndex++;
  }

  if (filters.action_type) {
    query += ` AND al.action = $${paramIndex}`;
    params.push(filters.action_type);
    paramIndex++;
  }

  if (filters.table_name) {
    query += ` AND al.table_name = $${paramIndex}`;
    params.push(filters.table_name);
    paramIndex++;
  }

  if (filters.record_id) {
    query += ` AND al.record_id = $${paramIndex}`;
    params.push(filters.record_id);
    paramIndex++;
  }

  if (filters.branch_id) {
    query += ` AND al.branch_id = $${paramIndex}`;
    params.push(filters.branch_id);
    paramIndex++;
  }

  if (filters.date_from) {
    query += ` AND al.timestamp >= $${paramIndex}`;
    params.push(filters.date_from);
    paramIndex++;
  }

  if (filters.date_to) {
    query += ` AND al.timestamp <= $${paramIndex}`;
    params.push(filters.date_to);
    paramIndex++;
  }

  query += ` ORDER BY al.timestamp DESC`;

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

const getAuditLogById = async (logId) => {
  const query = `
    SELECT al.*, u.first_name || ' ' || u.last_name as user_name, u.email as user_email
    FROM audit_logs al
    LEFT JOIN users u ON al.user_id = u.user_id
    WHERE al.audit_log_id = $1
  `;
  const result = await pool.query(query, [logId]);
  return result.rows.length > 0 ? result.rows[0] : null;
};

const createAuditLog = async (logData) => {
  const query = `
    INSERT INTO audit_logs (
      user_id, action, table_name, record_id, old_values,
      new_values, changed_fields, branch_id, ip_address, user_agent, timestamp
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING *
  `;
  const values = [
    logData.user_id || null,
    logData.action_type,
    logData.table_name || null,
    logData.record_id || null,
    logData.old_values || null,
    logData.new_values || null,
    logData.changed_fields || null,
    logData.branch_id || null,
    logData.ip_address || null,
    logData.user_agent || null,
    logData.action_timestamp || new Date()
  ];
  const result = await pool.query(query, values);
  return result.rows[0];
};

const countAuditLogs = async (filters = {}) => {
  let query = `SELECT COUNT(*) as total FROM audit_logs WHERE 1=1`;
  const params = [];
  let paramIndex = 1;

  if (filters.user_id) {
    query += ` AND user_id = $${paramIndex}`;
    params.push(filters.user_id);
    paramIndex++;
  }

  if (filters.action_type) {
    query += ` AND action = $${paramIndex}`;
    params.push(filters.action_type);
    paramIndex++;
  }

  if (filters.table_name) {
    query += ` AND table_name = $${paramIndex}`;
    params.push(filters.table_name);
    paramIndex++;
  }

  if (filters.record_id) {
    query += ` AND record_id = $${paramIndex}`;
    params.push(filters.record_id);
    paramIndex++;
  }

  if (filters.branch_id) {
    query += ` AND branch_id = $${paramIndex}`;
    params.push(filters.branch_id);
    paramIndex++;
  }

  if (filters.date_from) {
    query += ` AND timestamp >= $${paramIndex}`;
    params.push(filters.date_from);
    paramIndex++;
  }

  if (filters.date_to) {
    query += ` AND timestamp <= $${paramIndex}`;
    params.push(filters.date_to);
  }

  const result = await pool.query(query, params);
  return parseInt(result.rows[0].total);
};

/**
 * Calcula los cambios entre dos objetos para la auditoría
 * @param {Object} oldObj - Objeto anterior
 * @param {Object} newObj - Objeto nuevo
 * @param {Array} fieldsToTrack - Campos específicos a rastrear (opcional)
 * @returns {Object} - Objeto con los cambios detectados
 */
const calculateChanges = (oldObj, newObj, fieldsToTrack = null) => {
  const changes = {};

  // Campos sensibles que no deben registrarse
  const sensitiveFields = ['password', 'password_hash', 'token', 'secret'];

  const fields = fieldsToTrack || [...new Set([...Object.keys(oldObj || {}), ...Object.keys(newObj || {})])];

  for (const field of fields) {
    // Omitir campos sensibles
    if (sensitiveFields.some(sf => field.toLowerCase().includes(sf))) {
      continue;
    }

    const oldValue = oldObj?.[field];
    const newValue = newObj?.[field];

    // Comparar valores (manejar null, undefined, y objetos)
    const oldStr = JSON.stringify(oldValue) || 'null';
    const newStr = JSON.stringify(newValue) || 'null';

    if (oldStr !== newStr) {
      changes[field] = {
        old: oldValue ?? null,
        new: newValue ?? null
      };
    }
  }

  return Object.keys(changes).length > 0 ? changes : null;
};

/**
 * Registra un evento de auditoría de forma simplificada
 * @param {Object} options - Opciones de auditoría
 */
const logAuditEvent = async ({
  user_id,
  action_type,
  table_name,
  record_id,
  old_values = null,
  new_values = null,
  changed_fields = null,
  branch_id = null,
  ip_address = null,
  user_agent = null,
  description = null
}) => {
  try {
    // Si hay descripción, agregarla a new_values
    const enhancedNewValues = new_values
      ? { ...new_values, _description: description }
      : (description ? { _description: description } : null);

    await createAuditLog({
      user_id,
      action_type,
      table_name,
      record_id: record_id != null ? Number(record_id) : null,
      old_values: old_values ? JSON.stringify(old_values) : null,
      new_values: enhancedNewValues ? JSON.stringify(enhancedNewValues) : null,
      changed_fields: changed_fields ? JSON.stringify(changed_fields) : null,
      branch_id,
      ip_address,
      user_agent
    });
    return true;
  } catch (error) {
    console.error('Error al registrar evento de auditoría:', error);
    // No lanzamos el error para no interrumpir la operación principal
    return false;
  }
};

/**
 * Tipos de acción predefinidos para auditoría
 */
const AUDIT_ACTIONS = {
  LOGIN: 'LOGIN',
  LOGOUT: 'LOGOUT',
  LOGIN_FAILED: 'LOGIN_FAILED',
  ACCOUNT_LOCKED: 'ACCOUNT_LOCKED',
  PASSWORD_CHANGE: 'PASSWORD_CHANGE',
  PASSWORD_EXPIRED: 'PASSWORD_EXPIRED',
  CREATE: 'CREATE',
  UPDATE: 'UPDATE',
  DELETE: 'DELETE',
  SETTING_CHANGE: 'SETTING_CHANGE',
  VIEW: 'VIEW',
  EXPORT: 'EXPORT'
};

module.exports = {
  getAllAuditLogs,
  getAuditLogById,
  createAuditLog,
  countAuditLogs,
  calculateChanges,
  logAuditEvent,
  AUDIT_ACTIONS
};
