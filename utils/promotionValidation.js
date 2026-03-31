/**
 * Utilidades para validación y cálculo de promociones
 *
 * Estructura esperada de applicable_procedures (JSONB):
 * {
 *   "scope": "all" | "specific" | "category",
 *   "items": [
 *     { "type": "condition", "id": 12, "code": "RES" },
 *     { "type": "sub_procedure", "id": 45, "code": "SP-001" },
 *     { "type": "category", "value": "ortodoncia" }
 *   ],
 *   "exclusions": [
 *     { "type": "sub_procedure", "id": 99 }
 *   ]
 * }
 */

const pool = require('../config/db');

/**
 * Verifica si un paciente es cliente nuevo
 * Criterios de continuador (cualquiera de estos):
 *   1. Tiene citas completadas/atendidas (appointment_status_id 3 o 4)
 *   2. Tiene tratamiento registrado (atención integral): consulta con plan de tratamiento
 *   3. Marcado manualmente como continuador por SA (patients.is_new_client = false)
 * @param {number} patientId - ID del paciente
 * @returns {Promise<boolean>} true si es nuevo, false si es continuador
 */
const checkIfNewClient = async (patientId) => {
  try {
    const query = `
      SELECT
        (SELECT COUNT(*) FROM appointments
         WHERE patient_id = $1 AND appointment_status_id IN (3, 4) AND status = 'active'
        ) AS completed_appointments,
        (SELECT COUNT(*) FROM consultations c
         INNER JOIN consultation_treatment_plans ctp ON ctp.consultation_id = c.consultation_id
         WHERE c.patient_id = $1 AND c.status = 'active' AND ctp.status = 'active'
        ) AS treatment_plans,
        (SELECT CASE WHEN is_new_client = false THEN 1 ELSE 0 END
         FROM patients WHERE patient_id = $1 AND status = 'active'
        ) AS manually_marked
    `;
    const result = await pool.query(query, [patientId]);
    const hasCompletedAppointments = parseInt(result.rows[0].completed_appointments) > 0;
    const hasTreatmentPlans = parseInt(result.rows[0].treatment_plans) > 0;
    const manuallyMarked = parseInt(result.rows[0].manually_marked) === 1;
    return !hasCompletedAppointments && !hasTreatmentPlans && !manuallyMarked;
  } catch (error) {
    console.error('Error checking if new client:', error);
    // Por defecto, considerar como nuevo si hay error
    return true;
  }
};

/**
 * Valida si una promoción puede ser aplicada
 * @param {Object} params
 * @param {number} params.promotionId - ID de la promoción
 * @param {number} params.patientId - ID del paciente (opcional)
 * @param {number} params.branchId - ID de la sucursal
 * @param {Array} params.procedures - Lista de procedimientos [{type, id, code, price}]
 * @param {number} params.subtotal - Subtotal del presupuesto
 * @returns {Object} { valid: boolean, message?: string, promotion?: Object }
 */
const validatePromotion = async ({
  promotionId,
  promotionCode,
  patientId,
  branchId,
  procedures = [],
  subtotal = 0
}) => {
  try {
    // 1. Obtener promoción por ID o código
    let query = `
      SELECT * FROM promotions
      WHERE status = 'active'
      AND is_active = TRUE
      AND start_date <= CURRENT_DATE
      AND end_date >= CURRENT_DATE
    `;
    const params = [];

    if (promotionId) {
      query += ` AND promotion_id = $1`;
      params.push(promotionId);
    } else if (promotionCode) {
      query += ` AND promotion_code = $1`;
      params.push(promotionCode);
    } else {
      return { valid: false, message: 'Debe proporcionar promotion_id o promotion_code' };
    }

    // Validar branch_id (NULL significa aplica a todas las sedes)
    if (branchId) {
      query += ` AND (branch_id = $${params.length + 1} OR branch_id IS NULL)`;
      params.push(branchId);
    }

    const result = await pool.query(query, params);

    if (result.rows.length === 0) {
      return { valid: false, message: 'Promoción no encontrada, inactiva o fuera de vigencia' };
    }

    const promotion = result.rows[0];

    // 2. Validar límite global de usos
    if (promotion.max_uses && promotion.current_uses >= promotion.max_uses) {
      return { valid: false, message: 'La promoción ha alcanzado su límite de usos' };
    }

    // 3. Validar límite por paciente
    if (promotion.max_uses_per_patient && patientId) {
      const usageResult = await pool.query(`
        SELECT COUNT(*) as count
        FROM promotion_usages
        WHERE promotion_id = $1
        AND patient_id = $2
        AND status = 'active'
      `, [promotion.promotion_id, patientId]);

      const usageCount = parseInt(usageResult.rows[0].count);
      if (usageCount >= promotion.max_uses_per_patient) {
        return {
          valid: false,
          message: `Has alcanzado el límite de ${promotion.max_uses_per_patient} uso(s) para esta promoción`
        };
      }
    }

    // 3.5. Validar target_audience (segmentación por tipo de cliente)
    if (promotion.target_audience && promotion.target_audience !== 'all' && patientId) {
      const isNewClient = await checkIfNewClient(patientId);

      if (promotion.target_audience === 'new_clients' && !isNewClient) {
        return {
          valid: false,
          message: 'Esta promoción es exclusiva para clientes nuevos. Ya tienes citas completadas anteriormente.'
        };
      }

      if (promotion.target_audience === 'continuing_clients' && isNewClient) {
        return {
          valid: false,
          message: 'Esta promoción es exclusiva para clientes continuadores. Necesitas tener al menos una cita completada.'
        };
      }
    }

    // 4. Validar monto mínimo de compra
    if (promotion.min_purchase_amount && subtotal < parseFloat(promotion.min_purchase_amount)) {
      return {
        valid: false,
        message: `Monto mínimo requerido: S/. ${promotion.min_purchase_amount}`
      };
    }

    // 5. Validar procedimientos aplicables
    const applicableConfig = promotion.applicable_procedures;
    let eligibleProcedures = [];

    if (!applicableConfig) {
      // Sin configuración = aplica a todos
      eligibleProcedures = procedures;
    } else if (Array.isArray(applicableConfig)) {
      // FORMATO LEGACY: Array de strings ["proc_1", "subproc_2", "treat_3"]
      if (applicableConfig.length === 0) {
        // Array vacío = aplica a todos
        eligibleProcedures = procedures;
      } else {
        eligibleProcedures = procedures.filter(proc => {
          // Buscar coincidencia en el array de IDs
          return applicableConfig.some(item => {
            if (typeof item === 'string') {
              // Formato: "proc_ID", "subproc_ID", "treat_ID"
              const match = item.match(/^(proc|subproc|treat)_(\d+)$/);
              if (match) {
                const [, prefix, id] = match;
                const numId = parseInt(id);
                if (prefix === 'proc' && proc.type === 'condition') return proc.id === numId;
                if (prefix === 'subproc' && proc.type === 'sub_procedure') return proc.id === numId;
                if (prefix === 'treat' && proc.type === 'treatment') return proc.id === numId;
              }
            }
            return false;
          });
        });

        if (procedures.length > 0 && eligibleProcedures.length === 0) {
          return {
            valid: false,
            message: 'Ningún procedimiento seleccionado es elegible para esta promoción'
          };
        }
      }
    } else if (applicableConfig.scope === 'all') {
      // FORMATO NUEVO: Objeto con scope
      eligibleProcedures = procedures;
    } else if (applicableConfig.scope === 'specific' && applicableConfig.items) {
      // FORMATO NUEVO: Objeto con items específicos
      eligibleProcedures = procedures.filter(proc => {
        const isIncluded = applicableConfig.items.some(item => {
          if (item.type === 'category') {
            return proc.category === item.value;
          }
          return item.type === proc.type && (item.id === proc.id || item.code === proc.code);
        });

        // Verificar exclusiones
        const isExcluded = applicableConfig.exclusions?.some(excl =>
          excl.type === proc.type && (excl.id === proc.id || excl.code === proc.code)
        );

        return isIncluded && !isExcluded;
      });

      if (procedures.length > 0 && eligibleProcedures.length === 0) {
        return {
          valid: false,
          message: 'Ningún procedimiento seleccionado es elegible para esta promoción'
        };
      }
    } else {
      // Cualquier otro formato desconocido = aplica a todos
      eligibleProcedures = procedures;
    }

    return {
      valid: true,
      promotion,
      eligibleProcedures
    };

  } catch (error) {
    console.error('Error validating promotion:', error);
    return { valid: false, message: 'Error al validar la promoción' };
  }
};

/**
 * Calcula el monto del descuento
 * @param {Object} promotion - Objeto de promoción
 * @param {number} amount - Monto sobre el cual calcular (puede ser con precio de plan de salud)
 * @returns {number} Monto del descuento
 */
const calculateDiscount = (promotion, amount) => {
  let discountAmount = 0;

  if (promotion.discount_type === 'percentage') {
    discountAmount = (amount * parseFloat(promotion.discount_value)) / 100;
  } else if (promotion.discount_type === 'fixed') {
    discountAmount = parseFloat(promotion.discount_value);
  }

  // Aplicar límite máximo de descuento si existe
  if (promotion.max_discount_amount) {
    discountAmount = Math.min(discountAmount, parseFloat(promotion.max_discount_amount));
  }

  // No permitir descuento mayor al monto
  discountAmount = Math.min(discountAmount, amount);

  return Math.round(discountAmount * 100) / 100; // Redondear a 2 decimales
};

/**
 * Registra el uso de una promoción
 * @param {Object} params
 * @returns {Object} El registro creado
 */
const registerPromotionUsage = async ({
  promotionId,
  patientId,
  appointmentId,
  budgetId,
  consultationBudgetId,
  appliedDiscount,
  originalAmount,
  finalAmount,
  proceduresAffected,
  usedByUserId,
  notes
}) => {
  try {
    const result = await pool.query(`
      INSERT INTO promotion_usages (
        promotion_id, patient_id, appointment_id, budget_id, consultation_budget_id,
        applied_discount, original_amount, final_amount,
        procedures_affected, used_by_user_id, notes
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING *
    `, [
      promotionId,
      patientId || null,
      appointmentId || null,
      budgetId || null,
      consultationBudgetId || null,
      appliedDiscount,
      originalAmount || null,
      finalAmount || null,
      proceduresAffected ? JSON.stringify(proceduresAffected) : null,
      usedByUserId || null,
      notes || null
    ]);

    return result.rows[0];
  } catch (error) {
    console.error('Error registering promotion usage:', error);
    throw error;
  }
};

/**
 * TRANSACCIÓN ATÓMICA: Valida y aplica promoción de forma segura
 * Evita race conditions usando SELECT FOR UPDATE
 * @param {Object} params
 * @returns {Object} { success, discountAmount, promotion, usage }
 */
const validateAndApplyPromotionAtomic = async ({
  promotionId,
  promotionCode,
  patientId,
  branchId,
  appointmentId,
  budgetId,
  consultationBudgetId,
  procedures = [],
  subtotal = 0,
  usedByUserId,
  notes
}) => {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // 1. Obtener promoción con lock para evitar race conditions
    let query = `
      SELECT * FROM promotions
      WHERE status = 'active'
      AND is_active = TRUE
      AND start_date <= CURRENT_DATE
      AND end_date >= CURRENT_DATE
    `;
    const params = [];

    if (promotionId) {
      query += ` AND promotion_id = $1`;
      params.push(promotionId);
    } else if (promotionCode) {
      query += ` AND promotion_code = $1`;
      params.push(promotionCode);
    } else {
      await client.query('ROLLBACK');
      return { success: false, message: 'Debe proporcionar promotion_id o promotion_code' };
    }

    if (branchId) {
      params.push(branchId);
      query += ` AND (branch_id = $${params.length} OR branch_id IS NULL)`;
    }

    // FOR UPDATE bloquea el registro hasta que termine la transacción
    query += ` FOR UPDATE`;

    const promoResult = await client.query(query, params);

    if (promoResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return { success: false, message: 'Promoción no encontrada, inactiva o fuera de vigencia' };
    }

    const promotion = promoResult.rows[0];

    // 2. Validar límite global (con datos bloqueados, sin race condition)
    if (promotion.max_uses && promotion.current_uses >= promotion.max_uses) {
      await client.query('ROLLBACK');
      return { success: false, message: 'La promoción ha alcanzado su límite de usos' };
    }

    // 3. Validar límite por paciente
    if (promotion.max_uses_per_patient && patientId) {
      const usageResult = await client.query(`
        SELECT COUNT(*) as count
        FROM promotion_usages
        WHERE promotion_id = $1
        AND patient_id = $2
        AND status = 'active'
      `, [promotion.promotion_id, patientId]);

      if (parseInt(usageResult.rows[0].count) >= promotion.max_uses_per_patient) {
        await client.query('ROLLBACK');
        return {
          success: false,
          message: `Has alcanzado el límite de ${promotion.max_uses_per_patient} uso(s) para esta promoción`
        };
      }
    }

    // 4. Validar monto mínimo
    if (promotion.min_purchase_amount && subtotal < parseFloat(promotion.min_purchase_amount)) {
      await client.query('ROLLBACK');
      return {
        success: false,
        message: `Monto mínimo requerido: S/. ${promotion.min_purchase_amount}`
      };
    }

    // 5. Filtrar procedimientos elegibles
    const applicableConfig = promotion.applicable_procedures;
    let eligibleProcedures = [];

    if (!applicableConfig || (Array.isArray(applicableConfig) && applicableConfig.length === 0)) {
      eligibleProcedures = procedures;
    } else if (Array.isArray(applicableConfig)) {
      eligibleProcedures = procedures.filter(proc => {
        return applicableConfig.some(item => {
          if (typeof item === 'string') {
            const match = item.match(/^(proc|subproc|treat)_(\d+)$/);
            if (match) {
              const [, prefix, id] = match;
              const numId = parseInt(id);
              if (prefix === 'proc' && proc.type === 'condition') return proc.id === numId;
              if (prefix === 'subproc' && proc.type === 'sub_procedure') return proc.id === numId;
              if (prefix === 'treat' && proc.type === 'treatment') return proc.id === numId;
            }
          }
          return false;
        });
      });
    } else if (applicableConfig.scope === 'all') {
      eligibleProcedures = procedures;
    } else if (applicableConfig.scope === 'specific' && applicableConfig.items) {
      eligibleProcedures = procedures.filter(proc => {
        const isIncluded = applicableConfig.items.some(item =>
          item.type === proc.type && (item.id === proc.id || item.code === proc.code)
        );
        const isExcluded = applicableConfig.exclusions?.some(excl =>
          excl.type === proc.type && (excl.id === proc.id || excl.code === proc.code)
        );
        return isIncluded && !isExcluded;
      });
    } else {
      eligibleProcedures = procedures;
    }

    if (procedures.length > 0 && eligibleProcedures.length === 0) {
      await client.query('ROLLBACK');
      return {
        success: false,
        message: 'Ningún procedimiento seleccionado es elegible para esta promoción'
      };
    }

    // 6. Calcular descuento
    const eligibleAmount = eligibleProcedures.length > 0
      ? eligibleProcedures.reduce((sum, p) => sum + parseFloat(p.price || 0), 0)
      : subtotal;

    const discountAmount = calculateDiscount(promotion, eligibleAmount);
    const finalAmount = subtotal - discountAmount;

    // 7. Registrar uso
    const usageResult = await client.query(`
      INSERT INTO promotion_usages (
        promotion_id, patient_id, appointment_id, budget_id, consultation_budget_id,
        applied_discount, original_amount, final_amount,
        procedures_affected, used_by_user_id, notes
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING *
    `, [
      promotion.promotion_id,
      patientId || null,
      appointmentId || null,
      budgetId || null,
      consultationBudgetId || null,
      discountAmount,
      subtotal,
      finalAmount,
      procedures.length > 0 ? JSON.stringify(procedures) : null,
      usedByUserId || null,
      notes || null
    ]);

    // 8. El trigger automáticamente incrementa current_uses
    // Pero lo verificamos explícitamente también
    await client.query(`
      UPDATE promotions
      SET current_uses = current_uses + 1,
          date_time_modification = CURRENT_TIMESTAMP
      WHERE promotion_id = $1
    `, [promotion.promotion_id]);

    await client.query('COMMIT');

    return {
      success: true,
      promotion,
      discountAmount,
      finalAmount,
      eligibleProcedures,
      usage: usageResult.rows[0]
    };

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error in atomic promotion application:', error);
    throw error;
  } finally {
    client.release();
  }
};

/**
 * Obtiene promociones disponibles para un procedimiento específico
 * @param {Object} params
 * @returns {Array} Lista de promociones aplicables
 */
const getAvailablePromotionsForProcedure = async ({
  procedureType,
  procedureId,
  procedureCode,
  branchId,
  patientId
}) => {
  try {
    // Obtener todas las promociones activas
    let query = `
      SELECT p.*
      FROM promotions p
      WHERE p.status = 'active'
      AND p.is_active = TRUE
      AND p.start_date <= CURRENT_DATE
      AND p.end_date >= CURRENT_DATE
      AND (p.max_uses IS NULL OR p.current_uses < p.max_uses)
    `;
    const params = [];

    if (branchId) {
      params.push(branchId);
      query += ` AND (p.branch_id = $${params.length} OR p.branch_id IS NULL)`;
    }

    query += ` ORDER BY p.discount_value DESC`;

    const result = await pool.query(query, params);

    // Filtrar promociones que aplican al procedimiento
    const applicablePromotions = [];

    for (const promo of result.rows) {
      const config = promo.applicable_procedures;

      // Si no tiene configuración, aplica a todos
      if (!config) {
        applicablePromotions.push(promo);
        continue;
      }

      // FORMATO LEGACY: Array de strings
      if (Array.isArray(config)) {
        if (config.length === 0) {
          // Array vacío = aplica a todos
          applicablePromotions.push(promo);
        } else {
          // Buscar si el procedimiento está en el array
          const isIncluded = config.some(item => {
            if (typeof item === 'string') {
              const match = item.match(/^(proc|subproc|treat)_(\d+)$/);
              if (match) {
                const [, prefix, id] = match;
                const numId = parseInt(id);
                if (prefix === 'proc' && procedureType === 'condition') return numId === procedureId;
                if (prefix === 'subproc' && procedureType === 'sub_procedure') return numId === procedureId;
                if (prefix === 'treat' && procedureType === 'treatment') return numId === procedureId;
              }
            }
            return false;
          });

          if (isIncluded) {
            applicablePromotions.push(promo);
          }
        }
        continue;
      }

      // FORMATO NUEVO: Objeto con scope
      if (config.scope === 'all') {
        applicablePromotions.push(promo);
        continue;
      }

      // Verificar si el procedimiento está en los items
      if (config.scope === 'specific' && config.items) {
        const isIncluded = config.items.some(item => {
          if (item.type === 'category') {
            // Aquí se necesitaría conocer la categoría del procedimiento
            return false;
          }
          return item.type === procedureType &&
            (item.id === procedureId || item.code === procedureCode);
        });

        const isExcluded = config.exclusions?.some(excl =>
          excl.type === procedureType &&
          (excl.id === procedureId || excl.code === procedureCode)
        );

        if (isIncluded && !isExcluded) {
          applicablePromotions.push(promo);
        }
      }
    }

    // Filtrar por límite de usos del paciente si aplica
    // OPTIMIZADO: Una sola consulta en lugar de N+1 queries
    if (patientId && applicablePromotions.length > 0) {
      // Obtener IDs de promociones con límite por paciente
      const promosWithLimit = applicablePromotions.filter(p => p.max_uses_per_patient);

      if (promosWithLimit.length > 0) {
        const promoIds = promosWithLimit.map(p => p.promotion_id);

        // Consulta única para obtener todos los conteos de uso
        const usageResult = await pool.query(`
          SELECT promotion_id, COUNT(*) as count
          FROM promotion_usages
          WHERE promotion_id = ANY($1)
          AND patient_id = $2
          AND status = 'active'
          GROUP BY promotion_id
        `, [promoIds, patientId]);

        // Crear mapa de conteos: { promotion_id: count }
        const usageMap = {};
        usageResult.rows.forEach(row => {
          usageMap[row.promotion_id] = parseInt(row.count);
        });

        // Filtrar promociones basado en el mapa de usos
        return applicablePromotions.filter(promo => {
          if (!promo.max_uses_per_patient) {
            return true; // Sin límite, siempre incluir
          }
          const currentUsage = usageMap[promo.promotion_id] || 0;
          return currentUsage < promo.max_uses_per_patient;
        });
      }
    }

    return applicablePromotions;

  } catch (error) {
    console.error('Error getting available promotions:', error);
    return [];
  }
};

/**
 * Verifica si dos promociones pueden combinarse (stackable)
 * @param {number} promotionId1
 * @param {number} promotionId2
 * @returns {boolean}
 */
const canStackPromotions = async (promotionId1, promotionId2) => {
  try {
    const result = await pool.query(`
      SELECT promotion_id, is_stackable
      FROM promotions
      WHERE promotion_id IN ($1, $2)
      AND status = 'active'
    `, [promotionId1, promotionId2]);

    if (result.rows.length !== 2) {
      return false;
    }

    // Ambas promociones deben ser stackable
    return result.rows.every(p => p.is_stackable === true);
  } catch (error) {
    console.error('Error checking stackable promotions:', error);
    return false;
  }
};

/**
 * Valida y aplica promoción para una cita (wrapper simplificado)
 * @param {Object} params
 * @returns {Object} { success, discountAmount, promotion, usage, message }
 */
const validateAndApplyPromotion = async ({
  promotionCode,
  patientId,
  branchId,
  appointmentId,
  subtotal = 0,
  usedByUserId,
  notes
}) => {
  try {
    return await validateAndApplyPromotionAtomic({
      promotionCode,
      patientId,
      branchId,
      appointmentId,
      subtotal,
      usedByUserId,
      notes
    });
  } catch (error) {
    console.error('Error in validateAndApplyPromotion:', error);
    return {
      success: false,
      message: error.message || 'Error al aplicar la promoción'
    };
  }
};

module.exports = {
  validatePromotion,
  calculateDiscount,
  registerPromotionUsage,
  validateAndApplyPromotionAtomic,
  validateAndApplyPromotion,
  getAvailablePromotionsForProcedure,
  canStackPromotions
};
