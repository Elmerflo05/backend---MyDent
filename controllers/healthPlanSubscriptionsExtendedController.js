/**
 * Health Plan Subscriptions Extended Controller
 * Controlador extendido para suscripciones con voucher y aprobacion
 */

const {
  createSubscriptionWithVoucher,
  approveSubscription,
  rejectSubscription,
  getPendingSubscriptions,
  countPendingSubscriptions,
  getActiveSubscriptionByPatient,
  hasActivePlan,
  markFirstFreeConsultationUsed,
  isFirstFreeConsultationAvailable,
  getSubscriptionStats,
  getPatientSubscriptionHistory
} = require('../models/healthPlanSubscriptionsExtendedModel');

// ============================================================================
// CREAR SUSCRIPCION CON VOUCHER (Portal Paciente)
// ============================================================================

/**
 * Crear suscripcion con voucher
 */
const createSubscription = async (req, res) => {
  try {
    // Verificar que se haya subido el archivo del voucher
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'El voucher de pago es requerido'
      });
    }

    // Construir la URL relativa del voucher
    const voucherUrl = `/uploads/vouchers_plan/${req.file.filename}`;

    const data = {
      ...req.body,
      voucher_url: voucherUrl,
      user_id_registration: req.user.user_id
    };

    if (!data.health_plan_id || !data.patient_id) {
      return res.status(400).json({
        success: false,
        error: 'Plan de salud y paciente son requeridos'
      });
    }

    // Verificar que el paciente no tenga ya un plan activo
    const hasActive = await hasActivePlan(data.patient_id);
    if (hasActive) {
      return res.status(400).json({
        success: false,
        error: 'El paciente ya tiene un plan de salud activo'
      });
    }

    const newSubscription = await createSubscriptionWithVoucher(data);

    res.status(201).json({
      success: true,
      message: 'Solicitud de suscripcion creada. Pendiente de aprobacion.',
      data: newSubscription
    });
  } catch (error) {
    console.error('Error al crear suscripcion:', error);
    res.status(500).json({
      success: false,
      error: 'Error al crear suscripcion'
    });
  }
};

// ============================================================================
// APROBACION Y RECHAZO (Superadmin)
// ============================================================================

/**
 * Aprobar suscripcion
 */
const approve = async (req, res) => {
  try {
    const { id } = req.params;

    const approvedSubscription = await approveSubscription(parseInt(id), req.user.user_id);

    res.json({
      success: true,
      message: 'Suscripcion aprobada exitosamente. El plan estara activo por 1 ano.',
      data: approvedSubscription
    });
  } catch (error) {
    console.error('Error al aprobar suscripcion:', error);

    if (error.message.includes('no encontrada') || error.message.includes('ya fue procesada')) {
      return res.status(404).json({
        success: false,
        error: error.message
      });
    }

    res.status(500).json({
      success: false,
      error: 'Error al aprobar suscripcion'
    });
  }
};

/**
 * Rechazar suscripcion
 */
const reject = async (req, res) => {
  try {
    const { id } = req.params;
    const { rejection_reason } = req.body;

    if (!rejection_reason) {
      return res.status(400).json({
        success: false,
        error: 'El motivo del rechazo es requerido'
      });
    }

    const rejectedSubscription = await rejectSubscription(
      parseInt(id),
      req.user.user_id,
      rejection_reason
    );

    res.json({
      success: true,
      message: 'Suscripcion rechazada',
      data: rejectedSubscription
    });
  } catch (error) {
    console.error('Error al rechazar suscripcion:', error);

    if (error.message.includes('no encontrada') || error.message.includes('ya fue procesada')) {
      return res.status(404).json({
        success: false,
        error: error.message
      });
    }

    res.status(500).json({
      success: false,
      error: 'Error al rechazar suscripcion'
    });
  }
};

// ============================================================================
// CONSULTAS
// ============================================================================

/**
 * Obtener suscripciones pendientes de aprobacion
 */
const getPending = async (req, res) => {
  try {
    const { health_plan_id, page = 1, limit = 20 } = req.query;

    const filters = {
      health_plan_id: health_plan_id ? parseInt(health_plan_id) : null,
      limit: parseInt(limit),
      offset: (parseInt(page) - 1) * parseInt(limit)
    };

    const [subscriptions, total] = await Promise.all([
      getPendingSubscriptions(filters),
      countPendingSubscriptions()
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
    console.error('Error al obtener suscripciones pendientes:', error);
    res.status(500).json({
      success: false,
      error: 'Error al obtener suscripciones pendientes'
    });
  }
};

/**
 * Obtener suscripcion activa de un paciente
 */
const getActiveByPatient = async (req, res) => {
  try {
    const { patientId } = req.params;

    const subscription = await getActiveSubscriptionByPatient(parseInt(patientId));

    if (!subscription) {
      return res.json({
        success: true,
        has_active_plan: false,
        data: null,
        message: 'El paciente no tiene plan de salud activo'
      });
    }

    // Verificar si tiene primera consulta gratis disponible
    const freeConsultationAvailable = await isFirstFreeConsultationAvailable(
      subscription.subscription_id
    );

    res.json({
      success: true,
      has_active_plan: true,
      data: {
        ...subscription,
        first_free_consultation_available: freeConsultationAvailable
      }
    });
  } catch (error) {
    console.error('Error al obtener suscripcion del paciente:', error);
    res.status(500).json({
      success: false,
      error: 'Error al obtener suscripcion'
    });
  }
};

/**
 * Verificar si paciente tiene plan activo
 */
const checkActivePlan = async (req, res) => {
  try {
    const { patientId } = req.params;

    const hasActive = await hasActivePlan(parseInt(patientId));

    res.json({
      success: true,
      has_active_plan: hasActive
    });
  } catch (error) {
    console.error('Error al verificar plan activo:', error);
    res.status(500).json({
      success: false,
      error: 'Error al verificar plan'
    });
  }
};

// ============================================================================
// PRIMERA CONSULTA GRATIS
// ============================================================================

/**
 * Marcar primera consulta gratis como usada
 */
const useFirstFreeConsultation = async (req, res) => {
  try {
    const { subscriptionId } = req.params;

    const updated = await markFirstFreeConsultationUsed(
      parseInt(subscriptionId),
      req.user.user_id
    );

    if (!updated) {
      return res.status(400).json({
        success: false,
        error: 'Primera consulta gratis ya fue utilizada o suscripcion no encontrada'
      });
    }

    res.json({
      success: true,
      message: 'Primera consulta gratis marcada como utilizada',
      data: updated
    });
  } catch (error) {
    console.error('Error al marcar primera consulta:', error);
    res.status(500).json({
      success: false,
      error: 'Error al procesar'
    });
  }
};

/**
 * Verificar disponibilidad de primera consulta gratis
 */
const checkFirstFreeConsultation = async (req, res) => {
  try {
    const { subscriptionId } = req.params;

    const available = await isFirstFreeConsultationAvailable(parseInt(subscriptionId));

    res.json({
      success: true,
      first_free_consultation_available: available
    });
  } catch (error) {
    console.error('Error al verificar primera consulta:', error);
    res.status(500).json({
      success: false,
      error: 'Error al verificar'
    });
  }
};

// ============================================================================
// ESTADISTICAS E HISTORIAL
// ============================================================================

/**
 * Obtener estadisticas de suscripciones
 */
const getStats = async (req, res) => {
  try {
    const stats = await getSubscriptionStats();

    const totalStats = {
      total_active: stats.reduce((sum, s) => sum + parseInt(s.active_subscriptions), 0),
      total_pending: stats.reduce((sum, s) => sum + parseInt(s.pending_subscriptions), 0),
      total_rejected: stats.reduce((sum, s) => sum + parseInt(s.rejected_subscriptions), 0),
      total_monthly_revenue: stats.reduce((sum, s) => sum + parseFloat(s.monthly_revenue || 0), 0),
      by_plan: stats.map(s => ({
        ...s,
        active_subscriptions: parseInt(s.active_subscriptions) || 0,
        pending_subscriptions: parseInt(s.pending_subscriptions) || 0,
        rejected_subscriptions: parseInt(s.rejected_subscriptions) || 0,
        total_subscriptions: parseInt(s.total_subscriptions) || 0,
        monthly_revenue: parseFloat(s.monthly_revenue) || 0
      }))
    };

    res.json({
      success: true,
      data: totalStats
    });
  } catch (error) {
    console.error('Error al obtener estadisticas:', error);
    res.status(500).json({
      success: false,
      error: 'Error al obtener estadisticas'
    });
  }
};

/**
 * Obtener historial de suscripciones de un paciente
 */
const getPatientHistory = async (req, res) => {
  try {
    const { patientId } = req.params;

    const history = await getPatientSubscriptionHistory(parseInt(patientId));

    res.json({
      success: true,
      data: history
    });
  } catch (error) {
    console.error('Error al obtener historial:', error);
    res.status(500).json({
      success: false,
      error: 'Error al obtener historial'
    });
  }
};

module.exports = {
  // Crear
  createSubscription,

  // Aprobacion/Rechazo
  approve,
  reject,

  // Consultas
  getPending,
  getActiveByPatient,
  checkActivePlan,

  // Primera consulta gratis
  useFirstFreeConsultation,
  checkFirstFreeConsultation,

  // Estadisticas
  getStats,
  getPatientHistory
};
