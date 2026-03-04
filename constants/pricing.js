/**
 * Configuración centralizada de precios del sistema
 * Single Source of Truth para todos los valores de precios
 *
 * IMPORTANTE: Cualquier cambio de precio debe hacerse SOLO en este archivo
 */

const PRICING = {
  // Precio base de una cita/consulta en soles
  APPOINTMENT_BASE_PRICE: 50,

  // Moneda por defecto
  DEFAULT_CURRENCY: 'PEN',

  // Descripción del concepto de cita
  APPOINTMENT_INCOME_TYPE: 'appointment',
  APPOINTMENT_ITEM_NAME: 'Consulta Odontológica',
  APPOINTMENT_ITEM_DESCRIPTION: 'Cita de consulta odontológica programada',
};

module.exports = PRICING;
