const pool = require('../config/db');

// Companies
const getAllCompanies = async (filters = {}) => {
  let query = `
    SELECT *,
      (SELECT COUNT(*) FROM patients p WHERE p.company_id = companies.company_id AND p.status = 'active') as employee_count
    FROM companies
    WHERE status != 'deleted'
  `;

  const params = [];
  let paramIndex = 1;

  // Filtrar por status si se especifica, sino mostrar todas (excepto deleted)
  if (filters.status) {
    query += ` AND status = $${paramIndex}`;
    params.push(filters.status);
    paramIndex++;
  }

  if (filters.search) {
    query += ` AND (company_name ILIKE $${paramIndex} OR legal_name ILIKE $${paramIndex} OR tax_id ILIKE $${paramIndex} OR ruc ILIKE $${paramIndex})`;
    params.push(`%${filters.search}%`);
    paramIndex++;
  }

  if (filters.city) {
    query += ` AND city = $${paramIndex}`;
    params.push(filters.city);
    paramIndex++;
  }

  if (filters.country) {
    query += ` AND country = $${paramIndex}`;
    params.push(filters.country);
    paramIndex++;
  }

  query += ` ORDER BY status ASC, company_name ASC`;

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

const getCompanyById = async (companyId) => {
  const query = `SELECT * FROM companies WHERE company_id = $1`;
  const result = await pool.query(query, [companyId]);
  return result.rows.length > 0 ? result.rows[0] : null;
};

const createCompany = async (companyData) => {
  const query = `
    INSERT INTO companies (
      company_name, tax_id, ruc, legal_name, phone, email, website,
      address, city, state, country, postal_code, logo_url,
      contact_person, contact_phone, contact_cargo,
      vigencia_inicio, vigencia_fin, notes, status, user_id_registration
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21)
    RETURNING *
  `;

  const values = [
    companyData.company_name,
    companyData.tax_id || null,
    companyData.ruc || null,
    companyData.legal_name || null,
    companyData.phone || null,
    companyData.email || null,
    companyData.website || null,
    companyData.address || null,
    companyData.city || null,
    companyData.state || null,
    companyData.country || 'Perú',
    companyData.postal_code || null,
    companyData.logo_url || null,
    companyData.contact_person || null,
    companyData.contact_phone || null,
    companyData.contact_cargo || null,
    companyData.vigencia_inicio || null,
    companyData.vigencia_fin || null,
    companyData.notes || null,
    companyData.status || 'active',
    companyData.user_id_registration
  ];

  const result = await pool.query(query, values);
  return result.rows[0];
};

const updateCompany = async (companyId, companyData) => {
  const fields = [];
  const values = [];
  let paramIndex = 1;

  const allowedFields = [
    'company_name', 'tax_id', 'ruc', 'legal_name', 'phone', 'email',
    'website', 'address', 'city', 'state', 'country', 'postal_code',
    'logo_url', 'contact_person', 'contact_phone', 'contact_cargo',
    'vigencia_inicio', 'vigencia_fin', 'notes', 'status'
  ];

  allowedFields.forEach((field) => {
    if (companyData[field] !== undefined) {
      fields.push(`${field} = $${paramIndex}`);
      values.push(companyData[field]);
      paramIndex++;
    }
  });

  if (fields.length === 0) {
    throw new Error('No hay campos para actualizar');
  }

  fields.push(`user_id_modification = $${paramIndex}`);
  values.push(companyData.user_id_modification);
  paramIndex++;

  fields.push(`date_time_modification = CURRENT_TIMESTAMP`);

  values.push(companyId);

  const query = `
    UPDATE companies SET ${fields.join(', ')}
    WHERE company_id = $${paramIndex} AND status != 'deleted'
    RETURNING *
  `;

  const result = await pool.query(query, values);
  return result.rows.length > 0 ? result.rows[0] : null;
};

const deleteCompany = async (companyId, userId) => {
  const query = `
    UPDATE companies SET
      status = 'deleted',
      user_id_modification = $1,
      date_time_modification = CURRENT_TIMESTAMP
    WHERE company_id = $2 AND status != 'deleted'
    RETURNING company_id
  `;

  const result = await pool.query(query, [userId, companyId]);
  return result.rowCount > 0;
};

const countCompanies = async (filters = {}) => {
  let query = `SELECT COUNT(*) as total FROM companies WHERE status != 'deleted'`;
  const params = [];
  let paramIndex = 1;

  // Filtrar por status si se especifica, sino contar todas
  if (filters.status) {
    query += ` AND status = $${paramIndex}`;
    params.push(filters.status);
    paramIndex++;
  }

  if (filters.search) {
    query += ` AND (company_name ILIKE $${paramIndex} OR legal_name ILIKE $${paramIndex} OR tax_id ILIKE $${paramIndex} OR ruc ILIKE $${paramIndex})`;
    params.push(`%${filters.search}%`);
    paramIndex++;
  }

  if (filters.city) {
    query += ` AND city = $${paramIndex}`;
    params.push(filters.city);
    paramIndex++;
  }

  if (filters.country) {
    query += ` AND country = $${paramIndex}`;
    params.push(filters.country);
  }

  const result = await pool.query(query, params);
  return parseInt(result.rows[0].total);
};

// Company Contracts
const getAllCompanyContracts = async (filters = {}) => {
  let query = `
    SELECT
      cc.*,
      c.company_name,
      c.tax_id,
      c.ruc,
      b.branch_name
    FROM company_contracts cc
    INNER JOIN companies c ON cc.company_id = c.company_id
    INNER JOIN branches b ON cc.branch_id = b.branch_id
    WHERE cc.status = 'active'
  `;

  const params = [];
  let paramIndex = 1;

  if (filters.company_id) {
    query += ` AND cc.company_id = $${paramIndex}`;
    params.push(filters.company_id);
    paramIndex++;
  }

  if (filters.branch_id) {
    query += ` AND cc.branch_id = $${paramIndex}`;
    params.push(filters.branch_id);
    paramIndex++;
  }

  if (filters.contract_type) {
    query += ` AND cc.contract_type = $${paramIndex}`;
    params.push(filters.contract_type);
    paramIndex++;
  }

  if (filters.is_signed !== undefined) {
    query += ` AND cc.is_signed = $${paramIndex}`;
    params.push(filters.is_signed);
    paramIndex++;
  }

  if (filters.date_from) {
    query += ` AND cc.start_date >= $${paramIndex}`;
    params.push(filters.date_from);
    paramIndex++;
  }

  if (filters.date_to) {
    query += ` AND (cc.end_date IS NULL OR cc.end_date <= $${paramIndex})`;
    params.push(filters.date_to);
    paramIndex++;
  }

  query += ` ORDER BY cc.contract_date DESC, cc.company_contract_id DESC`;

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

const getCompanyContractById = async (contractId) => {
  const query = `
    SELECT
      cc.*,
      c.company_name,
      c.tax_id,
      c.ruc,
      c.legal_name,
      c.phone as company_phone,
      c.email as company_email,
      c.address as company_address,
      b.branch_name,
      b.address as branch_address,
      b.phone as branch_phone
    FROM company_contracts cc
    INNER JOIN companies c ON cc.company_id = c.company_id
    INNER JOIN branches b ON cc.branch_id = b.branch_id
    WHERE cc.company_contract_id = $1 AND cc.status = 'active'
  `;

  const result = await pool.query(query, [contractId]);
  return result.rows.length > 0 ? result.rows[0] : null;
};

const createCompanyContract = async (contractData) => {
  const query = `
    INSERT INTO company_contracts (
      company_id, branch_id, contract_number, contract_type, contract_date,
      start_date, end_date, coverage_details, discount_percentage,
      contract_content, contract_file_url, is_signed, signed_date, notes,
      user_id_registration
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
    RETURNING *
  `;

  const values = [
    contractData.company_id,
    contractData.branch_id,
    contractData.contract_number || null,
    contractData.contract_type,
    contractData.contract_date,
    contractData.start_date,
    contractData.end_date || null,
    contractData.coverage_details || null,
    contractData.discount_percentage || null,
    contractData.contract_content || null,
    contractData.contract_file_url || null,
    contractData.is_signed || false,
    contractData.signed_date || null,
    contractData.notes || null,
    contractData.user_id_registration
  ];

  const result = await pool.query(query, values);
  return result.rows[0];
};

const updateCompanyContract = async (contractId, contractData) => {
  const fields = [];
  const values = [];
  let paramIndex = 1;

  const allowedFields = [
    'contract_number', 'contract_type', 'contract_date', 'start_date',
    'end_date', 'coverage_details', 'discount_percentage', 'contract_content',
    'contract_file_url', 'is_signed', 'signed_date', 'notes'
  ];

  allowedFields.forEach((field) => {
    if (contractData[field] !== undefined) {
      fields.push(`${field} = $${paramIndex}`);
      values.push(contractData[field]);
      paramIndex++;
    }
  });

  if (fields.length === 0) {
    throw new Error('No hay campos para actualizar');
  }

  fields.push(`user_id_modification = $${paramIndex}`);
  values.push(contractData.user_id_modification);
  paramIndex++;

  fields.push(`date_time_modification = CURRENT_TIMESTAMP`);

  values.push(contractId);

  const query = `
    UPDATE company_contracts SET ${fields.join(', ')}
    WHERE company_contract_id = $${paramIndex} AND status = 'active'
    RETURNING *
  `;

  const result = await pool.query(query, values);
  return result.rows.length > 0 ? result.rows[0] : null;
};

const deleteCompanyContract = async (contractId, userId) => {
  const query = `
    UPDATE company_contracts SET
      status = 'inactive',
      user_id_modification = $1,
      date_time_modification = CURRENT_TIMESTAMP
    WHERE company_contract_id = $2 AND status = 'active'
    RETURNING company_contract_id
  `;

  const result = await pool.query(query, [userId, contractId]);
  return result.rowCount > 0;
};

const countCompanyContracts = async (filters = {}) => {
  let query = `SELECT COUNT(*) as total FROM company_contracts cc WHERE cc.status = 'active'`;
  const params = [];
  let paramIndex = 1;

  if (filters.company_id) {
    query += ` AND cc.company_id = $${paramIndex}`;
    params.push(filters.company_id);
    paramIndex++;
  }

  if (filters.branch_id) {
    query += ` AND cc.branch_id = $${paramIndex}`;
    params.push(filters.branch_id);
    paramIndex++;
  }

  if (filters.contract_type) {
    query += ` AND cc.contract_type = $${paramIndex}`;
    params.push(filters.contract_type);
    paramIndex++;
  }

  if (filters.is_signed !== undefined) {
    query += ` AND cc.is_signed = $${paramIndex}`;
    params.push(filters.is_signed);
    paramIndex++;
  }

  if (filters.date_from) {
    query += ` AND cc.start_date >= $${paramIndex}`;
    params.push(filters.date_from);
    paramIndex++;
  }

  if (filters.date_to) {
    query += ` AND (cc.end_date IS NULL OR cc.end_date <= $${paramIndex})`;
    params.push(filters.date_to);
  }

  const result = await pool.query(query, params);
  return parseInt(result.rows[0].total);
};

/**
 * Buscar empresa por RUC (para registro publico de pacientes)
 */
const getCompanyByRuc = async (ruc) => {
  const query = `
    SELECT
      company_id, company_name, ruc, legal_name,
      vigencia_inicio, vigencia_fin, status,
      CASE
        WHEN status != 'active' THEN 'inactive'
        WHEN vigencia_fin IS NULL THEN 'no_vigencia'
        WHEN vigencia_fin >= CURRENT_DATE THEN 'vigente'
        ELSE 'vencida'
      END as vigencia_status
    FROM companies
    WHERE ruc = $1 AND status = 'active'
  `;

  const result = await pool.query(query, [ruc]);
  return result.rows.length > 0 ? result.rows[0] : null;
};

module.exports = {
  getAllCompanies,
  getCompanyById,
  createCompany,
  updateCompany,
  deleteCompany,
  countCompanies,
  getCompanyByRuc,
  getAllCompanyContracts,
  getCompanyContractById,
  createCompanyContract,
  updateCompanyContract,
  deleteCompanyContract,
  countCompanyContracts
};
