/**
 * Rutas para Configuración de Citas
 * Endpoints para gestionar la duración de citas y permisos por rol
 *
 * @module routes/appointmentConfigRoutes
 */

const express = require('express');
const router = express.Router();
const appointmentConfigService = require('../services/appointmentConfigService');
const authMiddleware = require('../middleware/authMiddleware');

/**
 * GET /api/appointment-config
 * Obtiene la configuración GLOBAL de duración de citas
 * Esta configuración aplica a TODAS las sedes del sistema
 * Acceso: Todos los usuarios autenticados
 */
router.get('/', authMiddleware, async (req, res) => {
  try {
    const config = await appointmentConfigService.getAppointmentConfig();

    res.status(200).json({
      success: true,
      data: config
    });
  } catch (error) {
    console.error('Error al obtener configuración de citas:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener configuración de citas',
      error: error.message
    });
  }
});

/**
 * PUT /api/appointment-config
 * Actualiza la configuración GLOBAL de duración de citas
 * Esta configuración aplica a TODAS las sedes del sistema
 * Acceso: Solo SUPER_ADMIN
 */
router.put('/', authMiddleware, async (req, res) => {
  try {
    const isSuperAdmin = req.user.role_id === 1 ||
                         req.user.role_name === 'Superadministrador' ||
                         req.user.role === 'SUPER_ADMIN';

    if (!isSuperAdmin) {
      return res.status(403).json({
        success: false,
        message: 'No tiene permisos para modificar la configuración de citas. Solo SUPER_ADMIN puede realizar esta acción.'
      });
    }

    const { defaultDuration, maxDurationForRegularUsers, allowedRolesForLongAppointments } = req.body;

    // Validar que se proporcionen los campos requeridos
    if (!defaultDuration || !maxDurationForRegularUsers || !allowedRolesForLongAppointments) {
      return res.status(400).json({
        success: false,
        message: 'Faltan campos requeridos: defaultDuration, maxDurationForRegularUsers, allowedRolesForLongAppointments'
      });
    }

    const config = {
      defaultDuration,
      maxDurationForRegularUsers,
      allowedRolesForLongAppointments
    };

    const updatedConfig = await appointmentConfigService.updateAppointmentConfig(
      config,
      req.user.user_id
    );

    res.status(200).json({
      success: true,
      message: 'Configuración de citas actualizada exitosamente',
      data: updatedConfig
    });
  } catch (error) {
    console.error('Error al actualizar configuración de citas:', error);
    res.status(400).json({
      success: false,
      message: error.message || 'Error al actualizar configuración de citas'
    });
  }
});

/**
 * POST /api/appointment-config/validate-duration
 * Valida si una duración específica es permitida para el usuario actual
 * Acceso: Todos los usuarios autenticados
 */
router.post('/validate-duration', authMiddleware, async (req, res) => {
  try {
    const { durationMinutes } = req.body;

    if (!durationMinutes || typeof durationMinutes !== 'number') {
      return res.status(400).json({
        success: false,
        message: 'El campo durationMinutes es requerido y debe ser un número'
      });
    }

    const validation = await appointmentConfigService.validateDuration(
      durationMinutes,
      req.user.role_id
    );

    res.status(200).json({
      success: true,
      data: validation
    });
  } catch (error) {
    console.error('Error al validar duración:', error);
    res.status(500).json({
      success: false,
      message: 'Error al validar duración',
      error: error.message
    });
  }
});

/**
 * GET /api/appointment-config/can-override
 * Verifica si el usuario actual puede crear citas con duración extendida
 * Acceso: Todos los usuarios autenticados
 */
router.get('/can-override', authMiddleware, async (req, res) => {
  try {
    const canOverride = await appointmentConfigService.canUserOverrideDuration(
      req.user.role_id
    );

    res.status(200).json({
      success: true,
      data: {
        canOverride,
        userRole: req.user.role_id
      }
    });
  } catch (error) {
    console.error('Error al verificar permisos:', error);
    res.status(500).json({
      success: false,
      message: 'Error al verificar permisos',
      error: error.message
    });
  }
});

module.exports = router;
