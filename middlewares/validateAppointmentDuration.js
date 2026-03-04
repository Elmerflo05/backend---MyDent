/**
 * Middleware para Validación de Duración de Citas
 * Valida que la duración de citas cumpla con las restricciones de rol
 *
 * @module middleware/validateAppointmentDuration
 */

const appointmentConfigService = require('../services/appointmentConfigService');

/**
 * Middleware que valida la duración de una cita según el rol del usuario
 * Se usa en las rutas de creación y actualización de citas
 *
 * Funcionalidad:
 * - Extrae la duración de la cita del body de la petición
 * - Obtiene el rol del usuario autenticado
 * - Valida contra la configuración de duración permitida
 * - Bloquea la petición si la duración no es permitida
 * - Permite continuar si la duración es válida
 *
 * @param {Object} req - Request de Express
 * @param {Object} res - Response de Express
 * @param {Function} next - Next middleware
 */
const validateAppointmentDuration = async (req, res, next) => {
  try {
    // Extraer duración de la petición (puede venir en diferentes formatos)
    const duration = req.body.duration || req.body.duration_minutes || req.body.durationMinutes;

    let durationMinutes;

    if (duration) {
      // Duración explícita en el body
      durationMinutes = parseInt(duration);
    } else if (req.body.new_start_time && req.body.new_end_time) {
      // Calcular duración desde new_start_time y new_end_time (flujo de reprogramación)
      const [sh, sm] = req.body.new_start_time.split(':').map(Number);
      const [eh, em] = req.body.new_end_time.split(':').map(Number);
      durationMinutes = (eh * 60 + em) - (sh * 60 + sm);
    } else if (req.body.start_time && req.body.end_time) {
      // Calcular duración desde start_time y end_time (creación/edición alternativa)
      const [sh, sm] = req.body.start_time.split(':').map(Number);
      const [eh, em] = req.body.end_time.split(':').map(Number);
      durationMinutes = (eh * 60 + em) - (sh * 60 + sm);
    } else {
      // No hay datos de duración, permitir que continúe (usará default de BD)
      return next();
    }
    if (isNaN(durationMinutes)) {
      return res.status(400).json({
        success: false,
        message: 'La duración debe ser un número válido'
      });
    }

    if (!req.user || !req.user.role_id) {
      return res.status(401).json({
        success: false,
        message: 'Usuario no autenticado'
      });
    }

    const userRole = req.user.role_id;

    const validation = await appointmentConfigService.validateDuration(
      durationMinutes,
      userRole
    );

    if (!validation.isValid) {
      return res.status(403).json({
        success: false,
        message: validation.message,
        data: {
          requestedDuration: durationMinutes,
          maxAllowed: validation.maxAllowed,
          userRole: userRole
        }
      });
    }

    // Si la validación es exitosa, permitir continuar
    next();

  } catch (error) {
    console.error('Error en middleware de validación de duración:', error);
    res.status(500).json({
      success: false,
      message: 'Error al validar duración de cita',
      error: error.message
    });
  }
};

module.exports = validateAppointmentDuration;
