const {
  getAllNotifications,
  getNotificationById,
  createNotification,
  updateNotification,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  countNotifications,
  countUnreadNotifications,
  countUnreadPatientNotifications,
  markPatientNotificationAsRead,
  markAllPatientNotificationsAsRead,
  generatePaymentReminderNotifications,
  createPaymentNotification
} = require('../models/notificationsModel');

const getNotifications = async (req, res) => {
  try {
    const {
      user_id,
      patient_id,
      notification_type,
      is_read,
      priority,
      not_expired,
      page = 1,
      limit = 20
    } = req.query;

    const filters = {
      user_id: user_id ? parseInt(user_id) : null,
      patient_id: patient_id ? parseInt(patient_id) : null,
      notification_type,
      is_read: is_read !== undefined ? is_read === 'true' : undefined,
      priority,
      not_expired: not_expired === 'true',
      limit: parseInt(limit),
      offset: (parseInt(page) - 1) * parseInt(limit)
    };

    const [notifications, total] = await Promise.all([
      getAllNotifications(filters),
      countNotifications(filters)
    ]);

    res.json({
      success: true,
      data: notifications,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Error al obtener notificaciones:', error);
    res.status(500).json({
      success: false,
      error: 'Error al obtener notificaciones'
    });
  }
};

const getNotification = async (req, res) => {
  try {
    const { id } = req.params;
    const notification = await getNotificationById(parseInt(id));

    if (!notification) {
      return res.status(404).json({
        success: false,
        error: 'Notificación no encontrada'
      });
    }

    res.json({
      success: true,
      data: notification
    });
  } catch (error) {
    console.error('Error al obtener notificación:', error);
    res.status(500).json({
      success: false,
      error: 'Error al obtener notificación'
    });
  }
};

const createNewNotification = async (req, res) => {
  try {
    const notificationData = {
      ...req.body,
      user_id_registration: req.user.user_id
    };

    if (!notificationData.notification_type || !notificationData.notification_title ||
        !notificationData.notification_message) {
      return res.status(400).json({
        success: false,
        error: 'Faltan campos requeridos'
      });
    }

    const newNotification = await createNotification(notificationData);

    res.status(201).json({
      success: true,
      message: 'Notificación creada exitosamente',
      data: newNotification
    });
  } catch (error) {
    console.error('Error al crear notificación:', error);
    res.status(500).json({
      success: false,
      error: 'Error al crear notificación'
    });
  }
};

const updateExistingNotification = async (req, res) => {
  try {
    const { id } = req.params;
    const notificationData = {
      ...req.body,
      user_id_modification: req.user.user_id
    };

    const updatedNotification = await updateNotification(parseInt(id), notificationData);

    if (!updatedNotification) {
      return res.status(404).json({
        success: false,
        error: 'Notificación no encontrada'
      });
    }

    res.json({
      success: true,
      message: 'Notificación actualizada exitosamente',
      data: updatedNotification
    });
  } catch (error) {
    console.error('Error al actualizar notificación:', error);
    res.status(500).json({
      success: false,
      error: 'Error al actualizar notificación'
    });
  }
};

const markNotificationAsRead = async (req, res) => {
  try {
    const { id } = req.params;
    const updatedNotification = await markAsRead(parseInt(id), req.user.user_id);

    if (!updatedNotification) {
      return res.status(404).json({
        success: false,
        error: 'Notificación no encontrada'
      });
    }

    res.json({
      success: true,
      message: 'Notificación marcada como leída',
      data: updatedNotification
    });
  } catch (error) {
    console.error('Error al marcar notificación como leída:', error);
    res.status(500).json({
      success: false,
      error: 'Error al marcar notificación como leída'
    });
  }
};

const markAllNotificationsAsRead = async (req, res) => {
  try {
    const result = await markAllAsRead(req.user.user_id);

    res.json({
      success: true,
      message: `${result.updated_count || 0} notificaciones marcadas como leídas`
    });
  } catch (error) {
    console.error('Error al marcar todas las notificaciones como leídas:', error);
    res.status(500).json({
      success: false,
      error: 'Error al marcar todas las notificaciones como leídas'
    });
  }
};

const getUnreadCount = async (req, res) => {
  try {
    const count = await countUnreadNotifications(req.user.user_id);

    res.json({
      success: true,
      data: {
        unread_count: count
      }
    });
  } catch (error) {
    console.error('Error al obtener contador de no leídas:', error);
    res.status(500).json({
      success: false,
      error: 'Error al obtener contador de no leídas'
    });
  }
};

const deleteExistingNotification = async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await deleteNotification(parseInt(id), req.user.user_id);

    if (!deleted) {
      return res.status(404).json({
        success: false,
        error: 'Notificación no encontrada'
      });
    }

    res.json({
      success: true,
      message: 'Notificación eliminada exitosamente'
    });
  } catch (error) {
    console.error('Error al eliminar notificación:', error);
    res.status(500).json({
      success: false,
      error: 'Error al eliminar notificación'
    });
  }
};

// =====================================================
// ENDPOINTS PARA PACIENTES
// =====================================================

/**
 * Obtiene las notificaciones de un paciente
 * GET /api/patient/notifications
 */
const getPatientNotifications = async (req, res) => {
  try {
    const patientId = req.user?.patient_id;

    if (!patientId) {
      return res.status(400).json({
        success: false,
        error: 'No se encontró información del paciente'
      });
    }

    const {
      notification_type,
      is_read,
      page = 1,
      limit = 20
    } = req.query;

    const filters = {
      patient_id: patientId,
      notification_type,
      is_read: is_read !== undefined ? is_read === 'true' : undefined,
      not_expired: true,
      limit: parseInt(limit),
      offset: (parseInt(page) - 1) * parseInt(limit)
    };

    const [notifications, total] = await Promise.all([
      getAllNotifications(filters),
      countNotifications(filters)
    ]);

    res.json({
      success: true,
      data: notifications,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Error al obtener notificaciones del paciente:', error);
    res.status(500).json({
      success: false,
      error: 'Error al obtener notificaciones'
    });
  }
};

/**
 * Obtiene el conteo de notificaciones no leídas del paciente
 * GET /api/patient/notifications/unread-count
 */
const getPatientUnreadCount = async (req, res) => {
  try {
    const patientId = req.user?.patient_id;

    if (!patientId) {
      return res.status(400).json({
        success: false,
        error: 'No se encontró información del paciente'
      });
    }

    const count = await countUnreadPatientNotifications(patientId);

    res.json({
      success: true,
      data: {
        unread_count: count
      }
    });
  } catch (error) {
    console.error('Error al obtener contador de no leídas del paciente:', error);
    res.status(500).json({
      success: false,
      error: 'Error al obtener contador de no leídas'
    });
  }
};

/**
 * Marca una notificación del paciente como leída
 * PUT /api/patient/notifications/:id/read
 */
const markPatientNotificationRead = async (req, res) => {
  try {
    const { id } = req.params;
    const patientId = req.user?.patient_id;

    if (!patientId) {
      return res.status(400).json({
        success: false,
        error: 'No se encontró información del paciente'
      });
    }

    const updatedNotification = await markPatientNotificationAsRead(parseInt(id), patientId);

    if (!updatedNotification) {
      return res.status(404).json({
        success: false,
        error: 'Notificación no encontrada'
      });
    }

    res.json({
      success: true,
      message: 'Notificación marcada como leída',
      data: updatedNotification
    });
  } catch (error) {
    console.error('Error al marcar notificación como leída:', error);
    res.status(500).json({
      success: false,
      error: 'Error al marcar notificación como leída'
    });
  }
};

/**
 * Marca todas las notificaciones del paciente como leídas
 * PUT /api/patient/notifications/mark-all-read
 */
const markAllPatientNotificationsRead = async (req, res) => {
  try {
    const patientId = req.user?.patient_id;

    if (!patientId) {
      return res.status(400).json({
        success: false,
        error: 'No se encontró información del paciente'
      });
    }

    const result = await markAllPatientNotificationsAsRead(patientId);

    res.json({
      success: true,
      message: `${result.updated_count || 0} notificaciones marcadas como leídas`
    });
  } catch (error) {
    console.error('Error al marcar todas las notificaciones como leídas:', error);
    res.status(500).json({
      success: false,
      error: 'Error al marcar todas las notificaciones como leídas'
    });
  }
};

// =====================================================
// ENDPOINTS PARA ADMINISTRACIÓN
// =====================================================

/**
 * Genera notificaciones de recordatorio de pago para cuotas próximas a vencer
 * POST /api/notifications/generate-payment-reminders
 * Solo accesible por admins
 */
const generatePaymentReminders = async (req, res) => {
  try {
    const { days_before = 3 } = req.body;

    const result = await generatePaymentReminderNotifications(parseInt(days_before));

    res.json({
      success: true,
      message: `Se generaron ${result.generated} notificaciones de recordatorio de pago`,
      data: result
    });
  } catch (error) {
    console.error('Error al generar notificaciones de recordatorio:', error);
    res.status(500).json({
      success: false,
      error: 'Error al generar notificaciones de recordatorio'
    });
  }
};

/**
 * Crea una notificación de nuevo cargo para un paciente
 * POST /api/notifications/payment-notification
 * Usado internamente cuando se registra un nuevo ingreso
 */
const createNewPaymentNotification = async (req, res) => {
  try {
    const { patient_id, item_name, final_amount, due_date, quota_number, income_id } = req.body;

    if (!patient_id || !item_name || !final_amount) {
      return res.status(400).json({
        success: false,
        error: 'Faltan campos requeridos: patient_id, item_name, final_amount'
      });
    }

    const notification = await createPaymentNotification({
      patient_id,
      item_name,
      final_amount,
      due_date,
      quota_number,
      income_id
    });

    res.status(201).json({
      success: true,
      message: 'Notificación de pago creada exitosamente',
      data: notification
    });
  } catch (error) {
    console.error('Error al crear notificación de pago:', error);
    res.status(500).json({
      success: false,
      error: 'Error al crear notificación de pago'
    });
  }
};

module.exports = {
  getNotifications,
  getNotification,
  createNewNotification,
  updateExistingNotification,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  getUnreadCount,
  deleteExistingNotification,
  // Endpoints para pacientes
  getPatientNotifications,
  getPatientUnreadCount,
  markPatientNotificationRead,
  markAllPatientNotificationsRead,
  // Endpoints administrativos
  generatePaymentReminders,
  createNewPaymentNotification
};
