/**
 * Catálogo de tipos de cita permitidos en el sistema
 *
 * Este módulo centraliza la lógica de validación de appointment_type
 * para garantizar consistencia en toda la aplicación.
 */

/**
 * Enum de tipos de cita permitidos
 * @constant
 */
const APPOINTMENT_TYPES = {
  CONSULTATION: 'Consulta',
  TREATMENT: 'Tratamiento',
  CONTROL: 'Control',
  IMAGING_STUDY: 'imaging_study',
  PROSTHESIS_FITTING: 'prosthesis_fitting',
  FOLLOW_UP: 'follow_up'
};

/**
 * Tipos de cita permitidos según rol del usuario
 * @constant
 */
const ALLOWED_TYPES_BY_ROLE = {
  // Pacientes solo pueden solicitar consultas y controles
  patient: [
    APPOINTMENT_TYPES.CONSULTATION,
    APPOINTMENT_TYPES.CONTROL,
    APPOINTMENT_TYPES.FOLLOW_UP
  ],
  // Clientes externos tienen los mismos permisos que pacientes
  external_client: [
    APPOINTMENT_TYPES.CONSULTATION,
    APPOINTMENT_TYPES.CONTROL,
    APPOINTMENT_TYPES.FOLLOW_UP
  ],
  // Doctores pueden crear todos los tipos
  doctor: Object.values(APPOINTMENT_TYPES),
  // Recepcionistas pueden crear todos los tipos
  receptionist: Object.values(APPOINTMENT_TYPES),
  // Administradores pueden crear todos los tipos
  admin: Object.values(APPOINTMENT_TYPES),
  // Super admin puede crear todos los tipos
  super_admin: Object.values(APPOINTMENT_TYPES),
  // Técnicos de imagen pueden crear estudios de imagen
  imaging_technician: [
    APPOINTMENT_TYPES.IMAGING_STUDY
  ]
  // NOTA: prosthesis_technician y accountant removidos - roles no existen en BD
};

/**
 * Tipo de cita por defecto cuando no se especifica
 * Se asigna automáticamente a citas creadas por pacientes
 * @constant
 */
const DEFAULT_APPOINTMENT_TYPE = APPOINTMENT_TYPES.CONSULTATION;

/**
 * Mapeo de role_id a nombre de rol
 * Basado en la tabla roles de la BD
 * @constant
 */
const ROLE_ID_MAP = {
  1: 'super_admin',        // Super Administrador
  2: 'admin',              // Administrador de Sede
  3: 'doctor',             // Odontólogo
  4: 'receptionist',       // Recepcionista
  5: 'imaging_technician', // Técnico de Imágenes
  6: 'patient',            // Paciente
  7: 'external_client'     // Cliente Externo
};

/**
 * Valida si un tipo de cita es válido
 * @param {string} type - Tipo de cita a validar
 * @returns {boolean} true si el tipo es válido
 */
const isValidAppointmentType = (type) => {
  if (!type) return false;
  return Object.values(APPOINTMENT_TYPES).includes(type);
};

/**
 * Valida si un rol puede crear un tipo específico de cita
 * @param {number} roleId - ID del rol del usuario
 * @param {string} type - Tipo de cita
 * @returns {boolean} true si el rol puede crear ese tipo
 */
const canRoleCreateType = (roleId, type) => {
  // Obtener nombre del rol
  const roleName = ROLE_ID_MAP[roleId];

  if (!roleName) {
    console.warn(`⚠️ Role ID ${roleId} no reconocido, asumiendo paciente`);
    return ALLOWED_TYPES_BY_ROLE.patient.includes(type);
  }

  // Obtener tipos permitidos para ese rol
  const allowedTypes = ALLOWED_TYPES_BY_ROLE[roleName] || [];

  return allowedTypes.includes(type);
};

/**
 * Obtiene la lista de tipos permitidos para un rol
 * @param {number} roleId - ID del rol del usuario
 * @returns {string[]} Array de tipos permitidos
 */
const getAllowedTypesForRole = (roleId) => {
  const roleName = ROLE_ID_MAP[roleId];
  return ALLOWED_TYPES_BY_ROLE[roleName] || ALLOWED_TYPES_BY_ROLE.patient;
};

module.exports = {
  APPOINTMENT_TYPES,
  ALLOWED_TYPES_BY_ROLE,
  DEFAULT_APPOINTMENT_TYPE,
  ROLE_ID_MAP,
  isValidAppointmentType,
  canRoleCreateType,
  getAllowedTypesForRole
};
