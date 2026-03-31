/**
 * CONTROLADOR DE PRESUPUESTOS DE CONSULTA
 * Maneja los endpoints para consultation_budgets (Paso 9)
 *
 * Endpoints:
 * - GET    /consultations/:consultationId/budget         - Obtener presupuesto
 * - GET    /consultations/:consultationId/budget/summary - Obtener resumen
 * - POST   /consultations/:consultationId/budget         - Crear/actualizar presupuesto
 * - PUT    /consultations/:consultationId/budget         - Actualizar presupuesto
 * - PUT    /consultations/:consultationId/budget/advance - Actualizar adelanto
 * - PUT    /consultations/:consultationId/budget/status  - Actualizar estado
 * - POST   /consultations/:consultationId/budget/sync    - Sincronizar totales
 * - DELETE /consultations/:consultationId/budget         - Eliminar presupuesto
 */

const consultationBudgetsModel = require('../models/consultationBudgetsModel');
const notificationsModel = require('../models/notificationsModel');
const {
  validatePromotion,
  calculateDiscount,
  registerPromotionUsage,
  validateAndApplyPromotionAtomic
} = require('../utils/promotionValidation');
const pool = require('../config/db');

/**
 * Obtiene el presupuesto completo de una consulta
 * GET /consultations/:consultationId/budget
 */
const getConsultationBudget = async (req, res) => {
  try {
    const { consultationId } = req.params;

    if (!consultationId || isNaN(parseInt(consultationId))) {
      return res.status(400).json({
        success: false,
        error: 'ID de consulta invalido'
      });
    }

    const budget = await consultationBudgetsModel.getByConsultationId(parseInt(consultationId));

    if (!budget) {
      return res.status(404).json({
        success: false,
        error: 'No se encontro presupuesto para esta consulta',
        data: null
      });
    }

    res.json({
      success: true,
      data: budget
    });
  } catch (error) {
    console.error('Error al obtener presupuesto:', error);
    res.status(500).json({
      success: false,
      error: 'Error al obtener presupuesto',
      details: error.message
    });
  }
};

/**
 * Obtiene el resumen del presupuesto (solo totales)
 * GET /consultations/:consultationId/budget/summary
 */
const getConsultationBudgetSummary = async (req, res) => {
  try {
    const { consultationId } = req.params;

    if (!consultationId || isNaN(parseInt(consultationId))) {
      return res.status(400).json({
        success: false,
        error: 'ID de consulta invalido'
      });
    }

    const summary = await consultationBudgetsModel.getSummary(parseInt(consultationId));

    if (!summary) {
      return res.status(404).json({
        success: false,
        error: 'No se encontro presupuesto para esta consulta'
      });
    }

    res.json({
      success: true,
      data: summary
    });
  } catch (error) {
    console.error('Error al obtener resumen del presupuesto:', error);
    res.status(500).json({
      success: false,
      error: 'Error al obtener resumen del presupuesto'
    });
  }
};

/**
 * Crea o actualiza el presupuesto de una consulta (UPSERT)
 * POST /consultations/:consultationId/budget
 *
 * Body esperado:
 * {
 *   advancePayment?: number,    // Adelanto del cliente
 *   observations?: string,      // Observaciones
 *   status?: string,            // Estado: draft, approved, rejected, completed, cancelled
 *   // Los siguientes campos son opcionales (normalmente se calculan por triggers)
 *   definitiveDiagnosisTotal?: number,
 *   treatmentsTotal?: number,
 *   additionalServicesTotal?: number,
 *   examsTotal?: number
 * }
 */
const upsertConsultationBudget = async (req, res) => {
  try {
    const { consultationId } = req.params;
    const userId = req.user?.user_id;
    const branchId = req.user?.branch_id;

    if (!consultationId || isNaN(parseInt(consultationId))) {
      return res.status(400).json({
        success: false,
        error: 'ID de consulta invalido'
      });
    }

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Usuario no autenticado'
      });
    }

    const { promotion_id, promotion_code, patient_id, procedures, ...data } = req.body;

    // Verificar si ya existia (para no aplicar promoción dos veces)
    const existedBefore = await consultationBudgetsModel.exists(parseInt(consultationId));

    // VALIDACIÓN Y APLICACIÓN ATÓMICA DE PROMOCIÓN (solo para nuevos presupuestos)
    let promotionResult = null;

    if ((promotion_id || promotion_code) && !existedBefore) {
      // Preparar procedimientos para validación
      const proceduresToValidate = procedures?.map(p => ({
        type: p.type || 'condition',
        id: p.id,
        code: p.code,
        price: parseFloat(p.price || 0)
      })) || [];

      const subtotal = parseFloat(data.subtotal || data.definitiveDiagnosisTotal || 0) +
                       parseFloat(data.treatmentsTotal || 0) +
                       parseFloat(data.additionalServicesTotal || 0) +
                       parseFloat(data.examsTotal || 0);

      try {
        // Usar función atómica que previene race conditions
        // - SELECT FOR UPDATE bloquea la promoción
        // - Valida límites de forma segura
        // - Registra uso e incrementa contador atómicamente
        promotionResult = await validateAndApplyPromotionAtomic({
          promotionId: promotion_id,
          promotionCode: promotion_code,
          patientId: patient_id,
          branchId: branchId,
          consultationBudgetId: null, // Se actualizará después de crear
          procedures: proceduresToValidate,
          subtotal,
          usedByUserId: userId,
          notes: 'Pendiente asociar presupuesto de consulta'
        });

        if (!promotionResult.success) {
          return res.status(400).json({
            success: false,
            error: promotionResult.message || 'Promoción no válida'
          });
        }

        // Actualizar datos con descuento calculado atómicamente
        data.discount_amount = promotionResult.discountAmount;
        data.promotion_id = promotionResult.promotion.promotion_id;

      } catch (promoError) {
        console.error('Error en validación atómica de promoción:', promoError);
        return res.status(500).json({
          success: false,
          error: 'Error al procesar la promoción'
        });
      }
    }

    // Crear/actualizar presupuesto
    const budget = await consultationBudgetsModel.upsertBudget(
      parseInt(consultationId),
      data,
      userId
    );

    // Actualizar el registro de uso con el consultation_budget_id
    if (promotionResult && promotionResult.usage && budget) {
      try {
        await pool.query(`
          UPDATE promotion_usages
          SET consultation_budget_id = $1,
              notes = $2
          WHERE usage_id = $3
        `, [
          budget.consultation_budget_id,
          `Aplicado en presupuesto de consulta #${consultationId}`,
          promotionResult.usage.usage_id
        ]);
      } catch (updateError) {
        // Log pero no fallar - el uso ya está registrado
        console.error('Error al actualizar consultation_budget_id en promotion_usage:', updateError);
      }
    }

    // Crear notificación para el paciente
    if (budget) {
      try {
        const consultationResult = await pool.query(
          `SELECT c.patient_id, CONCAT(u.first_name, ' ', u.last_name) as dentist_name
           FROM consultations c
           LEFT JOIN dentists d ON c.dentist_id = d.dentist_id
           LEFT JOIN users u ON d.user_id = u.user_id
           WHERE c.consultation_id = $1`,
          [parseInt(consultationId)]
        );
        const patientId = consultationResult.rows[0]?.patient_id;
        const dentistName = consultationResult.rows[0]?.dentist_name || 'Tu doctor';

        if (patientId) {
          // Invalidar notificaciones previas de presupuesto para esta consulta
          await pool.query(
            `UPDATE notifications SET status = 'inactive', date_time_modification = CURRENT_TIMESTAMP
             WHERE patient_id = $1 AND notification_type IN ('budget_created', 'budget_updated')
             AND status = 'active' AND is_read = false
             AND notification_data->>'consultation_id' = $2`,
            [patientId, String(consultationId)]
          );

          const grandTotal = parseFloat(budget.grand_total || 0);
          const notificationType = existedBefore ? 'budget_updated' : 'budget_created';
          const notificationTitle = existedBefore ? 'Presupuesto Actualizado' : 'Nuevo Presupuesto Disponible';
          const notificationMessage = `${dentistName} ha ${existedBefore ? 'actualizado' : 'registrado'} tu presupuesto. Total: S/ ${grandTotal.toFixed(2)}`;
          const notificationDataPayload = {
            consultation_id: parseInt(consultationId),
            consultation_budget_id: budget.consultation_budget_id,
            grand_total: grandTotal,
            status: budget.status
          };

          const createdNotification = await notificationsModel.createNotification({
            patient_id: patientId,
            notification_type: notificationType,
            notification_title: notificationTitle,
            notification_message: notificationMessage,
            notification_data: JSON.stringify(notificationDataPayload),
            priority: 'high',
            user_id_registration: userId
          });

          // Emitir evento Socket.IO al paciente en tiempo real
          if (global.io && createdNotification) {
            global.io.to(`patient-${patientId}`).emit('budget-notification', {
              notification_id: createdNotification.notification_id,
              notification_type: notificationType,
              notification_title: notificationTitle,
              notification_message: notificationMessage,
              notification_data: notificationDataPayload,
              date_time_registration: createdNotification.date_time_registration
            });
          }
        }
      } catch (notifError) {
        console.error('Error al crear notificación de presupuesto:', notifError);
      }
    }

    res.status(existedBefore ? 200 : 201).json({
      success: true,
      message: existedBefore
        ? 'Presupuesto actualizado exitosamente'
        : 'Presupuesto creado exitosamente',
      data: budget,
      wasUpdated: existedBefore,
      promotion: promotionResult ? {
        promotion_id: promotionResult.promotion.promotion_id,
        promotion_name: promotionResult.promotion.promotion_name,
        discount_applied: promotionResult.discountAmount
      } : null
    });
  } catch (error) {
    console.error('Error al guardar presupuesto:', error);
    res.status(500).json({
      success: false,
      error: 'Error al guardar presupuesto',
      details: error.message
    });
  }
};

/**
 * Actualiza el presupuesto (similar a POST pero solo para actualizaciones)
 * PUT /consultations/:consultationId/budget
 */
const updateConsultationBudget = async (req, res) => {
  try {
    const { consultationId } = req.params;
    const userId = req.user?.user_id;

    if (!consultationId || isNaN(parseInt(consultationId))) {
      return res.status(400).json({
        success: false,
        error: 'ID de consulta invalido'
      });
    }

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Usuario no autenticado'
      });
    }

    // Verificar si existe
    const exists = await consultationBudgetsModel.exists(parseInt(consultationId));

    if (!exists) {
      return res.status(404).json({
        success: false,
        error: 'No se encontro presupuesto para actualizar'
      });
    }

    const budget = await consultationBudgetsModel.upsertBudget(
      parseInt(consultationId),
      req.body,
      userId
    );

    res.json({
      success: true,
      message: 'Presupuesto actualizado exitosamente',
      data: budget
    });
  } catch (error) {
    console.error('Error al actualizar presupuesto:', error);
    res.status(500).json({
      success: false,
      error: 'Error al actualizar presupuesto',
      details: error.message
    });
  }
};

/**
 * Actualiza solo el adelanto del presupuesto
 * PUT /consultations/:consultationId/budget/advance
 *
 * Body: { advancePayment: number }
 */
const updateAdvancePayment = async (req, res) => {
  try {
    const { consultationId } = req.params;
    const { advancePayment } = req.body;
    const userId = req.user?.user_id;

    if (!consultationId || isNaN(parseInt(consultationId))) {
      return res.status(400).json({
        success: false,
        error: 'ID de consulta invalido'
      });
    }

    if (advancePayment === undefined || isNaN(parseFloat(advancePayment))) {
      return res.status(400).json({
        success: false,
        error: 'Monto de adelanto invalido'
      });
    }

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Usuario no autenticado'
      });
    }

    const budget = await consultationBudgetsModel.updateAdvancePayment(
      parseInt(consultationId),
      parseFloat(advancePayment),
      userId
    );

    res.json({
      success: true,
      message: 'Adelanto actualizado exitosamente',
      data: budget
    });
  } catch (error) {
    console.error('Error al actualizar adelanto:', error);
    res.status(500).json({
      success: false,
      error: 'Error al actualizar adelanto',
      details: error.message
    });
  }
};

/**
 * Actualiza el estado del presupuesto
 * PUT /consultations/:consultationId/budget/status
 *
 * Body: { status: 'draft' | 'approved' | 'rejected' | 'completed' | 'cancelled' }
 */
const updateBudgetStatus = async (req, res) => {
  try {
    const { consultationId } = req.params;
    const { status } = req.body;
    const userId = req.user?.user_id;

    if (!consultationId || isNaN(parseInt(consultationId))) {
      return res.status(400).json({
        success: false,
        error: 'ID de consulta invalido'
      });
    }

    if (!status) {
      return res.status(400).json({
        success: false,
        error: 'Estado requerido'
      });
    }

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Usuario no autenticado'
      });
    }

    // Verificar si existe
    const exists = await consultationBudgetsModel.exists(parseInt(consultationId));

    if (!exists) {
      return res.status(404).json({
        success: false,
        error: 'No se encontro presupuesto'
      });
    }

    const budget = await consultationBudgetsModel.updateStatus(
      parseInt(consultationId),
      status,
      userId
    );

    res.json({
      success: true,
      message: `Estado del presupuesto actualizado a '${status}'`,
      data: budget
    });
  } catch (error) {
    console.error('Error al actualizar estado del presupuesto:', error);
    res.status(500).json({
      success: false,
      error: 'Error al actualizar estado del presupuesto',
      details: error.message
    });
  }
};

/**
 * Sincroniza los totales del presupuesto desde las tablas relacionadas
 * POST /consultations/:consultationId/budget/sync
 *
 * Util para forzar un recalculo si los triggers no se ejecutaron correctamente
 */
const syncBudgetTotals = async (req, res) => {
  try {
    const { consultationId } = req.params;
    const userId = req.user?.user_id;

    if (!consultationId || isNaN(parseInt(consultationId))) {
      return res.status(400).json({
        success: false,
        error: 'ID de consulta invalido'
      });
    }

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Usuario no autenticado'
      });
    }

    const budget = await consultationBudgetsModel.syncTotals(
      parseInt(consultationId),
      userId
    );

    res.json({
      success: true,
      message: 'Totales del presupuesto sincronizados correctamente',
      data: budget
    });
  } catch (error) {
    console.error('Error al sincronizar totales:', error);
    res.status(500).json({
      success: false,
      error: 'Error al sincronizar totales del presupuesto',
      details: error.message
    });
  }
};

/**
 * Elimina (cancela) el presupuesto de una consulta
 * DELETE /consultations/:consultationId/budget
 */
const deleteConsultationBudget = async (req, res) => {
  try {
    const { consultationId } = req.params;
    const userId = req.user?.user_id;

    if (!consultationId || isNaN(parseInt(consultationId))) {
      return res.status(400).json({
        success: false,
        error: 'ID de consulta invalido'
      });
    }

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Usuario no autenticado'
      });
    }

    const deleted = await consultationBudgetsModel.deleteByConsultationId(
      parseInt(consultationId),
      userId
    );

    if (!deleted) {
      return res.status(404).json({
        success: false,
        error: 'No se encontro presupuesto para esta consulta'
      });
    }

    res.json({
      success: true,
      message: 'Presupuesto cancelado exitosamente'
    });
  } catch (error) {
    console.error('Error al eliminar presupuesto:', error);
    res.status(500).json({
      success: false,
      error: 'Error al eliminar presupuesto'
    });
  }
};

/**
 * Verifica si existe un presupuesto para la consulta
 * GET /consultations/:consultationId/budget/exists
 */
const checkBudgetExists = async (req, res) => {
  try {
    const { consultationId } = req.params;

    if (!consultationId || isNaN(parseInt(consultationId))) {
      return res.status(400).json({
        success: false,
        error: 'ID de consulta invalido'
      });
    }

    const exists = await consultationBudgetsModel.exists(parseInt(consultationId));

    res.json({
      success: true,
      exists
    });
  } catch (error) {
    console.error('Error al verificar presupuesto:', error);
    res.status(500).json({
      success: false,
      error: 'Error al verificar presupuesto'
    });
  }
};

module.exports = {
  getConsultationBudget,
  getConsultationBudgetSummary,
  upsertConsultationBudget,
  updateConsultationBudget,
  updateAdvancePayment,
  updateBudgetStatus,
  syncBudgetTotals,
  deleteConsultationBudget,
  checkBudgetExists
};
