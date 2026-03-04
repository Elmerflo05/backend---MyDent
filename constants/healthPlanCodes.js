/**
 * Health Plan Codes - Constantes centralizadas
 * Single Source of Truth para códigos de planes de salud
 *
 * IMPORTANTE: Los plan_codes en la base de datos deben estar normalizados a lowercase
 * Los valores canónicos son: 'personal', 'familiar', 'platinium', 'oro'
 */

// Códigos canónicos de planes (lowercase)
const PLAN_CODES = {
  PERSONAL: 'personal',
  FAMILIAR: 'familiar',
  PLATINIUM: 'platinium',
  ORO: 'oro'
};

// Mapeo de códigos legacy/variantes a códigos canónicos
// Esto permite compatibilidad con datos existentes durante la migración
const LEGACY_PLAN_CODE_MAP = {
  // Formato actual en BD (uppercase sin prefijo) - LEGACY
  'PERSONAL': PLAN_CODES.PERSONAL,
  'FAMILIAR': PLAN_CODES.FAMILIAR,
  'PLANITIUM': PLAN_CODES.PLATINIUM, // Typo en seed.js original
  'GOLD': PLAN_CODES.ORO,

  // Formato con prefijo PLAN_ (usado incorrectamente en código anterior)
  'PLAN_PERSONAL': PLAN_CODES.PERSONAL,
  'PLAN_FAMILIAR': PLAN_CODES.FAMILIAR,
  'PLAN_PLATINIUM': PLAN_CODES.PLATINIUM,
  'PLAN_ORO': PLAN_CODES.ORO,

  // Formato canónico (lowercase) - TARGET
  'personal': PLAN_CODES.PERSONAL,
  'familiar': PLAN_CODES.FAMILIAR,
  'platinium': PLAN_CODES.PLATINIUM,
  'oro': PLAN_CODES.ORO
};

// Mapeo de código de plan a columna de precio en la BD
const PLAN_CODE_TO_PRICE_COLUMN = {
  [PLAN_CODES.PERSONAL]: 'price_plan_personal',
  [PLAN_CODES.FAMILIAR]: 'price_plan_familiar',
  [PLAN_CODES.PLATINIUM]: 'price_plan_platinium',
  [PLAN_CODES.ORO]: 'price_plan_oro'
};

/**
 * Normaliza un código de plan a su formato canónico (lowercase)
 * @param {string|null|undefined} planCode - Código de plan en cualquier formato
 * @returns {string|null} - Código normalizado o null si no es válido
 */
const normalizePlanCode = (planCode) => {
  if (!planCode) return null;

  const code = String(planCode).trim();

  // Buscar en el mapeo de códigos legacy
  if (LEGACY_PLAN_CODE_MAP[code]) {
    return LEGACY_PLAN_CODE_MAP[code];
  }

  // Intentar con lowercase
  const lowerCode = code.toLowerCase();
  if (LEGACY_PLAN_CODE_MAP[lowerCode]) {
    return LEGACY_PLAN_CODE_MAP[lowerCode];
  }

  // Si no se encuentra, retornar null
  return null;
};

/**
 * Obtiene la columna de precio para un código de plan
 * @param {string|null|undefined} planCode - Código de plan en cualquier formato
 * @returns {string|null} - Nombre de la columna de precio o null
 */
const getPriceColumnForPlan = (planCode) => {
  const normalizedCode = normalizePlanCode(planCode);
  if (!normalizedCode) return null;

  return PLAN_CODE_TO_PRICE_COLUMN[normalizedCode] || null;
};

/**
 * Verifica si un código de plan es válido
 * @param {string|null|undefined} planCode - Código de plan a verificar
 * @returns {boolean}
 */
const isValidPlanCode = (planCode) => {
  return normalizePlanCode(planCode) !== null;
};

/**
 * Obtiene todos los códigos de plan válidos (canónicos)
 * @returns {string[]}
 */
const getAllPlanCodes = () => {
  return Object.values(PLAN_CODES);
};

module.exports = {
  PLAN_CODES,
  LEGACY_PLAN_CODE_MAP,
  PLAN_CODE_TO_PRICE_COLUMN,
  normalizePlanCode,
  getPriceColumnForPlan,
  isValidPlanCode,
  getAllPlanCodes
};
