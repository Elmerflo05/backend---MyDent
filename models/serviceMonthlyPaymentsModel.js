/**
 * Model: serviceMonthlyPaymentsModel.js
 * Modelo para el tracking de pagos mensuales recurrentes de servicios adicionales
 * (ortodoncia e implantes)
 */

const pool = require('../config/db');
const { formatDateYMD } = require('../utils/dateUtils');

/**
 * Crear un nuevo pago mensual
 * @param {Object} data - Datos del pago
 * @returns {Promise<Object>} Pago creado
 */
const createPayment = async (data) => {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // 1. Insertar el pago mensual
    const paymentQuery = `
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
    `;

    const paymentParams = [
      data.consultation_additional_service_id,
      data.consultation_id,
      data.patient_id,
      data.branch_id,
      data.payment_number,
      data.payment_amount,
      data.payment_date || formatDateYMD(),
      data.payment_type || 'monthly',
      data.registered_by_dentist_id,
      data.income_id || null,
      data.clinical_notes || null,
      data.user_id_registration
    ];

    const paymentResult = await client.query(paymentQuery, paymentParams);
    const payment = paymentResult.rows[0];

    // 2. Actualizar el contador en consultation_additional_services
    if (data.payment_type === 'monthly') {
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
      `, [data.user_id_registration, data.consultation_additional_service_id]);
    } else if (data.payment_type === 'initial') {
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
        data.payment_date || formatDateYMD(),
        data.income_id,
        data.user_id_registration,
        data.consultation_additional_service_id
      ]);
    }

    await client.query('COMMIT');
    return payment;

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error en createPayment:', error);
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
 * Obtener el siguiente numero de cuota
 * @param {number} serviceId - ID del servicio adicional
 * @returns {Promise<number>} Siguiente numero de cuota
 */
const getNextPaymentNumber = async (serviceId) => {
  const query = `
    SELECT COALESCE(MAX(payment_number), 0) + 1 as next_number
    FROM service_monthly_payments
    WHERE consultation_additional_service_id = $1
      AND payment_type = 'monthly'
      AND status = 'active'
  `;

  const result = await pool.query(query, [serviceId]);
  return result.rows[0].next_number;
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

    // 3. Actualizar el servicio como completado
    const updateQuery = `
      UPDATE consultation_additional_services
      SET
        service_status = 'completed',
        service_completed_date = CURRENT_DATE,
        service_completed_by_dentist_id = $1,
        final_payment_notes = $2,
        user_id_modification = $3,
        date_time_modification = NOW()
      WHERE consultation_additional_service_id = $4
        AND status = 'active'
      RETURNING *
    `;

    const updateResult = await client.query(updateQuery, [dentistId, notes, userId, serviceId]);
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
        CURRENT_DATE, CURRENT_TIME, $9,
        'confirmed', TRUE, 'final', 'active', $10, CURRENT_TIMESTAMP
      )
      RETURNING *
    `;

    const serviceTypeName = service.service_type === 'orthodontic' ? 'Ortodoncia'
      : service.service_type === 'implant' ? 'Implante'
      : 'Servicio Adicional';

    const incomeParams = [
      service.consultation_id,
      service.patient_id,
      service.branch_id,
      serviceId,
      `${serviceTypeName} - ${service.service_name || 'Tratamiento Completado'}`,
      `Finalización de ${serviceTypeName.toLowerCase()}: ${service.service_name || ''}. Monto total del tratamiento para comisión.`,
      totalAmount,
      dentistId,
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

    // 3. Actualizar contador si era pago mensual
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
  createPayment,
  getPaymentsByService,
  getPaymentsByPatient,
  getPaymentsByDentist,
  getDentistPaymentsSummary,
  getPaymentCount,
  getNextPaymentNumber,
  finalizeService,
  getServicePaymentStatus,
  deletePayment,
  getAllPayments
};
