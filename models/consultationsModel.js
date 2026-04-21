const pool = require('../config/db');

const getAllConsultations = async (filters = {}) => {
  let query = `
    SELECT
      c.*,
      p.first_name || ' ' || p.last_name as patient_name,
      p.identification_number,
      u.first_name || ' ' || u.last_name as dentist_name,
      b.branch_name,
      a.appointment_id as has_appointment
    FROM consultations c
    INNER JOIN patients p ON c.patient_id = p.patient_id
    INNER JOIN dentists d ON c.dentist_id = d.dentist_id
    INNER JOIN users u ON d.user_id = u.user_id
    INNER JOIN branches b ON c.branch_id = b.branch_id
    LEFT JOIN appointments a ON c.appointment_id = a.appointment_id
    WHERE c.status = 'active'
  `;

  const params = [];
  let paramIndex = 1;

  if (filters.patient_id) {
    query += ` AND c.patient_id = $${paramIndex}`;
    params.push(filters.patient_id);
    paramIndex++;
  }

  if (filters.dentist_id) {
    query += ` AND c.dentist_id = $${paramIndex}`;
    params.push(filters.dentist_id);
    paramIndex++;
  }

  if (filters.branch_id) {
    query += ` AND c.branch_id = $${paramIndex}`;
    params.push(filters.branch_id);
    paramIndex++;
  }

  if (filters.date_from) {
    query += ` AND c.consultation_date >= $${paramIndex}`;
    params.push(filters.date_from);
    paramIndex++;
  }

  if (filters.date_to) {
    query += ` AND c.consultation_date <= $${paramIndex}`;
    params.push(filters.date_to);
    paramIndex++;
  }

  query += ` ORDER BY c.consultation_date DESC, c.consultation_time DESC`;

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

const getConsultationById = async (consultationId) => {
  const consultationQuery = `
    SELECT
      c.*,
      p.first_name || ' ' || p.last_name as patient_name,
      p.identification_number,
      p.birth_date,
      p.email as patient_email,
      p.phone as patient_phone,
      u.first_name || ' ' || u.last_name as dentist_name,
      b.branch_name
    FROM consultations c
    INNER JOIN patients p ON c.patient_id = p.patient_id
    INNER JOIN dentists d ON c.dentist_id = d.dentist_id
    INNER JOIN users u ON d.user_id = u.user_id
    INNER JOIN branches b ON c.branch_id = b.branch_id
    WHERE c.consultation_id = $1 AND c.status = 'active'
  `;

  const diagnosticsQuery = `
    SELECT
      dc.*,
      dopt.diagnosis_name,
      dopt.diagnosis_code,
      dopt.diagnosis_category
    FROM diagnostic_conditions dc
    LEFT JOIN diagnosis_options dopt ON dc.diagnosis_option_id = dopt.diagnosis_option_id
    WHERE dc.consultation_id = $1 AND dc.status = 'active'
    ORDER BY dc.diagnostic_condition_id ASC
  `;

  const [consultationResult, diagnosticsResult] = await Promise.all([
    pool.query(consultationQuery, [consultationId]),
    pool.query(diagnosticsQuery, [consultationId])
  ]);

  if (consultationResult.rows.length === 0) {
    return null;
  }

  return {
    ...consultationResult.rows[0],
    diagnostics: diagnosticsResult.rows
  };
};

const createConsultation = async (consultationData) => {
  const {
    patient_id,
    dentist_id,
    branch_id,
    appointment_id,
    consultation_date,
    consultation_time,
    chief_complaint,
    present_illness,
    vital_signs,
    physical_examination,
    general_condition,
    extraoral_exam,
    extraoral_exam_images,
    intraoral_exam,
    intraoral_exam_images,
    diagnosis,
    treatment_plan,
    treatment_performed,
    prescriptions_given,
    recommendations,
    next_visit_date,
    notes,
    user_id_registration
  } = consultationData;

  const query = `
    INSERT INTO consultations (
      patient_id, dentist_id, branch_id, appointment_id, consultation_date,
      consultation_time, chief_complaint, present_illness, vital_signs,
      physical_examination, general_condition, extraoral_exam, extraoral_exam_images,
      intraoral_exam, intraoral_exam_images, diagnosis, treatment_plan, treatment_performed,
      prescriptions_given, recommendations, next_visit_date, notes, user_id_registration
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23)
    RETURNING *
  `;

  const values = [
    patient_id,
    dentist_id,
    branch_id,
    appointment_id || null,
    consultation_date,
    consultation_time,
    chief_complaint || null,
    present_illness || null,
    vital_signs || null,
    physical_examination || null,
    general_condition || null,
    extraoral_exam || null,
    extraoral_exam_images ? JSON.stringify(extraoral_exam_images) : '[]',
    intraoral_exam || null,
    intraoral_exam_images ? JSON.stringify(intraoral_exam_images) : '[]',
    diagnosis || null,
    treatment_plan || null,
    treatment_performed || null,
    prescriptions_given || null,
    recommendations || null,
    next_visit_date || null,
    notes || null,
    user_id_registration
  ];

  const result = await pool.query(query, values);
  return result.rows[0];
};

const updateConsultation = async (consultationId, consultationData) => {
  const fields = [];
  const values = [];
  let paramIndex = 1;

  Object.keys(consultationData).forEach((key) => {
    if (key !== 'user_id_modification' && consultationData[key] !== undefined) {
      fields.push(`${key} = $${paramIndex}`);
      values.push(consultationData[key]);
      paramIndex++;
    }
  });

  if (fields.length === 0) {
    throw new Error('No hay campos para actualizar');
  }

  fields.push(`user_id_modification = $${paramIndex}`);
  values.push(consultationData.user_id_modification);
  paramIndex++;

  fields.push(`date_time_modification = CURRENT_TIMESTAMP`);

  values.push(consultationId);

  const query = `
    UPDATE consultations SET ${fields.join(', ')}
    WHERE consultation_id = $${paramIndex} AND status = 'active'
    RETURNING *
  `;

  const result = await pool.query(query, values);
  return result.rows.length > 0 ? result.rows[0] : null;
};

/**
 * Busca una consulta por appointment_id
 */
const findByAppointmentId = async (appointmentId) => {
  if (!appointmentId) return null;

  const query = `
    SELECT * FROM consultations
    WHERE appointment_id = $1 AND status = 'active'
    LIMIT 1
  `;

  const result = await pool.query(query, [appointmentId]);
  return result.rows.length > 0 ? result.rows[0] : null;
};

/**
 * Upsert de consulta: Si existe una consulta con el mismo consultation_id o appointment_id, la actualiza.
 * Si no existe, crea una nueva.
 *
 * IMPORTANTE: Prioridad de búsqueda:
 * 1. consultation_id (si viene, actualiza esa consulta específica)
 * 2. appointment_id (si viene, busca consulta vinculada a esa cita)
 * 3. Si no hay ninguno, crea una nueva consulta
 */
const upsertConsultation = async (consultationData) => {
  const {
    consultation_id, // NUEVO: Permite actualizar una consulta específica
    patient_id,
    dentist_id,
    branch_id,
    appointment_id,
    consultation_date,
    consultation_time,
    chief_complaint,
    present_illness,
    vital_signs,
    physical_examination,
    general_condition,
    extraoral_exam,
    extraoral_exam_images,
    intraoral_exam,
    intraoral_exam_images,
    diagnosis,
    treatment_plan,
    treatment_performed,
    prescriptions_given,
    recommendations,
    next_visit_date,
    notes,
    user_id_registration
  } = consultationData;

  // NUEVO: Si viene consultation_id, actualizar esa consulta directamente
  if (consultation_id) {
    const existingById = await getConsultationById(consultation_id);
    if (existingById) {
      const updateQuery = `
        UPDATE consultations SET
          chief_complaint = COALESCE($1, chief_complaint),
          present_illness = COALESCE($2, present_illness),
          vital_signs = COALESCE($3, vital_signs),
          physical_examination = COALESCE($4, physical_examination),
          general_condition = COALESCE($5, general_condition),
          extraoral_exam = COALESCE($6, extraoral_exam),
          extraoral_exam_images = COALESCE($7, extraoral_exam_images),
          intraoral_exam = COALESCE($8, intraoral_exam),
          intraoral_exam_images = COALESCE($9, intraoral_exam_images),
          diagnosis = COALESCE($10, diagnosis),
          treatment_plan = COALESCE($11, treatment_plan),
          treatment_performed = COALESCE($12, treatment_performed),
          prescriptions_given = COALESCE($13, prescriptions_given),
          recommendations = COALESCE($14, recommendations),
          next_visit_date = COALESCE($15, next_visit_date),
          notes = COALESCE($16, notes),
          user_id_modification = $17,
          date_time_modification = CURRENT_TIMESTAMP
        WHERE consultation_id = $18 AND status = 'active'
        RETURNING *
      `;

      const updateValues = [
        chief_complaint || null,
        present_illness || null,
        vital_signs || null,
        physical_examination || null,
        general_condition || null,
        extraoral_exam || null,
        extraoral_exam_images ? JSON.stringify(extraoral_exam_images) : null,
        intraoral_exam || null,
        intraoral_exam_images ? JSON.stringify(intraoral_exam_images) : null,
        diagnosis || null,
        treatment_plan || null,
        treatment_performed || null,
        prescriptions_given || null,
        recommendations || null,
        next_visit_date || null,
        notes || null,
        user_id_registration,
        consultation_id
      ];

      const result = await pool.query(updateQuery, updateValues);
      if (result.rows.length > 0) {
        return { ...result.rows[0], wasUpdated: true };
      }
    }
  }

  // Si hay appointment_id, buscar consulta existente
  if (appointment_id) {
    const existingConsultation = await findByAppointmentId(appointment_id);

    if (existingConsultation) {
      // Actualizar la consulta existente
      const updateQuery = `
        UPDATE consultations SET
          chief_complaint = COALESCE($1, chief_complaint),
          present_illness = COALESCE($2, present_illness),
          vital_signs = COALESCE($3, vital_signs),
          physical_examination = COALESCE($4, physical_examination),
          general_condition = COALESCE($5, general_condition),
          extraoral_exam = COALESCE($6, extraoral_exam),
          extraoral_exam_images = COALESCE($7, extraoral_exam_images),
          intraoral_exam = COALESCE($8, intraoral_exam),
          intraoral_exam_images = COALESCE($9, intraoral_exam_images),
          diagnosis = COALESCE($10, diagnosis),
          treatment_plan = COALESCE($11, treatment_plan),
          treatment_performed = COALESCE($12, treatment_performed),
          prescriptions_given = COALESCE($13, prescriptions_given),
          recommendations = COALESCE($14, recommendations),
          next_visit_date = COALESCE($15, next_visit_date),
          notes = COALESCE($16, notes),
          user_id_modification = $17,
          date_time_modification = CURRENT_TIMESTAMP
        WHERE consultation_id = $18 AND status = 'active'
        RETURNING *
      `;

      const updateValues = [
        chief_complaint || null,
        present_illness || null,
        vital_signs || null,
        physical_examination || null,
        general_condition || null,
        extraoral_exam || null,
        extraoral_exam_images ? JSON.stringify(extraoral_exam_images) : null,
        intraoral_exam || null,
        intraoral_exam_images ? JSON.stringify(intraoral_exam_images) : null,
        diagnosis || null,
        treatment_plan || null,
        treatment_performed || null,
        prescriptions_given || null,
        recommendations || null,
        next_visit_date || null,
        notes || null,
        user_id_registration,
        existingConsultation.consultation_id
      ];

      const result = await pool.query(updateQuery, updateValues);
      return { ...result.rows[0], wasUpdated: true };
    }
  }

  // No existe consulta previa, crear nueva
  const insertQuery = `
    INSERT INTO consultations (
      patient_id, dentist_id, branch_id, appointment_id, consultation_date,
      consultation_time, chief_complaint, present_illness, vital_signs,
      physical_examination, general_condition, extraoral_exam, extraoral_exam_images,
      intraoral_exam, intraoral_exam_images, diagnosis, treatment_plan, treatment_performed,
      prescriptions_given, recommendations, next_visit_date, notes, user_id_registration
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23)
    RETURNING *
  `;

  const insertValues = [
    patient_id,
    dentist_id,
    branch_id,
    appointment_id || null,
    consultation_date,
    consultation_time,
    chief_complaint || null,
    present_illness || null,
    vital_signs || null,
    physical_examination || null,
    general_condition || null,
    extraoral_exam || null,
    extraoral_exam_images ? JSON.stringify(extraoral_exam_images) : '[]',
    intraoral_exam || null,
    intraoral_exam_images ? JSON.stringify(intraoral_exam_images) : '[]',
    diagnosis || null,
    treatment_plan || null,
    treatment_performed || null,
    prescriptions_given || null,
    recommendations || null,
    next_visit_date || null,
    notes || null,
    user_id_registration
  ];

  const result = await pool.query(insertQuery, insertValues);
  return { ...result.rows[0], wasUpdated: false };
};

const deleteConsultation = async (consultationId, userId) => {
  const query = `
    UPDATE consultations SET
      status = 'inactive',
      user_id_modification = $1,
      date_time_modification = CURRENT_TIMESTAMP
    WHERE consultation_id = $2 AND status = 'active'
    RETURNING consultation_id
  `;

  const result = await pool.query(query, [userId, consultationId]);
  return result.rowCount > 0;
};

const countConsultations = async (filters = {}) => {
  let query = `SELECT COUNT(*) as total FROM consultations c WHERE c.status = 'active'`;
  const params = [];
  let paramIndex = 1;

  if (filters.patient_id) {
    query += ` AND c.patient_id = $${paramIndex}`;
    params.push(filters.patient_id);
    paramIndex++;
  }

  if (filters.dentist_id) {
    query += ` AND c.dentist_id = $${paramIndex}`;
    params.push(filters.dentist_id);
    paramIndex++;
  }

  if (filters.branch_id) {
    query += ` AND c.branch_id = $${paramIndex}`;
    params.push(filters.branch_id);
    paramIndex++;
  }

  if (filters.date_from) {
    query += ` AND c.consultation_date >= $${paramIndex}`;
    params.push(filters.date_from);
    paramIndex++;
  }

  if (filters.date_to) {
    query += ` AND c.consultation_date <= $${paramIndex}`;
    params.push(filters.date_to);
  }

  const result = await pool.query(query, params);
  return parseInt(result.rows[0].total);
};

// Condiciones diagnósticas
const addDiagnosticCondition = async (conditionData, userId) => {
  const {
    consultation_id,
    diagnosis_option_id,
    condition_description,
    severity,
    notes
  } = conditionData;

  const query = `
    INSERT INTO diagnostic_conditions (
      consultation_id, diagnosis_option_id, condition_description,
      severity, notes, user_id_registration
    ) VALUES ($1, $2, $3, $4, $5, $6)
    RETURNING *
  `;

  const values = [
    consultation_id,
    diagnosis_option_id || null,
    condition_description,
    severity || null,
    notes || null,
    userId
  ];

  const result = await pool.query(query, values);
  return result.rows[0];
};

const deleteDiagnosticCondition = async (conditionId, userId) => {
  const query = `
    UPDATE diagnostic_conditions SET
      status = 'inactive',
      user_id_modification = $1,
      date_time_modification = CURRENT_TIMESTAMP
    WHERE diagnostic_condition_id = $2 AND status = 'active'
    RETURNING diagnostic_condition_id
  `;

  const result = await pool.query(query, [userId, conditionId]);
  return result.rowCount > 0;
};

// Salas de consulta
const getAllConsultationRooms = async (branchId = null) => {
  let query = `
    SELECT
      cr.*,
      b.branch_name
    FROM consultation_rooms cr
    INNER JOIN branches b ON cr.branch_id = b.branch_id
    WHERE cr.status = 'active'
  `;

  const params = [];
  if (branchId) {
    query += ` AND cr.branch_id = $1`;
    params.push(branchId);
  }

  query += ` ORDER BY b.branch_name ASC, cr.room_name ASC`;

  const result = await pool.query(query, params);
  return result.rows;
};

const getConsultationRoomById = async (roomId) => {
  const query = `
    SELECT
      cr.*,
      b.branch_name
    FROM consultation_rooms cr
    INNER JOIN branches b ON cr.branch_id = b.branch_id
    WHERE cr.consultation_room_id = $1 AND cr.status = 'active'
  `;

  const result = await pool.query(query, [roomId]);
  return result.rows.length > 0 ? result.rows[0] : null;
};

const createConsultationRoom = async (roomData, userId) => {
  const {
    branch_id,
    room_name,
    room_code,
    floor,
    capacity,
    equipment_description,
    is_active
  } = roomData;

  const query = `
    INSERT INTO consultation_rooms (
      branch_id, room_name, room_code, floor, capacity,
      equipment_description, is_active, user_id_registration
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    RETURNING *
  `;

  const values = [
    branch_id,
    room_name,
    room_code || null,
    floor || null,
    capacity || 1,
    equipment_description || null,
    is_active !== undefined ? is_active : true,
    userId
  ];

  const result = await pool.query(query, values);
  return result.rows[0];
};

const updateConsultationRoom = async (roomId, roomData, userId) => {
  const {
    room_name,
    room_code,
    floor,
    capacity,
    equipment_description,
    is_active
  } = roomData;

  const query = `
    UPDATE consultation_rooms SET
      room_name = COALESCE($1, room_name),
      room_code = COALESCE($2, room_code),
      floor = COALESCE($3, floor),
      capacity = COALESCE($4, capacity),
      equipment_description = COALESCE($5, equipment_description),
      is_active = COALESCE($6, is_active),
      user_id_modification = $7,
      date_time_modification = CURRENT_TIMESTAMP
    WHERE consultation_room_id = $8 AND status = 'active'
    RETURNING *
  `;

  const values = [
    room_name,
    room_code,
    floor,
    capacity,
    equipment_description,
    is_active,
    userId,
    roomId
  ];

  const result = await pool.query(query, values);
  return result.rows.length > 0 ? result.rows[0] : null;
};

const deleteConsultationRoom = async (roomId, userId) => {
  const query = `
    UPDATE consultation_rooms SET
      status = 'inactive',
      user_id_modification = $1,
      date_time_modification = CURRENT_TIMESTAMP
    WHERE consultation_room_id = $2 AND status = 'active'
    RETURNING consultation_room_id
  `;

  const result = await pool.query(query, [userId, roomId]);
  return result.rowCount > 0;
};

// ============================================================================
// FUNCIONES PARA MANEJO DE IMAGENES DEL EXAMEN CLINICO
// ============================================================================

/**
 * Agrega imagenes al examen extraoral de una consulta
 * @param {number} consultationId - ID de la consulta
 * @param {string[]} imagePaths - Array de rutas de imagenes
 * @param {number} userId - ID del usuario que modifica
 */
const addExtraoralImages = async (consultationId, imagePaths, userId) => {
  const query = `
    UPDATE consultations SET
      extraoral_exam_images = COALESCE(extraoral_exam_images, '[]'::jsonb) || $1::jsonb,
      user_id_modification = $2,
      date_time_modification = CURRENT_TIMESTAMP
    WHERE consultation_id = $3 AND status = 'active'
    RETURNING consultation_id, extraoral_exam_images
  `;

  const result = await pool.query(query, [
    JSON.stringify(imagePaths),
    userId,
    consultationId
  ]);

  return result.rows.length > 0 ? result.rows[0] : null;
};

/**
 * Agrega imagenes al examen intraoral de una consulta
 * @param {number} consultationId - ID de la consulta
 * @param {string[]} imagePaths - Array de rutas de imagenes
 * @param {number} userId - ID del usuario que modifica
 */
const addIntraoralImages = async (consultationId, imagePaths, userId) => {
  const query = `
    UPDATE consultations SET
      intraoral_exam_images = COALESCE(intraoral_exam_images, '[]'::jsonb) || $1::jsonb,
      user_id_modification = $2,
      date_time_modification = CURRENT_TIMESTAMP
    WHERE consultation_id = $3 AND status = 'active'
    RETURNING consultation_id, intraoral_exam_images
  `;

  const result = await pool.query(query, [
    JSON.stringify(imagePaths),
    userId,
    consultationId
  ]);

  return result.rows.length > 0 ? result.rows[0] : null;
};

/**
 * Elimina una imagen del examen extraoral
 * @param {number} consultationId - ID de la consulta
 * @param {string} imagePath - Ruta de la imagen a eliminar
 * @param {number} userId - ID del usuario que modifica
 */
const removeExtraoralImage = async (consultationId, imagePath, userId) => {
  const query = `
    UPDATE consultations SET
      extraoral_exam_images = (
        SELECT jsonb_agg(elem)
        FROM jsonb_array_elements(COALESCE(extraoral_exam_images, '[]'::jsonb)) AS elem
        WHERE elem::text != $1::text
      ),
      user_id_modification = $2,
      date_time_modification = CURRENT_TIMESTAMP
    WHERE consultation_id = $3 AND status = 'active'
    RETURNING consultation_id, extraoral_exam_images
  `;

  const result = await pool.query(query, [
    JSON.stringify(imagePath),
    userId,
    consultationId
  ]);

  return result.rows.length > 0 ? result.rows[0] : null;
};

/**
 * Elimina una imagen del examen intraoral
 * @param {number} consultationId - ID de la consulta
 * @param {string} imagePath - Ruta de la imagen a eliminar
 * @param {number} userId - ID del usuario que modifica
 */
const removeIntraoralImage = async (consultationId, imagePath, userId) => {
  const query = `
    UPDATE consultations SET
      intraoral_exam_images = (
        SELECT jsonb_agg(elem)
        FROM jsonb_array_elements(COALESCE(intraoral_exam_images, '[]'::jsonb)) AS elem
        WHERE elem::text != $1::text
      ),
      user_id_modification = $2,
      date_time_modification = CURRENT_TIMESTAMP
    WHERE consultation_id = $3 AND status = 'active'
    RETURNING consultation_id, intraoral_exam_images
  `;

  const result = await pool.query(query, [
    JSON.stringify(imagePath),
    userId,
    consultationId
  ]);

  return result.rows.length > 0 ? result.rows[0] : null;
};

/**
 * Obtiene las imagenes de examen clinico de una consulta
 * @param {number} consultationId - ID de la consulta
 */
const getClinicalExamImages = async (consultationId) => {
  const query = `
    SELECT
      consultation_id,
      extraoral_exam_images,
      intraoral_exam_images
    FROM consultations
    WHERE consultation_id = $1 AND status = 'active'
  `;

  const result = await pool.query(query, [consultationId]);
  return result.rows.length > 0 ? result.rows[0] : null;
};

// ============================================================================
// FUNCIONES PARA DIAGNÓSTICO DEFINITIVO
// ============================================================================

/**
 * Obtiene todas las condiciones del diagnóstico definitivo de una consulta
 * Incluye datos completos de diente, superficies, condicion presuntiva del odontograma
 * y procedimientos sugeridos desde odontogram_condition_procedures
 * @param {number} consultationId - ID de la consulta
 */
const getDefinitiveDiagnosisConditions = async (consultationId) => {
  const query = `
    SELECT
      ddc.definitive_condition_id,
      ddc.consultation_id,
      ddc.presumptive_condition_id,
      ddc.odontogram_condition_id,
      ddc.tooth_position_id,
      ddc.tooth_number,
      ddc.tooth_surface_id,
      ddc.dental_condition_id,
      ddc.condition_label,
      ddc.cie10_code,
      ddc.surfaces,
      ddc.price,
      ddc.notes,
      ddc.is_modified_from_presumptive,
      ddc.modification_reason,
      ddc.status,
      ddc.user_id_registration,
      ddc.date_time_registration,
      -- Nuevos campos para procedimiento seleccionado
      ddc.selected_procedure_id,
      ddc.procedure_price,
      -- Datos del diente desde tooth_positions
      tp.tooth_name,
      tp.quadrant,
      tp.tooth_type,
      tp.is_adult,
      -- Datos de la condicion dental
      odc.condition_code,
      odc.condition_name,
      odc.category as condition_category,
      odc.symbol_type,
      odc.color_type,
      -- Precio del primer procedimiento (FUENTE ÚNICA DE VERDAD)
      (
        SELECT COALESCE(ocp_price.price_without_plan, 0)
        FROM odontogram_condition_procedures ocp_price
        WHERE ocp_price.odontogram_condition_id = ddc.dental_condition_id
        AND ocp_price.status = 'active'
        ORDER BY ocp_price.display_order, ocp_price.condition_procedure_id
        LIMIT 1
      ) as condition_price_base,
      odc.cie10_code as condition_cie10_code,
      -- Datos de la superficie principal
      ts.surface_code,
      ts.surface_name,
      -- Datos de la condicion presuntiva (odontograma) si existe
      oc.dental_condition_id as presumptive_dental_condition_id,
      oc.tooth_surface_id as presumptive_tooth_surface_id,
      -- Precio presuntivo: usar el del procedimiento (FUENTE ÚNICA), con fallback
      COALESCE(
        (
          SELECT ocp_pres.price_without_plan
          FROM odontogram_condition_procedures ocp_pres
          WHERE ocp_pres.odontogram_condition_id = oc.dental_condition_id
          AND ocp_pres.status = 'active'
          ORDER BY ocp_pres.display_order, ocp_pres.condition_procedure_id
          LIMIT 1
        ),
        oc.price,
        0
      ) as presumptive_price,
      oc.description as presumptive_description,
      -- Datos del procedimiento seleccionado
      sp.procedure_name as selected_procedure_name,
      sp.procedure_code as selected_procedure_code,
      sp.price_without_plan as selected_procedure_price_base,
      sp.price_plan_personal as selected_procedure_price_personal,
      sp.price_plan_familiar as selected_procedure_price_familiar,
      sp.price_plan_platinium as selected_procedure_price_platinium,
      sp.price_plan_oro as selected_procedure_price_oro,
      -- Array de superficies desde la tabla intermedia
      (
        SELECT COALESCE(ARRAY_AGG(ts2.surface_code ORDER BY ts2.surface_code), ARRAY[]::varchar[])
        FROM definitive_diagnosis_condition_surfaces ddcs
        JOIN tooth_surfaces ts2 ON ddcs.tooth_surface_id = ts2.tooth_surface_id
        WHERE ddcs.definitive_condition_id = ddc.definitive_condition_id
        AND ddcs.status = 'active'
      ) as surfaces_array,
      -- Array de procedimientos sugeridos desde odontogram_condition_procedures
      (
        SELECT COALESCE(
          json_agg(
            json_build_object(
              'procedure_id', ocp.condition_procedure_id,
              'procedure_name', ocp.procedure_name,
              'procedure_code', ocp.procedure_code,
              'price_without_plan', ocp.price_without_plan,
              'price_plan_personal', ocp.price_plan_personal,
              'price_plan_familiar', ocp.price_plan_familiar,
              'price_plan_platinium', ocp.price_plan_platinium,
              'price_plan_oro', ocp.price_plan_oro,
              'applies_to_state', ocp.applies_to_state,
              'display_order', ocp.display_order
            ) ORDER BY ocp.display_order, ocp.procedure_name
          ),
          '[]'::json
        )
        FROM odontogram_condition_procedures ocp
        WHERE ocp.odontogram_condition_id = ddc.dental_condition_id
        AND ocp.status = 'active'
      ) as procedures
    FROM definitive_diagnosis_conditions ddc
    LEFT JOIN tooth_positions tp ON ddc.tooth_position_id = tp.tooth_position_id
    LEFT JOIN odontogram_dental_conditions odc ON ddc.dental_condition_id = odc.condition_id
    LEFT JOIN tooth_surfaces ts ON ddc.tooth_surface_id = ts.tooth_surface_id
    LEFT JOIN odontogram_conditions oc ON ddc.odontogram_condition_id = oc.condition_id
    LEFT JOIN odontogram_condition_procedures sp ON ddc.selected_procedure_id = sp.condition_procedure_id
    WHERE ddc.consultation_id = $1 AND ddc.status = 'active'
    ORDER BY ddc.definitive_condition_id ASC
  `;

  const result = await pool.query(query, [consultationId]);
  return result.rows;
};

/**
 * Agrega una condición al diagnóstico definitivo
 * Incluye soporte para las nuevas columnas: tooth_surface_id, odontogram_condition_id
 * y la tabla intermedia de superficies
 * @param {Object} conditionData - Datos de la condición
 * @param {number} userId - ID del usuario que registra
 */
const addDefinitiveDiagnosisCondition = async (conditionData, userId) => {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const {
      consultation_id,
      presumptive_condition_id,
      odontogram_condition_id,
      tooth_position_id,
      tooth_number,
      tooth_surface_id,
      dental_condition_id,
      condition_label,
      cie10_code,
      surfaces,
      price,
      notes,
      is_modified_from_presumptive,
      modification_reason
    } = conditionData;

    // Insertar la condicion principal
    const query = `
      INSERT INTO definitive_diagnosis_conditions (
        consultation_id, presumptive_condition_id, odontogram_condition_id,
        tooth_position_id, tooth_number, tooth_surface_id, dental_condition_id,
        condition_label, cie10_code, surfaces, price, notes,
        is_modified_from_presumptive, modification_reason, user_id_registration
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
      RETURNING *
    `;

    const values = [
      consultation_id,
      presumptive_condition_id || null,
      odontogram_condition_id || null,
      tooth_position_id,
      tooth_number,
      tooth_surface_id || null,
      dental_condition_id,
      condition_label,
      cie10_code || null,
      surfaces ? JSON.stringify(surfaces) : '[]',
      price || 0,
      notes || null,
      is_modified_from_presumptive || false,
      modification_reason || null,
      userId
    ];

    const result = await client.query(query, values);
    const insertedCondition = result.rows[0];

    // Si hay superficies en array, insertarlas en la tabla intermedia
    if (Array.isArray(surfaces) && surfaces.length > 0) {
      for (const surfaceCode of surfaces) {
        // Buscar el tooth_surface_id correspondiente al codigo
        const surfaceResult = await client.query(
          `SELECT tooth_surface_id FROM tooth_surfaces WHERE surface_code = $1 AND status = 'active' LIMIT 1`,
          [surfaceCode]
        );

        if (surfaceResult.rows.length > 0) {
          await client.query(
            `INSERT INTO definitive_diagnosis_condition_surfaces
             (definitive_condition_id, tooth_surface_id, user_id_registration)
             VALUES ($1, $2, $3)
             ON CONFLICT (definitive_condition_id, tooth_surface_id) DO NOTHING`,
            [insertedCondition.definitive_condition_id, surfaceResult.rows[0].tooth_surface_id, userId]
          );
        }
      }
    }

    await client.query('COMMIT');
    return insertedCondition;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

/**
 * Actualiza una condición del diagnóstico definitivo
 * Incluye actualizacion de superficies en la tabla intermedia
 * @param {number} conditionId - ID de la condición
 * @param {Object} conditionData - Datos a actualizar
 * @param {number} userId - ID del usuario que modifica
 */
const updateDefinitiveDiagnosisCondition = async (conditionId, conditionData, userId) => {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const {
      tooth_position_id,
      tooth_number,
      tooth_surface_id,
      odontogram_condition_id,
      dental_condition_id,
      condition_label,
      cie10_code,
      surfaces,
      price,
      notes,
      is_modified_from_presumptive,
      modification_reason
    } = conditionData;

    const query = `
      UPDATE definitive_diagnosis_conditions SET
        tooth_position_id = COALESCE($1, tooth_position_id),
        tooth_number = COALESCE($2, tooth_number),
        tooth_surface_id = COALESCE($3, tooth_surface_id),
        odontogram_condition_id = COALESCE($4, odontogram_condition_id),
        dental_condition_id = COALESCE($5, dental_condition_id),
        condition_label = COALESCE($6, condition_label),
        cie10_code = COALESCE($7, cie10_code),
        surfaces = COALESCE($8, surfaces),
        price = COALESCE($9, price),
        notes = COALESCE($10, notes),
        is_modified_from_presumptive = COALESCE($11, is_modified_from_presumptive),
        modification_reason = COALESCE($12, modification_reason),
        user_id_modification = $13,
        date_time_modification = CURRENT_TIMESTAMP
      WHERE definitive_condition_id = $14 AND status = 'active'
      RETURNING *
    `;

    const values = [
      tooth_position_id,
      tooth_number,
      tooth_surface_id,
      odontogram_condition_id,
      dental_condition_id,
      condition_label,
      cie10_code,
      surfaces ? JSON.stringify(surfaces) : null,
      price,
      notes,
      is_modified_from_presumptive,
      modification_reason,
      userId,
      conditionId
    ];

    const result = await client.query(query, values);

    if (result.rows.length === 0) {
      await client.query('COMMIT');
      return null;
    }

    const updatedCondition = result.rows[0];

    // Si hay superficies, actualizar la tabla intermedia
    if (Array.isArray(surfaces)) {
      // Primero eliminar las superficies existentes
      await client.query(
        `UPDATE definitive_diagnosis_condition_surfaces
         SET status = 'inactive'
         WHERE definitive_condition_id = $1`,
        [conditionId]
      );

      // Insertar las nuevas superficies
      for (const surfaceCode of surfaces) {
        const surfaceResult = await client.query(
          `SELECT tooth_surface_id FROM tooth_surfaces WHERE surface_code = $1 AND status = 'active' LIMIT 1`,
          [surfaceCode]
        );

        if (surfaceResult.rows.length > 0) {
          await client.query(
            `INSERT INTO definitive_diagnosis_condition_surfaces
             (definitive_condition_id, tooth_surface_id, user_id_registration)
             VALUES ($1, $2, $3)
             ON CONFLICT (definitive_condition_id, tooth_surface_id)
             DO UPDATE SET status = 'active'`,
            [conditionId, surfaceResult.rows[0].tooth_surface_id, userId]
          );
        }
      }
    }

    await client.query('COMMIT');
    return updatedCondition;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

/**
 * Elimina una condición del diagnóstico definitivo (soft delete)
 * @param {number} conditionId - ID de la condición
 * @param {number} userId - ID del usuario que elimina
 */
const deleteDefinitiveDiagnosisCondition = async (conditionId, userId) => {
  const query = `
    UPDATE definitive_diagnosis_conditions SET
      status = 'inactive',
      user_id_modification = $1,
      date_time_modification = CURRENT_TIMESTAMP
    WHERE definitive_condition_id = $2 AND status = 'active'
    RETURNING definitive_condition_id
  `;

  const result = await pool.query(query, [userId, conditionId]);
  return result.rowCount > 0;
};

/**
 * Guarda múltiples condiciones del diagnóstico definitivo (bulk save)
 * Elimina las existentes y crea las nuevas con sus superficies relacionadas
 * @param {number} consultationId - ID de la consulta
 * @param {Array} conditions - Array de condiciones a guardar
 * @param {number} userId - ID del usuario que registra
 */
const saveDefinitiveDiagnosisConditions = async (consultationId, conditions, userId) => {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // Soft delete de condiciones existentes y sus superficies
    await client.query(
      `UPDATE definitive_diagnosis_condition_surfaces ddcs
       SET status = 'inactive'
       FROM definitive_diagnosis_conditions ddc
       WHERE ddcs.definitive_condition_id = ddc.definitive_condition_id
       AND ddc.consultation_id = $1
       AND ddc.status = 'active'`,
      [consultationId]
    );

    await client.query(
      `UPDATE definitive_diagnosis_conditions
       SET status = 'inactive', user_id_modification = $1, date_time_modification = CURRENT_TIMESTAMP
       WHERE consultation_id = $2 AND status = 'active'`,
      [userId, consultationId]
    );

    // Insertar nuevas condiciones
    const insertedConditions = [];

    for (const condition of conditions) {
      const query = `
        INSERT INTO definitive_diagnosis_conditions (
          consultation_id, presumptive_condition_id, odontogram_condition_id,
          tooth_position_id, tooth_number, tooth_surface_id, dental_condition_id,
          condition_label, cie10_code, surfaces, price, notes,
          is_modified_from_presumptive, modification_reason, user_id_registration,
          selected_procedure_id, procedure_price
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
        RETURNING *
      `;

      // Invariante: si hay precio de procedimiento seleccionado, price debe coincidir.
      // Protege ante clientes desactualizados que envían price stale.
      const procPrice = (condition.procedure_price !== undefined && condition.procedure_price !== null)
        ? Number(condition.procedure_price)
        : null;
      const persistedPrice = procPrice !== null && Number.isFinite(procPrice)
        ? procPrice
        : (condition.price || 0);

      const values = [
        consultationId,
        condition.presumptive_condition_id || null,
        condition.odontogram_condition_id || null,
        condition.tooth_position_id,
        condition.tooth_number,
        condition.tooth_surface_id || null,
        condition.dental_condition_id,
        condition.condition_label,
        condition.cie10_code || null,
        condition.surfaces ? JSON.stringify(condition.surfaces) : '[]',
        persistedPrice,
        condition.notes || null,
        condition.is_modified_from_presumptive || false,
        condition.modification_reason || null,
        userId,
        condition.selected_procedure_id || null,
        procPrice
      ];

      const result = await client.query(query, values);
      const insertedCondition = result.rows[0];

      // Insertar superficies en la tabla intermedia
      if (Array.isArray(condition.surfaces) && condition.surfaces.length > 0) {
        for (const surfaceCode of condition.surfaces) {
          const surfaceResult = await client.query(
            `SELECT tooth_surface_id FROM tooth_surfaces WHERE surface_code = $1 AND status = 'active' LIMIT 1`,
            [surfaceCode]
          );

          if (surfaceResult.rows.length > 0) {
            await client.query(
              `INSERT INTO definitive_diagnosis_condition_surfaces
               (definitive_condition_id, tooth_surface_id, user_id_registration)
               VALUES ($1, $2, $3)
               ON CONFLICT (definitive_condition_id, tooth_surface_id) DO NOTHING`,
              [insertedCondition.definitive_condition_id, surfaceResult.rows[0].tooth_surface_id, userId]
            );
          }
        }
      }

      insertedConditions.push(insertedCondition);
    }

    await client.query('COMMIT');

    return insertedConditions;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

/**
 * Obtiene el resumen del diagnóstico definitivo con totales
 * @param {number} consultationId - ID de la consulta
 *
 * Nota: price y procedure_price quedan sincronizados al guardar (ver saveDefinitiveDiagnosisConditions
 * y updateSelectedProcedure). El CASE se mantiene como red de compatibilidad para registros legacy
 * anteriores a la invariante — así datos antiguos siguen reportando el monto efectivo.
 */
const getDefinitiveDiagnosisSummary = async (consultationId) => {
  const query = `
    SELECT
      COUNT(*) as total_conditions,
      COALESCE(SUM(
        CASE
          WHEN procedure_price IS NOT NULL AND procedure_price > 0 THEN procedure_price
          ELSE COALESCE(price, 0)
        END
      ), 0) as total_price,
      COUNT(CASE WHEN is_modified_from_presumptive = true THEN 1 END) as modified_count
    FROM definitive_diagnosis_conditions
    WHERE consultation_id = $1 AND status = 'active'
  `;

  const result = await pool.query(query, [consultationId]);
  return result.rows[0];
};

/**
 * Obtiene las condiciones presuntivas del odontograma de un paciente
 * Estas son las condiciones que se usan como base para el diagnostico definitivo
 * @param {number} patientId - ID del paciente
 */
const getPresumptiveConditionsFromOdontogram = async (patientId) => {
  const query = `
    SELECT
      oc.condition_id as odontogram_condition_id,
      oc.odontogram_id,
      oc.tooth_position_id,
      oc.tooth_surface_id,
      oc.dental_condition_id,
      oc.description,
      oc.severity,
      oc.notes,
      -- Precio: usar el del procedimiento (FUENTE ÚNICA), con fallback al guardado
      COALESCE(
        (
          SELECT ocp_price.price_without_plan
          FROM odontogram_condition_procedures ocp_price
          WHERE ocp_price.odontogram_condition_id = oc.dental_condition_id
          AND ocp_price.status = 'active'
          ORDER BY ocp_price.display_order, ocp_price.condition_procedure_id
          LIMIT 1
        ),
        oc.price,
        0
      ) as price,
      oc.surface_section,
      -- Datos del diente
      tp.tooth_number,
      tp.tooth_name,
      tp.quadrant,
      tp.tooth_type,
      tp.is_adult,
      -- Datos de la condicion dental
      odc.condition_code,
      odc.condition_name,
      odc.category as condition_category,
      odc.cie10_code,
      odc.abbreviation,
      odc.symbol_type,
      odc.color_type,
      -- Precio del primer procedimiento (FUENTE ÚNICA DE VERDAD)
      (
        SELECT COALESCE(ocp_price.price_without_plan, 0)
        FROM odontogram_condition_procedures ocp_price
        WHERE ocp_price.odontogram_condition_id = oc.dental_condition_id
        AND ocp_price.status = 'active'
        ORDER BY ocp_price.display_order, ocp_price.condition_procedure_id
        LIMIT 1
      ) as price_base,
      odc.fill_surfaces,
      -- Datos de la superficie
      ts.surface_code,
      ts.surface_name,
      -- Procedimientos sugeridos para esta condicion
      (
        SELECT COALESCE(
          json_agg(
            json_build_object(
              'procedure_id', ocp.condition_procedure_id,
              'procedure_name', ocp.procedure_name,
              'procedure_code', ocp.procedure_code,
              'price_without_plan', ocp.price_without_plan,
              'price_plan_personal', ocp.price_plan_personal,
              'price_plan_familiar', ocp.price_plan_familiar,
              'price_plan_platinium', ocp.price_plan_platinium,
              'price_plan_oro', ocp.price_plan_oro,
              'applies_to_state', ocp.applies_to_state,
              'display_order', ocp.display_order
            ) ORDER BY ocp.display_order, ocp.procedure_name
          ),
          '[]'::json
        )
        FROM odontogram_condition_procedures ocp
        WHERE ocp.odontogram_condition_id = oc.dental_condition_id
        AND ocp.status = 'active'
      ) as procedures
    FROM odontogram_conditions oc
    INNER JOIN odontograms o ON oc.odontogram_id = o.odontogram_id
    INNER JOIN tooth_positions tp ON oc.tooth_position_id = tp.tooth_position_id
    LEFT JOIN odontogram_dental_conditions odc ON oc.dental_condition_id = odc.condition_id
    LEFT JOIN tooth_surfaces ts ON oc.tooth_surface_id = ts.tooth_surface_id
    WHERE o.patient_id = $1
    AND o.status = 'active'
    AND oc.status = 'active'
    ORDER BY tp.tooth_number ASC, oc.condition_id ASC
  `;

  const result = await pool.query(query, [patientId]);
  return result.rows;
};

/**
 * Obtiene las condiciones presuntivas del odontograma por consultation_id
 * Busca el odontograma mas reciente del paciente asociado a la consulta
 * @param {number} consultationId - ID de la consulta
 */
const getPresumptiveConditionsByConsultation = async (consultationId) => {
  const query = `
    SELECT
      oc.condition_id as odontogram_condition_id,
      oc.odontogram_id,
      oc.tooth_position_id,
      oc.tooth_surface_id,
      oc.dental_condition_id,
      oc.description,
      oc.severity,
      oc.notes,
      -- Precio: usar el del procedimiento (FUENTE ÚNICA), con fallback al guardado
      COALESCE(
        (
          SELECT ocp_price.price_without_plan
          FROM odontogram_condition_procedures ocp_price
          WHERE ocp_price.odontogram_condition_id = oc.dental_condition_id
          AND ocp_price.status = 'active'
          ORDER BY ocp_price.display_order, ocp_price.condition_procedure_id
          LIMIT 1
        ),
        oc.price,
        0
      ) as price,
      oc.surface_section,
      -- Datos del diente
      tp.tooth_number,
      tp.tooth_name,
      tp.quadrant,
      tp.tooth_type,
      tp.is_adult,
      -- Datos de la condicion dental
      odc.condition_code,
      odc.condition_name,
      odc.category as condition_category,
      odc.cie10_code,
      odc.abbreviation,
      odc.symbol_type,
      odc.color_type,
      -- Precio del primer procedimiento (FUENTE ÚNICA DE VERDAD)
      (
        SELECT COALESCE(ocp_price.price_without_plan, 0)
        FROM odontogram_condition_procedures ocp_price
        WHERE ocp_price.odontogram_condition_id = oc.dental_condition_id
        AND ocp_price.status = 'active'
        ORDER BY ocp_price.display_order, ocp_price.condition_procedure_id
        LIMIT 1
      ) as price_base,
      odc.fill_surfaces,
      -- Datos de la superficie
      ts.surface_code,
      ts.surface_name,
      -- Procedimientos sugeridos para esta condicion
      (
        SELECT COALESCE(
          json_agg(
            json_build_object(
              'procedure_id', ocp.condition_procedure_id,
              'procedure_name', ocp.procedure_name,
              'procedure_code', ocp.procedure_code,
              'price_without_plan', ocp.price_without_plan,
              'price_plan_personal', ocp.price_plan_personal,
              'price_plan_familiar', ocp.price_plan_familiar,
              'price_plan_platinium', ocp.price_plan_platinium,
              'price_plan_oro', ocp.price_plan_oro,
              'applies_to_state', ocp.applies_to_state,
              'display_order', ocp.display_order
            ) ORDER BY ocp.display_order, ocp.procedure_name
          ),
          '[]'::json
        )
        FROM odontogram_condition_procedures ocp
        WHERE ocp.odontogram_condition_id = oc.dental_condition_id
        AND ocp.status = 'active'
      ) as procedures
    FROM consultations c
    INNER JOIN odontograms o ON o.patient_id = c.patient_id AND o.status = 'active'
    INNER JOIN odontogram_conditions oc ON oc.odontogram_id = o.odontogram_id AND oc.status = 'active'
    INNER JOIN tooth_positions tp ON oc.tooth_position_id = tp.tooth_position_id
    LEFT JOIN odontogram_dental_conditions odc ON oc.dental_condition_id = odc.condition_id
    LEFT JOIN tooth_surfaces ts ON oc.tooth_surface_id = ts.tooth_surface_id
    WHERE c.consultation_id = $1
    AND c.status = 'active'
    ORDER BY o.date_time_registration DESC, tp.tooth_number ASC, oc.condition_id ASC
  `;

  const result = await pool.query(query, [consultationId]);
  return result.rows;
};

/**
 * Actualiza el procedimiento seleccionado de una condicion del diagnostico definitivo
 * @param {number} conditionId - ID de la condicion definitiva
 * @param {number} procedureId - ID del procedimiento a asignar
 * @param {number} procedurePrice - Precio del procedimiento
 * @param {number} userId - ID del usuario que modifica
 */
const updateSelectedProcedure = async (conditionId, procedureId, procedurePrice, userId) => {
  const query = `
    UPDATE definitive_diagnosis_conditions
    SET
      selected_procedure_id = $1,
      procedure_price = $2,
      price = COALESCE($2, price),
      user_id_modification = $3,
      date_time_modification = CURRENT_TIMESTAMP
    WHERE definitive_condition_id = $4 AND status = 'active'
    RETURNING *
  `;

  const result = await pool.query(query, [procedureId, procedurePrice, userId, conditionId]);
  return result.rows[0];
};

module.exports = {
  getAllConsultations,
  getConsultationById,
  createConsultation,
  updateConsultation,
  deleteConsultation,
  countConsultations,
  findByAppointmentId,
  upsertConsultation,
  addDiagnosticCondition,
  deleteDiagnosticCondition,
  getAllConsultationRooms,
  getConsultationRoomById,
  createConsultationRoom,
  updateConsultationRoom,
  deleteConsultationRoom,
  // Funciones para manejo de imagenes del examen clinico
  addExtraoralImages,
  addIntraoralImages,
  removeExtraoralImage,
  removeIntraoralImage,
  getClinicalExamImages,
  // Funciones para diagnóstico definitivo
  getDefinitiveDiagnosisConditions,
  addDefinitiveDiagnosisCondition,
  updateDefinitiveDiagnosisCondition,
  deleteDefinitiveDiagnosisCondition,
  saveDefinitiveDiagnosisConditions,
  getDefinitiveDiagnosisSummary,
  updateSelectedProcedure,
  // Funciones para obtener condiciones presuntivas del odontograma
  getPresumptiveConditionsFromOdontogram,
  getPresumptiveConditionsByConsultation
};
