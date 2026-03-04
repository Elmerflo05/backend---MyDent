/**
 * Model: procedureIncomeModel.js
 * Modelo para el registro financiero de ingresos por procedimientos (para comisiones)
 *
 * Incluye soporte para:
 * - Sistema de cuotas (quota_number, is_final_quota, quota_type)
 * - Validacion de 1 cuota por cita (appointment_id)
 * - Tracking de servicios adicionales (parent_additional_service_id)
 */

const pool = require('../config/db');
const { formatDateYMD } = require('../utils/dateUtils');

/**
 * Obtener ingresos con filtros
 * Incluye tooth_number de tooth_positions para el matching
 */
const getAllProcedureIncome = async (filters = {}) => {
  let query = `
    SELECT
      pi.*,
      pi.batch_id,
      p.first_name || ' ' || p.last_name as patient_name,
      p.identification_number as patient_dni,
      u.first_name || ' ' || u.last_name as dentist_name,
      d.professional_license as dentist_cop,
      b.branch_name,
      tp.tooth_number,
      tp.tooth_name,
      a.appointment_date,
      a.start_time as appointment_time
    FROM procedure_income pi
    LEFT JOIN patients p ON pi.patient_id = p.patient_id
    LEFT JOIN dentists d ON pi.performed_by_dentist_id = d.dentist_id
    LEFT JOIN users u ON d.user_id = u.user_id
    INNER JOIN branches b ON pi.branch_id = b.branch_id
    LEFT JOIN tooth_positions tp ON pi.tooth_position_id = tp.tooth_position_id
    LEFT JOIN appointments a ON pi.appointment_id = a.appointment_id
    WHERE pi.status = 'active'
  `;

  const params = [];
  let paramIndex = 1;

  if (filters.patient_id) {
    query += ` AND pi.patient_id = $${paramIndex}`;
    params.push(filters.patient_id);
    paramIndex++;
  }

  if (filters.consultation_id) {
    query += ` AND pi.consultation_id = $${paramIndex}`;
    params.push(filters.consultation_id);
    paramIndex++;
  }

  if (filters.dentist_id) {
    query += ` AND pi.performed_by_dentist_id = $${paramIndex}`;
    params.push(filters.dentist_id);
    paramIndex++;
  }

  if (filters.branch_id) {
    query += ` AND pi.branch_id = $${paramIndex}`;
    params.push(filters.branch_id);
    paramIndex++;
  }

  if (filters.income_type) {
    query += ` AND pi.income_type = $${paramIndex}`;
    params.push(filters.income_type);
    paramIndex++;
  }

  if (filters.income_status) {
    query += ` AND pi.income_status = $${paramIndex}`;
    params.push(filters.income_status);
    paramIndex++;
  }

  if (filters.date_from) {
    query += ` AND pi.performed_date >= $${paramIndex}`;
    params.push(filters.date_from);
    paramIndex++;
  }

  if (filters.date_to) {
    query += ` AND pi.performed_date <= $${paramIndex}`;
    params.push(filters.date_to);
    paramIndex++;
  }

  query += ` ORDER BY pi.performed_date DESC, pi.performed_time DESC`;

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

/**
 * Obtener ingreso por ID
 */
const getProcedureIncomeById = async (incomeId) => {
  const query = `
    SELECT
      pi.*,
      p.first_name || ' ' || p.last_name as patient_name,
      p.identification_number as patient_dni,
      u.first_name || ' ' || u.last_name as dentist_name,
      d.professional_license as dentist_cop,
      b.branch_name,
      tp.tooth_number,
      tp.tooth_name
    FROM procedure_income pi
    LEFT JOIN patients p ON pi.patient_id = p.patient_id
    LEFT JOIN dentists d ON pi.performed_by_dentist_id = d.dentist_id
    LEFT JOIN users u ON d.user_id = u.user_id
    INNER JOIN branches b ON pi.branch_id = b.branch_id
    LEFT JOIN tooth_positions tp ON pi.tooth_position_id = tp.tooth_position_id
    WHERE pi.income_id = $1 AND pi.status = 'active'
  `;

  const result = await pool.query(query, [incomeId]);
  return result.rows[0] || null;
};

/**
 * Crear nuevo registro de ingreso
 * Soporta campos adicionales para sistema de cuotas y vouchers
 */
const createProcedureIncome = async (data) => {
  const finalAmount = (data.amount || 0) - (data.discount_amount || 0);

  // Determinar payment_status basado en si hay voucher
  const hasVoucher = !!data.voucher_url;
  const paymentStatus = data.payment_status || (hasVoucher ? 'pending_verification' : 'pending');

  const query = `
    INSERT INTO procedure_income (
      procedure_history_id,
      consultation_id,
      patient_id,
      branch_id,
      income_type,
      treatment_plan_item_id,
      additional_service_id,
      item_name,
      item_description,
      tooth_position_id,
      amount,
      discount_amount,
      final_amount,
      currency,
      performed_by_dentist_id,
      performed_date,
      performed_time,
      clinical_notes,
      income_status,
      user_id_registration,
      quota_number,
      is_final_quota,
      treatment_plan_total,
      appointment_id,
      quota_type,
      parent_additional_service_id,
      batch_id,
      payment_status,
      amount_paid,
      balance,
      voucher_url,
      voucher_submitted_at,
      voucher_payment_method_id
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29, $30, $31, $32, $33)
    RETURNING *
  `;

  const params = [
    data.procedure_history_id || null,
    data.consultation_id,
    data.patient_id,
    data.branch_id,
    data.income_type,
    data.treatment_plan_item_id || null,
    data.additional_service_id || null,
    data.item_name,
    data.item_description || null,
    data.tooth_position_id || null,
    data.amount,
    data.discount_amount || 0,
    finalAmount,
    data.currency || 'PEN',
    data.performed_by_dentist_id,
    data.performed_date || formatDateYMD(),
    data.performed_time || new Date().toTimeString().split(' ')[0],
    data.clinical_notes || null,
    data.income_status || 'confirmed',
    data.user_id_registration,
    data.quota_number || null,
    data.is_final_quota || false,
    data.treatment_plan_total || null,
    data.appointment_id || null,
    data.quota_type || null,
    data.parent_additional_service_id || null,
    data.batch_id || null,
    paymentStatus,
    data.amount_paid || 0,
    data.balance !== undefined ? data.balance : finalAmount,
    data.voucher_url || null,
    hasVoucher ? new Date() : null,
    data.voucher_payment_method_id || null
  ];

  const result = await pool.query(query, params);
  return result.rows[0];
};

/**
 * Verificar si ya existe un procedimiento guardado para una condición específica
 * IMPORTANTE: Evita duplicados cuando el usuario intenta guardar el mismo tratamiento dos veces
 * @param {number} consultationId - ID de la consulta
 * @param {number} toothPositionId - ID de la posición del diente
 * @param {string} itemName - Nombre del procedimiento
 * @returns {Object|null} - Registro existente o null
 */
const checkProcedureExists = async (consultationId, toothPositionId, itemName) => {
  const query = `
    SELECT income_id, item_name, tooth_position_id, income_status
    FROM procedure_income
    WHERE consultation_id = $1
      AND tooth_position_id = $2
      AND item_name = $3
      AND income_type = 'odontogram_procedure'
      AND status = 'active'
      AND income_status != 'cancelled'
    LIMIT 1
  `;

  const result = await pool.query(query, [consultationId, toothPositionId, itemName]);
  return result.rows[0] || null;
};

/**
 * Verificar si ya existe una cuota para un servicio en una cita especifica
 * Usado para validar la regla de 1 cuota por cita
 */
const checkQuotaExistsForAppointment = async (appointmentId, parentServiceId) => {
  const query = `
    SELECT COUNT(*) as count
    FROM procedure_income
    WHERE appointment_id = $1
      AND parent_additional_service_id = $2
      AND quota_type = 'monthly'
      AND status = 'active'
  `;

  const result = await pool.query(query, [appointmentId, parentServiceId]);
  return parseInt(result.rows[0].count) > 0;
};

/**
 * Obtener siguiente numero de cuota para un servicio
 */
const getNextQuotaNumber = async (parentServiceId) => {
  const query = `
    SELECT COALESCE(MAX(quota_number), 0) + 1 as next_quota
    FROM procedure_income
    WHERE parent_additional_service_id = $1
      AND quota_type IN ('monthly', 'initial')
      AND status = 'active'
  `;

  const result = await pool.query(query, [parentServiceId]);
  return parseInt(result.rows[0].next_quota);
};

/**
 * Obtener historial de cuotas de un servicio adicional
 */
const getServiceQuotaHistory = async (parentServiceId) => {
  const query = `
    SELECT
      pi.*,
      u.first_name || ' ' || u.last_name as dentist_name,
      d.professional_license as dentist_cop,
      a.appointment_date
    FROM procedure_income pi
    INNER JOIN dentists d ON pi.performed_by_dentist_id = d.dentist_id
    INNER JOIN users u ON d.user_id = u.user_id
    LEFT JOIN appointments a ON pi.appointment_id = a.appointment_id
    WHERE pi.parent_additional_service_id = $1
      AND pi.status = 'active'
    ORDER BY pi.quota_number ASC, pi.performed_date ASC
  `;

  const result = await pool.query(query, [parentServiceId]);
  return result.rows;
};

/**
 * Crear cuota mensual con validaciones
 */
const createMonthlyQuota = async (data) => {
  // Validar que no exista cuota para esta cita y servicio
  if (data.appointment_id && data.parent_additional_service_id) {
    const exists = await checkQuotaExistsForAppointment(
      data.appointment_id,
      data.parent_additional_service_id
    );

    if (exists) {
      throw new Error('Ya existe una cuota registrada para este servicio en esta cita');
    }
  }

  // Obtener siguiente numero de cuota
  const nextQuotaNumber = await getNextQuotaNumber(data.parent_additional_service_id);

  // Crear el registro con los datos de cuota (con tracking de pago)
  const incomeData = {
    ...data,
    quota_number: nextQuotaNumber,
    quota_type: data.is_final_quota ? 'final' : 'monthly',
    income_type: data.income_type || 'monthly_quota'
  };

  return await createProcedureIncomeWithTracking(incomeData);
};

/**
 * Actualizar registro de ingreso
 */
const updateProcedureIncome = async (incomeId, data, userId) => {
  const query = `
    UPDATE procedure_income SET
      income_status = COALESCE($1, income_status),
      clinical_notes = COALESCE($2, clinical_notes),
      payment_id = COALESCE($3, payment_id),
      user_id_modification = $4,
      date_time_modification = NOW()
    WHERE income_id = $5 AND status = 'active'
    RETURNING *
  `;

  const params = [
    data.income_status,
    data.clinical_notes,
    data.payment_id,
    userId,
    incomeId
  ];

  const result = await pool.query(query, params);
  return result.rows[0] || null;
};

/**
 * Eliminar (soft delete) registro de ingreso
 */
const deleteProcedureIncome = async (incomeId, userId) => {
  const query = `
    UPDATE procedure_income SET
      status = 'inactive',
      user_id_modification = $1,
      date_time_modification = NOW()
    WHERE income_id = $2 AND status = 'active'
    RETURNING *
  `;

  const result = await pool.query(query, [userId, incomeId]);
  return result.rows[0] || null;
};

/**
 * Contar ingresos con filtros
 */
const countProcedureIncome = async (filters = {}) => {
  let query = `
    SELECT COUNT(*) as total
    FROM procedure_income pi
    WHERE pi.status = 'active'
  `;

  const params = [];
  let paramIndex = 1;

  if (filters.patient_id) {
    query += ` AND pi.patient_id = $${paramIndex}`;
    params.push(filters.patient_id);
    paramIndex++;
  }

  if (filters.dentist_id) {
    query += ` AND pi.performed_by_dentist_id = $${paramIndex}`;
    params.push(filters.dentist_id);
    paramIndex++;
  }

  if (filters.branch_id) {
    query += ` AND pi.branch_id = $${paramIndex}`;
    params.push(filters.branch_id);
    paramIndex++;
  }

  const result = await pool.query(query, params);
  return parseInt(result.rows[0].total);
};

/**
 * Obtener ingresos por dentista (para reportes de comisiones)
 */
const getDentistIncome = async (dentistId, dateFrom, dateTo) => {
  const query = `
    SELECT
      pi.*,
      p.first_name || ' ' || p.last_name as patient_name,
      b.branch_name,
      tp.tooth_number
    FROM procedure_income pi
    INNER JOIN patients p ON pi.patient_id = p.patient_id
    INNER JOIN branches b ON pi.branch_id = b.branch_id
    LEFT JOIN tooth_positions tp ON pi.tooth_position_id = tp.tooth_position_id
    WHERE pi.performed_by_dentist_id = $1
      AND pi.performed_date >= $2
      AND pi.performed_date <= $3
      AND pi.status = 'active'
      AND pi.income_status != 'cancelled'
    ORDER BY pi.performed_date DESC, pi.performed_time DESC
  `;

  const result = await pool.query(query, [dentistId, dateFrom, dateTo]);
  return result.rows;
};

/**
 * Obtener resumen de ingresos por dentista
 */
const getDentistIncomeSummary = async (dentistId, dateFrom, dateTo) => {
  const query = `
    SELECT
      COUNT(*) as total_procedures,
      SUM(pi.final_amount) as total_income,
      SUM(pi.discount_amount) as total_discounts,
      pi.income_type,
      COUNT(DISTINCT pi.patient_id) as unique_patients
    FROM procedure_income pi
    WHERE pi.performed_by_dentist_id = $1
      AND pi.performed_date >= $2
      AND pi.performed_date <= $3
      AND pi.status = 'active'
      AND pi.income_status != 'cancelled'
    GROUP BY pi.income_type
  `;

  const result = await pool.query(query, [dentistId, dateFrom, dateTo]);
  return result.rows;
};

/**
 * Obtener ingresos por paciente
 */
const getPatientIncome = async (patientId) => {
  const query = `
    SELECT
      pi.*,
      u.first_name || ' ' || u.last_name as dentist_name,
      d.professional_license as dentist_cop,
      b.branch_name,
      tp.tooth_number,
      tp.tooth_name
    FROM procedure_income pi
    INNER JOIN dentists d ON pi.performed_by_dentist_id = d.dentist_id
    INNER JOIN users u ON d.user_id = u.user_id
    INNER JOIN branches b ON pi.branch_id = b.branch_id
    LEFT JOIN tooth_positions tp ON pi.tooth_position_id = tp.tooth_position_id
    WHERE pi.patient_id = $1 AND pi.status = 'active'
    ORDER BY pi.performed_date DESC, pi.performed_time DESC
  `;

  const result = await pool.query(query, [patientId]);
  return result.rows;
};

// ============================================================
// FUNCIONES DE DEUDAS/BALANCE (Sistema de tracking de pagos)
// ============================================================

/**
 * Obtener deudas pendientes de un paciente
 * @param {number} patientId - ID del paciente
 * @param {Object} filters - Filtros opcionales
 * @returns {Array} Lista de deudas pendientes
 */
const getPatientPendingDebts = async (patientId, filters = {}) => {
  let query = `
    SELECT
      pi.*,
      pi.batch_id,
      u.first_name || ' ' || u.last_name as dentist_name,
      b.branch_name,
      tp.tooth_number,
      tp.tooth_name,
      CASE
        WHEN pi.due_date < CURRENT_DATE AND pi.payment_status IN ('pending', 'partial') THEN true
        ELSE false
      END as is_overdue
    FROM procedure_income pi
    INNER JOIN dentists d ON pi.performed_by_dentist_id = d.dentist_id
    INNER JOIN users u ON d.user_id = u.user_id
    INNER JOIN branches b ON pi.branch_id = b.branch_id
    LEFT JOIN tooth_positions tp ON pi.tooth_position_id = tp.tooth_position_id
    WHERE pi.patient_id = $1
      AND pi.status = 'active'
      AND pi.income_status = 'confirmed'
  `;

  const params = [patientId];
  let paramIndex = 2;

  // Si include_all es true, traer todos los estados; sino solo pendientes
  if (!filters.include_all) {
    query += ` AND pi.payment_status IN ('pending', 'partial')`;
  }

  if (filters.branch_id) {
    query += ` AND pi.branch_id = $${paramIndex}`;
    params.push(filters.branch_id);
    paramIndex++;
  }

  if (filters.only_overdue) {
    query += ` AND pi.due_date < CURRENT_DATE`;
  }

  query += ` ORDER BY pi.performed_date DESC`; // Más reciente primero para historial

  const result = await pool.query(query, params);
  return result.rows;
};

/**
 * Obtener balance total de un paciente
 * @param {number} patientId - ID del paciente
 * @param {number} branchId - ID de la sede (opcional)
 * @returns {Object} Resumen de balance
 */
const getPatientBalance = async (patientId, branchId = null) => {
  let query = `
    SELECT
      COUNT(CASE WHEN pi.payment_status != 'rejected' THEN 1 END) as total_items,
      SUM(CASE WHEN pi.payment_status != 'rejected' THEN pi.final_amount ELSE 0 END) as total_charged,
      SUM(CASE WHEN pi.payment_status != 'rejected' THEN COALESCE(pi.amount_paid, 0) ELSE 0 END) as total_paid,
      SUM(CASE WHEN pi.payment_status IN ('pending', 'partial') THEN COALESCE(pi.balance, pi.final_amount) ELSE 0 END) as total_balance,
      COUNT(CASE WHEN pi.payment_status = 'pending' THEN 1 END) as pending_count,
      COUNT(CASE WHEN pi.payment_status = 'partial' THEN 1 END) as partial_count,
      COUNT(CASE WHEN pi.payment_status = 'paid' THEN 1 END) as paid_count,
      COUNT(CASE WHEN pi.payment_status = 'rejected' THEN 1 END) as rejected_count,
      COUNT(CASE WHEN pi.due_date < CURRENT_DATE AND pi.payment_status IN ('pending', 'partial') THEN 1 END) as overdue_count,
      SUM(CASE WHEN pi.due_date < CURRENT_DATE AND pi.payment_status IN ('pending', 'partial') THEN pi.balance ELSE 0 END) as overdue_amount,
      MIN(CASE WHEN pi.payment_status IN ('pending', 'partial') THEN pi.performed_date END) as oldest_debt_date
    FROM procedure_income pi
    WHERE pi.patient_id = $1
      AND pi.status = 'active'
      AND pi.income_status = 'confirmed'
  `;

  const params = [patientId];

  if (branchId) {
    query += ` AND pi.branch_id = $2`;
    params.push(branchId);
  }

  const result = await pool.query(query, params);
  return result.rows[0];
};

/**
 * Inicializar campos de tracking de pago al crear un procedure_income
 * @param {number} incomeId - ID del income
 * @param {number} userId - ID del usuario
 * @returns {Object} Income actualizado
 */
const initializePaymentTracking = async (incomeId, userId) => {
  const query = `
    UPDATE procedure_income
    SET
      payment_status = 'pending',
      amount_paid = 0,
      balance = final_amount,
      due_date = performed_date + INTERVAL '7 days',
      user_id_modification = $1,
      date_time_modification = NOW()
    WHERE income_id = $2
      AND status = 'active'
      AND payment_status IS NULL
    RETURNING *
  `;

  const result = await pool.query(query, [userId, incomeId]);
  return result.rows[0];
};

/**
 * Crear procedure_income con tracking de pago inicializado
 * @param {Object} data - Datos del income
 * @returns {Object} Income creado
 */
const createProcedureIncomeWithTracking = async (data) => {
  const finalAmount = (data.amount || 0) - (data.discount_amount || 0);
  const performedDate = data.performed_date || formatDateYMD();

  const query = `
    INSERT INTO procedure_income (
      procedure_history_id,
      consultation_id,
      patient_id,
      branch_id,
      income_type,
      treatment_plan_item_id,
      additional_service_id,
      item_name,
      item_description,
      tooth_position_id,
      amount,
      discount_amount,
      final_amount,
      currency,
      performed_by_dentist_id,
      performed_date,
      performed_time,
      clinical_notes,
      income_status,
      user_id_registration,
      quota_number,
      is_final_quota,
      treatment_plan_total,
      appointment_id,
      quota_type,
      parent_additional_service_id,
      batch_id,
      -- Campos de tracking de pago
      payment_status,
      amount_paid,
      balance,
      due_date
    ) VALUES (
      $1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
      $11, $12, $13, $14, $15, $16, $17, $18, $19, $20,
      $21, $22, $23, $24, $25, $26, $27,
      'pending', 0, $13, $16::date + INTERVAL '7 days'
    )
    RETURNING *
  `;

  const params = [
    data.procedure_history_id || null,
    data.consultation_id,
    data.patient_id,
    data.branch_id,
    data.income_type,
    data.treatment_plan_item_id || null,
    data.additional_service_id || null,
    data.item_name,
    data.item_description || null,
    data.tooth_position_id || null,
    data.amount,
    data.discount_amount || 0,
    finalAmount,
    data.currency || 'PEN',
    data.performed_by_dentist_id,
    performedDate,
    data.performed_time || new Date().toTimeString().split(' ')[0],
    data.clinical_notes || null,
    data.income_status || 'confirmed',
    data.user_id_registration,
    data.quota_number || null,
    data.is_final_quota || false,
    data.treatment_plan_total || null,
    data.appointment_id || null,
    data.quota_type || null,
    data.parent_additional_service_id || null,
    data.batch_id || null
  ];

  const result = await pool.query(query, params);
  return result.rows[0];
};

/**
 * Marcar paciente como notificado de su deuda
 * @param {number} patientId - ID del paciente
 * @returns {number} Cantidad de registros actualizados
 */
const markPatientAsNotified = async (patientId) => {
  const query = `
    UPDATE procedure_income
    SET patient_notified_at = NOW()
    WHERE patient_id = $1
      AND status = 'active'
      AND payment_status IN ('pending', 'partial')
      AND patient_notified_at IS NULL
  `;

  const result = await pool.query(query, [patientId]);
  return result.rowCount;
};

module.exports = {
  getAllProcedureIncome,
  getProcedureIncomeById,
  createProcedureIncome,
  updateProcedureIncome,
  deleteProcedureIncome,
  countProcedureIncome,
  getDentistIncome,
  getDentistIncomeSummary,
  getPatientIncome,
  // Funciones para sistema de cuotas
  checkQuotaExistsForAppointment,
  getNextQuotaNumber,
  getServiceQuotaHistory,
  createMonthlyQuota,
  // Validación de duplicados
  checkProcedureExists,
  // Funciones de deudas/balance (Sistema de tracking de pagos)
  getPatientPendingDebts,
  getPatientBalance,
  initializePaymentTracking,
  createProcedureIncomeWithTracking,
  markPatientAsNotified
};
