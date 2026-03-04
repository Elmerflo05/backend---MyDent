const pool = require('../config/db');

// Inventory Items
const getAllInventoryItems = async (filters = {}) => {
  let query = `
    SELECT
      ii.*,
      b.branch_name,
      ic.category_name,
      ic.category_code
    FROM inventory_items ii
    INNER JOIN branches b ON ii.branch_id = b.branch_id
    LEFT JOIN inventory_categories ic ON ii.inventory_category_id = ic.inventory_category_id
    WHERE ii.status = 'active'
  `;

  const params = [];
  let paramIndex = 1;

  if (filters.branch_id) {
    query += ` AND ii.branch_id = $${paramIndex}`;
    params.push(filters.branch_id);
    paramIndex++;
  }

  if (filters.inventory_category_id) {
    query += ` AND ii.inventory_category_id = $${paramIndex}`;
    params.push(filters.inventory_category_id);
    paramIndex++;
  }

  if (filters.search) {
    query += ` AND (ii.item_name ILIKE $${paramIndex} OR ii.item_code ILIKE $${paramIndex})`;
    params.push(`%${filters.search}%`);
    paramIndex++;
  }

  // Filtrar items con stock bajo
  if (filters.low_stock === true) {
    query += ` AND ii.current_quantity <= ii.minimum_quantity`;
  }

  // Filtrar items próximos a vencer
  if (filters.expiring_soon) {
    query += ` AND ii.expiry_date IS NOT NULL AND ii.expiry_date <= CURRENT_DATE + INTERVAL '${filters.expiring_soon} days'`;
  }

  query += ` ORDER BY ii.item_name ASC`;

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

const getInventoryItemById = async (itemId) => {
  const query = `
    SELECT
      ii.*,
      b.branch_name,
      b.address as branch_address,
      ic.category_name,
      ic.category_code,
      ic.description as category_description
    FROM inventory_items ii
    INNER JOIN branches b ON ii.branch_id = b.branch_id
    LEFT JOIN inventory_categories ic ON ii.inventory_category_id = ic.inventory_category_id
    WHERE ii.inventory_item_id = $1 AND ii.status = 'active'
  `;

  const result = await pool.query(query, [itemId]);
  return result.rows.length > 0 ? result.rows[0] : null;
};

const createInventoryItem = async (itemData) => {
  const query = `
    INSERT INTO inventory_items (
      branch_id, inventory_category_id, item_code, item_name, description,
      unit_of_measure, current_quantity, minimum_quantity, maximum_quantity,
      unit_cost, supplier_name, supplier_contact, location, expiry_date,
      batch_number, notes, user_id_registration
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
    RETURNING *
  `;

  const values = [
    itemData.branch_id,
    itemData.inventory_category_id || null,
    itemData.item_code,
    itemData.item_name,
    itemData.description || null,
    itemData.unit_of_measure || null,
    itemData.current_quantity || 0,
    itemData.minimum_quantity || 0,
    itemData.maximum_quantity || null,
    itemData.unit_cost || null,
    itemData.supplier_name || null,
    itemData.supplier_contact || null,
    itemData.location || null,
    itemData.expiry_date || null,
    itemData.batch_number || null,
    itemData.notes || null,
    itemData.user_id_registration
  ];

  const result = await pool.query(query, values);
  return result.rows[0];
};

const updateInventoryItem = async (itemId, itemData) => {
  const fields = [];
  const values = [];
  let paramIndex = 1;

  const allowedFields = [
    'branch_id', 'inventory_category_id', 'item_code', 'item_name', 'description',
    'unit_of_measure', 'current_quantity', 'minimum_quantity', 'maximum_quantity',
    'unit_cost', 'supplier_name', 'supplier_contact', 'location',
    'expiry_date', 'batch_number', 'notes'
  ];

  allowedFields.forEach((field) => {
    if (itemData[field] !== undefined) {
      fields.push(`${field} = $${paramIndex}`);
      values.push(itemData[field]);
      paramIndex++;
    }
  });

  if (fields.length === 0) {
    throw new Error('No hay campos para actualizar');
  }

  fields.push(`user_id_modification = $${paramIndex}`);
  values.push(itemData.user_id_modification);
  paramIndex++;

  fields.push(`date_time_modification = CURRENT_TIMESTAMP`);

  values.push(itemId);

  const query = `
    UPDATE inventory_items SET ${fields.join(', ')}
    WHERE inventory_item_id = $${paramIndex} AND status = 'active'
    RETURNING *
  `;

  const result = await pool.query(query, values);
  return result.rows.length > 0 ? result.rows[0] : null;
};

const adjustInventoryQuantity = async (itemId, quantityChange, userId) => {
  const query = `
    UPDATE inventory_items SET
      current_quantity = current_quantity + $1,
      user_id_modification = $2,
      date_time_modification = CURRENT_TIMESTAMP
    WHERE inventory_item_id = $3 AND status = 'active'
    RETURNING *
  `;

  const result = await pool.query(query, [quantityChange, userId, itemId]);
  return result.rows.length > 0 ? result.rows[0] : null;
};

const deleteInventoryItem = async (itemId, userId) => {
  const query = `
    UPDATE inventory_items SET
      status = 'inactive',
      user_id_modification = $1,
      date_time_modification = CURRENT_TIMESTAMP
    WHERE inventory_item_id = $2 AND status = 'active'
    RETURNING inventory_item_id
  `;

  const result = await pool.query(query, [userId, itemId]);
  return result.rowCount > 0;
};

const countInventoryItems = async (filters = {}) => {
  let query = `SELECT COUNT(*) as total FROM inventory_items ii WHERE ii.status = 'active'`;
  const params = [];
  let paramIndex = 1;

  if (filters.branch_id) {
    query += ` AND ii.branch_id = $${paramIndex}`;
    params.push(filters.branch_id);
    paramIndex++;
  }

  if (filters.inventory_category_id) {
    query += ` AND ii.inventory_category_id = $${paramIndex}`;
    params.push(filters.inventory_category_id);
    paramIndex++;
  }

  if (filters.search) {
    query += ` AND (ii.item_name ILIKE $${paramIndex} OR ii.item_code ILIKE $${paramIndex})`;
    params.push(`%${filters.search}%`);
  }

  if (filters.low_stock === true) {
    query += ` AND ii.current_quantity <= ii.minimum_quantity`;
  }

  if (filters.expiring_soon) {
    query += ` AND ii.expiry_date IS NOT NULL AND ii.expiry_date <= CURRENT_DATE + INTERVAL '${filters.expiring_soon} days'`;
  }

  const result = await pool.query(query, params);
  return parseInt(result.rows[0].total);
};

// Inventory Categories
const getAllInventoryCategories = async () => {
  const query = `
    SELECT
      ic.*,
      parent.category_name as parent_category_name
    FROM inventory_categories ic
    LEFT JOIN inventory_categories parent ON ic.parent_category_id = parent.inventory_category_id
    ORDER BY ic.category_name ASC
  `;

  const result = await pool.query(query);
  return result.rows;
};

const getInventoryCategoryById = async (categoryId) => {
  const query = `
    SELECT
      ic.*,
      parent.category_name as parent_category_name
    FROM inventory_categories ic
    LEFT JOIN inventory_categories parent ON ic.parent_category_id = parent.inventory_category_id
    WHERE ic.inventory_category_id = $1
  `;

  const result = await pool.query(query, [categoryId]);
  return result.rows.length > 0 ? result.rows[0] : null;
};

const createInventoryCategory = async (categoryData, userId) => {
  const query = `
    INSERT INTO inventory_categories (
      category_name, category_code, parent_category_id, description, color, user_id_registration
    ) VALUES ($1, $2, $3, $4, $5, $6)
    RETURNING *
  `;

  const values = [
    categoryData.category_name,
    categoryData.category_code || null,
    categoryData.parent_category_id || null,
    categoryData.description || null,
    categoryData.color || '#3b82f6',
    userId
  ];

  const result = await pool.query(query, values);
  return result.rows[0];
};

const updateInventoryCategory = async (categoryId, categoryData, userId) => {
  const fields = [];
  const values = [];
  let paramIndex = 1;

  const allowedFields = ['category_name', 'category_code', 'parent_category_id', 'description', 'color', 'status'];

  allowedFields.forEach((field) => {
    if (categoryData[field] !== undefined) {
      fields.push(`${field} = $${paramIndex}`);
      values.push(categoryData[field]);
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

  values.push(categoryId);

  const query = `
    UPDATE inventory_categories SET ${fields.join(', ')}
    WHERE inventory_category_id = $${paramIndex}
    RETURNING *
  `;

  const result = await pool.query(query, values);
  return result.rows.length > 0 ? result.rows[0] : null;
};

const deleteInventoryCategory = async (categoryId, userId) => {
  const query = `
    UPDATE inventory_categories SET
      status = 'inactive',
      user_id_modification = $1,
      date_time_modification = CURRENT_TIMESTAMP
    WHERE inventory_category_id = $2
    RETURNING inventory_category_id
  `;

  const result = await pool.query(query, [userId, categoryId]);
  return result.rowCount > 0;
};

module.exports = {
  getAllInventoryItems,
  getInventoryItemById,
  createInventoryItem,
  updateInventoryItem,
  adjustInventoryQuantity,
  deleteInventoryItem,
  countInventoryItems,
  getAllInventoryCategories,
  getInventoryCategoryById,
  createInventoryCategory,
  updateInventoryCategory,
  deleteInventoryCategory
};
