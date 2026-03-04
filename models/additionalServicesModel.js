const pool = require('../config/db');

/**
 * MODELO DE SERVICIOS ADICIONALES
 * Maneja planes de ortodoncia, implantes dentales y protesis (rehabilitacion integral)
 *
 * Tablas:
 * - orthodontic_plans: Planes de ortodoncia (estructura fija)
 * - implant_plans: Planes de implantes dentales (estructura fija)
 * - prosthesis_items: Items de protesis (filas dinamicas)
 */

// ============================================================
// PLANES DE ORTODONCIA
// ============================================================

/**
 * Obtiene todos los planes de ortodoncia
 * @returns {Promise<Array>} Lista de planes de ortodoncia
 */
const getAllOrthodonticPlans = async () => {
  try {
    const result = await pool.query(`
      SELECT
        orthodontic_plan_id,
        plan_type,
        plan_modality,
        monto_total,
        inicial,
        pago_mensual,
        status,
        date_time_registration,
        date_time_modification
      FROM orthodontic_plans
      WHERE status = 'active'
      ORDER BY
        CASE plan_type
          WHEN 'brackets_convencionales' THEN 1
          WHEN 'autoligantes' THEN 2
          WHEN 'zafiro' THEN 3
          WHEN 'alineadores' THEN 4
        END,
        CASE plan_modality
          WHEN 'presupuesto_total' THEN 1
          WHEN 'sin_presupuesto' THEN 2
          WHEN 'sin_inicial' THEN 3
        END
    `);
    return result.rows;
  } catch (error) {
    console.error('Error en getAllOrthodonticPlans:', error);
    throw error;
  }
};

/**
 * Actualiza un plan de ortodoncia especifico
 * @param {string} planType - Tipo de plan (brackets_convencionales, autoligantes, etc.)
 * @param {string} planModality - Modalidad (presupuesto_total, sin_presupuesto, sin_inicial)
 * @param {Object} data - Datos a actualizar (monto_total, inicial, pago_mensual)
 * @param {number} userId - ID del usuario que modifica
 * @returns {Promise<Object>} Plan actualizado
 */
const updateOrthodonticPlan = async (planType, planModality, data, userId) => {
  try {
    const { monto_total, inicial, pago_mensual } = data;

    const result = await pool.query(`
      UPDATE orthodontic_plans
      SET
        monto_total = COALESCE($1, monto_total),
        inicial = COALESCE($2, inicial),
        pago_mensual = COALESCE($3, pago_mensual),
        user_id_modification = $4,
        date_time_modification = CURRENT_TIMESTAMP
      WHERE plan_type = $5 AND plan_modality = $6 AND status = 'active'
      RETURNING *
    `, [monto_total, inicial, pago_mensual, userId, planType, planModality]);

    return result.rows[0];
  } catch (error) {
    console.error('Error en updateOrthodonticPlan:', error);
    throw error;
  }
};

/**
 * Actualiza multiples planes de ortodoncia de una vez
 * @param {Array} plans - Array de planes a actualizar
 * @param {number} userId - ID del usuario que modifica
 * @returns {Promise<Array>} Planes actualizados
 */
const updateAllOrthodonticPlans = async (plans, userId) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const updatedPlans = [];
    for (const plan of plans) {
      const result = await client.query(`
        UPDATE orthodontic_plans
        SET
          monto_total = $1,
          inicial = $2,
          pago_mensual = $3,
          user_id_modification = $4,
          date_time_modification = CURRENT_TIMESTAMP
        WHERE plan_type = $5 AND plan_modality = $6 AND status = 'active'
        RETURNING *
      `, [
        plan.monto_total,
        plan.inicial,
        plan.pago_mensual,
        userId,
        plan.plan_type,
        plan.plan_modality
      ]);

      if (result.rows[0]) {
        updatedPlans.push(result.rows[0]);
      }
    }

    await client.query('COMMIT');
    return updatedPlans;
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error en updateAllOrthodonticPlans:', error);
    throw error;
  } finally {
    client.release();
  }
};

// ============================================================
// PLANES DE IMPLANTES DENTALES
// ============================================================

/**
 * Obtiene todos los planes de implantes
 * @returns {Promise<Array>} Lista de planes de implantes
 */
const getAllImplantPlans = async () => {
  try {
    const result = await pool.query(`
      SELECT
        implant_plan_id,
        plan_type,
        monto_total,
        inicial,
        mensual,
        status,
        date_time_registration,
        date_time_modification
      FROM implant_plans
      WHERE status = 'active'
      ORDER BY
        CASE plan_type
          WHEN 'inmediato' THEN 1
          WHEN 'convencional' THEN 2
          WHEN 'hibrido_superior' THEN 3
          WHEN 'hibrido_inferior' THEN 4
        END
    `);
    return result.rows;
  } catch (error) {
    console.error('Error en getAllImplantPlans:', error);
    throw error;
  }
};

/**
 * Actualiza un plan de implantes especifico
 * @param {string} planType - Tipo de plan (inmediato, convencional, etc.)
 * @param {Object} data - Datos a actualizar (monto_total, inicial, mensual)
 * @param {number} userId - ID del usuario que modifica
 * @returns {Promise<Object>} Plan actualizado
 */
const updateImplantPlan = async (planType, data, userId) => {
  try {
    const { monto_total, inicial, mensual } = data;

    const result = await pool.query(`
      UPDATE implant_plans
      SET
        monto_total = COALESCE($1, monto_total),
        inicial = COALESCE($2, inicial),
        mensual = COALESCE($3, mensual),
        user_id_modification = $4,
        date_time_modification = CURRENT_TIMESTAMP
      WHERE plan_type = $5 AND status = 'active'
      RETURNING *
    `, [monto_total, inicial, mensual, userId, planType]);

    return result.rows[0];
  } catch (error) {
    console.error('Error en updateImplantPlan:', error);
    throw error;
  }
};

/**
 * Actualiza multiples planes de implantes de una vez
 * @param {Array} plans - Array de planes a actualizar
 * @param {number} userId - ID del usuario que modifica
 * @returns {Promise<Array>} Planes actualizados
 */
const updateAllImplantPlans = async (plans, userId) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const updatedPlans = [];
    for (const plan of plans) {
      const result = await client.query(`
        UPDATE implant_plans
        SET
          monto_total = $1,
          inicial = $2,
          mensual = $3,
          user_id_modification = $4,
          date_time_modification = CURRENT_TIMESTAMP
        WHERE plan_type = $5 AND status = 'active'
        RETURNING *
      `, [
        plan.monto_total,
        plan.inicial,
        plan.mensual,
        userId,
        plan.plan_type
      ]);

      if (result.rows[0]) {
        updatedPlans.push(result.rows[0]);
      }
    }

    await client.query('COMMIT');
    return updatedPlans;
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error en updateAllImplantPlans:', error);
    throw error;
  } finally {
    client.release();
  }
};

// ============================================================
// ITEMS DE PROTESIS (Rehabilitacion Integral)
// ============================================================

/**
 * Obtiene todos los items de protesis activos
 * @returns {Promise<Array>} Lista de items de protesis
 */
const getAllProsthesisItems = async () => {
  try {
    const result = await pool.query(`
      SELECT
        prosthesis_item_id,
        item_number,
        treatment_projection,
        cost,
        display_order,
        status,
        date_time_registration,
        date_time_modification
      FROM prosthesis_items
      WHERE status = 'active'
      ORDER BY display_order, item_number
    `);
    return result.rows;
  } catch (error) {
    console.error('Error en getAllProsthesisItems:', error);
    throw error;
  }
};

/**
 * Obtiene el total de costos de protesis
 * @returns {Promise<Object>} Total y cantidad de items
 */
const getProsthesisTotal = async () => {
  try {
    const result = await pool.query(`
      SELECT
        COALESCE(SUM(cost), 0) as total_cost,
        COUNT(*) as items_count
      FROM prosthesis_items
      WHERE status = 'active'
    `);
    return result.rows[0];
  } catch (error) {
    console.error('Error en getProsthesisTotal:', error);
    throw error;
  }
};

/**
 * Crea un nuevo item de protesis
 * @param {Object} data - Datos del item (item_number, treatment_projection, cost)
 * @param {number} userId - ID del usuario que crea
 * @returns {Promise<Object>} Item creado
 */
const createProsthesisItem = async (data, userId) => {
  try {
    const { item_number, treatment_projection, cost, display_order } = data;

    // Obtener el maximo display_order si no se proporciona
    let orderValue = display_order;
    if (orderValue === undefined || orderValue === null) {
      const maxOrder = await pool.query(`
        SELECT COALESCE(MAX(display_order), 0) + 1 as next_order
        FROM prosthesis_items
        WHERE status = 'active'
      `);
      orderValue = maxOrder.rows[0].next_order;
    }

    const result = await pool.query(`
      INSERT INTO prosthesis_items (
        item_number,
        treatment_projection,
        cost,
        display_order,
        user_id_registration
      ) VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `, [item_number, treatment_projection, cost, orderValue, userId]);

    return result.rows[0];
  } catch (error) {
    console.error('Error en createProsthesisItem:', error);
    throw error;
  }
};

/**
 * Actualiza un item de protesis existente
 * @param {number} itemId - ID del item
 * @param {Object} data - Datos a actualizar
 * @param {number} userId - ID del usuario que modifica
 * @returns {Promise<Object>} Item actualizado
 */
const updateProsthesisItem = async (itemId, data, userId) => {
  try {
    const { item_number, treatment_projection, cost, display_order } = data;

    const result = await pool.query(`
      UPDATE prosthesis_items
      SET
        item_number = COALESCE($1, item_number),
        treatment_projection = COALESCE($2, treatment_projection),
        cost = COALESCE($3, cost),
        display_order = COALESCE($4, display_order),
        user_id_modification = $5,
        date_time_modification = CURRENT_TIMESTAMP
      WHERE prosthesis_item_id = $6 AND status = 'active'
      RETURNING *
    `, [item_number, treatment_projection, cost, display_order, userId, itemId]);

    return result.rows[0];
  } catch (error) {
    console.error('Error en updateProsthesisItem:', error);
    throw error;
  }
};

/**
 * Elimina (soft delete) un item de protesis
 * @param {number} itemId - ID del item
 * @param {number} userId - ID del usuario que elimina
 * @returns {Promise<Object>} Item eliminado
 */
const deleteProsthesisItem = async (itemId, userId) => {
  try {
    const result = await pool.query(`
      UPDATE prosthesis_items
      SET
        status = 'inactive',
        user_id_modification = $1,
        date_time_modification = CURRENT_TIMESTAMP
      WHERE prosthesis_item_id = $2 AND status = 'active'
      RETURNING *
    `, [userId, itemId]);

    return result.rows[0];
  } catch (error) {
    console.error('Error en deleteProsthesisItem:', error);
    throw error;
  }
};

/**
 * Actualiza todos los items de protesis de una vez (smart upsert)
 * - Actualiza items existentes que coincidan por treatment_projection
 * - Crea items nuevos que no existan
 * - Marca como inactive SOLO los que fueron eliminados (no están en la lista nueva)
 * @param {Array} items - Array de items a insertar/actualizar
 * @param {number} userId - ID del usuario que modifica
 * @returns {Promise<Array>} Items actualizados
 */
const replaceAllProsthesisItems = async (items, userId) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // 1. Obtener todos los items activos actuales
    const existingResult = await client.query(`
      SELECT prosthesis_item_id, treatment_projection
      FROM prosthesis_items
      WHERE status = 'active'
    `);
    const existingItems = existingResult.rows;

    // 2. Crear un mapa de items existentes por treatment_projection (normalizado)
    const existingMap = new Map();
    for (const item of existingItems) {
      const normalizedName = item.treatment_projection.toLowerCase().trim();
      existingMap.set(normalizedName, item.prosthesis_item_id);
    }

    // 3. Procesar cada item de la lista nueva
    const processedItems = [];
    const newItemNames = new Set();

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      const normalizedName = item.treatment_projection.toLowerCase().trim();
      newItemNames.add(normalizedName);

      const existingId = existingMap.get(normalizedName);

      if (existingId) {
        // Item existe - ACTUALIZAR
        const result = await client.query(`
          UPDATE prosthesis_items
          SET
            item_number = $1,
            treatment_projection = $2,
            cost = $3,
            display_order = $4,
            user_id_modification = $5,
            date_time_modification = CURRENT_TIMESTAMP
          WHERE prosthesis_item_id = $6 AND status = 'active'
          RETURNING *
        `, [
          item.item_number || (i + 1),
          item.treatment_projection,
          item.cost,
          item.display_order || (i + 1),
          userId,
          existingId
        ]);

        if (result.rows[0]) {
          processedItems.push(result.rows[0]);
        }
      } else {
        // Item NO existe - CREAR
        const result = await client.query(`
          INSERT INTO prosthesis_items (
            item_number,
            treatment_projection,
            cost,
            display_order,
            user_id_registration
          ) VALUES ($1, $2, $3, $4, $5)
          RETURNING *
        `, [
          item.item_number || (i + 1),
          item.treatment_projection,
          item.cost,
          item.display_order || (i + 1),
          userId
        ]);

        processedItems.push(result.rows[0]);
      }
    }

    // 4. Marcar como inactive SOLO los items que fueron eliminados
    // (los que estaban activos pero NO están en la nueva lista)
    for (const [normalizedName, itemId] of existingMap) {
      if (!newItemNames.has(normalizedName)) {
        await client.query(`
          UPDATE prosthesis_items
          SET
            status = 'inactive',
            user_id_modification = $1,
            date_time_modification = CURRENT_TIMESTAMP
          WHERE prosthesis_item_id = $2
        `, [userId, itemId]);
      }
    }

    await client.query('COMMIT');
    return processedItems;
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error en replaceAllProsthesisItems:', error);
    throw error;
  } finally {
    client.release();
  }
};

// ============================================================
// OBTENER TODOS LOS SERVICIOS ADICIONALES
// ============================================================

/**
 * Obtiene todos los servicios adicionales en una sola llamada
 * @returns {Promise<Object>} Todos los servicios adicionales
 */
const getAllAdditionalServices = async () => {
  try {
    const [orthodonticPlans, implantPlans, prosthesisItems, prosthesisTotal] = await Promise.all([
      getAllOrthodonticPlans(),
      getAllImplantPlans(),
      getAllProsthesisItems(),
      getProsthesisTotal()
    ]);

    return {
      orthodontic_plans: orthodonticPlans,
      implant_plans: implantPlans,
      prosthesis_items: prosthesisItems,
      prosthesis_total: prosthesisTotal
    };
  } catch (error) {
    console.error('Error en getAllAdditionalServices:', error);
    throw error;
  }
};

module.exports = {
  // Ortodoncia
  getAllOrthodonticPlans,
  updateOrthodonticPlan,
  updateAllOrthodonticPlans,

  // Implantes
  getAllImplantPlans,
  updateImplantPlan,
  updateAllImplantPlans,

  // Protesis
  getAllProsthesisItems,
  getProsthesisTotal,
  createProsthesisItem,
  updateProsthesisItem,
  deleteProsthesisItem,
  replaceAllProsthesisItems,

  // Todos los servicios
  getAllAdditionalServices
};
