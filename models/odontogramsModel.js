const pool = require('../config/db');

const getAllOdontograms = async (filters = {}) => {
  let query = `
    SELECT
      o.*,
      p.first_name || ' ' || p.last_name as patient_name,
      p.identification_number,
      u.first_name || ' ' || u.last_name as dentist_name,
      b.branch_name
    FROM odontograms o
    INNER JOIN patients p ON o.patient_id = p.patient_id
    INNER JOIN dentists d ON o.dentist_id = d.dentist_id
    INNER JOIN users u ON d.user_id = u.user_id
    INNER JOIN branches b ON o.branch_id = b.branch_id
    WHERE o.status = 'active'
  `;

  const params = [];
  let paramIndex = 1;

  if (filters.patient_id) {
    query += ` AND o.patient_id = $${paramIndex}`;
    params.push(filters.patient_id);
    paramIndex++;
  }

  if (filters.dentist_id) {
    query += ` AND o.dentist_id = $${paramIndex}`;
    params.push(filters.dentist_id);
    paramIndex++;
  }

  if (filters.is_current_version !== undefined) {
    query += ` AND o.is_current_version = $${paramIndex}`;
    params.push(filters.is_current_version);
    paramIndex++;
  }

  query += ` ORDER BY o.odontogram_date DESC, o.version DESC`;

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

const getOdontogramById = async (odontogramId) => {
  const odontogramQuery = `
    SELECT
      o.*,
      p.first_name || ' ' || p.last_name as patient_name,
      p.identification_number,
      p.birth_date,
      u.first_name || ' ' || u.last_name as dentist_name,
      b.branch_name
    FROM odontograms o
    INNER JOIN patients p ON o.patient_id = p.patient_id
    INNER JOIN dentists d ON o.dentist_id = d.dentist_id
    INNER JOIN users u ON d.user_id = u.user_id
    INNER JOIN branches b ON o.branch_id = b.branch_id
    WHERE o.odontogram_id = $1 AND o.status = 'active'
  `;

  const conditionsQuery = `
    SELECT
      oc.*,
      tp.position_name,
      tp.position_number
    FROM odontogram_conditions oc
    INNER JOIN tooth_positions tp ON oc.tooth_position_id = tp.tooth_position_id
    WHERE oc.odontogram_id = $1 AND oc.status = 'active'
    ORDER BY tp.position_number ASC
  `;

  const treatmentsQuery = `
    SELECT
      ot.*,
      tp.position_name,
      tp.position_number,
      ts_surf.surface_name,
      dp.procedure_name,
      ts_stat.status_name as treatment_status_name,
      dopt.diagnosis_name
    FROM odontogram_treatments ot
    INNER JOIN tooth_positions tp ON ot.tooth_position_id = tp.tooth_position_id
    LEFT JOIN tooth_surfaces ts_surf ON ot.tooth_surface_id = ts_surf.tooth_surface_id
    INNER JOIN dental_procedures dp ON ot.dental_procedure_id = dp.dental_procedure_id
    INNER JOIN treatment_statuses ts_stat ON ot.treatment_status_id = ts_stat.treatment_status_id
    LEFT JOIN diagnosis_options dopt ON ot.diagnosis_option_id = dopt.diagnosis_option_id
    WHERE ot.odontogram_id = $1 AND ot.status = 'active'
    ORDER BY tp.position_number ASC
  `;

  const [odontogramResult, conditionsResult, treatmentsResult] = await Promise.all([
    pool.query(odontogramQuery, [odontogramId]),
    pool.query(conditionsQuery, [odontogramId]),
    pool.query(treatmentsQuery, [odontogramId])
  ]);

  if (odontogramResult.rows.length === 0) {
    return null;
  }

  return {
    ...odontogramResult.rows[0],
    conditions: conditionsResult.rows,
    treatments: treatmentsResult.rows
  };
};

const createOdontogram = async (odontogramData) => {
  const {
    patient_id,
    dentist_id,
    branch_id,
    appointment_id,
    consultation_id,
    odontogram_date,
    odontogram_type,
    version,
    is_current_version,
    conditions,
    general_observations,
    user_id_registration
  } = odontogramData;

  // Si es la versión actual, marcar las demás como no actuales
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    if (is_current_version) {
      await client.query(
        `UPDATE odontograms SET is_current_version = false
         WHERE patient_id = $1 AND status = 'active'`,
        [patient_id]
      );
    }

    const query = `
      INSERT INTO odontograms (
        patient_id, dentist_id, branch_id, appointment_id, consultation_id,
        odontogram_date, odontogram_type, version, is_current_version,
        conditions, general_observations, user_id_registration
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      RETURNING *
    `;

    const values = [
      patient_id,
      dentist_id,
      branch_id,
      appointment_id || null,
      consultation_id || null,
      odontogram_date,
      odontogram_type || 'adult',
      version || 1,
      is_current_version !== undefined ? is_current_version : true,
      conditions || '[]',
      general_observations || null,
      user_id_registration
    ];

    const result = await client.query(query, values);

    await client.query('COMMIT');
    return result.rows[0];
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

const updateOdontogram = async (odontogramId, odontogramData) => {
  const fields = [];
  const values = [];
  let paramIndex = 1;

  Object.keys(odontogramData).forEach((key) => {
    if (key !== 'user_id_modification' && odontogramData[key] !== undefined) {
      fields.push(`${key} = $${paramIndex}`);
      values.push(odontogramData[key]);
      paramIndex++;
    }
  });

  if (fields.length === 0) {
    throw new Error('No hay campos para actualizar');
  }

  fields.push(`user_id_modification = $${paramIndex}`);
  values.push(odontogramData.user_id_modification);
  paramIndex++;

  fields.push(`date_time_modification = CURRENT_TIMESTAMP`);

  values.push(odontogramId);

  const query = `
    UPDATE odontograms SET ${fields.join(', ')}
    WHERE odontogram_id = $${paramIndex} AND status = 'active'
    RETURNING *
  `;

  const result = await pool.query(query, values);
  return result.rows.length > 0 ? result.rows[0] : null;
};

const deleteOdontogram = async (odontogramId, userId) => {
  const query = `
    UPDATE odontograms SET
      status = 'inactive',
      user_id_modification = $1,
      date_time_modification = CURRENT_TIMESTAMP
    WHERE odontogram_id = $2 AND status = 'active'
    RETURNING odontogram_id
  `;

  const result = await pool.query(query, [userId, odontogramId]);
  return result.rowCount > 0;
};

const countOdontograms = async (filters = {}) => {
  let query = `SELECT COUNT(*) as total FROM odontograms o WHERE o.status = 'active'`;
  const params = [];
  let paramIndex = 1;

  if (filters.patient_id) {
    query += ` AND o.patient_id = $${paramIndex}`;
    params.push(filters.patient_id);
    paramIndex++;
  }

  if (filters.dentist_id) {
    query += ` AND o.dentist_id = $${paramIndex}`;
    params.push(filters.dentist_id);
    paramIndex++;
  }

  if (filters.is_current_version !== undefined) {
    query += ` AND o.is_current_version = $${paramIndex}`;
    params.push(filters.is_current_version);
  }

  const result = await pool.query(query, params);
  return parseInt(result.rows[0].total);
};

// Condiciones del odontograma
const addCondition = async (conditionData, userId) => {
  const {
    odontogram_id,
    tooth_position_id,
    dental_condition_id,
    tooth_surface_id,
    surface_section,
    price,
    description,
    severity,
    notes,
    connected_tooth_position_id
  } = conditionData;

  const query = `
    INSERT INTO odontogram_conditions (
      odontogram_id, tooth_position_id, dental_condition_id, tooth_surface_id,
      surface_section, price, description, severity, notes, connected_tooth_position_id, user_id_registration
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
    RETURNING *
  `;

  const values = [
    odontogram_id,
    tooth_position_id,
    dental_condition_id || null,
    tooth_surface_id || null,
    surface_section || null,
    price || 0,
    description || null,
    severity || null,
    notes || null,
    connected_tooth_position_id || null,
    userId
  ];

  const result = await pool.query(query, values);
  return result.rows[0];
};

const deleteCondition = async (conditionId, userId) => {
  const query = `
    UPDATE odontogram_conditions SET
      status = 'inactive',
      user_id_modification = $1,
      date_time_modification = CURRENT_TIMESTAMP
    WHERE condition_id = $2 AND status = 'active'
    RETURNING condition_id
  `;

  const result = await pool.query(query, [userId, conditionId]);
  return result.rowCount > 0;
};

// Tratamientos del odontograma
const addTreatment = async (treatmentData, userId) => {
  const {
    odontogram_id,
    tooth_position_id,
    tooth_surface_id,
    dental_procedure_id,
    treatment_status_id,
    diagnosis_option_id,
    findings,
    notes,
    treatment_date
  } = treatmentData;

  const query = `
    INSERT INTO odontogram_treatments (
      odontogram_id, tooth_position_id, tooth_surface_id, dental_procedure_id,
      treatment_status_id, diagnosis_option_id, findings, notes, treatment_date,
      user_id_registration
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
    RETURNING *
  `;

  const values = [
    odontogram_id,
    tooth_position_id,
    tooth_surface_id || null,
    dental_procedure_id,
    treatment_status_id,
    diagnosis_option_id || null,
    findings || null,
    notes || null,
    treatment_date || null,
    userId
  ];

  const result = await pool.query(query, values);
  return result.rows[0];
};

const deleteTreatment = async (treatmentId, userId) => {
  const query = `
    UPDATE odontogram_treatments SET
      status = 'inactive',
      user_id_modification = $1,
      date_time_modification = CURRENT_TIMESTAMP
    WHERE odontogram_treatment_id = $2 AND status = 'active'
    RETURNING odontogram_treatment_id
  `;

  const result = await pool.query(query, [userId, treatmentId]);
  return result.rowCount > 0;
};

// ============================================================
// NUEVAS FUNCIONES PARA INTEGRACIÓN RELACIONAL DEL ODONTOGRAMA
// ============================================================

/**
 * Obtener el odontograma actual (is_current_version = true) de un paciente
 * Si no existe, devuelve null
 */
const getCurrentOdontogramByPatient = async (patientId) => {
  const odontogramQuery = `
    SELECT
      o.*,
      p.first_name || ' ' || p.last_name as patient_name,
      p.identification_number,
      p.birth_date
    FROM odontograms o
    INNER JOIN patients p ON o.patient_id = p.patient_id
    WHERE o.patient_id = $1
      AND o.is_current_version = true
      AND o.status = 'active'
    ORDER BY o.odontogram_date DESC
    LIMIT 1
  `;

  const odontogramResult = await pool.query(odontogramQuery, [patientId]);

  if (odontogramResult.rows.length === 0) {
    return null;
  }

  const odontogram = odontogramResult.rows[0];

  // Obtener las condiciones del odontograma con información completa
  const conditionsQuery = `
    SELECT
      oc.*,
      CASE
        WHEN LENGTH(tp.tooth_number) = 2
        THEN SUBSTRING(tp.tooth_number, 1, 1) || '.' || SUBSTRING(tp.tooth_number, 2, 1)
        ELSE tp.tooth_number
      END as tooth_number,
      tp.tooth_name,
      tp.quadrant,
      tp.tooth_type,
      tp.is_adult,
      ts.surface_code,
      ts.surface_name,
      odc.condition_name,
      odc.condition_code as dental_condition_code,
      odc.category as condition_category,
      -- Precio del primer procedimiento (FUENTE ÚNICA DE VERDAD)
      (
        SELECT COALESCE(ocp_price.price_without_plan, 0)
        FROM odontogram_condition_procedures ocp_price
        WHERE ocp_price.odontogram_condition_id = oc.dental_condition_id
        AND ocp_price.status = 'active'
        ORDER BY ocp_price.display_order, ocp_price.condition_procedure_id
        LIMIT 1
      ) as config_price_base,
      odc.symbol_type,
      odc.color_type,
      odc.fill_surfaces,
      odc.abbreviation,
      -- Diente conectado (para prótesis, aparatos, transposición)
      CASE
        WHEN LENGTH(ctp.tooth_number) = 2
        THEN SUBSTRING(ctp.tooth_number, 1, 1) || '.' || SUBSTRING(ctp.tooth_number, 2, 1)
        ELSE ctp.tooth_number
      END as connected_tooth_number
    FROM odontogram_conditions oc
    INNER JOIN tooth_positions tp ON oc.tooth_position_id = tp.tooth_position_id
    LEFT JOIN tooth_surfaces ts ON oc.tooth_surface_id = ts.tooth_surface_id
    LEFT JOIN odontogram_dental_conditions odc ON oc.dental_condition_id = odc.condition_id
    LEFT JOIN tooth_positions ctp ON oc.connected_tooth_position_id = ctp.tooth_position_id
    WHERE oc.odontogram_id = $1 AND oc.status = 'active'
    ORDER BY tp.tooth_number ASC, oc.condition_id ASC
  `;

  const conditionsResult = await pool.query(conditionsQuery, [odontogram.odontogram_id]);

  return {
    ...odontogram,
    conditions: conditionsResult.rows
  };
};

/**
 * Guardar condiciones en batch para un odontograma con lógica de SINCRONIZACIÓN
 * - Condiciones nuevas → INSERT
 * - Condiciones existentes → UPDATE (si hay cambios)
 * - Condiciones que ya no están → marcar como 'inactive'
 *
 * La clave única para identificar una condición es:
 * tooth_position_id + surface_section + dental_condition_id
 *
 * @param {number} odontogramId - ID del odontograma
 * @param {Array} conditions - Array de condiciones a guardar
 * @param {number} userId - ID del usuario que registra
 */
const saveConditionsBatch = async (odontogramId, conditions, userId) => {
  const client = await pool.connect();

  // Mapeo de nombres de superficie del frontend a códigos de BD
  const SURFACE_NAME_TO_CODE = {
    'vestibular': 'V',
    'lingual': 'L',
    'mesial': 'M',
    'distal': 'D',
    'corona': 'C',
    'oclusal': 'C',
    'incisal': 'C'
  };

  /**
   * Función auxiliar para resolver los IDs de una condición
   */
  const resolveConditionIds = async (condition) => {
    const {
      tooth_position_id,
      tooth_number,
      dental_condition_id,
      tooth_surface_id,
      surface_section,
      price,
      description,
      severity,
      notes,
      connected_tooth_number,
      connected_tooth_position_id
    } = condition;

    // Resolver tooth_position_id
    let resolvedToothPositionId = tooth_position_id;
    if (!resolvedToothPositionId && tooth_number) {
      const normalizedToothNumber = tooth_number.toString().replace('.', '');
      const posResult = await client.query(
        `SELECT tooth_position_id FROM tooth_positions WHERE tooth_number = $1`,
        [normalizedToothNumber]
      );
      if (posResult.rows.length > 0) {
        resolvedToothPositionId = posResult.rows[0].tooth_position_id;
      }
    }

    // Resolver connected_tooth_position_id (para prótesis, aparatos, etc.)
    let resolvedConnectedToothPositionId = connected_tooth_position_id;
    if (!resolvedConnectedToothPositionId && connected_tooth_number) {
      const normalizedConnectedToothNumber = connected_tooth_number.toString().replace('.', '');
      const connectedPosResult = await client.query(
        `SELECT tooth_position_id FROM tooth_positions WHERE tooth_number = $1`,
        [normalizedConnectedToothNumber]
      );
      if (connectedPosResult.rows.length > 0) {
        resolvedConnectedToothPositionId = connectedPosResult.rows[0].tooth_position_id;
      }
    }

    // Resolver tooth_surface_id
    let resolvedSurfaceId = tooth_surface_id;
    if (!resolvedSurfaceId) {
      let surfaceCodeToSearch = condition.surface_code;
      if (!surfaceCodeToSearch && surface_section) {
        surfaceCodeToSearch = SURFACE_NAME_TO_CODE[surface_section.toLowerCase()];
      }
      if (surfaceCodeToSearch) {
        const surfResult = await client.query(
          `SELECT tooth_surface_id FROM tooth_surfaces WHERE surface_code = $1 AND status = 'active'`,
          [surfaceCodeToSearch]
        );
        if (surfResult.rows.length > 0) {
          resolvedSurfaceId = surfResult.rows[0].tooth_surface_id;
        }
      }
    }

    // Resolver dental_condition_id
    let resolvedDentalConditionId = dental_condition_id;
    if (!resolvedDentalConditionId && condition.condition_name) {
      const condResult = await client.query(
        `SELECT condition_id FROM odontogram_dental_conditions
         WHERE condition_code = $1 OR condition_name = $1
         LIMIT 1`,
        [condition.condition_name]
      );
      if (condResult.rows.length > 0) {
        resolvedDentalConditionId = condResult.rows[0].condition_id;
      }
    }

    return {
      resolvedToothPositionId,
      resolvedSurfaceId,
      resolvedDentalConditionId,
      resolvedConnectedToothPositionId,
      surface_section: surface_section || null,
      price: price || 0,
      description: description || null,
      severity: severity || null,
      notes: notes || null,
      custom_tooth_price: condition.custom_tooth_price !== undefined ? condition.custom_tooth_price : null
    };
  };

  try {
    await client.query('BEGIN');

    // 1. Obtener condiciones existentes activas
    const existingResult = await client.query(
      `SELECT condition_id, tooth_position_id, tooth_surface_id, surface_section, dental_condition_id
       FROM odontogram_conditions
       WHERE odontogram_id = $1 AND status = 'active'`,
      [odontogramId]
    );
    const existingConditions = existingResult.rows;

    // Crear un mapa de condiciones existentes para búsqueda rápida
    // Clave: tooth_position_id|surface_section|dental_condition_id
    const existingMap = new Map();
    for (const ec of existingConditions) {
      const key = `${ec.tooth_position_id}|${ec.surface_section || ''}|${ec.dental_condition_id || ''}`;
      existingMap.set(key, ec);
    }

    console.log(`[saveConditionsBatch] Condiciones existentes: ${existingConditions.length}, Nuevas a procesar: ${conditions.length}`);

    // 2. Procesar nuevas condiciones
    const processedKeys = new Set();
    const results = { inserted: [], updated: [], deactivated: [] };

    for (const condition of conditions) {
      const resolved = await resolveConditionIds(condition);

      if (!resolved.resolvedToothPositionId) {
        console.warn(`[saveConditionsBatch] No se pudo resolver tooth_position_id para:`, condition);
        continue;
      }

      const key = `${resolved.resolvedToothPositionId}|${resolved.surface_section || ''}|${resolved.resolvedDentalConditionId || ''}`;
      processedKeys.add(key);

      const existing = existingMap.get(key);

      if (existing) {
        // UPDATE: La condición ya existe, actualizar
        const updateQuery = `
          UPDATE odontogram_conditions
          SET tooth_surface_id = $1,
              price = $2,
              description = $3,
              severity = $4,
              notes = $5,
              custom_tooth_price = $6,
              connected_tooth_position_id = $7,
              user_id_modification = $8,
              date_time_modification = CURRENT_TIMESTAMP
          WHERE condition_id = $9
          RETURNING *
        `;
        const updateResult = await client.query(updateQuery, [
          resolved.resolvedSurfaceId || existing.tooth_surface_id,
          resolved.price,
          resolved.description,
          resolved.severity,
          resolved.notes,
          resolved.custom_tooth_price,
          resolved.resolvedConnectedToothPositionId || null,
          userId,
          existing.condition_id
        ]);
        results.updated.push(updateResult.rows[0]);
        console.log(`[saveConditionsBatch] Condición ACTUALIZADA: ID=${existing.condition_id}`);
      } else {
        // INSERT: Nueva condición
        const insertQuery = `
          INSERT INTO odontogram_conditions (
            odontogram_id, tooth_position_id, dental_condition_id, tooth_surface_id,
            surface_section, price, description, severity, notes, custom_tooth_price,
            connected_tooth_position_id, user_id_registration
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
          RETURNING *
        `;
        const insertResult = await client.query(insertQuery, [
          odontogramId,
          resolved.resolvedToothPositionId,
          resolved.resolvedDentalConditionId,
          resolved.resolvedSurfaceId,
          resolved.surface_section,
          resolved.price,
          resolved.description,
          resolved.severity,
          resolved.notes,
          resolved.custom_tooth_price,
          resolved.resolvedConnectedToothPositionId || null,
          userId
        ]);
        results.inserted.push(insertResult.rows[0]);
        console.log(`[saveConditionsBatch] Condición INSERTADA: tooth_pos=${resolved.resolvedToothPositionId}, dental_cond=${resolved.resolvedDentalConditionId}, connected=${resolved.resolvedConnectedToothPositionId || 'null'}`);
      }
    }

    // 3. Marcar como 'inactive' las condiciones que ya no están en la lista nueva
    for (const ec of existingConditions) {
      const key = `${ec.tooth_position_id}|${ec.surface_section || ''}|${ec.dental_condition_id || ''}`;
      if (!processedKeys.has(key)) {
        await client.query(
          `UPDATE odontogram_conditions
           SET status = 'inactive',
               user_id_modification = $1,
               date_time_modification = CURRENT_TIMESTAMP
           WHERE condition_id = $2`,
          [userId, ec.condition_id]
        );
        results.deactivated.push(ec);
        console.log(`[saveConditionsBatch] Condición DESACTIVADA: ID=${ec.condition_id}`);
      }
    }

    // 4. Actualizar el campo conditions (JSONB) del odontograma para compatibilidad
    await client.query(
      `UPDATE odontograms
       SET conditions = $1::jsonb,
           user_id_modification = $2,
           date_time_modification = CURRENT_TIMESTAMP
       WHERE odontogram_id = $3`,
      [JSON.stringify(conditions), userId, odontogramId]
    );

    await client.query('COMMIT');

    console.log(`[saveConditionsBatch] Sincronización completada: ${results.inserted.length} insertadas, ${results.updated.length} actualizadas, ${results.deactivated.length} desactivadas`);

    return {
      success: true,
      inserted: results.inserted.length,
      updated: results.updated.length,
      deactivated: results.deactivated.length,
      conditions: [...results.inserted, ...results.updated]
    };
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('[saveConditionsBatch] Error:', error);
    throw error;
  } finally {
    client.release();
  }
};

/**
 * Obtener todas las condiciones de un odontograma con información completa
 */
const getConditionsByOdontogram = async (odontogramId) => {
  const query = `
    SELECT
      oc.*,
      CASE
        WHEN LENGTH(tp.tooth_number) = 2
        THEN SUBSTRING(tp.tooth_number, 1, 1) || '.' || SUBSTRING(tp.tooth_number, 2, 1)
        ELSE tp.tooth_number
      END as tooth_number,
      tp.tooth_name,
      tp.quadrant,
      tp.tooth_type,
      tp.is_adult,
      ts.surface_code,
      ts.surface_name,
      odc.condition_name,
      odc.condition_code as dental_condition_code,
      odc.category as condition_category,
      -- Precio del primer procedimiento (FUENTE ÚNICA DE VERDAD)
      (
        SELECT COALESCE(ocp_price.price_without_plan, 0)
        FROM odontogram_condition_procedures ocp_price
        WHERE ocp_price.odontogram_condition_id = oc.dental_condition_id
        AND ocp_price.status = 'active'
        ORDER BY ocp_price.display_order, ocp_price.condition_procedure_id
        LIMIT 1
      ) as config_price_base,
      odc.symbol_type,
      odc.color_type,
      odc.fill_surfaces,
      odc.abbreviation,
      -- Diente conectado (para prótesis, aparatos, transposición)
      CASE
        WHEN LENGTH(ctp.tooth_number) = 2
        THEN SUBSTRING(ctp.tooth_number, 1, 1) || '.' || SUBSTRING(ctp.tooth_number, 2, 1)
        ELSE ctp.tooth_number
      END as connected_tooth_number
    FROM odontogram_conditions oc
    INNER JOIN tooth_positions tp ON oc.tooth_position_id = tp.tooth_position_id
    LEFT JOIN tooth_surfaces ts ON oc.tooth_surface_id = ts.tooth_surface_id
    LEFT JOIN odontogram_dental_conditions odc ON oc.dental_condition_id = odc.condition_id
    LEFT JOIN tooth_positions ctp ON oc.connected_tooth_position_id = ctp.tooth_position_id
    WHERE oc.odontogram_id = $1 AND oc.status = 'active'
    ORDER BY tp.tooth_number ASC, oc.condition_id ASC
  `;

  const result = await pool.query(query, [odontogramId]);
  return result.rows;
};

/**
 * Crear o actualizar odontograma con condiciones relacionales
 * Si el paciente ya tiene un odontograma actual, lo actualiza
 * Si no tiene, crea uno nuevo
 */
const upsertOdontogramWithConditions = async (data, userId) => {
  const {
    patient_id,
    dentist_id,
    branch_id,
    appointment_id,
    consultation_id,
    odontogram_type,
    conditions,
    general_observations
  } = data;

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // Buscar odontograma actual del paciente
    const existingQuery = `
      SELECT odontogram_id FROM odontograms
      WHERE patient_id = $1 AND is_current_version = true AND status = 'active'
      LIMIT 1
    `;
    const existingResult = await client.query(existingQuery, [patient_id]);

    let odontogramId;

    if (existingResult.rows.length > 0) {
      // Actualizar odontograma existente
      odontogramId = existingResult.rows[0].odontogram_id;
      await client.query(
        `UPDATE odontograms
         SET dentist_id = $1,
             appointment_id = $2,
             consultation_id = $3,
             general_observations = $4,
             user_id_modification = $5,
             date_time_modification = CURRENT_TIMESTAMP
         WHERE odontogram_id = $6`,
        [dentist_id, appointment_id || null, consultation_id || null, general_observations || null, userId, odontogramId]
      );
    } else {
      // Crear nuevo odontograma
      const insertQuery = `
        INSERT INTO odontograms (
          patient_id, dentist_id, branch_id, appointment_id, consultation_id,
          odontogram_date, odontogram_type, version, is_current_version,
          general_observations, user_id_registration
        ) VALUES ($1, $2, $3, $4, $5, CURRENT_DATE, $6, 1, true, $7, $8)
        RETURNING odontogram_id
      `;
      const insertResult = await client.query(insertQuery, [
        patient_id, dentist_id, branch_id, appointment_id || null, consultation_id || null,
        odontogram_type || 'adult', general_observations || null, userId
      ]);
      odontogramId = insertResult.rows[0].odontogram_id;
    }

    await client.query('COMMIT');

    // Guardar condiciones si vienen
    if (conditions && conditions.length > 0) {
      await saveConditionsBatch(odontogramId, conditions, userId);
    }

    // Obtener el odontograma completo
    return await getCurrentOdontogramByPatient(patient_id);
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

/**
 * Obtener todos los tooth_positions para el frontend
 */
const getAllToothPositions = async () => {
  const query = `
    SELECT tooth_position_id, tooth_number, tooth_name, quadrant, tooth_type, is_adult
    FROM tooth_positions
    WHERE status = 'active'
    ORDER BY
      CASE WHEN is_adult THEN 0 ELSE 1 END,
      quadrant,
      tooth_position_id
  `;
  const result = await pool.query(query);
  return result.rows;
};

/**
 * Obtener todos los tooth_surfaces para el frontend
 */
const getAllToothSurfaces = async () => {
  const query = `
    SELECT tooth_surface_id, surface_code, surface_name, description
    FROM tooth_surfaces
    WHERE status = 'active'
    ORDER BY tooth_surface_id
  `;
  const result = await pool.query(query);
  return result.rows;
};

/**
 * Obtener odontogramas del paciente para la vista de paciente con tabs
 * Devuelve:
 * - odontograma inicial (el primer odontograma registrado, version 1) - condiciones originales
 * - odontograma de evolucion (condiciones con estado actualizado desde evolution_odontogram)
 * - historial de odontogramas de evolucion con fechas y dentistas
 *
 * IMPORTANTE: El odontograma de evolucion cruza las condiciones originales con la tabla
 * evolution_odontogram para mostrar el estado actualizado de cada tratamiento:
 * - completed = azul (tratado)
 * - pending = rojo (pendiente)
 * - in_progress = amarillo (en progreso)
 */
const getPatientOdontogramsWithHistory = async (patientId) => {
  // 1. Obtener el odontograma inicial (primer odontograma del paciente)
  const initialOdontogramQuery = `
    SELECT
      o.*,
      p.first_name || ' ' || p.last_name as patient_name,
      p.identification_number,
      p.birth_date,
      u.first_name || ' ' || u.last_name as dentist_name,
      d.professional_license as dentist_cop,
      b.branch_name,
      c.consultation_date as consultation_date
    FROM odontograms o
    INNER JOIN patients p ON o.patient_id = p.patient_id
    INNER JOIN dentists d ON o.dentist_id = d.dentist_id
    INNER JOIN users u ON d.user_id = u.user_id
    INNER JOIN branches b ON o.branch_id = b.branch_id
    LEFT JOIN consultations c ON o.consultation_id = c.consultation_id
    WHERE o.patient_id = $1
      AND o.status = 'active'
    ORDER BY o.odontogram_date ASC, o.version ASC
    LIMIT 1
  `;

  const initialResult = await pool.query(initialOdontogramQuery, [patientId]);

  let initialOdontogram = null;
  let initialConditions = [];

  if (initialResult.rows.length > 0) {
    initialOdontogram = initialResult.rows[0];

    // Obtener las condiciones del odontograma inicial (SIN cruzar con evolution)
    // Estas son las condiciones originales tal como fueron diagnosticadas
    const initialConditionsQuery = `
      SELECT
        oc.*,
        CASE
          WHEN LENGTH(tp.tooth_number) = 2
          THEN SUBSTRING(tp.tooth_number, 1, 1) || '.' || SUBSTRING(tp.tooth_number, 2, 1)
          ELSE tp.tooth_number
        END as tooth_number,
        tp.tooth_name,
        tp.quadrant,
        tp.tooth_type,
        tp.is_adult,
        ts.surface_code,
        ts.surface_name,
        odc.condition_name,
        odc.condition_code as dental_condition_code,
        odc.category as condition_category,
        -- Precio del primer procedimiento (FUENTE ÚNICA DE VERDAD)
        (
          SELECT COALESCE(ocp_price.price_without_plan, 0)
          FROM odontogram_condition_procedures ocp_price
          WHERE ocp_price.odontogram_condition_id = oc.dental_condition_id
          AND ocp_price.status = 'active'
          ORDER BY ocp_price.display_order, ocp_price.condition_procedure_id
          LIMIT 1
        ) as config_price_base,
        odc.symbol_type,
        odc.color_type,
        odc.fill_surfaces,
        odc.abbreviation,
        -- Diente conectado (para prótesis, aparatos, transposición)
        CASE
          WHEN LENGTH(ctp.tooth_number) = 2
          THEN SUBSTRING(ctp.tooth_number, 1, 1) || '.' || SUBSTRING(ctp.tooth_number, 2, 1)
          ELSE ctp.tooth_number
        END as connected_tooth_number
      FROM odontogram_conditions oc
      INNER JOIN tooth_positions tp ON oc.tooth_position_id = tp.tooth_position_id
      LEFT JOIN tooth_surfaces ts ON oc.tooth_surface_id = ts.tooth_surface_id
      LEFT JOIN odontogram_dental_conditions odc ON oc.dental_condition_id = odc.condition_id
      LEFT JOIN tooth_positions ctp ON oc.connected_tooth_position_id = ctp.tooth_position_id
      WHERE oc.odontogram_id = $1 AND oc.status = 'active'
      ORDER BY tp.tooth_number ASC, oc.condition_id ASC
    `;

    const conditionsResult = await pool.query(initialConditionsQuery, [initialOdontogram.odontogram_id]);
    initialConditions = conditionsResult.rows;
  }

  // 2. Obtener el historial de odontogramas de evolucion
  const evolutionHistoryQuery = `
    SELECT
      o.odontogram_id,
      o.odontogram_date,
      o.version,
      o.is_current_version,
      o.general_observations,
      o.date_time_registration,
      u.first_name || ' ' || u.last_name as dentist_name,
      d.professional_license as dentist_cop,
      b.branch_name,
      c.consultation_id,
      c.consultation_date,
      (
        SELECT COUNT(*)
        FROM odontogram_conditions oc
        WHERE oc.odontogram_id = o.odontogram_id AND oc.status = 'active'
      ) as conditions_count
    FROM odontograms o
    INNER JOIN dentists d ON o.dentist_id = d.dentist_id
    INNER JOIN users u ON d.user_id = u.user_id
    INNER JOIN branches b ON o.branch_id = b.branch_id
    LEFT JOIN consultations c ON o.consultation_id = c.consultation_id
    WHERE o.patient_id = $1
      AND o.status = 'active'
    ORDER BY o.odontogram_date DESC, o.version DESC
  `;

  const evolutionHistoryResult = await pool.query(evolutionHistoryQuery, [patientId]);

  // 3. Obtener el odontograma de evolucion actual
  // Este odontograma muestra las condiciones con su ESTADO ACTUALIZADO desde evolution_odontogram
  const currentEvolutionQuery = `
    SELECT
      o.*,
      p.first_name || ' ' || p.last_name as patient_name,
      p.identification_number,
      p.birth_date,
      u.first_name || ' ' || u.last_name as dentist_name,
      d.professional_license as dentist_cop,
      b.branch_name
    FROM odontograms o
    INNER JOIN patients p ON o.patient_id = p.patient_id
    INNER JOIN dentists d ON o.dentist_id = d.dentist_id
    INNER JOIN users u ON d.user_id = u.user_id
    INNER JOIN branches b ON o.branch_id = b.branch_id
    WHERE o.patient_id = $1
      AND o.is_current_version = true
      AND o.status = 'active'
    ORDER BY o.odontogram_date DESC
    LIMIT 1
  `;

  const currentResult = await pool.query(currentEvolutionQuery, [patientId]);

  let currentEvolution = null;
  let evolutionConditions = [];

  if (currentResult.rows.length > 0) {
    currentEvolution = currentResult.rows[0];

    // CLAVE: Obtener condiciones CON el estado de evolucion desde evolution_odontogram
    // Esta query cruza odontogram_conditions con evolution_odontogram para obtener
    // el estado actualizado de cada tratamiento
    const evolutionConditionsQuery = `
      SELECT
        oc.*,
        CASE
          WHEN LENGTH(tp.tooth_number) = 2
          THEN SUBSTRING(tp.tooth_number, 1, 1) || '.' || SUBSTRING(tp.tooth_number, 2, 1)
          ELSE tp.tooth_number
        END as tooth_number,
        tp.tooth_name,
        tp.quadrant,
        tp.tooth_type,
        tp.is_adult,
        ts.surface_code,
        ts.surface_name,
        odc.condition_name,
        odc.condition_code as dental_condition_code,
        odc.category as condition_category,
        -- Precio del primer procedimiento (FUENTE ÚNICA DE VERDAD)
        (
          SELECT COALESCE(ocp_price.price_without_plan, 0)
          FROM odontogram_condition_procedures ocp_price
          WHERE ocp_price.odontogram_condition_id = oc.dental_condition_id
          AND ocp_price.status = 'active'
          ORDER BY ocp_price.display_order, ocp_price.condition_procedure_id
          LIMIT 1
        ) as config_price_base,
        odc.symbol_type,
        -- IMPORTANTE: Determinar color_type basado en evolution_odontogram
        -- Si hay evolucion y esta 'completed' -> azul (tratado)
        -- Si hay evolucion y esta 'in_progress' -> amarillo
        -- Si no hay evolucion o esta 'pending' -> color original (generalmente rojo)
        CASE
          WHEN eo.condition_status = 'completed' THEN 'blue'
          WHEN eo.condition_status = 'in_progress' THEN 'yellow'
          ELSE odc.color_type
        END as color_type,
        odc.fill_surfaces,
        odc.abbreviation,
        -- Diente conectado (para prótesis, aparatos, transposición)
        CASE
          WHEN LENGTH(ctp.tooth_number) = 2
          THEN SUBSTRING(ctp.tooth_number, 1, 1) || '.' || SUBSTRING(ctp.tooth_number, 2, 1)
          ELSE ctp.tooth_number
        END as connected_tooth_number,
        -- Campos adicionales de evolucion
        eo.evolution_id,
        eo.condition_status as evolution_status,
        eo.clinical_observation as evolution_observation,
        eo.registered_date as evolution_date,
        eo.procedure_history_id,
        eo.income_id
      FROM odontogram_conditions oc
      INNER JOIN tooth_positions tp ON oc.tooth_position_id = tp.tooth_position_id
      LEFT JOIN tooth_surfaces ts ON oc.tooth_surface_id = ts.tooth_surface_id
      LEFT JOIN odontogram_dental_conditions odc ON oc.dental_condition_id = odc.condition_id
      LEFT JOIN tooth_positions ctp ON oc.connected_tooth_position_id = ctp.tooth_position_id
      -- LEFT JOIN con evolution_odontogram para obtener estado actualizado
      -- Cruzamos por patient_id, tooth_position_id y opcionalmente tooth_surface_id
      LEFT JOIN LATERAL (
        SELECT
          evo.evolution_id,
          evo.condition_status,
          evo.clinical_observation,
          evo.registered_date,
          evo.procedure_history_id,
          evo.income_id
        FROM evolution_odontogram evo
        WHERE evo.patient_id = $2
          AND evo.tooth_position_id = oc.tooth_position_id
          AND (
            -- Coincidir por superficie si ambos tienen superficie
            (evo.tooth_surface_id IS NOT NULL AND oc.tooth_surface_id IS NOT NULL AND evo.tooth_surface_id = oc.tooth_surface_id)
            OR
            -- O coincidir por condicion original si no hay superficie
            (evo.original_condition_id IS NOT NULL AND evo.original_condition_id = oc.dental_condition_id)
            OR
            -- O coincidir si ambos no tienen superficie especifica
            (evo.tooth_surface_id IS NULL AND oc.tooth_surface_id IS NULL)
          )
          AND evo.status = 'active'
        ORDER BY evo.registered_date DESC
        LIMIT 1
      ) eo ON true
      WHERE oc.odontogram_id = $1 AND oc.status = 'active'
      ORDER BY tp.tooth_number ASC, oc.condition_id ASC
    `;

    const evolutionConditionsResult = await pool.query(evolutionConditionsQuery, [
      currentEvolution.odontogram_id,
      patientId
    ]);
    evolutionConditions = evolutionConditionsResult.rows;
  }

  return {
    initialOdontogram: initialOdontogram ? {
      ...initialOdontogram,
      conditions: initialConditions
    } : null,
    currentEvolution: currentEvolution ? {
      ...currentEvolution,
      conditions: evolutionConditions
    } : null,
    evolutionHistory: evolutionHistoryResult.rows
  };
};

/**
 * Obtener un odontograma especifico por ID con todas sus condiciones
 * para mostrar en el historial de evolucion
 *
 * IMPORTANTE: Incluye el estado de evolucion desde evolution_odontogram
 * para mostrar tratamientos completados en azul
 */
const getOdontogramWithConditionsById = async (odontogramId) => {
  const odontogramQuery = `
    SELECT
      o.*,
      p.first_name || ' ' || p.last_name as patient_name,
      p.identification_number,
      p.birth_date,
      u.first_name || ' ' || u.last_name as dentist_name,
      d.professional_license as dentist_cop,
      b.branch_name
    FROM odontograms o
    INNER JOIN patients p ON o.patient_id = p.patient_id
    INNER JOIN dentists d ON o.dentist_id = d.dentist_id
    INNER JOIN users u ON d.user_id = u.user_id
    INNER JOIN branches b ON o.branch_id = b.branch_id
    WHERE o.odontogram_id = $1 AND o.status = 'active'
  `;

  const odontogramResult = await pool.query(odontogramQuery, [odontogramId]);

  if (odontogramResult.rows.length === 0) {
    return null;
  }

  const odontogram = odontogramResult.rows[0];
  const patientId = odontogram.patient_id;

  // Obtener las condiciones CON estado de evolucion desde evolution_odontogram
  const conditionsQuery = `
    SELECT
      oc.*,
      CASE
        WHEN LENGTH(tp.tooth_number) = 2
        THEN SUBSTRING(tp.tooth_number, 1, 1) || '.' || SUBSTRING(tp.tooth_number, 2, 1)
        ELSE tp.tooth_number
      END as tooth_number,
      tp.tooth_name,
      tp.quadrant,
      tp.tooth_type,
      tp.is_adult,
      ts.surface_code,
      ts.surface_name,
      odc.condition_name,
      odc.condition_code as dental_condition_code,
      odc.category as condition_category,
      -- Precio del primer procedimiento (FUENTE ÚNICA DE VERDAD)
      (
        SELECT COALESCE(ocp_price.price_without_plan, 0)
        FROM odontogram_condition_procedures ocp_price
        WHERE ocp_price.odontogram_condition_id = oc.dental_condition_id
        AND ocp_price.status = 'active'
        ORDER BY ocp_price.display_order, ocp_price.condition_procedure_id
        LIMIT 1
      ) as config_price_base,
      odc.symbol_type,
      -- Determinar color_type basado en evolution_odontogram
      CASE
        WHEN eo.condition_status = 'completed' THEN 'blue'
        WHEN eo.condition_status = 'in_progress' THEN 'yellow'
        ELSE odc.color_type
      END as color_type,
      odc.fill_surfaces,
      odc.abbreviation,
      -- Diente conectado (para prótesis, aparatos, transposición)
      CASE
        WHEN LENGTH(ctp.tooth_number) = 2
        THEN SUBSTRING(ctp.tooth_number, 1, 1) || '.' || SUBSTRING(ctp.tooth_number, 2, 1)
        ELSE ctp.tooth_number
      END as connected_tooth_number,
      -- Campos adicionales de evolucion
      eo.evolution_id,
      eo.condition_status as evolution_status,
      eo.clinical_observation as evolution_observation,
      eo.registered_date as evolution_date,
      eo.procedure_history_id,
      eo.income_id
    FROM odontogram_conditions oc
    INNER JOIN tooth_positions tp ON oc.tooth_position_id = tp.tooth_position_id
    LEFT JOIN tooth_surfaces ts ON oc.tooth_surface_id = ts.tooth_surface_id
    LEFT JOIN odontogram_dental_conditions odc ON oc.dental_condition_id = odc.condition_id
    LEFT JOIN tooth_positions ctp ON oc.connected_tooth_position_id = ctp.tooth_position_id
    -- LEFT JOIN con evolution_odontogram para obtener estado actualizado
    LEFT JOIN LATERAL (
      SELECT
        evo.evolution_id,
        evo.condition_status,
        evo.clinical_observation,
        evo.registered_date,
        evo.procedure_history_id,
        evo.income_id
      FROM evolution_odontogram evo
      WHERE evo.patient_id = $2
        AND evo.tooth_position_id = oc.tooth_position_id
        AND (
          (evo.tooth_surface_id IS NOT NULL AND oc.tooth_surface_id IS NOT NULL AND evo.tooth_surface_id = oc.tooth_surface_id)
          OR
          (evo.original_condition_id IS NOT NULL AND evo.original_condition_id = oc.dental_condition_id)
          OR
          (evo.tooth_surface_id IS NULL AND oc.tooth_surface_id IS NULL)
        )
        AND evo.status = 'active'
      ORDER BY evo.registered_date DESC
      LIMIT 1
    ) eo ON true
    WHERE oc.odontogram_id = $1 AND oc.status = 'active'
    ORDER BY tp.tooth_number ASC, oc.condition_id ASC
  `;

  const conditionsResult = await pool.query(conditionsQuery, [odontogramId, patientId]);

  return {
    ...odontogram,
    conditions: conditionsResult.rows
  };
};

/**
 * Actualizar el precio personalizado de todas las condiciones de un diente
 * @param {number} odontogramId - ID del odontograma
 * @param {string} toothNumber - Número del diente (ej: "1.8", "2.1")
 * @param {number} customPrice - Precio personalizado del diente
 * @param {number} userId - ID del usuario que hace el cambio
 */
const updateToothCustomPrice = async (odontogramId, toothNumber, customPrice, userId) => {
  // Primero obtenemos el tooth_position_id basado en el toothNumber
  const positionQuery = `
    SELECT tooth_position_id FROM tooth_positions
    WHERE tooth_number = $1
  `;
  const positionResult = await pool.query(positionQuery, [toothNumber]);

  if (positionResult.rows.length === 0) {
    throw new Error(`Posición de diente no encontrada: ${toothNumber}`);
  }

  const toothPositionId = positionResult.rows[0].tooth_position_id;

  // Actualizamos el custom_tooth_price de todas las condiciones del diente
  const updateQuery = `
    UPDATE odontogram_conditions
    SET
      custom_tooth_price = $1,
      user_id_modification = $2,
      date_time_modification = CURRENT_TIMESTAMP
    WHERE odontogram_id = $3
      AND tooth_position_id = $4
      AND status = 'active'
    RETURNING *
  `;

  const result = await pool.query(updateQuery, [
    customPrice,
    userId,
    odontogramId,
    toothPositionId
  ]);

  return {
    updatedCount: result.rowCount,
    toothNumber,
    customPrice,
    conditions: result.rows
  };
};

module.exports = {
  getAllOdontograms,
  getOdontogramById,
  createOdontogram,
  updateOdontogram,
  deleteOdontogram,
  countOdontograms,
  addCondition,
  deleteCondition,
  addTreatment,
  deleteTreatment,
  // Nuevas funciones para integración relacional
  getCurrentOdontogramByPatient,
  saveConditionsBatch,
  getConditionsByOdontogram,
  upsertOdontogramWithConditions,
  getAllToothPositions,
  getAllToothSurfaces,
  // Funciones para vista de paciente con tabs
  getPatientOdontogramsWithHistory,
  getOdontogramWithConditionsById,
  // Función para precio personalizado del diente
  updateToothCustomPrice
};
