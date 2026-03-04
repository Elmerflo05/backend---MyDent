const {
  getAllBudgets,
  getBudgetById,
  createBudget,
  updateBudget,
  acceptBudget,
  deleteBudget,
  countBudgets,
  addBudgetDetail,
  deleteBudgetDetail
} = require('../models/budgetsModel');

const {
  validatePromotion,
  calculateDiscount,
  registerPromotionUsage,
  validateAndApplyPromotionAtomic
} = require('../utils/promotionValidation');

const pool = require('../config/db');

const getBudgets = async (req, res) => {
  try {
    const {
      patient_id,
      dentist_id,
      branch_id,
      budget_status_id,
      accepted_by_patient,
      page = 1,
      limit = 20
    } = req.query;

    const filters = {
      patient_id: patient_id ? parseInt(patient_id) : null,
      dentist_id: dentist_id ? parseInt(dentist_id) : null,
      branch_id: branch_id ? parseInt(branch_id) : null,
      budget_status_id: budget_status_id ? parseInt(budget_status_id) : null,
      accepted_by_patient: accepted_by_patient !== undefined ? accepted_by_patient === 'true' : undefined,
      limit: parseInt(limit),
      offset: (parseInt(page) - 1) * parseInt(limit)
    };

    const [budgets, total] = await Promise.all([
      getAllBudgets(filters),
      countBudgets(filters)
    ]);

    res.json({
      success: true,
      data: budgets,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Error al obtener presupuestos:', error);
    res.status(500).json({
      success: false,
      error: 'Error al obtener presupuestos'
    });
  }
};

const getBudget = async (req, res) => {
  try {
    const { id } = req.params;
    const budget = await getBudgetById(parseInt(id));

    if (!budget) {
      return res.status(404).json({
        success: false,
        error: 'Presupuesto no encontrado'
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
      error: 'Error al obtener presupuesto'
    });
  }
};

const createNewBudget = async (req, res) => {
  try {
    const { details, promotion_id, promotion_code, ...budgetData } = req.body;

    budgetData.user_id_registration = req.user.user_id;

    // Validaciones básicas
    if (!budgetData.patient_id || !budgetData.dentist_id ||
        !budgetData.branch_id || !budgetData.budget_status_id ||
        !budgetData.budget_date || !budgetData.subtotal ||
        !budgetData.total_amount) {
      return res.status(400).json({
        success: false,
        error: 'Faltan campos requeridos'
      });
    }

    if (!details || details.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'El presupuesto debe tener al menos un detalle'
      });
    }

    // VALIDACIÓN Y APLICACIÓN ATÓMICA DE PROMOCIÓN
    let promotionResult = null;

    if (promotion_id || promotion_code) {
      // Preparar procedimientos para validación
      const procedures = details.map(d => ({
        type: d.procedure_type || 'condition',
        id: d.dental_procedure_id || d.sub_procedure_id,
        code: d.procedure_code,
        price: parseFloat(d.unit_price || 0)
      }));

      try {
        // Usar función atómica que previene race conditions
        // - SELECT FOR UPDATE bloquea la promoción
        // - Valida límites de forma segura
        // - Registra uso e incrementa contador atómicamente
        promotionResult = await validateAndApplyPromotionAtomic({
          promotionId: promotion_id,
          promotionCode: promotion_code,
          patientId: budgetData.patient_id,
          branchId: budgetData.branch_id,
          budgetId: null, // Se actualizará después de crear el presupuesto
          procedures,
          subtotal: parseFloat(budgetData.subtotal),
          usedByUserId: req.user.user_id,
          notes: 'Pendiente asociar presupuesto'
        });

        if (!promotionResult.success) {
          return res.status(400).json({
            success: false,
            error: promotionResult.message || 'Promoción no válida'
          });
        }

        // Actualizar datos del presupuesto con descuento calculado
        budgetData.discount_amount = promotionResult.discountAmount;
        budgetData.total_amount = promotionResult.finalAmount;
        budgetData.promotion_id = promotionResult.promotion.promotion_id;

      } catch (promoError) {
        console.error('Error en validación atómica de promoción:', promoError);
        return res.status(500).json({
          success: false,
          error: 'Error al procesar la promoción'
        });
      }
    }

    // Crear presupuesto (la promoción ya fue validada y registrada atómicamente)
    const newBudget = await createBudget(budgetData, details);

    // Actualizar el registro de uso con el budget_id
    if (promotionResult && promotionResult.usage && newBudget) {
      try {
        await pool.query(`
          UPDATE promotion_usages
          SET budget_id = $1,
              notes = $2
          WHERE usage_id = $3
        `, [
          newBudget.budget_id,
          `Aplicado en presupuesto #${newBudget.budget_id}`,
          promotionResult.usage.usage_id
        ]);
      } catch (updateError) {
        // Log pero no fallar - el uso ya está registrado
        console.error('Error al actualizar budget_id en promotion_usage:', updateError);
      }
    }

    res.status(201).json({
      success: true,
      message: 'Presupuesto creado exitosamente',
      data: newBudget,
      promotion: promotionResult ? {
        promotion_id: promotionResult.promotion.promotion_id,
        promotion_name: promotionResult.promotion.promotion_name,
        discount_applied: promotionResult.discountAmount
      } : null
    });
  } catch (error) {
    console.error('Error al crear presupuesto:', error);
    res.status(500).json({
      success: false,
      error: 'Error al crear presupuesto'
    });
  }
};

const updateExistingBudget = async (req, res) => {
  try {
    const { id } = req.params;
    const budgetData = {
      ...req.body,
      user_id_modification: req.user.user_id
    };

    // No permitir actualización de detalles por esta ruta
    delete budgetData.details;

    const updatedBudget = await updateBudget(parseInt(id), budgetData);

    if (!updatedBudget) {
      return res.status(404).json({
        success: false,
        error: 'Presupuesto no encontrado'
      });
    }

    res.json({
      success: true,
      message: 'Presupuesto actualizado exitosamente',
      data: updatedBudget
    });
  } catch (error) {
    console.error('Error al actualizar presupuesto:', error);
    res.status(500).json({
      success: false,
      error: 'Error al actualizar presupuesto'
    });
  }
};

const acceptExistingBudget = async (req, res) => {
  try {
    const { id } = req.params;
    const acceptedBudget = await acceptBudget(parseInt(id), req.user.user_id);

    if (!acceptedBudget) {
      return res.status(404).json({
        success: false,
        error: 'Presupuesto no encontrado'
      });
    }

    res.json({
      success: true,
      message: 'Presupuesto aceptado exitosamente',
      data: acceptedBudget
    });
  } catch (error) {
    console.error('Error al aceptar presupuesto:', error);
    res.status(500).json({
      success: false,
      error: 'Error al aceptar presupuesto'
    });
  }
};

const deleteExistingBudget = async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await deleteBudget(parseInt(id), req.user.user_id);

    if (!deleted) {
      return res.status(404).json({
        success: false,
        error: 'Presupuesto no encontrado'
      });
    }

    res.json({
      success: true,
      message: 'Presupuesto eliminado exitosamente'
    });
  } catch (error) {
    console.error('Error al eliminar presupuesto:', error);
    res.status(500).json({
      success: false,
      error: 'Error al eliminar presupuesto'
    });
  }
};

const addDetailToBudget = async (req, res) => {
  try {
    const { id } = req.params;
    const detailData = req.body;

    if (!detailData.dental_procedure_id || !detailData.unit_price || !detailData.subtotal) {
      return res.status(400).json({
        success: false,
        error: 'Faltan campos requeridos para el detalle'
      });
    }

    const newDetail = await addBudgetDetail(parseInt(id), detailData, req.user.user_id);

    res.status(201).json({
      success: true,
      message: 'Detalle agregado exitosamente',
      data: newDetail
    });
  } catch (error) {
    console.error('Error al agregar detalle:', error);
    res.status(500).json({
      success: false,
      error: 'Error al agregar detalle'
    });
  }
};

const removeDetailFromBudget = async (req, res) => {
  try {
    const { detailId } = req.params;
    const deleted = await deleteBudgetDetail(parseInt(detailId), req.user.user_id);

    if (!deleted) {
      return res.status(404).json({
        success: false,
        error: 'Detalle no encontrado'
      });
    }

    res.json({
      success: true,
      message: 'Detalle eliminado exitosamente'
    });
  } catch (error) {
    console.error('Error al eliminar detalle:', error);
    res.status(500).json({
      success: false,
      error: 'Error al eliminar detalle'
    });
  }
};

module.exports = {
  getBudgets,
  getBudget,
  createNewBudget,
  updateExistingBudget,
  acceptExistingBudget,
  deleteExistingBudget,
  addDetailToBudget,
  removeDetailFromBudget
};
