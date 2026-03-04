const {
  getAllAppointmentReminders,
  getAppointmentReminderById,
  createAppointmentReminder,
  updateAppointmentReminder,
  markReminderAsSent,
  deleteAppointmentReminder,
  countAppointmentReminders
} = require('../models/appointmentRemindersModel');

const getAppointmentReminders = async (req, res) => {
  try {
    const {
      appointment_id,
      patient_id,
      branch_id,
      reminder_type_id,
      is_sent,
      date_from,
      date_to,
      page = 1,
      limit = 20
    } = req.query;

    const filters = {
      appointment_id: appointment_id ? parseInt(appointment_id) : null,
      patient_id: patient_id ? parseInt(patient_id) : null,
      branch_id: branch_id ? parseInt(branch_id) : null,
      reminder_type_id: reminder_type_id ? parseInt(reminder_type_id) : null,
      is_sent: is_sent !== undefined ? is_sent === 'true' : undefined,
      date_from,
      date_to,
      limit: parseInt(limit),
      offset: (parseInt(page) - 1) * parseInt(limit)
    };

    const [reminders, total] = await Promise.all([
      getAllAppointmentReminders(filters),
      countAppointmentReminders(filters)
    ]);

    res.json({
      success: true,
      data: reminders,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Error al obtener recordatorios:', error);
    res.status(500).json({
      success: false,
      error: 'Error al obtener recordatorios'
    });
  }
};

const getAppointmentReminder = async (req, res) => {
  try {
    const { id } = req.params;
    const reminder = await getAppointmentReminderById(parseInt(id));

    if (!reminder) {
      return res.status(404).json({
        success: false,
        error: 'Recordatorio no encontrado'
      });
    }

    res.json({
      success: true,
      data: reminder
    });
  } catch (error) {
    console.error('Error al obtener recordatorio:', error);
    res.status(500).json({
      success: false,
      error: 'Error al obtener recordatorio'
    });
  }
};

const createNewAppointmentReminder = async (req, res) => {
  try {
    const reminderData = {
      ...req.body,
      user_id_registration: req.user.user_id
    };

    if (!reminderData.appointment_id || !reminderData.reminder_datetime) {
      return res.status(400).json({
        success: false,
        error: 'Faltan campos requeridos'
      });
    }

    const newReminder = await createAppointmentReminder(reminderData);

    res.status(201).json({
      success: true,
      message: 'Recordatorio creado exitosamente',
      data: newReminder
    });
  } catch (error) {
    console.error('Error al crear recordatorio:', error);
    res.status(500).json({
      success: false,
      error: 'Error al crear recordatorio'
    });
  }
};

const updateExistingAppointmentReminder = async (req, res) => {
  try {
    const { id } = req.params;
    const reminderData = {
      ...req.body,
      user_id_modification: req.user.user_id
    };

    const updatedReminder = await updateAppointmentReminder(parseInt(id), reminderData);

    if (!updatedReminder) {
      return res.status(404).json({
        success: false,
        error: 'Recordatorio no encontrado'
      });
    }

    res.json({
      success: true,
      message: 'Recordatorio actualizado exitosamente',
      data: updatedReminder
    });
  } catch (error) {
    console.error('Error al actualizar recordatorio:', error);
    res.status(500).json({
      success: false,
      error: 'Error al actualizar recordatorio'
    });
  }
};

const markAsSent = async (req, res) => {
  try {
    const { id } = req.params;
    const updatedReminder = await markReminderAsSent(parseInt(id), req.user.user_id);

    if (!updatedReminder) {
      return res.status(404).json({
        success: false,
        error: 'Recordatorio no encontrado'
      });
    }

    res.json({
      success: true,
      message: 'Recordatorio marcado como enviado',
      data: updatedReminder
    });
  } catch (error) {
    console.error('Error al marcar recordatorio como enviado:', error);
    res.status(500).json({
      success: false,
      error: 'Error al marcar recordatorio como enviado'
    });
  }
};

const deleteExistingAppointmentReminder = async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await deleteAppointmentReminder(parseInt(id), req.user.user_id);

    if (!deleted) {
      return res.status(404).json({
        success: false,
        error: 'Recordatorio no encontrado'
      });
    }

    res.json({
      success: true,
      message: 'Recordatorio eliminado exitosamente'
    });
  } catch (error) {
    console.error('Error al eliminar recordatorio:', error);
    res.status(500).json({
      success: false,
      error: 'Error al eliminar recordatorio'
    });
  }
};

module.exports = {
  getAppointmentReminders,
  getAppointmentReminder,
  createNewAppointmentReminder,
  updateExistingAppointmentReminder,
  markAsSent,
  deleteExistingAppointmentReminder
};
