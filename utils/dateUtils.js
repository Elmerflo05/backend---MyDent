/**
 * Utilidades para manejo seguro de fechas sin problemas de timezone
 *
 * PROBLEMA RESUELTO:
 * En Railway (UTC), new Date().getDate() devuelve la fecha UTC, no la de Lima.
 * A partir de las 7pm hora Lima (00:00 UTC), la fecha UTC es un día adelante.
 *
 * SOLUCION:
 * Usar Intl.DateTimeFormat con timeZone 'America/Lima' para SIEMPRE obtener
 * la fecha correcta de Lima, sin importar la zona horaria del servidor.
 */

const TIMEZONE_LIMA = 'America/Lima';

/**
 * Formatea una fecha a string YYYY-MM-DD usando zona horaria Lima
 * Funciona correctamente tanto en local como en Railway (UTC)
 *
 * @param {Date} [date=new Date()] - Fecha a formatear (default: fecha actual)
 * @returns {string} String en formato YYYY-MM-DD en hora Lima
 *
 * @example
 * formatDateYMD(new Date(2026, 0, 7)); // "2026-01-07"
 * formatDateYMD(); // fecha actual en Lima en formato "YYYY-MM-DD"
 */
const formatDateYMD = (date = new Date()) => {
  const d = date instanceof Date ? date : new Date(date);
  // Intl con locale 'en-CA' devuelve formato YYYY-MM-DD directamente
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: TIMEZONE_LIMA,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(d);
};

/**
 * Parsea una fecha ISO string y la devuelve en zona horaria local
 * Evita el problema de desfase de un día causado por interpretación UTC
 *
 * @param {string} isoDateString - Fecha en formato ISO (ej: "2026-01-07T05:00:00.000Z" o "2026-01-07")
 * @returns {Date} Date object en zona horaria local
 *
 * @example
 * parseLocalDate("2026-01-07T05:00:00.000Z"); // 7 de enero 2026 a las 00:00 hora local
 */
const parseLocalDate = (isoDateString) => {
  if (!isoDateString) {
    return new Date();
  }

  // Extraer solo la parte de la fecha (YYYY-MM-DD)
  const dateOnly = isoDateString.split('T')[0];
  const [year, month, day] = dateOnly.split('-').map(Number);

  // Crear fecha en zona horaria LOCAL (mes es 0-indexed)
  return new Date(year, month - 1, day, 0, 0, 0);
};

/**
 * Compara dos fechas por solo la parte de fecha (ignorando hora)
 *
 * @param {Date} date1 - Primera fecha
 * @param {Date} date2 - Segunda fecha
 * @returns {boolean} true si ambas fechas son el mismo día
 */
const isSameDay = (date1, date2) => {
  return (
    date1.getFullYear() === date2.getFullYear() &&
    date1.getMonth() === date2.getMonth() &&
    date1.getDate() === date2.getDate()
  );
};

/**
 * Obtiene el inicio del día (medianoche) para una fecha
 *
 * @param {Date} date - Fecha de entrada
 * @returns {Date} Nueva fecha con hora 00:00:00.000
 */
const startOfDay = (date) => {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0, 0);
};

/**
 * Obtiene el fin del día (23:59:59.999) para una fecha
 *
 * @param {Date} date - Fecha de entrada
 * @returns {Date} Nueva fecha con hora 23:59:59.999
 */
const endOfDay = (date) => {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59, 999);
};

module.exports = {
  formatDateYMD,
  parseLocalDate,
  isSameDay,
  startOfDay,
  endOfDay
};
