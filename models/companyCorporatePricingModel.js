/**
 * Company Corporate Pricing Model
 * Modelo para gestionar precios corporativos por empresa
 */

const pool = require('../config/db');

/**
 * Obtener todos los precios corporativos de una empresa
 */
const getCompanyProcedurePrices = async (companyId, filters = {}) => {
  let query = `
    SELECT
      cpp.company_procedure_price_id,
      cpp.company_id,
      cpp.procedure_type,
      cpp.procedure_id,
      cpp.corporate_price,
      cpp.status,
      CASE
        WHEN cpp.procedure_type = 'sub_procedure' THEN sp.sub_procedure_name
        WHEN cpp.procedure_type = 'condition_procedure' THEN ocp.procedure_name
      END as procedure_name,
      CASE
        WHEN cpp.procedure_type = 'sub_procedure' THEN sp.sub_procedure_code
        WHEN cpp.procedure_type = 'condition_procedure' THEN ocp.procedure_code
      END as procedure_code,
      CASE
        WHEN cpp.procedure_type = 'sub_procedure' THEN sp.specialty
        WHEN cpp.procedure_type = 'condition_procedure' THEN ocp.specialty
      END as specialty,
      CASE
        WHEN cpp.procedure_type = 'sub_procedure' THEN sp.price_without_plan
        WHEN cpp.procedure_type = 'condition_procedure' THEN ocp.price_without_plan
      END as regular_price,
      CASE
        WHEN cpp.procedure_type = 'condition_procedure' THEN dc.condition_name
        ELSE NULL
      END as condition_name
    FROM company_procedure_prices cpp
    LEFT JOIN sub_procedures sp
      ON cpp.procedure_type = 'sub_procedure' AND cpp.procedure_id = sp.sub_procedure_id
    LEFT JOIN odontogram_condition_procedures ocp
      ON cpp.procedure_type = 'condition_procedure' AND cpp.procedure_id = ocp.condition_procedure_id
    LEFT JOIN odontogram_dental_conditions dc
      ON ocp.odontogram_condition_id = dc.condition_id
    WHERE cpp.company_id = $1
      AND cpp.status = 'active'
  `;

  const params = [companyId];
  let paramIndex = 2;

  if (filters.procedure_type) {
    query += ` AND cpp.procedure_type = $${paramIndex}`;
    params.push(filters.procedure_type);
    paramIndex++;
  }

  if (filters.search) {
    query += ` AND (
      (cpp.procedure_type = 'sub_procedure' AND (sp.sub_procedure_name ILIKE $${paramIndex} OR sp.sub_procedure_code ILIKE $${paramIndex}))
      OR
      (cpp.procedure_type = 'condition_procedure' AND (ocp.procedure_name ILIKE $${paramIndex} OR ocp.procedure_code ILIKE $${paramIndex}))
    )`;
    params.push(`%${filters.search}%`);
    paramIndex++;
  }

  query += ` ORDER BY cpp.procedure_type, procedure_name`;

  const result = await pool.query(query, params);
  return result.rows;
};

/**
 * Crear o actualizar un precio corporativo (UPSERT)
 */
const upsertCompanyProcedurePrice = async (companyId, procedureType, procedureId, corporatePrice, userId) => {
  const query = `
    INSERT INTO company_procedure_prices (
      company_id, procedure_type, procedure_id, corporate_price,
      user_id_registration, date_time_registration
    ) VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP)
    ON CONFLICT (company_id, procedure_type, procedure_id)
    DO UPDATE SET
      corporate_price = $4,
      status = 'active',
      user_id_modification = $5,
      date_time_modification = CURRENT_TIMESTAMP
    RETURNING *
  `;

  const result = await pool.query(query, [companyId, procedureType, procedureId, corporatePrice, userId]);
  return result.rows[0];
};

/**
 * Eliminar un precio corporativo (soft delete)
 */
const deleteCompanyProcedurePrice = async (priceId, userId) => {
  const query = `
    UPDATE company_procedure_prices SET
      status = 'inactive',
      user_id_modification = $1,
      date_time_modification = CURRENT_TIMESTAMP
    WHERE company_procedure_price_id = $2 AND status = 'active'
    RETURNING company_procedure_price_id
  `;

  const result = await pool.query(query, [userId, priceId]);
  return result.rowCount > 0;
};

/**
 * UPSERT masivo de precios (transaccion para importacion Excel)
 * @param {number} companyId
 * @param {Array<{procedure_type, procedure_id, corporate_price}>} prices
 * @param {number} userId
 */
const bulkUpsertPrices = async (companyId, prices, userId) => {
  const client = await pool.connect();
  let created = 0;
  let updated = 0;
  const errors = [];

  try {
    await client.query('BEGIN');

    for (const price of prices) {
      try {
        const checkQuery = `
          SELECT company_procedure_price_id
          FROM company_procedure_prices
          WHERE company_id = $1 AND procedure_type = $2 AND procedure_id = $3
        `;
        const existing = await client.query(checkQuery, [companyId, price.procedure_type, price.procedure_id]);

        if (existing.rows.length > 0) {
          await client.query(`
            UPDATE company_procedure_prices SET
              corporate_price = $1,
              status = 'active',
              user_id_modification = $2,
              date_time_modification = CURRENT_TIMESTAMP
            WHERE company_id = $3 AND procedure_type = $4 AND procedure_id = $5
          `, [price.corporate_price, userId, companyId, price.procedure_type, price.procedure_id]);
          updated++;
        } else {
          await client.query(`
            INSERT INTO company_procedure_prices (
              company_id, procedure_type, procedure_id, corporate_price,
              user_id_registration, date_time_registration
            ) VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP)
          `, [companyId, price.procedure_type, price.procedure_id, price.corporate_price, userId]);
          created++;
        }
      } catch (err) {
        errors.push({
          procedure_type: price.procedure_type,
          procedure_id: price.procedure_id,
          error: err.message
        });
      }
    }

    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }

  return { created, updated, errors };
};

/**
 * Obtener TODOS los procedimientos con precios corporativos (LEFT JOIN)
 * Para generar la plantilla Excel
 */
const getAllProceduresWithCorporatePrices = async (companyId) => {
  // Sub-procedimientos
  const subQuery = `
    SELECT
      'sub_procedure' as procedure_type,
      sp.sub_procedure_id as procedure_id,
      sp.sub_procedure_code as procedure_code,
      sp.sub_procedure_name as procedure_name,
      sp.specialty,
      sp.price_without_plan as regular_price,
      NULL as condition_name,
      cpp.corporate_price
    FROM sub_procedures sp
    LEFT JOIN company_procedure_prices cpp
      ON cpp.procedure_type = 'sub_procedure'
      AND cpp.procedure_id = sp.sub_procedure_id
      AND cpp.company_id = $1
      AND cpp.status = 'active'
    WHERE sp.status = 'active' AND sp.is_active = true
    ORDER BY sp.sub_procedure_name
  `;

  // Procedimientos de condiciones
  const condQuery = `
    SELECT
      'condition_procedure' as procedure_type,
      ocp.condition_procedure_id as procedure_id,
      ocp.procedure_code,
      ocp.procedure_name,
      ocp.specialty,
      ocp.price_without_plan as regular_price,
      dc.condition_name,
      cpp.corporate_price
    FROM odontogram_condition_procedures ocp
    INNER JOIN odontogram_dental_conditions dc
      ON ocp.odontogram_condition_id = dc.condition_id
    LEFT JOIN company_procedure_prices cpp
      ON cpp.procedure_type = 'condition_procedure'
      AND cpp.procedure_id = ocp.condition_procedure_id
      AND cpp.company_id = $1
      AND cpp.status = 'active'
    WHERE ocp.status = 'active'
    ORDER BY dc.condition_name, ocp.procedure_name
  `;

  const [subResult, condResult] = await Promise.all([
    pool.query(subQuery, [companyId]),
    pool.query(condQuery, [companyId])
  ]);

  return {
    sub_procedures: subResult.rows,
    condition_procedures: condResult.rows
  };
};

/**
 * Contar precios corporativos registrados por empresa
 */
const countCompanyPrices = async (companyId) => {
  const query = `
    SELECT COUNT(*) as total
    FROM company_procedure_prices
    WHERE company_id = $1 AND status = 'active'
  `;
  const result = await pool.query(query, [companyId]);
  return parseInt(result.rows[0].total);
};

/**
 * Obtener precio corporativo especifico
 */
const getCorporatePrice = async (companyId, procedureType, procedureId) => {
  const query = `
    SELECT corporate_price
    FROM company_procedure_prices
    WHERE company_id = $1
      AND procedure_type = $2
      AND procedure_id = $3
      AND status = 'active'
  `;

  const result = await pool.query(query, [companyId, procedureType, procedureId]);

  if (result.rows.length === 0) {
    return null;
  }

  return parseFloat(result.rows[0].corporate_price);
};

// Historial de vigencia

/**
 * Obtener historial de extensiones de vigencia
 */
const getCompanyValidityHistory = async (companyId) => {
  const query = `
    SELECT
      cvh.*,
      u.first_name || ' ' || u.last_name as extended_by_name
    FROM company_validity_history cvh
    INNER JOIN users u ON cvh.extended_by_user_id = u.user_id
    WHERE cvh.company_id = $1
      AND cvh.status = 'active'
    ORDER BY cvh.date_time_registration DESC
  `;

  const result = await pool.query(query, [companyId]);
  return result.rows;
};

/**
 * Registrar extension de vigencia
 */
const createValidityHistoryEntry = async (companyId, previousVigenciaFin, newVigenciaFin, extensionReason, userId) => {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // Insertar en historial
    const historyQuery = `
      INSERT INTO company_validity_history (
        company_id, previous_vigencia_fin, new_vigencia_fin,
        extension_reason, extended_by_user_id,
        user_id_registration, date_time_registration
      ) VALUES ($1, $2, $3, $4, $5, $5, CURRENT_TIMESTAMP)
      RETURNING *
    `;

    await client.query(historyQuery, [companyId, previousVigenciaFin, newVigenciaFin, extensionReason, userId]);

    // Actualizar vigencia en companies
    const updateQuery = `
      UPDATE companies SET
        vigencia_fin = $1,
        user_id_modification = $2,
        date_time_modification = CURRENT_TIMESTAMP
      WHERE company_id = $3
      RETURNING *
    `;

    const updateResult = await client.query(updateQuery, [newVigenciaFin, userId, companyId]);

    await client.query('COMMIT');
    return updateResult.rows[0];
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

module.exports = {
  getCompanyProcedurePrices,
  upsertCompanyProcedurePrice,
  deleteCompanyProcedurePrice,
  bulkUpsertPrices,
  getAllProceduresWithCorporatePrices,
  countCompanyPrices,
  getCorporatePrice,
  getCompanyValidityHistory,
  createValidityHistoryEntry
};
