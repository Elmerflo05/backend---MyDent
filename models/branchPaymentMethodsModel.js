const pool = require('../config/db');

/**
 * Obtener todos los métodos de pago de una sede
 */
const getPaymentMethodsByBranch = async (branchId) => {
  const query = `
    SELECT
      bpm.*,
      b.branch_name
    FROM branch_payment_methods bpm
    INNER JOIN branches b ON bpm.branch_id = b.branch_id
    WHERE bpm.branch_id = $1 AND bpm.status = 'active'
    ORDER BY bpm.is_active DESC, bpm.method_name ASC
  `;
  const result = await pool.query(query, [branchId]);
  return result.rows;
};

/**
 * Obtener métodos de pago activos de una sede (para pacientes)
 */
const getActivePaymentMethodsByBranch = async (branchId) => {
  const query = `
    SELECT
      bpm.payment_method_id,
      bpm.method_type,
      bpm.method_name,
      bpm.bank_name,
      bpm.account_number,
      bpm.account_holder,
      bpm.phone_number,
      bpm.additional_info,
      bpm.qr_image_url,
      b.branch_name
    FROM branch_payment_methods bpm
    INNER JOIN branches b ON bpm.branch_id = b.branch_id
    WHERE bpm.branch_id = $1
      AND bpm.status = 'active'
      AND bpm.is_active = true
    ORDER BY bpm.method_name ASC
  `;
  const result = await pool.query(query, [branchId]);
  return result.rows;
};

/**
 * Obtener todos los métodos de pago activos de todas las sedes
 */
const getAllActivePaymentMethods = async () => {
  const query = `
    SELECT
      bpm.payment_method_id,
      bpm.branch_id,
      bpm.method_type,
      bpm.method_name,
      bpm.bank_name,
      bpm.account_number,
      bpm.account_holder,
      bpm.phone_number,
      bpm.additional_info,
      bpm.qr_image_url,
      b.branch_name
    FROM branch_payment_methods bpm
    INNER JOIN branches b ON bpm.branch_id = b.branch_id
    WHERE bpm.status = 'active' AND bpm.is_active = true
    ORDER BY b.branch_name, bpm.method_name ASC
  `;
  const result = await pool.query(query);
  return result.rows;
};

/**
 * Obtener un método de pago por ID
 */
const getPaymentMethodById = async (paymentMethodId) => {
  const query = `
    SELECT
      bpm.*,
      b.branch_name
    FROM branch_payment_methods bpm
    INNER JOIN branches b ON bpm.branch_id = b.branch_id
    WHERE bpm.payment_method_id = $1 AND bpm.status = 'active'
  `;
  const result = await pool.query(query, [paymentMethodId]);
  return result.rows.length > 0 ? result.rows[0] : null;
};

/**
 * Crear un nuevo método de pago
 */
const createPaymentMethod = async (data) => {
  const query = `
    INSERT INTO branch_payment_methods (
      branch_id, method_type, method_name, bank_name,
      account_number, account_holder, phone_number,
      additional_info, qr_image_url, is_active, user_id_registration
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
    RETURNING *
  `;
  const values = [
    data.branch_id,
    data.method_type,
    data.method_name,
    data.bank_name || null,
    data.account_number || null,
    data.account_holder || null,
    data.phone_number || null,
    data.additional_info || null,
    data.qr_image_url || null,
    data.is_active !== undefined ? data.is_active : true,
    data.user_id_registration
  ];
  const result = await pool.query(query, values);
  return result.rows[0];
};

/**
 * Actualizar un método de pago
 */
const updatePaymentMethod = async (paymentMethodId, data) => {
  const fields = [];
  const values = [];
  let paramIndex = 1;

  const allowedFields = [
    'method_type', 'method_name', 'bank_name', 'account_number',
    'account_holder', 'phone_number', 'additional_info', 'qr_image_url', 'is_active'
  ];

  // Campos opcionales: string vacío se guarda como null
  const nullableFields = ['bank_name', 'account_number', 'account_holder', 'phone_number', 'additional_info', 'qr_image_url'];

  allowedFields.forEach((field) => {
    if (data[field] !== undefined) {
      fields.push(`${field} = $${paramIndex}`);
      const value = nullableFields.includes(field) && data[field] === '' ? null : data[field];
      values.push(value);
      paramIndex++;
    }
  });

  if (fields.length === 0) {
    throw new Error('No hay campos para actualizar');
  }

  fields.push(`user_id_modification = $${paramIndex}`);
  values.push(data.user_id_modification);
  paramIndex++;

  fields.push(`date_time_modification = CURRENT_TIMESTAMP`);

  values.push(paymentMethodId);

  const query = `
    UPDATE branch_payment_methods SET ${fields.join(', ')}
    WHERE payment_method_id = $${paramIndex} AND status = 'active'
    RETURNING *
  `;

  const result = await pool.query(query, values);
  return result.rows.length > 0 ? result.rows[0] : null;
};

/**
 * Eliminar (soft delete) un método de pago
 */
const deletePaymentMethod = async (paymentMethodId, userId) => {
  const query = `
    UPDATE branch_payment_methods SET
      status = 'deleted',
      is_active = false,
      user_id_modification = $1,
      date_time_modification = CURRENT_TIMESTAMP
    WHERE payment_method_id = $2 AND status = 'active'
    RETURNING payment_method_id
  `;
  const result = await pool.query(query, [userId, paymentMethodId]);
  return result.rowCount > 0;
};

module.exports = {
  getPaymentMethodsByBranch,
  getActivePaymentMethodsByBranch,
  getAllActivePaymentMethods,
  getPaymentMethodById,
  createPaymentMethod,
  updatePaymentMethod,
  deletePaymentMethod
};
