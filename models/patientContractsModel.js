const pool = require('../config/db');

const getAllPatientContracts = async (filters = {}) => {
  let query = `
    SELECT pc.*, p.first_name || ' ' || p.last_name as patient_name,
           p.identification_number, b.branch_name
    FROM patient_contracts pc
    INNER JOIN patients p ON pc.patient_id = p.patient_id
    INNER JOIN branches b ON pc.branch_id = b.branch_id
    WHERE pc.status = 'active'
  `;
  const params = [];
  let paramIndex = 1;

  if (filters.patient_id) {
    query += ` AND pc.patient_id = $${paramIndex}`;
    params.push(filters.patient_id);
    paramIndex++;
  }

  if (filters.branch_id) {
    query += ` AND pc.branch_id = $${paramIndex}`;
    params.push(filters.branch_id);
    paramIndex++;
  }

  if (filters.contract_type) {
    query += ` AND pc.contract_type = $${paramIndex}`;
    params.push(filters.contract_type);
    paramIndex++;
  }

  if (filters.is_signed !== undefined) {
    query += ` AND pc.is_signed = $${paramIndex}`;
    params.push(filters.is_signed);
    paramIndex++;
  }

  query += ` ORDER BY pc.contract_date DESC`;

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

const getPatientContractById = async (contractId) => {
  const query = `
    SELECT pc.*, p.first_name || ' ' || p.last_name as patient_name,
           p.identification_number, p.email, p.phone_number,
           b.branch_name, b.address as branch_address
    FROM patient_contracts pc
    INNER JOIN patients p ON pc.patient_id = p.patient_id
    INNER JOIN branches b ON pc.branch_id = b.branch_id
    WHERE pc.patient_contract_id = $1 AND pc.status = 'active'
  `;
  const result = await pool.query(query, [contractId]);
  return result.rows.length > 0 ? result.rows[0] : null;
};

const createPatientContract = async (contractData, userId) => {
  const query = `
    INSERT INTO patient_contracts (
      patient_id, branch_id, contract_type, contract_number, contract_date,
      start_date, end_date, contract_content, contract_amount, payment_terms,
      contract_file_url, is_signed, signed_date, notes, user_id_registration
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
    RETURNING *
  `;
  const values = [
    contractData.patient_id,
    contractData.branch_id,
    contractData.contract_type || 'treatment',
    contractData.contract_number || null,
    contractData.contract_date || new Date(),
    contractData.start_date,
    contractData.end_date || null,
    contractData.contract_content || contractData.terms_and_conditions || null,
    contractData.total_amount || contractData.contract_amount || null,
    contractData.payment_terms || null,
    contractData.contract_file_url || null,
    contractData.is_signed || false,
    contractData.signed_date || contractData.signature_date || null,
    contractData.notes || null,
    userId
  ];
  const result = await pool.query(query, values);
  return result.rows[0];
};

const updatePatientContract = async (contractId, contractData, userId) => {
  const fields = [];
  const values = [];
  let paramIndex = 1;

  const allowedFields = [
    'contract_type', 'contract_number', 'contract_date', 'start_date', 'end_date',
    'contract_terms', 'total_amount', 'payment_terms', 'is_signed',
    'signature_date', 'signature_image_path'
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
  values.push(userId);
  paramIndex++;

  fields.push(`date_time_modification = CURRENT_TIMESTAMP`);
  values.push(contractId);

  const query = `
    UPDATE patient_contracts SET ${fields.join(', ')}
    WHERE patient_contract_id = $${paramIndex} AND status = 'active'
    RETURNING *
  `;

  const result = await pool.query(query, values);
  return result.rows.length > 0 ? result.rows[0] : null;
};

const deletePatientContract = async (contractId, userId) => {
  const result = await pool.query(
    `UPDATE patient_contracts SET status = 'inactive', user_id_modification = $1,
     date_time_modification = CURRENT_TIMESTAMP
     WHERE patient_contract_id = $2 AND status = 'active' RETURNING patient_contract_id`,
    [userId, contractId]
  );
  return result.rowCount > 0;
};

const countPatientContracts = async (filters = {}) => {
  let query = `SELECT COUNT(*) as total FROM patient_contracts WHERE status = 'active'`;
  const params = [];
  let paramIndex = 1;

  if (filters.patient_id) {
    query += ` AND patient_id = $${paramIndex}`;
    params.push(filters.patient_id);
    paramIndex++;
  }

  if (filters.branch_id) {
    query += ` AND branch_id = $${paramIndex}`;
    params.push(filters.branch_id);
    paramIndex++;
  }

  if (filters.contract_type) {
    query += ` AND contract_type = $${paramIndex}`;
    params.push(filters.contract_type);
    paramIndex++;
  }

  if (filters.is_signed !== undefined) {
    query += ` AND is_signed = $${paramIndex}`;
    params.push(filters.is_signed);
  }

  const result = await pool.query(query, params);
  return parseInt(result.rows[0].total);
};

// Asignar contrato a paciente desde una plantilla (con firma inmediata)
const assignContractFromTemplate = async (data, userId) => {
  // data: { patient_id, template_id, branch_id, notes, patient_address, representative_name, representative_dni, representative_address, signature_data, contract_file_url }

  // 1. Obtener la plantilla
  const templateResult = await pool.query(
    'SELECT * FROM contract_templates WHERE contract_template_id = $1 AND status = $2',
    [data.template_id, 'active']
  );

  if (templateResult.rows.length === 0) {
    throw new Error('Plantilla de contrato no encontrada');
  }

  const template = templateResult.rows[0];

  // 2. Generar número de contrato único
  const contractNumber = `CT-${Date.now()}-${data.patient_id}`;

  // 3. Construir notas con datos de firma
  let signatureNotes = data.notes || '';
  signatureNotes += `\n\n--- DATOS DE FIRMA ---`;
  signatureNotes += `\nDomicilio del paciente: ${data.patient_address || 'No especificado'}`;

  if (data.representative_name) {
    signatureNotes += `\n\nRepresentante Legal:`;
    signatureNotes += `\n- Nombre: ${data.representative_name}`;
    signatureNotes += `\n- DNI: ${data.representative_dni || 'No especificado'}`;
    signatureNotes += `\n- Domicilio: ${data.representative_address || 'No especificado'}`;
  }

  signatureNotes += `\n\nFirmado el: ${new Date().toLocaleString('es-PE')}`;

  // 4. Crear el contrato del paciente como YA FIRMADO
  const query = `
    INSERT INTO patient_contracts (
      patient_id, branch_id, contract_number, contract_type, contract_date,
      start_date, contract_amount, contract_content, payment_terms,
      is_signed, signed_date, signature_data, contract_file_url, notes, user_id_registration
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
    RETURNING *
  `;

  const values = [
    data.patient_id,
    data.branch_id,
    contractNumber,
    template.template_type,
    new Date(), // contract_date
    new Date(), // start_date
    template.price || null,
    template.template_content, // Contenido HTML de la plantilla
    template.duration || null,
    true, // is_signed = true (firmado al momento de asignar)
    new Date(), // signed_date = ahora
    data.signature_data, // Firma digital en base64
    data.contract_file_url || null, // Archivo adjunto
    signatureNotes.trim(),
    userId
  ];

  const result = await pool.query(query, values);
  return result.rows[0];
};

// Obtener contratos de un paciente por su patient_id (para portal de paciente)
const getContractsByPatientId = async (patientId, filters = {}) => {
  let query = `
    SELECT pc.*,
           p.first_name || ' ' || p.last_name as patient_name,
           p.identification_number,
           b.branch_name,
           u.first_name || ' ' || u.last_name as assigned_by_name
    FROM patient_contracts pc
    INNER JOIN patients p ON pc.patient_id = p.patient_id
    INNER JOIN branches b ON pc.branch_id = b.branch_id
    LEFT JOIN users u ON pc.user_id_registration = u.user_id
    WHERE pc.patient_id = $1 AND pc.status = 'active'
  `;
  const params = [patientId];
  let paramIndex = 2;

  if (filters.contract_type) {
    query += ` AND pc.contract_type = $${paramIndex}`;
    params.push(filters.contract_type);
    paramIndex++;
  }

  query += ` ORDER BY pc.contract_date DESC`;

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

// Firmar un contrato (para pacientes)
const signContract = async (contractId, patientId, signatureData) => {
  // signatureData: { patient_address, representative_name, representative_dni, representative_address, observations }

  // Verificar que el contrato pertenece al paciente y no está firmado
  const checkQuery = `
    SELECT pc.*, p.first_name || ' ' || p.last_name as patient_name, p.identification_number
    FROM patient_contracts pc
    INNER JOIN patients p ON pc.patient_id = p.patient_id
    WHERE pc.patient_contract_id = $1 AND pc.patient_id = $2 AND pc.status = 'active'
  `;
  const checkResult = await pool.query(checkQuery, [contractId, patientId]);

  if (checkResult.rows.length === 0) {
    throw new Error('Contrato no encontrado o no autorizado');
  }

  const contract = checkResult.rows[0];

  if (contract.is_signed) {
    throw new Error('Este contrato ya está firmado');
  }

  // Construir notas con la información de firma
  let signatureNotes = contract.notes || '';
  signatureNotes += `\n\n--- DATOS DE FIRMA ---`;
  signatureNotes += `\nDomicilio del paciente: ${signatureData.patient_address || 'No especificado'}`;

  if (signatureData.representative_name) {
    signatureNotes += `\n\nRepresentante Legal:`;
    signatureNotes += `\n- Nombre: ${signatureData.representative_name}`;
    signatureNotes += `\n- DNI: ${signatureData.representative_dni || 'No especificado'}`;
    signatureNotes += `\n- Domicilio: ${signatureData.representative_address || 'No especificado'}`;
  }

  if (signatureData.observations) {
    signatureNotes += `\n\nObservaciones: ${signatureData.observations}`;
  }

  signatureNotes += `\n\nFirmado el: ${new Date().toLocaleString('es-PE')}`;

  // Actualizar el contrato como firmado
  const updateQuery = `
    UPDATE patient_contracts
    SET is_signed = true,
        signed_date = CURRENT_TIMESTAMP,
        notes = $1,
        date_time_modification = CURRENT_TIMESTAMP
    WHERE patient_contract_id = $2 AND patient_id = $3
    RETURNING *
  `;

  const result = await pool.query(updateQuery, [signatureNotes.trim(), contractId, patientId]);
  return result.rows[0];
};

// Contar contratos de un paciente por su patient_id (para paginación del portal de paciente)
const countContractsByPatientId = async (patientId, filters = {}) => {
  let query = `SELECT COUNT(*) as total FROM patient_contracts WHERE patient_id = $1 AND status = 'active'`;
  const params = [patientId];
  let paramIndex = 2;

  if (filters.contract_type) {
    query += ` AND contract_type = $${paramIndex}`;
    params.push(filters.contract_type);
  }

  const result = await pool.query(query, params);
  return parseInt(result.rows[0].total);
};

module.exports = {
  getAllPatientContracts,
  getPatientContractById,
  createPatientContract,
  updatePatientContract,
  deletePatientContract,
  countPatientContracts,
  assignContractFromTemplate,
  getContractsByPatientId,
  signContract,
  countContractsByPatientId
};
