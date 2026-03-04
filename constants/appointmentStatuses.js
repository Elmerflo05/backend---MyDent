/**
 * Mapeo centralizado de estados de citas
 * Fuente única de verdad para appointment_status_id <-> status_code
 *
 * IMPORTANTE: Este mapeo debe coincidir EXACTAMENTE con la tabla appointment_statuses en PostgreSQL
 */

const APPOINTMENT_STATUS_MAP = {
  0: {
    id: 0,
    code: 'pending_approval',
    name: 'Pendiente de Aprobación',
    description: 'Cita creada por paciente, requiere verificación de voucher',
    color: '#9CA3AF'
  },
  1: {
    id: 1,
    code: 'scheduled',
    name: 'Programada',
    description: 'Cita programada directamente por staff',
    color: '#3B82F6'
  },
  2: {
    id: 2,
    code: 'confirmed',
    name: 'Confirmada',
    description: 'Cita aprobada y confirmada (voucher verificado)',
    color: '#10B981'
  },
  3: {
    id: 3,
    code: 'in_progress',
    name: 'En Proceso',
    description: 'Atención médica en curso',
    color: '#F59E0B'
  },
  4: {
    id: 4,
    code: 'completed',
    name: 'Completada',
    description: 'Atención finalizada exitosamente',
    color: '#059669'
  },
  5: {
    id: 5,
    code: 'cancelled',
    name: 'Cancelada',
    description: 'Cita cancelada por paciente o staff',
    color: '#EF4444'
  },
  6: {
    id: 6,
    code: 'no_show',
    name: 'No Asistió',
    description: 'Paciente no se presentó a la cita',
    color: '#DC2626'
  },
  7: {
    id: 7,
    code: 'rescheduled',
    name: 'Reprogramada',
    description: 'Cita reprogramada pendiente de aprobación',
    color: '#8B5CF6'
  },
  8: {
    id: 8,
    code: 'rejected',
    name: 'Rechazada',
    description: 'Solicitud rechazada (voucher inválido)',
    color: '#EF4444'
  }
};

/**
 * Mapea un appointment_status_id a su código de estado
 * @param {number} statusId - ID del estado de la cita
 * @returns {string} Código del estado (ej: 'pending_approval', 'confirmed')
 */
const mapStatusIdToCode = (statusId) => {
  const status = APPOINTMENT_STATUS_MAP[statusId];
  return status ? status.code : 'pending_approval'; // Default fallback
};

/**
 * Mapea un código de estado a su ID
 * @param {string} statusCode - Código del estado
 * @returns {number|null} ID del estado o null si no existe
 */
const mapStatusCodeToId = (statusCode) => {
  const entry = Object.values(APPOINTMENT_STATUS_MAP).find(s => s.code === statusCode);
  return entry ? entry.id : null;
};

/**
 * Obtiene información completa de un estado por su ID
 * @param {number} statusId - ID del estado
 * @returns {object|null} Información completa del estado
 */
const getStatusInfo = (statusId) => {
  return APPOINTMENT_STATUS_MAP[statusId] || null;
};

/**
 * Valida si un ID de estado es válido
 * @param {number} statusId - ID del estado a validar
 * @returns {boolean}
 */
const isValidStatusId = (statusId) => {
  return APPOINTMENT_STATUS_MAP.hasOwnProperty(statusId);
};

/**
 * Valida si un código de estado es válido
 * @param {string} statusCode - Código del estado a validar
 * @returns {boolean}
 */
const isValidStatusCode = (statusCode) => {
  return Object.values(APPOINTMENT_STATUS_MAP).some(s => s.code === statusCode);
};

module.exports = {
  APPOINTMENT_STATUS_MAP,
  mapStatusIdToCode,
  mapStatusCodeToId,
  getStatusInfo,
  isValidStatusId,
  isValidStatusCode
};
