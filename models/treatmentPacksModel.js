/**
 * Treatment Packs Model
 * Maneja operaciones CRUD para packs de tratamientos
 * Integra condiciones del odontograma + items personalizados
 */

const pool = require('../config/db');

// =============================================================================
// OPERACIONES CRUD PRINCIPALES - TREATMENT PACKS
// =============================================================================

/**
 * Obtiene todos los packs de tratamientos con filtros opcionales
 */
const getAllTreatmentPacks = async (filters = {}) => {
  let query = `
    SELECT
      t.treatment_id,
      t.treatment_code,
      t.treatment_name,
      t.treatment_category,
      t.description,
      t.base_price,
      t.total_price,
      t.pack_type,
      t.is_pack,
      t.estimated_duration,
      t.is_active,
      t.status,
      t.date_time_registration as created_at,
      t.date_time_modification as updated_at,
      (SELECT COUNT(*) FROM treatment_condition_items tci
       WHERE tci.treatment_id = t.treatment_id AND tci.status = 'active') as condition_items_count,
      (SELECT COUNT(*) FROM treatment_custom_items tcu
       WHERE tcu.treatment_id = t.treatment_id AND tcu.status = 'active') as custom_items_count,
      (SELECT COUNT(*) FROM treatment_sub_procedure_items tspi
       WHERE tspi.treatment_id = t.treatment_id AND tspi.status = 'active') as sub_procedure_items_count
    FROM treatments t
    WHERE t.status = 'active'
  `;

  const params = [];
  let paramIndex = 1;

  // Filtrar solo packs
  if (filters.only_packs) {
    query += ` AND t.is_pack = true`;
  }

  // Filtrar por categoria
  if (filters.category) {
    query += ` AND t.treatment_category = $${paramIndex}`;
    params.push(filters.category);
    paramIndex++;
  }

  // Filtrar por estado activo/inactivo
  if (filters.is_active !== undefined) {
    query += ` AND t.is_active = $${paramIndex}`;
    params.push(filters.is_active);
    paramIndex++;
  }

  // Filtrar por tipo de pack
  if (filters.pack_type) {
    query += ` AND t.pack_type = $${paramIndex}`;
    params.push(filters.pack_type);
    paramIndex++;
  }

  // Busqueda por nombre
  if (filters.search) {
    query += ` AND (t.treatment_name ILIKE $${paramIndex} OR t.treatment_code ILIKE $${paramIndex})`;
    params.push(`%${filters.search}%`);
    paramIndex++;
  }

  // Ordenamiento
  const orderColumn = filters.order_by || 'treatment_name';
  const orderDir = filters.order_dir === 'DESC' ? 'DESC' : 'ASC';
  query += ` ORDER BY t.${orderColumn} ${orderDir}`;

  // Paginacion
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

/**
 * Obtiene un pack de tratamiento por ID con todos sus items
 */
const getTreatmentPackById = async (treatmentId) => {
  // Obtener datos del pack
  const packQuery = `
    SELECT
      t.treatment_id,
      t.treatment_code,
      t.treatment_name,
      t.treatment_category,
      t.description,
      t.base_price,
      t.total_price,
      t.pack_type,
      t.is_pack,
      t.estimated_duration,
      t.is_active,
      t.status,
      t.user_id_registration,
      t.date_time_registration as created_at,
      t.user_id_modification,
      t.date_time_modification as updated_at
    FROM treatments t
    WHERE t.treatment_id = $1 AND t.status = 'active'
  `;

  const packResult = await pool.query(packQuery, [treatmentId]);

  if (packResult.rows.length === 0) {
    return null;
  }

  const pack = packResult.rows[0];

  // Obtener items de condiciones
  const conditionItemsQuery = `
    SELECT
      tci.item_id,
      tci.treatment_id,
      tci.odontogram_condition_id,
      tci.condition_procedure_id,
      tci.quantity,
      tci.unit_price,
      tci.discount_percentage,
      tci.discount_amount,
      tci.subtotal,
      tci.notes,
      tci.display_order,
      odc.condition_code,
      odc.condition_name,
      odc.category as condition_category,
      odc.default_price as condition_default_price,
      ocp.procedure_name,
      ocp.price_without_plan as procedure_price_base
    FROM treatment_condition_items tci
    INNER JOIN odontogram_dental_conditions odc ON tci.odontogram_condition_id = odc.condition_id
    LEFT JOIN odontogram_condition_procedures ocp ON tci.condition_procedure_id = ocp.condition_procedure_id
    WHERE tci.treatment_id = $1 AND tci.status = 'active'
    ORDER BY tci.display_order ASC
  `;

  const conditionItemsResult = await pool.query(conditionItemsQuery, [treatmentId]);

  // Obtener items personalizados
  const customItemsQuery = `
    SELECT
      tcu.custom_item_id,
      tcu.treatment_id,
      tcu.item_name,
      tcu.item_description,
      tcu.item_category,
      tcu.quantity,
      tcu.unit_price,
      tcu.discount_percentage,
      tcu.discount_amount,
      tcu.subtotal,
      tcu.notes,
      tcu.display_order
    FROM treatment_custom_items tcu
    WHERE tcu.treatment_id = $1 AND tcu.status = 'active'
    ORDER BY tcu.display_order ASC
  `;

  const customItemsResult = await pool.query(customItemsQuery, [treatmentId]);

  // Obtener items de sub-procedimientos
  const subProcedureItemsQuery = `
    SELECT
      tspi.item_id,
      tspi.treatment_id,
      tspi.sub_procedure_id,
      tspi.quantity,
      tspi.unit_price,
      tspi.discount_percentage,
      tspi.discount_amount,
      tspi.subtotal,
      tspi.notes,
      tspi.display_order,
      sp.sub_procedure_code,
      sp.sub_procedure_name,
      sp.specialty,
      sp.price_without_plan,
      sp.price_plan_personal,
      sp.price_plan_familiar
    FROM treatment_sub_procedure_items tspi
    INNER JOIN sub_procedures sp ON tspi.sub_procedure_id = sp.sub_procedure_id
    WHERE tspi.treatment_id = $1 AND tspi.status = 'active'
    ORDER BY tspi.display_order ASC
  `;

  const subProcedureItemsResult = await pool.query(subProcedureItemsQuery, [treatmentId]);

  return {
    ...pack,
    condition_items: conditionItemsResult.rows,
    custom_items: customItemsResult.rows,
    sub_procedure_items: subProcedureItemsResult.rows
  };
};

/**
 * Crea un nuevo pack de tratamiento
 */
const createTreatmentPack = async (packData) => {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const {
      treatment_code,
      treatment_name,
      treatment_category,
      description,
      base_price,
      estimated_duration,
      is_active,
      pack_type,
      condition_items,
      custom_items,
      sub_procedure_items,
      user_id_registration
    } = packData;

    // Generar codigo automatico si no se proporciona
    const finalCode = treatment_code || `PACK-${Date.now().toString(36).toUpperCase()}`;

    // Insertar el pack principal
    const insertPackQuery = `
      INSERT INTO treatments (
        treatment_code, treatment_name, treatment_category, description,
        base_price, estimated_duration, is_active, pack_type, is_pack,
        total_price, user_id_registration
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, true, 0, $9)
      RETURNING *
    `;

    const packResult = await client.query(insertPackQuery, [
      finalCode,
      treatment_name,
      treatment_category || 'General',
      description || null,
      base_price || 0,
      estimated_duration || null,
      is_active !== false,
      pack_type || 'pack',
      user_id_registration
    ]);

    const newPack = packResult.rows[0];
    const treatmentId = newPack.treatment_id;

    // Insertar items de condiciones
    if (condition_items && condition_items.length > 0) {
      for (let i = 0; i < condition_items.length; i++) {
        const item = condition_items[i];
        const subtotal = (item.quantity || 1) * item.unit_price - (item.discount_amount || 0);

        await client.query(`
          INSERT INTO treatment_condition_items (
            treatment_id, odontogram_condition_id, condition_procedure_id,
            quantity, unit_price, discount_percentage, discount_amount,
            subtotal, notes, display_order, user_id_registration
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        `, [
          treatmentId,
          item.odontogram_condition_id,
          item.condition_procedure_id || null,
          item.quantity || 1,
          item.unit_price,
          item.discount_percentage || 0,
          item.discount_amount || 0,
          subtotal,
          item.notes || null,
          i,
          user_id_registration
        ]);
      }
    }

    // Insertar items personalizados
    if (custom_items && custom_items.length > 0) {
      for (let i = 0; i < custom_items.length; i++) {
        const item = custom_items[i];
        const subtotal = (item.quantity || 1) * item.unit_price - (item.discount_amount || 0);

        await client.query(`
          INSERT INTO treatment_custom_items (
            treatment_id, item_name, item_description, item_category,
            quantity, unit_price, discount_percentage, discount_amount,
            subtotal, notes, display_order, user_id_registration
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
        `, [
          treatmentId,
          item.item_name,
          item.item_description || null,
          item.item_category || null,
          item.quantity || 1,
          item.unit_price,
          item.discount_percentage || 0,
          item.discount_amount || 0,
          subtotal,
          item.notes || null,
          i,
          user_id_registration
        ]);
      }
    }

    // Insertar items de sub-procedimientos
    if (sub_procedure_items && sub_procedure_items.length > 0) {
      for (let i = 0; i < sub_procedure_items.length; i++) {
        const item = sub_procedure_items[i];
        const subtotal = (item.quantity || 1) * item.unit_price - (item.discount_amount || 0);

        await client.query(`
          INSERT INTO treatment_sub_procedure_items (
            treatment_id, sub_procedure_id,
            quantity, unit_price, discount_percentage, discount_amount,
            subtotal, notes, display_order, user_id_registration
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        `, [
          treatmentId,
          item.sub_procedure_id,
          item.quantity || 1,
          item.unit_price,
          item.discount_percentage || 0,
          item.discount_amount || 0,
          subtotal,
          item.notes || null,
          i,
          user_id_registration
        ]);
      }
    }

    // Recalcular y actualizar el total_price del tratamiento
    const totalQuery = `
      SELECT COALESCE(SUM(subtotal), 0) as total
      FROM (
        SELECT subtotal FROM treatment_condition_items
        WHERE treatment_id = $1 AND status = 'active'
        UNION ALL
        SELECT subtotal FROM treatment_custom_items
        WHERE treatment_id = $1 AND status = 'active'
        UNION ALL
        SELECT subtotal FROM treatment_sub_procedure_items
        WHERE treatment_id = $1 AND status = 'active'
      ) combined
    `;
    const totalResult = await client.query(totalQuery, [treatmentId]);
    const newTotal = totalResult.rows[0]?.total || 0;

    await client.query(`
      UPDATE treatments SET total_price = $1
      WHERE treatment_id = $2
    `, [newTotal, treatmentId]);

    await client.query('COMMIT');

    // Retornar el pack completo con sus items
    return await getTreatmentPackById(treatmentId);

  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

/**
 * Actualiza un pack de tratamiento existente
 */
const updateTreatmentPack = async (treatmentId, packData) => {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const {
      treatment_code,
      treatment_name,
      treatment_category,
      description,
      base_price,
      estimated_duration,
      is_active,
      pack_type,
      condition_items,
      custom_items,
      sub_procedure_items,
      user_id_modification
    } = packData;

    // Actualizar datos del pack
    const updateFields = [];
    const updateValues = [];
    let paramIndex = 1;

    if (treatment_code !== undefined) {
      updateFields.push(`treatment_code = $${paramIndex}`);
      updateValues.push(treatment_code);
      paramIndex++;
    }

    if (treatment_name !== undefined) {
      updateFields.push(`treatment_name = $${paramIndex}`);
      updateValues.push(treatment_name);
      paramIndex++;
    }

    if (treatment_category !== undefined) {
      updateFields.push(`treatment_category = $${paramIndex}`);
      updateValues.push(treatment_category);
      paramIndex++;
    }

    if (description !== undefined) {
      updateFields.push(`description = $${paramIndex}`);
      updateValues.push(description);
      paramIndex++;
    }

    if (base_price !== undefined) {
      updateFields.push(`base_price = $${paramIndex}`);
      updateValues.push(base_price);
      paramIndex++;
    }

    if (estimated_duration !== undefined) {
      updateFields.push(`estimated_duration = $${paramIndex}`);
      updateValues.push(estimated_duration);
      paramIndex++;
    }

    if (is_active !== undefined) {
      updateFields.push(`is_active = $${paramIndex}`);
      updateValues.push(is_active);
      paramIndex++;
    }

    if (pack_type !== undefined) {
      updateFields.push(`pack_type = $${paramIndex}`);
      updateValues.push(pack_type);
      paramIndex++;
    }

    updateFields.push(`user_id_modification = $${paramIndex}`);
    updateValues.push(user_id_modification);
    paramIndex++;

    updateFields.push(`date_time_modification = CURRENT_TIMESTAMP`);

    updateValues.push(treatmentId);

    const updateQuery = `
      UPDATE treatments SET ${updateFields.join(', ')}
      WHERE treatment_id = $${paramIndex} AND status = 'active'
      RETURNING *
    `;

    const updateResult = await client.query(updateQuery, updateValues);

    if (updateResult.rows.length === 0) {
      throw new Error('Pack no encontrado');
    }

    // Si se proporcionan items de condiciones, usar lógica upsert inteligente
    if (condition_items !== undefined) {
      // Obtener IDs de items que vienen en el request (el PK es item_id)
      const incomingConditionIds = condition_items
        .filter(item => item.item_id)
        .map(item => item.item_id);

      // Marcar como inactivos los items que NO están en el request
      if (incomingConditionIds.length > 0) {
        await client.query(`
          UPDATE treatment_condition_items
          SET status = 'inactive', user_id_modification = $1, date_time_modification = CURRENT_TIMESTAMP
          WHERE treatment_id = $2 AND status = 'active' AND item_id NOT IN (${incomingConditionIds.join(',')})
        `, [user_id_modification, treatmentId]);
      } else {
        await client.query(`
          UPDATE treatment_condition_items
          SET status = 'inactive', user_id_modification = $1, date_time_modification = CURRENT_TIMESTAMP
          WHERE treatment_id = $2 AND status = 'active'
        `, [user_id_modification, treatmentId]);
      }

      // Procesar cada item: UPDATE si existe, INSERT si es nuevo
      for (let i = 0; i < condition_items.length; i++) {
        const item = condition_items[i];
        const subtotal = (item.quantity || 1) * item.unit_price - (item.discount_amount || 0);

        if (item.item_id) {
          // UPDATE - item existente
          await client.query(`
            UPDATE treatment_condition_items SET
              odontogram_condition_id = $1,
              condition_procedure_id = $2,
              quantity = $3,
              unit_price = $4,
              discount_percentage = $5,
              discount_amount = $6,
              subtotal = $7,
              notes = $8,
              display_order = $9,
              user_id_modification = $10,
              date_time_modification = CURRENT_TIMESTAMP
            WHERE item_id = $11 AND treatment_id = $12
          `, [
            item.odontogram_condition_id,
            item.condition_procedure_id || null,
            item.quantity || 1,
            item.unit_price,
            item.discount_percentage || 0,
            item.discount_amount || 0,
            subtotal,
            item.notes || null,
            i,
            user_id_modification,
            item.item_id,
            treatmentId
          ]);
        } else {
          // INSERT - item nuevo
          await client.query(`
            INSERT INTO treatment_condition_items (
              treatment_id, odontogram_condition_id, condition_procedure_id,
              quantity, unit_price, discount_percentage, discount_amount,
              subtotal, notes, display_order, user_id_registration
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
          `, [
            treatmentId,
            item.odontogram_condition_id,
            item.condition_procedure_id || null,
            item.quantity || 1,
            item.unit_price,
            item.discount_percentage || 0,
            item.discount_amount || 0,
            subtotal,
            item.notes || null,
            i,
            user_id_modification
          ]);
        }
      }
    }

    // Si se proporcionan items personalizados, usar lógica upsert inteligente
    if (custom_items !== undefined) {
      // Obtener IDs de items que vienen en el request (los que tienen custom_item_id)
      const incomingIds = custom_items
        .filter(item => item.custom_item_id)
        .map(item => item.custom_item_id);

      // Marcar como inactivos los items que NO están en el request (fueron eliminados)
      if (incomingIds.length > 0) {
        await client.query(`
          UPDATE treatment_custom_items
          SET status = 'inactive', user_id_modification = $1, date_time_modification = CURRENT_TIMESTAMP
          WHERE treatment_id = $2 AND status = 'active' AND custom_item_id NOT IN (${incomingIds.join(',')})
        `, [user_id_modification, treatmentId]);
      } else {
        // Si no hay IDs entrantes, marcar todos como inactivos
        await client.query(`
          UPDATE treatment_custom_items
          SET status = 'inactive', user_id_modification = $1, date_time_modification = CURRENT_TIMESTAMP
          WHERE treatment_id = $2 AND status = 'active'
        `, [user_id_modification, treatmentId]);
      }

      // Procesar cada item: UPDATE si existe, INSERT si es nuevo
      for (let i = 0; i < custom_items.length; i++) {
        const item = custom_items[i];
        const subtotal = (item.quantity || 1) * item.unit_price - (item.discount_amount || 0);

        if (item.custom_item_id) {
          // UPDATE - item existente
          await client.query(`
            UPDATE treatment_custom_items SET
              item_name = $1,
              item_description = $2,
              item_category = $3,
              quantity = $4,
              unit_price = $5,
              discount_percentage = $6,
              discount_amount = $7,
              subtotal = $8,
              notes = $9,
              display_order = $10,
              user_id_modification = $11,
              date_time_modification = CURRENT_TIMESTAMP
            WHERE custom_item_id = $12 AND treatment_id = $13
          `, [
            item.item_name,
            item.item_description || null,
            item.item_category || null,
            item.quantity || 1,
            item.unit_price,
            item.discount_percentage || 0,
            item.discount_amount || 0,
            subtotal,
            item.notes || null,
            i,
            user_id_modification,
            item.custom_item_id,
            treatmentId
          ]);
        } else {
          // INSERT - item nuevo
          await client.query(`
            INSERT INTO treatment_custom_items (
              treatment_id, item_name, item_description, item_category,
              quantity, unit_price, discount_percentage, discount_amount,
              subtotal, notes, display_order, user_id_registration
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
          `, [
            treatmentId,
            item.item_name,
            item.item_description || null,
            item.item_category || null,
            item.quantity || 1,
            item.unit_price,
            item.discount_percentage || 0,
            item.discount_amount || 0,
            subtotal,
            item.notes || null,
            i,
            user_id_modification
          ]);
        }
      }
    }

    // Si se proporcionan items de sub-procedimientos, usar lógica upsert inteligente
    if (sub_procedure_items !== undefined) {
      // Obtener IDs de items que vienen en el request (el PK es item_id)
      const incomingSubProcIds = sub_procedure_items
        .filter(item => item.item_id)
        .map(item => item.item_id);

      // Marcar como inactivos los items que NO están en el request
      if (incomingSubProcIds.length > 0) {
        await client.query(`
          UPDATE treatment_sub_procedure_items
          SET status = 'inactive', user_id_modification = $1, date_time_modification = CURRENT_TIMESTAMP
          WHERE treatment_id = $2 AND status = 'active' AND item_id NOT IN (${incomingSubProcIds.join(',')})
        `, [user_id_modification, treatmentId]);
      } else {
        await client.query(`
          UPDATE treatment_sub_procedure_items
          SET status = 'inactive', user_id_modification = $1, date_time_modification = CURRENT_TIMESTAMP
          WHERE treatment_id = $2 AND status = 'active'
        `, [user_id_modification, treatmentId]);
      }

      // Procesar cada item: UPDATE si existe, INSERT si es nuevo
      for (let i = 0; i < sub_procedure_items.length; i++) {
        const item = sub_procedure_items[i];
        const subtotal = (item.quantity || 1) * item.unit_price - (item.discount_amount || 0);

        if (item.item_id) {
          // UPDATE - item existente
          await client.query(`
            UPDATE treatment_sub_procedure_items SET
              sub_procedure_id = $1,
              quantity = $2,
              unit_price = $3,
              discount_percentage = $4,
              discount_amount = $5,
              subtotal = $6,
              notes = $7,
              display_order = $8,
              user_id_modification = $9,
              date_time_modification = CURRENT_TIMESTAMP
            WHERE item_id = $10 AND treatment_id = $11
          `, [
            item.sub_procedure_id,
            item.quantity || 1,
            item.unit_price,
            item.discount_percentage || 0,
            item.discount_amount || 0,
            subtotal,
            item.notes || null,
            i,
            user_id_modification,
            item.item_id,
            treatmentId
          ]);
        } else {
          // INSERT - item nuevo
          await client.query(`
            INSERT INTO treatment_sub_procedure_items (
              treatment_id, sub_procedure_id,
              quantity, unit_price, discount_percentage, discount_amount,
              subtotal, notes, display_order, user_id_registration
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
          `, [
            treatmentId,
            item.sub_procedure_id,
            item.quantity || 1,
            item.unit_price,
            item.discount_percentage || 0,
            item.discount_amount || 0,
            subtotal,
            item.notes || null,
            i,
            user_id_modification
          ]);
        }
      }
    }

    // Recalcular y actualizar el total_price del tratamiento
    const totalQuery = `
      SELECT COALESCE(SUM(subtotal), 0) as total
      FROM (
        SELECT subtotal FROM treatment_condition_items
        WHERE treatment_id = $1 AND status = 'active'
        UNION ALL
        SELECT subtotal FROM treatment_custom_items
        WHERE treatment_id = $1 AND status = 'active'
        UNION ALL
        SELECT subtotal FROM treatment_sub_procedure_items
        WHERE treatment_id = $1 AND status = 'active'
      ) combined
    `;
    const totalResult = await client.query(totalQuery, [treatmentId]);
    const newTotal = totalResult.rows[0]?.total || 0;

    await client.query(`
      UPDATE treatments SET total_price = $1, date_time_modification = CURRENT_TIMESTAMP
      WHERE treatment_id = $2
    `, [newTotal, treatmentId]);

    await client.query('COMMIT');

    // Retornar el pack actualizado con sus items
    return await getTreatmentPackById(treatmentId);

  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

/**
 * Elimina (soft delete) un pack de tratamiento
 */
const deleteTreatmentPack = async (treatmentId, userId) => {
  const query = `
    UPDATE treatments SET
      status = 'inactive',
      user_id_modification = $1,
      date_time_modification = CURRENT_TIMESTAMP
    WHERE treatment_id = $2 AND status = 'active'
    RETURNING treatment_id
  `;

  const result = await pool.query(query, [userId, treatmentId]);
  return result.rowCount > 0;
};

/**
 * Cuenta packs de tratamientos con filtros
 */
const countTreatmentPacks = async (filters = {}) => {
  let query = `SELECT COUNT(*) as total FROM treatments t WHERE t.status = 'active'`;
  const params = [];
  let paramIndex = 1;

  if (filters.only_packs) {
    query += ` AND t.is_pack = true`;
  }

  if (filters.category) {
    query += ` AND t.treatment_category = $${paramIndex}`;
    params.push(filters.category);
    paramIndex++;
  }

  if (filters.is_active !== undefined) {
    query += ` AND t.is_active = $${paramIndex}`;
    params.push(filters.is_active);
    paramIndex++;
  }

  if (filters.pack_type) {
    query += ` AND t.pack_type = $${paramIndex}`;
    params.push(filters.pack_type);
    paramIndex++;
  }

  if (filters.search) {
    query += ` AND (t.treatment_name ILIKE $${paramIndex} OR t.treatment_code ILIKE $${paramIndex})`;
    params.push(`%${filters.search}%`);
  }

  const result = await pool.query(query, params);
  return parseInt(result.rows[0].total);
};

// =============================================================================
// OPERACIONES PARA ITEMS DE CONDICIONES
// =============================================================================

/**
 * Agrega un item de condicion a un pack existente
 */
const addConditionItem = async (treatmentId, itemData) => {
  const {
    odontogram_condition_id,
    condition_procedure_id,
    quantity,
    unit_price,
    discount_percentage,
    discount_amount,
    notes,
    user_id_registration
  } = itemData;

  // Obtener el siguiente display_order
  const orderResult = await pool.query(`
    SELECT COALESCE(MAX(display_order), -1) + 1 as next_order
    FROM treatment_condition_items
    WHERE treatment_id = $1 AND status = 'active'
  `, [treatmentId]);

  const nextOrder = orderResult.rows[0].next_order;
  const subtotal = (quantity || 1) * unit_price - (discount_amount || 0);

  const insertQuery = `
    INSERT INTO treatment_condition_items (
      treatment_id, odontogram_condition_id, condition_procedure_id,
      quantity, unit_price, discount_percentage, discount_amount,
      subtotal, notes, display_order, user_id_registration
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
    RETURNING *
  `;

  const result = await pool.query(insertQuery, [
    treatmentId,
    odontogram_condition_id,
    condition_procedure_id || null,
    quantity || 1,
    unit_price,
    discount_percentage || 0,
    discount_amount || 0,
    subtotal,
    notes || null,
    nextOrder,
    user_id_registration
  ]);

  return result.rows[0];
};

/**
 * Elimina un item de condicion de un pack
 */
const removeConditionItem = async (itemId, userId) => {
  const query = `
    UPDATE treatment_condition_items SET
      status = 'inactive',
      user_id_modification = $1,
      date_time_modification = CURRENT_TIMESTAMP
    WHERE item_id = $2 AND status = 'active'
    RETURNING treatment_id
  `;

  const result = await pool.query(query, [userId, itemId]);
  return result.rowCount > 0 ? result.rows[0].treatment_id : null;
};

// =============================================================================
// OPERACIONES PARA ITEMS PERSONALIZADOS
// =============================================================================

/**
 * Agrega un item personalizado a un pack existente
 */
const addCustomItem = async (treatmentId, itemData) => {
  const {
    item_name,
    item_description,
    item_category,
    quantity,
    unit_price,
    discount_percentage,
    discount_amount,
    notes,
    user_id_registration
  } = itemData;

  // Obtener el siguiente display_order
  const orderResult = await pool.query(`
    SELECT COALESCE(MAX(display_order), -1) + 1 as next_order
    FROM treatment_custom_items
    WHERE treatment_id = $1 AND status = 'active'
  `, [treatmentId]);

  const nextOrder = orderResult.rows[0].next_order;
  const subtotal = (quantity || 1) * unit_price - (discount_amount || 0);

  const insertQuery = `
    INSERT INTO treatment_custom_items (
      treatment_id, item_name, item_description, item_category,
      quantity, unit_price, discount_percentage, discount_amount,
      subtotal, notes, display_order, user_id_registration
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
    RETURNING *
  `;

  const result = await pool.query(insertQuery, [
    treatmentId,
    item_name,
    item_description || null,
    item_category || null,
    quantity || 1,
    unit_price,
    discount_percentage || 0,
    discount_amount || 0,
    subtotal,
    notes || null,
    nextOrder,
    user_id_registration
  ]);

  return result.rows[0];
};

/**
 * Elimina un item personalizado de un pack
 */
const removeCustomItem = async (customItemId, userId) => {
  const query = `
    UPDATE treatment_custom_items SET
      status = 'inactive',
      user_id_modification = $1,
      date_time_modification = CURRENT_TIMESTAMP
    WHERE custom_item_id = $2 AND status = 'active'
    RETURNING treatment_id
  `;

  const result = await pool.query(query, [userId, customItemId]);
  return result.rowCount > 0 ? result.rows[0].treatment_id : null;
};

// =============================================================================
// OPERACIONES AUXILIARES
// =============================================================================

/**
 * Obtiene las categorias de packs disponibles
 */
const getPackCategories = async () => {
  const query = `
    SELECT DISTINCT treatment_category as category, COUNT(*) as pack_count
    FROM treatments
    WHERE status = 'active' AND is_pack = true AND treatment_category IS NOT NULL
    GROUP BY treatment_category
    ORDER BY treatment_category
  `;

  const result = await pool.query(query);
  return result.rows;
};

/**
 * Obtiene condiciones del odontograma disponibles para agregar a packs
 */
const getAvailableConditions = async (category = null) => {
  // Precio se obtiene de odontogram_condition_procedures.price_without_plan (FUENTE ÚNICA)
  let query = `
    SELECT
      odc.condition_id,
      odc.condition_code,
      odc.condition_name,
      odc.category,
      odc.default_price,
      -- Precio del primer procedimiento activo (Single Source of Truth)
      (
        SELECT COALESCE(ocp.price_without_plan, 0)
        FROM odontogram_condition_procedures ocp
        WHERE ocp.dental_condition_id = odc.dental_condition_id
        AND ocp.status = 'active'
        ORDER BY ocp.display_order, ocp.condition_procedure_id
        LIMIT 1
      ) as price_base,
      odc.description
    FROM odontogram_dental_conditions odc
    WHERE odc.status = 'active'
  `;

  const params = [];

  if (category) {
    query += ` AND odc.category = $1`;
    params.push(category);
  }

  query += ` ORDER BY odc.category, odc.condition_name`;

  const result = await pool.query(query, params);
  return result.rows;
};

/**
 * Obtiene procedimientos de una condicion especifica
 */
const getConditionProcedures = async (conditionId) => {
  const query = `
    SELECT
      ocp.condition_procedure_id,
      ocp.odontogram_condition_id,
      ocp.procedure_name,
      ocp.procedure_code,
      ocp.specialty,
      ocp.price_without_plan,
      ocp.price_plan_personal,
      ocp.price_plan_familiar,
      ocp.price_plan_platinium,
      ocp.price_plan_oro,
      ocp.applies_to_state,
      ocp.observations
    FROM odontogram_condition_procedures ocp
    WHERE ocp.odontogram_condition_id = $1 AND ocp.status = 'active'
    ORDER BY ocp.display_order
  `;

  const result = await pool.query(query, [conditionId]);
  return result.rows;
};

/**
 * Recalcula el precio total de un pack
 */
const recalculatePackTotal = async (treatmentId) => {
  const query = `
    UPDATE treatments
    SET total_price = (
      SELECT COALESCE(SUM(subtotal), 0)
      FROM (
        SELECT subtotal FROM treatment_condition_items
        WHERE treatment_id = $1 AND status = 'active'
        UNION ALL
        SELECT subtotal FROM treatment_custom_items
        WHERE treatment_id = $1 AND status = 'active'
        UNION ALL
        SELECT subtotal FROM treatment_sub_procedure_items
        WHERE treatment_id = $1 AND status = 'active'
      ) combined
    ),
    date_time_modification = CURRENT_TIMESTAMP
    WHERE treatment_id = $1
    RETURNING total_price
  `;

  const result = await pool.query(query, [treatmentId]);
  return result.rows[0]?.total_price || 0;
};

/**
 * Duplica un pack de tratamiento
 */
const duplicateTreatmentPack = async (treatmentId, userId, newName = null) => {
  const originalPack = await getTreatmentPackById(treatmentId);

  if (!originalPack) {
    throw new Error('Pack original no encontrado');
  }

  const newPackData = {
    treatment_code: `PACK-${Date.now().toString(36).toUpperCase()}`,
    treatment_name: newName || `${originalPack.treatment_name} (Copia)`,
    treatment_category: originalPack.treatment_category,
    description: originalPack.description,
    base_price: originalPack.base_price,
    estimated_duration: originalPack.estimated_duration,
    is_active: true,
    pack_type: originalPack.pack_type,
    condition_items: originalPack.condition_items.map(item => ({
      odontogram_condition_id: item.odontogram_condition_id,
      condition_procedure_id: item.condition_procedure_id,
      quantity: item.quantity,
      unit_price: item.unit_price,
      discount_percentage: item.discount_percentage,
      discount_amount: item.discount_amount,
      notes: item.notes
    })),
    custom_items: originalPack.custom_items.map(item => ({
      item_name: item.item_name,
      item_description: item.item_description,
      item_category: item.item_category,
      quantity: item.quantity,
      unit_price: item.unit_price,
      discount_percentage: item.discount_percentage,
      discount_amount: item.discount_amount,
      notes: item.notes
    })),
    user_id_registration: userId
  };

  return await createTreatmentPack(newPackData);
};

module.exports = {
  // CRUD principal
  getAllTreatmentPacks,
  getTreatmentPackById,
  createTreatmentPack,
  updateTreatmentPack,
  deleteTreatmentPack,
  countTreatmentPacks,

  // Items de condiciones
  addConditionItem,
  removeConditionItem,

  // Items personalizados
  addCustomItem,
  removeCustomItem,

  // Auxiliares
  getPackCategories,
  getAvailableConditions,
  getConditionProcedures,
  recalculatePackTotal,
  duplicateTreatmentPack
};
