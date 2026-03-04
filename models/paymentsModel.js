const pool = require('../config/db');

const getAllPayments = async (filters = {}) => {
  let query = `
    SELECT
      pay.*,
      p.first_name || ' ' || p.last_name as patient_name,
      p.identification_number,
      pm.method_name as payment_method_name,
      b.branch_name,
      u.first_name || ' ' || u.last_name as received_by_name
    FROM payments pay
    INNER JOIN patients p ON pay.patient_id = p.patient_id
    INNER JOIN payment_methods pm ON pay.payment_method_id = pm.payment_method_id
    INNER JOIN branches b ON pay.branch_id = b.branch_id
    LEFT JOIN users u ON pay.received_by = u.user_id
    WHERE pay.status = 'active'
  `;

  const params = [];
  let paramIndex = 1;

  if (filters.patient_id) {
    query += ` AND pay.patient_id = $${paramIndex}`;
    params.push(filters.patient_id);
    paramIndex++;
  }

  if (filters.branch_id) {
    query += ` AND pay.branch_id = $${paramIndex}`;
    params.push(filters.branch_id);
    paramIndex++;
  }

  if (filters.payment_method_id) {
    query += ` AND pay.payment_method_id = $${paramIndex}`;
    params.push(filters.payment_method_id);
    paramIndex++;
  }

  if (filters.date_from) {
    query += ` AND pay.payment_date >= $${paramIndex}`;
    params.push(filters.date_from);
    paramIndex++;
  }

  if (filters.date_to) {
    query += ` AND pay.payment_date <= $${paramIndex}`;
    params.push(filters.date_to);
    paramIndex++;
  }

  query += ` ORDER BY pay.payment_date DESC, pay.payment_id DESC`;

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

const getPaymentById = async (paymentId) => {
  const paymentQuery = `
    SELECT
      pay.*,
      p.first_name || ' ' || p.last_name as patient_name,
      p.identification_number,
      p.email as patient_email,
      pm.method_name as payment_method_name,
      b.branch_name,
      u.first_name || ' ' || u.last_name as received_by_name
    FROM payments pay
    INNER JOIN patients p ON pay.patient_id = p.patient_id
    INNER JOIN payment_methods pm ON pay.payment_method_id = pm.payment_method_id
    INNER JOIN branches b ON pay.branch_id = b.branch_id
    LEFT JOIN users u ON pay.received_by = u.user_id
    WHERE pay.payment_id = $1 AND pay.status = 'active'
  `;

  const vouchersQuery = `
    SELECT *
    FROM payment_vouchers
    WHERE payment_id = $1 AND status = 'active'
    ORDER BY voucher_date DESC
  `;

  const [paymentResult, vouchersResult] = await Promise.all([
    pool.query(paymentQuery, [paymentId]),
    pool.query(vouchersQuery, [paymentId])
  ]);

  if (paymentResult.rows.length === 0) {
    return null;
  }

  return {
    ...paymentResult.rows[0],
    vouchers: vouchersResult.rows
  };
};

const createPayment = async (paymentData) => {
  const {
    patient_id,
    branch_id,
    budget_id,
    appointment_id,
    consultation_id,
    payment_method_id,
    payment_number,
    payment_date,
    amount,
    reference_number,
    transaction_id,
    notes,
    received_by,
    user_id_registration
  } = paymentData;

  const query = `
    INSERT INTO payments (
      patient_id, branch_id, budget_id, appointment_id, consultation_id,
      payment_method_id, payment_number, payment_date, amount, reference_number,
      transaction_id, notes, received_by, user_id_registration
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
    RETURNING *
  `;

  const values = [
    patient_id,
    branch_id,
    budget_id || null,
    appointment_id || null,
    consultation_id || null,
    payment_method_id,
    payment_number || null,
    payment_date,
    amount,
    reference_number || null,
    transaction_id || null,
    notes || null,
    received_by || user_id_registration,
    user_id_registration
  ];

  const result = await pool.query(query, values);
  return result.rows[0];
};

const updatePayment = async (paymentId, paymentData) => {
  const fields = [];
  const values = [];
  let paramIndex = 1;

  Object.keys(paymentData).forEach((key) => {
    if (key !== 'user_id_modification' && paymentData[key] !== undefined) {
      fields.push(`${key} = $${paramIndex}`);
      values.push(paymentData[key]);
      paramIndex++;
    }
  });

  if (fields.length === 0) {
    throw new Error('No hay campos para actualizar');
  }

  fields.push(`user_id_modification = $${paramIndex}`);
  values.push(paymentData.user_id_modification);
  paramIndex++;

  fields.push(`date_time_modification = CURRENT_TIMESTAMP`);

  values.push(paymentId);

  const query = `
    UPDATE payments SET ${fields.join(', ')}
    WHERE payment_id = $${paramIndex} AND status = 'active'
    RETURNING *
  `;

  const result = await pool.query(query, values);
  return result.rows.length > 0 ? result.rows[0] : null;
};

const deletePayment = async (paymentId, userId) => {
  const query = `
    UPDATE payments SET
      status = 'inactive',
      user_id_modification = $1,
      date_time_modification = CURRENT_TIMESTAMP
    WHERE payment_id = $2 AND status = 'active'
    RETURNING payment_id
  `;

  const result = await pool.query(query, [userId, paymentId]);
  return result.rowCount > 0;
};

const countPayments = async (filters = {}) => {
  let query = `SELECT COUNT(*) as total FROM payments pay WHERE pay.status = 'active'`;
  const params = [];
  let paramIndex = 1;

  if (filters.patient_id) {
    query += ` AND pay.patient_id = $${paramIndex}`;
    params.push(filters.patient_id);
    paramIndex++;
  }

  if (filters.branch_id) {
    query += ` AND pay.branch_id = $${paramIndex}`;
    params.push(filters.branch_id);
    paramIndex++;
  }

  if (filters.payment_method_id) {
    query += ` AND pay.payment_method_id = $${paramIndex}`;
    params.push(filters.payment_method_id);
    paramIndex++;
  }

  if (filters.date_from) {
    query += ` AND pay.payment_date >= $${paramIndex}`;
    params.push(filters.date_from);
    paramIndex++;
  }

  if (filters.date_to) {
    query += ` AND pay.payment_date <= $${paramIndex}`;
    params.push(filters.date_to);
  }

  const result = await pool.query(query, params);
  return parseInt(result.rows[0].total);
};

// Gestión de comprobantes (vouchers)
const addPaymentVoucher = async (voucherData, userId) => {
  const {
    payment_id,
    voucher_number,
    voucher_date,
    voucher_type,
    voucher_file_url,
    issued_by,
    notes
  } = voucherData;

  const query = `
    INSERT INTO payment_vouchers (
      payment_id, voucher_number, voucher_date, voucher_type, voucher_file_url,
      issued_by, notes, user_id_registration
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    RETURNING *
  `;

  const values = [
    payment_id,
    voucher_number || null,
    voucher_date,
    voucher_type || null,
    voucher_file_url || null,
    issued_by || userId,
    notes || null,
    userId
  ];

  const result = await pool.query(query, values);
  return result.rows[0];
};

const deletePaymentVoucher = async (voucherId, userId) => {
  const query = `
    UPDATE payment_vouchers SET
      status = 'inactive',
      user_id_modification = $1,
      date_time_modification = CURRENT_TIMESTAMP
    WHERE payment_voucher_id = $2 AND status = 'active'
    RETURNING payment_voucher_id
  `;

  const result = await pool.query(query, [userId, voucherId]);
  return result.rowCount > 0;
};

module.exports = {
  getAllPayments,
  getPaymentById,
  createPayment,
  updatePayment,
  deletePayment,
  countPayments,
  addPaymentVoucher,
  deletePaymentVoucher
};
