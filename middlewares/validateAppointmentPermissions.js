/**
 * Middleware para validar permisos de operaciones de citas
 * Valida roles y pertenencia a sede
 */

const pool = require('../config/db');

/**
 * Valida que el usuario tenga permiso para operar sobre una cita en una sede específica
 * @param {Array<string>} allowedRoles - Roles permitidos: ['super_admin', 'admin', 'receptionist', 'doctor', 'patient']
 */
const validateAppointmentPermission = (allowedRoles = []) => {
  return async (req, res, next) => {
    try {
      const userId = req.user?.user_id;
      const userRoleId = req.user?.role_id;
      const appointmentId = req.params.id;

      if (!userId) {
        return res.status(401).json({
          success: false,
          error: 'Usuario no autenticado'
        });
      }

      // Obtener rol del usuario
      const roleQuery = await pool.query(
        'SELECT role_name FROM roles WHERE role_id = $1',
        [userRoleId]
      );

      if (roleQuery.rows.length === 0) {
        return res.status(403).json({
          success: false,
          error: 'Rol de usuario no válido'
        });
      }

      const userRole = roleQuery.rows[0].role_name;
      const isSuperAdmin = userRole === 'super_admin' || userRole === 'Super Administrador';

      // Verificar si el rol está permitido (super admin siempre tiene acceso)
      if (!isSuperAdmin && !allowedRoles.includes(userRole)) {
        return res.status(403).json({
          success: false,
          error: `Operación no permitida para rol: ${userRole}`
        });
      }

      // Si hay appointmentId, consultar la cita (necesario para todos los roles)
      if (appointmentId) {
        const appointmentQuery = await pool.query(
          `SELECT a.branch_id, a.patient_id, a.dentist_id, a.appointment_status_id,
                  a.appointment_date, a.start_time
           FROM appointments a
           WHERE a.appointment_id = $1 AND a.status = 'active'`,
          [appointmentId]
        );

        if (appointmentQuery.rows.length === 0) {
          return res.status(404).json({
            success: false,
            error: 'Cita no encontrada'
          });
        }

        const appointment = appointmentQuery.rows[0];

        // Admin y Recepcionista: validar que pertenezcan a la misma sede
        const isAdminOrReceptionist = ['admin', 'Administrador de Sede', 'receptionist', 'Recepcionista'].includes(userRole);
        if (isAdminOrReceptionist) {
          const userBranchQuery = await pool.query(
            'SELECT branch_id FROM users WHERE user_id = $1',
            [userId]
          );

          if (userBranchQuery.rows.length === 0 ||
              userBranchQuery.rows[0].branch_id !== appointment.branch_id) {
            return res.status(403).json({
              success: false,
              error: 'No tienes permiso para esta cita (diferente sede)'
            });
          }
        }

        // Doctor: validar que sea el doctor asignado a la cita
        if (userRole === 'doctor' || userRole === 'Odontólogo') {
          const dentistQuery = await pool.query(
            'SELECT dentist_id FROM dentists WHERE user_id = $1',
            [userId]
          );

          if (dentistQuery.rows.length === 0 ||
              dentistQuery.rows[0].dentist_id !== appointment.dentist_id) {
            return res.status(403).json({
              success: false,
              error: 'No tienes permiso para esta cita (no eres el doctor asignado)'
            });
          }
        }

        // Paciente: validar que sea el paciente de la cita
        if (userRole === 'patient' || userRole === 'Paciente') {
          const patientQuery = await pool.query(
            'SELECT patient_id FROM patients WHERE user_id = $1',
            [userId]
          );

          if (patientQuery.rows.length === 0 ||
              patientQuery.rows[0].patient_id !== appointment.patient_id) {
            return res.status(403).json({
              success: false,
              error: 'No tienes permiso para esta cita (no eres el paciente)'
            });
          }
        }

        // Adjuntar información de la cita al request para uso posterior
        req.appointment = appointment;
      }

      req.userRole = userRole;
      next();
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Error al validar permisos'
      });
    }
  };
};

/**
 * Valida restricción de 24 horas para cancelación
 */
const validate24HourCancellation = async (req, res, next) => {
  try {
    const appointment = req.appointment;

    if (!appointment) {
      return res.status(400).json({
        success: false,
        error: 'Información de cita no disponible'
      });
    }

    // Super admin puede cancelar sin restricción (ambos formatos)
    if (req.userRole === 'super_admin' || req.userRole === 'Super Administrador') {
      return next();
    }

    // Obtener fecha y hora de la cita
    const appointmentDateTime = new Date(appointment.appointment_date);
    const [hours, minutes] = appointment.start_time?.split(':') || ['00', '00'];
    appointmentDateTime.setHours(parseInt(hours), parseInt(minutes), 0, 0);

    // Calcular diferencia en horas
    const now = new Date();
    const hoursUntilAppointment = (appointmentDateTime - now) / (1000 * 60 * 60);

    // Validar que falten más de 24 horas
    if (hoursUntilAppointment < 24) {
      return res.status(400).json({
        success: false,
        error: 'No se puede cancelar con menos de 24 horas de anticipación',
        details: {
          appointment_time: appointmentDateTime.toISOString(),
          hours_remaining: Math.round(hoursUntilAppointment * 10) / 10
        }
      });
    }

    next();
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Error al validar restricción de tiempo'
    });
  }
};

/**
 * Valida que la fecha/hora estén dentro del horario laboral
 * NOTA: La validacion de horarios se basa en los horarios configurados del dentista,
 * no en valores hardcodeados. Esta funcion ahora solo pasa al siguiente middleware.
 * La disponibilidad real se valida en la logica de negocio al verificar
 * los horarios configurados del dentista (dentist_schedules).
 */
const validateWorkingHours = async (req, res, next) => {
  // No se valida horario hardcodeado. El horario real depende de la configuracion
  // del dentista en la tabla dentist_schedules.
  next();
};

/**
 * Rate limiting para reprogramaciones
 * Limita a 3 propuestas por cita en 24 horas
 */
const rateLimitReschedule = async (req, res, next) => {
  try {
    const appointmentId = req.params.id;
    const userId = req.user.user_id;

    // Contar propuestas del usuario en las últimas 24 horas
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const countQuery = await pool.query(
      `SELECT COUNT(*) as count
       FROM appointment_reschedules
       WHERE appointment_id = $1
         AND proposed_by_user_id = $2
         AND created_at > $3`,
      [appointmentId, userId, twentyFourHoursAgo]
    );

    const proposalCount = parseInt(countQuery.rows[0].count);

    if (proposalCount >= 3) {
      return res.status(429).json({
        success: false,
        error: 'Has alcanzado el límite de 3 propuestas de reprogramación en 24 horas',
        details: {
          limit: 3,
          current: proposalCount,
          reset_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
        }
      });
    }

    next();
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Error al validar límite de solicitudes'
    });
  }
};

module.exports = {
  validateAppointmentPermission,
  validate24HourCancellation,
  validateWorkingHours,
  rateLimitReschedule
};
