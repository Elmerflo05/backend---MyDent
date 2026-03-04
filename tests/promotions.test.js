/**
 * @file promotions.test.js
 * @description Tests para el sistema de promociones
 */

const {
  validateApplicableProcedures,
  isProcedureApplicable,
  matchesSpecific,
  matchesCategory,
  isExcluded,
  calculateDiscountAmount,
  applyPromotionToTreatment
} = require('../src/types/promotions');

describe('Sistema de Promociones', () => {
  // ========================================================================
  // VALIDACIÓN DE CONFIGURACIÓN
  // ========================================================================

  describe('validateApplicableProcedures', () => {
    test('debe aceptar configuración válida con type: all', () => {
      const config = { type: 'all' };
      const result = validateApplicableProcedures(config);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    test('debe aceptar configuración válida con type: specific', () => {
      const config = {
        type: 'specific',
        conditions: {
          codes: ['caries-cd', 'fractura']
        }
      };
      const result = validateApplicableProcedures(config);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    test('debe aceptar configuración válida con type: category_based', () => {
      const config = {
        type: 'category_based',
        categories: ['patologia', 'protesis']
      };
      const result = validateApplicableProcedures(config);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    test('debe aceptar configuración válida con type: mixed', () => {
      const config = {
        type: 'mixed',
        conditions: {
          codes: ['caries-cd']
        },
        specialties: ['Periodoncia e Implantes'],
        custom_items: {
          allow: true
        }
      };
      const result = validateApplicableProcedures(config);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    test('debe rechazar configuración sin type', () => {
      const config = { conditions: { codes: ['test'] } };
      const result = validateApplicableProcedures(config);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('El campo "type" es requerido');
    });

    test('debe rechazar type inválido', () => {
      const config = { type: 'invalid_type' };
      const result = validateApplicableProcedures(config);

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('no es válido'))).toBe(true);
    });

    test('debe rechazar type: specific sin filtros', () => {
      const config = { type: 'specific' };
      const result = validateApplicableProcedures(config);

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('al menos un filtro'))).toBe(true);
    });

    test('debe rechazar type: category_based sin categorías ni especialidades', () => {
      const config = { type: 'category_based' };
      const result = validateApplicableProcedures(config);

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('categories o specialties'))).toBe(true);
    });
  });

  // ========================================================================
  // LÓGICA DE APLICACIÓN - TYPE: ALL
  // ========================================================================

  describe('isProcedureApplicable - type: all', () => {
    const config = { type: 'all' };

    test('debe aplicar a condition item', () => {
      const item = {
        odontogram_dental_conditions: {
          condition_id: 3,
          condition_code: 'caries-cd',
          condition_name: 'Caries de Dentina',
          category: 'patologia'
        }
      };

      expect(isProcedureApplicable(config, item, 'condition')).toBe(true);
    });

    test('debe aplicar a sub_procedure item', () => {
      const item = {
        sub_procedures: {
          sub_procedure_id: 13,
          sub_procedure_code: 'PI003',
          sub_procedure_name: 'Destartraje manual',
          specialty: 'Periodoncia e Implantes'
        }
      };

      expect(isProcedureApplicable(config, item, 'sub_procedure')).toBe(true);
    });

    test('debe aplicar a custom item', () => {
      const item = {
        item_name: 'Material adicional',
        item_category: 'materiales'
      };

      expect(isProcedureApplicable(config, item, 'custom')).toBe(true);
    });
  });

  // ========================================================================
  // LÓGICA DE APLICACIÓN - TYPE: SPECIFIC
  // ========================================================================

  describe('isProcedureApplicable - type: specific', () => {
    test('debe aplicar a condition con código específico', () => {
      const config = {
        type: 'specific',
        conditions: {
          codes: ['caries-cd', 'fractura']
        }
      };

      const item = {
        odontogram_dental_conditions: {
          condition_id: 3,
          condition_code: 'caries-cd',
          category: 'patologia'
        }
      };

      expect(isProcedureApplicable(config, item, 'condition')).toBe(true);
    });

    test('no debe aplicar a condition con código no incluido', () => {
      const config = {
        type: 'specific',
        conditions: {
          codes: ['caries-cd']
        }
      };

      const item = {
        odontogram_dental_conditions: {
          condition_id: 5,
          condition_code: 'fractura',
          category: 'patologia'
        }
      };

      expect(isProcedureApplicable(config, item, 'condition')).toBe(false);
    });

    test('debe aplicar a sub_procedure con código específico', () => {
      const config = {
        type: 'specific',
        sub_procedures: {
          codes: ['PI003', 'EN006']
        }
      };

      const item = {
        sub_procedures: {
          sub_procedure_id: 13,
          sub_procedure_code: 'PI003',
          specialty: 'Periodoncia e Implantes'
        }
      };

      expect(isProcedureApplicable(config, item, 'sub_procedure')).toBe(true);
    });

    test('debe aplicar a condition con ID específico', () => {
      const config = {
        type: 'specific',
        conditions: {
          ids: [1, 2, 3]
        }
      };

      const item = {
        odontogram_dental_conditions: {
          condition_id: 3,
          condition_code: 'caries-cd',
          category: 'patologia'
        }
      };

      expect(isProcedureApplicable(config, item, 'condition')).toBe(true);
    });
  });

  // ========================================================================
  // LÓGICA DE APLICACIÓN - TYPE: CATEGORY_BASED
  // ========================================================================

  describe('isProcedureApplicable - type: category_based', () => {
    test('debe aplicar a condition con categoría específica', () => {
      const config = {
        type: 'category_based',
        categories: ['patologia', 'protesis']
      };

      const item = {
        odontogram_dental_conditions: {
          condition_id: 3,
          condition_code: 'caries-cd',
          category: 'patologia'
        }
      };

      expect(isProcedureApplicable(config, item, 'condition')).toBe(true);
    });

    test('no debe aplicar a condition con categoría no incluida', () => {
      const config = {
        type: 'category_based',
        categories: ['protesis']
      };

      const item = {
        odontogram_dental_conditions: {
          condition_id: 3,
          condition_code: 'caries-cd',
          category: 'patologia'
        }
      };

      expect(isProcedureApplicable(config, item, 'condition')).toBe(false);
    });

    test('debe aplicar a sub_procedure con especialidad específica', () => {
      const config = {
        type: 'category_based',
        specialties: ['Periodoncia e Implantes', 'Radiologia']
      };

      const item = {
        sub_procedures: {
          sub_procedure_id: 13,
          sub_procedure_code: 'PI003',
          specialty: 'Periodoncia e Implantes'
        }
      };

      expect(isProcedureApplicable(config, item, 'sub_procedure')).toBe(true);
    });

    test('debe aplicar a custom item cuando allow es true', () => {
      const config = {
        type: 'category_based',
        categories: ['patologia'],
        custom_items: {
          allow: true
        }
      };

      const item = {
        item_name: 'Material adicional',
        item_category: 'materiales'
      };

      expect(isProcedureApplicable(config, item, 'custom')).toBe(true);
    });

    test('no debe aplicar a custom item cuando allow es false', () => {
      const config = {
        type: 'category_based',
        categories: ['patologia'],
        custom_items: {
          allow: false
        }
      };

      const item = {
        item_name: 'Material adicional',
        item_category: 'materiales'
      };

      expect(isProcedureApplicable(config, item, 'custom')).toBe(false);
    });

    test('debe aplicar a custom item solo si tiene categoría específica', () => {
      const config = {
        type: 'category_based',
        categories: ['patologia'],
        custom_items: {
          allow: true,
          categories: ['materiales']
        }
      };

      const item = {
        item_name: 'Material adicional',
        item_category: 'materiales'
      };

      expect(isProcedureApplicable(config, item, 'custom')).toBe(true);
    });
  });

  // ========================================================================
  // LÓGICA DE APLICACIÓN - TYPE: MIXED
  // ========================================================================

  describe('isProcedureApplicable - type: mixed', () => {
    test('debe aplicar si cumple con categoría', () => {
      const config = {
        type: 'mixed',
        conditions: {
          codes: ['fractura']
        },
        categories: ['patologia']
      };

      const item = {
        odontogram_dental_conditions: {
          condition_id: 3,
          condition_code: 'caries-cd',
          category: 'patologia'
        }
      };

      expect(isProcedureApplicable(config, item, 'condition')).toBe(true);
    });

    test('debe aplicar si cumple con código específico', () => {
      const config = {
        type: 'mixed',
        conditions: {
          codes: ['caries-cd']
        },
        categories: ['protesis']
      };

      const item = {
        odontogram_dental_conditions: {
          condition_id: 3,
          condition_code: 'caries-cd',
          category: 'patologia'
        }
      };

      expect(isProcedureApplicable(config, item, 'condition')).toBe(true);
    });

    test('no debe aplicar si no cumple ningún criterio', () => {
      const config = {
        type: 'mixed',
        conditions: {
          codes: ['fractura']
        },
        categories: ['protesis']
      };

      const item = {
        odontogram_dental_conditions: {
          condition_id: 3,
          condition_code: 'caries-cd',
          category: 'patologia'
        }
      };

      expect(isProcedureApplicable(config, item, 'condition')).toBe(false);
    });
  });

  // ========================================================================
  // EXCLUSIONES
  // ========================================================================

  describe('Exclusiones', () => {
    test('no debe aplicar a condition excluido por código', () => {
      const config = {
        type: 'all',
        exclude: {
          condition_codes: ['protesis-completa-sup', 'protesis-completa-inf']
        }
      };

      const item = {
        odontogram_dental_conditions: {
          condition_id: 47,
          condition_code: 'protesis-completa-sup',
          category: 'protesis'
        }
      };

      expect(isProcedureApplicable(config, item, 'condition')).toBe(false);
    });

    test('no debe aplicar a sub_procedure excluido por código', () => {
      const config = {
        type: 'all',
        exclude: {
          sub_procedure_codes: ['PI009']
        }
      };

      const item = {
        sub_procedures: {
          sub_procedure_id: 9,
          sub_procedure_code: 'PI009',
          specialty: 'Periodoncia e Implantes'
        }
      };

      expect(isProcedureApplicable(config, item, 'sub_procedure')).toBe(false);
    });

    test('debe aplicar a procedimiento no excluido', () => {
      const config = {
        type: 'all',
        exclude: {
          condition_codes: ['protesis-completa-sup']
        }
      };

      const item = {
        odontogram_dental_conditions: {
          condition_id: 3,
          condition_code: 'caries-cd',
          category: 'patologia'
        }
      };

      expect(isProcedureApplicable(config, item, 'condition')).toBe(true);
    });
  });

  // ========================================================================
  // CÁLCULO DE DESCUENTOS
  // ========================================================================

  describe('calculateDiscountAmount', () => {
    test('debe calcular descuento porcentual correctamente', () => {
      const promotion = {
        discount_type: 'percentage',
        discount_value: 20
      };
      const subtotal = 100;

      expect(calculateDiscountAmount(promotion, subtotal)).toBe(20);
    });

    test('debe calcular descuento fijo correctamente', () => {
      const promotion = {
        discount_type: 'fixed_amount',
        discount_value: 50
      };
      const subtotal = 100;

      expect(calculateDiscountAmount(promotion, subtotal)).toBe(50);
    });

    test('descuento fijo no debe exceder el subtotal', () => {
      const promotion = {
        discount_type: 'fixed_amount',
        discount_value: 150
      };
      const subtotal = 100;

      expect(calculateDiscountAmount(promotion, subtotal)).toBe(100);
    });

    test('debe retornar 0 para tipo de descuento inválido', () => {
      const promotion = {
        discount_type: 'invalid',
        discount_value: 50
      };
      const subtotal = 100;

      expect(calculateDiscountAmount(promotion, subtotal)).toBe(0);
    });
  });

  // ========================================================================
  // APLICACIÓN A TRATAMIENTO COMPLETO
  // ========================================================================

  describe('applyPromotionToTreatment', () => {
    test('debe aplicar promoción correctamente a items aplicables', () => {
      const promotion = {
        promotion_id: 1,
        promotion_name: 'Promo Test',
        promotion_code: 'TEST20',
        discount_type: 'percentage',
        discount_value: 20,
        applicable_procedures: {
          type: 'category_based',
          categories: ['patologia']
        }
      };

      const treatmentItems = [
        {
          item_id: 1,
          item_type: 'condition',
          subtotal: 150,
          odontogram_dental_conditions: {
            condition_id: 3,
            condition_code: 'caries-cd',
            category: 'patologia'
          }
        },
        {
          item_id: 2,
          item_type: 'sub_procedure',
          subtotal: 500,
          sub_procedures: {
            sub_procedure_id: 46,
            sub_procedure_code: 'EN006',
            specialty: 'Endodoncia'
          }
        }
      ];

      const result = applyPromotionToTreatment(promotion, treatmentItems);

      expect(result.items).toHaveLength(2);
      expect(result.items[0].promotion_applied).toBe(true);
      expect(result.items[0].discount_amount).toBe(30); // 20% de 150
      expect(result.items[0].discounted_subtotal).toBe(120);

      expect(result.items[1].promotion_applied).toBe(false);
      expect(result.items[1].discount_amount).toBe(0);
      expect(result.items[1].discounted_subtotal).toBe(500);

      expect(result.totals.original).toBe(650);
      expect(result.totals.discount).toBe(30);
      expect(result.totals.final).toBe(620);
    });

    test('debe aplicar descuento fijo correctamente', () => {
      const promotion = {
        promotion_id: 2,
        promotion_name: 'Descuento $50',
        promotion_code: 'FIXED50',
        discount_type: 'fixed_amount',
        discount_value: 50,
        applicable_procedures: {
          type: 'all'
        }
      };

      const treatmentItems = [
        {
          item_id: 1,
          item_type: 'condition',
          subtotal: 200,
          odontogram_dental_conditions: {
            condition_id: 3,
            condition_code: 'caries-cd',
            category: 'patologia'
          }
        }
      ];

      const result = applyPromotionToTreatment(promotion, treatmentItems);

      expect(result.items[0].discount_amount).toBe(50);
      expect(result.items[0].discounted_subtotal).toBe(150);
      expect(result.totals.discount).toBe(50);
      expect(result.totals.final).toBe(150);
    });

    test('no debe aplicar promoción si no hay items aplicables', () => {
      const promotion = {
        promotion_id: 3,
        promotion_name: 'Solo Prótesis',
        promotion_code: 'PROTESIS',
        discount_type: 'percentage',
        discount_value: 30,
        applicable_procedures: {
          type: 'category_based',
          categories: ['protesis']
        }
      };

      const treatmentItems = [
        {
          item_id: 1,
          item_type: 'condition',
          subtotal: 150,
          odontogram_dental_conditions: {
            condition_id: 3,
            condition_code: 'caries-cd',
            category: 'patologia'
          }
        }
      ];

      const result = applyPromotionToTreatment(promotion, treatmentItems);

      expect(result.items[0].promotion_applied).toBe(false);
      expect(result.totals.discount).toBe(0);
      expect(result.totals.final).toBe(150);
    });
  });
});
