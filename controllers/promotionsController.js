const {
  getAllPromotions,
  getPromotionById,
  createPromotion,
  updatePromotion,
  deletePromotion,
  incrementPromotionUses,
  countPromotions
} = require('../models/promotionsModel');

const {
  validatePromotion,
  calculateDiscount,
  registerPromotionUsage,
  getAvailablePromotionsForProcedure,
  canStackPromotions
} = require('../utils/promotionValidation');

const getPromotions = async (req, res) => {
  try {
    const {
      branch_id, promotion_type, discount_type, is_active, search, active_only, page = 1, limit = 20
    } = req.query;

    const filters = {
      branch_id: branch_id ? parseInt(branch_id) : null,
      promotion_type, discount_type,
      is_active: is_active !== undefined ? is_active === 'true' : undefined,
      search, active_only: active_only === 'true',
      limit: parseInt(limit), offset: (parseInt(page) - 1) * parseInt(limit)
    };

    const [promotions, total] = await Promise.all([getAllPromotions(filters), countPromotions(filters)]);

    res.json({ success: true, data: promotions, pagination: { total, page: parseInt(page), limit: parseInt(limit), totalPages: Math.ceil(total / parseInt(limit)) } });
  } catch (error) {
    console.error('Error al obtener promociones:', error);
    res.status(500).json({ success: false, error: 'Error al obtener promociones' });
  }
};

const getPromotion = async (req, res) => {
  try {
    const { id } = req.params;
    const promotion = await getPromotionById(parseInt(id));
    if (!promotion) return res.status(404).json({ success: false, error: 'Promocion no encontrada' });
    res.json({ success: true, data: promotion });
  } catch (error) {
    console.error('Error al obtener promocion:', error);
    res.status(500).json({ success: false, error: 'Error al obtener promocion' });
  }
};

const createNewPromotion = async (req, res) => {
  try {
    const promotionData = { ...req.body, user_id_registration: req.user.user_id };
    if (!promotionData.promotion_name || !promotionData.promotion_type || !promotionData.discount_type || !promotionData.discount_value || !promotionData.start_date || !promotionData.end_date) {
      return res.status(400).json({ success: false, error: 'Faltan campos requeridos' });
    }
    const newPromotion = await createPromotion(promotionData);
    res.status(201).json({ success: true, message: 'Promocion creada exitosamente', data: newPromotion });
  } catch (error) {
    console.error('Error al crear promocion:', error);
    res.status(500).json({ success: false, error: 'Error al crear promocion' });
  }
};

const updateExistingPromotion = async (req, res) => {
  try {
    const { id } = req.params;
    const promotionData = { ...req.body, user_id_modification: req.user.user_id };
    const updatedPromotion = await updatePromotion(parseInt(id), promotionData);
    if (!updatedPromotion) return res.status(404).json({ success: false, error: 'Promocion no encontrada' });
    res.json({ success: true, message: 'Promocion actualizada exitosamente', data: updatedPromotion });
  } catch (error) {
    console.error('Error al actualizar promocion:', error);
    res.status(500).json({ success: false, error: 'Error al actualizar promocion' });
  }
};

const deleteExistingPromotion = async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await deletePromotion(parseInt(id), req.user.user_id);
    if (!deleted) return res.status(404).json({ success: false, error: 'Promocion no encontrada' });
    res.json({ success: true, message: 'Promocion eliminada exitosamente' });
  } catch (error) {
    console.error('Error al eliminar promocion:', error);
    res.status(500).json({ success: false, error: 'Error al eliminar promocion' });
  }
};

const usePromotion = async (req, res) => {
  try {
    const { id } = req.params;
    const updatedPromotion = await incrementPromotionUses(parseInt(id));
    if (!updatedPromotion) return res.status(404).json({ success: false, error: 'Promocion no encontrada' });
    if (updatedPromotion.max_uses && updatedPromotion.current_uses > updatedPromotion.max_uses) {
      return res.status(400).json({ success: false, error: 'La promocion ha alcanzado el limite de usos' });
    }
    res.json({ success: true, message: 'Promocion aplicada exitosamente', data: updatedPromotion });
  } catch (error) {
    console.error('Error al aplicar promocion:', error);
    res.status(500).json({ success: false, error: 'Error al aplicar promocion' });
  }
};

const validatePromotionEndpoint = async (req, res) => {
  try {
    const { promotion_id, promotion_code, patient_id, branch_id, procedures = [], subtotal = 0 } = req.body;
    const branchId = branch_id || req.user?.branch_id;
    const validation = await validatePromotion({ promotionId: promotion_id, promotionCode: promotion_code, patientId: patient_id, branchId, procedures, subtotal });
    if (!validation.valid) return res.status(400).json({ success: false, applicable: false, message: validation.message });
    const eligibleAmount = validation.eligibleProcedures.reduce((sum, p) => sum + parseFloat(p.price || 0), 0);
    const discountAmount = calculateDiscount(validation.promotion, eligibleAmount || subtotal);
    res.json({ success: true, applicable: true, data: { promotion_id: validation.promotion.promotion_id, promotion_name: validation.promotion.promotion_name, discount_type: validation.promotion.discount_type, discount_value: validation.promotion.discount_value, discount_amount: discountAmount, original_amount: eligibleAmount || subtotal, final_amount: (eligibleAmount || subtotal) - discountAmount, is_stackable: validation.promotion.is_stackable } });
  } catch (error) {
    console.error('Error al validar promocion:', error);
    res.status(500).json({ success: false, error: 'Error al validar promocion' });
  }
};

const applyPromotionEndpoint = async (req, res) => {
  try {
    const { promotion_id, patient_id, budget_id, consultation_budget_id, procedures = [], subtotal = 0, notes } = req.body;
    const branchId = req.user?.branch_id;
    const validation = await validatePromotion({ promotionId: promotion_id, patientId: patient_id, branchId, procedures, subtotal });
    if (!validation.valid) return res.status(400).json({ success: false, message: validation.message });
    const eligibleAmount = validation.eligibleProcedures.reduce((sum, p) => sum + parseFloat(p.price || 0), 0);
    const discountAmount = calculateDiscount(validation.promotion, eligibleAmount || subtotal);
    const finalAmount = (eligibleAmount || subtotal) - discountAmount;
    const usage = await registerPromotionUsage({ promotionId: promotion_id, patientId: patient_id, budgetId: budget_id, consultationBudgetId: consultation_budget_id, appliedDiscount: discountAmount, originalAmount: eligibleAmount || subtotal, finalAmount, proceduresAffected: validation.eligibleProcedures, usedByUserId: req.user?.user_id, notes });
    res.json({ success: true, message: 'Promocion aplicada exitosamente', data: { usage_id: usage.usage_id, applied_discount: discountAmount, final_amount: finalAmount } });
  } catch (error) {
    console.error('Error al aplicar promocion:', error);
    res.status(500).json({ success: false, error: 'Error al aplicar promocion' });
  }
};

const getAvailablePromotionsEndpoint = async (req, res) => {
  try {
    const { procedure_type, procedure_id, procedure_code, branch_id, patient_id } = req.query;
    if (!procedure_type || !procedure_id) return res.status(400).json({ success: false, error: 'Se requiere procedure_type y procedure_id' });
    const promotions = await getAvailablePromotionsForProcedure({ procedureType: procedure_type, procedureId: parseInt(procedure_id), procedureCode: procedure_code, branchId: branch_id ? parseInt(branch_id) : req.user?.branch_id, patientId: patient_id ? parseInt(patient_id) : null });
    res.json({ success: true, data: promotions.map(p => ({ promotion_id: p.promotion_id, promotion_name: p.promotion_name, promotion_code: p.promotion_code, discount_type: p.discount_type, discount_value: parseFloat(p.discount_value), end_date: p.end_date, is_stackable: p.is_stackable })) });
  } catch (error) {
    console.error('Error al obtener promociones disponibles:', error);
    res.status(500).json({ success: false, error: 'Error al obtener promociones disponibles' });
  }
};

const checkStackableEndpoint = async (req, res) => {
  try {
    const { promotion_id_1, promotion_id_2 } = req.query;
    if (!promotion_id_1 || !promotion_id_2) return res.status(400).json({ success: false, error: 'Se requieren promotion_id_1 y promotion_id_2' });
    const canStack = await canStackPromotions(parseInt(promotion_id_1), parseInt(promotion_id_2));
    res.json({ success: true, can_stack: canStack });
  } catch (error) {
    console.error('Error al verificar promociones combinables:', error);
    res.status(500).json({ success: false, error: 'Error al verificar promociones combinables' });
  }
};

module.exports = { getPromotions, getPromotion, createNewPromotion, updateExistingPromotion, deleteExistingPromotion, usePromotion, validatePromotionEndpoint, applyPromotionEndpoint, getAvailablePromotionsEndpoint, checkStackableEndpoint };
