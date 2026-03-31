/**
 * Modelo para el Portal del Paciente
 * Contiene funciones para obtener datos especificos del paciente logueado
 * con todas las relaciones necesarias para mostrar el historial medico completo
 * Actualizado: 2025-12-04
 */

const pool = require('../config/db');

/**
 * Obtiene el historial completo de atenciones integrales de un paciente
 * Incluye todos los pasos de cada atencion con sus datos relacionados
 * @param {number} patientId - ID del paciente
 * @returns {Promise<Array>} - Lista de consultas con todos los datos relacionados
 */
const getPatientIntegralConsultations = async (patientId) => {
  // Query principal para obtener las consultas del paciente
  // IMPORTANTE: Usamos TO_CHAR para fechas DATE para evitar problemas de timezone
  // Esto garantiza que las fechas lleguen como "YYYY-MM-DD" sin conversión UTC
  const consultationsQuery = `
    SELECT
      c.consultation_id,
      c.patient_id,
      c.dentist_id,
      c.branch_id,
      c.appointment_id,
      TO_CHAR(c.consultation_date, 'YYYY-MM-DD') as consultation_date,
      c.consultation_time,
      c.chief_complaint,
      c.present_illness,
      c.vital_signs,
      c.general_condition,
      c.extraoral_exam,
      c.extraoral_exam_images,
      c.intraoral_exam,
      c.intraoral_exam_images,
      c.diagnosis,
      c.treatment_plan,
      c.treatment_performed,
      c.prescriptions_given,
      c.recommendations,
      TO_CHAR(c.next_visit_date, 'YYYY-MM-DD') as next_visit_date,
      c.notes,
      c.status,
      c.date_time_registration,
      c.date_time_modification,
      -- Datos del dentista
      u.first_name as dentist_first_name,
      u.last_name as dentist_last_name,
      s.specialty_name,
      -- Datos de la sede
      b.branch_name
    FROM consultations c
    INNER JOIN dentists d ON c.dentist_id = d.dentist_id
    INNER JOIN users u ON d.user_id = u.user_id
    INNER JOIN branches b ON c.branch_id = b.branch_id
    LEFT JOIN dentist_specialties ds ON d.dentist_id = ds.dentist_id AND ds.is_primary = true
    LEFT JOIN specialties s ON ds.specialty_id = s.specialty_id
    WHERE c.patient_id = $1 AND c.status = 'active'
    ORDER BY c.consultation_date DESC, c.consultation_time DESC
  `;

  const consultationsResult = await pool.query(consultationsQuery, [patientId]);
  const consultations = consultationsResult.rows;

  // Para cada consulta, obtener los datos relacionados
  const enrichedConsultations = await Promise.all(
    consultations.map(async (consultation) => {
      const consultationId = consultation.consultation_id;

      // 1. Obtener odontograma de la consulta
      const odontogramQuery = `
        SELECT
          o.odontogram_id,
          TO_CHAR(o.odontogram_date, 'YYYY-MM-DD') as odontogram_date,
          o.odontogram_type,
          o.general_observations,
          o.conditions as odontogram_conditions_json
        FROM odontograms o
        WHERE o.consultation_id = $1 AND o.status = 'active'
        ORDER BY o.date_time_registration DESC
        LIMIT 1
      `;
      const odontogramResult = await pool.query(odontogramQuery, [consultationId]);
      const odontogram = odontogramResult.rows[0] || null;

      // 2. Obtener condiciones del odontograma (diagnostico presuntivo)
      let odontogramConditions = [];
      if (odontogram) {
        const conditionsQuery = `
          SELECT
            oc.condition_id,
            oc.tooth_position_id,
            oc.tooth_surface_id,
            oc.dental_condition_id,
            oc.connected_tooth_position_id,
            oc.description,
            oc.severity,
            oc.notes,
            oc.price as custom_tooth_price,
            oc.surface_section,
            -- Precio: usar el del procedimiento (FUENTE UNICA)
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
            -- Tooth number con formato "X.Y"
            CASE
              WHEN LENGTH(tp.tooth_number) = 2
              THEN SUBSTRING(tp.tooth_number, 1, 1) || '.' || SUBSTRING(tp.tooth_number, 2, 1)
              ELSE tp.tooth_number
            END as tooth_number,
            tp.tooth_name,
            tp.quadrant,
            tp.tooth_type,
            tp.is_adult,
            -- Condicion dental
            odc.condition_name,
            odc.condition_code,
            odc.condition_code as dental_condition_code,
            odc.cie10_code,
            odc.symbol_type,
            -- Color: priorizar condition_state del registro sobre el catalogo
            CASE
              WHEN oc.condition_state = 'bad' THEN 'red'
              WHEN oc.condition_state = 'good' THEN 'blue'
              ELSE odc.color_type
            END as color_type,
            oc.condition_state,
            odc.fill_surfaces,
            odc.abbreviation,
            odc.category as condition_category,
            -- Superficie
            ts.surface_code,
            ts.surface_name,
            -- Diente conectado (protesis, aparatos)
            CASE
              WHEN LENGTH(ctp.tooth_number) = 2
              THEN SUBSTRING(ctp.tooth_number, 1, 1) || '.' || SUBSTRING(ctp.tooth_number, 2, 1)
              ELSE ctp.tooth_number
            END as connected_tooth_number
          FROM odontogram_conditions oc
          INNER JOIN tooth_positions tp ON oc.tooth_position_id = tp.tooth_position_id
          LEFT JOIN odontogram_dental_conditions odc ON oc.dental_condition_id = odc.condition_id
          LEFT JOIN tooth_surfaces ts ON oc.tooth_surface_id = ts.tooth_surface_id
          LEFT JOIN tooth_positions ctp ON oc.connected_tooth_position_id = ctp.tooth_position_id
          WHERE oc.odontogram_id = $1 AND oc.status = 'active'
          ORDER BY tp.tooth_number ASC, oc.condition_id ASC
        `;
        const conditionsResult = await pool.query(conditionsQuery, [odontogram.odontogram_id]);
        odontogramConditions = conditionsResult.rows;
      }

      // 2.1. Obtener odontograma de evolucion (Paso 10 - Tratamiento Realizado)
      const evolutionOdontogramQuery = `
        SELECT
          eo.evolution_id,
          eo.consultation_id,
          eo.tooth_position_id,
          eo.tooth_surface_id,
          eo.original_condition_id as dental_condition_id,
          eo.condition_status,
          TO_CHAR(eo.registered_date, 'YYYY-MM-DD') as registered_date,
          eo.clinical_observation as notes,
          tp.tooth_number,
          tp.tooth_name,
          ts.surface_code,
          ts.surface_name,
          COALESCE(odc.condition_name, eo.original_condition_name) as condition_name,
          odc.condition_code,
          odc.color_type as color_code
        FROM evolution_odontogram eo
        INNER JOIN tooth_positions tp ON eo.tooth_position_id = tp.tooth_position_id
        LEFT JOIN tooth_surfaces ts ON eo.tooth_surface_id = ts.tooth_surface_id
        LEFT JOIN odontogram_dental_conditions odc ON eo.original_condition_id = odc.condition_id
        WHERE eo.consultation_id = $1 AND eo.status = 'active'
        ORDER BY tp.tooth_number ASC, eo.registered_date DESC
      `;
      const evolutionOdontogramResult = await pool.query(evolutionOdontogramQuery, [consultationId]);
      const evolutionOdontogram = evolutionOdontogramResult.rows;

      // 3. Obtener diagnostico definitivo (incluye procedimiento seleccionado)
      const definitiveDiagnosisQuery = `
        SELECT
          ddc.definitive_condition_id,
          ddc.tooth_position_id,
          ddc.tooth_number,
          ddc.dental_condition_id,
          ddc.condition_label,
          ddc.cie10_code,
          ddc.surfaces,
          ddc.price,
          ddc.procedure_price,
          ddc.selected_procedure_id,
          ddc.notes,
          tp.tooth_name,
          odc.condition_name,
          odc.condition_code,
          ocp.procedure_name as selected_procedure_name
        FROM definitive_diagnosis_conditions ddc
        LEFT JOIN tooth_positions tp ON ddc.tooth_position_id = tp.tooth_position_id
        LEFT JOIN odontogram_dental_conditions odc ON ddc.dental_condition_id = odc.condition_id
        LEFT JOIN odontogram_condition_procedures ocp ON ddc.selected_procedure_id = ocp.condition_procedure_id
        WHERE ddc.consultation_id = $1 AND ddc.status = 'active'
        ORDER BY ddc.tooth_number ASC
      `;
      const definitiveDiagnosisResult = await pool.query(definitiveDiagnosisQuery, [consultationId]);
      const definitiveDiagnosis = definitiveDiagnosisResult.rows;

      // 4. Obtener plan de tratamiento de la consulta
      const treatmentPlanQuery = `
        SELECT
          ctp.consultation_treatment_plan_id,
          ctp.plan_name,
          ctp.definitive_diagnosis_total,
          ctp.treatments_total,
          ctp.additional_services_total,
          ctp.grand_total,
          ctp.has_initial_payment,
          ctp.initial_payment,
          ctp.monthly_payment,
          ctp.observations
        FROM consultation_treatment_plans ctp
        WHERE ctp.consultation_id = $1 AND ctp.status = 'active'
      `;
      const treatmentPlanResult = await pool.query(treatmentPlanQuery, [consultationId]);
      const treatmentPlan = treatmentPlanResult.rows[0] || null;

      // 5. Obtener items del plan de tratamiento
      let treatmentItems = [];
      if (treatmentPlan) {
        const itemsQuery = `
          SELECT
            cti.consultation_treatment_item_id,
            cti.treatment_name,
            cti.total_amount,
            cti.display_order
          FROM consultation_treatment_items cti
          WHERE cti.consultation_treatment_plan_id = $1 AND cti.status = 'active'
          ORDER BY cti.display_order ASC
        `;
        const itemsResult = await pool.query(itemsQuery, [treatmentPlan.consultation_treatment_plan_id]);
        treatmentItems = itemsResult.rows;

        // Obtener condiciones para cada item de tratamiento
        for (const item of treatmentItems) {
          const conditionsQuery = `
            SELECT
              ctic.condition_id,
              ctic.label,
              ctic.price,
              ctic.quantity,
              ctic.subtotal,
              ctic.display_order
            FROM consultation_treatment_item_conditions ctic
            WHERE ctic.consultation_treatment_item_id = $1 AND ctic.status = 'active'
            ORDER BY ctic.display_order ASC
          `;
          const conditionsResult = await pool.query(conditionsQuery, [item.consultation_treatment_item_id]);
          item.conditions = conditionsResult.rows;
        }
      }

      // 5.1. Obtener servicios adicionales (ortodoncia, implantes, protesis)
      // Incluye campos de estado de pago y cuotas para sincronización con el paso 10
      let additionalServices = [];
      if (treatmentPlan) {
        const additionalServicesQuery = `
          SELECT
            cas.consultation_additional_service_id,
            cas.service_type,
            cas.service_name,
            cas.modality,
            cas.description,
            cas.edited_monto_total as monto_total,
            cas.edited_inicial as inicial,
            cas.edited_mensual as mensual,
            cas.display_order,
            -- Campos de estado de pago (TO_CHAR para evitar problemas timezone)
            cas.initial_payment_completed,
            TO_CHAR(cas.initial_payment_date, 'YYYY-MM-DD') as initial_payment_date,
            COALESCE(cas.monthly_payments_count, 0) as monthly_payments_count,
            COALESCE(cas.service_status, 'pending') as service_status,
            TO_CHAR(cas.service_completed_date, 'YYYY-MM-DD') as service_completed_date,
            -- Calcular cuotas reales pagadas desde procedure_income
            (SELECT COUNT(*) FROM procedure_income pi
             WHERE pi.parent_additional_service_id = cas.consultation_additional_service_id
             AND pi.quota_type = 'monthly'
             AND pi.status = 'active') as cuotas_pagadas_reales,
            -- Verificar si pago inicial está registrado en procedure_income
            (SELECT COUNT(*) > 0 FROM procedure_income pi
             WHERE pi.parent_additional_service_id = cas.consultation_additional_service_id
             AND pi.quota_type = 'initial'
             AND pi.status = 'active') as inicial_pagado_real
          FROM consultation_additional_services cas
          WHERE cas.consultation_treatment_plan_id = $1 AND cas.status = 'active'
          ORDER BY cas.display_order ASC
        `;
        const additionalServicesResult = await pool.query(additionalServicesQuery, [treatmentPlan.consultation_treatment_plan_id]);
        additionalServices = additionalServicesResult.rows;
      }

      // 6. Obtener solicitud de radiografia/examenes auxiliares
      const radiographyQuery = `
        SELECT
          rr.radiography_request_id,
          TO_CHAR(rr.request_date, 'YYYY-MM-DD') as request_date,
          rr.radiography_type,
          rr.area_of_interest,
          rr.clinical_indication,
          rr.urgency,
          rr.request_status,
          rr.request_data
        FROM radiography_requests rr
        WHERE rr.consultation_id = $1 AND rr.status = 'active'
        ORDER BY rr.request_date DESC
      `;
      const radiographyResult = await pool.query(radiographyQuery, [consultationId]);
      const radiographyRequests = radiographyResult.rows;

      // 6.1. Obtener resultados de radiografia (subidos por tecnico de imagenes)
      for (const request of radiographyRequests) {
        const resultsQuery = `
          SELECT
            res.result_id,
            res.result_type,
            res.file_name,
            res.original_name,
            res.file_path,
            res.file_size,
            res.mime_type,
            res.external_url,
            res.uploaded_at,
            u.first_name || ' ' || u.last_name AS uploader_name
          FROM radiography_results res
          LEFT JOIN users u ON res.uploaded_by = u.user_id
          WHERE res.radiography_request_id = $1 AND res.status = 'active'
          ORDER BY res.uploaded_at DESC
        `;
        const resultsResult = await pool.query(resultsQuery, [request.radiography_request_id]);
        request.results = resultsResult.rows;
      }

      // 7. Obtener resultados de examenes auxiliares
      const examResultsQuery = `
        SELECT
          aer.auxiliary_exam_result_id,
          aer.consultation_id,
          aer.patient_id,
          aer.dentist_id,
          aer.doctor_observations,
          aer.external_files,
          aer.date_time_registration as exam_date
        FROM auxiliary_exam_results aer
        WHERE aer.consultation_id = $1 AND aer.status = 'active'
        ORDER BY aer.date_time_registration DESC
      `;
      const examResultsResult = await pool.query(examResultsQuery, [consultationId]);
      const examResults = examResultsResult.rows;

      // 8. Obtener historial de procedimientos realizados
      const procedureHistoryQuery = `
        SELECT
          ph.procedure_history_id,
          TO_CHAR(ph.performed_date, 'YYYY-MM-DD') as procedure_date,
          ph.performed_time,
          ph.procedure_name,
          ph.procedure_code,
          ph.procedure_type,
          ph.procedure_status,
          ph.procedure_result,
          ph.clinical_notes as procedure_notes,
          ph.complications,
          ph.next_steps,
          tp.tooth_number,
          tp.tooth_name
        FROM procedure_history ph
        LEFT JOIN tooth_positions tp ON ph.tooth_position_id = tp.tooth_position_id
        WHERE ph.consultation_id = $1 AND ph.status = 'active'
        ORDER BY ph.performed_date DESC, ph.date_time_registration DESC
      `;
      const procedureHistoryResult = await pool.query(procedureHistoryQuery, [consultationId]);
      const procedureHistory = procedureHistoryResult.rows;

      // 8.1. Obtener items completados (procedure_income) para el checklist de progreso
      const completedItemsQuery = `
        SELECT
          pi.income_id,
          pi.income_type,
          pi.item_name,
          pi.final_amount as item_amount,
          pi.tooth_position_id,
          pi.additional_service_id,
          tp.tooth_number,
          tp.tooth_name
        FROM procedure_income pi
        LEFT JOIN tooth_positions tp ON pi.tooth_position_id = tp.tooth_position_id
        WHERE pi.consultation_id = $1 AND pi.status = 'active'
        ORDER BY pi.date_time_registration ASC
      `;
      const completedItemsResult = await pool.query(completedItemsQuery, [consultationId]);
      const completedItems = completedItemsResult.rows;

      // 9. Obtener recetas/prescripciones
      const prescriptionsQuery = `
        SELECT
          p.prescription_id,
          TO_CHAR(p.prescription_date, 'YYYY-MM-DD') as prescription_date,
          p.notes as prescription_notes
        FROM prescriptions p
        WHERE p.consultation_id = $1 AND p.status = 'active'
        ORDER BY p.prescription_date DESC
      `;
      const prescriptionsResult = await pool.query(prescriptionsQuery, [consultationId]);
      const prescriptions = prescriptionsResult.rows;

      // Obtener items de cada prescripcion
      for (const prescription of prescriptions) {
        const itemsQuery = `
          SELECT
            pi.prescription_item_id,
            pi.medication_name,
            pi.concentration,
            pi.quantity,
            pi.instructions
          FROM prescription_items pi
          WHERE pi.prescription_id = $1 AND pi.status = 'active'
          ORDER BY pi.prescription_item_id ASC
        `;
        const itemsResult = await pool.query(itemsQuery, [prescription.prescription_id]);
        prescription.items = itemsResult.rows;
      }

      // 10. Obtener presupuesto de la consulta
      const budgetQuery = `
        SELECT
          cb.consultation_budget_id,
          cb.definitive_diagnosis_total,
          cb.treatments_total,
          cb.additional_services_total,
          cb.exams_total,
          cb.grand_total,
          cb.advance_payment,
          cb.balance,
          cb.observations as budget_observations,
          cb.status as budget_status
        FROM consultation_budgets cb
        WHERE cb.consultation_id = $1 AND cb.status != 'cancelled'
      `;
      const budgetResult = await pool.query(budgetQuery, [consultationId]);
      const budget = budgetResult.rows[0] || null;

      return {
        ...consultation,
        dentist_name: `Dr. ${consultation.dentist_first_name} ${consultation.dentist_last_name}`,
        odontogram: odontogram ? {
          ...odontogram,
          conditions: odontogramConditions
        } : null,
        evolution_odontogram: evolutionOdontogram,
        definitive_diagnosis: definitiveDiagnosis,
        treatment_plan: treatmentPlan ? {
          ...treatmentPlan,
          items: treatmentItems,
          additional_services: additionalServices
        } : null,
        radiography_requests: radiographyRequests,
        exam_results: examResults,
        procedure_history: procedureHistory,
        completed_items: completedItems,
        prescriptions: prescriptions,
        budget: budget
      };
    })
  );

  return enrichedConsultations;
};

/**
 * Verifica si un paciente existe y esta activo
 * @param {number} patientId - ID del paciente
 * @returns {Promise<Object|null>} - Datos basicos del paciente o null
 */
const verifyPatientExists = async (patientId) => {
  const query = `
    SELECT patient_id, first_name, last_name, email
    FROM patients
    WHERE patient_id = $1 AND status = 'active'
  `;
  const result = await pool.query(query, [patientId]);
  return result.rows.length > 0 ? result.rows[0] : null;
};

/**
 * Obtiene el resumen del historial medico del paciente
 * @param {number} patientId - ID del paciente
 * @returns {Promise<Object>} - Resumen con conteos y ultima consulta
 */
const getPatientMedicalSummary = async (patientId) => {
  const query = `
    SELECT
      COUNT(c.consultation_id) as total_consultations,
      TO_CHAR(MAX(c.consultation_date), 'YYYY-MM-DD') as last_consultation_date,
      (SELECT COUNT(*) FROM procedure_history ph
       INNER JOIN consultations c2 ON ph.consultation_id = c2.consultation_id
       WHERE c2.patient_id = $1 AND ph.status = 'active' AND ph.procedure_status = 'completed') as completed_procedures,
      (SELECT COUNT(*) FROM prescriptions p
       INNER JOIN consultations c3 ON p.consultation_id = c3.consultation_id
       WHERE c3.patient_id = $1 AND p.status = 'active') as total_prescriptions
    FROM consultations c
    WHERE c.patient_id = $1 AND c.status = 'active'
  `;
  const result = await pool.query(query, [patientId]);
  return result.rows[0];
};

/**
 * Obtiene los antecedentes medicos del paciente
 * @param {number} patientId - ID del paciente
 * @returns {Promise<Object|null>} - Antecedentes medicos del paciente
 */
const getPatientMedicalBackground = async (patientId) => {
  const query = `
    SELECT
      medical_history_id,
      has_allergies,
      allergies_description,
      has_chronic_diseases,
      chronic_diseases_description,
      has_medications,
      current_medications,
      has_surgeries,
      surgeries_description,
      has_bleeding_disorders,
      bleeding_disorders_description,
      has_diabetes,
      has_hypertension,
      has_heart_disease,
      heart_disease_description,
      is_pregnant,
      pregnancy_months,
      is_breastfeeding,
      smokes,
      smoking_frequency,
      drinks_alcohol,
      alcohol_frequency,
      last_dental_visit,
      dental_visit_reason,
      additional_notes,
      pathological_background,
      date_time_registration,
      date_time_modification
    FROM medical_histories
    WHERE patient_id = $1 AND status = 'active'
  `;
  const result = await pool.query(query, [patientId]);
  return result.rows.length > 0 ? result.rows[0] : null;
};

/**
 * Obtiene las radiografías del paciente que fueron creadas desde el laboratorio
 * (sin estar vinculadas a una consulta específica)
 * @param {number} patientId - ID del paciente
 * @returns {Promise<Array>} - Lista de radiografías del laboratorio
 */
const getPatientLaboratoryRadiographyRequests = async (patientId) => {
  // Obtener radiografías del paciente que NO tienen consultation_id
  const radiographyQuery = `
    SELECT
      rr.radiography_request_id,
      TO_CHAR(rr.request_date, 'YYYY-MM-DD') as request_date,
      rr.radiography_type,
      rr.area_of_interest,
      rr.clinical_indication,
      rr.urgency,
      rr.request_status,
      rr.request_data,
      rr.pricing_data,
      TO_CHAR(rr.performed_date, 'YYYY-MM-DD') as performed_date,
      rr.findings,
      rr.notes
    FROM radiography_requests rr
    WHERE rr.patient_id = $1
      AND rr.consultation_id IS NULL
      AND rr.status = 'active'
    ORDER BY rr.request_date DESC
  `;
  const radiographyResult = await pool.query(radiographyQuery, [patientId]);
  const radiographyRequests = radiographyResult.rows;

  // Cargar resultados para cada solicitud
  for (const request of radiographyRequests) {
    const resultsQuery = `
      SELECT
        res.result_id,
        res.result_type,
        res.file_name,
        res.original_name,
        res.file_path,
        res.file_size,
        res.mime_type,
        res.external_url,
        res.uploaded_at,
        u.first_name || ' ' || u.last_name AS uploader_name
      FROM radiography_results res
      LEFT JOIN users u ON res.uploaded_by = u.user_id
      WHERE res.radiography_request_id = $1 AND res.status = 'active'
      ORDER BY res.uploaded_at DESC
    `;
    const resultsResult = await pool.query(resultsQuery, [request.radiography_request_id]);
    request.results = resultsResult.rows;
  }

  return radiographyRequests;
};

/**
 * Obtiene el perfil completo del paciente para la página "Mi Perfil"
 * @param {number} patientId - ID del paciente
 * @returns {Promise<Object|null>} - Datos completos del perfil
 */
const getPatientProfile = async (patientId) => {
  const query = `
    SELECT
      p.patient_id,
      p.first_name,
      p.last_name,
      p.email,
      p.phone,
      p.mobile,
      TO_CHAR(p.birth_date, 'YYYY-MM-DD') as birth_date,
      p.address,
      p.city,
      p.state,
      p.country,
      p.postal_code,
      p.emergency_contact_name,
      p.emergency_contact_phone,
      p.emergency_contact_relationship,
      p.photo_url,
      p.occupation,
      p.identification_number,
      p.gender_id,
      g.gender_name,
      g.gender_code,
      p.blood_type_id,
      bt.blood_type_name,
      p.marital_status_id,
      ms.status_name as marital_status_name,
      p.identification_type_id,
      it.type_name as identification_type_name,
      p.branch_id,
      b.branch_name
    FROM patients p
    LEFT JOIN genders g ON p.gender_id = g.gender_id
    LEFT JOIN blood_types bt ON p.blood_type_id = bt.blood_type_id
    LEFT JOIN marital_statuses ms ON p.marital_status_id = ms.marital_status_id
    LEFT JOIN identification_types it ON p.identification_type_id = it.identification_type_id
    LEFT JOIN branches b ON p.branch_id = b.branch_id
    WHERE p.patient_id = $1 AND p.status = 'active'
  `;
  const result = await pool.query(query, [patientId]);
  return result.rows.length > 0 ? result.rows[0] : null;
};

/**
 * Actualiza el perfil del paciente (campos editables por el paciente)
 * @param {number} patientId - ID del paciente
 * @param {Object} profileData - Datos del perfil a actualizar
 * @returns {Promise<Object|null>} - Datos actualizados del perfil
 */
const updatePatientProfile = async (patientId, profileData) => {
  // Campos que el paciente puede actualizar
  const allowedFields = [
    'phone',
    'mobile',
    'address',
    'city',
    'state',
    'country',
    'postal_code',
    'emergency_contact_name',
    'emergency_contact_phone',
    'emergency_contact_relationship',
    'occupation'
  ];

  // Construir query dinámico solo con campos permitidos y proporcionados
  const updates = [];
  const values = [];
  let paramIndex = 1;

  for (const field of allowedFields) {
    if (profileData[field] !== undefined) {
      updates.push(`${field} = $${paramIndex}`);
      values.push(profileData[field]);
      paramIndex++;
    }
  }

  if (updates.length === 0) {
    // Si no hay nada que actualizar, retornar el perfil actual
    return getPatientProfile(patientId);
  }

  // Agregar campos de auditoría
  updates.push(`date_time_modification = CURRENT_TIMESTAMP`);

  // Agregar patient_id al final de los valores
  values.push(patientId);

  const query = `
    UPDATE patients
    SET ${updates.join(', ')}
    WHERE patient_id = $${paramIndex} AND status = 'active'
    RETURNING *
  `;

  await pool.query(query, values);

  // Retornar el perfil completo actualizado
  return getPatientProfile(patientId);
};

// ============================================================================
// EXAMENES EXTERNOS DEL PACIENTE
// ============================================================================

/**
 * Obtiene todos los exámenes externos subidos por el paciente
 * @param {number} patientId - ID del paciente
 * @returns {Promise<Array>} - Lista de exámenes externos
 */
const getPatientExternalExams = async (patientId) => {
  const query = `
    SELECT
      external_exam_id,
      patient_id,
      exam_type,
      file_name,
      original_name,
      file_path,
      file_size,
      mime_type,
      external_url,
      date_time_registration
    FROM patient_external_exams
    WHERE patient_id = $1 AND status = 'active'
    ORDER BY date_time_registration DESC
  `;
  const result = await pool.query(query, [patientId]);
  return result.rows;
};

/**
 * Crea un nuevo registro de examen externo (archivo)
 * @param {Object} examData - Datos del examen
 * @returns {Promise<Object>} - Examen creado
 */
const createPatientExternalExamFile = async (examData) => {
  const query = `
    INSERT INTO patient_external_exams (
      patient_id, exam_type, file_name, original_name, file_path, file_size, mime_type, user_id_registration
    ) VALUES ($1, 'file', $2, $3, $4, $5, $6, $7)
    RETURNING *
  `;
  const values = [
    examData.patient_id,
    examData.file_name,
    examData.original_name,
    examData.file_path,
    examData.file_size,
    examData.mime_type,
    examData.user_id
  ];
  const result = await pool.query(query, values);
  return result.rows[0];
};

/**
 * Crea un nuevo registro de examen externo (link)
 * @param {Object} examData - Datos del examen
 * @returns {Promise<Object>} - Examen creado
 */
const createPatientExternalExamLink = async (examData) => {
  const query = `
    INSERT INTO patient_external_exams (
      patient_id, exam_type, external_url, user_id_registration
    ) VALUES ($1, 'link', $2, $3)
    RETURNING *
  `;
  const values = [
    examData.patient_id,
    examData.external_url,
    examData.user_id
  ];
  const result = await pool.query(query, values);
  return result.rows[0];
};

/**
 * Elimina (soft delete) un examen externo
 * @param {number} examId - ID del examen
 * @param {number} patientId - ID del paciente (para validar propiedad)
 * @returns {Promise<boolean>} - true si se eliminó
 */
const deletePatientExternalExam = async (examId, patientId) => {
  const query = `
    UPDATE patient_external_exams
    SET status = 'deleted', date_time_modification = CURRENT_TIMESTAMP
    WHERE external_exam_id = $1 AND patient_id = $2 AND status = 'active'
    RETURNING external_exam_id
  `;
  const result = await pool.query(query, [examId, patientId]);
  return result.rows.length > 0;
};

/**
 * Obtiene un examen externo por ID (para validar propiedad)
 * @param {number} examId - ID del examen
 * @returns {Promise<Object|null>} - Examen o null
 */
const getPatientExternalExamById = async (examId) => {
  const query = `
    SELECT * FROM patient_external_exams
    WHERE external_exam_id = $1 AND status = 'active'
  `;
  const result = await pool.query(query, [examId]);
  return result.rows.length > 0 ? result.rows[0] : null;
};

module.exports = {
  getPatientIntegralConsultations,
  verifyPatientExists,
  getPatientMedicalSummary,
  getPatientMedicalBackground,
  getPatientLaboratoryRadiographyRequests,
  getPatientProfile,
  updatePatientProfile,
  getPatientExternalExams,
  createPatientExternalExamFile,
  createPatientExternalExamLink,
  deletePatientExternalExam,
  getPatientExternalExamById
};
