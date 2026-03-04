/**
 * @file promotions.js
 * @description Tipos y validadores para el sistema de promociones
 *
 * Este archivo define la estructura de datos para promociones,
 * incluyendo la configuración de applicable_procedures que determina
 * a qué procedimientos dentales aplica cada promoción.
 */

/**
 * @typedef {Object} ConditionFilter
 * @property {number[]} [ids] - IDs específicos de odontogram_dental_conditions
 * @property {string[]} [codes] - Códigos específicos (ej: ["caries-cd", "fractura"])
 */

/**
 * @typedef {Object} SubProcedureFilter
 * @property {number[]} [ids] - IDs específicos de sub_procedures
 * @property {string[]} [codes] - Códigos específicos (ej: ["PI003", "EN006"])
 */

/**
 * @typedef {Object} CustomItemsConfig
 * @property {boolean} allow - Permitir aplicar a items personalizados
 * @property {string[]} [categories] - Categorías específicas de items personalizados
 */

/**
 * @typedef {Object} ExclusionConfig
 * @property {number[]} [condition_ids] - IDs de conditions a excluir
 * @property {string[]} [condition_codes] - Códigos de conditions a excluir
 * @property {number[]} [sub_procedure_ids] - IDs de sub-procedures a excluir
 * @property {string[]} [sub_procedure_codes] - Códigos de sub-procedures a excluir
 */

/**
 * @typedef {Object} ApplicableProcedures
 * @property {'all'|'specific'|'category_based'|'mixed'} type - Tipo de aplicación
 * @property {ConditionFilter} [conditions] - Filtros para conditions
 * @property {SubProcedureFilter} [sub_procedures] - Filtros para sub-procedures
 * @property {string[]} [categories] - Categorías de conditions (ej: ["patologia", "protesis"])
 * @property {string[]} [specialties] - Especialidades de sub-procedures
 * @property {CustomItemsConfig} [custom_items] - Configuración para items personalizados
 * @property {ExclusionConfig} [exclude] - Procedimientos a excluir
 */

/**
 * Valida la estructura de applicable_procedures
 * @param {ApplicableProcedures} config - Configuración a validar
 * @returns {{valid: boolean, errors: string[]}}
 */
function validateApplicableProcedures(config) {
  const errors = [];

  // Validar que exista el campo type
  if (!config || typeof config !== 'object') {
    return { valid: false, errors: ['La configuración debe ser un objeto'] };
  }

  if (!config.type) {
    errors.push('El campo "type" es requerido');
  }

  const validTypes = ['all', 'specific', 'category_based', 'mixed'];
  if (config.type && !validTypes.includes(config.type)) {
    errors.push(`El tipo "${config.type}" no es válido. Debe ser uno de: ${validTypes.join(', ')}`);
  }

  // Validaciones específicas por tipo
  if (config.type === 'specific') {
    const hasConditions = config.conditions?.ids?.length > 0 || config.conditions?.codes?.length > 0;
    const hasSubProcedures = config.sub_procedures?.ids?.length > 0 || config.sub_procedures?.codes?.length > 0;

    if (!hasConditions && !hasSubProcedures) {
      errors.push('Para tipo "specific" se requiere al menos un filtro de conditions o sub_procedures');
    }
  }

  if (config.type === 'category_based') {
    const hasCategories = config.categories?.length > 0;
    const hasSpecialties = config.specialties?.length > 0;

    if (!hasCategories && !hasSpecialties) {
      errors.push('Para tipo "category_based" se requiere al menos categories o specialties');
    }
  }

  // Validar arrays si existen
  const arrayFields = [
    { path: 'conditions.ids', type: 'number' },
    { path: 'conditions.codes', type: 'string' },
    { path: 'sub_procedures.ids', type: 'number' },
    { path: 'sub_procedures.codes', type: 'string' },
    { path: 'categories', type: 'string' },
    { path: 'specialties', type: 'string' },
    { path: 'custom_items.categories', type: 'string' },
    { path: 'exclude.condition_ids', type: 'number' },
    { path: 'exclude.condition_codes', type: 'string' },
    { path: 'exclude.sub_procedure_ids', type: 'number' },
    { path: 'exclude.sub_procedure_codes', type: 'string' }
  ];

  arrayFields.forEach(({ path, type }) => {
    const value = getNestedValue(config, path);
    if (value !== undefined) {
      if (!Array.isArray(value)) {
        errors.push(`El campo "${path}" debe ser un array`);
      } else if (value.length > 0 && typeof value[0] !== type) {
        errors.push(`El campo "${path}" debe contener valores de tipo ${type}`);
      }
    }
  });

  // Validar custom_items.allow si existe
  if (config.custom_items && typeof config.custom_items.allow !== 'boolean') {
    errors.push('El campo "custom_items.allow" debe ser un boolean');
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Obtiene un valor anidado de un objeto usando path notation
 * @param {Object} obj - Objeto fuente
 * @param {string} path - Path con notación de punto (ej: "conditions.ids")
 * @returns {*} Valor encontrado o undefined
 */
function getNestedValue(obj, path) {
  return path.split('.').reduce((current, key) => current?.[key], obj);
}

/**
 * Verifica si un procedimiento aplica para una promoción
 * @param {ApplicableProcedures} config - Configuración de applicable_procedures
 * @param {Object} item - Item del tratamiento con sus relaciones cargadas
 * @param {'condition'|'sub_procedure'|'custom'} itemType - Tipo de item
 * @returns {boolean} - True si aplica la promoción
 */
function isProcedureApplicable(config, item, itemType) {
  // Validar configuración
  const validation = validateApplicableProcedures(config);
  if (!validation.valid) {
    console.error('Configuración de promoción inválida:', validation.errors);
    return false;
  }

  // Caso 1: Aplica a todos
  if (config.type === 'all') {
    return !isExcluded(config.exclude, item, itemType);
  }

  // Caso 2: Procedimientos específicos
  if (config.type === 'specific') {
    return matchesSpecific(config, item, itemType) && !isExcluded(config.exclude, item, itemType);
  }

  // Caso 3: Por categoría/especialidad
  if (config.type === 'category_based') {
    return matchesCategory(config, item, itemType) && !isExcluded(config.exclude, item, itemType);
  }

  // Caso 4: Mixto
  if (config.type === 'mixed') {
    const matchesAny = matchesSpecific(config, item, itemType) || matchesCategory(config, item, itemType);
    return matchesAny && !isExcluded(config.exclude, item, itemType);
  }

  return false;
}

/**
 * Verifica si un item coincide con filtros específicos (IDs o códigos)
 * @param {ApplicableProcedures} config - Configuración
 * @param {Object} item - Item del tratamiento
 * @param {string} itemType - Tipo de item
 * @returns {boolean}
 */
function matchesSpecific(config, item, itemType) {
  if (itemType === 'condition') {
    const condition = item.odontogram_dental_conditions;
    if (!condition) return false;

    const matchesId = config.conditions?.ids?.includes(condition.condition_id);
    const matchesCode = config.conditions?.codes?.includes(condition.condition_code);

    return matchesId || matchesCode || false;
  }

  if (itemType === 'sub_procedure') {
    const subProc = item.sub_procedures;
    if (!subProc) return false;

    const matchesId = config.sub_procedures?.ids?.includes(subProc.sub_procedure_id);
    const matchesCode = config.sub_procedures?.codes?.includes(subProc.sub_procedure_code);

    return matchesId || matchesCode || false;
  }

  if (itemType === 'custom') {
    // Los items personalizados solo aplican si está configurado allow: true
    return false;
  }

  return false;
}

/**
 * Verifica si un item coincide con categorías o especialidades
 * @param {ApplicableProcedures} config - Configuración
 * @param {Object} item - Item del tratamiento
 * @param {string} itemType - Tipo de item
 * @returns {boolean}
 */
function matchesCategory(config, item, itemType) {
  if (itemType === 'condition') {
    const condition = item.odontogram_dental_conditions;
    if (!condition) return false;

    return config.categories?.includes(condition.category) || false;
  }

  if (itemType === 'sub_procedure') {
    const subProc = item.sub_procedures;
    if (!subProc) return false;

    return config.specialties?.includes(subProc.specialty) || false;
  }

  if (itemType === 'custom') {
    // Items personalizados solo aplican si está configurado
    if (!config.custom_items?.allow) return false;

    // Si no hay filtro de categorías, aplica a todos los custom items
    if (!config.custom_items.categories || config.custom_items.categories.length === 0) {
      return true;
    }

    // Si hay filtro, verificar que coincida
    return item.item_category && config.custom_items.categories.includes(item.item_category);
  }

  return false;
}

/**
 * Verifica si un procedimiento está excluido
 * @param {ExclusionConfig} exclude - Configuración de exclusiones
 * @param {Object} item - Item del tratamiento
 * @param {string} itemType - Tipo de item
 * @returns {boolean}
 */
function isExcluded(exclude, item, itemType) {
  if (!exclude) return false;

  if (itemType === 'condition') {
    const condition = item.odontogram_dental_conditions;
    if (!condition) return false;

    const excludedById = exclude.condition_ids?.includes(condition.condition_id);
    const excludedByCode = exclude.condition_codes?.includes(condition.condition_code);

    return excludedById || excludedByCode || false;
  }

  if (itemType === 'sub_procedure') {
    const subProc = item.sub_procedures;
    if (!subProc) return false;

    const excludedById = exclude.sub_procedure_ids?.includes(subProc.sub_procedure_id);
    const excludedByCode = exclude.sub_procedure_codes?.includes(subProc.sub_procedure_code);

    return excludedById || excludedByCode || false;
  }

  return false;
}

/**
 * Calcula el monto de descuento para un item
 * @param {Object} promotion - Promoción con discount_type y discount_value
 * @param {number} subtotal - Subtotal del item
 * @returns {number} - Monto del descuento
 */
function calculateDiscountAmount(promotion, subtotal) {
  if (promotion.discount_type === 'percentage') {
    return subtotal * (promotion.discount_value / 100);
  }

  if (promotion.discount_type === 'fixed_amount') {
    // El descuento fijo no puede exceder el subtotal
    return Math.min(promotion.discount_value, subtotal);
  }

  return 0;
}

/**
 * Aplica una promoción a un tratamiento completo
 * @param {Object} promotion - Promoción a aplicar
 * @param {Object[]} treatmentItems - Array de items del tratamiento con tipo
 * @returns {Object} - Resultado con items actualizados y totales
 */
function applyPromotionToTreatment(promotion, treatmentItems) {
  let totalOriginal = 0;
  let totalDiscount = 0;

  const itemsWithDiscount = treatmentItems.map(item => {
    totalOriginal += item.subtotal;

    // Verificar si aplica la promoción
    const applies = isProcedureApplicable(
      promotion.applicable_procedures,
      item,
      item.item_type
    );

    if (applies) {
      const discountAmount = calculateDiscountAmount(promotion, item.subtotal);
      totalDiscount += discountAmount;

      return {
        ...item,
        promotion_applied: true,
        promotion_id: promotion.promotion_id,
        promotion_name: promotion.promotion_name,
        discount_type: promotion.discount_type,
        discount_value: promotion.discount_value,
        discount_amount: discountAmount,
        discounted_subtotal: item.subtotal - discountAmount
      };
    }

    return {
      ...item,
      promotion_applied: false,
      discount_amount: 0,
      discounted_subtotal: item.subtotal
    };
  });

  return {
    items: itemsWithDiscount,
    totals: {
      original: totalOriginal,
      discount: totalDiscount,
      final: totalOriginal - totalDiscount
    },
    promotion: {
      promotion_id: promotion.promotion_id,
      promotion_name: promotion.promotion_name,
      promotion_code: promotion.promotion_code
    }
  };
}

// Exportar funciones
module.exports = {
  validateApplicableProcedures,
  isProcedureApplicable,
  matchesSpecific,
  matchesCategory,
  isExcluded,
  calculateDiscountAmount,
  applyPromotionToTreatment
};
