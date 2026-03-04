const pool = require('../config/db');

const getAllBranches = async (filters = {}) => {
  let query = `
    SELECT b.*, c.company_name
    FROM branches b
    LEFT JOIN companies c ON b.company_id = c.company_id
    WHERE 1=1
  `;

  const params = [];
  let paramIndex = 1;

  // Filtro dinámico por status (default: active)
  if (filters.status !== undefined) {
    query += ` AND b.status = $${paramIndex}`;
    params.push(filters.status);
    paramIndex++;
  } else {
    query += ` AND b.status = $${paramIndex}`;
    params.push('active');
    paramIndex++;
  }

  if (filters.company_id) {
    query += ` AND b.company_id = $${paramIndex}`;
    params.push(filters.company_id);
    paramIndex++;
  }

  if (filters.search) {
    query += ` AND (b.branch_name ILIKE $${paramIndex} OR b.city ILIKE $${paramIndex} OR b.department ILIKE $${paramIndex})`;
    params.push(`%${filters.search}%`);
    paramIndex++;
  }

  query += ` ORDER BY b.branch_name ASC`;

  const result = await pool.query(query, params);
  return result.rows;
};

const getBranchById = async (branchId) => {
  const query = `
    SELECT b.*, c.company_name
    FROM branches b
    LEFT JOIN companies c ON b.company_id = c.company_id
    WHERE b.branch_id = $1 AND b.status = 'active'
  `;

  const result = await pool.query(query, [branchId]);
  return result.rows.length > 0 ? result.rows[0] : null;
};

const createBranch = async (branchData) => {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const {
      company_id,
      branch_name,
      branch_code,
      phone,
      email,
      address,
      city,
      state,
      country,
      postal_code,
      latitude,
      longitude,
      is_main_office,
      administrator_id,
      mobile,
      manager_name,
      manager_phone,
      opening_hours,
      department,
      notes,
      configuration,
      user_id_registration
    } = branchData;

    // company_id es opcional (nullable)
    const finalCompanyId = company_id || null;

    // Si se asignó un administrador, obtener sus datos
    let finalManagerName = manager_name;
    let finalManagerPhone = manager_phone;

    if (administrator_id) {
      const adminData = await client.query(
        `SELECT first_name, last_name, mobile, phone FROM users WHERE user_id = $1`,
        [administrator_id]
      );

      if (adminData.rows.length > 0) {
        const admin = adminData.rows[0];
        finalManagerName = `${admin.first_name} ${admin.last_name}`;
        finalManagerPhone = admin.mobile || admin.phone;
      }
    }

    const query = `
      INSERT INTO branches (
        company_id, branch_name, branch_code, phone, email, address, city, state,
        country, postal_code, latitude, longitude, is_main_office, administrator_id,
        mobile, manager_name, manager_phone, opening_hours, department, notes,
        configuration, user_id_registration
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22)
      RETURNING *
    `;

    const values = [
      finalCompanyId,
      branch_name,
      branch_code || null,
      phone || null,
      email || null,
      address || null,
      city || null,
      state || null,
      country || 'Peru',
      postal_code || null,
      latitude || null,
      longitude || null,
      is_main_office || false,
      administrator_id || null,
      mobile || null,
      finalManagerName || null,
      finalManagerPhone || null,
      opening_hours || null,
      department || null,
      notes || null,
      configuration ? JSON.stringify(configuration) : null,
      user_id_registration
    ];

    const result = await client.query(query, values);
    const newBranch = result.rows[0];

    // ✅ SINCRONIZACIÓN: Actualizar branch_id en la tabla users
    if (administrator_id) {
      await client.query(
        `UPDATE users
         SET branch_id = $1,
             status = 'active',
             user_id_modification = $2,
             date_time_modification = CURRENT_TIMESTAMP
         WHERE user_id = $3`,
        [newBranch.branch_id, user_id_registration, administrator_id]
      );
    }

    await client.query('COMMIT');
    return newBranch;

  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

const updateBranch = async (branchId, branchData) => {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const {
      company_id,
      branch_name,
      branch_code,
      phone,
      email,
      address,
      city,
      state,
      country,
      postal_code,
      latitude,
      longitude,
      is_main_office,
      administrator_id,
      mobile,
      manager_name,
      manager_phone,
      opening_hours,
      department,
      notes,
      configuration,
      user_id_modification
    } = branchData;

    // Obtener el administrator_id anterior
    const previousBranch = await client.query(
      `SELECT administrator_id FROM branches WHERE branch_id = $1`,
      [branchId]
    );

    const previousAdministratorId = previousBranch.rows[0]?.administrator_id;

    // Si se asignó un nuevo administrador, obtener sus datos
    let finalManagerName = manager_name;
    let finalManagerPhone = manager_phone;
    let finalAdministratorId = administrator_id;

    if (administrator_id !== undefined) {
      if (administrator_id) {
        const adminData = await client.query(
          `SELECT first_name, last_name, mobile, phone FROM users WHERE user_id = $1`,
          [administrator_id]
        );

        if (adminData.rows.length > 0) {
          const admin = adminData.rows[0];
          finalManagerName = `${admin.first_name} ${admin.last_name}`;
          finalManagerPhone = admin.mobile || admin.phone;
        }
      } else {
        // Si se está removiendo el administrador
        finalManagerName = null;
        finalManagerPhone = null;
        finalAdministratorId = null;
      }
    }

    const query = `
      UPDATE branches SET
        company_id = COALESCE($1, company_id),
        branch_name = COALESCE($2, branch_name),
        branch_code = COALESCE($3, branch_code),
        phone = COALESCE($4, phone),
        email = COALESCE($5, email),
        address = COALESCE($6, address),
        city = COALESCE($7, city),
        state = COALESCE($8, state),
        country = COALESCE($9, country),
        postal_code = COALESCE($10, postal_code),
        latitude = COALESCE($11, latitude),
        longitude = COALESCE($12, longitude),
        is_main_office = COALESCE($13, is_main_office),
        administrator_id = $14,
        mobile = COALESCE($15, mobile),
        manager_name = $16,
        manager_phone = $17,
        opening_hours = COALESCE($18, opening_hours),
        department = COALESCE($19, department),
        notes = COALESCE($20, notes),
        configuration = COALESCE($21, configuration),
        user_id_modification = $22,
        date_time_modification = CURRENT_TIMESTAMP
      WHERE branch_id = $23 AND status = 'active'
      RETURNING *
    `;

    const values = [
      company_id,
      branch_name,
      branch_code,
      phone,
      email,
      address,
      city,
      state,
      country,
      postal_code,
      latitude,
      longitude,
      is_main_office,
      finalAdministratorId !== undefined ? finalAdministratorId : administrator_id,
      mobile,
      finalManagerName !== undefined ? finalManagerName : manager_name,
      finalManagerPhone !== undefined ? finalManagerPhone : manager_phone,
      opening_hours,
      department,
      notes,
      configuration ? JSON.stringify(configuration) : null,
      user_id_modification,
      branchId
    ];

    const result = await client.query(query, values);
    const updatedBranch = result.rows[0];

    // ✅ SINCRONIZACIÓN: Actualizar branch_id en la tabla users

    // Si cambió el administrador
    if (administrator_id !== undefined && administrator_id !== previousAdministratorId) {
      // Remover branch_id del administrador anterior (sigue activo para reasignar)
      if (previousAdministratorId) {
        await client.query(
          `UPDATE users
           SET branch_id = NULL,
               user_id_modification = $1,
               date_time_modification = CURRENT_TIMESTAMP
           WHERE user_id = $2`,
          [user_id_modification, previousAdministratorId]
        );
      }

      // Asignar branch_id al nuevo administrador y ACTIVARLO
      if (administrator_id) {
        await client.query(
          `UPDATE users
           SET branch_id = $1,
               status = 'active',
               user_id_modification = $2,
               date_time_modification = CURRENT_TIMESTAMP
           WHERE user_id = $3`,
          [branchId, user_id_modification, administrator_id]
        );
      }
    }

    await client.query('COMMIT');
    return updatedBranch;

  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

const deleteBranch = async (branchId, userId) => {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // 1. Desasignar todos los usuarios vinculados a esta sede
    await client.query(
      `UPDATE users
       SET branch_id = NULL,
           user_id_modification = $1,
           date_time_modification = CURRENT_TIMESTAMP
       WHERE branch_id = $2`,
      [userId, branchId]
    );

    // 2. Soft-delete de la sede y limpiar administrator_id
    const result = await client.query(
      `UPDATE branches SET
        status = 'inactive',
        administrator_id = NULL,
        manager_name = NULL,
        manager_phone = NULL,
        user_id_modification = $1,
        date_time_modification = CURRENT_TIMESTAMP
      WHERE branch_id = $2 AND status = 'active'
      RETURNING branch_id`,
      [userId, branchId]
    );

    await client.query('COMMIT');
    return result.rowCount > 0;

  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

module.exports = {
  getAllBranches,
  getBranchById,
  createBranch,
  updateBranch,
  deleteBranch
};
