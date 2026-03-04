/**
 * Model: laboratoryExternalPaymentModel.js
 * Modelo para pagos de servicios de laboratorio externo (radiografias/tomografias)
 */

const pool = require('../config/db');

/**
 * Crear registro de pago externo (cuando tecnico establece precio)
 */
const createExternalPayment = async (data) => {
  const query = `
    INSERT INTO laboratory_external_payments (
      radiography_request_id,
      branch_id,
      amount,
      final_price,
      payment_status,
      set_price_by_user_id,
      set_price_at,
      notes,
      user_id_registration
    ) VALUES ($1, $2, $3, $4, $5, $6, NOW(), $7, $8)
    RETURNING *
  `;

  const params = [
    data.radiography_request_id,
    data.branch_id, // Sede del técnico que establece el precio
    data.amount,
    data.final_price,
    'pending', // Siempre inicia como pendiente
    data.set_price_by_user_id,
    data.notes || null,
    data.user_id_registration
  ];

  const result = await pool.query(query, params);
  return result.rows[0];
};

/**
 * Obtener pago por radiography_request_id
 */
const getPaymentByRadiographyRequestId = async (radiographyRequestId) => {
  const query = `
    SELECT
      lep.*,
      u_set.first_name || ' ' || u_set.last_name as set_price_by_name,
      u_paid.first_name || ' ' || u_paid.last_name as paid_by_name,
      b.branch_name
    FROM laboratory_external_payments lep
    LEFT JOIN users u_set ON lep.set_price_by_user_id = u_set.user_id
    LEFT JOIN users u_paid ON lep.paid_by_user_id = u_paid.user_id
    LEFT JOIN branches b ON lep.branch_id = b.branch_id
    WHERE lep.radiography_request_id = $1 AND lep.status = 'active'
  `;

  const result = await pool.query(query, [radiographyRequestId]);
  return result.rows[0] || null;
};

/**
 * Obtener pago por ID
 */
const getPaymentById = async (paymentId) => {
  const query = `
    SELECT
      lep.*,
      u_set.first_name || ' ' || u_set.last_name as set_price_by_name,
      u_paid.first_name || ' ' || u_paid.last_name as paid_by_name,
      b.branch_name
    FROM laboratory_external_payments lep
    LEFT JOIN users u_set ON lep.set_price_by_user_id = u_set.user_id
    LEFT JOIN users u_paid ON lep.paid_by_user_id = u_paid.user_id
    LEFT JOIN branches b ON lep.branch_id = b.branch_id
    WHERE lep.payment_id = $1 AND lep.status = 'active'
  `;

  const result = await pool.query(query, [paymentId]);
  return result.rows[0] || null;
};

/**
 * Registrar pago (marcar como pagado)
 */
const registerPayment = async (paymentId, userId, notes = null) => {
  const query = `
    UPDATE laboratory_external_payments
    SET
      payment_status = 'paid',
      paid_at = NOW(),
      paid_by_user_id = $1,
      notes = COALESCE($2, notes),
      user_id_modification = $1,
      date_time_modification = NOW()
    WHERE payment_id = $3 AND status = 'active'
    RETURNING *
  `;

  const result = await pool.query(query, [userId, notes, paymentId]);
  return result.rows[0] || null;
};

/**
 * Actualizar precio
 */
const updatePrice = async (paymentId, newPrice, userId) => {
  const query = `
    UPDATE laboratory_external_payments
    SET
      amount = $1,
      final_price = $1,
      set_price_by_user_id = $2,
      set_price_at = NOW(),
      user_id_modification = $2,
      date_time_modification = NOW()
    WHERE payment_id = $3 AND status = 'active' AND payment_status = 'pending'
    RETURNING *
  `;

  const result = await pool.query(query, [newPrice, userId, paymentId]);
  return result.rows[0] || null;
};

/**
 * Obtener todos los pagos con filtros
 */
const getAllPayments = async (filters = {}) => {
  let query = `
    SELECT
      lep.*,
      u_set.first_name || ' ' || u_set.last_name as set_price_by_name,
      u_paid.first_name || ' ' || u_paid.last_name as paid_by_name,
      b.branch_name,
      rr.radiography_type,
      rr.request_data
    FROM laboratory_external_payments lep
    LEFT JOIN users u_set ON lep.set_price_by_user_id = u_set.user_id
    LEFT JOIN users u_paid ON lep.paid_by_user_id = u_paid.user_id
    LEFT JOIN branches b ON lep.branch_id = b.branch_id
    LEFT JOIN radiography_requests rr ON lep.radiography_request_id = rr.radiography_request_id
    WHERE lep.status = 'active'
  `;

  const params = [];
  let paramIndex = 1;

  if (filters.branch_id) {
    query += ` AND lep.branch_id = $${paramIndex}`;
    params.push(filters.branch_id);
    paramIndex++;
  }

  if (filters.payment_status) {
    query += ` AND lep.payment_status = $${paramIndex}`;
    params.push(filters.payment_status);
    paramIndex++;
  }

  if (filters.date_from) {
    query += ` AND lep.date_time_registration >= $${paramIndex}`;
    params.push(filters.date_from);
    paramIndex++;
  }

  if (filters.date_to) {
    query += ` AND lep.date_time_registration <= $${paramIndex}`;
    params.push(filters.date_to);
    paramIndex++;
  }

  query += ` ORDER BY lep.date_time_registration DESC`;

  if (filters.limit) {
    query += ` LIMIT $${paramIndex}`;
    params.push(filters.limit);
    paramIndex++;
  }

  const result = await pool.query(query, params);
  return result.rows;
};

/**
 * Obtener resumen de ingresos por sede
 */
const getIncomeSummaryByBranch = async (branchId, dateFrom, dateTo) => {
  const query = `
    SELECT
      COUNT(*) as total_payments,
      SUM(final_price) as total_income,
      COUNT(CASE WHEN payment_status = 'pending' THEN 1 END) as pending_count,
      SUM(CASE WHEN payment_status = 'pending' THEN final_price ELSE 0 END) as pending_amount,
      COUNT(CASE WHEN payment_status = 'paid' THEN 1 END) as paid_count,
      SUM(CASE WHEN payment_status = 'paid' THEN final_price ELSE 0 END) as paid_amount
    FROM laboratory_external_payments
    WHERE branch_id = $1
      AND date_time_registration >= $2
      AND date_time_registration <= $3
      AND status = 'active'
  `;

  const result = await pool.query(query, [branchId, dateFrom, dateTo]);
  return result.rows[0];
};

module.exports = {
  createExternalPayment,
  getPaymentByRadiographyRequestId,
  getPaymentById,
  registerPayment,
  updatePrice,
  getAllPayments,
  getIncomeSummaryByBranch
};
