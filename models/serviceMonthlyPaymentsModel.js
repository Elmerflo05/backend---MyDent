/**
 * Model: serviceMonthlyPaymentsModel.js
 * Modelo para el tracking de pagos fraccionados de servicios adicionales
 * (ortodoncia, implantes y prótesis)
 */

const pool = require('../config/db');
const { formatDateYMD, formatTimeHMS } = require('../utils/dateUtils');

/**
 * Crea un ingreso (procedure_income) + su pago vinculado (service_monthly_payments)
 * dentro de una misma transacción, asegurando atomicidad y recalculando el número
 * de cuota contra la propia transacción (evita duplicados por concurrencia).
 *
 * @param {Object} params
 * @param {Object} params.incomeData - Datos para procedure_income
 * @param {Object} params.paymentData - Datos para service_monthly_payments (sin payment_number ni income_id)
 * @returns {Promise<{payment: Object, income: Object, payment_number: number}>}
 */
const registerPaymentWithIncome = async ({ incomeData, paymentData }) => {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // 1. Lock del servicio + cómputo del saldo en una sola transacción
    const serviceLockResult = await client.query(`
      SELECT
        consultation_additional_service_id,
        COALESCE(edited_monto_total, original_monto_total, 0)::numeric AS expected_total,
        service_status
      FROM consultation_additional_services
      WHERE consultation_additional_service_id = $1
        AND status = 'active'
      FOR UPDATE
    `, [paymentData.consultation_additional_service_id]);

    if (!serviceLockResult.rows[0]) {
      throw new Error('Servicio adicional no encontrado');
    }

    const { expected_total, service_status } = serviceLockResult.rows[0];

    if (service_status === 'completed') {
      throw new Error('No se pueden agregar pagos a un servicio finalizado');
    }

    const paidSoFarResult = await client.query(`
      SELECT COALESCE(SUM(payment_amount), 0)::numeric AS total_paid
      FROM service_monthly_payments
      WHERE consultation_additional_service_id = $1
        AND status = 'active'
    `, [paymentData.consultation_additional_service_id]);

    const totalPaid = Number(paidSoFarResult.rows[0].total_paid);
    const remainingBalance = Number(expected_total) - totalPaid;
    const paymentAmount = Number(paymentData.payment_amount);

    if (Number(expected_total) > 0 && paymentAmount > remainingBalance + 0.0001) {
      throw new Error(
        `El monto excede el saldo restante. Saldo disponible: S/ ${remainingBalance.toFixed(2)}`
      );
    }

    // 2. Calcular siguiente número de cuota dentro de la misma transacción
    let paymentNumber = 1;
    if (paymentData.payment_type === 'monthly') {
      const nextResult = await client.query(`
        SELECT COALESCE(MAX(payment_number), 0) + 1 AS next_number
        FROM service_monthly_payments
        WHERE consultation_additional_service_id = $1
          AND payment_type = 'monthly'
          AND status = 'active'
      `, [paymentData.consultation_additional_service_id]);
      paymentNumber = nextResult.rows[0].next_number;
    }

    // 3. Crear procedure_income (para trazabilidad/comisión del pago parcial)
    const quotaType = paymentData.payment_type === 'initial' ? 'initial' : 'monthly';
    const incomeQuery = `
      INSERT INTO procedure_income (
        consultation_id,
        patient_id,
        branch_id,
        income_type,
        additional_service_id,
        parent_additional_service_id,
        item_name,
        item_description,
        amount,
        final_amount,
        performed_by_dentist_id,
        performed_date,
        performed_time,
        clinical_notes,
        income_status,
        quota_type,
        quota_number,
        user_id_registration,
        date_time_registration,
        status,
        amount_paid,
        balance,
        payment_status
      ) VALUES (
        $1, $2, $3, 'additional_service', $4, $4,
        $5, $6, $7, $7, $8,
        $9, $10, $11,
        'confirmed', $12, $13, $14, CURRENT_TIMESTAMP, 'active',
        $7, 0, 'paid'
      )
      RETURNING *
    `;

    const incomeResult = await client.query(incomeQuery, [
      incomeData.consultation_id,
      incomeData.patient_id,
      incomeData.branch_id,
      paymentData.consultation_additional_service_id,
      incomeData.item_name,
      incomeData.item_description,
      paymentAmount,
      incomeData.performed_by_dentist_id,
      incomeData.performed_date,
      incomeData.performed_time,
      incomeData.clinical_notes || null,
      quotaType,
      paymentData.payment_type === 'monthly' ? paymentNumber : null,
      incomeData.user_id_registration
    ]);
    const income = incomeResult.rows[0];

    // 4. Crear service_monthly_payments
    const paymentResult = await client.query(`
      INSERT INTO service_monthly_payments (
        consultation_additional_service_id,
        consultation_id,
        patient_id,
        branch_id,
        payment_number,
        payment_amount,
        payment_date,
        payment_type,
        registered_by_dentist_id,
        income_id,
        clinical_notes,
        user_id_registration
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      RETURNING *
    `, [
      paymentData.consultation_additional_service_id,
      paymentData.consultation_id,
      paymentData.patient_id,
      paymentData.branch_id,
      paymentNumber,
      paymentAmount,
      paymentData.payment_date,
      paymentData.payment_type,
      paymentData.registered_by_dentist_id,
      income.income_id,
      paymentData.clinical_notes || null,
      paymentData.user_id_registration
    ]);
    const payment = paymentResult.rows[0];

    // 5. Sincronizar campos denormalizados del servicio
    if (paymentData.payment_type === 'monthly') {
      await client.query(`
        UPDATE consultation_additional_services
        SET
          monthly_payments_count = monthly_payments_count + 1,
          service_status = CASE
            WHEN service_status = 'pending' THEN 'in_progress'
            ELSE service_status
          END,
          user_id_modification = $1,
          date_time_modification = NOW()
        WHERE consultation_additional_service_id = $2
      `, [paymentData.user_id_registration, paymentData.consultation_additional_service_id]);
    } else if (paymentData.payment_type === 'initial') {
      await client.query(`
        UPDATE consultation_additional_services
        SET
          initial_payment_completed = TRUE,
          initial_payment_date = $1,
          initial_payment_income_id = $2,
          service_status = 'in_progress',
          user_id_modification = $3,
          date_time_modification = NOW()
        WHERE consultation_additional_service_id = $4
      `, [
        paymentData.payment_date,
        income.income_id,
        paymentData.user_id_registration,
        paymentData.consultation_additional_service_id
      ]);
    }

    await client.query('COMMIT');
    return { payment, income, payment_number: paymentNumber };

  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

/**
 * Obtener pagos por servicio adicional
 * @param {number} serviceId - ID del servicio adicional
 * @returns {Promise<Array>} Lista de pagos
 */
const getPaymentsByService = async (serviceId) => {
  const query = `
    SELECT
      smp.*,
      u.first_name || ' ' || u.last_name as dentist_name,
      d.professional_license as dentist_cop
    FROM service_monthly_payments smp
    INNER JOIN dentists d ON smp.registered_by_dentist_id = d.dentist_id
    INNER JOIN users u ON d.user_id = u.user_id
    WHERE smp.consultation_additional_service_id = $1
      AND smp.status = 'active'
    ORDER BY smp.payment_number ASC
  `;

  const result = await pool.query(query, [serviceId]);
  return result.rows;
};

/**
 * Obtener pagos por paciente
 * @param {number} patientId - ID del paciente
 * @returns {Promise<Array>} Lista de pagos
 */
const getPaymentsByPatient = async (patientId) => {
  const query = `
    SELECT
      smp.*,
      cas.service_name,
      cas.service_type,
      u.first_name || ' ' || u.last_name as dentist_name,
      b.branch_name
    FROM service_monthly_payments smp
    INNER JOIN consultation_additional_services cas
      ON smp.consultation_additional_service_id = cas.consultation_additional_service_id
    INNER JOIN dentists d ON smp.registered_by_dentist_id = d.dentist_id
    INNER JOIN users u ON d.user_id = u.user_id
    INNER JOIN branches b ON smp.branch_id = b.branch_id
    WHERE smp.patient_id = $1
      AND smp.status = 'active'
    ORDER BY smp.payment_date DESC, smp.payment_number DESC
  `;

  const result = await pool.query(query, [patientId]);
  return result.rows;
};

/**
 * Obtener pagos por dentista (para reportes de comisiones)
 * @param {number} dentistId - ID del dentista
 * @param {string} startDate - Fecha inicio (YYYY-MM-DD)
 * @param {string} endDate - Fecha fin (YYYY-MM-DD)
 * @returns {Promise<Array>} Lista de pagos
 */
const getPaymentsByDentist = async (dentistId, startDate, endDate) => {
  const query = `
    SELECT
      smp.*,
      cas.service_name,
      cas.service_type,
      p.first_name || ' ' || p.last_name as patient_name,
      p.identification_number as patient_dni,
      b.branch_name
    FROM service_monthly_payments smp
    INNER JOIN consultation_additional_services cas
      ON smp.consultation_additional_service_id = cas.consultation_additional_service_id
    INNER JOIN patients p ON smp.patient_id = p.patient_id
    INNER JOIN branches b ON smp.branch_id = b.branch_id
    WHERE smp.registered_by_dentist_id = $1
      AND smp.payment_date >= $2
      AND smp.payment_date <= $3
      AND smp.status = 'active'
    ORDER BY smp.payment_date DESC, smp.payment_number DESC
  `;

  const result = await pool.query(query, [dentistId, startDate, endDate]);
  return result.rows;
};

/**
 * Obtener resumen de pagos por dentista
 * @param {number} dentistId - ID del dentista
 * @param {string} startDate - Fecha inicio
 * @param {string} endDate - Fecha fin
 * @returns {Promise<Object>} Resumen de pagos
 */
const getDentistPaymentsSummary = async (dentistId, startDate, endDate) => {
  const query = `
    SELECT
      COUNT(*) as total_payments,
      SUM(smp.payment_amount) as total_amount,
      smp.payment_type,
      cas.service_type,
      COUNT(DISTINCT smp.patient_id) as unique_patients
    FROM service_monthly_payments smp
    INNER JOIN consultation_additional_services cas
      ON smp.consultation_additional_service_id = cas.consultation_additional_service_id
    WHERE smp.registered_by_dentist_id = $1
      AND smp.payment_date >= $2
      AND smp.payment_date <= $3
      AND smp.status = 'active'
    GROUP BY smp.payment_type, cas.service_type
  `;

  const result = await pool.query(query, [dentistId, startDate, endDate]);
  return result.rows;
};

/**
 * Contar cuotas pagadas de un servicio
 * @param {number} serviceId - ID del servicio adicional
 * @returns {Promise<Object>} Conteo de pagos
 */
const getPaymentCount = async (serviceId) => {
  const query = `
    SELECT
      COUNT(*) FILTER (WHERE payment_type = 'initial') as initial_count,
      COUNT(*) FILTER (WHERE payment_type = 'monthly') as monthly_count,
      SUM(payment_amount) as total_paid
    FROM service_monthly_payments
    WHERE consultation_additional_service_id = $1
      AND status = 'active'
  `;

  const result = await pool.query(query, [serviceId]);
  return result.rows[0];
};

/**
 * Finalizar un servicio (marcar como completado)
 * IMPORTANTE: Genera UN procedure_income con el monto TOTAL del servicio
 * para el cálculo de comisiones. Las cuotas mensuales previas NO generan comisión.
 *
 * @param {number} serviceId - ID del servicio adicional
 * @param {number} dentistId - ID del dentista que finaliza
 * @param {string} notes - Notas de finalizacion
 * @param {number} userId - ID del usuario que registra
 * @returns {Promise<Object>} Servicio actualizado con el ingreso generado
 */
const finalizeService = async (serviceId, dentistId, notes, userId) => {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // 1. Obtener datos completos del servicio
    const serviceQuery = `
      SELECT
        cas.*,
        ctp.consultation_id,
        c.patient_id,
        c.branch_id
      FROM consultation_additional_services cas
      INNER JOIN consultation_treatment_plans ctp
        ON cas.consultation_treatment_plan_id = ctp.consultation_treatment_plan_id
      INNER JOIN consultations c ON ctp.consultation_id = c.consultation_id
      WHERE cas.consultation_additional_service_id = $1
        AND cas.status = 'active'
    `;

    const serviceResult = await client.query(serviceQuery, [serviceId]);

    if (!serviceResult.rows[0]) {
      throw new Error('Servicio no encontrado');
    }

    const service = serviceResult.rows[0];

    // 2. Calcular el monto TOTAL del servicio (editado o original)
    const totalAmount = parseFloat(service.edited_monto_total || service.original_monto_total || 0);

    if (totalAmount <= 0) {
      throw new Error('El monto total del servicio debe ser mayor a 0');
    }

    const completedDate = formatDateYMD();
    const completedTime = formatTimeHMS();

    // 3. Actualizar el servicio como completado
    const updateQuery = `
      UPDATE consultation_additional_services
      SET
        service_status = 'completed',
        service_completed_date = $1,
        service_completed_by_dentist_id = $2,
        final_payment_notes = $3,
        user_id_modification = $4,
        date_time_modification = NOW()
      WHERE consultation_additional_service_id = $5
        AND status = 'active'
      RETURNING *
    `;

    const updateResult = await client.query(updateQuery, [
      completedDate, dentistId, notes, userId, serviceId
    ]);
    const updatedService = updateResult.rows[0];

    // 4. Generar UN procedure_income con el monto TOTAL para comisiones
    // Este es el ingreso que se usará para calcular la comisión del doctor
    const incomeQuery = `
      INSERT INTO procedure_income (
        consultation_id,
        patient_id,
        branch_id,
        income_type,
        additional_service_id,
        parent_additional_service_id,
        item_name,
        item_description,
        amount,
        final_amount,
        performed_by_dentist_id,
        performed_date,
        performed_time,
        clinical_notes,
        income_status,
        is_final_quota,
        quota_type,
        status,
        user_id_registration,
        date_time_registration
      ) VALUES (
        $1, $2, $3, 'additional_service_completion', $4, $4,
        $5, $6, $7, $7, $8,
        $9, $10, $11,
        'confirmed', TRUE, 'final', 'active', $12, CURRENT_TIMESTAMP
      )
      RETURNING *
    `;

    const SERVICE_TYPE_LABELS = {
      orthodontic: 'Ortodoncia',
      implant: 'Implante',
      prosthesis: 'Prótesis'
    };
    const serviceTypeName = SERVICE_TYPE_LABELS[service.service_type] || 'Servicio Adicional';

    const incomeParams = [
      service.consultation_id,
      service.patient_id,
      service.branch_id,
      serviceId,
      `${serviceTypeName} - ${service.service_name || 'Tratamiento Completado'}`,
      `Finalización de ${serviceTypeName.toLowerCase()}: ${service.service_name || ''}. Monto total del tratamiento para comisión.`,
      totalAmount,
      dentistId,
      completedDate,
      completedTime,
      notes || `Tratamiento de ${serviceTypeName.toLowerCase()} completado satisfactoriamente`,
      userId
    ];

    const incomeResult = await client.query(incomeQuery, incomeParams);
    const income = incomeResult.rows[0];

    // 5. Actualizar el servicio con el ID del ingreso de finalización
    await client.query(`
      UPDATE consultation_additional_services
      SET completion_income_id = $1
      WHERE consultation_additional_service_id = $2
    `, [income.income_id, serviceId]);

    await client.query('COMMIT');

    return {
      ...updatedService,
      completion_income: income,
      total_amount_for_commission: totalAmount
    };

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error en finalizeService:', error);
    throw error;
  } finally {
    client.release();
  }
};

/**
 * Obtener estado de un servicio con sus pagos
 * @param {number} serviceId - ID del servicio adicional
 * @returns {Promise<Object>} Estado completo del servicio
 */
const getServicePaymentStatus = async (serviceId) => {
  const serviceQuery = `
    SELECT
      cas.*,
      ctp.consultation_id,
      c.patient_id,
      c.branch_id,
      p.first_name || ' ' || p.last_name as patient_name,
      b.branch_name
    FROM consultation_additional_services cas
    INNER JOIN consultation_treatment_plans ctp
      ON cas.consultation_treatment_plan_id = ctp.consultation_treatment_plan_id
    INNER JOIN consultations c ON ctp.consultation_id = c.consultation_id
    INNER JOIN patients p ON c.patient_id = p.patient_id
    INNER JOIN branches b ON c.branch_id = b.branch_id
    WHERE cas.consultation_additional_service_id = $1
      AND cas.status = 'active'
  `;

  const paymentsQuery = `
    SELECT
      smp.*,
      u.first_name || ' ' || u.last_name as dentist_name
    FROM service_monthly_payments smp
    INNER JOIN dentists d ON smp.registered_by_dentist_id = d.dentist_id
    INNER JOIN users u ON d.user_id = u.user_id
    WHERE smp.consultation_additional_service_id = $1
      AND smp.status = 'active'
    ORDER BY smp.payment_type DESC, smp.payment_number ASC
  `;

  const [serviceResult, paymentsResult] = await Promise.all([
    pool.query(serviceQuery, [serviceId]),
    pool.query(paymentsQuery, [serviceId])
  ]);

  if (!serviceResult.rows[0]) {
    return null;
  }

  return {
    service: serviceResult.rows[0],
    payments: paymentsResult.rows
  };
};

/**
 * Devuelve el estado de cuenta consolidado del paciente:
 * lista de servicios adicionales activos con presupuesto, pagado, saldo, progreso y pagos.
 *
 * Incluye tanto servicios en curso como finalizados, ordenados por estado y fecha.
 *
 * @param {number} patientId
 * @returns {Promise<Array>}
 */
const getPatientAccountStatement = async (patientId) => {
  const servicesQuery = `
    SELECT
      cas.consultation_additional_service_id,
      cas.consultation_treatment_plan_id,
      cas.service_type,
      cas.service_name,
      cas.modality,
      cas.service_status,
      cas.initial_payment_completed,
      TO_CHAR(cas.initial_payment_date, 'YYYY-MM-DD') AS initial_payment_date,
      COALESCE(cas.monthly_payments_count, 0) AS monthly_payments_count,
      TO_CHAR(cas.service_completed_date, 'YYYY-MM-DD') AS service_completed_date,
      COALESCE(cas.edited_monto_total, cas.original_monto_total, 0)::numeric AS expected_total,
      COALESCE(cas.edited_inicial, cas.original_inicial, 0)::numeric AS initial_expected,
      COALESCE(cas.edited_mensual, cas.original_mensual, 0)::numeric AS monthly_expected,
      ctp.consultation_id,
      c.patient_id,
      c.branch_id,
      b.branch_name,
      TO_CHAR(c.consultation_date, 'YYYY-MM-DD') AS consultation_date
    FROM consultation_additional_services cas
    INNER JOIN consultation_treatment_plans ctp
      ON cas.consultation_treatment_plan_id = ctp.consultation_treatment_plan_id
    INNER JOIN consultations c ON ctp.consultation_id = c.consultation_id
    INNER JOIN branches b ON c.branch_id = b.branch_id
    WHERE c.patient_id = $1
      AND cas.status = 'active'
      AND COALESCE(cas.edited_monto_total, cas.original_monto_total, 0) > 0
    ORDER BY
      CASE cas.service_status
        WHEN 'in_progress' THEN 1
        WHEN 'pending' THEN 2
        WHEN 'completed' THEN 3
        ELSE 4
      END,
      c.consultation_date DESC
  `;

  const servicesResult = await pool.query(servicesQuery, [patientId]);
  const services = servicesResult.rows;

  if (services.length === 0) {
    return [];
  }

  const serviceIds = services.map(s => s.consultation_additional_service_id);

  const paymentsResult = await pool.query(`
    SELECT
      smp.payment_id,
      smp.consultation_additional_service_id,
      smp.payment_number,
      smp.payment_amount,
      TO_CHAR(smp.payment_date, 'YYYY-MM-DD') AS payment_date,
      smp.payment_type,
      smp.clinical_notes,
      smp.status,
      u.first_name || ' ' || u.last_name AS dentist_name,
      d.professional_license AS dentist_cop
    FROM service_monthly_payments smp
    INNER JOIN dentists d ON smp.registered_by_dentist_id = d.dentist_id
    INNER JOIN users u ON d.user_id = u.user_id
    WHERE smp.consultation_additional_service_id = ANY($1::int[])
      AND smp.status = 'active'
    ORDER BY smp.payment_type DESC, smp.payment_number ASC, smp.payment_date ASC
  `, [serviceIds]);

  const paymentsByService = new Map();
  for (const payment of paymentsResult.rows) {
    const sid = payment.consultation_additional_service_id;
    if (!paymentsByService.has(sid)) paymentsByService.set(sid, []);
    paymentsByService.get(sid).push(payment);
  }

  return services.map(service => {
    const payments = paymentsByService.get(service.consultation_additional_service_id) || [];
    const expectedTotal = Number(service.expected_total);
    const totalPaid = payments.reduce((acc, p) => acc + Number(p.payment_amount || 0), 0);
    const remainingBalance = Math.max(expectedTotal - totalPaid, 0);
    const progressPercent = expectedTotal > 0
      ? Math.min(100, Math.round((totalPaid / expectedTotal) * 10000) / 100)
      : 0;
    const lastPayment = payments.length > 0
      ? payments.reduce((a, b) => (new Date(a.payment_date) > new Date(b.payment_date) ? a : b))
      : null;

    return {
      ...service,
      expected_total: Number(expectedTotal.toFixed(2)),
      initial_expected: Number(Number(service.initial_expected).toFixed(2)),
      monthly_expected: Number(Number(service.monthly_expected).toFixed(2)),
      total_paid: Number(totalPaid.toFixed(2)),
      remaining_balance: Number(remainingBalance.toFixed(2)),
      progress_percent: progressPercent,
      is_fully_paid: expectedTotal > 0 && remainingBalance <= 0.0001,
      is_completed: service.service_status === 'completed',
      last_payment_date: lastPayment ? lastPayment.payment_date : null,
      payments
    };
  });
};

/**
 * Calcula el saldo restante de un servicio adicional.
 * Fuente de verdad: edited_monto_total (o original_monto_total si no editado) menos Σ pagos activos.
 *
 * @param {number} serviceId
 * @returns {Promise<{expected_total:number,total_paid:number,remaining_balance:number}>}
 */
const getRemainingBalance = async (serviceId) => {
  const result = await pool.query(`
    SELECT
      COALESCE(cas.edited_monto_total, cas.original_monto_total, 0)::numeric AS expected_total,
      COALESCE((
        SELECT SUM(smp.payment_amount)
        FROM service_monthly_payments smp
        WHERE smp.consultation_additional_service_id = cas.consultation_additional_service_id
          AND smp.status = 'active'
      ), 0)::numeric AS total_paid
    FROM consultation_additional_services cas
    WHERE cas.consultation_additional_service_id = $1
      AND cas.status = 'active'
  `, [serviceId]);

  if (!result.rows[0]) {
    return null;
  }

  const expected_total = Number(result.rows[0].expected_total);
  const total_paid = Number(result.rows[0].total_paid);
  return {
    expected_total,
    total_paid,
    remaining_balance: Math.max(expected_total - total_paid, 0)
  };
};

/**
 * Eliminar (soft delete) un pago
 * @param {number} paymentId - ID del pago
 * @param {number} userId - ID del usuario que elimina
 * @returns {Promise<Object>} Pago eliminado
 */
const deletePayment = async (paymentId, userId) => {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // 1. Obtener datos del pago antes de eliminar
    const paymentResult = await client.query(`
      SELECT * FROM service_monthly_payments
      WHERE payment_id = $1 AND status = 'active'
    `, [paymentId]);

    if (!paymentResult.rows[0]) {
      throw new Error('Pago no encontrado');
    }

    const payment = paymentResult.rows[0];

    // 2. Soft delete del pago
    await client.query(`
      UPDATE service_monthly_payments
      SET
        status = 'inactive',
        user_id_modification = $1,
        date_time_modification = NOW()
      WHERE payment_id = $2
    `, [userId, paymentId]);

    // 3. Anular el ingreso asociado (procedure_income) para que no cuente en comisiones
    if (payment.income_id) {
      await client.query(`
        UPDATE procedure_income
        SET
          income_status = 'cancelled',
          status = 'inactive',
          user_id_modification = $1,
          date_time_modification = NOW()
        WHERE income_id = $2
      `, [userId, payment.income_id]);
    }

    // 4. Actualizar contador si era pago mensual
    if (payment.payment_type === 'monthly') {
      await client.query(`
        UPDATE consultation_additional_services
        SET
          monthly_payments_count = GREATEST(monthly_payments_count - 1, 0),
          user_id_modification = $1,
          date_time_modification = NOW()
        WHERE consultation_additional_service_id = $2
      `, [userId, payment.consultation_additional_service_id]);
    } else if (payment.payment_type === 'initial') {
      await client.query(`
        UPDATE consultation_additional_services
        SET
          initial_payment_completed = FALSE,
          initial_payment_date = NULL,
          initial_payment_income_id = NULL,
          user_id_modification = $1,
          date_time_modification = NOW()
        WHERE consultation_additional_service_id = $2
      `, [userId, payment.consultation_additional_service_id]);
    }

    await client.query('COMMIT');
    return payment;

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error en deletePayment:', error);
    throw error;
  } finally {
    client.release();
  }
};

/**
 * Obtener todos los pagos con filtros
 * @param {Object} filters - Filtros de busqueda
 * @returns {Promise<Array>} Lista de pagos
 */
const getAllPayments = async (filters = {}) => {
  let query = `
    SELECT
      smp.*,
      cas.service_name,
      cas.service_type,
      p.first_name || ' ' || p.last_name as patient_name,
      p.identification_number as patient_dni,
      u.first_name || ' ' || u.last_name as dentist_name,
      b.branch_name
    FROM service_monthly_payments smp
    INNER JOIN consultation_additional_services cas
      ON smp.consultation_additional_service_id = cas.consultation_additional_service_id
    INNER JOIN patients p ON smp.patient_id = p.patient_id
    INNER JOIN dentists d ON smp.registered_by_dentist_id = d.dentist_id
    INNER JOIN users u ON d.user_id = u.user_id
    INNER JOIN branches b ON smp.branch_id = b.branch_id
    WHERE smp.status = 'active'
  `;

  const params = [];
  let paramIndex = 1;

  if (filters.patient_id) {
    query += ` AND smp.patient_id = $${paramIndex}`;
    params.push(filters.patient_id);
    paramIndex++;
  }

  if (filters.dentist_id) {
    query += ` AND smp.registered_by_dentist_id = $${paramIndex}`;
    params.push(filters.dentist_id);
    paramIndex++;
  }

  if (filters.branch_id) {
    query += ` AND smp.branch_id = $${paramIndex}`;
    params.push(filters.branch_id);
    paramIndex++;
  }

  if (filters.service_type) {
    query += ` AND cas.service_type = $${paramIndex}`;
    params.push(filters.service_type);
    paramIndex++;
  }

  if (filters.payment_type) {
    query += ` AND smp.payment_type = $${paramIndex}`;
    params.push(filters.payment_type);
    paramIndex++;
  }

  if (filters.date_from) {
    query += ` AND smp.payment_date >= $${paramIndex}`;
    params.push(filters.date_from);
    paramIndex++;
  }

  if (filters.date_to) {
    query += ` AND smp.payment_date <= $${paramIndex}`;
    params.push(filters.date_to);
    paramIndex++;
  }

  query += ` ORDER BY smp.payment_date DESC, smp.payment_number DESC`;

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

module.exports = {
  registerPaymentWithIncome,
  getPaymentsByService,
  getPaymentsByPatient,
  getPaymentsByDentist,
  getDentistPaymentsSummary,
  getPaymentCount,
  finalizeService,
  getServicePaymentStatus,
  getRemainingBalance,
  getPatientAccountStatement,
  deletePayment,
  getAllPayments
};
