const pool = require('../config/db');

const getAllUsers = async (filters = {}) => {
  let query = `
    SELECT
      u.*,
      r.role_name,
      r.role_description,
      b.branch_name
    FROM users u
    LEFT JOIN roles r ON u.role_id = r.role_id
    LEFT JOIN branches b ON u.branch_id = b.branch_id
    WHERE u.status != 'deleted'
  `;

  const params = [];
  let paramIndex = 1;

  // Filtro por status: si se especifica, filtrar por ese status
  // Si no se especifica, se muestran todos (excepto deleted)
  if (filters.status) {
    query += ` AND u.status = $${paramIndex}`;
    params.push(filters.status);
    paramIndex++;
  }

  if (filters.role_id) {
    query += ` AND u.role_id = $${paramIndex}`;
    params.push(filters.role_id);
    paramIndex++;
  }

  if (filters.branch_id) {
    query += ` AND u.branch_id = $${paramIndex}`;
    params.push(filters.branch_id);
    paramIndex++;
  }

  if (filters.search) {
    query += ` AND (u.first_name ILIKE $${paramIndex} OR u.last_name ILIKE $${paramIndex} OR u.email ILIKE $${paramIndex} OR u.username ILIKE $${paramIndex})`;
    params.push(`%${filters.search}%`);
    paramIndex++;
  }

  if (filters.is_active !== undefined) {
    // Transformar is_active booleano a status string (compatibilidad)
    const statusValue = filters.is_active ? 'active' : 'inactive';
    query += ` AND u.status = $${paramIndex}`;
    params.push(statusValue);
  }

  query += ` ORDER BY u.date_time_registration DESC`;

  const result = await pool.query(query, params);
  // Remover password_hash antes de enviar
  return result.rows.map(user => {
    const { password_hash, ...userWithoutPassword } = user;
    return userWithoutPassword;
  });
};

const getUserById = async (userId) => {
  const query = `
    SELECT
      u.*,
      r.role_name,
      r.role_description,
      b.branch_name
    FROM users u
    LEFT JOIN roles r ON u.role_id = r.role_id
    LEFT JOIN branches b ON u.branch_id = b.branch_id
    WHERE u.user_id = $1 AND u.status != 'deleted'
  `;

  const result = await pool.query(query, [userId]);
  if (result.rows.length > 0) {
    const { password_hash, ...userWithoutPassword } = result.rows[0];
    return userWithoutPassword;
  }
  return null;
};

const createUser = async (userData) => {
  const {
    role_id,
    branch_id,
    username,
    email,
    password_hash,
    first_name,
    last_name,
    phone,
    mobile,
    avatar_url,
    email_verified,
    profile,
    branches_access,
    commission_percentage,
    commission_config,
    user_id_registration,
    status
  } = userData;

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const insertQuery = `
      INSERT INTO users (
        role_id, branch_id, username, email, password_hash, first_name, last_name,
        phone, mobile, avatar_url, email_verified,
        profile, branches_access, commission_percentage, commission_config,
        user_id_registration, status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
      RETURNING *
    `;

    const values = [
      role_id,
      branch_id || null,
      username,
      email,
      password_hash,
      first_name,
      last_name,
      phone || null,
      mobile || null,
      avatar_url || null,
      email_verified || false,
      profile || null,
      branches_access || null,
      commission_percentage || null,
      commission_config || null,
      user_id_registration,
      status || 'active'
    ];

    const result = await client.query(insertQuery, values);
    const newUser = result.rows[0];

    // ✅ SINCRONIZACIÓN: Si es administrador de sede (role_id = 2) y tiene branch_id
    if (newUser.role_id === 2 && newUser.branch_id) {
      await client.query(`
        UPDATE branches
        SET
          administrator_id = $1,
          manager_name = $2,
          manager_phone = $3,
          user_id_modification = $4,
          date_time_modification = CURRENT_TIMESTAMP
        WHERE branch_id = $5
      `, [
        newUser.user_id,
        `${newUser.first_name} ${newUser.last_name}`,
        newUser.mobile || newUser.phone,
        user_id_registration,
        newUser.branch_id
      ]);

      // ✅ ACTIVAR administrador cuando se le asigna sede
      await client.query(`
        UPDATE users
        SET status = 'active'
        WHERE user_id = $1
      `, [newUser.user_id]);
    }

    await client.query('COMMIT');

    // Después de crear, obtener el usuario con branch_name incluido
    const selectQuery = `
      SELECT
        u.*,
        r.role_name,
        r.role_description,
        b.branch_name
      FROM users u
      LEFT JOIN roles r ON u.role_id = r.role_id
      LEFT JOIN branches b ON u.branch_id = b.branch_id
      WHERE u.user_id = $1
    `;

    const userResult = await pool.query(selectQuery, [newUser.user_id]);
    const { password_hash: _, ...userWithoutPassword } = userResult.rows[0];
    return userWithoutPassword;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

const updateUser = async (userId, userData) => {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const fields = [];
    const values = [];
    let paramIndex = 1;

    // Lista de campos permitidos para actualizar (excluyendo password_hash)
    const allowedFields = [
      'role_id', 'branch_id', 'username', 'email', 'first_name', 'last_name',
      'phone', 'mobile', 'avatar_url', 'email_verified',
      'profile', 'branches_access', 'commission_percentage',
      'commission_config', 'status'
    ];

    allowedFields.forEach((field) => {
      if (userData[field] !== undefined) {
        fields.push(`${field} = $${paramIndex}`);
        values.push(userData[field]);
        paramIndex++;
      }
    });

    if (fields.length === 0) {
      throw new Error('No hay campos para actualizar');
    }

    fields.push(`user_id_modification = $${paramIndex}`);
    values.push(userData.user_id_modification);
    paramIndex++;

    fields.push(`date_time_modification = CURRENT_TIMESTAMP`);

    values.push(userId);

    const updateQuery = `
      UPDATE users SET ${fields.join(', ')}
      WHERE user_id = $${paramIndex} AND status != 'deleted'
      RETURNING *
    `;

    const result = await client.query(updateQuery, values);

    if (result.rows.length > 0) {
      const updatedUser = result.rows[0];

      // ✅ SINCRONIZACIÓN: Si es administrador de sede (role_id = 2)
      if (updatedUser.role_id === 2) {
        // Primero: Limpiar administrator_id de cualquier sede anterior que tenga a este usuario
        // Esto es necesario cuando se desasigna un administrador o se cambia de sede
        await client.query(`
          UPDATE branches
          SET
            administrator_id = NULL,
            manager_name = NULL,
            manager_phone = NULL,
            user_id_modification = $1,
            date_time_modification = CURRENT_TIMESTAMP
          WHERE administrator_id = $2 AND (branch_id != $3 OR $3 IS NULL)
        `, [
          userData.user_id_modification,
          updatedUser.user_id,
          updatedUser.branch_id
        ]);

        if (updatedUser.branch_id) {
          // Si tiene branch_id: sincronizar con branches
          await client.query(`
            UPDATE branches
            SET
              administrator_id = $1,
              manager_name = $2,
              manager_phone = $3,
              user_id_modification = $4,
              date_time_modification = CURRENT_TIMESTAMP
            WHERE branch_id = $5
          `, [
            updatedUser.user_id,
            `${updatedUser.first_name} ${updatedUser.last_name}`,
            updatedUser.mobile || updatedUser.phone,
            userData.user_id_modification,
            updatedUser.branch_id
          ]);
        }
        // NOTA: Ya no se sobrescribe el status automáticamente.
        // El status se respeta tal como lo establece el usuario.
      }

      await client.query('COMMIT');

      // Después de actualizar, obtener el usuario con branch_name incluido
      const selectQuery = `
        SELECT
          u.*,
          r.role_name,
          r.role_description,
          b.branch_name
        FROM users u
        LEFT JOIN roles r ON u.role_id = r.role_id
        LEFT JOIN branches b ON u.branch_id = b.branch_id
        WHERE u.user_id = $1 AND u.status != 'deleted'
      `;

      const userResult = await pool.query(selectQuery, [userId]);
      const { password_hash, ...userWithoutPassword } = userResult.rows[0];
      return userWithoutPassword;
    }

    await client.query('COMMIT');
    return null;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

const updatePassword = async (userId, newPasswordHash, modifiedBy) => {
  const query = `
    UPDATE users SET
      password_hash = $1,
      password_changed_at = CURRENT_TIMESTAMP,
      must_change_password = false,
      user_id_modification = $2,
      date_time_modification = CURRENT_TIMESTAMP
    WHERE user_id = $3 AND status != 'deleted'
    RETURNING user_id
  `;

  const result = await pool.query(query, [newPasswordHash, modifiedBy, userId]);
  return result.rowCount > 0;
};

const deleteUser = async (userId, modifiedBy) => {
  const query = `
    UPDATE users SET
      status = 'deleted',
      user_id_modification = $1,
      date_time_modification = CURRENT_TIMESTAMP
    WHERE user_id = $2 AND status != 'deleted'
    RETURNING user_id
  `;

  const result = await pool.query(query, [modifiedBy, userId]);
  return result.rowCount > 0;
};

const getAvailableAdministrators = async (excludeBranchId = null) => {
  const selectFields = `
      u.user_id,
      u.username,
      u.first_name,
      u.last_name,
      CONCAT(u.first_name, ' ', u.last_name) as full_name,
      u.email,
      u.mobile,
      u.phone
  `;

  let query;
  let params;

  if (excludeBranchId) {
    // Modo edición: admins sin sede + el admin actual de esta sede
    query = `
      SELECT ${selectFields}
      FROM users u
      WHERE u.role_id = 2
        AND u.status = 'active'
        AND (u.branch_id IS NULL OR u.branch_id = $1)
      ORDER BY u.first_name, u.last_name
    `;
    params = [excludeBranchId];
  } else {
    // Modo creación: solo admins activos sin sede asignada
    query = `
      SELECT ${selectFields}
      FROM users u
      WHERE u.role_id = 2
        AND u.status = 'active'
        AND u.branch_id IS NULL
      ORDER BY u.first_name, u.last_name
    `;
    params = [];
  }

  const result = await pool.query(query, params);
  return result.rows;
};

module.exports = {
  getAllUsers,
  getUserById,
  createUser,
  updateUser,
  updatePassword,
  deleteUser,
  getAvailableAdministrators
};
