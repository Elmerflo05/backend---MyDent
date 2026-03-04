const pool = require('../config/db');

/**
 * MODELO DE CONDICIONES DENTALES DEL ODONTOGRAMA
 * Maneja el catálogo maestro de condiciones dentales (patologías, anomalías, tratamientos, etc.)
 * y los procedimientos asociados a cada condición
 */

// ============================================================
// DENTAL CONDITIONS (Condiciones Dentales)
// ============================================================

/**
 * Obtener todas las condiciones dentales
 * @param {Object} filters - Filtros opcionales (category, search, status)
 * @returns {Promise<Array>} Lista de condiciones dentales
 */
const getAllDentalConditions = async (filters = {}) => {
  try {
    let query = `
      SELECT
        condition_id,
        condition_code,
        condition_name,
        category,
        cie10_code,
        abbreviation,
        abbreviations,
        description,
        specifications,
        -- Precio del primer procedimiento (FUENTE ÚNICA DE VERDAD)
        (
          SELECT COALESCE(ocp.price_without_plan, 0)
          FROM odontogram_condition_procedures ocp
          WHERE ocp.odontogram_condition_id = odontogram_dental_conditions.condition_id
          AND ocp.status = 'active'
          ORDER BY ocp.display_order, ocp.condition_procedure_id
          LIMIT 1
        ) as price_base,
        -- Precio para buen estado (del primer procedimiento con applies_to_state = 'good')
        (
          SELECT COALESCE(ocp.price_without_plan, 0)
          FROM odontogram_condition_procedures ocp
          WHERE ocp.odontogram_condition_id = odontogram_dental_conditions.condition_id
          AND ocp.status = 'active'
          AND (ocp.applies_to_state IS NULL OR ocp.applies_to_state = 'good')
          ORDER BY ocp.display_order, ocp.condition_procedure_id
          LIMIT 1
        ) as price_state_good,
        -- Precio para mal estado (del primer procedimiento con applies_to_state = 'bad')
        (
          SELECT COALESCE(ocp.price_without_plan, 0)
          FROM odontogram_condition_procedures ocp
          WHERE ocp.odontogram_condition_id = odontogram_dental_conditions.condition_id
          AND ocp.status = 'active'
          AND (ocp.applies_to_state IS NULL OR ocp.applies_to_state = 'bad')
          ORDER BY ocp.display_order, ocp.condition_procedure_id
          LIMIT 1
        ) as price_state_bad,
        symbol_type,
        color_type,
        fill_surfaces,
        between_teeth,
        color_conditional,
        status,
        user_id_registration,
        date_time_registration,
        user_id_modification,
        date_time_modification
      FROM odontogram_dental_conditions
      WHERE 1=1
    `;

    const conditions = [];
    const values = [];
    let paramCount = 1;

    // Filtro por estado (por defecto solo activos)
    if (filters.status) {
      conditions.push(`status = $${paramCount}`);
      values.push(filters.status);
      paramCount++;
    } else {
      conditions.push(`status = $${paramCount}`);
      values.push('active');
      paramCount++;
    }

    // Filtro por categoría
    if (filters.category) {
      conditions.push(`category = $${paramCount}`);
      values.push(filters.category);
      paramCount++;
    }

    // Búsqueda por nombre, código o CIE-10
    if (filters.search) {
      conditions.push(`(
        condition_name ILIKE $${paramCount} OR
        condition_code ILIKE $${paramCount} OR
        cie10_code ILIKE $${paramCount} OR
        description ILIKE $${paramCount}
      )`);
      values.push(`%${filters.search}%`);
      paramCount++;
    }

    if (conditions.length > 0) {
      query += ' AND ' + conditions.join(' AND ');
    }

    query += ' ORDER BY category, condition_name';

    const result = await pool.query(query, values);
    return result.rows;
  } catch (error) {
    throw error;
  }
};

/**
 * Obtener condiciones dentales agrupadas por categoría
 * @returns {Promise<Array>} Condiciones agrupadas por categoría
 */
const getDentalConditionsByCategory = async () => {
  try {
    const result = await pool.query(`
      SELECT
        odc.category,
        json_agg(
          json_build_object(
            'condition_id', odc.condition_id,
            'condition_code', odc.condition_code,
            'condition_name', odc.condition_name,
            'cie10_code', odc.cie10_code,
            'abbreviation', odc.abbreviation,
            'abbreviations', odc.abbreviations,
            'description', odc.description,
            'specifications', odc.specifications,
            'price_base', (
              SELECT COALESCE(ocp.price_without_plan, 0)
              FROM odontogram_condition_procedures ocp
              WHERE ocp.odontogram_condition_id = odc.condition_id
              AND ocp.status = 'active'
              ORDER BY ocp.display_order, ocp.condition_procedure_id
              LIMIT 1
            ),
            'price_state_good', (
              SELECT COALESCE(ocp.price_without_plan, 0)
              FROM odontogram_condition_procedures ocp
              WHERE ocp.odontogram_condition_id = odc.condition_id
              AND ocp.status = 'active'
              AND (ocp.applies_to_state IS NULL OR ocp.applies_to_state = 'good')
              ORDER BY ocp.display_order, ocp.condition_procedure_id
              LIMIT 1
            ),
            'price_state_bad', (
              SELECT COALESCE(ocp.price_without_plan, 0)
              FROM odontogram_condition_procedures ocp
              WHERE ocp.odontogram_condition_id = odc.condition_id
              AND ocp.status = 'active'
              AND (ocp.applies_to_state IS NULL OR ocp.applies_to_state = 'bad')
              ORDER BY ocp.display_order, ocp.condition_procedure_id
              LIMIT 1
            ),
            'symbol_type', odc.symbol_type,
            'color_type', odc.color_type,
            'fill_surfaces', odc.fill_surfaces,
            'between_teeth', odc.between_teeth,
            'color_conditional', odc.color_conditional
          ) ORDER BY odc.condition_name
        ) as conditions
      FROM odontogram_dental_conditions odc
      WHERE odc.status = 'active'
      GROUP BY odc.category
      ORDER BY
        CASE odc.category
          WHEN 'patologia' THEN 1
          WHEN 'anomalia' THEN 2
          WHEN 'tratamiento' THEN 3
          WHEN 'protesis' THEN 4
          WHEN 'ortodoncia' THEN 5
          ELSE 6
        END
    `);
    return result.rows;
  } catch (error) {
    throw error;
  }
};

/**
 * Obtener una condición dental por código
 * @param {string} conditionCode - Código de la condición
 * @returns {Promise<Object>} Condición dental
 */
const getDentalConditionByCode = async (conditionCode) => {
  try {
    const result = await pool.query(`
      SELECT
        condition_id,
        condition_code,
        condition_name,
        category,
        cie10_code,
        abbreviation,
        abbreviations,
        description,
        specifications,
        -- Precio del primer procedimiento (FUENTE ÚNICA DE VERDAD)
        (
          SELECT COALESCE(ocp.price_without_plan, 0)
          FROM odontogram_condition_procedures ocp
          WHERE ocp.odontogram_condition_id = odontogram_dental_conditions.condition_id
          AND ocp.status = 'active'
          ORDER BY ocp.display_order, ocp.condition_procedure_id
          LIMIT 1
        ) as price_base,
        (
          SELECT COALESCE(ocp.price_without_plan, 0)
          FROM odontogram_condition_procedures ocp
          WHERE ocp.odontogram_condition_id = odontogram_dental_conditions.condition_id
          AND ocp.status = 'active'
          AND (ocp.applies_to_state IS NULL OR ocp.applies_to_state = 'good')
          ORDER BY ocp.display_order, ocp.condition_procedure_id
          LIMIT 1
        ) as price_state_good,
        (
          SELECT COALESCE(ocp.price_without_plan, 0)
          FROM odontogram_condition_procedures ocp
          WHERE ocp.odontogram_condition_id = odontogram_dental_conditions.condition_id
          AND ocp.status = 'active'
          AND (ocp.applies_to_state IS NULL OR ocp.applies_to_state = 'bad')
          ORDER BY ocp.display_order, ocp.condition_procedure_id
          LIMIT 1
        ) as price_state_bad,
        symbol_type,
        color_type,
        fill_surfaces,
        between_teeth,
        color_conditional,
        status
      FROM odontogram_dental_conditions
      WHERE condition_code = $1 AND status = 'active'
    `, [conditionCode]);

    return result.rows[0];
  } catch (error) {
    throw error;
  }
};

/**
 * Obtener una condición dental por ID
 * @param {number} conditionId - ID de la condición
 * @returns {Promise<Object>} Condición dental
 */
const getDentalConditionById = async (conditionId) => {
  try {
    const result = await pool.query(`
      SELECT
        condition_id,
        condition_code,
        condition_name,
        category,
        cie10_code,
        abbreviation,
        abbreviations,
        description,
        specifications,
        -- Precio del primer procedimiento (FUENTE ÚNICA DE VERDAD)
        (
          SELECT COALESCE(ocp.price_without_plan, 0)
          FROM odontogram_condition_procedures ocp
          WHERE ocp.odontogram_condition_id = odontogram_dental_conditions.condition_id
          AND ocp.status = 'active'
          ORDER BY ocp.display_order, ocp.condition_procedure_id
          LIMIT 1
        ) as price_base,
        (
          SELECT COALESCE(ocp.price_without_plan, 0)
          FROM odontogram_condition_procedures ocp
          WHERE ocp.odontogram_condition_id = odontogram_dental_conditions.condition_id
          AND ocp.status = 'active'
          AND (ocp.applies_to_state IS NULL OR ocp.applies_to_state = 'good')
          ORDER BY ocp.display_order, ocp.condition_procedure_id
          LIMIT 1
        ) as price_state_good,
        (
          SELECT COALESCE(ocp.price_without_plan, 0)
          FROM odontogram_condition_procedures ocp
          WHERE ocp.odontogram_condition_id = odontogram_dental_conditions.condition_id
          AND ocp.status = 'active'
          AND (ocp.applies_to_state IS NULL OR ocp.applies_to_state = 'bad')
          ORDER BY ocp.display_order, ocp.condition_procedure_id
          LIMIT 1
        ) as price_state_bad,
        symbol_type,
        color_type,
        fill_surfaces,
        between_teeth,
        color_conditional,
        status
      FROM odontogram_dental_conditions
      WHERE condition_id = $1
    `, [conditionId]);

    return result.rows[0];
  } catch (error) {
    throw error;
  }
};

/**
 * Actualizar precio base de una condición
 * @param {number} conditionId - ID de la condición
 * @param {number} price - Nuevo precio base
 * @param {number} userId - ID del usuario que realiza la modificación
 * @returns {Promise<Object>} Primer procedimiento actualizado
 *
 * NOTA: Los precios ahora se almacenan en odontogram_condition_procedures.
 * Esta función actualiza el price_without_plan del PRIMER procedimiento de la condición.
 */
const updateConditionPrice = async (conditionId, price, userId) => {
  try {
    // Actualizar el precio del primer procedimiento de esta condición
    const result = await pool.query(`
      UPDATE odontogram_condition_procedures
      SET
        price_without_plan = $1,
        user_id_modification = $2,
        date_time_modification = NOW()
      WHERE condition_procedure_id = (
        SELECT condition_procedure_id
        FROM odontogram_condition_procedures
        WHERE odontogram_condition_id = $3 AND status = 'active'
        ORDER BY display_order, condition_procedure_id
        LIMIT 1
      )
      RETURNING *
    `, [price, userId, conditionId]);

    return result.rows[0];
  } catch (error) {
    throw error;
  }
};

/**
 * Actualizar precios de una condición (por estado)
 * @param {number} conditionId - ID de la condición
 * @param {Object} prices - Objeto con precios: {base, state_good, state_bad}
 * @param {number} userId - ID del usuario que realiza la modificación
 * @returns {Promise<Object>} Resultado de la actualización
 *
 * NOTA: Los precios ahora se almacenan en odontogram_condition_procedures.
 * - base: Actualiza el primer procedimiento general
 * - state_good: Actualiza procedimientos con applies_to_state = 'good' o NULL
 * - state_bad: Actualiza procedimientos con applies_to_state = 'bad' o NULL
 */
const updateConditionPrices = async (conditionId, prices, userId) => {
  try {
    const results = { updated: [] };

    // Actualizar precio base (primer procedimiento)
    if (prices.base !== undefined) {
      const baseResult = await pool.query(`
        UPDATE odontogram_condition_procedures
        SET price_without_plan = $1, user_id_modification = $2, date_time_modification = NOW()
        WHERE condition_procedure_id = (
          SELECT condition_procedure_id
          FROM odontogram_condition_procedures
          WHERE odontogram_condition_id = $3 AND status = 'active'
          ORDER BY display_order, condition_procedure_id
          LIMIT 1
        )
        RETURNING *
      `, [prices.base, userId, conditionId]);
      if (baseResult.rows[0]) results.updated.push(baseResult.rows[0]);
    }

    // Actualizar precio para buen estado
    if (prices.state_good !== undefined) {
      const goodResult = await pool.query(`
        UPDATE odontogram_condition_procedures
        SET price_without_plan = $1, user_id_modification = $2, date_time_modification = NOW()
        WHERE odontogram_condition_id = $3 AND status = 'active'
        AND (applies_to_state IS NULL OR applies_to_state = 'good')
      `, [prices.state_good, userId, conditionId]);
      results.goodUpdated = goodResult.rowCount;
    }

    // Actualizar precio para mal estado
    if (prices.state_bad !== undefined) {
      const badResult = await pool.query(`
        UPDATE odontogram_condition_procedures
        SET price_without_plan = $1, user_id_modification = $2, date_time_modification = NOW()
        WHERE odontogram_condition_id = $3 AND status = 'active'
        AND (applies_to_state IS NULL OR applies_to_state = 'bad')
      `, [prices.state_bad, userId, conditionId]);
      results.badUpdated = badResult.rowCount;
    }

    return results;
  } catch (error) {
    console.error('Error en updateConditionPrices:', error.message);
    throw error;
  }
};

// ============================================================
// CONDITION PROCEDURES (Procedimientos por Condición)
// ============================================================

/**
 * Obtener todos los procedimientos de una condición dental
 * @param {number} conditionId - ID de la condición dental
 * @returns {Promise<Array>} Lista de procedimientos con precios por plan de salud
 */
const getConditionProcedures = async (conditionId) => {
  try {
    const result = await pool.query(`
      SELECT
        condition_procedure_id,
        odontogram_condition_id,
        procedure_name,
        procedure_code,
        specialty,
        price_without_plan,
        price_plan_personal,
        price_plan_familiar,
        price_plan_platinium,
        price_plan_oro,
        applies_to_state,
        observations,
        display_order,
        status,
        user_id_registration,
        date_time_registration,
        user_id_modification,
        date_time_modification
      FROM odontogram_condition_procedures
      WHERE odontogram_condition_id = $1 AND status = 'active'
      ORDER BY display_order, procedure_name
    `, [conditionId]);

    return result.rows;
  } catch (error) {
    throw error;
  }
};

/**
 * Crear un nuevo procedimiento para una condición
 * @param {Object} procedureData - Datos del procedimiento
 * @param {number} userId - ID del usuario que crea el procedimiento
 * @returns {Promise<Object>} Procedimiento creado
 */
const createConditionProcedure = async (procedureData, userId) => {
  const client = await pool.connect();

  try {
    const {
      odontogram_condition_id,
      procedure_name,
      procedure_code,
      specialty,
      price_without_plan,
      price_plan_personal,
      price_plan_familiar,
      price_plan_platinium,
      price_plan_oro,
      applies_to_state,
      observations,
      display_order
    } = procedureData;

    await client.query('BEGIN');

    // Insertar el procedimiento con los precios por plan de salud
    const result = await client.query(`
      INSERT INTO odontogram_condition_procedures (
        odontogram_condition_id,
        procedure_name,
        procedure_code,
        specialty,
        price_without_plan,
        price_plan_personal,
        price_plan_familiar,
        price_plan_platinium,
        price_plan_oro,
        applies_to_state,
        observations,
        display_order,
        status,
        user_id_registration,
        date_time_registration
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, 'active', $13, NOW())
      RETURNING *
    `, [
      odontogram_condition_id,
      procedure_name,
      procedure_code || null,
      specialty || null,
      price_without_plan || 0,
      price_plan_personal,
      price_plan_familiar,
      price_plan_platinium,
      price_plan_oro,
      applies_to_state || null,
      observations || null,
      display_order || 0,
      userId
    ]);

    await client.query('COMMIT');
    return result.rows[0];
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

/**
 * Actualizar un procedimiento de una condición
 * @param {number} procedureId - ID del procedimiento
 * @param {Object} procedureData - Datos a actualizar
 * @param {number} userId - ID del usuario que modifica
 * @returns {Promise<Object>} Procedimiento actualizado
 */
const updateConditionProcedure = async (procedureId, procedureData, userId) => {
  try {
    const {
      procedure_name,
      procedure_code,
      specialty,
      price_without_plan,
      price_plan_personal,
      price_plan_familiar,
      price_plan_platinium,
      price_plan_oro,
      applies_to_state,
      observations,
      display_order
    } = procedureData;

    const result = await pool.query(`
      UPDATE odontogram_condition_procedures
      SET
        procedure_name = COALESCE($1, procedure_name),
        procedure_code = COALESCE($2, procedure_code),
        specialty = COALESCE($3, specialty),
        price_without_plan = COALESCE($4, price_without_plan),
        price_plan_personal = COALESCE($5, price_plan_personal),
        price_plan_familiar = COALESCE($6, price_plan_familiar),
        price_plan_platinium = COALESCE($7, price_plan_platinium),
        price_plan_oro = COALESCE($8, price_plan_oro),
        applies_to_state = COALESCE($9, applies_to_state),
        observations = COALESCE($10, observations),
        display_order = COALESCE($11, display_order),
        user_id_modification = $12,
        date_time_modification = NOW()
      WHERE condition_procedure_id = $13
      RETURNING *
    `, [
      procedure_name,
      procedure_code,
      specialty,
      price_without_plan,
      price_plan_personal,
      price_plan_familiar,
      price_plan_platinium,
      price_plan_oro,
      applies_to_state,
      observations,
      display_order,
      userId,
      procedureId
    ]);

    return result.rows[0];
  } catch (error) {
    throw error;
  }
};

/**
 * Eliminar (desactivar) un procedimiento de una condición
 * @param {number} procedureId - ID del procedimiento
 * @param {number} userId - ID del usuario que elimina
 * @returns {Promise<Object>} Procedimiento eliminado
 */
const deleteConditionProcedure = async (procedureId, userId) => {
  try {
    const result = await pool.query(`
      UPDATE odontogram_condition_procedures
      SET
        status = 'inactive',
        user_id_modification = $1,
        date_time_modification = NOW()
      WHERE condition_procedure_id = $2
      RETURNING *
    `, [userId, procedureId]);

    return result.rows[0];
  } catch (error) {
    throw error;
  }
};

// ============================================================
// ESTADÍSTICAS Y UTILIDADES
// ============================================================

/**
 * Obtener estadísticas de condiciones dentales
 * @returns {Promise<Object>} Estadísticas
 */
const getDentalConditionsStatistics = async () => {
  try {
    // Precio se obtiene de odontogram_condition_procedures.price_without_plan (FUENTE ÚNICA)
    const result = await pool.query(`
      SELECT
        odc.category,
        COUNT(*) as total,
        COUNT(odc.cie10_code) as with_cie10,
        COUNT(
          (SELECT ocp.price_without_plan
           FROM odontogram_condition_procedures ocp
           WHERE ocp.dental_condition_id = odc.dental_condition_id
           AND ocp.status = 'active'
           LIMIT 1)
        ) as with_price,
        AVG(
          (SELECT ocp.price_without_plan
           FROM odontogram_condition_procedures ocp
           WHERE ocp.dental_condition_id = odc.dental_condition_id
           AND ocp.status = 'active'
           ORDER BY ocp.display_order, ocp.condition_procedure_id
           LIMIT 1)
        ) as avg_price
      FROM odontogram_dental_conditions odc
      WHERE odc.status = 'active'
      GROUP BY odc.category
      ORDER BY odc.category
    `);

    return result.rows;
  } catch (error) {
    throw error;
  }
};

module.exports = {
  // Dental Conditions
  getAllDentalConditions,
  getDentalConditionsByCategory,
  getDentalConditionByCode,
  getDentalConditionById,
  updateConditionPrice,
  updateConditionPrices,

  // Condition Procedures
  getConditionProcedures,
  createConditionProcedure,
  updateConditionProcedure,
  deleteConditionProcedure,

  // Statistics
  getDentalConditionsStatistics
};
