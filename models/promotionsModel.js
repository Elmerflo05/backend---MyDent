const pool = require('../config/db');

const getAllPromotions = async (filters = {}) => {
  let query = `
    SELECT
      pr.*,
      b.branch_name
    FROM promotions pr
    LEFT JOIN branches b ON pr.branch_id = b.branch_id
    WHERE pr.status = 'active'
  `;

  const params = [];
  let paramIndex = 1;

  if (filters.branch_id) {
    query += ` AND pr.branch_id = $${paramIndex}`;
    params.push(filters.branch_id);
    paramIndex++;
  }

  if (filters.promotion_type) {
    query += ` AND pr.promotion_type = $${paramIndex}`;
    params.push(filters.promotion_type);
    paramIndex++;
  }

  if (filters.discount_type) {
    query += ` AND pr.discount_type = $${paramIndex}`;
    params.push(filters.discount_type);
    paramIndex++;
  }

  if (filters.is_active !== undefined) {
    query += ` AND pr.is_active = $${paramIndex}`;
    params.push(filters.is_active);
    paramIndex++;
  }

  if (filters.search) {
    query += ` AND (pr.promotion_name ILIKE $${paramIndex} OR pr.promotion_code ILIKE $${paramIndex})`;
    params.push(`%${filters.search}%`);
    paramIndex++;
  }

  // Filtrar promociones vigentes
  if (filters.active_only === true) {
    query += ` AND pr.start_date <= CURRENT_DATE AND pr.end_date >= CURRENT_DATE`;
  }

  query += ` ORDER BY pr.start_date DESC, pr.promotion_id DESC`;

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

const getPromotionById = async (promotionId) => {
  const query = `
    SELECT
      pr.*,
      b.branch_name,
      b.address as branch_address
    FROM promotions pr
    LEFT JOIN branches b ON pr.branch_id = b.branch_id
    WHERE pr.promotion_id = $1 AND pr.status = 'active'
  `;

  const result = await pool.query(query, [promotionId]);
  return result.rows.length > 0 ? result.rows[0] : null;
};

const createPromotion = async (promotionData) => {
  // NOTA: current_uses NO se incluye - siempre inicia en 0 (valor default de la BD)
  // Solo puede ser incrementado por triggers/función atómica para prevenir manipulación
  const query = `
    INSERT INTO promotions (
      branch_id, promotion_name, promotion_code, promotion_type, description,
      discount_type, discount_value, min_purchase_amount, max_discount_amount,
      start_date, end_date, max_uses, applicable_procedures,
      terms_and_conditions, is_active, is_stackable, max_uses_per_patient,
      target_audience, user_id_registration
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19)
    RETURNING *
  `;

  const values = [
    promotionData.branch_id || null,
    promotionData.promotion_name,
    promotionData.promotion_code || null,
    promotionData.promotion_type,
    promotionData.description || null,
    promotionData.discount_type,
    promotionData.discount_value,
    promotionData.min_purchase_amount || null,
    promotionData.max_discount_amount || null,
    promotionData.start_date,
    promotionData.end_date,
    promotionData.max_uses || null,
    promotionData.applicable_procedures || null,
    promotionData.terms_and_conditions || null,
    promotionData.is_active !== undefined ? promotionData.is_active : true,
    promotionData.is_stackable !== undefined ? promotionData.is_stackable : false,
    promotionData.max_uses_per_patient || null,
    promotionData.target_audience || 'all',
    promotionData.user_id_registration
  ];

  const result = await pool.query(query, values);
  return result.rows[0];
};

const updatePromotion = async (promotionId, promotionData) => {
  const fields = [];
  const values = [];
  let paramIndex = 1;

  // NOTA: current_uses NO está en allowedFields
  // Solo puede ser modificado por triggers/función atómica para prevenir manipulación
  const allowedFields = [
    'branch_id', 'promotion_name', 'promotion_code', 'promotion_type',
    'description', 'discount_type', 'discount_value', 'min_purchase_amount',
    'max_discount_amount', 'start_date', 'end_date', 'max_uses',
    'applicable_procedures', 'terms_and_conditions', 'is_active',
    'is_stackable', 'max_uses_per_patient', 'target_audience'
  ];

  allowedFields.forEach((field) => {
    if (promotionData[field] !== undefined) {
      fields.push(`${field} = $${paramIndex}`);
      values.push(promotionData[field]);
      paramIndex++;
    }
  });

  if (fields.length === 0) {
    throw new Error('No hay campos para actualizar');
  }

  fields.push(`user_id_modification = $${paramIndex}`);
  values.push(promotionData.user_id_modification);
  paramIndex++;

  fields.push(`date_time_modification = CURRENT_TIMESTAMP`);

  values.push(promotionId);

  const query = `
    UPDATE promotions SET ${fields.join(', ')}
    WHERE promotion_id = $${paramIndex} AND status = 'active'
    RETURNING *
  `;

  const result = await pool.query(query, values);
  return result.rows.length > 0 ? result.rows[0] : null;
};

const deletePromotion = async (promotionId, userId) => {
  const query = `
    UPDATE promotions SET
      status = 'inactive',
      user_id_modification = $1,
      date_time_modification = CURRENT_TIMESTAMP
    WHERE promotion_id = $2 AND status = 'active'
    RETURNING promotion_id
  `;

  const result = await pool.query(query, [userId, promotionId]);
  return result.rowCount > 0;
};

const incrementPromotionUses = async (promotionId) => {
  const query = `
    UPDATE promotions SET
      current_uses = current_uses + 1,
      date_time_modification = CURRENT_TIMESTAMP
    WHERE promotion_id = $1 AND status = 'active'
    RETURNING *
  `;

  const result = await pool.query(query, [promotionId]);
  return result.rows.length > 0 ? result.rows[0] : null;
};

const countPromotions = async (filters = {}) => {
  let query = `SELECT COUNT(*) as total FROM promotions pr WHERE pr.status = 'active'`;
  const params = [];
  let paramIndex = 1;

  if (filters.branch_id) {
    query += ` AND pr.branch_id = $${paramIndex}`;
    params.push(filters.branch_id);
    paramIndex++;
  }

  if (filters.promotion_type) {
    query += ` AND pr.promotion_type = $${paramIndex}`;
    params.push(filters.promotion_type);
    paramIndex++;
  }

  if (filters.discount_type) {
    query += ` AND pr.discount_type = $${paramIndex}`;
    params.push(filters.discount_type);
    paramIndex++;
  }

  if (filters.is_active !== undefined) {
    query += ` AND pr.is_active = $${paramIndex}`;
    params.push(filters.is_active);
    paramIndex++;
  }

  if (filters.search) {
    query += ` AND (pr.promotion_name ILIKE $${paramIndex} OR pr.promotion_code ILIKE $${paramIndex})`;
    params.push(`%${filters.search}%`);
  }

  if (filters.active_only === true) {
    query += ` AND pr.start_date <= CURRENT_DATE AND pr.end_date >= CURRENT_DATE`;
  }

  const result = await pool.query(query, params);
  return parseInt(result.rows[0].total);
};

module.exports = {
  getAllPromotions,
  getPromotionById,
  createPromotion,
  updatePromotion,
  deletePromotion,
  incrementPromotionUses,
  countPromotions
};
