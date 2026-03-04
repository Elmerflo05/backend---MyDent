const {
  getAllHealthPlans,
  getHealthPlanById,
  createHealthPlan,
  updateHealthPlan,
  deleteHealthPlan,
  countHealthPlans,
  getAllHealthPlanSubscriptions,
  getHealthPlanSubscriptionById,
  createHealthPlanSubscription,
  updateHealthPlanSubscription,
  deleteHealthPlanSubscription,
  countHealthPlanSubscriptions,
  getAllTermsAcrossPlans,
  getAllHealthPlanTerms,
  getHealthPlanTermById,
  createHealthPlanTerm,
  updateHealthPlanTerm,
  deleteHealthPlanTerm
} = require('../models/healthPlansModel');

// Health Plans
const getHealthPlans = async (req, res) => {
  try {
    const { plan_type, is_active, search, page = 1, limit = 20 } = req.query;

    const filters = {
      plan_type,
      is_active: is_active !== undefined ? is_active === 'true' : undefined,
      search,
      limit: parseInt(limit),
      offset: (parseInt(page) - 1) * parseInt(limit)
    };

    const [plans, total] = await Promise.all([
      getAllHealthPlans(filters),
      countHealthPlans(filters)
    ]);

    res.json({
      success: true,
      data: plans,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Error al obtener planes de salud:', error);
    res.status(500).json({
      success: false,
      error: 'Error al obtener planes de salud'
    });
  }
};

const getHealthPlan = async (req, res) => {
  try {
    const { id } = req.params;
    const plan = await getHealthPlanById(parseInt(id));

    if (!plan) {
      return res.status(404).json({
        success: false,
        error: 'Plan de salud no encontrado'
      });
    }

    res.json({
      success: true,
      data: plan
    });
  } catch (error) {
    console.error('Error al obtener plan de salud:', error);
    res.status(500).json({
      success: false,
      error: 'Error al obtener plan de salud'
    });
  }
};

const createNewHealthPlan = async (req, res) => {
  try {
    const planData = {
      ...req.body,
      user_id_registration: req.user.user_id
    };

    if (!planData.plan_name || !planData.plan_type) {
      return res.status(400).json({
        success: false,
        error: 'Faltan campos requeridos'
      });
    }

    const newPlan = await createHealthPlan(planData);

    res.status(201).json({
      success: true,
      message: 'Plan de salud creado exitosamente',
      data: newPlan
    });
  } catch (error) {
    console.error('Error al crear plan de salud:', error);
    res.status(500).json({
      success: false,
      error: 'Error al crear plan de salud'
    });
  }
};

const updateExistingHealthPlan = async (req, res) => {
  try {
    const { id } = req.params;
    const planData = {
      ...req.body,
      user_id_modification: req.user.user_id
    };

    const updatedPlan = await updateHealthPlan(parseInt(id), planData);

    if (!updatedPlan) {
      return res.status(404).json({
        success: false,
        error: 'Plan de salud no encontrado'
      });
    }

    res.json({
      success: true,
      message: 'Plan de salud actualizado exitosamente',
      data: updatedPlan
    });
  } catch (error) {
    console.error('Error al actualizar plan de salud:', error);
    res.status(500).json({
      success: false,
      error: 'Error al actualizar plan de salud'
    });
  }
};

const deleteExistingHealthPlan = async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await deleteHealthPlan(parseInt(id), req.user.user_id);

    if (!deleted) {
      return res.status(404).json({
        success: false,
        error: 'Plan de salud no encontrado'
      });
    }

    res.json({
      success: true,
      message: 'Plan de salud eliminado exitosamente'
    });
  } catch (error) {
    console.error('Error al eliminar plan de salud:', error);
    res.status(500).json({
      success: false,
      error: 'Error al eliminar plan de salud'
    });
  }
};

// Health Plan Subscriptions
const getHealthPlanSubscriptions = async (req, res) => {
  try {
    const {
      health_plan_id,
      patient_id,
      subscription_status,
      date_from,
      date_to,
      page = 1,
      limit = 20
    } = req.query;

    const filters = {
      health_plan_id: health_plan_id ? parseInt(health_plan_id) : null,
      patient_id: patient_id ? parseInt(patient_id) : null,
      subscription_status,
      date_from,
      date_to,
      limit: parseInt(limit),
      offset: (parseInt(page) - 1) * parseInt(limit)
    };

    const [subscriptions, total] = await Promise.all([
      getAllHealthPlanSubscriptions(filters),
      countHealthPlanSubscriptions(filters)
    ]);

    res.json({
      success: true,
      data: subscriptions,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Error al obtener suscripciones:', error);
    res.status(500).json({
      success: false,
      error: 'Error al obtener suscripciones'
    });
  }
};

const getHealthPlanSubscription = async (req, res) => {
  try {
    const { id } = req.params;
    const subscription = await getHealthPlanSubscriptionById(parseInt(id));

    if (!subscription) {
      return res.status(404).json({
        success: false,
        error: 'Suscripción no encontrada'
      });
    }

    res.json({
      success: true,
      data: subscription
    });
  } catch (error) {
    console.error('Error al obtener suscripción:', error);
    res.status(500).json({
      success: false,
      error: 'Error al obtener suscripción'
    });
  }
};

const createNewHealthPlanSubscription = async (req, res) => {
  try {
    const subscriptionData = {
      ...req.body,
      user_id_registration: req.user.user_id
    };

    if (!subscriptionData.health_plan_id || !subscriptionData.patient_id ||
        !subscriptionData.start_date) {
      return res.status(400).json({
        success: false,
        error: 'Faltan campos requeridos'
      });
    }

    const newSubscription = await createHealthPlanSubscription(subscriptionData);

    res.status(201).json({
      success: true,
      message: 'Suscripción creada exitosamente',
      data: newSubscription
    });
  } catch (error) {
    console.error('Error al crear suscripción:', error);
    res.status(500).json({
      success: false,
      error: 'Error al crear suscripción'
    });
  }
};

const updateExistingHealthPlanSubscription = async (req, res) => {
  try {
    const { id } = req.params;
    const subscriptionData = {
      ...req.body,
      user_id_modification: req.user.user_id
    };

    const updatedSubscription = await updateHealthPlanSubscription(parseInt(id), subscriptionData);

    if (!updatedSubscription) {
      return res.status(404).json({
        success: false,
        error: 'Suscripción no encontrada'
      });
    }

    res.json({
      success: true,
      message: 'Suscripción actualizada exitosamente',
      data: updatedSubscription
    });
  } catch (error) {
    console.error('Error al actualizar suscripción:', error);
    res.status(500).json({
      success: false,
      error: 'Error al actualizar suscripción'
    });
  }
};

const deleteExistingHealthPlanSubscription = async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await deleteHealthPlanSubscription(parseInt(id), req.user.user_id);

    if (!deleted) {
      return res.status(404).json({
        success: false,
        error: 'Suscripción no encontrada'
      });
    }

    res.json({
      success: true,
      message: 'Suscripción eliminada exitosamente'
    });
  } catch (error) {
    console.error('Error al eliminar suscripción:', error);
    res.status(500).json({
      success: false,
      error: 'Error al eliminar suscripción'
    });
  }
};

// Health Plan Terms

// Obtener TODOS los términos de todos los planes
const getAllTerms = async (req, res) => {
  try {
    const terms = await getAllTermsAcrossPlans();
    res.json({
      success: true,
      data: terms
    });
  } catch (error) {
    console.error('Error al obtener todos los términos:', error);
    res.status(500).json({
      success: false,
      error: 'Error al obtener términos'
    });
  }
};

const getHealthPlanTerms = async (req, res) => {
  try {
    const { planId } = req.params;
    const terms = await getAllHealthPlanTerms(parseInt(planId));

    res.json({
      success: true,
      data: terms
    });
  } catch (error) {
    console.error('Error al obtener términos del plan:', error);
    res.status(500).json({
      success: false,
      error: 'Error al obtener términos del plan'
    });
  }
};

const getHealthPlanTerm = async (req, res) => {
  try {
    const { id } = req.params;
    const term = await getHealthPlanTermById(parseInt(id));

    if (!term) {
      return res.status(404).json({
        success: false,
        error: 'Término no encontrado'
      });
    }

    res.json({
      success: true,
      data: term
    });
  } catch (error) {
    console.error('Error al obtener término:', error);
    res.status(500).json({
      success: false,
      error: 'Error al obtener término'
    });
  }
};

const createNewHealthPlanTerm = async (req, res) => {
  try {
    const { planId } = req.params;
    const termData = {
      ...req.body,
      health_plan_id: parseInt(planId),
      user_id_registration: req.user.user_id
    };

    if (!termData.term_type || !termData.term_description) {
      return res.status(400).json({
        success: false,
        error: 'Faltan campos requeridos'
      });
    }

    const newTerm = await createHealthPlanTerm(termData);

    res.status(201).json({
      success: true,
      message: 'Término creado exitosamente',
      data: newTerm
    });
  } catch (error) {
    console.error('Error al crear término:', error);
    res.status(500).json({
      success: false,
      error: 'Error al crear término'
    });
  }
};

const updateExistingHealthPlanTerm = async (req, res) => {
  try {
    const { id } = req.params;
    const termData = {
      ...req.body,
      user_id_modification: req.user.user_id
    };

    const updatedTerm = await updateHealthPlanTerm(parseInt(id), termData);

    if (!updatedTerm) {
      return res.status(404).json({
        success: false,
        error: 'Término no encontrado'
      });
    }

    res.json({
      success: true,
      message: 'Término actualizado exitosamente',
      data: updatedTerm
    });
  } catch (error) {
    console.error('Error al actualizar término:', error);
    res.status(500).json({
      success: false,
      error: 'Error al actualizar término'
    });
  }
};

const deleteExistingHealthPlanTerm = async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await deleteHealthPlanTerm(parseInt(id), req.user.user_id);

    if (!deleted) {
      return res.status(404).json({
        success: false,
        error: 'Término no encontrado'
      });
    }

    res.json({
      success: true,
      message: 'Término eliminado exitosamente'
    });
  } catch (error) {
    console.error('Error al eliminar término:', error);
    res.status(500).json({
      success: false,
      error: 'Error al eliminar término'
    });
  }
};

module.exports = {
  getHealthPlans,
  getHealthPlan,
  createNewHealthPlan,
  updateExistingHealthPlan,
  deleteExistingHealthPlan,
  getHealthPlanSubscriptions,
  getHealthPlanSubscription,
  createNewHealthPlanSubscription,
  updateExistingHealthPlanSubscription,
  deleteExistingHealthPlanSubscription,
  getAllTerms,
  getHealthPlanTerms,
  getHealthPlanTerm,
  createNewHealthPlanTerm,
  updateExistingHealthPlanTerm,
  deleteExistingHealthPlanTerm
};
