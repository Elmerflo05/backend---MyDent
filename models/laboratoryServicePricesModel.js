/**
 * Modelo: Laboratory Service Prices
 *
 * Maneja los precios de servicios de laboratorio desde la tabla normalizada.
 * Reemplaza el almacenamiento JSONB anterior por filas individuales.
 *
 * Categorías:
 * - tomografia3d: 16 servicios
 * - radiografias: 32 servicios
 */

const pool = require('../config/db');

/**
 * Obtiene todos los precios de servicios activos
 * @param {Object} filters - Filtros opcionales
 * @returns {Promise<Array>} Lista de servicios con precios
 */
const getAllServicePrices = async (filters = {}) => {
  const { category, subcategory, isActive = true } = filters;

  let query = `
    SELECT
      service_price_id,
      service_code,
      service_name,
      service_category,
      service_subcategory,
      base_price,
      currency,
      has_quantity,
      quantity_unit,
      has_options,
      options_config,
      legacy_field_name,
      description,
      help_text,
      is_active,
      display_order
    FROM laboratory_service_prices
    WHERE 1=1
  `;

  const params = [];
  let paramIndex = 1;

  if (isActive !== null) {
    query += ` AND is_active = $${paramIndex}`;
    params.push(isActive);
    paramIndex++;
  }

  if (category) {
    query += ` AND service_category = $${paramIndex}`;
    params.push(category);
    paramIndex++;
  }

  if (subcategory) {
    query += ` AND service_subcategory = $${paramIndex}`;
    params.push(subcategory);
    paramIndex++;
  }

  query += ' ORDER BY display_order ASC, service_name ASC';

  const result = await pool.query(query, params);
  return result.rows;
};

/**
 * Obtiene servicios por categoría
 * @param {string} category - 'tomografia3d' | 'radiografias'
 * @returns {Promise<Array>} Lista de servicios de la categoría
 */
const getServicePricesByCategory = async (category) => {
  const query = `
    SELECT
      service_price_id,
      service_code,
      service_name,
      service_category,
      service_subcategory,
      base_price,
      currency,
      has_quantity,
      quantity_unit,
      has_options,
      options_config,
      legacy_field_name,
      description,
      display_order
    FROM laboratory_service_prices
    WHERE service_category = $1 AND is_active = true
    ORDER BY display_order ASC
  `;

  const result = await pool.query(query, [category]);
  return result.rows;
};

/**
 * Obtiene un servicio por su código
 * @param {string} serviceCode - Código único del servicio
 * @returns {Promise<Object|null>} Servicio encontrado o null
 */
const getServicePriceByCode = async (serviceCode) => {
  const query = `
    SELECT *
    FROM laboratory_service_prices
    WHERE service_code = $1
  `;

  const result = await pool.query(query, [serviceCode]);
  return result.rows[0] || null;
};

/**
 * Obtiene un servicio por su campo legacy (para compatibilidad)
 * @param {string} legacyFieldName - Nombre del campo legacy (ej: 'conInforme')
 * @returns {Promise<Object|null>} Servicio encontrado o null
 */
const getServicePriceByLegacyField = async (legacyFieldName) => {
  const query = `
    SELECT *
    FROM laboratory_service_prices
    WHERE legacy_field_name = $1
  `;

  const result = await pool.query(query, [legacyFieldName]);
  return result.rows[0] || null;
};

/**
 * Obtiene precios de Tomografía 3D en formato legacy (para compatibilidad)
 * @returns {Promise<Object>} Objeto con precios en formato {campo: precio}
 */
const getTomografia3DPricingLegacy = async () => {
  const services = await getServicePricesByCategory('tomografia3d');

  const pricing = {};
  for (const service of services) {
    if (service.legacy_field_name) {
      pricing[service.legacy_field_name] = parseFloat(service.base_price);
    }
  }

  return pricing;
};

/**
 * Obtiene precios de Radiografías en formato legacy (para compatibilidad)
 * @returns {Promise<Object>} Objeto con precios en formato {campo: precio}
 */
const getRadiografiasPricingLegacy = async () => {
  const services = await getServicePricesByCategory('radiografias');

  const pricing = {};
  for (const service of services) {
    if (service.legacy_field_name) {
      pricing[service.legacy_field_name] = parseFloat(service.base_price);
    }
  }

  return pricing;
};

/**
 * Obtiene todos los precios en formato legacy (para compatibilidad total)
 * @returns {Promise<Object>} { tomografia3d: {...}, radiografias: {...} }
 */
const getAllPricingLegacy = async () => {
  const [tomografia3d, radiografias] = await Promise.all([
    getTomografia3DPricingLegacy(),
    getRadiografiasPricingLegacy()
  ]);

  return { tomografia3d, radiografias };
};

/**
 * Actualiza el precio de un servicio específico
 * @param {number} servicePriceId - ID del servicio
 * @param {Object} data - Datos a actualizar
 * @param {number} userId - ID del usuario que modifica
 * @returns {Promise<Object>} Servicio actualizado
 */
const updateServicePrice = async (servicePriceId, data, userId) => {
  const { base_price, description, help_text, is_active, options_config } = data;

  const query = `
    UPDATE laboratory_service_prices
    SET
      base_price = COALESCE($1, base_price),
      description = COALESCE($2, description),
      help_text = COALESCE($3, help_text),
      is_active = COALESCE($4, is_active),
      options_config = COALESCE($5, options_config),
      user_id_modification = $6,
      date_time_modification = NOW()
    WHERE service_price_id = $7
    RETURNING *
  `;

  const result = await pool.query(query, [
    base_price,
    description,
    help_text,
    is_active,
    options_config ? JSON.stringify(options_config) : null,
    userId,
    servicePriceId
  ]);

  return result.rows[0];
};

/**
 * Actualiza el precio de un servicio por su código
 * @param {string} serviceCode - Código del servicio
 * @param {number} newPrice - Nuevo precio
 * @param {number} userId - ID del usuario que modifica
 * @returns {Promise<Object>} Servicio actualizado
 */
const updatePriceByCode = async (serviceCode, newPrice, userId) => {
  const query = `
    UPDATE laboratory_service_prices
    SET
      base_price = $1,
      user_id_modification = $2,
      date_time_modification = NOW()
    WHERE service_code = $3
    RETURNING *
  `;

  const result = await pool.query(query, [newPrice, userId, serviceCode]);
  return result.rows[0];
};

/**
 * Actualiza el precio de un servicio por su campo legacy
 * @param {string} legacyFieldName - Nombre del campo legacy
 * @param {number} newPrice - Nuevo precio
 * @param {number} userId - ID del usuario que modifica
 * @returns {Promise<Object>} Servicio actualizado
 */
const updatePriceByLegacyField = async (legacyFieldName, newPrice, userId) => {
  const query = `
    UPDATE laboratory_service_prices
    SET
      base_price = $1,
      user_id_modification = $2,
      date_time_modification = NOW()
    WHERE legacy_field_name = $3
    RETURNING *
  `;

  const result = await pool.query(query, [newPrice, userId, legacyFieldName]);
  return result.rows[0];
};

/**
 * Actualiza múltiples precios de Tomografía 3D (formato legacy)
 * @param {Object} pricingData - Objeto {campo: precio}
 * @param {number} userId - ID del usuario que modifica
 * @returns {Promise<Object>} Precios actualizados
 */
const updateTomografia3DPricingBulk = async (pricingData, userId) => {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    for (const [fieldName, price] of Object.entries(pricingData)) {
      if (typeof price === 'number' && price >= 0) {
        await client.query(`
          UPDATE laboratory_service_prices
          SET
            base_price = $1,
            user_id_modification = $2,
            date_time_modification = NOW()
          WHERE legacy_field_name = $3 AND service_category = 'tomografia3d'
        `, [price, userId, fieldName]);
      }
    }

    await client.query('COMMIT');

    // Retornar precios actualizados
    return await getTomografia3DPricingLegacy();
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

/**
 * Actualiza múltiples precios de Radiografías (formato legacy)
 * @param {Object} pricingData - Objeto {campo: precio}
 * @param {number} userId - ID del usuario que modifica
 * @returns {Promise<Object>} Precios actualizados
 */
const updateRadiografiasPricingBulk = async (pricingData, userId) => {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    for (const [fieldName, price] of Object.entries(pricingData)) {
      if (typeof price === 'number' && price >= 0) {
        await client.query(`
          UPDATE laboratory_service_prices
          SET
            base_price = $1,
            user_id_modification = $2,
            date_time_modification = NOW()
          WHERE legacy_field_name = $3 AND service_category = 'radiografias'
        `, [price, userId, fieldName]);
      }
    }

    await client.query('COMMIT');

    // Retornar precios actualizados
    return await getRadiografiasPricingLegacy();
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

/**
 * Obtiene servicios agrupados por subcategoría
 * @param {string} category - 'tomografia3d' | 'radiografias'
 * @returns {Promise<Object>} Servicios agrupados {subcategoria: [servicios]}
 */
const getServicePricesGroupedBySubcategory = async (category) => {
  const services = await getServicePricesByCategory(category);

  const grouped = {};
  for (const service of services) {
    const subcat = service.service_subcategory || 'otros';
    if (!grouped[subcat]) {
      grouped[subcat] = [];
    }
    grouped[subcat].push(service);
  }

  return grouped;
};

/**
 * Cuenta servicios por categoría
 * @returns {Promise<Object>} {tomografia3d: N, radiografias: M, total: N+M}
 */
const countServicesByCategory = async () => {
  const query = `
    SELECT
      service_category,
      COUNT(*) as count
    FROM laboratory_service_prices
    WHERE is_active = true
    GROUP BY service_category
  `;

  const result = await pool.query(query);

  const counts = {
    tomografia3d: 0,
    radiografias: 0,
    total: 0
  };

  for (const row of result.rows) {
    counts[row.service_category] = parseInt(row.count);
    counts.total += parseInt(row.count);
  }

  return counts;
};

module.exports = {
  // Consultas generales
  getAllServicePrices,
  getServicePricesByCategory,
  getServicePriceByCode,
  getServicePriceByLegacyField,
  getServicePricesGroupedBySubcategory,
  countServicesByCategory,

  // Formato legacy (compatibilidad con frontend actual)
  getTomografia3DPricingLegacy,
  getRadiografiasPricingLegacy,
  getAllPricingLegacy,

  // Actualizaciones
  updateServicePrice,
  updatePriceByCode,
  updatePriceByLegacyField,
  updateTomografia3DPricingBulk,
  updateRadiografiasPricingBulk
};
