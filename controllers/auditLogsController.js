const {
  getAllAuditLogs,
  getAuditLogById,
  countAuditLogs,
  AUDIT_ACTIONS
} = require('../models/auditLogsModel');
const pool = require('../config/db');

const getAuditLogs = async (req, res) => {
  try {
    const { user_id, action_type, table_name, date_from, date_to, search, page = 1, limit = 50 } = req.query;

    // Si es admin (no super_admin), solo puede ver logs de su sede
    const branchFilter = req.user.role_id === 2 ? req.user.branch_id : null;

    const filters = {
      user_id: user_id ? parseInt(user_id) : null,
      action_type,
      table_name,
      date_from,
      date_to,
      limit: Math.min(parseInt(limit), 100), // Máximo 100 registros
      offset: (parseInt(page) - 1) * parseInt(limit)
    };

    const [logs, total] = await Promise.all([getAllAuditLogs(filters), countAuditLogs(filters)]);

    res.json({
      success: true,
      data: logs,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Error al obtener logs de auditoría:', error);
    res.status(500).json({ success: false, error: 'Error al obtener logs de auditoría' });
  }
};

const getAuditLog = async (req, res) => {
  try {
    const { id } = req.params;
    const log = await getAuditLogById(parseInt(id));

    if (!log) {
      return res.status(404).json({ success: false, error: 'Log de auditoría no encontrado' });
    }

    res.json({ success: true, data: log });
  } catch (error) {
    console.error('Error al obtener log de auditoría:', error);
    res.status(500).json({ success: false, error: 'Error al obtener log de auditoría' });
  }
};

/**
 * Obtiene estadísticas de auditoría
 * GET /api/audit-logs/stats
 */
const getAuditStats = async (req, res) => {
  try {
    const { date_from, date_to } = req.query;

    let whereClause = 'WHERE 1=1';
    const params = [];
    let paramIndex = 1;

    if (date_from) {
      whereClause += ` AND action_timestamp >= $${paramIndex}`;
      params.push(date_from);
      paramIndex++;
    }

    if (date_to) {
      whereClause += ` AND action_timestamp <= $${paramIndex}`;
      params.push(date_to);
      paramIndex++;
    }

    // Total de eventos por acción
    const actionStatsQuery = `
      SELECT action_type, COUNT(*) as count
      FROM audit_logs
      ${whereClause}
      GROUP BY action_type
      ORDER BY count DESC
    `;
    const actionStats = await pool.query(actionStatsQuery, params);

    // Total de eventos por tabla/entidad
    const entityStatsQuery = `
      SELECT table_name, COUNT(*) as count
      FROM audit_logs
      ${whereClause}
      GROUP BY table_name
      ORDER BY count DESC
    `;
    const entityStats = await pool.query(entityStatsQuery, params);

    // Top usuarios más activos
    const userStatsQuery = `
      SELECT al.user_id, u.email as user_email, COUNT(*) as count
      FROM audit_logs al
      LEFT JOIN users u ON al.user_id = u.user_id
      ${whereClause} AND al.user_id IS NOT NULL
      GROUP BY al.user_id, u.email
      ORDER BY count DESC
      LIMIT 10
    `;
    const userStats = await pool.query(userStatsQuery, params);

    // Total de eventos
    const totalQuery = `SELECT COUNT(*) as total FROM audit_logs ${whereClause}`;
    const totalResult = await pool.query(totalQuery, params);

    res.json({
      success: true,
      data: {
        total: parseInt(totalResult.rows[0]?.total || 0, 10),
        byAction: actionStats.rows,
        byEntity: entityStats.rows,
        topUsers: userStats.rows
      }
    });
  } catch (error) {
    console.error('Error al obtener estadísticas de auditoría:', error);
    res.status(500).json({ success: false, error: 'Error al obtener estadísticas de auditoría' });
  }
};

/**
 * Obtiene los tipos de acción disponibles
 * GET /api/audit-logs/actions
 */
const getAvailableActions = async (req, res) => {
  const actions = [
    { value: 'LOGIN', label: 'Inicio de sesión', description: 'Inicio de sesión de usuario' },
    { value: 'LOGOUT', label: 'Cierre de sesión', description: 'Cierre de sesión de usuario' },
    { value: 'LOGIN_FAILED', label: 'Login fallido', description: 'Intento de login fallido' },
    { value: 'ACCOUNT_LOCKED', label: 'Cuenta bloqueada', description: 'Bloqueo de cuenta por intentos fallidos' },
    { value: 'PASSWORD_CHANGE', label: 'Cambio de contraseña', description: 'Cambio de contraseña' },
    { value: 'CREATE', label: 'Crear', description: 'Creación de registros' },
    { value: 'UPDATE', label: 'Actualizar', description: 'Actualización de registros' },
    { value: 'DELETE', label: 'Eliminar', description: 'Eliminación de registros' },
    { value: 'SETTING_CHANGE', label: 'Cambio de configuración', description: 'Cambio en configuración del sistema' }
  ];

  res.json({ success: true, data: actions });
};

module.exports = {
  getAuditLogs,
  getAuditLog,
  getAuditStats,
  getAvailableActions
};
