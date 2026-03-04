const {
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
  syncDentistSpecialties,
  getDentistSpecialties,
  getScheduleExceptions,
  addScheduleException,
  deleteScheduleException
} = require('../models/dentistsModel');

const { updateUser, createUser } = require('../models/usersModel');
const bcrypt = require('bcrypt');

/**
 * Crear médico completo: Usuario + Dentista + Horarios
 * Este endpoint maneja la creación atómica de todos los componentes
 */
const createCompleteDentist = async (req, res) => {
  console.log('🔵🔵🔵 [createCompleteDentist] ENDPOINT LLAMADO - Datos recibidos:', JSON.stringify(req.body, null, 2));

  const client = await require('../config/db').connect();

  try {
    await client.query('BEGIN');

    const {
      // Datos del usuario
      first_name,
      last_name,
      email,
      phone,
      mobile,
      dni,
      password,
      branch_id, // Ignorado para médicos (solo para compatibilidad con frontend)
      branches_access, // Array de IDs de sedes con acceso (REQUERIDO para médicos)

      // Datos del dentista
      specialty_id, // DEPRECATED: Usar specialties (array)
      specialties, // Array de IDs de especialidades (NUEVO)
      professional_license,
      license_country,
      license_expiry_date,
      bio,
      years_experience,
      consultation_fee,

      // Horarios (opcional)
      schedules
    } = req.body;

    // Compatibilidad: si viene specialty_id (singular), convertir a array
    const specialtyIds = specialties || (specialty_id ? [specialty_id] : []);

    // Validaciones requeridas
    if (!first_name || !last_name || !email || !dni || !professional_license) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        success: false,
        error: 'Faltan campos requeridos: first_name, last_name, email, dni, professional_license'
      });
    }

    // Validar que tenga al menos una sede asignada
    if (!branches_access || !Array.isArray(branches_access) || branches_access.length === 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        success: false,
        error: 'El médico debe tener al menos una sede asignada'
      });
    }

    // 1. Crear usuario con rol de médico (role_id = 3)
    const password_hash = await bcrypt.hash(password || dni, 10);

    // Crear profile JSONB con el DNI
    const profile = {
      dni: dni
    };

    const createUserQuery = `
      INSERT INTO users (
        username, email, password_hash, first_name, last_name,
        phone, mobile, profile, role_id, branch_id, branches_access,
        is_active, status, user_id_registration
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
      RETURNING user_id, username, email, first_name, last_name, phone, mobile,
                profile, role_id, branch_id, branches_access, is_active, status
    `;

    const username = email.split('@')[0]; // username basado en email

    // Parsear teléfonos: convertir strings vacíos a null
    const parsedPhone = phone && phone.trim() !== '' ? phone.trim() : null;
    const parsedMobile = mobile && mobile.trim() !== '' ? mobile.trim() : null;

    console.log('🔍 [createCompleteDentist] PHONE DEBUG:', {
      phone_original: phone,
      phone_type: typeof phone,
      phone_parsed: parsedPhone,
      mobile_original: mobile,
      mobile_type: typeof mobile,
      mobile_parsed: parsedMobile
    });

    const userValues = [
      username,
      email.toLowerCase(),
      password_hash,
      first_name,
      last_name,
      parsedPhone,
      parsedMobile,
      JSON.stringify(profile), // profile JSONB con dni
      3, // role_id para médico
      null, // ✅ branch_id = NULL para médicos (usan branches_access en su lugar)
      branches_access,
      true, // is_active
      'active', // status
      req.user.user_id // user_id_registration
    ];

    const userResult = await client.query(createUserQuery, userValues);
    const newUser = userResult.rows[0];

    // 2. Crear registro de dentista
    const createDentistQuery = `
      INSERT INTO dentists (
        user_id, specialty_id, professional_license, license_country,
        license_expiry_date, bio, years_experience, consultation_fee,
        user_id_registration
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *
    `;

    const dentistValues = [
      newUser.user_id,
      specialty_id || null,
      professional_license,
      license_country || 'Peru',
      license_expiry_date || null,
      bio || null,
      years_experience || null,
      consultation_fee || null,
      req.user.user_id
    ];

    const dentistResult = await client.query(createDentistQuery, dentistValues);
    const newDentist = dentistResult.rows[0];

    // 3. Sincronizar especialidades (usando la función del modelo con el client de la transacción)
    let createdSpecialties = [];
    if (specialtyIds && specialtyIds.length > 0) {
      createdSpecialties = await syncDentistSpecialties(
        newDentist.dentist_id,
        specialtyIds,
        req.user.user_id,
        client // ✅ Pasar el client para usar la misma transacción
      );
    }

    // 4. Crear horarios si se proporcionan
    let createdSchedules = [];
    if (schedules && Array.isArray(schedules) && schedules.length > 0) {
      const createScheduleQuery = `
        INSERT INTO dentist_schedules (
          dentist_id, branch_id, day_of_week, start_time, end_time,
          slot_duration, is_available, status, user_id_registration
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING *
      `;

      for (const schedule of schedules) {
        const scheduleValues = [
          newDentist.dentist_id,
          schedule.branch_id,
          schedule.day_of_week,
          schedule.start_time,
          schedule.end_time,
          30, // slot_duration por defecto
          schedule.is_active !== false, // Frontend envía is_active, se guarda en is_available
          'active', // Explícitamente establecer status como 'active'
          req.user.user_id
        ];

        const scheduleResult = await client.query(createScheduleQuery, scheduleValues);
        createdSchedules.push(scheduleResult.rows[0]);
      }
    }

    await client.query('COMMIT');

    // Respuesta con todos los datos creados
    res.status(201).json({
      success: true,
      message: 'Médico creado exitosamente',
      data: {
        user: newUser,
        dentist: newDentist,
        specialties: createdSpecialties,
        schedules: createdSchedules
      }
    });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ [DentistsController] Error al crear médico completo:', error);

    // Manejo de errores específicos
    if (error.code === '23505') {
      if (error.constraint?.includes('users_email_key')) {
        return res.status(409).json({
          success: false,
          error: 'Ya existe un usuario con ese email'
        });
      }
      if (error.constraint?.includes('users_dni_key')) {
        return res.status(409).json({
          success: false,
          error: 'Ya existe un usuario con ese DNI'
        });
      }
      return res.status(409).json({
        success: false,
        error: 'El usuario ya existe en el sistema'
      });
    }

    if (error.code === '23503') {
      // Identificar qué foreign key falló
      let errorMessage = 'Error de integridad referencial';

      if (error.constraint && error.constraint.includes('branch')) {
        errorMessage = 'Una o más sedes especificadas no existen';
      } else if (error.constraint && error.constraint.includes('specialty')) {
        errorMessage = 'Una o más especialidades especificadas no existen';
      } else if (error.constraint && error.constraint.includes('dentist')) {
        errorMessage = 'Error al sincronizar datos del dentista';
      }

      console.error('❌ [DentistsController] Error de FK:', {
        constraint: error.constraint,
        detail: error.detail,
        table: error.table
      });

      return res.status(400).json({
        success: false,
        error: errorMessage,
        detail: error.detail
      });
    }

    res.status(500).json({
      success: false,
      error: 'Error al crear médico',
      message: error.message
    });
  } finally {
    client.release();
  }
};

const getDentists = async (req, res) => {
  try {
    const { specialty_id, branch_id, is_active, include_inactive } = req.query;
    const filters = {
      specialty_id: specialty_id ? parseInt(specialty_id) : null,
      branch_id: branch_id ? parseInt(branch_id) : null,
      is_active: is_active !== undefined ? is_active === 'true' : undefined
    };

    // include_inactive=true para mostrar también dentistas suspendidos (para gestión)
    const includeInactive = include_inactive === 'true';
    const dentists = await getAllDentists(filters, includeInactive);

    res.json({
      success: true,
      data: dentists
    });
  } catch (error) {
    console.error('Error al obtener dentistas:', error);
    res.status(500).json({
      success: false,
      error: 'Error al obtener dentistas'
    });
  }
};

const getDentist = async (req, res) => {
  try {
    const { id } = req.params;
    const parsedId = parseInt(id);

    if (isNaN(parsedId)) {
      return res.status(400).json({
        success: false,
        error: 'ID de dentista inválido'
      });
    }

    const dentist = await getDentistById(parsedId);

    if (!dentist) {
      return res.status(404).json({
        success: false,
        error: 'Dentista no encontrado'
      });
    }

    res.json({
      success: true,
      data: dentist
    });
  } catch (error) {
    console.error('Error al obtener dentista:', error);
    res.status(500).json({
      success: false,
      error: 'Error al obtener dentista'
    });
  }
};

const createNewDentist = async (req, res) => {
  try {
    const dentistData = {
      ...req.body,
      user_id_registration: req.user.user_id
    };

    console.log('🔵 [DentistsController] Datos recibidos del frontend:', dentistData);

    if (!dentistData.user_id || !dentistData.professional_license) {
      console.log('❌ [DentistsController] Faltan campos requeridos');
      return res.status(400).json({
        success: false,
        error: 'Faltan campos requeridos'
      });
    }

    const newDentist = await createDentist(dentistData);

    console.log('✅ [DentistsController] Dentista creado exitosamente:', newDentist);

    res.status(201).json({
      success: true,
      message: 'Dentista creado exitosamente',
      data: newDentist
    });
  } catch (error) {
    console.error('❌ [DentistsController] Error al crear dentista:', error);

    if (error.code === '23505') {
      return res.status(409).json({
        success: false,
        error: 'Ya existe un dentista con ese usuario'
      });
    }

    res.status(500).json({
      success: false,
      error: 'Error al crear dentista'
    });
  }
};

/**
 * Actualiza un médico completo: Usuario + Dentista + Especialidades + Horarios
 * Este endpoint maneja la actualización atómica de todos los componentes
 */
const updateExistingDentist = async (req, res) => {
  console.log('🔵🔵🔵 [updateExistingDentist] ENDPOINT LLAMADO - Datos recibidos:', JSON.stringify(req.body, null, 2));

  const client = await require('../config/db').connect();

  try {
    await client.query('BEGIN');

    const { id } = req.params;
    const dentistId = parseInt(id);

    const {
      // Datos del usuario
      first_name,
      last_name,
      email,
      phone,
      mobile,
      dni,
      branches_access,
      status, // Estado del usuario (active, inactive, suspended)
      is_active, // Alternativa para estado

      // Datos del dentista
      specialty_id,
      specialties,
      professional_license,
      license_country,
      license_expiry_date,
      bio,
      years_experience,
      consultation_fee,

      // Horarios (opcional)
      schedules
    } = req.body;

    // Compatibilidad: si viene specialty_id (singular), convertir a array
    const specialtyIds = specialties || (specialty_id ? [specialty_id] : null);

    // 1. Obtener el dentista actual para verificar que existe y obtener user_id
    // Incluir todos los estados para permitir reactivar dentistas inactivos o suspendidos
    const dentistQuery = await client.query(
      `SELECT d.*, u.user_id FROM dentists d
       INNER JOIN users u ON d.user_id = u.user_id
       WHERE d.dentist_id = $1 AND d.status IN ('active', 'suspended', 'inactive')`,
      [dentistId]
    );

    if (dentistQuery.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({
        success: false,
        error: 'Dentista no encontrado'
      });
    }

    const currentDentist = dentistQuery.rows[0];
    const userId = currentDentist.user_id;

    console.log('📝 [updateExistingDentist] Dentista encontrado:', {
      dentistId,
      userId,
      currentDentist: currentDentist.first_name
    });

    // 2. Actualizar datos del usuario si se proporcionan
    const userUpdateFields = [];
    const userUpdateValues = [];
    let userParamIndex = 1;

    if (first_name !== undefined) {
      userUpdateFields.push(`first_name = $${userParamIndex++}`);
      userUpdateValues.push(first_name);
    }
    if (last_name !== undefined) {
      userUpdateFields.push(`last_name = $${userParamIndex++}`);
      userUpdateValues.push(last_name);
    }
    if (email !== undefined) {
      userUpdateFields.push(`email = $${userParamIndex++}`);
      userUpdateValues.push(email.toLowerCase());
    }
    if (phone !== undefined) {
      userUpdateFields.push(`phone = $${userParamIndex++}`);
      userUpdateValues.push(phone);
    }
    if (mobile !== undefined) {
      userUpdateFields.push(`mobile = $${userParamIndex++}`);
      userUpdateValues.push(mobile);
    }
    if (branches_access !== undefined && Array.isArray(branches_access)) {
      userUpdateFields.push(`branches_access = $${userParamIndex++}`);
      userUpdateValues.push(branches_access);
    }

    // Actualizar status si se proporciona
    if (status !== undefined) {
      userUpdateFields.push(`status = $${userParamIndex++}`);
      userUpdateValues.push(status);
    }

    // Actualizar DNI en profile si se proporciona
    if (dni !== undefined) {
      userUpdateFields.push(`profile = jsonb_set(COALESCE(profile, '{}'), '{dni}', $${userParamIndex++}::jsonb)`);
      userUpdateValues.push(JSON.stringify(dni));
    }

    if (userUpdateFields.length > 0) {
      userUpdateFields.push(`user_id_modification = $${userParamIndex++}`);
      userUpdateValues.push(req.user.user_id);
      userUpdateFields.push(`date_time_modification = CURRENT_TIMESTAMP`);

      const userUpdateQuery = `
        UPDATE users SET ${userUpdateFields.join(', ')}
        WHERE user_id = $${userParamIndex}
        RETURNING *
      `;
      userUpdateValues.push(userId);

      await client.query(userUpdateQuery, userUpdateValues);
      console.log('✅ [updateExistingDentist] Usuario actualizado');
    }

    // 3. Actualizar datos del dentista si se proporcionan
    const dentistUpdateFields = [];
    const dentistUpdateValues = [];
    let dentistParamIndex = 1;

    if (professional_license !== undefined) {
      dentistUpdateFields.push(`professional_license = $${dentistParamIndex++}`);
      dentistUpdateValues.push(professional_license);
    }
    if (license_country !== undefined) {
      dentistUpdateFields.push(`license_country = $${dentistParamIndex++}`);
      dentistUpdateValues.push(license_country);
    }
    if (license_expiry_date !== undefined) {
      dentistUpdateFields.push(`license_expiry_date = $${dentistParamIndex++}`);
      dentistUpdateValues.push(license_expiry_date);
    }
    if (bio !== undefined) {
      dentistUpdateFields.push(`bio = $${dentistParamIndex++}`);
      dentistUpdateValues.push(bio);
    }
    if (years_experience !== undefined) {
      dentistUpdateFields.push(`years_experience = $${dentistParamIndex++}`);
      dentistUpdateValues.push(years_experience);
    }
    if (consultation_fee !== undefined) {
      dentistUpdateFields.push(`consultation_fee = $${dentistParamIndex++}`);
      dentistUpdateValues.push(consultation_fee);
    }
    // También actualizar status en la tabla dentists (sincronizado con users)
    if (status !== undefined) {
      dentistUpdateFields.push(`status = $${dentistParamIndex++}`);
      dentistUpdateValues.push(status);
    }

    if (dentistUpdateFields.length > 0) {
      dentistUpdateFields.push(`user_id_modification = $${dentistParamIndex++}`);
      dentistUpdateValues.push(req.user.user_id);
      dentistUpdateFields.push(`date_time_modification = CURRENT_TIMESTAMP`);

      const dentistUpdateQuery = `
        UPDATE dentists SET ${dentistUpdateFields.join(', ')}
        WHERE dentist_id = $${dentistParamIndex}
        RETURNING *
      `;
      dentistUpdateValues.push(dentistId);

      await client.query(dentistUpdateQuery, dentistUpdateValues);
      console.log('✅ [updateExistingDentist] Dentista actualizado');
    }

    // 4. Sincronizar especialidades si se enviaron
    let updatedSpecialties = [];
    if (specialtyIds && specialtyIds.length > 0) {
      updatedSpecialties = await syncDentistSpecialties(
        dentistId,
        specialtyIds,
        req.user.user_id,
        client
      );
      console.log(`✅ [updateExistingDentist] ${updatedSpecialties.length} especialidades sincronizadas`);
    }

    // 5. Sincronizar horarios con UPSERT inteligente
    let updatedSchedules = [];
    if (schedules && Array.isArray(schedules) && schedules.length > 0) {
      // Desactivar TODOS los horarios primero (evita conflicto con trigger de solapamiento)
      await client.query(`
        UPDATE dentist_schedules SET
          status = 'inactive',
          user_id_modification = $1,
          date_time_modification = CURRENT_TIMESTAMP
        WHERE dentist_id = $2 AND status = 'active'
      `, [req.user.user_id, dentistId]);

      // UPSERT: insertar nuevos o reactivar/actualizar existentes
      for (const schedule of schedules) {
        const upsertQuery = `
          INSERT INTO dentist_schedules (
            dentist_id, branch_id, day_of_week, start_time, end_time,
            slot_duration, is_available, status, user_id_registration
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, 'active', $8)
          ON CONFLICT (dentist_id, branch_id, day_of_week, start_time)
          DO UPDATE SET
            end_time = EXCLUDED.end_time,
            slot_duration = EXCLUDED.slot_duration,
            is_available = EXCLUDED.is_available,
            status = 'active',
            user_id_modification = $8,
            date_time_modification = CURRENT_TIMESTAMP
          RETURNING *
        `;
        const result = await client.query(upsertQuery, [
          dentistId, schedule.branch_id, schedule.day_of_week,
          schedule.start_time, schedule.end_time,
          schedule.slot_duration || 30, schedule.is_active !== false,
          req.user.user_id
        ]);
        updatedSchedules.push(result.rows[0]);
      }

      console.log(`✅ [updateExistingDentist] ${updatedSchedules.length} horarios sincronizados`);
    }

    await client.query('COMMIT');

    // 6. Obtener el dentista actualizado con todos sus datos (incluir inactivos para retornar el estado actualizado)
    const updatedDentist = await getDentistById(dentistId, true);

    res.json({
      success: true,
      message: 'Médico actualizado exitosamente',
      data: updatedDentist
    });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ [updateExistingDentist] Error:', error);

    // Manejo de errores específicos
    if (error.code === '23505') {
      if (error.constraint?.includes('email')) {
        return res.status(409).json({
          success: false,
          error: 'Ya existe un usuario con ese email'
        });
      }
      return res.status(409).json({
        success: false,
        error: 'Conflicto de datos duplicados'
      });
    }

    if (error.code === '23503') {
      return res.status(400).json({
        success: false,
        error: 'Error de integridad referencial: verifique sedes y especialidades'
      });
    }

    res.status(500).json({
      success: false,
      error: 'Error al actualizar dentista',
      message: error.message
    });
  } finally {
    client.release();
  }
};

const deleteExistingDentist = async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await deleteDentist(parseInt(id), req.user.user_id);

    if (!deleted) {
      return res.status(404).json({
        success: false,
        error: 'Dentista no encontrado'
      });
    }

    res.json({
      success: true,
      message: 'Dentista eliminado exitosamente'
    });
  } catch (error) {
    console.error('Error al eliminar dentista:', error);
    res.status(500).json({
      success: false,
      error: 'Error al eliminar dentista'
    });
  }
};

// Horarios
const addSchedule = async (req, res) => {
  try {
    const { id } = req.params;
    const scheduleData = {
      ...req.body,
      dentist_id: parseInt(id)
    };

    if (!scheduleData.branch_id || scheduleData.day_of_week === undefined ||
        !scheduleData.start_time || !scheduleData.end_time) {
      return res.status(400).json({
        success: false,
        error: 'Faltan campos requeridos para el horario'
      });
    }

    const newSchedule = await addDentistSchedule(scheduleData, req.user.user_id);

    res.status(201).json({
      success: true,
      message: 'Horario agregado exitosamente',
      data: newSchedule
    });
  } catch (error) {
    console.error('Error al agregar horario:', error);
    res.status(500).json({
      success: false,
      error: 'Error al agregar horario'
    });
  }
};

const updateSchedule = async (req, res) => {
  try {
    const { scheduleId } = req.params;
    const updated = await updateDentistSchedule(parseInt(scheduleId), req.body, req.user.user_id);

    if (!updated) {
      return res.status(404).json({
        success: false,
        error: 'Horario no encontrado'
      });
    }

    res.json({
      success: true,
      message: 'Horario actualizado exitosamente',
      data: updated
    });
  } catch (error) {
    console.error('Error al actualizar horario:', error);
    res.status(500).json({
      success: false,
      error: 'Error al actualizar horario'
    });
  }
};

const deleteSchedule = async (req, res) => {
  try {
    const { scheduleId } = req.params;
    const deleted = await deleteDentistSchedule(parseInt(scheduleId), req.user.user_id);

    if (!deleted) {
      return res.status(404).json({
        success: false,
        error: 'Horario no encontrado'
      });
    }

    res.json({
      success: true,
      message: 'Horario eliminado exitosamente'
    });
  } catch (error) {
    console.error('Error al eliminar horario:', error);
    res.status(500).json({
      success: false,
      error: 'Error al eliminar horario'
    });
  }
};

// Excepciones
const getExceptions = async (req, res) => {
  try {
    const { id } = req.params;
    const { date_from, date_to } = req.query;

    const exceptions = await getScheduleExceptions(parseInt(id), { date_from, date_to });

    res.json({
      success: true,
      data: exceptions
    });
  } catch (error) {
    console.error('Error al obtener excepciones:', error);
    res.status(500).json({
      success: false,
      error: 'Error al obtener excepciones'
    });
  }
};

const addException = async (req, res) => {
  try {
    const { id } = req.params;
    const exceptionData = {
      ...req.body,
      dentist_id: parseInt(id)
    };

    if (!exceptionData.branch_id || !exceptionData.exception_date) {
      return res.status(400).json({
        success: false,
        error: 'Faltan campos requeridos para la excepción'
      });
    }

    const newException = await addScheduleException(exceptionData, req.user.user_id);

    res.status(201).json({
      success: true,
      message: 'Excepción agregada exitosamente',
      data: newException
    });
  } catch (error) {
    console.error('Error al agregar excepción:', error);
    res.status(500).json({
      success: false,
      error: 'Error al agregar excepción'
    });
  }
};

const deleteException = async (req, res) => {
  try {
    const { exceptionId } = req.params;
    const deleted = await deleteScheduleException(parseInt(exceptionId), req.user.user_id);

    if (!deleted) {
      return res.status(404).json({
        success: false,
        error: 'Excepción no encontrada'
      });
    }

    res.json({
      success: true,
      message: 'Excepción eliminada exitosamente'
    });
  } catch (error) {
    console.error('Error al eliminar excepción:', error);
    res.status(500).json({
      success: false,
      error: 'Error al eliminar excepción'
    });
  }
};

// Crear horarios masivos para un dentista
const addBulkSchedules = async (req, res) => {
  try {
    const { dentist_id } = req.params;
    const { schedules } = req.body;

    if (!schedules || !Array.isArray(schedules) || schedules.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Debe proporcionar un array de horarios'
      });
    }

    // Agregar dentist_id a cada horario
    const schedulesWithDentistId = schedules.map(schedule => ({
      ...schedule,
      dentist_id: parseInt(dentist_id)
    }));

    const createdSchedules = await addBulkDentistSchedules(
      schedulesWithDentistId,
      req.user.user_id
    );

    res.status(201).json({
      success: true,
      message: `${createdSchedules.length} horarios creados exitosamente`,
      data: createdSchedules
    });
  } catch (error) {
    console.error('Error al crear horarios masivos:', error);

    // Manejo específico de errores de triggers
    if (error.message && error.message.includes('no tiene acceso asignado')) {
      return res.status(400).json({
        success: false,
        error: error.message
      });
    }

    if (error.message && error.message.includes('Solapamiento de horarios')) {
      return res.status(409).json({
        success: false,
        error: error.message
      });
    }

    res.status(500).json({
      success: false,
      error: 'Error al crear horarios masivos',
      message: error.message
    });
  }
};

// Obtener sedes asignadas a un dentista
const getDentistBranches = async (req, res) => {
  try {
    const { id } = req.params;
    const dentist = await getDentistById(parseInt(id));

    if (!dentist) {
      return res.status(404).json({
        success: false,
        error: 'Dentista no encontrado'
      });
    }

    res.json({
      success: true,
      data: {
        branches_access: dentist.branches_access || [],
        assigned_branches: dentist.assigned_branches || []
      }
    });
  } catch (error) {
    console.error('Error al obtener sedes del dentista:', error);
    res.status(500).json({
      success: false,
      error: 'Error al obtener sedes del dentista'
    });
  }
};

// Asignar una sede a un dentista
const assignBranchToDentist = async (req, res) => {
  try {
    const { id } = req.params;
    const { branch_id } = req.body;

    if (!branch_id) {
      return res.status(400).json({
        success: false,
        error: 'branch_id es requerido'
      });
    }

    const dentist = await getDentistById(parseInt(id));

    if (!dentist) {
      return res.status(404).json({
        success: false,
        error: 'Dentista no encontrado'
      });
    }

    // Obtener branches_access actual
    const currentBranches = dentist.branches_access || [];

    // Verificar si ya está asignada
    if (currentBranches.includes(parseInt(branch_id))) {
      return res.status(409).json({
        success: false,
        error: 'Esta sede ya está asignada al dentista'
      });
    }

    // Agregar la nueva sede
    const updatedBranches = [...currentBranches, parseInt(branch_id)];

    // Actualizar el usuario
    await updateUser(dentist.user_id, {
      branches_access: updatedBranches,
      user_id_modification: req.user.user_id
    });

    res.json({
      success: true,
      message: 'Sede asignada exitosamente',
      data: {
        branches_access: updatedBranches
      }
    });
  } catch (error) {
    console.error('Error al asignar sede:', error);
    res.status(500).json({
      success: false,
      error: 'Error al asignar sede',
      message: error.message
    });
  }
};

// Remover una sede de un dentista
const removeBranchFromDentist = async (req, res) => {
  try {
    const { id, branch_id } = req.params;

    const dentist = await getDentistById(parseInt(id));

    if (!dentist) {
      return res.status(404).json({
        success: false,
        error: 'Dentista no encontrado'
      });
    }

    // Obtener branches_access actual
    const currentBranches = dentist.branches_access || [];

    // Verificar si la sede está asignada
    if (!currentBranches.includes(parseInt(branch_id))) {
      return res.status(404).json({
        success: false,
        error: 'Esta sede no está asignada al dentista'
      });
    }

    // Remover la sede
    const updatedBranches = currentBranches.filter(
      b => b !== parseInt(branch_id)
    );

    // Actualizar el usuario (el trigger se encargará de eliminar horarios huérfanos)
    await updateUser(dentist.user_id, {
      branches_access: updatedBranches,
      user_id_modification: req.user.user_id
    });

    res.json({
      success: true,
      message: 'Sede removida exitosamente (los horarios asociados fueron eliminados automáticamente)',
      data: {
        branches_access: updatedBranches
      }
    });
  } catch (error) {
    console.error('Error al remover sede:', error);
    res.status(500).json({
      success: false,
      error: 'Error al remover sede',
      message: error.message
    });
  }
};

/**
 * Obtiene dentistas activos por sede con sus especialidades
 */
const getDentistsByBranch = async (req, res) => {
  try {
    const { branchId } = req.params;
    const pool = require('../config/db');

    const query = `
      SELECT
        d.dentist_id,
        u.user_id,
        u.first_name,
        u.last_name,
        u.email,
        u.phone,
        u.branch_id,
        u.branches_access,
        d.professional_license,
        d.years_experience,
        d.consultation_fee,
        d.bio,
        (
          SELECT json_agg(json_build_object(
            'specialty_id', s.specialty_id,
            'specialty_name', s.specialty_name
          ))
          FROM dentist_specialties ds
          INNER JOIN specialties s ON ds.specialty_id = s.specialty_id
          WHERE ds.dentist_id = d.dentist_id AND ds.status = 'active' AND s.status = 'active'
        ) as specialties
      FROM dentists d
      INNER JOIN users u ON d.user_id = u.user_id
      WHERE $1 = ANY(u.branches_access)
        AND u.role_id IN (3, 5)
        AND u.status = 'active'
        AND d.status = 'active'
      ORDER BY u.first_name, u.last_name;
    `;

    const result = await pool.query(query, [parseInt(branchId)]);

    res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    console.error('Error al obtener dentistas por sede:', error);
    res.status(500).json({
      success: false,
      error: 'Error al obtener dentistas por sede'
    });
  }
};

/**
 * Buscar dentista por COP (professional_license)
 * Endpoint para buscar si un odontólogo existe en el sistema por su colegiatura
 * Útil para el laboratorio de imágenes al crear solicitudes
 */
const searchDentistByCop = async (req, res) => {
  try {
    const { cop } = req.params;

    // Validar que se proporcionó el COP
    if (!cop || cop.trim().length < 3) {
      return res.status(400).json({
        success: false,
        error: 'Debe proporcionar un número de colegiatura válido (mínimo 3 caracteres)'
      });
    }

    const dentist = await getDentistByCop(cop);

    if (!dentist) {
      return res.json({
        success: true,
        found: false,
        message: 'Odontólogo no encontrado en el sistema',
        data: null
      });
    }

    res.json({
      success: true,
      found: true,
      message: 'Odontólogo encontrado en MyDent',
      data: {
        dentist_id: dentist.dentist_id,
        cop: dentist.cop,
        nombres: dentist.first_name,
        apellidos: dentist.last_name,
        email: dentist.email || '',
        telefono: dentist.phone || dentist.mobile || '',
        especialidad: dentist.specialty_name || '',
        branch_id: dentist.branch_id,
        branch_name: dentist.branch_name
      }
    });
  } catch (error) {
    console.error('Error al buscar dentista por COP:', error);
    res.status(500).json({
      success: false,
      error: 'Error al buscar odontólogo'
    });
  }
};

module.exports = {
  getDentists,
  getDentist,
  createNewDentist,
  createCompleteDentist,
  updateExistingDentist,
  deleteExistingDentist,
  addSchedule,
  updateSchedule,
  deleteSchedule,
  addBulkSchedules,
  getDentistBranches,
  assignBranchToDentist,
  removeBranchFromDentist,
  getExceptions,
  addException,
  deleteException,
  getDentistsByBranch,
  searchDentistByCop
};
