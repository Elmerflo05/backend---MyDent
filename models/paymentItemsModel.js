const pool = require('../config/db');

const createPaymentItems = async (paymentId, items, userId) => {
  if (!items || items.length === 0) return [];

  const values = [];
  const placeholders = [];
  let paramIndex = 1;

  for (const item of items) {
    const subtotal = (item.unit_price || 0) * (item.quantity || 1);
    placeholders.push(
      `($${paramIndex}, $${paramIndex + 1}, $${paramIndex + 2}, $${paramIndex + 3}, $${paramIndex + 4}, $${paramIndex + 5}, $${paramIndex + 6}, $${paramIndex + 7})`
    );
    values.push(
      paymentId,
      item.item_name,
      item.item_type || 'manual',
      item.source_id || null,
      item.unit_price || 0,
      item.quantity || 1,
      subtotal,
      userId || null
    );
    paramIndex += 8;
  }

  const query = `
    INSERT INTO payment_items (
      payment_id, item_name, item_type, source_id,
      unit_price, quantity, subtotal, user_id_registration
    ) VALUES ${placeholders.join(', ')}
    RETURNING *
  `;

  const result = await pool.query(query, values);
  return result.rows;
};

const getPaymentItems = async (paymentId) => {
  const query = `
    SELECT * FROM payment_items
    WHERE payment_id = $1 AND status = 'active'
    ORDER BY payment_item_id ASC
  `;
  const result = await pool.query(query, [paymentId]);
  return result.rows;
};

const deletePaymentItems = async (paymentId, userId) => {
  const query = `
    UPDATE payment_items SET status = 'inactive'
    WHERE payment_id = $1 AND status = 'active'
  `;
  await pool.query(query, [paymentId]);
};

module.exports = {
  createPaymentItems,
  getPaymentItems,
  deletePaymentItems
};
