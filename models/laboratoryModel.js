const pool = require('../config/db');

// Laboratory Requests
const getAllLaboratoryRequests = async (filters = {}) => {
  let query = `
    SELECT
      lr.*,
      p.first_name || ' ' || p.last_name as patient_name,
      p.identification_number,
      u.first_name || ' ' || u.last_name as dentist_name,
      b.branch_name
    FROM laboratory_requests lr
    INNER JOIN patients p ON lr.patient_id = p.patient_id
    INNER JOIN dentists d ON lr.dentist_id = d.dentist_id
    INNER JOIN users u ON d.user_id = u.user_id
    INNER JOIN branches b ON lr.branch_id = b.branch_id
    WHERE lr.status = 'active'
  `;

  const params = [];
  let paramIndex = 1;

  if (filters.patient_id) {
    query += ` AND lr.patient_id = $${paramIndex}`;
    params.push(filters.patient_id);
    paramIndex++;
  }

  if (filters.dentist_id) {
    query += ` AND lr.dentist_id = $${paramIndex}`;
    params.push(filters.dentist_id);
    paramIndex++;
  }

  if (filters.branch_id) {
    query += ` AND lr.branch_id = $${paramIndex}`;
    params.push(filters.branch_id);
    paramIndex++;
  }

  if (filters.consultation_id) {
    query += ` AND lr.consultation_id = $${paramIndex}`;
    params.push(filters.consultation_id);
    paramIndex++;
  }

  if (filters.request_status) {
    query += ` AND lr.request_status = $${paramIndex}`;
    params.push(filters.request_status);
    paramIndex++;
  }

  if (filters.urgency) {
    query += ` AND lr.urgency = $${paramIndex}`;
    params.push(filters.urgency);
    paramIndex++;
  }

  if (filters.date_from) {
    query += ` AND lr.request_date >= $${paramIndex}`;
    params.push(filters.date_from);
    paramIndex++;
  }

  if (filters.date_to) {
    query += ` AND lr.request_date <= $${paramIndex}`;
    params.push(filters.date_to);
    paramIndex++;
  }

  query += ` ORDER BY lr.request_date DESC, lr.laboratory_request_id DESC`;

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

const getLaboratoryRequestById = async (requestId) => {
  const query = `
    SELECT
      lr.*,
      p.first_name || ' ' || p.last_name as patient_name,
      p.identification_number,
      p.email as patient_email,
      p.phone as patient_phone,
      u.first_name || ' ' || u.last_name as dentist_name,
      u.phone as dentist_phone,
      b.branch_name,
      b.address as branch_address,
      b.phone as branch_phone
    FROM laboratory_requests lr
    INNER JOIN patients p ON lr.patient_id = p.patient_id
    INNER JOIN dentists d ON lr.dentist_id = d.dentist_id
    INNER JOIN users u ON d.user_id = u.user_id
    INNER JOIN branches b ON lr.branch_id = b.branch_id
    WHERE lr.laboratory_request_id = $1 AND lr.status = 'active'
  `;

  const result = await pool.query(query, [requestId]);
  return result.rows.length > 0 ? result.rows[0] : null;
};

const createLaboratoryRequest = async (requestData) => {
  const query = `
    INSERT INTO laboratory_requests (
      patient_id, dentist_id, branch_id, consultation_id, request_date,
      laboratory_name, request_type, description, urgency, request_status,
      expected_delivery_date, actual_delivery_date, cost, notes,
      user_id_registration
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
    RETURNING *
  `;

  const values = [
    requestData.patient_id,
    requestData.dentist_id,
    requestData.branch_id,
    requestData.consultation_id || null,
    requestData.request_date,
    requestData.laboratory_name || null,
    requestData.request_type,
    requestData.description || null,
    requestData.urgency || 'normal',
    requestData.request_status || 'pending',
    requestData.expected_delivery_date || null,
    requestData.actual_delivery_date || null,
    requestData.cost || null,
    requestData.notes || null,
    requestData.user_id_registration
  ];

  const result = await pool.query(query, values);
  return result.rows[0];
};

const updateLaboratoryRequest = async (requestId, requestData) => {
  const fields = [];
  const values = [];
  let paramIndex = 1;

  const allowedFields = [
    'consultation_id', 'request_date', 'laboratory_name', 'request_type',
    'description', 'urgency', 'request_status', 'expected_delivery_date',
    'actual_delivery_date', 'cost', 'notes'
  ];

  allowedFields.forEach((field) => {
    if (requestData[field] !== undefined) {
      fields.push(`${field} = $${paramIndex}`);
      values.push(requestData[field]);
      paramIndex++;
    }
  });

  if (fields.length === 0) {
    throw new Error('No hay campos para actualizar');
  }

  fields.push(`user_id_modification = $${paramIndex}`);
  values.push(requestData.user_id_modification);
  paramIndex++;

  fields.push(`date_time_modification = CURRENT_TIMESTAMP`);

  values.push(requestId);

  const query = `
    UPDATE laboratory_requests SET ${fields.join(', ')}
    WHERE laboratory_request_id = $${paramIndex} AND status = 'active'
    RETURNING *
  `;

  const result = await pool.query(query, values);
  return result.rows.length > 0 ? result.rows[0] : null;
};

const deleteLaboratoryRequest = async (requestId, userId) => {
  const query = `
    UPDATE laboratory_requests SET
      status = 'inactive',
      user_id_modification = $1,
      date_time_modification = CURRENT_TIMESTAMP
    WHERE laboratory_request_id = $2 AND status = 'active'
    RETURNING laboratory_request_id
  `;

  const result = await pool.query(query, [userId, requestId]);
  return result.rowCount > 0;
};

const countLaboratoryRequests = async (filters = {}) => {
  let query = `SELECT COUNT(*) as total FROM laboratory_requests lr WHERE lr.status = 'active'`;
  const params = [];
  let paramIndex = 1;

  if (filters.patient_id) {
    query += ` AND lr.patient_id = $${paramIndex}`;
    params.push(filters.patient_id);
    paramIndex++;
  }

  if (filters.dentist_id) {
    query += ` AND lr.dentist_id = $${paramIndex}`;
    params.push(filters.dentist_id);
    paramIndex++;
  }

  if (filters.branch_id) {
    query += ` AND lr.branch_id = $${paramIndex}`;
    params.push(filters.branch_id);
    paramIndex++;
  }

  if (filters.consultation_id) {
    query += ` AND lr.consultation_id = $${paramIndex}`;
    params.push(filters.consultation_id);
    paramIndex++;
  }

  if (filters.request_status) {
    query += ` AND lr.request_status = $${paramIndex}`;
    params.push(filters.request_status);
    paramIndex++;
  }

  if (filters.urgency) {
    query += ` AND lr.urgency = $${paramIndex}`;
    params.push(filters.urgency);
    paramIndex++;
  }

  if (filters.date_from) {
    query += ` AND lr.request_date >= $${paramIndex}`;
    params.push(filters.date_from);
    paramIndex++;
  }

  if (filters.date_to) {
    query += ` AND lr.request_date <= $${paramIndex}`;
    params.push(filters.date_to);
  }

  const result = await pool.query(query, params);
  return parseInt(result.rows[0].total);
};

// Laboratory Services
const getAllLaboratoryServices = async (filters = {}) => {
  let query = `
    SELECT *
    FROM laboratory_services
    WHERE status = 'active'
  `;

  const params = [];
  let paramIndex = 1;

  if (filters.service_category) {
    query += ` AND service_category = $${paramIndex}`;
    params.push(filters.service_category);
    paramIndex++;
  }

  if (filters.search) {
    query += ` AND (service_name ILIKE $${paramIndex} OR service_code ILIKE $${paramIndex})`;
    params.push(`%${filters.search}%`);
    paramIndex++;
  }

  query += ` ORDER BY service_name ASC`;

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

const getLaboratoryServiceById = async (serviceId) => {
  const query = `SELECT * FROM laboratory_services WHERE laboratory_service_id = $1 AND status = 'active'`;
  const result = await pool.query(query, [serviceId]);
  return result.rows.length > 0 ? result.rows[0] : null;
};

const createLaboratoryService = async (serviceData, userId) => {
  const query = `
    INSERT INTO laboratory_services (
      service_name, service_code, service_category, description,
      estimated_turnaround_days, default_cost, user_id_registration
    ) VALUES ($1, $2, $3, $4, $5, $6, $7)
    RETURNING *
  `;

  const values = [
    serviceData.service_name,
    serviceData.service_code || null,
    serviceData.service_category || null,
    serviceData.description || null,
    serviceData.estimated_turnaround_days || null,
    serviceData.default_cost || null,
    userId
  ];

  const result = await pool.query(query, values);
  return result.rows[0];
};

const updateLaboratoryService = async (serviceId, serviceData, userId) => {
  const fields = [];
  const values = [];
  let paramIndex = 1;

  const allowedFields = [
    'service_name', 'service_code', 'service_category', 'description',
    'estimated_turnaround_days', 'default_cost'
  ];

  allowedFields.forEach((field) => {
    if (serviceData[field] !== undefined) {
      fields.push(`${field} = $${paramIndex}`);
      values.push(serviceData[field]);
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

  values.push(serviceId);

  const query = `
    UPDATE laboratory_services SET ${fields.join(', ')}
    WHERE laboratory_service_id = $${paramIndex} AND status = 'active'
    RETURNING *
  `;

  const result = await pool.query(query, values);
  return result.rows.length > 0 ? result.rows[0] : null;
};

const deleteLaboratoryService = async (serviceId, userId) => {
  const query = `
    UPDATE laboratory_services SET
      status = 'inactive',
      user_id_modification = $1,
      date_time_modification = CURRENT_TIMESTAMP
    WHERE laboratory_service_id = $2 AND status = 'active'
    RETURNING laboratory_service_id
  `;

  const result = await pool.query(query, [userId, serviceId]);
  return result.rowCount > 0;
};

const countLaboratoryServices = async (filters = {}) => {
  let query = `SELECT COUNT(*) as total FROM laboratory_services WHERE status = 'active'`;
  const params = [];
  let paramIndex = 1;

  if (filters.service_category) {
    query += ` AND service_category = $${paramIndex}`;
    params.push(filters.service_category);
    paramIndex++;
  }

  if (filters.search) {
    query += ` AND (service_name ILIKE $${paramIndex} OR service_code ILIKE $${paramIndex})`;
    params.push(`%${filters.search}%`);
  }

  const result = await pool.query(query, params);
  return parseInt(result.rows[0].total);
};

module.exports = {
  getAllLaboratoryRequests,
  getLaboratoryRequestById,
  createLaboratoryRequest,
  updateLaboratoryRequest,
  deleteLaboratoryRequest,
  countLaboratoryRequests,
  getAllLaboratoryServices,
  getLaboratoryServiceById,
  createLaboratoryService,
  updateLaboratoryService,
  deleteLaboratoryService,
  countLaboratoryServices
};
