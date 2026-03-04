const pool = require('../config/db');

const getAllDentists = async (filters = {}, includeInactive = false) => {
  // Si includeInactive es true, mostrar activos y suspendidos (no eliminados)
  const statusFilter = includeInactive
    ? "d.status IN ('active', 'suspended') AND u.status IN ('active', 'suspended')"
    : "d.status = 'active' AND u.status = 'active'";

  let query = `
    SELECT
      d.*,
      u.first_name,
      u.last_name,
      u.first_name || ' ' || u.last_name as full_name,
      u.email,
      u.phone,
      u.mobile,
      u.avatar_url,
      u.status as user_status,
      u.branch_id,
      u.branches_access,
      s.specialty_name,
      b.branch_name
    FROM dentists d
    INNER JOIN users u ON d.user_id = u.user_id
    LEFT JOIN specialties s ON d.specialty_id = s.specialty_id
    LEFT JOIN branches b ON u.branch_id = b.branch_id
    WHERE ${statusFilter}
      AND u.role_id IN (3, 5)
  `;

  const params = [];
  let paramIndex = 1;

  if (filters.specialty_id) {
    // ✅ CORREGIDO: Filtrar por especialidades en dentist_specialties
    query += ` AND EXISTS (
      SELECT 1 FROM dentist_specialties ds
      WHERE ds.dentist_id = d.dentist_id
        AND ds.specialty_id = $${paramIndex}
        AND ds.status = 'active'
    )`;
    params.push(filters.specialty_id);
    paramIndex++;
  }

  if (filters.branch_id) {
    // ✅ CORREGIDO: Filtrar por sedes en dentist_schedules (donde el doctor tiene horarios configurados)
    query += ` AND EXISTS (
      SELECT 1 FROM dentist_schedules dsch
      WHERE dsch.dentist_id = d.dentist_id
        AND dsch.branch_id = $${paramIndex}
        AND (dsch.status = 'active' OR dsch.status IS NULL)
    )`;
    params.push(filters.branch_id);
    paramIndex++;
  }

  if (filters.is_active !== undefined) {
    // Transformar is_active booleano a status string
    const statusValue = filters.is_active ? 'active' : 'inactive';
    query += ` AND u.status = $${paramIndex}`;
    params.push(statusValue);
  }

  query += ` ORDER BY u.first_name ASC, u.last_name ASC`;

  const result = await pool.query(query, params);

  // Cargar especialidades y sedes (desde horarios) para cada dentista
  const dentistsWithDetails = await Promise.all(
    result.rows.map(async (dentist) => {
      // Cargar especialidades desde dentist_specialties
      const specialtiesResult = await pool.query(
        `SELECT
          ds.dentist_specialty_id,
          ds.specialty_id,
          s.specialty_name,
          ds.is_primary
        FROM dentist_specialties ds
        INNER JOIN specialties s ON ds.specialty_id = s.specialty_id
        WHERE ds.dentist_id = $1 AND ds.status = 'active'
        ORDER BY ds.is_primary DESC, s.specialty_name ASC`,
        [dentist.dentist_id]
      );

      // Cargar sedes únicas desde dentist_schedules (donde el doctor tiene horarios)
      const branchesResult = await pool.query(
        `SELECT DISTINCT dsch.branch_id
        FROM dentist_schedules dsch
        WHERE dsch.dentist_id = $1
          AND (dsch.status = 'active' OR dsch.status IS NULL)
        ORDER BY dsch.branch_id`,
        [dentist.dentist_id]
      );

      // Extraer array de IDs de sedes
      const scheduleBranches = branchesResult.rows.map(row => row.branch_id);

      return {
        ...dentist,
        specialties: specialtiesResult.rows,
        // Sedes donde el doctor tiene horarios configurados
        schedule_branches: scheduleBranches
      };
    })
  );

  return dentistsWithDetails;
};

const getDentistById = async (dentistId, includeInactive = false) => {
  // Para ver/editar un dentista específico, incluir también suspendidos (igual que getAllDentists)
  const statusFilter = includeInactive
    ? ''
    : "AND d.status IN ('active', 'suspended') AND u.status IN ('active', 'suspended')";

  const dentistQuery = `
    SELECT
      d.*,
      u.first_name,
      u.last_name,
      u.first_name || ' ' || u.last_name as full_name,
      u.email,
      u.phone,
      u.mobile,
      u.avatar_url,
      u.profile,
      u.status as user_status,
      u.branch_id,
      u.branches_access,
      s.specialty_name,
      b.branch_name
    FROM dentists d
    INNER JOIN users u ON d.user_id = u.user_id
    LEFT JOIN specialties s ON d.specialty_id = s.specialty_id
    LEFT JOIN branches b ON u.branch_id = b.branch_id
    WHERE d.dentist_id = $1
      ${statusFilter}
      AND u.role_id = 3
  `;

  const schedulesQuery = `
    SELECT
      ds.*,
      b.branch_name
    FROM dentist_schedules ds
    INNER JOIN branches b ON ds.branch_id = b.branch_id
    WHERE ds.dentist_id = $1 AND (ds.status = 'active' OR ds.status IS NULL)
    ORDER BY ds.day_of_week ASC, ds.start_time ASC
  `;

  // Query para obtener las especialidades del dentista
  const specialtiesQuery = `
    SELECT
      ds.dentist_specialty_id,
      ds.specialty_id,
      s.specialty_name,
      ds.is_primary
    FROM dentist_specialties ds
    INNER JOIN specialties s ON ds.specialty_id = s.specialty_id
    WHERE ds.dentist_id = $1 AND ds.status = 'active'
    ORDER BY ds.is_primary DESC, s.specialty_name ASC
  `;

  // Query para obtener las sedes asignadas con detalles
  const branchesQuery = `
    SELECT
      b.branch_id,
      b.branch_name,
      b.address,
      b.city,
      b.phone
    FROM branches b
    WHERE b.branch_id = ANY(
      SELECT UNNEST(branches_access)
      FROM users
      WHERE user_id = (SELECT user_id FROM dentists WHERE dentist_id = $1)
    )
    AND b.status = 'active'
    ORDER BY b.branch_name ASC
  `;

  const [dentistResult, schedulesResult, specialtiesResult, branchesResult] = await Promise.all([
    pool.query(dentistQuery, [dentistId]),
    pool.query(schedulesQuery, [dentistId]),
    pool.query(specialtiesQuery, [dentistId]),
    pool.query(branchesQuery, [dentistId])
  ]);

  if (dentistResult.rows.length === 0) {
    return null;
  }

  return {
    ...dentistResult.rows[0],
    schedules: schedulesResult.rows,
    specialties: specialtiesResult.rows,
    assigned_branches: branchesResult.rows
  };
};

const createDentist = async (dentistData) => {
  const {
    user_id,
    specialty_id,
    professional_license,
    license_country,
    license_expiry_date,
    bio,
    years_experience,
    consultation_fee,
    user_id_registration
  } = dentistData;

  const query = `
    INSERT INTO dentists (
      user_id, specialty_id, professional_license, license_country,
      license_expiry_date, bio, years_experience, consultation_fee,
      user_id_registration
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    RETURNING *
  `;

  const values = [
    user_id,
    specialty_id || null,
    professional_license,
    license_country || 'Perú',
    license_expiry_date || null,
    bio || null,
    years_experience || null,
    consultation_fee || null,
    user_id_registration
  ];

  const result = await pool.query(query, values);
  return result.rows[0];
};

const updateDentist = async (dentistId, dentistData) => {
  const {
    specialty_id,
    professional_license,
    license_country,
    license_expiry_date,
    bio,
    years_experience,
    consultation_fee,
    user_id_modification
  } = dentistData;

  const query = `
    UPDATE dentists SET
      specialty_id = COALESCE($1, specialty_id),
      professional_license = COALESCE($2, professional_license),
      license_country = COALESCE($3, license_country),
      license_expiry_date = COALESCE($4, license_expiry_date),
      bio = COALESCE($5, bio),
      years_experience = COALESCE($6, years_experience),
      consultation_fee = COALESCE($7, consultation_fee),
      user_id_modification = $8,
      date_time_modification = CURRENT_TIMESTAMP
    WHERE dentist_id = $9 AND status = 'active'
    RETURNING *
  `;

  const values = [
    specialty_id,
    professional_license,
    license_country,
    license_expiry_date,
    bio,
    years_experience,
    consultation_fee,
    user_id_modification,
    dentistId
  ];

  const result = await pool.query(query, values);
  return result.rows.length > 0 ? result.rows[0] : null;
};

const deleteDentist = async (dentistId, userId) => {
  const query = `
    UPDATE dentists SET
      status = 'inactive',
      user_id_modification = $1,
      date_time_modification = CURRENT_TIMESTAMP
    WHERE dentist_id = $2 AND status = 'active'
    RETURNING dentist_id
  `;

  const result = await pool.query(query, [userId, dentistId]);
  return result.rowCount > 0;
};

// Horarios del dentista
const addDentistSchedule = async (scheduleData, userId) => {
  const {
    dentist_id,
    branch_id,
    day_of_week,
    start_time,
    end_time,
    slot_duration,
    is_available
  } = scheduleData;

  const query = `
    INSERT INTO dentist_schedules (
      dentist_id, branch_id, day_of_week, start_time, end_time,
      slot_duration, is_available, user_id_registration
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    RETURNING *
  `;

  const values = [
    dentist_id,
    branch_id,
    day_of_week,
    start_time,
    end_time,
    slot_duration || 30,
    is_available !== undefined ? is_available : true,
    userId
  ];

  const result = await pool.query(query, values);
  return result.rows[0];
};

const updateDentistSchedule = async (scheduleId, scheduleData, userId) => {
  const {
    day_of_week,
    start_time,
    end_time,
    slot_duration,
    is_available
  } = scheduleData;

  const query = `
    UPDATE dentist_schedules SET
      day_of_week = COALESCE($1, day_of_week),
      start_time = COALESCE($2, start_time),
      end_time = COALESCE($3, end_time),
      slot_duration = COALESCE($4, slot_duration),
      is_available = COALESCE($5, is_available),
      user_id_modification = $6,
      date_time_modification = CURRENT_TIMESTAMP
    WHERE schedule_id = $7 AND status = 'active'
    RETURNING *
  `;

  const values = [
    day_of_week,
    start_time,
    end_time,
    slot_duration,
    is_available,
    userId,
    scheduleId
  ];

  const result = await pool.query(query, values);
  return result.rows.length > 0 ? result.rows[0] : null;
};

const deleteDentistSchedule = async (scheduleId, userId) => {
  const query = `
    UPDATE dentist_schedules SET
      status = 'inactive',
      user_id_modification = $1,
      date_time_modification = CURRENT_TIMESTAMP
    WHERE schedule_id = $2 AND status = 'active'
    RETURNING schedule_id
  `;

  const result = await pool.query(query, [userId, scheduleId]);
  return result.rowCount > 0;
};

// Crear múltiples horarios de una sola vez (útil para configuración inicial)
const addBulkDentistSchedules = async (schedulesData, userId) => {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const insertedSchedules = [];

    for (const scheduleData of schedulesData) {
      const {
        dentist_id,
        branch_id,
        day_of_week,
        start_time,
        end_time,
        slot_duration,
        is_available
      } = scheduleData;

      const query = `
        INSERT INTO dentist_schedules (
          dentist_id, branch_id, day_of_week, start_time, end_time,
          slot_duration, is_available, user_id_registration
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING *
      `;

      const values = [
        dentist_id,
        branch_id,
        day_of_week,
        start_time,
        end_time,
        slot_duration || 30,
        is_available !== undefined ? is_available : true,
        userId
      ];

      const result = await client.query(query, values);
      insertedSchedules.push(result.rows[0]);
    }

    await client.query('COMMIT');
    return insertedSchedules;

  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

// Excepciones de horario
const getScheduleExceptions = async (dentistId, filters = {}) => {
  let query = `
    SELECT
      se.*,
      b.branch_name
    FROM schedule_exceptions se
    INNER JOIN branches b ON se.branch_id = b.branch_id
    WHERE se.dentist_id = $1 AND se.status = 'active'
  `;

  const params = [dentistId];
  let paramIndex = 2;

  if (filters.date_from) {
    query += ` AND se.exception_date >= $${paramIndex}`;
    params.push(filters.date_from);
    paramIndex++;
  }

  if (filters.date_to) {
    query += ` AND se.exception_date <= $${paramIndex}`;
    params.push(filters.date_to);
  }

  query += ` ORDER BY se.exception_date ASC`;

  const result = await pool.query(query, params);
  return result.rows;
};

const addScheduleException = async (exceptionData, userId) => {
  const {
    dentist_id,
    branch_id,
    exception_date,
    start_time,
    end_time,
    is_available,
    reason
  } = exceptionData;

  const query = `
    INSERT INTO schedule_exceptions (
      dentist_id, branch_id, exception_date, start_time, end_time,
      is_available, reason, user_id_registration
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    RETURNING *
  `;

  const values = [
    dentist_id,
    branch_id,
    exception_date,
    start_time || null,
    end_time || null,
    is_available || false,
    reason || null,
    userId
  ];

  const result = await pool.query(query, values);
  return result.rows[0];
};

// =====================================================
// Funciones para manejar especialidades de dentistas
// =====================================================

/**
 * Sincroniza las especialidades de un dentista
 * @param {number} dentistId - ID del dentista
 * @param {number[]} specialtyIds - Array de IDs de especialidades
 * @param {number} userId - ID del usuario que realiza la modificación
 * @param {object} client - Cliente de transacción opcional (para usar dentro de transacciones)
 */
const syncDentistSpecialties = async (dentistId, specialtyIds, userId, client = null) => {
  // Usar client de transacción si se proporciona, sino usar pool
  const dbClient = client || pool;

  // 1. Desactivar todas las especialidades actuales
  await dbClient.query(`
    UPDATE dentist_specialties
    SET status = 'inactive',
        user_id_modification = $1,
        date_time_modification = CURRENT_TIMESTAMP
    WHERE dentist_id = $2 AND status = 'active'
  `, [userId, dentistId]);

  // 2. Si no hay especialidades, terminar aquí
  if (!specialtyIds || specialtyIds.length === 0) {
    return [];
  }

  // 3. Insertar o reactivar las nuevas especialidades
  const results = [];
  for (let i = 0; i < specialtyIds.length; i++) {
    const specialtyId = specialtyIds[i];
    const isPrimary = i === 0; // La primera es la primaria

    // Intentar reactivar si existe, sino crear nueva
    const result = await dbClient.query(`
      INSERT INTO dentist_specialties (
        dentist_id, specialty_id, is_primary, user_id_registration, status
      ) VALUES ($1, $2, $3, $4, 'active')
      ON CONFLICT (dentist_id, specialty_id)
      DO UPDATE SET
        status = 'active',
        is_primary = EXCLUDED.is_primary,
        user_id_modification = EXCLUDED.user_id_registration,
        date_time_modification = CURRENT_TIMESTAMP
      RETURNING *
    `, [dentistId, specialtyId, isPrimary, userId]);

    results.push(result.rows[0]);
  }

  return results;
};

/**
 * Obtiene las especialidades de un dentista
 * @param {number} dentistId - ID del dentista
 */
const getDentistSpecialties = async (dentistId) => {
  const query = `
    SELECT
      ds.dentist_specialty_id,
      ds.specialty_id,
      s.specialty_name,
      ds.is_primary
    FROM dentist_specialties ds
    INNER JOIN specialties s ON ds.specialty_id = s.specialty_id
    WHERE ds.dentist_id = $1 AND ds.status = 'active'
    ORDER BY ds.is_primary DESC, s.specialty_name ASC
  `;

  const result = await pool.query(query, [dentistId]);
  return result.rows;
};

const deleteScheduleException = async (exceptionId, userId) => {
  const query = `
    UPDATE schedule_exceptions SET
      status = 'inactive',
      user_id_modification = $1,
      date_time_modification = CURRENT_TIMESTAMP
    WHERE exception_id = $2 AND status = 'active'
    RETURNING exception_id
  `;

  const result = await pool.query(query, [userId, exceptionId]);
  return result.rowCount > 0;
};

/**
 * Buscar dentista por COP (professional_license)
 * @param {string} cop - Número de colegiatura del odontólogo
 * @returns {Promise<Object|null>} Dentista encontrado o null
 */
const getDentistByCop = async (cop) => {
  // Normalizar el COP (remover espacios y convertir a mayúsculas)
  const normalizedCop = cop.trim().toUpperCase();

  const query = `
    SELECT
      d.dentist_id,
      d.professional_license as cop,
      u.first_name,
      u.last_name,
      u.email,
      u.phone,
      u.mobile,
      u.branch_id,
      b.branch_name,
      s.specialty_name
    FROM dentists d
    INNER JOIN users u ON d.user_id = u.user_id
    LEFT JOIN specialties s ON d.specialty_id = s.specialty_id
    LEFT JOIN branches b ON u.branch_id = b.branch_id
    WHERE UPPER(REPLACE(d.professional_license, ' ', '')) = REPLACE($1, ' ', '')
      AND d.status = 'active'
      AND u.status = 'active'
    LIMIT 1
  `;

  const result = await pool.query(query, [normalizedCop]);
  return result.rows.length > 0 ? result.rows[0] : null;
};

module.exports = {
  getAllDentists,
  getDentistById,
  getDentistByCop,
  createDentist,
  updateDentist,
  deleteDentist,
  addDentistSchedule,
  updateDentistSchedule,
  deleteDentistSchedule,
  addBulkDentistSchedules,
  getScheduleExceptions,
  addScheduleException,
  deleteScheduleException,
  syncDentistSpecialties,
  getDentistSpecialties
};
