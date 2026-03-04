const express = require('express');
const router = express.Router();
const {
  getAvailableSlots,
  getDoctorSchedule,
  getDoctorAppointments
} = require('../controllers/availabilityController');

/**
 * Rutas públicas para disponibilidad de horarios
 * No requieren autenticación para permitir a pacientes consultar disponibilidad
 */

/**
 * GET /api/public/availability/slots
 * Obtiene slots disponibles por fecha, sede y especialidad
 * Query params: date (YYYY-MM-DD), branchId, specialtyId, duration (opcional)
 */
router.get('/slots', getAvailableSlots);

/**
 * GET /api/public/availability/doctor/:doctorId/schedule
 * Obtiene el horario configurado de un doctor para una fecha específica
 * Query params: date (YYYY-MM-DD)
 */
router.get('/doctor/:doctorId/schedule', getDoctorSchedule);

/**
 * GET /api/public/availability/doctor/:doctorId/appointments
 * Obtiene las citas agendadas de un doctor para una fecha específica
 * Query params: date (YYYY-MM-DD)
 */
router.get('/doctor/:doctorId/appointments', getDoctorAppointments);

module.exports = router;
