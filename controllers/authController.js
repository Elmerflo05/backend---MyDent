const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { findUserByEmail } = require('../models/authModel');
const pool = require('../config/db');
const { logAuditEvent, AUDIT_ACTIONS } = require('../models/auditLogsModel');

const PATIENT_ROLE_ID = 6;
const EXTERNAL_CLIENT_ROLE_ID = 7;
const SALT_ROUNDS = 10;
const DEFAULT_MAX_LOGIN_ATTEMPTS = 3;
const LOCKOUT_DURATION_MINUTES = 10;

/**
 * Obtiene la configuración de max_login_attempts desde app_settings
 */
const getMaxLoginAttempts = async () => {
  try {
    const result = await pool.query(
      `SELECT setting_value FROM app_settings WHERE setting_key = 'max_login_attempts' AND status = 'active' LIMIT 1`
    );
    if (result.rows.length > 0) {
      const value = parseInt(result.rows[0].setting_value, 10);
      return isNaN(value) ? DEFAULT_MAX_LOGIN_ATTEMPTS : value;
    }
    return DEFAULT_MAX_LOGIN_ATTEMPTS;
  } catch (error) {
    console.error('Error al obtener max_login_attempts:', error);
    return DEFAULT_MAX_LOGIN_ATTEMPTS;
  }
};

/**
 * Incrementa el contador de intentos fallidos y bloquea si es necesario
 */
const handleFailedLogin = async (userId, maxAttempts) => {
  try {
    // Incrementar contador
    const updateResult = await pool.query(`
      UPDATE users
      SET failed_login_attempts = COALESCE(failed_login_attempts, 0) + 1
      WHERE user_id = $1
      RETURNING failed_login_attempts
    `, [userId]);

    const attempts = updateResult.rows[0]?.failed_login_attempts || 0;

    // Si se alcanzó el límite, bloquear la cuenta
    if (attempts >= maxAttempts) {
      await pool.query(`
        UPDATE users
        SET account_locked_until = NOW() + INTERVAL '${LOCKOUT_DURATION_MINUTES} minutes'
        WHERE user_id = $1
      `, [userId]);

      return { locked: true, attempts, lockoutMinutes: LOCKOUT_DURATION_MINUTES };
    }

    return { locked: false, attempts, remainingAttempts: maxAttempts - attempts };
  } catch (error) {
    console.error('Error al manejar intento fallido:', error);
    return { locked: false, attempts: 0 };
  }
};

/**
 * Resetea el contador de intentos fallidos en login exitoso
 */
const resetFailedLoginAttempts = async (userId) => {
  try {
    await pool.query(`
      UPDATE users
      SET failed_login_attempts = 0, account_locked_until = NULL
      WHERE user_id = $1
    `, [userId]);
  } catch (error) {
    console.error('Error al resetear intentos fallidos:', error);
  }
};

/**
 * Obtiene la configuración de password_expiry desde app_settings (días)
 */
const getPasswordExpiryDays = async () => {
  try {
    const result = await pool.query(
      `SELECT setting_value FROM app_settings WHERE setting_key = 'password_expiry' AND status = 'active' LIMIT 1`
    );
    if (result.rows.length > 0) {
      const value = parseInt(result.rows[0].setting_value, 10);
      return isNaN(value) ? 90 : value; // Default 90 días
    }
    return 90;
  } catch (error) {
    console.error('Error al obtener password_expiry:', error);
    return 90;
  }
};

/**
 * Verifica si la contraseña del usuario ha caducado
 */
const checkPasswordExpiry = async (userId) => {
  try {
    const expiryDays = await getPasswordExpiryDays();

    const result = await pool.query(`
      SELECT password_changed_at, must_change_password
      FROM users
      WHERE user_id = $1
    `, [userId]);

    if (result.rows.length === 0) {
      return { expired: false, daysUntilExpiry: null, expiryDays };
    }

    const { password_changed_at, must_change_password } = result.rows[0];

    // Si must_change_password está activo, la contraseña debe cambiarse
    if (must_change_password) {
      return { expired: true, daysUntilExpiry: 0, expiryDays, mustChange: true };
    }

    // Si no hay fecha de cambio registrada, considerar como NO caducada
    // (para usuarios existentes que no tienen fecha registrada)
    if (!password_changed_at) {
      return { expired: false, daysUntilExpiry: null, expiryDays };
    }

    const changedAt = new Date(password_changed_at);
    const now = new Date();
    const daysSinceChange = Math.floor((now.getTime() - changedAt.getTime()) / (1000 * 60 * 60 * 24));
    const daysUntilExpiry = expiryDays - daysSinceChange;

    return {
      expired: daysUntilExpiry <= 0,
      daysUntilExpiry: Math.max(0, daysUntilExpiry),
      daysSinceChange,
      expiryDays
    };
  } catch (error) {
    console.error('Error al verificar caducidad de contraseña:', error);
    return { expired: false, daysUntilExpiry: null, expiryDays: 90 };
  }
};

/**
 * Verifica si la cuenta está bloqueada
 */
const checkAccountLocked = async (userId) => {
  try {
    const result = await pool.query(`
      SELECT account_locked_until, failed_login_attempts
      FROM users
      WHERE user_id = $1
    `, [userId]);

    if (result.rows.length === 0) return { locked: false };

    const { account_locked_until, failed_login_attempts } = result.rows[0];

    if (account_locked_until) {
      const lockUntil = new Date(account_locked_until);
      const now = new Date();

      if (lockUntil > now) {
        // Cuenta aún bloqueada
        const remainingMs = lockUntil.getTime() - now.getTime();
        const remainingMinutes = Math.ceil(remainingMs / (1000 * 60));
        return {
          locked: true,
          remainingMinutes,
          lockedUntil: lockUntil.toISOString()
        };
      } else {
        // El bloqueo ya expiró, limpiar
        await pool.query(`
          UPDATE users
          SET account_locked_until = NULL, failed_login_attempts = 0
          WHERE user_id = $1
        `, [userId]);
        return { locked: false };
      }
    }

    return { locked: false, failedAttempts: failed_login_attempts || 0 };
  } catch (error) {
    console.error('Error al verificar bloqueo de cuenta:', error);
    return { locked: false };
  }
};

const login = async (req, res) => {
  const { email, password } = req.body;

  try {
    // Validaciones de entrada
    if (!email || !password) {
      return res.status(400).json({
        error: 'Email y contraseña son requeridos'
      });
    }

    // Validar formato de email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        error: 'Formato de email inválido'
      });
    }

    // Buscar usuario con su rol y permisos
    const user = await findUserByEmail(email.toLowerCase().trim());

    if (!user) {
      return res.status(401).json({
        error: 'Credenciales inválidas'
      });
    }

    // Verificar si la cuenta está bloqueada
    const lockStatus = await checkAccountLocked(user.user_id);
    if (lockStatus.locked) {
      return res.status(423).json({
        error: `Cuenta bloqueada temporalmente. Intenta de nuevo en ${lockStatus.remainingMinutes} minuto(s)`,
        locked: true,
        remainingMinutes: lockStatus.remainingMinutes,
        lockedUntil: lockStatus.lockedUntil
      });
    }

    // Verificar si el usuario está activo (verificar status)
    if (user.status !== 'active') {
      return res.status(403).json({
        error: 'Usuario inactivo. Contacte al administrador'
      });
    }

    // Obtener configuración de intentos máximos
    const maxAttempts = await getMaxLoginAttempts();

    // Comparar contraseñas
    const isPasswordValid = await bcrypt.compare(password, user.password_hash);
    if (!isPasswordValid) {
      // Manejar intento fallido
      const failResult = await handleFailedLogin(user.user_id, maxAttempts);

      if (failResult.locked) {
        // Registrar bloqueo de cuenta en auditoría
        await logAuditEvent({
          user_id: user.user_id,
          action_type: AUDIT_ACTIONS.ACCOUNT_LOCKED,
          table_name: 'users',
          record_id: user.user_id,
          new_values: {
            email: user.email,
            lockout_minutes: failResult.lockoutMinutes,
            failed_attempts: failResult.attempts
          },
          ip_address: req.ip || req.connection?.remoteAddress,
          user_agent: req.get('User-Agent'),
          description: `Cuenta bloqueada por ${failResult.lockoutMinutes} minutos: ${user.email}`
        });

        return res.status(423).json({
          error: `Has excedido el número máximo de intentos. Tu cuenta ha sido bloqueada por ${failResult.lockoutMinutes} minutos`,
          locked: true,
          lockoutMinutes: failResult.lockoutMinutes
        });
      }

      // Registrar intento fallido en auditoría
      await logAuditEvent({
        user_id: user.user_id,
        action_type: AUDIT_ACTIONS.LOGIN_FAILED,
        table_name: 'users',
        record_id: user.user_id,
        new_values: {
          email: user.email,
          failed_attempts: failResult.attempts,
          remaining_attempts: failResult.remainingAttempts
        },
        ip_address: req.ip || req.connection?.remoteAddress,
        user_agent: req.get('User-Agent'),
        description: `Intento de login fallido: ${user.email}`
      });

      return res.status(401).json({
        error: `Credenciales inválidas. Te quedan ${failResult.remainingAttempts} intento(s)`,
        remainingAttempts: failResult.remainingAttempts
      });
    }

    // Login exitoso: resetear contador de intentos
    await resetFailedLoginAttempts(user.user_id);

    // Verificar si la contraseña ha caducado
    const passwordExpiryCheck = await checkPasswordExpiry(user.user_id);
    if (passwordExpiryCheck.expired || user.must_change_password) {
      return res.status(403).json({
        error: passwordExpiryCheck.expired
          ? `Tu contraseña ha caducado. Debe ser cambiada cada ${passwordExpiryCheck.expiryDays} días`
          : 'Debes cambiar tu contraseña antes de continuar',
        passwordExpired: true,
        mustChangePassword: true,
        userId: user.user_id,
        email: user.email
      });
    }

    // Advertencia si la contraseña está por caducar (7 días antes)
    let passwordExpiryWarning = null;
    if (passwordExpiryCheck.daysUntilExpiry !== null && passwordExpiryCheck.daysUntilExpiry <= 7) {
      passwordExpiryWarning = {
        daysUntilExpiry: passwordExpiryCheck.daysUntilExpiry,
        message: `Tu contraseña expirará en ${passwordExpiryCheck.daysUntilExpiry} día(s). Te recomendamos cambiarla pronto.`
      };
    }

    // Si es doctor (role_id = 3) o external_client (role_id = 7), obtener datos del dentist ANTES de crear el token
    let dentistId = null;
    let professionalLicense = null;
    let specialtyData = null;
    if (user.role_id === 3 || user.role_id === EXTERNAL_CLIENT_ROLE_ID) {
      const dentistResult = await pool.query(`
        SELECT d.dentist_id, d.professional_license, d.specialty_id, s.specialty_name
        FROM dentists d
        LEFT JOIN specialties s ON d.specialty_id = s.specialty_id
        WHERE d.user_id = $1 AND d.status = $2
      `, [user.user_id, 'active']);

      if (dentistResult.rows.length > 0) {
        const dentist = dentistResult.rows[0];
        dentistId = dentist.dentist_id;
        professionalLicense = dentist.professional_license;
        if (dentist.specialty_id) {
          specialtyData = {
            id: dentist.specialty_id,
            name: dentist.specialty_name
          };
        }
      }
    }

    // Si es paciente (role_id = 6), obtener datos del patient
    let patientId = null;
    if (user.role_id === PATIENT_ROLE_ID) {
      const patientResult = await pool.query(`
        SELECT patient_id
        FROM patients
        WHERE user_id = $1 AND status = 'active'
      `, [user.user_id]);

      if (patientResult.rows.length > 0) {
        patientId = patientResult.rows[0].patient_id;
      }
    }

    // Generar token JWT con información completa (incluyendo dentist_id y patient_id)
    const token = jwt.sign(
      {
        user_id: user.user_id,
        email: user.email,
        role_id: user.role_id,
        role_name: user.role_name,
        branch_id: user.branch_id,
        branches_access: user.branches_access,
        dentist_id: dentistId, // Para doctores y external_client
        patient_id: patientId // Para pacientes
      },
      process.env.JWT_SECRET,
      { expiresIn: '8h' }
    );

    // Preparar respuesta con todos los datos del usuario
    const userData = {
      user_id: user.user_id,
      role_id: user.role_id,
      branch_id: user.branch_id,
      dentist_id: dentistId, // Incluir dentist_id para doctores y external_client
      patient_id: patientId, // Incluir patient_id para pacientes
      professional_license: professionalLicense, // COP para doctores y external_client
      specialty: specialtyData, // Especialidad para doctores y external_client
      username: user.username,
      email: user.email,
      first_name: user.first_name,
      last_name: user.last_name,
      full_name: `${user.first_name} ${user.last_name}`,
      phone: user.phone,
      mobile: user.mobile,
      avatar_url: user.avatar_url,
      status: user.status,
      email_verified: user.email_verified,
      last_login: user.last_login,
      profile: user.profile,
      branches_access: user.branches_access,
      commission_percentage: user.commission_percentage,
      commission_config: user.commission_config,
      role: {
        role_id: user.role_id,
        role_name: user.role_name,
        role_description: user.role_description,
        role_level: user.role_level
      },
      permissions: user.permissions
    };

    // Responder con token y datos del usuario
    const response = {
      success: true,
      message: 'Login exitoso',
      token,
      user: userData
    };

    // Agregar advertencia de caducidad si aplica
    if (passwordExpiryWarning) {
      response.passwordExpiryWarning = passwordExpiryWarning;
    }

    // Registrar login exitoso en auditoría
    await logAuditEvent({
      user_id: user.user_id,
      action_type: AUDIT_ACTIONS.LOGIN,
      table_name: 'users',
      record_id: user.user_id,
      new_values: {
        email: user.email,
        role: user.role_name,
        branch_id: user.branch_id
      },
      ip_address: req.ip || req.connection?.remoteAddress,
      user_agent: req.get('User-Agent'),
      description: `Login exitoso: ${user.email}`
    });

    res.json(response);

  } catch (error) {
    console.error('Error en login:', error);
    res.status(500).json({
      error: 'Error interno del servidor. Intente nuevamente'
    });
  }
};

/**
 * Registro público de pacientes
 * Crea el paciente y su usuario en una transacción atómica
 */
const registerPatient = async (req, res) => {
  const client = await pool.connect();

  try {
    const {
      // Datos del paciente
      branch_id: rawBranchId,
      identification_type_id,
      identification_number,
      first_name,
      last_name,
      birth_date,
      gender_id,
      blood_type_id,
      marital_status_id,
      email,
      phone,
      mobile,
      address,
      city,
      state,
      country,
      postal_code,
      emergency_contact_name,
      emergency_contact_phone,
      emergency_contact_relationship,
      occupation,
      // Empresa corporativa (opcional)
      company_id,
      // Datos de autenticación
      password
    } = req.body;

    // Asegurar que branch_id nunca sea null/undefined (default a 1)
    const branch_id = rawBranchId || 1;

    // Log de debugging
    console.log('🔵 [registerPatient] branch_id recibido:', rawBranchId, '→ usando:', branch_id);

    // Validaciones de entrada
    if (!identification_number || !first_name ||
        !last_name || !birth_date || !mobile || !email || !password) {
      return res.status(400).json({
        success: false,
        error: 'Faltan campos requeridos'
      });
    }

    // Validar formato de email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        error: 'Formato de email inválido'
      });
    }

    // Validar longitud mínima de contraseña
    if (password.length < 8) {
      return res.status(400).json({
        success: false,
        error: 'La contraseña debe tener al menos 8 caracteres'
      });
    }

    const emailLower = email.toLowerCase().trim();

    // Iniciar transacción
    await client.query('BEGIN');

    // Verificar si el email ya existe
    const emailCheck = await client.query(
      'SELECT user_id FROM users WHERE email = $1',
      [emailLower]
    );

    if (emailCheck.rows.length > 0) {
      await client.query('ROLLBACK');
      return res.status(409).json({
        success: false,
        error: 'El email ya está registrado'
      });
    }

    // Verificar si el paciente ya existe (por identificación)
    const patientCheck = await client.query(
      'SELECT patient_id FROM patients WHERE branch_id = $1 AND identification_type_id = $2 AND identification_number = $3',
      [branch_id, identification_type_id, identification_number]
    );

    if (patientCheck.rows.length > 0) {
      await client.query('ROLLBACK');
      return res.status(409).json({
        success: false,
        error: 'Ya existe un paciente con ese número de identificación en esta sucursal'
      });
    }

    // Validar empresa si viene company_id
    let validatedCompanyId = null;
    if (company_id) {
      const companyCheck = await client.query(
        `SELECT company_id, company_name, vigencia_fin, status
         FROM companies
         WHERE company_id = $1 AND status = 'active'`,
        [company_id]
      );

      if (companyCheck.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(400).json({
          success: false,
          error: 'La empresa seleccionada no existe o no esta activa'
        });
      }

      const companyRow = companyCheck.rows[0];
      if (companyRow.vigencia_fin && new Date(companyRow.vigencia_fin) < new Date()) {
        await client.query('ROLLBACK');
        return res.status(400).json({
          success: false,
          error: `El convenio con ${companyRow.company_name} ha vencido`
        });
      }

      validatedCompanyId = parseInt(company_id);
    }

    // Hash de la contraseña
    const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);

    // Generar username único (email sin dominio + timestamp)
    const username = emailLower.split('@')[0] + '_' + Date.now();

    // 1. Crear el usuario
    const userResult = await client.query(`
      INSERT INTO users (
        role_id, branch_id, username, email, password_hash,
        first_name, last_name, phone, mobile, status, email_verified,
        must_change_password, date_time_registration
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW())
      RETURNING user_id, username, email, first_name, last_name
    `, [
      PATIENT_ROLE_ID,
      branch_id,
      username,
      emailLower,
      hashedPassword,
      first_name,
      last_name,
      phone,
      mobile,
      'active', // status
      false, // email_verified
      false // must_change_password
    ]);

    const newUser = userResult.rows[0];

    // 2. Crear el paciente vinculado al usuario
    const patientResult = await client.query(`
      INSERT INTO patients (
        branch_id, company_id, identification_type_id, identification_number,
        first_name, last_name, birth_date, gender_id, blood_type_id,
        marital_status_id, email, phone, mobile, address, city, state,
        country, postal_code, emergency_contact_name, emergency_contact_phone,
        emergency_contact_relationship, occupation, is_basic_registration,
        user_id, user_id_registration, date_time_registration
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15,
        $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, NOW()
      ) RETURNING patient_id
    `, [
      branch_id,
      validatedCompanyId, // empresa corporativa (null si no tiene)
      identification_type_id,
      identification_number,
      first_name,
      last_name,
      birth_date,
      gender_id,
      blood_type_id,
      marital_status_id,
      emailLower,
      phone,
      mobile,
      address,
      city,
      state,
      country || 'Perú',
      postal_code,
      emergency_contact_name,
      emergency_contact_phone,
      emergency_contact_relationship,
      occupation,
      false, // is_basic_registration (registro completo)
      newUser.user_id, // vincular con el usuario
      newUser.user_id // el propio usuario se registra
    ]);

    const newPatient = patientResult.rows[0];

    // Commit de la transacción
    await client.query('COMMIT');

    // Generar token JWT (IMPORTANTE: incluir patient_id para el portal del paciente)
    const token = jwt.sign(
      {
        user_id: newUser.user_id,
        email: newUser.email,
        role_id: PATIENT_ROLE_ID,
        role_name: 'Paciente',
        branch_id: branch_id,
        patient_id: newPatient.patient_id // Necesario para acceder al historial médico
      },
      process.env.JWT_SECRET,
      { expiresIn: '8h' }
    );

    // Responder con el token y datos del usuario
    res.status(201).json({
      success: true,
      message: 'Registro exitoso',
      token,
      user: {
        user_id: newUser.user_id,
        patient_id: newPatient.patient_id,
        email: newUser.email,
        first_name: newUser.first_name,
        last_name: newUser.last_name,
        role: {
          role_id: PATIENT_ROLE_ID,
          role_name: 'Paciente'
        }
      }
    });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error en registro de paciente:', error);

    // Manejar errores específicos de BD
    if (error.code === '23505') {
      // Unique violation
      if (error.constraint?.includes('email')) {
        return res.status(409).json({
          success: false,
          error: 'El email ya está registrado'
        });
      }
      if (error.constraint?.includes('identification')) {
        return res.status(409).json({
          success: false,
          error: 'Ya existe un paciente con ese número de identificación'
        });
      }
      return res.status(409).json({
        success: false,
        error: 'Ya existe un registro con esos datos'
      });
    }

    if (error.code === '23503') {
      // Foreign key violation
      const detail = error.detail || '';
      if (detail.includes('branch_id') || error.constraint?.includes('branch')) {
        return res.status(400).json({
          success: false,
          error: 'La sede seleccionada no existe o no está activa'
        });
      }
      if (detail.includes('role_id') || error.constraint?.includes('role')) {
        return res.status(400).json({
          success: false,
          error: 'Error de configuración: rol de paciente no encontrado'
        });
      }
      if (detail.includes('identification_type_id') || error.constraint?.includes('identification')) {
        return res.status(400).json({
          success: false,
          error: 'El tipo de identificación seleccionado no es válido'
        });
      }
      return res.status(400).json({
        success: false,
        error: 'Error de integridad referencial: verifique los datos ingresados'
      });
    }

    if (error.code === '23514') {
      // CHECK constraint violation
      return res.status(400).json({
        success: false,
        error: 'Los datos ingresados no cumplen con las validaciones requeridas'
      });
    }

    res.status(500).json({
      success: false,
      error: 'Error al registrar el paciente. Intente nuevamente'
    });
  } finally {
    client.release();
  }
};

/**
 * Registro público de clientes externos (odontólogos)
 * Guarda COP y especialidad en users.profile como JSON
 * Crea registro en dentists solo para tener dentist_id (necesario para filtros)
 */
const registerExternalClient = async (req, res) => {
  const client = await pool.connect();

  try {
    const {
      first_name,
      last_name,
      email,
      phone,
      cop, // Número de colegiatura
      specialty, // Especialidad como texto (ingresada manualmente)
      password
    } = req.body;

    // Validaciones de entrada
    if (!first_name || !last_name || !email || !cop || !password) {
      return res.status(400).json({
        success: false,
        error: 'Faltan campos requeridos: nombres, apellidos, email, COP y contraseña son obligatorios'
      });
    }

    // Validar formato de email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        error: 'Formato de email inválido'
      });
    }

    // Validar longitud mínima de contraseña
    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        error: 'La contraseña debe tener al menos 6 caracteres'
      });
    }

    const emailLower = email.toLowerCase().trim();
    const copTrimmed = cop.trim();
    const specialtyTrimmed = specialty?.trim() || null;

    // Iniciar transacción
    await client.query('BEGIN');

    // Verificar si el email ya existe
    const emailCheck = await client.query(
      'SELECT user_id FROM users WHERE email = $1',
      [emailLower]
    );

    if (emailCheck.rows.length > 0) {
      await client.query('ROLLBACK');
      return res.status(409).json({
        success: false,
        error: 'El email ya está registrado'
      });
    }

    // Verificar si el COP ya existe en dentists
    const copCheck = await client.query(
      'SELECT dentist_id FROM dentists WHERE professional_license = $1',
      [copTrimmed]
    );

    if (copCheck.rows.length > 0) {
      await client.query('ROLLBACK');
      return res.status(409).json({
        success: false,
        error: 'Ya existe una cuenta registrada con este número de colegiatura (COP)'
      });
    }

    // Hash de la contraseña
    const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);

    // Generar username único
    const username = emailLower.split('@')[0] + '_ext_' + Date.now();

    // Crear el objeto profile con COP y especialidad
    const userProfile = {
      licenseNumber: copTrimmed,
      specialty: specialtyTrimmed
    };

    // 1. Crear el usuario con profile JSON
    const userResult = await client.query(`
      INSERT INTO users (
        role_id, username, email, password_hash,
        first_name, last_name, phone, profile, status, email_verified,
        must_change_password, date_time_registration
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW())
      RETURNING user_id, username, email, first_name, last_name, phone, profile
    `, [
      EXTERNAL_CLIENT_ROLE_ID,
      username,
      emailLower,
      hashedPassword,
      first_name.trim(),
      last_name.trim(),
      phone?.trim() || null,
      JSON.stringify(userProfile), // Guardar COP y especialidad en profile
      'active', // status
      false, // email_verified
      false // must_change_password
    ]);

    const newUser = userResult.rows[0];

    // 2. Crear el registro de dentista (solo para tener dentist_id para filtros)
    const dentistResult = await client.query(`
      INSERT INTO dentists (
        user_id, professional_license, license_country,
        status, user_id_registration, date_time_registration
      ) VALUES ($1, $2, $3, $4, $5, NOW())
      RETURNING dentist_id
    `, [
      newUser.user_id,
      copTrimmed,
      'Peru', // País por defecto
      'active',
      newUser.user_id
    ]);

    const newDentist = dentistResult.rows[0];

    // Commit de la transacción
    await client.query('COMMIT');

    // Generar token JWT
    const token = jwt.sign(
      {
        user_id: newUser.user_id,
        email: newUser.email,
        role_id: EXTERNAL_CLIENT_ROLE_ID,
        role_name: 'external_client',
        dentist_id: newDentist.dentist_id
      },
      process.env.JWT_SECRET,
      { expiresIn: '8h' }
    );

    // Responder con el token y datos del usuario
    // El profile contiene licenseNumber y specialty
    res.status(201).json({
      success: true,
      message: 'Registro exitoso. Ya puedes acceder al portal de laboratorio',
      token,
      user: {
        user_id: newUser.user_id,
        dentist_id: newDentist.dentist_id,
        email: newUser.email,
        first_name: newUser.first_name,
        last_name: newUser.last_name,
        phone: newUser.phone,
        profile: userProfile, // Incluye licenseNumber y specialty
        role: {
          role_id: EXTERNAL_CLIENT_ROLE_ID,
          role_name: 'external_client'
        }
      }
    });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error en registro de cliente externo:', error);

    // Manejar errores específicos de BD
    if (error.code === '23505') {
      return res.status(409).json({
        success: false,
        error: 'Ya existe un registro con esos datos'
      });
    }

    res.status(500).json({
      success: false,
      error: 'Error al registrar la cuenta. Intente nuevamente'
    });
  } finally {
    client.release();
  }
};

/**
 * Cambio de contraseña del usuario autenticado
 * Requiere la contraseña actual para verificación
 */
const changeOwnPassword = async (req, res) => {
  const { current_password, new_password } = req.body;
  const userId = req.user?.user_id;

  try {
    // Validaciones
    if (!current_password || !new_password) {
      return res.status(400).json({
        success: false,
        error: 'La contraseña actual y la nueva contraseña son requeridas'
      });
    }

    if (new_password.length < 6) {
      return res.status(400).json({
        success: false,
        error: 'La nueva contraseña debe tener al menos 6 caracteres'
      });
    }

    if (current_password === new_password) {
      return res.status(400).json({
        success: false,
        error: 'La nueva contraseña debe ser diferente a la actual'
      });
    }

    // Obtener usuario actual
    const userResult = await pool.query(
      'SELECT user_id, password_hash FROM users WHERE user_id = $1 AND status = $2',
      [userId, 'active']
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Usuario no encontrado'
      });
    }

    const user = userResult.rows[0];

    // Verificar contraseña actual
    const isCurrentPasswordValid = await bcrypt.compare(current_password, user.password_hash);
    if (!isCurrentPasswordValid) {
      return res.status(401).json({
        success: false,
        error: 'La contraseña actual es incorrecta'
      });
    }

    // Hash de la nueva contraseña
    const newPasswordHash = await bcrypt.hash(new_password, SALT_ROUNDS);

    // Actualizar contraseña y fecha de cambio
    await pool.query(`
      UPDATE users SET
        password_hash = $1,
        password_changed_at = CURRENT_TIMESTAMP,
        must_change_password = false,
        date_time_modification = CURRENT_TIMESTAMP
      WHERE user_id = $2
    `, [newPasswordHash, userId]);

    // Registrar cambio de contraseña en auditoría
    await logAuditEvent({
      user_id: userId,
      action_type: AUDIT_ACTIONS.PASSWORD_CHANGE,
      table_name: 'users',
      record_id: userId,
      new_values: {
        password_changed_at: new Date().toISOString()
      },
      ip_address: req.ip || req.connection?.remoteAddress,
      user_agent: req.get('User-Agent'),
      description: 'Cambio de contraseña realizado por el usuario'
    });

    res.json({
      success: true,
      message: 'Contraseña actualizada exitosamente'
    });

  } catch (error) {
    console.error('Error al cambiar contraseña:', error);
    res.status(500).json({
      success: false,
      error: 'Error al cambiar la contraseña. Intente nuevamente'
    });
  }
};

/**
 * Cambio de contraseña para contraseña caducada (sin autenticación completa)
 * Se usa cuando el usuario intenta hacer login pero su contraseña ha caducado
 */
const changeExpiredPassword = async (req, res) => {
  const { email, current_password, new_password } = req.body;

  try {
    // Validaciones
    if (!email || !current_password || !new_password) {
      return res.status(400).json({
        success: false,
        error: 'Email, contraseña actual y nueva contraseña son requeridos'
      });
    }

    if (new_password.length < 6) {
      return res.status(400).json({
        success: false,
        error: 'La nueva contraseña debe tener al menos 6 caracteres'
      });
    }

    if (current_password === new_password) {
      return res.status(400).json({
        success: false,
        error: 'La nueva contraseña debe ser diferente a la actual'
      });
    }

    // Buscar usuario por email
    const userResult = await pool.query(
      'SELECT user_id, password_hash FROM users WHERE email = $1 AND status = $2',
      [email.toLowerCase().trim(), 'active']
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Usuario no encontrado'
      });
    }

    const user = userResult.rows[0];

    // Verificar contraseña actual
    const isCurrentPasswordValid = await bcrypt.compare(current_password, user.password_hash);
    if (!isCurrentPasswordValid) {
      return res.status(401).json({
        success: false,
        error: 'La contraseña actual es incorrecta'
      });
    }

    // Hash de la nueva contraseña
    const newPasswordHash = await bcrypt.hash(new_password, SALT_ROUNDS);

    // Actualizar contraseña y fecha de cambio
    await pool.query(`
      UPDATE users SET
        password_hash = $1,
        password_changed_at = CURRENT_TIMESTAMP,
        must_change_password = false,
        date_time_modification = CURRENT_TIMESTAMP
      WHERE user_id = $2
    `, [newPasswordHash, user.user_id]);

    // Registrar cambio de contraseña caducada en auditoría
    await logAuditEvent({
      user_id: user.user_id,
      action_type: AUDIT_ACTIONS.PASSWORD_CHANGE,
      table_name: 'users',
      record_id: user.user_id,
      old_values: {
        password_expired: true
      },
      new_values: {
        password_changed_at: new Date().toISOString(),
        password_expired: false
      },
      ip_address: req.ip || req.connection?.remoteAddress,
      user_agent: req.get('User-Agent'),
      description: `Cambio de contraseña por caducidad: ${email}`
    });

    res.json({
      success: true,
      message: 'Contraseña actualizada exitosamente. Ahora puedes iniciar sesión'
    });

  } catch (error) {
    console.error('Error al cambiar contraseña caducada:', error);
    res.status(500).json({
      success: false,
      error: 'Error al cambiar la contraseña. Intente nuevamente'
    });
  }
};

module.exports = { login, registerPatient, registerExternalClient, changeOwnPassword, changeExpiredPassword };
