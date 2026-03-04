const pool = require('../config/db');

const getAllDentalProcedures = async (filters = {}) => {
  let query = `
    SELECT *
    FROM dental_procedures
    WHERE status = 'active'
  `;

  const params = [];
  let paramIndex = 1;

  if (filters.procedure_category) {
    query += ` AND procedure_category ILIKE $${paramIndex}`;
    params.push(`%${filters.procedure_category}%`);
    paramIndex++;
  }

  if (filters.search) {
    query += ` AND (procedure_name ILIKE $${paramIndex} OR procedure_code ILIKE $${paramIndex})`;
    params.push(`%${filters.search}%`);
  }

  query += ` ORDER BY procedure_name ASC`;

  const result = await pool.query(query, params);
  return result.rows;
};

const getDentalProcedureById = async (procedureId) => {
  const query = `
    SELECT *
    FROM dental_procedures
    WHERE dental_procedure_id = $1 AND status = 'active'
  `;

  const result = await pool.query(query, [procedureId]);
  return result.rows.length > 0 ? result.rows[0] : null;
};

const createDentalProcedure = async (procedureData) => {
  const {
    procedure_code,
    procedure_name,
    procedure_category,
    description,
    default_price,
    estimated_duration,
    requires_anesthesia,
    user_id_registration
  } = procedureData;

  const query = `
    INSERT INTO dental_procedures (
      procedure_code, procedure_name, procedure_category, description,
      default_price, estimated_duration, requires_anesthesia, user_id_registration
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    RETURNING *
  `;

  const values = [
    procedure_code || null,
    procedure_name,
    procedure_category || null,
    description || null,
    default_price || null,
    estimated_duration || null,
    requires_anesthesia || false,
    user_id_registration
  ];

  const result = await pool.query(query, values);
  return result.rows[0];
};

const updateDentalProcedure = async (procedureId, procedureData) => {
  const {
    procedure_code,
    procedure_name,
    procedure_category,
    description,
    default_price,
    estimated_duration,
    requires_anesthesia,
    user_id_modification
  } = procedureData;

  const query = `
    UPDATE dental_procedures SET
      procedure_code = COALESCE($1, procedure_code),
      procedure_name = COALESCE($2, procedure_name),
      procedure_category = COALESCE($3, procedure_category),
      description = COALESCE($4, description),
      default_price = COALESCE($5, default_price),
      estimated_duration = COALESCE($6, estimated_duration),
      requires_anesthesia = COALESCE($7, requires_anesthesia),
      user_id_modification = $8,
      date_time_modification = CURRENT_TIMESTAMP
    WHERE dental_procedure_id = $9 AND status = 'active'
    RETURNING *
  `;

  const values = [
    procedure_code,
    procedure_name,
    procedure_category,
    description,
    default_price,
    estimated_duration,
    requires_anesthesia,
    user_id_modification,
    procedureId
  ];

  const result = await pool.query(query, values);
  return result.rows.length > 0 ? result.rows[0] : null;
};

const deleteDentalProcedure = async (procedureId, userId) => {
  const query = `
    UPDATE dental_procedures SET
      status = 'inactive',
      user_id_modification = $1,
      date_time_modification = CURRENT_TIMESTAMP
    WHERE dental_procedure_id = $2 AND status = 'active'
    RETURNING dental_procedure_id
  `;

  const result = await pool.query(query, [userId, procedureId]);
  return result.rowCount > 0;
};

module.exports = {
  getAllDentalProcedures,
  getDentalProcedureById,
  createDentalProcedure,
  updateDentalProcedure,
  deleteDentalProcedure
};
