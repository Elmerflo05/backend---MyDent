const pool = require('../config/db');

// Obtener todas las plantillas de contratos
const getAllContractTemplates = async (filters = {}) => {
  let query = `SELECT * FROM contract_templates WHERE status = 'active'`;
  const params = [];
  let paramIndex = 1;

  if (filters.template_category) {
    query += ` AND template_category = $${paramIndex}`;
    params.push(filters.template_category);
    paramIndex++;
  }

  if (filters.template_type) {
    query += ` AND template_type = $${paramIndex}`;
    params.push(filters.template_type);
    paramIndex++;
  }

  if (filters.is_active !== undefined) {
    query += ` AND is_active = $${paramIndex}`;
    params.push(filters.is_active);
    paramIndex++;
  }

  if (filters.search) {
    query += ` AND (template_name ILIKE $${paramIndex} OR description ILIKE $${paramIndex})`;
    params.push(`%${filters.search}%`);
    paramIndex++;
  }

  query += ` ORDER BY template_name ASC`;

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

// Obtener una plantilla por ID
const getContractTemplateById = async (templateId) => {
  const result = await pool.query(
    'SELECT * FROM contract_templates WHERE contract_template_id = $1 AND status = $2',
    [templateId, 'active']
  );
  return result.rows.length > 0 ? result.rows[0] : null;
};

// Crear nueva plantilla de contrato
const createContractTemplate = async (templateData, userId) => {
  const query = `
    INSERT INTO contract_templates (
      template_name, template_code, template_type, template_category,
      description, price, duration, template_content, is_active,
      branch_id, user_id_registration
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING *
  `;
  const values = [
    templateData.template_name,
    templateData.template_code || null,
    templateData.template_type,
    templateData.template_category || 'servicios',
    templateData.description || null,
    templateData.price || null,
    templateData.duration || null,
    templateData.template_content,
    templateData.is_active !== undefined ? templateData.is_active : true,
    templateData.branch_id || null,
    userId
  ];
  const result = await pool.query(query, values);
  return result.rows[0];
};

// Actualizar plantilla de contrato
const updateContractTemplate = async (templateId, templateData, userId) => {
  const query = `
    UPDATE contract_templates SET
      template_name = COALESCE($1, template_name),
      template_code = COALESCE($2, template_code),
      template_type = COALESCE($3, template_type),
      template_category = COALESCE($4, template_category),
      description = COALESCE($5, description),
      price = COALESCE($6, price),
      duration = COALESCE($7, duration),
      template_content = COALESCE($8, template_content),
      is_active = COALESCE($9, is_active),
      branch_id = COALESCE($10, branch_id),
      user_id_modification = $11,
      date_time_modification = CURRENT_TIMESTAMP
    WHERE contract_template_id = $12 AND status = 'active'
    RETURNING *
  `;
  const result = await pool.query(query, [
    templateData.template_name,
    templateData.template_code,
    templateData.template_type,
    templateData.template_category,
    templateData.description,
    templateData.price,
    templateData.duration,
    templateData.template_content,
    templateData.is_active,
    templateData.branch_id,
    userId,
    templateId
  ]);
  return result.rows.length > 0 ? result.rows[0] : null;
};

// Eliminar plantilla de contrato (soft delete)
const deleteContractTemplate = async (templateId, userId) => {
  const result = await pool.query(
    `UPDATE contract_templates SET status = 'inactive', user_id_modification = $1,
     date_time_modification = CURRENT_TIMESTAMP
     WHERE contract_template_id = $2 AND status = 'active' RETURNING contract_template_id`,
    [userId, templateId]
  );
  return result.rowCount > 0;
};

// Contar plantillas (para paginación)
const countContractTemplates = async (filters = {}) => {
  let query = `SELECT COUNT(*) as total FROM contract_templates WHERE status = 'active'`;
  const params = [];
  let paramIndex = 1;

  if (filters.template_category) {
    query += ` AND template_category = $${paramIndex}`;
    params.push(filters.template_category);
    paramIndex++;
  }

  if (filters.template_type) {
    query += ` AND template_type = $${paramIndex}`;
    params.push(filters.template_type);
    paramIndex++;
  }

  if (filters.is_active !== undefined) {
    query += ` AND is_active = $${paramIndex}`;
    params.push(filters.is_active);
    paramIndex++;
  }

  if (filters.search) {
    query += ` AND (template_name ILIKE $${paramIndex} OR description ILIKE $${paramIndex})`;
    params.push(`%${filters.search}%`);
  }

  const result = await pool.query(query, params);
  return parseInt(result.rows[0].total);
};

module.exports = {
  getAllContractTemplates,
  getContractTemplateById,
  createContractTemplate,
  updateContractTemplate,
  deleteContractTemplate,
  countContractTemplates
};
