const pool = require('../config/db');

// Roles
const getAllRoles = async () => {
  const query = `
    SELECT * FROM roles
    WHERE status = 'active'
    ORDER BY role_name ASC
  `;

  const result = await pool.query(query);
  return result.rows;
};

const getRoleById = async (roleId) => {
  const query = `
    SELECT * FROM roles
    WHERE role_id = $1 AND status = 'active'
  `;

  const result = await pool.query(query, [roleId]);
  return result.rows.length > 0 ? result.rows[0] : null;
};

const getRoleWithPermissions = async (roleId) => {
  const query = `
    SELECT
      r.*,
      COALESCE(
        json_agg(
          json_build_object(
            'permission_id', p.permission_id,
            'permission_name', p.permission_name,
            'permission_code', p.permission_code,
            'module', p.module,
            'description', p.description
          ) ORDER BY p.permission_name
        ) FILTER (WHERE p.permission_id IS NOT NULL),
        '[]'
      ) as permissions
    FROM roles r
    LEFT JOIN roles_permissions rp ON r.role_id = rp.role_id
    LEFT JOIN permissions p ON rp.permission_id = p.permission_id AND p.status = 'active'
    WHERE r.role_id = $1 AND r.status = 'active'
    GROUP BY r.role_id
  `;

  const result = await pool.query(query, [roleId]);
  return result.rows.length > 0 ? result.rows[0] : null;
};

const createRole = async (roleData, userId) => {
  const query = `
    INSERT INTO roles (
      role_name, role_code, description, user_id_registration
    ) VALUES ($1, $2, $3, $4)
    RETURNING *
  `;

  const values = [
    roleData.role_name,
    roleData.role_code || null,
    roleData.description || null,
    userId
  ];

  const result = await pool.query(query, values);
  return result.rows[0];
};

const updateRole = async (roleId, roleData, userId) => {
  const fields = [];
  const values = [];
  let paramIndex = 1;

  const allowedFields = ['role_name', 'role_code', 'description'];

  allowedFields.forEach((field) => {
    if (roleData[field] !== undefined) {
      fields.push(`${field} = $${paramIndex}`);
      values.push(roleData[field]);
      paramIndex++;
    }
  });

  if (fields.length === 0) {
    throw new Error('No hay campos para actualizar');
  }

  fields.push(`user_id_modification = $${paramIndex}`);
  values.push(userId);
  paramIndex++;

  fields.push(`date_time_modification = CURRENT_TIMESTAMP`);

  values.push(roleId);

  const query = `
    UPDATE roles SET ${fields.join(', ')}
    WHERE role_id = $${paramIndex} AND status = 'active'
    RETURNING *
  `;

  const result = await pool.query(query, values);
  return result.rows.length > 0 ? result.rows[0] : null;
};

const deleteRole = async (roleId, userId) => {
  const query = `
    UPDATE roles SET
      status = 'inactive',
      user_id_modification = $1,
      date_time_modification = CURRENT_TIMESTAMP
    WHERE role_id = $2 AND status = 'active'
    RETURNING role_id
  `;

  const result = await pool.query(query, [userId, roleId]);
  return result.rowCount > 0;
};

// Permissions
const getAllPermissions = async (filters = {}) => {
  let query = `
    SELECT * FROM permissions
    WHERE status = 'active'
  `;

  const params = [];
  let paramIndex = 1;

  if (filters.module) {
    query += ` AND module = $${paramIndex}`;
    params.push(filters.module);
    paramIndex++;
  }

  if (filters.search) {
    query += ` AND (permission_name ILIKE $${paramIndex} OR permission_code ILIKE $${paramIndex})`;
    params.push(`%${filters.search}%`);
    paramIndex++;
  }

  query += ` ORDER BY module ASC, permission_name ASC`;

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

const getPermissionById = async (permissionId) => {
  const query = `
    SELECT * FROM permissions
    WHERE permission_id = $1 AND status = 'active'
  `;

  const result = await pool.query(query, [permissionId]);
  return result.rows.length > 0 ? result.rows[0] : null;
};

const createPermission = async (permissionData, userId) => {
  const query = `
    INSERT INTO permissions (
      permission_name, permission_code, module, description, user_id_registration
    ) VALUES ($1, $2, $3, $4, $5)
    RETURNING *
  `;

  const values = [
    permissionData.permission_name,
    permissionData.permission_code || null,
    permissionData.module || null,
    permissionData.description || null,
    userId
  ];

  const result = await pool.query(query, values);
  return result.rows[0];
};

const updatePermission = async (permissionId, permissionData, userId) => {
  const fields = [];
  const values = [];
  let paramIndex = 1;

  const allowedFields = ['permission_name', 'permission_code', 'module', 'description'];

  allowedFields.forEach((field) => {
    if (permissionData[field] !== undefined) {
      fields.push(`${field} = $${paramIndex}`);
      values.push(permissionData[field]);
      paramIndex++;
    }
  });

  if (fields.length === 0) {
    throw new Error('No hay campos para actualizar');
  }

  fields.push(`user_id_modification = $${paramIndex}`);
  values.push(userId);
  paramIndex++;

  fields.push(`date_time_modification = CURRENT_TIMESTAMP`);

  values.push(permissionId);

  const query = `
    UPDATE permissions SET ${fields.join(', ')}
    WHERE permission_id = $${paramIndex} AND status = 'active'
    RETURNING *
  `;

  const result = await pool.query(query, values);
  return result.rows.length > 0 ? result.rows[0] : null;
};

const deletePermission = async (permissionId, userId) => {
  const query = `
    UPDATE permissions SET
      status = 'inactive',
      user_id_modification = $1,
      date_time_modification = CURRENT_TIMESTAMP
    WHERE permission_id = $2 AND status = 'active'
    RETURNING permission_id
  `;

  const result = await pool.query(query, [userId, permissionId]);
  return result.rowCount > 0;
};

const countPermissions = async (filters = {}) => {
  let query = `SELECT COUNT(*) as total FROM permissions WHERE status = 'active'`;
  const params = [];
  let paramIndex = 1;

  if (filters.module) {
    query += ` AND module = $${paramIndex}`;
    params.push(filters.module);
    paramIndex++;
  }

  if (filters.search) {
    query += ` AND (permission_name ILIKE $${paramIndex} OR permission_code ILIKE $${paramIndex})`;
    params.push(`%${filters.search}%`);
  }

  const result = await pool.query(query, params);
  return parseInt(result.rows[0].total);
};

// Roles-Permissions (asignación)
const assignPermissionToRole = async (roleId, permissionId) => {
  // Verificar si ya existe la asignación
  const checkQuery = `
    SELECT * FROM roles_permissions
    WHERE role_id = $1 AND permission_id = $2
  `;
  const checkResult = await pool.query(checkQuery, [roleId, permissionId]);

  if (checkResult.rows.length > 0) {
    return checkResult.rows[0];
  }

  const query = `
    INSERT INTO roles_permissions (role_id, permission_id)
    VALUES ($1, $2)
    RETURNING *
  `;

  const result = await pool.query(query, [roleId, permissionId]);
  return result.rows[0];
};

const removePermissionFromRole = async (roleId, permissionId) => {
  const query = `
    DELETE FROM roles_permissions
    WHERE role_id = $1 AND permission_id = $2
    RETURNING *
  `;

  const result = await pool.query(query, [roleId, permissionId]);
  return result.rowCount > 0;
};

const syncRolePermissions = async (roleId, permissionIds) => {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // Eliminar todas las asignaciones actuales
    await client.query('DELETE FROM roles_permissions WHERE role_id = $1', [roleId]);

    // Insertar las nuevas asignaciones
    if (permissionIds && permissionIds.length > 0) {
      const values = permissionIds.map((permId, index) =>
        `($1, $${index + 2})`
      ).join(', ');

      const insertQuery = `
        INSERT INTO roles_permissions (role_id, permission_id)
        VALUES ${values}
      `;

      await client.query(insertQuery, [roleId, ...permissionIds]);
    }

    await client.query('COMMIT');
    return true;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

module.exports = {
  getAllRoles,
  getRoleById,
  getRoleWithPermissions,
  createRole,
  updateRole,
  deleteRole,
  getAllPermissions,
  getPermissionById,
  createPermission,
  updatePermission,
  deletePermission,
  countPermissions,
  assignPermissionToRole,
  removePermissionFromRole,
  syncRolePermissions
};
