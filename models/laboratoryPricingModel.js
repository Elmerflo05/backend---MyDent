/**
 * Modelo para gestión de precios de servicios de laboratorio (Tomografía 3D y Radiografías)
 *
 * Este modelo permite almacenar y recuperar la configuración de precios
 * que el SuperAdministrador define para los servicios de imágenes.
 */

const pool = require('../config/db');

// Valores por defecto para Tomografía 3D (16 campos)
const DEFAULT_TOMOGRAFIA3D_PRICING = {
  // Tipo de Entrega
  conInforme: 150,
  sinInforme: 100,
  dicom: 50,
  soloUsb: 30,
  // Campo Pequeño
  endodoncia: 80,
  fracturaRadicular: 75,
  anatomiaEndodontica: 85,
  // Campo Mediano
  localizacionDiente: 100,
  implantes: 120,
  maxilarSuperior: 110,
  // Campo Mediano/Grande
  viaAerea: 150,
  ortognatica: 160,
  // Ortodoncia
  marpe: 140,
  miniImplantes: 130,
  // Otras Opciones
  atm: 125,
  macizoFacial: 135
};

// Valores por defecto para Radiografías (expandido para incluir campos del UI)
const DEFAULT_RADIOGRAFIAS_PRICING = {
  // Intraorales - Periapical
  periapicalFisico: 50,
  periapicalDigital: 20,

  // Bitewing - Legacy
  bitewingAmbos: 60,
  bitewingDerecho: 35,
  bitewingIzquierdo: 35,
  // Bitewing - Campos nuevos UI
  bitewingMolares: 35,
  bitewingPremolares: 35,

  // Oclusal
  oclusalSuperiores: 40,
  oclusalInferiores: 40,

  // Otras Intraorales
  seriada: 280,
  radiografias: 50,
  // Fotografias - Campos nuevos UI
  fotografiaIntraoral: 30,
  fotografiaExtraoral: 30,

  // Extraorales - Legacy
  halografiaPanoramica: 80,
  halografiaLateral: 70,
  halografiaPosterior: 75,
  estudiosAtm: 120,
  radiografiaCefalometrica: 90,
  // Extraorales - Campos nuevos UI
  panoramica: 80,
  cefalometrica: 90,
  carpal: 70,
  posteriorAnterior: 75,
  atmAbierta: 60,
  atmCerrada: 60,

  // Asesoría Ortodoncia - Paquete 1
  paq1ConAsesoria: 400,
  paq1SinAsesoria: 350,
  // Asesoría Ortodoncia - Paquete 2
  paq2ConAsesoria: 300,
  paq2SinAsesoria: 250,
  // Asesoría Ortodoncia - Paquete 3
  paq3ConAsesoria: 450,
  paq3SinAsesoria: 400,

  // Servicios Adicionales - Legacy
  alteracionesInmediatas: 50,
  escaneoImpresionDigital: 80,
  modelosEstudio3d: 100,
  // Servicios Adicionales - Campos nuevos UI
  alineadores: 150,
  escaneoIntraoral: 80,
  modelosDigitales: 100,

  // Análisis Cefalométricos - Legacy
  ricketts: 50,
  powell: 50,
  nordEstelametal: 50,
  steinerBianco: 50,
  steiner: 50,
  bjork: 50,
  mcNamara: 50,
  usp: 50,
  especificarOtros: 50,
  // Análisis Cefalométricos - Campos nuevos UI
  schwartz: 50,
  tweed: 50,
  downs: 50,
  bjorks: 50,
  rotJarabak: 50,
  tejidosBlancos: 50
};

/**
 * Obtener precios de Tomografía 3D
 */
const getTomografia3DPricing = async () => {
  const query = `
    SELECT pricing_data
    FROM laboratory_pricing
    WHERE pricing_type = 'tomografia3d' AND status = 'active'
    LIMIT 1
  `;

  const result = await pool.query(query);

  if (result.rows.length === 0) {
    // Si no existe, retornar valores por defecto
    return DEFAULT_TOMOGRAFIA3D_PRICING;
  }

  // Fusionar con defaults para asegurar que todos los campos existan
  return {
    ...DEFAULT_TOMOGRAFIA3D_PRICING,
    ...result.rows[0].pricing_data
  };
};

/**
 * Actualizar precios de Tomografía 3D
 */
const updateTomografia3DPricing = async (pricingData, userId) => {
  // Verificar si ya existe un registro
  const checkQuery = `
    SELECT pricing_id FROM laboratory_pricing
    WHERE pricing_type = 'tomografia3d'
    LIMIT 1
  `;
  const existingResult = await pool.query(checkQuery);

  if (existingResult.rows.length === 0) {
    // INSERT si no existe
    const insertQuery = `
      INSERT INTO laboratory_pricing (pricing_type, pricing_data, status, user_id_registration, date_time_registration)
      VALUES ('tomografia3d', $1, 'active', $2, CURRENT_TIMESTAMP)
      RETURNING *
    `;
    const result = await pool.query(insertQuery, [JSON.stringify(pricingData), userId]);
    return result.rows[0];
  } else {
    // UPDATE si existe
    const updateQuery = `
      UPDATE laboratory_pricing
      SET pricing_data = $1,
          user_id_modification = $2,
          date_time_modification = CURRENT_TIMESTAMP
      WHERE pricing_type = 'tomografia3d'
      RETURNING *
    `;
    const result = await pool.query(updateQuery, [JSON.stringify(pricingData), userId]);
    return result.rows[0];
  }
};

/**
 * Obtener precios de Radiografías
 */
const getRadiografiasPricing = async () => {
  const query = `
    SELECT pricing_data
    FROM laboratory_pricing
    WHERE pricing_type = 'radiografias' AND status = 'active'
    LIMIT 1
  `;

  const result = await pool.query(query);

  if (result.rows.length === 0) {
    // Si no existe, retornar valores por defecto
    return DEFAULT_RADIOGRAFIAS_PRICING;
  }

  // Fusionar con defaults para asegurar que todos los campos existan
  return {
    ...DEFAULT_RADIOGRAFIAS_PRICING,
    ...result.rows[0].pricing_data
  };
};

/**
 * Actualizar precios de Radiografías
 */
const updateRadiografiasPricing = async (pricingData, userId) => {
  // Verificar si ya existe un registro
  const checkQuery = `
    SELECT pricing_id FROM laboratory_pricing
    WHERE pricing_type = 'radiografias'
    LIMIT 1
  `;
  const existingResult = await pool.query(checkQuery);

  if (existingResult.rows.length === 0) {
    // INSERT si no existe
    const insertQuery = `
      INSERT INTO laboratory_pricing (pricing_type, pricing_data, status, user_id_registration, date_time_registration)
      VALUES ('radiografias', $1, 'active', $2, CURRENT_TIMESTAMP)
      RETURNING *
    `;
    const result = await pool.query(insertQuery, [JSON.stringify(pricingData), userId]);
    return result.rows[0];
  } else {
    // UPDATE si existe
    const updateQuery = `
      UPDATE laboratory_pricing
      SET pricing_data = $1,
          user_id_modification = $2,
          date_time_modification = CURRENT_TIMESTAMP
      WHERE pricing_type = 'radiografias'
      RETURNING *
    `;
    const result = await pool.query(updateQuery, [JSON.stringify(pricingData), userId]);
    return result.rows[0];
  }
};

/**
 * Obtener todos los precios (Tomografía + Radiografías)
 */
const getAllPricing = async () => {
  const tomografia3d = await getTomografia3DPricing();
  const radiografias = await getRadiografiasPricing();

  return {
    tomografia3d,
    radiografias
  };
};

module.exports = {
  getTomografia3DPricing,
  updateTomografia3DPricing,
  getRadiografiasPricing,
  updateRadiografiasPricing,
  getAllPricing,
  DEFAULT_TOMOGRAFIA3D_PRICING,
  DEFAULT_RADIOGRAFIAS_PRICING
};
