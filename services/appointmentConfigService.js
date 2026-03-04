/**
 * Servicio para Gestión de Configuración de Citas
 * Maneja la duración de citas y permisos por rol
 *
 * @module appointmentConfigService
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const SETTING_KEY = 'appointment_duration_config';

// Mapeo de nombres de rol legacy (strings) a role_id (numbers)
const LEGACY_ROLE_TO_ID = {
  'SUPER_ADMIN': 1, 'super_admin': 1, 'Super Administrador': 1,
  'ADMINISTRATOR': 2, 'admin': 2, 'Administrador de Sede': 2,
  'DENTIST': 3, 'doctor': 3, 'Odontólogo': 3,
  'RECEPTIONIST': 4, 'receptionist': 4, 'Recepcionista': 4,
  'IMAGING_TECHNICIAN': 5, 'imaging_technician': 5,
  'PATIENT': 6, 'patient': 6, 'Paciente': 6,
  'EXTERNAL_CLIENT': 7, 'external_client': 7,
};

/**
 * Normaliza allowedRolesForLongAppointments: convierte strings legacy a role_id numéricos
 */
const normalizeRoleIds = (roles) => {
  if (!Array.isArray(roles)) return [];
  return roles.map(role => {
    if (typeof role === 'number') return role;
    return LEGACY_ROLE_TO_ID[role] || null;
  }).filter(id => id !== null);
};

/**
 * Obtiene la configuración GLOBAL de duración de citas
 * Esta configuración aplica a TODAS las sedes del sistema
 * @returns {Promise<Object>} Configuración de citas
 */
const getAppointmentConfig = async () => {
  try {
    const setting = await prisma.app_settings.findFirst({
      where: {
        setting_key: SETTING_KEY,
        branch_id: null, // SIEMPRE null - configuración global
        status: 'active'
      }
    });

    if (!setting) {
      // Retornar configuración por defecto si no existe
      return {
        defaultDuration: 30,
        maxDurationForRegularUsers: 30,
        allowedRolesForLongAppointments: [] // Restrictivo: nadie tiene permiso hasta que se configure
      };
    }

    const config = JSON.parse(setting.setting_value);
    // Normalizar roles legacy (strings) a role_id (numbers)
    config.allowedRolesForLongAppointments = normalizeRoleIds(config.allowedRolesForLongAppointments);
    return config;
  } catch (error) {
    console.error('Error al obtener configuración de citas:', error);
    throw new Error('Error al obtener configuración de citas');
  }
};

/**
 * Actualiza la configuración GLOBAL de duración de citas
 * Esta configuración aplica a TODAS las sedes del sistema
 * @param {Object} config - Nueva configuración
 * @param {number} config.defaultDuration - Duración predeterminada en minutos
 * @param {number} config.maxDurationForRegularUsers - Duración máxima para usuarios regulares
 * @param {number[]} config.allowedRolesForLongAppointments - role_ids permitidos para citas largas
 * @param {number} userId - ID del usuario que realiza la actualización
 * @returns {Promise<Object>} Configuración actualizada
 */
const updateAppointmentConfig = async (config, userId) => {
  try {
    // Validar configuración
    validateConfig(config);

    const configValue = JSON.stringify({
      defaultDuration: config.defaultDuration,
      maxDurationForRegularUsers: config.maxDurationForRegularUsers,
      allowedRolesForLongAppointments: config.allowedRolesForLongAppointments.map(Number)
    });

    // Buscar configuración existente (SIEMPRE global, branch_id = null)
    const existing = await prisma.app_settings.findFirst({
      where: {
        setting_key: SETTING_KEY,
        branch_id: null // SIEMPRE null - configuración global
      }
    });

    let result;

    if (existing) {
      // Actualizar configuración existente
      result = await prisma.app_settings.update({
        where: {
          app_setting_id: existing.app_setting_id
        },
        data: {
          setting_value: configValue,
          user_id_modification: userId,
          date_time_modification: new Date()
        }
      });
    } else {
      // Crear nueva configuración (branch_id = null para configuración global)
      result = await prisma.app_settings.create({
        data: {
          setting_key: SETTING_KEY,
          setting_value: configValue,
          setting_type: 'json',
          setting_category: 'appointments',
          description: 'Configuración GLOBAL de duración de citas. Aplica a TODAS las sedes del sistema.',
          is_public: false,
          status: 'active',
          branch_id: null, // SIEMPRE null - configuración global
          user_id_registration: userId,
          date_time_registration: new Date()
        }
      });
    }

    return JSON.parse(result.setting_value);
  } catch (error) {
    console.error('Error al actualizar configuración de citas:', error);
    throw error;
  }
};

/**
 * Verifica si un usuario puede crear citas con duración mayor a la estándar
 * @param {number} userRole - role_id del usuario
 * @returns {Promise<boolean>} True si el usuario puede crear citas largas
 */
const canUserOverrideDuration = async (userRole) => {
  try {
    const config = await getAppointmentConfig();
    return config.allowedRolesForLongAppointments.includes(userRole);
  } catch (error) {
    console.error('Error al verificar permisos de duración:', error);
    return false;
  }
};

/**
 * Valida que una duración específica sea permitida para un usuario
 * @param {number} durationMinutes - Duración solicitada en minutos
 * @param {number} userRole - role_id del usuario
 * @returns {Promise<Object>} { isValid: boolean, message?: string, maxAllowed?: number }
 */
const validateDuration = async (durationMinutes, userRole) => {
  try {
    const config = await getAppointmentConfig();
    const canOverride = config.allowedRolesForLongAppointments.includes(userRole);

    // Validación básica
    if (durationMinutes <= 0) {
      return {
        isValid: false,
        message: 'La duración debe ser mayor a 0 minutos'
      };
    }

    // Si puede crear citas largas, validar contra maxDurationForRegularUsers (tope absoluto)
    if (canOverride) {
      if (durationMinutes > config.maxDurationForRegularUsers) {
        return {
          isValid: false,
          message: `La duración máxima permitida es ${config.maxDurationForRegularUsers} minutos`,
          maxAllowed: config.maxDurationForRegularUsers
        };
      }
      return { isValid: true };
    }

    // Si no puede crear citas largas, validar contra defaultDuration
    if (durationMinutes > config.defaultDuration) {
      const roleIdToName = { 1: 'Super Admin', 2: 'Administrador', 3: 'Odontólogo', 4: 'Recepcionista', 5: 'Técnico de Imágenes', 6: 'Paciente', 7: 'Cliente Externo' };
      const roleNames = config.allowedRolesForLongAppointments
        .map(id => roleIdToName[id] || `Rol ${id}`)
        .join(', ');
      return {
        isValid: false,
        message: `La duración máxima para su rol es ${config.defaultDuration} minutos. Solo los roles ${roleNames} pueden crear citas con duración hasta ${config.maxDurationForRegularUsers} minutos`,
        maxAllowed: config.defaultDuration
      };
    }

    return { isValid: true };
  } catch (error) {
    console.error('Error al validar duración:', error);
    return {
      isValid: false,
      message: 'Error al validar duración'
    };
  }
};

/**
 * Valida la estructura de la configuración
 * @param {Object} config - Configuración a validar
 * @throws {Error} Si la configuración es inválida
 */
const validateConfig = (config) => {
  if (!config) {
    throw new Error('La configuración es requerida');
  }

  if (typeof config.defaultDuration !== 'number' || config.defaultDuration <= 0) {
    throw new Error('defaultDuration debe ser un número mayor a 0');
  }

  if (typeof config.maxDurationForRegularUsers !== 'number' || config.maxDurationForRegularUsers <= 0) {
    throw new Error('maxDurationForRegularUsers debe ser un número mayor a 0');
  }

  // Validar que la duración predeterminada no sea mayor a la duración máxima para usuarios regulares
  if (config.defaultDuration > config.maxDurationForRegularUsers) {
    throw new Error('La Duración Predeterminada no puede ser mayor a la Duración Máxima para Usuarios Regulares');
  }

  if (!Array.isArray(config.allowedRolesForLongAppointments)) {
    throw new Error('allowedRolesForLongAppointments debe ser un array');
  }

  // Validar role_ids solo si hay alguno seleccionado
  if (config.allowedRolesForLongAppointments.length > 0) {
    const validRoleIds = [1, 2, 3, 4, 5, 6, 7]; // IDs válidos de roles en el sistema
    const invalidIds = config.allowedRolesForLongAppointments.filter(
      id => !validRoleIds.includes(Number(id))
    );

    if (invalidIds.length > 0) {
      throw new Error(`Role IDs inválidos: ${invalidIds.join(', ')}`);
    }
  }
};

module.exports = {
  getAppointmentConfig,
  updateAppointmentConfig,
  canUserOverrideDuration,
  validateDuration
};
