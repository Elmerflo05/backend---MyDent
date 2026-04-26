/**
 * Estados centralizados para solicitudes de radiografía/imágenes.
 * Fuente única de verdad — usar SIEMPRE estas constantes en lugar de strings.
 */

const RADIOGRAPHY_REQUEST_STATUS = Object.freeze({
  PENDING: 'pending',
  IN_PROGRESS: 'in_progress',
  COMPLETED: 'completed',
  DELIVERED: 'delivered',
  CANCELLED: 'cancelled',
  REJECTED_BY_TECHNICIAN: 'rejected_by_technician'
});

const RADIOGRAPHY_REQUEST_STATUS_LABELS = Object.freeze({
  [RADIOGRAPHY_REQUEST_STATUS.PENDING]: 'Pendiente',
  [RADIOGRAPHY_REQUEST_STATUS.IN_PROGRESS]: 'En proceso',
  [RADIOGRAPHY_REQUEST_STATUS.COMPLETED]: 'Atendida',
  [RADIOGRAPHY_REQUEST_STATUS.DELIVERED]: 'Entregada',
  [RADIOGRAPHY_REQUEST_STATUS.CANCELLED]: 'Cancelada',
  [RADIOGRAPHY_REQUEST_STATUS.REJECTED_BY_TECHNICIAN]: 'Rechazada por técnico'
});

const REJECTABLE_REQUEST_STATUSES = Object.freeze([
  RADIOGRAPHY_REQUEST_STATUS.PENDING
]);

const REACTIVATABLE_REQUEST_STATUSES = Object.freeze([
  RADIOGRAPHY_REQUEST_STATUS.REJECTED_BY_TECHNICIAN
]);

const RADIOGRAPHY_NOTIFICATION_TYPES = Object.freeze({
  NEW_REQUEST: 'new_radiography_request',
  REQUEST_REJECTED: 'radiography_request_rejected',
  REQUEST_REACTIVATED: 'radiography_request_reactivated'
});

const isRejectable = (status) => REJECTABLE_REQUEST_STATUSES.includes(status);
const isReactivatable = (status) => REACTIVATABLE_REQUEST_STATUSES.includes(status);
const isRejected = (status) => status === RADIOGRAPHY_REQUEST_STATUS.REJECTED_BY_TECHNICIAN;

module.exports = {
  RADIOGRAPHY_REQUEST_STATUS,
  RADIOGRAPHY_REQUEST_STATUS_LABELS,
  REJECTABLE_REQUEST_STATUSES,
  REACTIVATABLE_REQUEST_STATUSES,
  RADIOGRAPHY_NOTIFICATION_TYPES,
  isRejectable,
  isReactivatable,
  isRejected
};
