/**
 * Modelo para Resultados de Radiografías
 * Tabla: radiography_results
 */

const pool = require('../config/db');

/**
 * Crear un nuevo resultado de radiografía
 * @param {Object} resultData - Datos del resultado
 * @returns {Object} Resultado creado
 */
const createRadiographyResult = async (resultData) => {
  const {
    radiography_request_id,
    result_type,
    file_name,
    original_name,
    file_path,
    file_size,
    mime_type,
    external_url,
    uploaded_by
  } = resultData;

  const query = `
    INSERT INTO radiography_results (
      radiography_request_id,
      result_type,
      file_name,
      original_name,
      file_path,
      file_size,
      mime_type,
      external_url,
      uploaded_by,
      uploaded_at,
      status
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), 'active')
    RETURNING *
  `;

  const values = [
    radiography_request_id,
    result_type,
    file_name || null,
    original_name || null,
    file_path || null,
    file_size || null,
    mime_type || null,
    external_url || null,
    uploaded_by || null
  ];

  const result = await pool.query(query, values);
  return result.rows[0];
};

/**
 * Crear múltiples resultados de radiografía
 * @param {Array} resultsData - Array de datos de resultados
 * @returns {Array} Resultados creados
 */
const createMultipleRadiographyResults = async (resultsData) => {
  if (!resultsData || resultsData.length === 0) {
    return [];
  }

  const results = [];
  for (const resultData of resultsData) {
    const result = await createRadiographyResult(resultData);
    results.push(result);
  }

  return results;
};

/**
 * Obtener todos los resultados de una solicitud de radiografía
 * @param {number} radiographyRequestId - ID de la solicitud
 * @returns {Array} Lista de resultados
 */
const getResultsByRadiographyRequestId = async (radiographyRequestId) => {
  const query = `
    SELECT
      rr.*,
      u.first_name || ' ' || u.last_name AS uploader_name
    FROM radiography_results rr
    LEFT JOIN users u ON rr.uploaded_by = u.user_id
    WHERE rr.radiography_request_id = $1
      AND rr.status = 'active'
    ORDER BY rr.uploaded_at DESC
  `;

  const result = await pool.query(query, [radiographyRequestId]);
  return result.rows;
};

/**
 * Obtener un resultado por su ID
 * @param {number} resultId - ID del resultado
 * @returns {Object|null} Resultado o null si no existe
 */
const getRadiographyResultById = async (resultId) => {
  const query = `
    SELECT
      rr.*,
      u.first_name || ' ' || u.last_name AS uploader_name
    FROM radiography_results rr
    LEFT JOIN users u ON rr.uploaded_by = u.user_id
    WHERE rr.result_id = $1
      AND rr.status = 'active'
  `;

  const result = await pool.query(query, [resultId]);
  return result.rows[0] || null;
};

/**
 * Eliminar un resultado (soft delete)
 * @param {number} resultId - ID del resultado
 * @returns {boolean} true si se eliminó
 */
const deleteRadiographyResult = async (resultId) => {
  const query = `
    UPDATE radiography_results
    SET status = 'deleted'
    WHERE result_id = $1
    RETURNING *
  `;

  const result = await pool.query(query, [resultId]);
  return result.rowCount > 0;
};

/**
 * Eliminar todos los resultados de una solicitud (soft delete)
 * @param {number} radiographyRequestId - ID de la solicitud
 * @returns {number} Número de resultados eliminados
 */
const deleteResultsByRadiographyRequestId = async (radiographyRequestId) => {
  const query = `
    UPDATE radiography_results
    SET status = 'deleted'
    WHERE radiography_request_id = $1
    RETURNING *
  `;

  const result = await pool.query(query, [radiographyRequestId]);
  return result.rowCount;
};

/**
 * Contar resultados por tipo para una solicitud
 * @param {number} radiographyRequestId - ID de la solicitud
 * @returns {Object} Conteo por tipo
 */
const countResultsByType = async (radiographyRequestId) => {
  const query = `
    SELECT
      result_type,
      COUNT(*) as count
    FROM radiography_results
    WHERE radiography_request_id = $1
      AND status = 'active'
    GROUP BY result_type
  `;

  const result = await pool.query(query, [radiographyRequestId]);

  const counts = {
    image: 0,
    document: 0,
    external_link: 0,
    total: 0
  };

  for (const row of result.rows) {
    counts[row.result_type] = parseInt(row.count);
    counts.total += parseInt(row.count);
  }

  return counts;
};

module.exports = {
  createRadiographyResult,
  createMultipleRadiographyResults,
  getResultsByRadiographyRequestId,
  getRadiographyResultById,
  deleteRadiographyResult,
  deleteResultsByRadiographyRequestId,
  countResultsByType
};
