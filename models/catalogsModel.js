const pool = require('../config/db');

/**
 * MODELO DE CATÁLOGOS DEL ODONTOGRAMA
 * Maneja todos los catálogos maestros necesarios para el odontograma
 */

// ============================================================
// TOOTH SURFACES (Superficies Dentales)
// ============================================================

const getAllToothSurfaces = async () => {
  try {
    const result = await pool.query(`
      SELECT
        tooth_surface_id,
        surface_code,
        surface_name,
        description,
        status
      FROM tooth_surfaces
      WHERE status = 'active'
      ORDER BY tooth_surface_id
    `);
    return result.rows;
  } catch (error) {
    throw error;
  }
};

// ============================================================
// TOOTH POSITIONS (Posiciones Dentales)
// ============================================================

const getAllToothPositions = async (filters = {}) => {
  try {
    let query = `
      SELECT
        tooth_position_id,
        tooth_number,
        tooth_name,
        quadrant,
        tooth_type,
        is_adult,
        status
      FROM tooth_positions
      WHERE status = 'active'
    `;

    const conditions = [];
    const values = [];
    let paramCount = 1;

    // Filtro por tipo (adulto/niño)
    if (filters.is_adult !== undefined) {
      conditions.push(`is_adult = $${paramCount}`);
      values.push(filters.is_adult);
      paramCount++;
    }

    // Filtro por cuadrante
    if (filters.quadrant) {
      conditions.push(`quadrant = $${paramCount}`);
      values.push(filters.quadrant);
      paramCount++;
    }

    // Filtro por tipo de diente
    if (filters.tooth_type) {
      conditions.push(`tooth_type = $${paramCount}`);
      values.push(filters.tooth_type);
      paramCount++;
    }

    if (conditions.length > 0) {
      query += ' AND ' + conditions.join(' AND ');
    }

    query += ' ORDER BY tooth_number';

    const result = await pool.query(query, values);
    return result.rows;
  } catch (error) {
    throw error;
  }
};

const getToothPositionByNumber = async (toothNumber) => {
  try {
    const result = await pool.query(`
      SELECT
        tooth_position_id,
        tooth_number,
        tooth_name,
        quadrant,
        tooth_type,
        is_adult,
        status
      FROM tooth_positions
      WHERE tooth_number = $1 AND status = 'active'
    `, [toothNumber]);

    return result.rows[0];
  } catch (error) {
    throw error;
  }
};

// ============================================================
// TREATMENT STATUSES (Estados de Tratamiento)
// ============================================================

const getAllTreatmentStatuses = async () => {
  try {
    const result = await pool.query(`
      SELECT
        treatment_status_id,
        status_name,
        status_code,
        status_color,
        status
      FROM treatment_statuses
      WHERE status = 'active'
      ORDER BY treatment_status_id
    `);
    return result.rows;
  } catch (error) {
    throw error;
  }
};

// ============================================================
// DIAGNOSIS OPTIONS (Opciones de Diagnóstico/Condiciones)
// ============================================================

const getAllDiagnosisOptions = async (filters = {}) => {
  try {
    let query = `
      SELECT
        diagnosis_option_id,
        diagnosis_code,
        diagnosis_name,
        diagnosis_category,
        description,
        status
      FROM diagnosis_options
      WHERE status = 'active'
    `;

    const conditions = [];
    const values = [];
    let paramCount = 1;

    // Filtro por categoría
    if (filters.category) {
      conditions.push(`diagnosis_category = $${paramCount}`);
      values.push(filters.category);
      paramCount++;
    }

    // Búsqueda por nombre o código
    if (filters.search) {
      conditions.push(`(
        diagnosis_name ILIKE $${paramCount} OR
        diagnosis_code ILIKE $${paramCount} OR
        description ILIKE $${paramCount}
      )`);
      values.push(`%${filters.search}%`);
      paramCount++;
    }

    if (conditions.length > 0) {
      query += ' AND ' + conditions.join(' AND ');
    }

    query += ' ORDER BY diagnosis_category, diagnosis_name';

    const result = await pool.query(query, values);
    return result.rows;
  } catch (error) {
    throw error;
  }
};

const getDiagnosisOptionsByCategory = async () => {
  try {
    const result = await pool.query(`
      SELECT
        diagnosis_category,
        json_agg(
          json_build_object(
            'diagnosis_option_id', diagnosis_option_id,
            'diagnosis_code', diagnosis_code,
            'diagnosis_name', diagnosis_name,
            'description', description
          ) ORDER BY diagnosis_name
        ) as options
      FROM diagnosis_options
      WHERE status = 'active'
      GROUP BY diagnosis_category
      ORDER BY diagnosis_category
    `);
    return result.rows;
  } catch (error) {
    throw error;
  }
};

// ============================================================
// DENTAL PROCEDURES (Procedimientos Dentales)
// ============================================================

const getAllDentalProcedures = async (filters = {}) => {
  try {
    let query = `
      SELECT
        dental_procedure_id,
        procedure_code,
        procedure_name,
        procedure_category,
        description,
        default_price,
        estimated_duration,
        requires_anesthesia,
        status
      FROM dental_procedures
      WHERE status = 'active'
    `;

    const conditions = [];
    const values = [];
    let paramCount = 1;

    // Filtro por categoría
    if (filters.category) {
      conditions.push(`procedure_category = $${paramCount}`);
      values.push(filters.category);
      paramCount++;
    }

    // Búsqueda por nombre o código
    if (filters.search) {
      conditions.push(`(
        procedure_name ILIKE $${paramCount} OR
        procedure_code ILIKE $${paramCount} OR
        description ILIKE $${paramCount}
      )`);
      values.push(`%${filters.search}%`);
      paramCount++;
    }

    // Filtro por si requiere anestesia
    if (filters.requires_anesthesia !== undefined) {
      conditions.push(`requires_anesthesia = $${paramCount}`);
      values.push(filters.requires_anesthesia);
      paramCount++;
    }

    if (conditions.length > 0) {
      query += ' AND ' + conditions.join(' AND ');
    }

    query += ' ORDER BY procedure_category, procedure_name';

    const result = await pool.query(query, values);
    return result.rows;
  } catch (error) {
    throw error;
  }
};

const getDentalProceduresByCategory = async () => {
  try {
    const result = await pool.query(`
      SELECT
        procedure_category,
        json_agg(
          json_build_object(
            'dental_procedure_id', dental_procedure_id,
            'procedure_code', procedure_code,
            'procedure_name', procedure_name,
            'description', description,
            'default_price', default_price,
            'estimated_duration', estimated_duration,
            'requires_anesthesia', requires_anesthesia
          ) ORDER BY procedure_name
        ) as procedures
      FROM dental_procedures
      WHERE status = 'active'
      GROUP BY procedure_category
      ORDER BY procedure_category
    `);
    return result.rows;
  } catch (error) {
    throw error;
  }
};

// ============================================================
// ESTADÍSTICAS Y UTILIDADES
// ============================================================

const getCatalogStatistics = async () => {
  try {
    const result = await pool.query(`
      SELECT
        'tooth_surfaces' as catalog_name,
        COUNT(*) as total_records
      FROM tooth_surfaces
      WHERE status = 'active'

      UNION ALL

      SELECT
        'tooth_positions' as catalog_name,
        COUNT(*) as total_records
      FROM tooth_positions
      WHERE status = 'active'

      UNION ALL

      SELECT
        'treatment_statuses' as catalog_name,
        COUNT(*) as total_records
      FROM treatment_statuses
      WHERE status = 'active'

      UNION ALL

      SELECT
        'diagnosis_options' as catalog_name,
        COUNT(*) as total_records
      FROM diagnosis_options
      WHERE status = 'active'

      UNION ALL

      SELECT
        'dental_procedures' as catalog_name,
        COUNT(*) as total_records
      FROM dental_procedures
      WHERE status = 'active'

      ORDER BY catalog_name
    `);
    return result.rows;
  } catch (error) {
    throw error;
  }
};

module.exports = {
  // Tooth Surfaces
  getAllToothSurfaces,

  // Tooth Positions
  getAllToothPositions,
  getToothPositionByNumber,

  // Treatment Statuses
  getAllTreatmentStatuses,

  // Diagnosis Options
  getAllDiagnosisOptions,
  getDiagnosisOptionsByCategory,

  // Dental Procedures
  getAllDentalProcedures,
  getDentalProceduresByCategory,

  // Statistics
  getCatalogStatistics
};
