const {
  getAllPatients,
  getPatientById,
  getPatientByDni,
  createPatient,
  updatePatient,
  deletePatient,
  countPatients
} = require('../models/patientsModel');
const {
  getPatientIntegralConsultations
} = require('../models/patientPortalModel');
const bcrypt = require('bcrypt');
const pool = require('../config/db');

const PATIENT_ROLE_ID = 6;
const SALT_ROUNDS = 10;

/**
 * Obtener todos los pacientes con paginación
 */
const getPatients = async (req, res) => {
  try {
    const { branch_id, search, company_id, page = 1, limit = 20 } = req.query;

    const filters = {
      branch_id: branch_id ? parseInt(branch_id) : null,
      company_id: company_id ? parseInt(company_id) : null,
      search: search || null,
      limit: parseInt(limit),
      offset: (parseInt(page) - 1) * parseInt(limit)
    };

    const [patients, total] = await Promise.all([
      getAllPatients(filters),
      countPatients(filters)
    ]);

    res.json({
      success: true,
      data: patients,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Error al obtener pacientes:', error);
    res.status(500).json({
      success: false,
      error: 'Error al obtener pacientes'
    });
  }
};

/**
 * Obtener un paciente por ID
 */
const getPatient = async (req, res) => {
  try {
    const { id } = req.params;
    const patient = await getPatientById(parseInt(id));

    if (!patient) {
      return res.status(404).json({
        success: false,
        error: 'Paciente no encontrado'
      });
    }

    res.json({
      success: true,
      data: patient
    });
  } catch (error) {
    console.error('Error al obtener paciente:', error);
    res.status(500).json({
      success: false,
      error: 'Error al obtener paciente'
    });
  }
};

/**
 * Crear un nuevo paciente
 * Si el paciente tiene email, automáticamente crea un usuario vinculado
 */
const createNewPatient = async (req, res) => {
  const client = await pool.connect();

  try {
    const patientData = {
      ...req.body,
      user_id_registration: req.user.user_id
    };

    // Validaciones básicas
    // NOTA: branch_id es OPCIONAL. Los pacientes NO están asignados a una sede específica.
    // La sede se determina por la cita, tratamiento o pago donde se atiende el paciente.
    if (!patientData.identification_number ||
        !patientData.first_name || !patientData.last_name ||
        !patientData.birth_date || !patientData.mobile) {
      return res.status(400).json({
        success: false,
        error: 'Faltan campos requeridos'
      });
    }

    // Validación preventiva: Verificar si ya existe un paciente con el mismo DNI
    const dniCheck = await client.query(
      `SELECT patient_id, first_name, last_name, status
       FROM patients
       WHERE identification_number = $1
       AND identification_type_id = $2`,
      [patientData.identification_number, patientData.identification_type_id || 1]
    );

    if (dniCheck.rows.length > 0) {
      const existingPatient = dniCheck.rows[0];
      const statusText = existingPatient.status === 'active' ? 'activo' : 'inactivo';
      return res.status(409).json({
        success: false,
        error: `Ya existe un paciente con el DNI ${patientData.identification_number}`,
        details: {
          field: 'dni',
          existingPatient: {
            name: `${existingPatient.first_name} ${existingPatient.last_name}`,
            status: statusText
          }
        }
      });
    }

    // Validación preventiva: Verificar si ya existe un paciente con el mismo email
    if (patientData.email && patientData.email.trim() !== '') {
      const emailLowerCheck = patientData.email.toLowerCase().trim();
      const emailCheck = await client.query(
        `SELECT patient_id, first_name, last_name, email, status
         FROM patients
         WHERE LOWER(email) = $1`,
        [emailLowerCheck]
      );

      if (emailCheck.rows.length > 0) {
        const existingPatient = emailCheck.rows[0];
        const statusText = existingPatient.status === 'active' ? 'activo' : 'inactivo';
        return res.status(409).json({
          success: false,
          error: `Ya existe un paciente con el email ${patientData.email}`,
          details: {
            field: 'email',
            existingPatient: {
              name: `${existingPatient.first_name} ${existingPatient.last_name}`,
              status: statusText
            }
          }
        });
      }
    }

    // Validar empresa si viene company_id
    if (patientData.company_id) {
      const companyCheck = await client.query(
        `SELECT company_id, company_name, vigencia_fin, status
         FROM companies
         WHERE company_id = $1 AND status = 'active'`,
        [patientData.company_id]
      );

      if (companyCheck.rows.length === 0) {
        client.release();
        return res.status(400).json({
          success: false,
          error: 'La empresa seleccionada no existe o no esta activa'
        });
      }

      const companyRow = companyCheck.rows[0];
      if (companyRow.vigencia_fin && new Date(companyRow.vigencia_fin) < new Date()) {
        client.release();
        return res.status(400).json({
          success: false,
          error: `El convenio con ${companyRow.company_name} ha vencido`
        });
      }
    }

    // Verificar si el paciente tiene email
    const hasEmail = patientData.email && patientData.email.trim() !== '';

    if (!hasEmail) {
      // Si no tiene email, crear solo el paciente
      const newPatient = await createPatient(patientData);
      return res.status(201).json({
        success: true,
        message: 'Paciente creado exitosamente',
        data: newPatient
      });
    }

    // Si tiene email, crear usuario + paciente en transacción
    await client.query('BEGIN');

    const emailLower = patientData.email.toLowerCase().trim();

    // Verificar si ya existe un usuario con ese email
    const userCheck = await client.query(
      'SELECT user_id FROM users WHERE email = $1',
      [emailLower]
    );

    let userId = null;

    if (userCheck.rows.length > 0) {
      // Si el usuario ya existe, usar ese user_id
      userId = userCheck.rows[0].user_id;
    } else {
      // Crear nuevo usuario
      // Usar contraseña personalizada si viene en el body, sino usar el DNI como contraseña
      const passwordToUse = patientData.password && patientData.password.trim() !== ''
        ? patientData.password
        : patientData.identification_number; // DNI como contraseña por defecto
      const hashedPassword = await bcrypt.hash(passwordToUse, SALT_ROUNDS);
      const username = emailLower.split('@')[0] + '_' + Date.now();

      const userResult = await client.query(`
        INSERT INTO users (
          role_id, branch_id, username, email, password_hash,
          first_name, last_name, phone, mobile, is_active,
          email_verified, must_change_password, date_time_registration
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW())
        RETURNING user_id
      `, [
        PATIENT_ROLE_ID,
        patientData.branch_id || null, // ✅ Permitir NULL - Sincronización con patients.branch_id
        username,
        emailLower,
        hashedPassword,
        patientData.first_name,
        patientData.last_name,
        patientData.phone || null,
        patientData.mobile,
        true,
        false,
        false // must_change_password = false (paciente puede usar su DNI como contraseña)
      ]);

      userId = userResult.rows[0].user_id;
    }

    // Crear paciente vinculado al usuario
    // SINCRONIZACIÓN: users.branch_id y patients.branch_id deben tener el mismo valor (ambos NULL)
    const patientResult = await client.query(`
      INSERT INTO patients (
        branch_id, company_id, identification_type_id, identification_number,
        first_name, last_name, birth_date, gender_id, blood_type_id,
        marital_status_id, email, phone, mobile, address, city, state,
        country, postal_code, emergency_contact_name, emergency_contact_phone,
        emergency_contact_relationship, photo_url, occupation, notes,
        is_basic_registration, medical_record_number, user_id,
        user_id_registration, date_time_registration
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15,
        $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, NOW()
      ) RETURNING *
    `, [
      patientData.branch_id || null, // ✅ Permitir NULL - Sincronización con users.branch_id
      patientData.company_id || null,
      patientData.identification_type_id || null,
      patientData.identification_number,
      patientData.first_name,
      patientData.last_name,
      patientData.birth_date,
      patientData.gender_id || null,
      patientData.blood_type_id || null,
      patientData.marital_status_id || null,
      emailLower,
      patientData.phone || null,
      patientData.mobile,
      patientData.address || null,
      patientData.city || null,
      patientData.state || null,
      patientData.country || 'Perú',
      patientData.postal_code || null,
      patientData.emergency_contact_name || null,
      patientData.emergency_contact_phone || null,
      patientData.emergency_contact_relationship || null,
      patientData.photo_url || null,
      patientData.occupation || null,
      patientData.notes || null,
      patientData.is_basic_registration !== undefined ? patientData.is_basic_registration : true,
      patientData.medical_record_number || null,
      userId,
      patientData.user_id_registration
    ]);

    // Si el paciente se vincula a empresa, suspender plan de salud activo
    let planSuspended = null;
    if (patientData.company_id) {
      const activePlanCheck = await client.query(
        `SELECT hps.subscription_id, hp.plan_name
         FROM health_plan_subscriptions hps
         INNER JOIN health_plans hp ON hps.health_plan_id = hp.health_plan_id
         WHERE hps.patient_id = (
           SELECT patient_id FROM patients
           WHERE identification_number = $1
           ORDER BY date_time_registration DESC LIMIT 1
         )
         AND hps.status = 'active'
         AND hps.subscription_status = 'active'`,
        [patientData.identification_number]
      );

      if (activePlanCheck.rows.length > 0) {
        const sub = activePlanCheck.rows[0];
        await client.query(
          `UPDATE health_plan_subscriptions SET
            subscription_status = 'suspended_corporate',
            user_id_modification = $1,
            date_time_modification = CURRENT_TIMESTAMP
          WHERE subscription_id = $2`,
          [patientData.user_id_registration, sub.subscription_id]
        );
        planSuspended = sub.plan_name;
      }
    }

    await client.query('COMMIT');

    const newPatient = patientResult.rows[0];

    // Determinar el mensaje segun si se uso contraseña personalizada o temporal
    let message = '';
    if (userCheck.rows.length > 0) {
      message = 'Paciente creado y vinculado a usuario existente';
    } else {
      const usedCustomPassword = patientData.password && patientData.password.trim() !== '';
      message = usedCustomPassword
        ? 'Paciente creado exitosamente con contraseña personalizada'
        : 'Paciente creado exitosamente. La contraseña es el DNI del paciente';
    }

    // Agregar warning si se suspendio plan
    const warnings = [];
    if (planSuspended) {
      warnings.push(`Se ha suspendido la suscripcion al plan ${planSuspended} por vinculacion corporativa`);
    }

    res.status(201).json({
      success: true,
      message: message,
      data: newPatient,
      user_created: userCheck.rows.length === 0,
      user_id: userId,
      warnings: warnings.length > 0 ? warnings : undefined
    });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error al crear paciente:', error);

    // Manejar error de duplicado
    if (error.code === '23505') {
      return res.status(409).json({
        success: false,
        error: 'Ya existe un paciente con ese número de identificación o email'
      });
    }

    res.status(500).json({
      success: false,
      error: 'Error al crear paciente'
    });
  } finally {
    client.release();
  }
};

/**
 * Actualizar un paciente
 */
const updateExistingPatient = async (req, res) => {
  try {
    const { id } = req.params;
    const patientData = {
      ...req.body,
      user_id_modification: req.user.user_id
    };

    const updatedPatient = await updatePatient(parseInt(id), patientData);

    if (!updatedPatient) {
      return res.status(404).json({
        success: false,
        error: 'Paciente no encontrado'
      });
    }

    res.json({
      success: true,
      message: 'Paciente actualizado exitosamente',
      data: updatedPatient
    });
  } catch (error) {
    console.error('Error al actualizar paciente:', error);

    if (error.code === '23505') {
      return res.status(409).json({
        success: false,
        error: 'Ya existe un paciente con ese número de identificación'
      });
    }

    res.status(500).json({
      success: false,
      error: 'Error al actualizar paciente'
    });
  }
};

/**
 * Eliminar un paciente (soft delete)
 */
const deleteExistingPatient = async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await deletePatient(parseInt(id), req.user.user_id);

    if (!deleted) {
      return res.status(404).json({
        success: false,
        error: 'Paciente no encontrado'
      });
    }

    res.json({
      success: true,
      message: 'Paciente eliminado exitosamente'
    });
  } catch (error) {
    console.error('Error al eliminar paciente:', error);
    res.status(500).json({
      success: false,
      error: 'Error al eliminar paciente'
    });
  }
};

/**
 * OPTIMIZACION: Endpoint para cargar todos los datos del paciente en una sola llamada
 * Reduce el número de requests del frontend de 3 a 1
 * Carga: datos del paciente, historia médica, última consulta y odontograma actual
 */
const getPatientCompleteData = async (req, res) => {
  try {
    const { id } = req.params;
    const patientId = parseInt(id);

    if (isNaN(patientId)) {
      return res.status(400).json({
        success: false,
        error: 'ID de paciente inválido'
      });
    }

    // Ejecutar todas las queries en paralelo para máxima eficiencia
    const [patientResult, medicalHistoryResult, consultationsResult, odontogramResult] = await Promise.allSettled([
      // 1. Datos del paciente
      getPatientById(patientId),
      // 2. Historia médica
      pool.query(
        `SELECT * FROM medical_histories
         WHERE patient_id = $1 AND status = 'active'
         ORDER BY medical_history_id DESC LIMIT 1`,
        [patientId]
      ),
      // 3. Últimas consultas (máximo 10)
      pool.query(
        `SELECT c.*,
                p.first_name || ' ' || p.last_name as patient_name,
                u.first_name || ' ' || u.last_name as dentist_name
         FROM consultations c
         INNER JOIN patients p ON c.patient_id = p.patient_id
         INNER JOIN dentists d ON c.dentist_id = d.dentist_id
         INNER JOIN users u ON d.user_id = u.user_id
         WHERE c.patient_id = $1 AND c.status = 'active'
         ORDER BY c.consultation_date DESC, c.consultation_time DESC
         LIMIT 10`,
        [patientId]
      ),
      // 4. Odontograma actual con condiciones
      pool.query(
        `SELECT o.*,
                json_agg(
                  json_build_object(
                    'odontogram_condition_id', oc.odontogram_condition_id,
                    'tooth_number', oc.tooth_number,
                    'tooth_position_id', oc.tooth_position_id,
                    'surface_section', oc.surface_section,
                    'dental_condition_id', oc.dental_condition_id,
                    'condition_name', dc.condition_name,
                    'dental_condition_code', dc.condition_code,
                    'tooth_surface_id', oc.tooth_surface_id,
                    'surface_code', ts.surface_code,
                    'color_type', oc.color_type,
                    'price', COALESCE(
                      (
                        SELECT ocp_p.price_without_plan
                        FROM odontogram_condition_procedures ocp_p
                        WHERE ocp_p.odontogram_condition_id = dc.dental_condition_id
                        AND ocp_p.status = 'active'
                        ORDER BY ocp_p.display_order, ocp_p.condition_procedure_id
                        LIMIT 1
                      ),
                      oc.price,
                      0
                    ),
                    'config_price_base', (
                      SELECT COALESCE(ocp.price_without_plan, 0)
                      FROM odontogram_condition_procedures ocp
                      WHERE ocp.dental_condition_id = dc.dental_condition_id
                      AND ocp.status = 'active'
                      ORDER BY ocp.display_order, ocp.condition_procedure_id
                      LIMIT 1
                    ),
                    'notes', oc.notes,
                    'description', oc.description,
                    'created_at', oc.created_at
                  )
                ) FILTER (WHERE oc.odontogram_condition_id IS NOT NULL) as conditions
         FROM odontograms o
         LEFT JOIN odontogram_conditions oc ON o.odontogram_id = oc.odontogram_id AND oc.status = 'active'
         LEFT JOIN dental_conditions dc ON oc.dental_condition_id = dc.dental_condition_id
         LEFT JOIN tooth_surfaces ts ON oc.tooth_surface_id = ts.tooth_surface_id
         WHERE o.patient_id = $1 AND o.status = 'active'
         GROUP BY o.odontogram_id
         ORDER BY o.odontogram_id DESC
         LIMIT 1`,
        [patientId]
      )
    ]);

    // Procesar resultados
    const patient = patientResult.status === 'fulfilled' ? patientResult.value : null;

    if (!patient) {
      return res.status(404).json({
        success: false,
        error: 'Paciente no encontrado'
      });
    }

    const medicalHistory = medicalHistoryResult.status === 'fulfilled' && medicalHistoryResult.value.rows.length > 0
      ? medicalHistoryResult.value.rows[0]
      : null;

    const consultations = consultationsResult.status === 'fulfilled'
      ? consultationsResult.value.rows
      : [];

    const odontogram = odontogramResult.status === 'fulfilled' && odontogramResult.value.rows.length > 0
      ? odontogramResult.value.rows[0]
      : null;

    // Respuesta consolidada
    res.json({
      success: true,
      data: {
        patient,
        medicalHistory,
        consultations,
        odontogram: odontogram ? {
          ...odontogram,
          conditions: odontogram.conditions || []
        } : null
      }
    });

  } catch (error) {
    console.error('Error al obtener datos completos del paciente:', error);
    res.status(500).json({
      success: false,
      error: 'Error al obtener datos del paciente'
    });
  }
};

/**
 * Obtener los datos de atención integral de un paciente:
 * - Procedimientos del odontograma
 * - Sub-procedimientos
 * - Texto registrado manualmente (notas, diagnósticos, etc.)
 * - Servicios adicionales (ortodoncia, implantes, prótesis)
 */
const getPatientIntegralData = async (req, res) => {
  try {
    const { id } = req.params;
    const patientId = parseInt(id);

    if (isNaN(patientId)) {
      return res.status(400).json({
        success: false,
        error: 'ID de paciente inválido'
      });
    }

    // 1. Obtener consultas con texto manual
    const consultationsQuery = `
      SELECT
        c.consultation_id,
        c.consultation_date,
        c.chief_complaint,
        c.diagnosis,
        c.treatment_plan AS treatment_plan_text,
        c.treatment_performed,
        c.notes,
        c.recommendations,
        u.first_name || ' ' || u.last_name AS dentist_name
      FROM consultations c
      INNER JOIN dentists d ON c.dentist_id = d.dentist_id
      INNER JOIN users u ON d.user_id = u.user_id
      WHERE c.patient_id = $1 AND c.status = 'active'
      ORDER BY c.consultation_date DESC
    `;
    const consultationsResult = await pool.query(consultationsQuery, [patientId]);
    const consultations = consultationsResult.rows;

    // 2. Obtener procedimientos del odontograma
    const odontogramProceduresQuery = `
      SELECT
        ot.odontogram_treatment_id,
        ot.findings,
        ot.notes AS treatment_notes,
        ot.treatment_date,
        dp.procedure_name,
        dp.procedure_code,
        dp.procedure_category,
        tp.tooth_number,
        tp.tooth_name,
        ts.surface_code,
        ts.surface_name,
        tst.status_name AS treatment_status,
        o.consultation_id,
        c.consultation_date,
        u.first_name || ' ' || u.last_name AS dentist_name
      FROM odontogram_treatments ot
      INNER JOIN odontograms o ON ot.odontogram_id = o.odontogram_id
      INNER JOIN dental_procedures dp ON ot.dental_procedure_id = dp.dental_procedure_id
      INNER JOIN tooth_positions tp ON ot.tooth_position_id = tp.tooth_position_id
      LEFT JOIN tooth_surfaces ts ON ot.tooth_surface_id = ts.tooth_surface_id
      INNER JOIN treatment_statuses tst ON ot.treatment_status_id = tst.treatment_status_id
      LEFT JOIN consultations c ON o.consultation_id = c.consultation_id
      LEFT JOIN dentists d ON o.dentist_id = d.dentist_id
      LEFT JOIN users u ON d.user_id = u.user_id
      WHERE o.patient_id = $1 AND ot.status = 'active'
      ORDER BY ot.treatment_date DESC NULLS LAST, o.odontogram_date DESC
    `;
    const odontogramProceduresResult = await pool.query(odontogramProceduresQuery, [patientId]);
    const odontogramProcedures = odontogramProceduresResult.rows;

    // 3. Obtener historial de procedimientos con notas clínicas
    const procedureHistoryQuery = `
      SELECT
        ph.procedure_history_id,
        ph.procedure_name,
        ph.procedure_code,
        ph.procedure_type,
        ph.procedure_status,
        ph.clinical_notes,
        ph.complications,
        ph.next_steps,
        ph.performed_date,
        tp.tooth_number,
        tp.tooth_name,
        ts.surface_code,
        c.consultation_id,
        c.consultation_date,
        u.first_name || ' ' || u.last_name AS dentist_name
      FROM procedure_history ph
      LEFT JOIN tooth_positions tp ON ph.tooth_position_id = tp.tooth_position_id
      LEFT JOIN tooth_surfaces ts ON ph.tooth_surface_id = ts.tooth_surface_id
      LEFT JOIN consultations c ON ph.consultation_id = c.consultation_id
      LEFT JOIN dentists d ON ph.performed_by_dentist_id = d.dentist_id
      LEFT JOIN users u ON d.user_id = u.user_id
      WHERE ph.patient_id = $1 AND ph.status = 'active'
      ORDER BY ph.performed_date DESC
    `;
    const procedureHistoryResult = await pool.query(procedureHistoryQuery, [patientId]);
    const procedureHistory = procedureHistoryResult.rows;

    // 4. Obtener servicios adicionales (ortodoncia, implantes, prótesis)
    const additionalServicesQuery = `
      SELECT
        cas.consultation_additional_service_id,
        cas.service_type,
        cas.service_name,
        cas.modality,
        COALESCE(cas.edited_monto_total, cas.original_monto_total, 0) AS monto_total,
        COALESCE(cas.edited_inicial, cas.original_inicial, 0) AS cuota_inicial,
        cas.monthly_payments_count AS numero_cuotas,
        COALESCE(cas.edited_mensual, cas.original_mensual, 0) AS monto_cuota,
        ctp.consultation_id,
        c.consultation_date,
        u.first_name || ' ' || u.last_name AS dentist_name
      FROM consultation_additional_services cas
      INNER JOIN consultation_treatment_plans ctp ON cas.consultation_treatment_plan_id = ctp.consultation_treatment_plan_id
      INNER JOIN consultations c ON ctp.consultation_id = c.consultation_id
      INNER JOIN dentists d ON c.dentist_id = d.dentist_id
      INNER JOIN users u ON d.user_id = u.user_id
      WHERE c.patient_id = $1 AND cas.status = 'active'
      ORDER BY c.consultation_date DESC
    `;
    const additionalServicesResult = await pool.query(additionalServicesQuery, [patientId]);
    const additionalServices = additionalServicesResult.rows;

    // 5. Obtener evolución del odontograma con observaciones
    const evolutionQuery = `
      SELECT
        eo.evolution_id,
        eo.condition_status,
        eo.original_condition_name,
        eo.clinical_observation,
        eo.registered_date,
        tp.tooth_number,
        tp.tooth_name,
        ts.surface_code,
        c.consultation_id,
        u.first_name || ' ' || u.last_name AS dentist_name
      FROM evolution_odontogram eo
      INNER JOIN tooth_positions tp ON eo.tooth_position_id = tp.tooth_position_id
      LEFT JOIN tooth_surfaces ts ON eo.tooth_surface_id = ts.tooth_surface_id
      LEFT JOIN consultations c ON eo.consultation_id = c.consultation_id
      LEFT JOIN dentists d ON eo.registered_by_dentist_id = d.dentist_id
      LEFT JOIN users u ON d.user_id = u.user_id
      WHERE eo.patient_id = $1 AND eo.status = 'active'
      ORDER BY eo.registered_date DESC
    `;
    const evolutionResult = await pool.query(evolutionQuery, [patientId]);
    const evolutionRecords = evolutionResult.rows;

    // 6. Obtener sub-procedimientos seleccionados (desde diagnóstico definitivo)
    const subProceduresQuery = `
      SELECT
        ddc.definitive_condition_id,
        ddc.tooth_number,
        ddc.condition_label,
        ddc.cie10_code,
        ddc.surfaces,
        ddc.price AS condition_price,
        ddc.notes AS condition_notes,
        ddc.procedure_price,
        ocp.condition_procedure_id AS sub_procedure_id,
        ocp.procedure_name AS sub_procedure_name,
        ocp.procedure_code AS sub_procedure_code,
        ocp.specialty,
        ocp.observations AS sub_procedure_observations,
        ts.surface_code,
        c.consultation_id,
        c.consultation_date,
        u.first_name || ' ' || u.last_name AS dentist_name
      FROM definitive_diagnosis_conditions ddc
      INNER JOIN consultations c ON ddc.consultation_id = c.consultation_id
      LEFT JOIN odontogram_condition_procedures ocp ON ddc.selected_procedure_id = ocp.condition_procedure_id
      LEFT JOIN tooth_surfaces ts ON ddc.tooth_surface_id = ts.tooth_surface_id
      LEFT JOIN dentists d ON c.dentist_id = d.dentist_id
      LEFT JOIN users u ON d.user_id = u.user_id
      WHERE c.patient_id = $1 AND ddc.status = 'active'
      ORDER BY c.consultation_date DESC, ddc.tooth_number
    `;
    const subProceduresResult = await pool.query(subProceduresQuery, [patientId]);
    const subProcedures = subProceduresResult.rows;

    // Determinar si tiene atención integral
    // Incluir consultations.length > 0 para mostrar historial cuando hay al menos 1 consulta
    const hasIntegralAttention =
      consultations.length > 0 ||
      additionalServices.length > 0 ||
      odontogramProcedures.length > 0 ||
      procedureHistory.length > 0 ||
      subProcedures.length > 0;

    res.json({
      success: true,
      data: {
        patient_id: patientId,
        has_integral_attention: hasIntegralAttention,
        total_consultations: consultations.length,

        // Consultas con texto manual
        consultations: consultations.map(c => ({
          consultation_id: c.consultation_id,
          consultation_date: c.consultation_date,
          dentist_name: c.dentist_name,
          chief_complaint: c.chief_complaint,
          diagnosis: c.diagnosis,
          treatment_plan_text: c.treatment_plan_text,
          treatment_performed: c.treatment_performed,
          notes: c.notes,
          recommendations: c.recommendations
        })),

        // Procedimientos del odontograma
        odontogram_procedures: odontogramProcedures.map(p => ({
          id: p.odontogram_treatment_id,
          procedure_name: p.procedure_name,
          procedure_code: p.procedure_code,
          procedure_category: p.procedure_category,
          tooth_number: p.tooth_number,
          tooth_name: p.tooth_name,
          surface: p.surface_code || p.surface_name,
          treatment_status: p.treatment_status,
          findings: p.findings,
          notes: p.treatment_notes,
          treatment_date: p.treatment_date,
          consultation_date: p.consultation_date,
          dentist_name: p.dentist_name
        })),

        // Historial de procedimientos con notas clínicas
        procedure_history: procedureHistory.map(ph => ({
          id: ph.procedure_history_id,
          procedure_name: ph.procedure_name,
          procedure_code: ph.procedure_code,
          procedure_type: ph.procedure_type,
          procedure_status: ph.procedure_status,
          tooth_number: ph.tooth_number,
          tooth_name: ph.tooth_name,
          surface: ph.surface_code,
          clinical_notes: ph.clinical_notes,
          complications: ph.complications,
          next_steps: ph.next_steps,
          performed_date: ph.performed_date,
          consultation_date: ph.consultation_date,
          dentist_name: ph.dentist_name
        })),

        // Evolución del odontograma
        evolution_records: evolutionRecords.map(e => ({
          id: e.evolution_id,
          condition_status: e.condition_status,
          condition_name: e.original_condition_name,
          clinical_observation: e.clinical_observation,
          tooth_number: e.tooth_number,
          tooth_name: e.tooth_name,
          surface: e.surface_code,
          registered_date: e.registered_date,
          dentist_name: e.dentist_name
        })),

        // Sub-procedimientos seleccionados (diagnóstico definitivo)
        sub_procedures: subProcedures.map(sp => ({
          id: sp.definitive_condition_id,
          sub_procedure_id: sp.sub_procedure_id,
          sub_procedure_name: sp.sub_procedure_name,
          sub_procedure_code: sp.sub_procedure_code,
          specialty: sp.specialty,
          tooth_number: sp.tooth_number,
          surface: sp.surface_code,
          condition_label: sp.condition_label,
          cie10_code: sp.cie10_code,
          condition_price: sp.condition_price,
          procedure_price: sp.procedure_price,
          notes: sp.condition_notes,
          observations: sp.sub_procedure_observations,
          consultation_id: sp.consultation_id,
          consultation_date: sp.consultation_date,
          dentist_name: sp.dentist_name
        })),

        // Servicios adicionales (ortodoncia, implantes, prótesis)
        additional_services: additionalServices,

        // Resumen por tipo de servicio
        services_summary: {
          ortodoncia: additionalServices.filter(s => s.service_type === 'ortodoncia').length,
          implantes: additionalServices.filter(s => s.service_type === 'implantes').length,
          protesis: additionalServices.filter(s => s.service_type === 'protesis').length
        },

        // Contadores
        counts: {
          consultations: consultations.length,
          odontogram_procedures: odontogramProcedures.length,
          procedure_history: procedureHistory.length,
          evolution_records: evolutionRecords.length,
          sub_procedures: subProcedures.length,
          additional_services: additionalServices.length
        }
      }
    });
  } catch (error) {
    console.error('Error al obtener datos integrales del paciente:', error);
    res.status(500).json({
      success: false,
      error: 'Error al obtener datos integrales del paciente'
    });
  }
};

/**
 * Obtener pacientes accesibles por sede
 * Retorna pacientes que:
 * 1. Están registrados en la sede (branch_id = sede)
 * 2. Tienen citas (pasadas o futuras) en la sede
 *
 * Esto permite que un recepcionista vea pacientes que se atienden en su sede
 * aunque estén registrados en otra sede.
 */
const getAccessiblePatients = async (req, res) => {
  try {
    const { branch_id, search, page = 1, limit = 1000 } = req.query;
    const userRole = req.user?.role_name || req.user?.role;
    const userBranchId = branch_id ? parseInt(branch_id) : req.user?.branch_id;

    // Super admin ve todos los pacientes
    if (userRole === 'Super Administrador' || userRole === 'super_admin') {
      const filters = {
        search: search || null,
        limit: parseInt(limit),
        offset: (parseInt(page) - 1) * parseInt(limit)
      };

      const [patients, total] = await Promise.all([
        getAllPatients(filters),
        countPatients(filters)
      ]);

      return res.json({
        success: true,
        data: patients,
        pagination: {
          total,
          page: parseInt(page),
          limit: parseInt(limit),
          totalPages: Math.ceil(total / parseInt(limit))
        }
      });
    }

    // Para otros roles, obtener pacientes accesibles por sede
    if (!userBranchId) {
      return res.status(400).json({
        success: false,
        error: 'Se requiere branch_id para filtrar pacientes'
      });
    }

    // Query que obtiene pacientes registrados en la sede O con citas en la sede
    let query = `
      SELECT DISTINCT p.*
      FROM patients p
      WHERE p.status = 'active'
        AND (
          -- Pacientes registrados en esta sede
          p.branch_id = $1
          OR
          -- Pacientes con citas en esta sede (últimos 24 meses o futuras)
          p.patient_id IN (
            SELECT DISTINCT a.patient_id
            FROM appointments a
            WHERE a.branch_id = $1
              AND a.status = 'active'
              AND a.appointment_date >= CURRENT_DATE - INTERVAL '24 months'
          )
        )
    `;

    const queryParams = [userBranchId];

    // Agregar búsqueda si existe
    if (search && search.trim() !== '') {
      query += `
        AND (
          LOWER(p.first_name) LIKE $2
          OR LOWER(p.last_name) LIKE $2
          OR p.identification_number LIKE $2
          OR LOWER(p.first_name || ' ' || p.last_name) LIKE $2
        )
      `;
      queryParams.push(`%${search.toLowerCase().trim()}%`);
    }

    query += ` ORDER BY p.last_name, p.first_name`;

    // Agregar paginación
    const offsetVal = (parseInt(page) - 1) * parseInt(limit);
    query += ` LIMIT $${queryParams.length + 1} OFFSET $${queryParams.length + 2}`;
    queryParams.push(parseInt(limit), offsetVal);

    const result = await pool.query(query, queryParams);

    // Query para contar total
    let countQuery = `
      SELECT COUNT(DISTINCT p.patient_id) as total
      FROM patients p
      WHERE p.status = 'active'
        AND (
          p.branch_id = $1
          OR
          p.patient_id IN (
            SELECT DISTINCT a.patient_id
            FROM appointments a
            WHERE a.branch_id = $1
              AND a.status = 'active'
              AND a.appointment_date >= CURRENT_DATE - INTERVAL '24 months'
          )
        )
    `;

    const countParams = [userBranchId];

    if (search && search.trim() !== '') {
      countQuery += `
        AND (
          LOWER(p.first_name) LIKE $2
          OR LOWER(p.last_name) LIKE $2
          OR p.identification_number LIKE $2
          OR LOWER(p.first_name || ' ' || p.last_name) LIKE $2
        )
      `;
      countParams.push(`%${search.toLowerCase().trim()}%`);
    }

    const countResult = await pool.query(countQuery, countParams);
    const total = parseInt(countResult.rows[0].total);

    res.json({
      success: true,
      data: result.rows,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(total / parseInt(limit))
      },
      meta: {
        branch_id: userBranchId,
        includes_patients_with_appointments: true
      }
    });

  } catch (error) {
    console.error('Error al obtener pacientes accesibles:', error);
    res.status(500).json({
      success: false,
      error: 'Error al obtener pacientes accesibles'
    });
  }
};

/**
 * Buscar paciente por DNI
 * Endpoint para buscar si un paciente existe en el sistema por su número de documento
 * Útil para el laboratorio de imágenes al crear solicitudes
 */
const searchPatientByDni = async (req, res) => {
  try {
    const { dni } = req.params;

    // Validar que el DNI tenga 8 dígitos
    if (!dni || dni.length !== 8 || !/^\d+$/.test(dni)) {
      return res.status(400).json({
        success: false,
        error: 'El DNI debe tener exactamente 8 dígitos numéricos'
      });
    }

    const patient = await getPatientByDni(dni);

    if (!patient) {
      return res.json({
        success: true,
        found: false,
        message: 'Paciente no encontrado en el sistema',
        data: null
      });
    }

    // Calcular edad si tiene fecha de nacimiento
    let edad = null;
    if (patient.birth_date) {
      const birthDate = new Date(patient.birth_date);
      const today = new Date();
      edad = today.getFullYear() - birthDate.getFullYear();
      const monthDiff = today.getMonth() - birthDate.getMonth();
      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
        edad--;
      }
    }

    res.json({
      success: true,
      found: true,
      message: 'Paciente encontrado en MyDent',
      data: {
        patient_id: patient.patient_id,
        dni: patient.dni,
        nombres: patient.first_name,
        apellidos: patient.last_name,
        email: patient.email || '',
        telefono: patient.phone || patient.mobile || '',
        edad: edad ? edad.toString() : '',
        branch_id: patient.branch_id,
        branch_name: patient.branch_name
      }
    });
  } catch (error) {
    console.error('Error al buscar paciente por DNI:', error);
    res.status(500).json({
      success: false,
      error: 'Error al buscar paciente'
    });
  }
};

module.exports = {
  getPatients,
  getPatient,
  getPatientCompleteData,
  getPatientIntegralData,
  createNewPatient,
  updateExistingPatient,
  deleteExistingPatient,
  getAccessiblePatients,
  searchPatientByDni
};
