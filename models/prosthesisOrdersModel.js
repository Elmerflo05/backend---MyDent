const pool = require('../config/db');

/**
 * Modelo para ordenes de protesis dental
 * Tabla: prosthesis_orders
 *
 * Campos principales:
 * - prosthesis_order_id: ID autoincremental
 * - patient_id: ID del paciente
 * - dentist_id: ID del dentista
 * - branch_id: ID de la sede
 * - consultation_id: ID de la consulta (opcional)
 * - order_date: Fecha de la orden/entrega al laboratorio
 * - prosthesis_type: Tipo/nombre del trabajo protesico
 * - description: Descripcion del trabajo
 * - laboratory_name: Nombre del laboratorio
 * - tooth_positions: Posiciones dentales afectadas
 * - material: Material/especificaciones tecnicas
 * - color_shade: Color de la protesis
 * - order_status: Estado (pending, sent, in_progress, received, cancelled)
 * - expected_date: Fecha tentativa de recepcion
 * - received_date: Fecha real de recepcion
 * - cost: Costo estimado
 * - notes: Notas adicionales
 */

const getAllProsthesisOrders = async (filters = {}) => {
  let query = `
    SELECT
      po.prosthesis_order_id,
      po.patient_id,
      po.dentist_id,
      po.branch_id,
      po.consultation_id,
      po.order_date,
      po.prosthesis_type,
      po.description,
      po.laboratory_name,
      po.tooth_positions,
      po.material,
      po.color_shade,
      po.order_status,
      po.expected_date,
      po.received_date,
      po.cost,
      po.notes,
      po.status,
      po.date_time_registration as created_at,
      po.date_time_modification as updated_at,
      p.first_name || ' ' || p.last_name as patient_name,
      p.identification_number,
      u.first_name || ' ' || u.last_name as dentist_name,
      b.branch_name
    FROM prosthesis_orders po
    INNER JOIN patients p ON po.patient_id = p.patient_id
    INNER JOIN dentists d ON po.dentist_id = d.dentist_id
    INNER JOIN users u ON d.user_id = u.user_id
    INNER JOIN branches b ON po.branch_id = b.branch_id
    WHERE po.status = 'active'
  `;
  const params = [];
  let paramIndex = 1;

  if (filters.patient_id) {
    query += ` AND po.patient_id = $${paramIndex}`;
    params.push(filters.patient_id);
    paramIndex++;
  }

  if (filters.dentist_id) {
    query += ` AND po.dentist_id = $${paramIndex}`;
    params.push(filters.dentist_id);
    paramIndex++;
  }

  if (filters.branch_id) {
    query += ` AND po.branch_id = $${paramIndex}`;
    params.push(filters.branch_id);
    paramIndex++;
  }

  if (filters.consultation_id) {
    query += ` AND po.consultation_id = $${paramIndex}`;
    params.push(filters.consultation_id);
    paramIndex++;
  }

  if (filters.prosthesis_type) {
    query += ` AND po.prosthesis_type = $${paramIndex}`;
    params.push(filters.prosthesis_type);
    paramIndex++;
  }

  if (filters.order_status) {
    query += ` AND po.order_status = $${paramIndex}`;
    params.push(filters.order_status);
    paramIndex++;
  }

  query += ` ORDER BY po.order_date DESC`;

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

const getProsthesisOrderById = async (orderId) => {
  const query = `
    SELECT po.*, p.first_name || ' ' || p.last_name as patient_name,
           p.identification_number, u.first_name || ' ' || u.last_name as dentist_name,
           b.branch_name
    FROM prosthesis_orders po
    INNER JOIN patients p ON po.patient_id = p.patient_id
    INNER JOIN dentists d ON po.dentist_id = d.dentist_id
    INNER JOIN users u ON d.user_id = u.user_id
    INNER JOIN branches b ON po.branch_id = b.branch_id
    WHERE po.prosthesis_order_id = $1 AND po.status = 'active'
  `;
  const result = await pool.query(query, [orderId]);
  return result.rows.length > 0 ? result.rows[0] : null;
};

const createProsthesisOrder = async (orderData, userId) => {
  const query = `
    INSERT INTO prosthesis_orders (
      patient_id, dentist_id, branch_id, prosthesis_type, description,
      laboratory_name, order_date, expected_date, received_date,
      order_status, cost, notes, user_id_registration, material, color_shade, tooth_positions
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
    RETURNING *
  `;
  // Soportar ambos formatos: expected_date (frontend) y expected_delivery_date (legacy)
  const expectedDate = orderData.expected_date || orderData.expected_delivery_date || null;
  const receivedDate = orderData.received_date || orderData.actual_delivery_date || null;

  const values = [
    orderData.patient_id,
    orderData.dentist_id,
    orderData.branch_id,
    orderData.prosthesis_type,
    orderData.description || null,
    orderData.laboratory_name || null,
    orderData.order_date || new Date(),
    expectedDate,
    receivedDate,
    orderData.order_status || 'pending',
    orderData.cost || null,
    orderData.notes || null,
    userId,
    orderData.material || null,
    orderData.color_shade || null,
    orderData.tooth_positions || null
  ];
  const result = await pool.query(query, values);
  return result.rows[0];
};

const updateProsthesisOrder = async (orderId, orderData, userId) => {
  const fields = [];
  const values = [];
  let paramIndex = 1;

  const allowedFields = [
    'prosthesis_type', 'description', 'laboratory_name', 'expected_delivery_date',
    'actual_delivery_date', 'order_status', 'cost', 'notes', 'received_date',
    'expected_date', 'tentative_date', 'material', 'color_shade', 'tooth_positions'
  ];

  allowedFields.forEach((field) => {
    if (orderData[field] !== undefined) {
      fields.push(`${field} = $${paramIndex}`);
      values.push(orderData[field]);
      paramIndex++;
    }
  });

  if (fields.length === 0) {
    throw new Error('No hay campos para actualizar');
  }

  fields.push(`user_id_modification = $${paramIndex}`);
  values.push(userId);
  paramIndex++;

  fields.push(`date_time_modification = CURRENT_TIMESTAMP`);
  values.push(orderId);

  const query = `
    UPDATE prosthesis_orders SET ${fields.join(', ')}
    WHERE prosthesis_order_id = $${paramIndex} AND status = 'active'
    RETURNING *
  `;

  const result = await pool.query(query, values);
  return result.rows.length > 0 ? result.rows[0] : null;
};

const deleteProsthesisOrder = async (orderId, userId) => {
  const result = await pool.query(
    `UPDATE prosthesis_orders SET status = 'inactive', user_id_modification = $1,
     date_time_modification = CURRENT_TIMESTAMP
     WHERE prosthesis_order_id = $2 AND status = 'active' RETURNING prosthesis_order_id`,
    [userId, orderId]
  );
  return result.rowCount > 0;
};

const countProsthesisOrders = async (filters = {}) => {
  let query = `SELECT COUNT(*) as total FROM prosthesis_orders WHERE status = 'active'`;
  const params = [];
  let paramIndex = 1;

  if (filters.patient_id) {
    query += ` AND patient_id = $${paramIndex}`;
    params.push(filters.patient_id);
    paramIndex++;
  }

  if (filters.dentist_id) {
    query += ` AND dentist_id = $${paramIndex}`;
    params.push(filters.dentist_id);
    paramIndex++;
  }

  if (filters.branch_id) {
    query += ` AND branch_id = $${paramIndex}`;
    params.push(filters.branch_id);
    paramIndex++;
  }

  if (filters.prosthesis_type) {
    query += ` AND prosthesis_type = $${paramIndex}`;
    params.push(filters.prosthesis_type);
    paramIndex++;
  }

  if (filters.order_status) {
    query += ` AND order_status = $${paramIndex}`;
    params.push(filters.order_status);
  }

  const result = await pool.query(query, params);
  return parseInt(result.rows[0].total);
};

module.exports = {
  getAllProsthesisOrders,
  getProsthesisOrderById,
  createProsthesisOrder,
  updateProsthesisOrder,
  deleteProsthesisOrder,
  countProsthesisOrders
};
