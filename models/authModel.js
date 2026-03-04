const pool = require('../config/db');

/**
 * Buscar usuario por email con su rol y permisos
 * @param {string} email - Email del usuario
 * @returns {Promise<Object|null>} Usuario con sus datos, rol y permisos
 */
const findUserByEmail = async (email) => {
  const query = `
    SELECT
      u.user_id,
      u.role_id,
      u.branch_id,
      u.username,
      u.email,
      u.password_hash,
      u.first_name,
      u.last_name,
      u.phone,
      u.mobile,
      u.avatar_url,
      u.status,
      u.email_verified,
      u.last_login,
      u.profile,
      u.branches_access,
      u.commission_percentage,
      u.commission_config,
      r.role_name,
      r.role_description,
      r.role_level,
      COALESCE(
        json_agg(
          DISTINCT jsonb_build_object(
            'permission_id', p.permission_id,
            'permission_name', p.permission_name,
            'resource', p.resource,
            'action', p.action,
            'description', p.permission_description
          )
        ) FILTER (WHERE p.permission_id IS NOT NULL),
        '[]'
      ) AS permissions
    FROM users u
    JOIN roles r ON u.role_id = r.role_id
    LEFT JOIN roles_permissions rp ON r.role_id = rp.role_id AND rp.status = 'active'
    LEFT JOIN permissions p ON rp.permission_id = p.permission_id AND p.status = 'active'
    WHERE u.email = $1
      AND u.status = 'active'
      AND r.status = 'active'
    GROUP BY
      u.user_id, u.role_id, u.branch_id, u.username, u.email, u.password_hash,
      u.first_name, u.last_name, u.phone, u.mobile, u.avatar_url, u.status,
      u.email_verified, u.last_login, u.profile, u.branches_access,
      u.commission_percentage, u.commission_config,
      r.role_name, r.role_description, r.role_level
  `;

  const result = await pool.query(query, [email]);

  return result.rows.length > 0 ? result.rows[0] : null;
};

module.exports = {
  findUserByEmail
};
