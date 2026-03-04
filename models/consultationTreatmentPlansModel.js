const pool = require('../config/db');

/**
 * MODELO DE PLANES DE TRATAMIENTO DE CONSULTA
 * Maneja el guardado del plan de tratamiento del Paso 8 de Atencion Integral
 *
 * ENFOQUE DIFERENCIAL:
 * - AGREGAR: Se insertan nuevos registros con user_id_registration
 * - EDITAR: Se actualizan registros existentes con user_id_modification
 * - ELIMINAR: Se marcan como 'inactive' con user_id_modification
 *
 * Tablas:
 * - consultation_treatment_plans: Plan principal vinculado a consulta
 * - consultation_treatment_items: Tratamientos aplicados
 * - consultation_treatment_item_conditions: Condiciones de cada tratamiento
 * - consultation_additional_services: Servicios adicionales seleccionados
 */

// ============================================================
// FUNCIONES AUXILIARES PARA SINCRONIZACIÓN DIFERENCIAL
// ============================================================

/**
 * Genera un identificador único para un servicio adicional basado en su tipo e ID
 */
const getServiceUniqueKey = (service) => {
  if (service.orthodontic_plan_id) return `ortho-${service.orthodontic_plan_id}`;
  if (service.implant_plan_id) return `implant-${service.implant_plan_id}`;
  if (service.prosthesis_item_id) return `prosthesis-${service.prosthesis_item_id}`;
  return service.id || `${service.service_type}-${service.service_name}`;
};

/**
 * Parsea el ID del servicio del frontend al formato de la BD
 */
const parseServiceId = (serviceId) => {
  let orthodonticPlanId = null;
  let implantPlanId = null;
  let prosthesisItemId = null;

  if (serviceId.startsWith('ortho-')) {
    orthodonticPlanId = parseInt(serviceId.replace('ortho-', ''));
  } else if (serviceId.startsWith('implant-')) {
    implantPlanId = parseInt(serviceId.replace('implant-', ''));
  } else if (serviceId.startsWith('prosthesis-')) {
    prosthesisItemId = parseInt(serviceId.replace('prosthesis-', ''));
  }

  return { orthodonticPlanId, implantPlanId, prosthesisItemId };
};

// ============================================================
// PLAN DE TRATAMIENTO DE CONSULTA (Tabla principal)
// ============================================================

/**
 * Obtiene el plan de tratamiento de una consulta
 */
const getByConsultationId = async (consultationId) => {
  const client = await pool.connect();
  try {
    const planResult = await client.query(`
      SELECT * FROM consultation_treatment_plans
      WHERE consultation_id = $1 AND status = 'active'
    `, [consultationId]);

    if (planResult.rows.length === 0) return null;

    const plan = planResult.rows[0];

    // Obtener tratamientos con sus condiciones
    const treatmentsResult = await client.query(`
      SELECT
        cti.consultation_treatment_item_id,
        cti.treatment_id,
        cti.treatment_name,
        cti.total_amount,
        cti.display_order,
        t.treatment_code
      FROM consultation_treatment_items cti
      LEFT JOIN treatments t ON cti.treatment_id = t.treatment_id
      WHERE cti.consultation_treatment_plan_id = $1 AND cti.status = 'active'
      ORDER BY cti.display_order
    `, [plan.consultation_treatment_plan_id]);

    const treatments = [];
    for (const treatment of treatmentsResult.rows) {
      const conditionsResult = await client.query(`
        SELECT
          ctic.condition_id,
          ctic.label,
          ctic.price,
          ctic.quantity,
          ctic.subtotal,
          ctic.display_order,
          ctic.definitive_condition_id,
          ctic.sub_procedure_id,
          sp.sub_procedure_code,
          sp.sub_procedure_name as catalog_name,
          sp.specialty,
          ddc.tooth_number,
          ddc.selected_procedure_id,
          ddc.procedure_price,
          ocp.procedure_name as selected_procedure_name
        FROM consultation_treatment_item_conditions ctic
        LEFT JOIN sub_procedures sp ON ctic.sub_procedure_id = sp.sub_procedure_id
        LEFT JOIN definitive_diagnosis_conditions ddc ON ctic.definitive_condition_id = ddc.definitive_condition_id
        LEFT JOIN odontogram_condition_procedures ocp ON ddc.selected_procedure_id = ocp.condition_procedure_id
        WHERE ctic.consultation_treatment_item_id = $1 AND ctic.status = 'active'
        ORDER BY ctic.display_order
      `, [treatment.consultation_treatment_item_id]);

      treatments.push({ ...treatment, conditions: conditionsResult.rows });
    }

    // Obtener servicios adicionales
    const servicesResult = await client.query(`
      SELECT * FROM consultation_additional_services
      WHERE consultation_treatment_plan_id = $1 AND status = 'active'
      ORDER BY display_order
    `, [plan.consultation_treatment_plan_id]);

    return { ...plan, treatments, additionalServices: servicesResult.rows };
  } finally {
    client.release();
  }
};

/**
 * Crea o actualiza el plan de tratamiento con ENFOQUE DIFERENCIAL
 */
const upsertConsultationTreatmentPlan = async (consultationId, data, userId) => {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // Calcular totales desde la BD si el frontend no los envía
    // 1. Total del diagnóstico definitivo (desde definitive_diagnosis_conditions)
    let definitiveConditionsTotal = data.definitiveConditionsTotal || 0;
    if (!definitiveConditionsTotal || definitiveConditionsTotal === 0) {
      const ddcTotalResult = await client.query(`
        SELECT COALESCE(SUM(
          CASE
            WHEN procedure_price IS NOT NULL AND procedure_price > 0 THEN procedure_price
            ELSE COALESCE(price, 0)
          END
        ), 0) as total
        FROM definitive_diagnosis_conditions
        WHERE consultation_id = $1 AND status = 'active'
      `, [consultationId]);
      definitiveConditionsTotal = parseFloat(ddcTotalResult.rows[0]?.total) || 0;
    }

    // 2. Total de tratamientos (desde treatment_total si lo envía)
    let treatmentsTotal = data.treatmentsTotal || 0;

    // 3. Total de servicios adicionales
    let additionalServicesTotal = data.additionalServicesTotal || 0;

    // 4. Gran total
    const grandTotal = definitiveConditionsTotal + treatmentsTotal + additionalServicesTotal;

    // 1. UPSERT del plan principal
    const existingPlan = await client.query(`
      SELECT consultation_treatment_plan_id
      FROM consultation_treatment_plans
      WHERE consultation_id = $1 AND status = 'active'
    `, [consultationId]);

    let planId;
    const isUpdate = existingPlan.rows.length > 0;

    if (isUpdate) {
      planId = existingPlan.rows[0].consultation_treatment_plan_id;
      await client.query(`
        UPDATE consultation_treatment_plans SET
          plan_name = COALESCE($1, plan_name),
          definitive_diagnosis_total = $2,
          treatments_total = $3,
          additional_services_total = $4,
          grand_total = $5,
          has_initial_payment = $6,
          initial_payment = $7,
          monthly_payment = $8,
          observations = $9,
          user_id_modification = $10,
          date_time_modification = CURRENT_TIMESTAMP
        WHERE consultation_treatment_plan_id = $11
      `, [
        data.planName || null,
        definitiveConditionsTotal,
        treatmentsTotal,
        additionalServicesTotal,
        grandTotal,
        data.hasInitialPayment !== undefined ? data.hasInitialPayment : true,
        data.initialPayment || 0,
        data.monthlyPayment || 0,
        data.observations || null,
        userId,
        planId
      ]);
    } else {
      const insertResult = await client.query(`
        INSERT INTO consultation_treatment_plans (
          consultation_id, plan_name, definitive_diagnosis_total, treatments_total,
          additional_services_total, grand_total, has_initial_payment,
          initial_payment, monthly_payment, observations, user_id_registration
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        RETURNING consultation_treatment_plan_id
      `, [
        consultationId,
        data.planName || `Plan Tratamiento - Consulta ${consultationId}`,
        definitiveConditionsTotal,
        treatmentsTotal,
        additionalServicesTotal,
        grandTotal,
        data.hasInitialPayment !== undefined ? data.hasInitialPayment : true,
        data.initialPayment || 0,
        data.monthlyPayment || 0,
        data.observations || null,
        userId
      ]);
      planId = insertResult.rows[0].consultation_treatment_plan_id;
    }

    // 2. SINCRONIZACIÓN DIFERENCIAL DE TRATAMIENTOS
    await syncTreatmentItems(client, planId, data.appliedTreatments || [], userId);

    // 3. SINCRONIZACIÓN DIFERENCIAL DE SERVICIOS ADICIONALES
    await syncAdditionalServices(client, planId, data.selectedAdditionalServices || [], userId);

    await client.query('COMMIT');
    return await getByConsultationId(consultationId);

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error en upsertConsultationTreatmentPlan:', error);
    throw error;
  } finally {
    client.release();
  }
};

/**
 * SINCRONIZACIÓN DIFERENCIAL DE TRATAMIENTOS
 * - Compara tratamientos existentes con los nuevos
 * - AGREGA los nuevos, EDITA los modificados, DESACTIVA los eliminados
 */
const syncTreatmentItems = async (client, planId, newTreatments, userId) => {
  // Obtener tratamientos existentes activos
  const existingResult = await client.query(`
    SELECT consultation_treatment_item_id, treatment_id, treatment_name, total_amount
    FROM consultation_treatment_items
    WHERE consultation_treatment_plan_id = $1 AND status = 'active'
  `, [planId]);

  const existingItems = existingResult.rows;
  const existingMap = new Map();

  // Crear mapa de existentes por treatment_id o treatment_name
  for (const item of existingItems) {
    const key = item.treatment_id ? `id-${item.treatment_id}` : `name-${item.treatment_name}`;
    existingMap.set(key, item);
  }

  const processedIds = new Set();

  // Procesar cada tratamiento nuevo
  for (let i = 0; i < newTreatments.length; i++) {
    const treatment = newTreatments[i];
    const treatmentIdNum = treatment.treatmentId ? parseInt(treatment.treatmentId) : null;
    const key = treatmentIdNum ? `id-${treatmentIdNum}` : `name-${treatment.treatmentName}`;

    const existing = existingMap.get(key);

    if (existing) {
      // EDITAR - El tratamiento ya existe
      processedIds.add(existing.consultation_treatment_item_id);

      // Verificar si hay cambios
      const hasChanges =
        existing.treatment_name !== treatment.treatmentName ||
        parseFloat(existing.total_amount) !== parseFloat(treatment.totalAmount || 0);

      if (hasChanges) {
        await client.query(`
          UPDATE consultation_treatment_items SET
            treatment_name = $1,
            total_amount = $2,
            display_order = $3,
            user_id_modification = $4,
            date_time_modification = CURRENT_TIMESTAMP
          WHERE consultation_treatment_item_id = $5
        `, [treatment.treatmentName, treatment.totalAmount || 0, i + 1, userId, existing.consultation_treatment_item_id]);
      }

      // Sincronizar condiciones de este tratamiento
      await syncTreatmentConditions(client, existing.consultation_treatment_item_id, treatment.conditions || [], userId);

    } else {
      // AGREGAR - Nuevo tratamiento
      const insertResult = await client.query(`
        INSERT INTO consultation_treatment_items (
          consultation_treatment_plan_id, treatment_id, treatment_name,
          total_amount, display_order, user_id_registration
        ) VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING consultation_treatment_item_id
      `, [planId, treatmentIdNum, treatment.treatmentName, treatment.totalAmount || 0, i + 1, userId]);

      const newItemId = insertResult.rows[0].consultation_treatment_item_id;
      processedIds.add(newItemId);

      // Insertar condiciones del nuevo tratamiento
      if (treatment.conditions && treatment.conditions.length > 0) {
        for (let j = 0; j < treatment.conditions.length; j++) {
          const cond = treatment.conditions[j];
          const definitiveConditionId = cond.definitiveConditionId || cond.definitive_condition_id || null;
          await client.query(`
            INSERT INTO consultation_treatment_item_conditions (
              consultation_treatment_item_id, label, price, quantity, display_order, definitive_condition_id, user_id_registration
            ) VALUES ($1, $2, $3, $4, $5, $6, $7)
          `, [newItemId, cond.label, cond.price || 0, cond.quantity || 1, j + 1, definitiveConditionId, userId]);
        }
      }
    }
  }

  // DESACTIVAR - Tratamientos que ya no están en la lista
  for (const item of existingItems) {
    if (!processedIds.has(item.consultation_treatment_item_id)) {
      await client.query(`
        UPDATE consultation_treatment_items SET
          status = 'inactive',
          user_id_modification = $1,
          date_time_modification = CURRENT_TIMESTAMP
        WHERE consultation_treatment_item_id = $2
      `, [userId, item.consultation_treatment_item_id]);

      // También desactivar sus condiciones
      await client.query(`
        UPDATE consultation_treatment_item_conditions SET
          status = 'inactive',
          user_id_modification = $1,
          date_time_modification = CURRENT_TIMESTAMP
        WHERE consultation_treatment_item_id = $2
      `, [userId, item.consultation_treatment_item_id]);
    }
  }
};

/**
 * SINCRONIZACION DIFERENCIAL DE CONDICIONES DE TRATAMIENTO
 * Incluye soporte para definitive_condition_id (FK al diagnostico definitivo)
 */
const syncTreatmentConditions = async (client, treatmentItemId, newConditions, userId) => {
  // Obtener condiciones existentes
  const existingResult = await client.query(`
    SELECT condition_id, label, price, quantity, definitive_condition_id, sub_procedure_id
    FROM consultation_treatment_item_conditions
    WHERE consultation_treatment_item_id = $1 AND status = 'active'
  `, [treatmentItemId]);

  const existingConditions = existingResult.rows;
  const existingMap = new Map();

  for (const cond of existingConditions) {
    existingMap.set(cond.label, cond);
  }

  const processedIds = new Set();

  // Procesar cada condicion nueva
  for (let j = 0; j < newConditions.length; j++) {
    const cond = newConditions[j];
    const existing = existingMap.get(cond.label);
    const definitiveConditionId = cond.definitiveConditionId || cond.definitive_condition_id || null;

    if (existing) {
      // EDITAR
      processedIds.add(existing.condition_id);

      const subProcedureId = cond.subProcedureId || cond.sub_procedure_id || null;
      const hasChanges =
        parseFloat(existing.price) !== parseFloat(cond.price || 0) ||
        parseInt(existing.quantity) !== parseInt(cond.quantity || 1) ||
        existing.definitive_condition_id !== definitiveConditionId ||
        existing.sub_procedure_id !== subProcedureId;

      if (hasChanges) {
        await client.query(`
          UPDATE consultation_treatment_item_conditions SET
            price = $1,
            quantity = $2,
            display_order = $3,
            definitive_condition_id = $4,
            sub_procedure_id = $5,
            user_id_modification = $6,
            date_time_modification = CURRENT_TIMESTAMP
          WHERE condition_id = $7
        `, [cond.price || 0, cond.quantity || 1, j + 1, definitiveConditionId, subProcedureId, userId, existing.condition_id]);
      }
    } else {
      // AGREGAR
      const subProcedureId = cond.subProcedureId || cond.sub_procedure_id || null;
      const insertResult = await client.query(`
        INSERT INTO consultation_treatment_item_conditions (
          consultation_treatment_item_id, label, price, quantity, display_order, definitive_condition_id, sub_procedure_id, user_id_registration
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING condition_id
      `, [treatmentItemId, cond.label, cond.price || 0, cond.quantity || 1, j + 1, definitiveConditionId, subProcedureId, userId]);
      processedIds.add(insertResult.rows[0].condition_id);
    }
  }

  // DESACTIVAR condiciones eliminadas
  for (const cond of existingConditions) {
    if (!processedIds.has(cond.condition_id)) {
      await client.query(`
        UPDATE consultation_treatment_item_conditions SET
          status = 'inactive',
          user_id_modification = $1,
          date_time_modification = CURRENT_TIMESTAMP
        WHERE condition_id = $2
      `, [userId, cond.condition_id]);
    }
  }
};

/**
 * SINCRONIZACIÓN DIFERENCIAL DE SERVICIOS ADICIONALES
 */
const syncAdditionalServices = async (client, planId, newServices, userId) => {
  // Obtener servicios existentes
  const existingResult = await client.query(`
    SELECT * FROM consultation_additional_services
    WHERE consultation_treatment_plan_id = $1 AND status = 'active'
  `, [planId]);

  const existingServices = existingResult.rows;
  const existingMap = new Map();

  for (const svc of existingServices) {
    const key = getServiceUniqueKey(svc);
    existingMap.set(key, svc);
  }

  const processedIds = new Set();

  // Procesar cada servicio nuevo
  for (let i = 0; i < newServices.length; i++) {
    const service = newServices[i];
    const key = service.id;
    const existing = existingMap.get(key);
    const { orthodonticPlanId, implantPlanId, prosthesisItemId } = parseServiceId(service.id);

    if (existing) {
      // EDITAR - El servicio ya existe
      processedIds.add(existing.consultation_additional_service_id);

      // Verificar si hay cambios en los precios editados
      const hasChanges =
        parseFloat(existing.edited_monto_total) !== parseFloat(service.editedFields?.montoTotal || 0) ||
        parseFloat(existing.edited_inicial) !== parseFloat(service.editedFields?.inicial || 0) ||
        parseFloat(existing.edited_mensual) !== parseFloat(service.editedFields?.mensual || 0) ||
        existing.service_name !== service.name ||
        existing.modality !== (service.modality || null);

      if (hasChanges) {
        await client.query(`
          UPDATE consultation_additional_services SET
            service_name = $1,
            modality = $2,
            description = $3,
            original_monto_total = $4,
            original_inicial = $5,
            original_mensual = $6,
            edited_monto_total = $7,
            edited_inicial = $8,
            edited_mensual = $9,
            display_order = $10,
            user_id_modification = $11,
            date_time_modification = CURRENT_TIMESTAMP
          WHERE consultation_additional_service_id = $12
        `, [
          service.name,
          service.modality || null,
          service.description || null,
          service.originalFields?.montoTotal || 0,
          service.originalFields?.inicial || 0,
          service.originalFields?.mensual || 0,
          service.editedFields?.montoTotal || 0,
          service.editedFields?.inicial || 0,
          service.editedFields?.mensual || 0,
          i + 1,
          userId,
          existing.consultation_additional_service_id
        ]);
      }
    } else {
      // AGREGAR - Nuevo servicio
      const insertResult = await client.query(`
        INSERT INTO consultation_additional_services (
          consultation_treatment_plan_id, service_type, orthodontic_plan_id,
          implant_plan_id, prosthesis_item_id, service_name, modality,
          description, original_monto_total, original_inicial, original_mensual,
          edited_monto_total, edited_inicial, edited_mensual, display_order,
          user_id_registration
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
        RETURNING consultation_additional_service_id
      `, [
        planId,
        service.type,
        orthodonticPlanId,
        implantPlanId,
        prosthesisItemId,
        service.name,
        service.modality || null,
        service.description || null,
        service.originalFields?.montoTotal || 0,
        service.originalFields?.inicial || 0,
        service.originalFields?.mensual || 0,
        service.editedFields?.montoTotal || 0,
        service.editedFields?.inicial || 0,
        service.editedFields?.mensual || 0,
        i + 1,
        userId
      ]);
      processedIds.add(insertResult.rows[0].consultation_additional_service_id);
    }
  }

  // DESACTIVAR servicios eliminados
  for (const svc of existingServices) {
    if (!processedIds.has(svc.consultation_additional_service_id)) {
      await client.query(`
        UPDATE consultation_additional_services SET
          status = 'inactive',
          user_id_modification = $1,
          date_time_modification = CURRENT_TIMESTAMP
        WHERE consultation_additional_service_id = $2
      `, [userId, svc.consultation_additional_service_id]);
    }
  }
};

/**
 * Elimina (soft delete) el plan de tratamiento de una consulta
 */
const deleteByConsultationId = async (consultationId, userId) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Obtener el plan
    const planResult = await client.query(`
      SELECT consultation_treatment_plan_id
      FROM consultation_treatment_plans
      WHERE consultation_id = $1 AND status = 'active'
    `, [consultationId]);

    if (planResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return false;
    }

    const planId = planResult.rows[0].consultation_treatment_plan_id;

    // Desactivar condiciones de tratamientos
    await client.query(`
      UPDATE consultation_treatment_item_conditions SET
        status = 'inactive',
        user_id_modification = $1,
        date_time_modification = CURRENT_TIMESTAMP
      WHERE consultation_treatment_item_id IN (
        SELECT consultation_treatment_item_id
        FROM consultation_treatment_items
        WHERE consultation_treatment_plan_id = $2
      )
    `, [userId, planId]);

    // Desactivar tratamientos
    await client.query(`
      UPDATE consultation_treatment_items SET
        status = 'inactive',
        user_id_modification = $1,
        date_time_modification = CURRENT_TIMESTAMP
      WHERE consultation_treatment_plan_id = $2
    `, [userId, planId]);

    // Desactivar servicios adicionales
    await client.query(`
      UPDATE consultation_additional_services SET
        status = 'inactive',
        user_id_modification = $1,
        date_time_modification = CURRENT_TIMESTAMP
      WHERE consultation_treatment_plan_id = $2
    `, [userId, planId]);

    // Desactivar el plan
    await client.query(`
      UPDATE consultation_treatment_plans SET
        status = 'inactive',
        user_id_modification = $1,
        date_time_modification = CURRENT_TIMESTAMP
      WHERE consultation_treatment_plan_id = $2
    `, [userId, planId]);

    await client.query('COMMIT');
    return true;
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error en deleteByConsultationId:', error);
    throw error;
  } finally {
    client.release();
  }
};

/**
 * Obtiene un resumen del plan de tratamiento
 */
const getSummary = async (consultationId) => {
  const result = await pool.query(`
    SELECT
      ctp.*,
      (SELECT COUNT(*) FROM consultation_treatment_items cti
       WHERE cti.consultation_treatment_plan_id = ctp.consultation_treatment_plan_id
       AND cti.status = 'active') as treatments_count,
      (SELECT COUNT(*) FROM consultation_additional_services cas
       WHERE cas.consultation_treatment_plan_id = ctp.consultation_treatment_plan_id
       AND cas.status = 'active') as additional_services_count
    FROM consultation_treatment_plans ctp
    WHERE ctp.consultation_id = $1 AND ctp.status = 'active'
  `, [consultationId]);

  return result.rows[0] || null;
};

/**
 * Verifica si existe un plan de tratamiento para la consulta
 */
const exists = async (consultationId) => {
  const result = await pool.query(`
    SELECT 1 FROM consultation_treatment_plans
    WHERE consultation_id = $1 AND status = 'active'
    LIMIT 1
  `, [consultationId]);
  return result.rowCount > 0;
};

module.exports = {
  getByConsultationId,
  upsertConsultationTreatmentPlan,
  deleteByConsultationId,
  getSummary,
  exists
};
