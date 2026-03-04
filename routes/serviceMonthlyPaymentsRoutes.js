/**
 * Routes: serviceMonthlyPaymentsRoutes.js
 * Rutas para pagos mensuales recurrentes de servicios adicionales
 * (ortodoncia e implantes)
 *
 * Base path: /api/service-monthly-payments
 */

const express = require('express');
const router = express.Router();
const serviceMonthlyPaymentsController = require('../controllers/serviceMonthlyPaymentsController');
const verificarToken = require('../middleware/authMiddleware');

/**
 * @route   GET /api/service-monthly-payments
 * @desc    Obtener todos los pagos con filtros opcionales
 * @access  Private
 * @query   patient_id, dentist_id, branch_id, service_type, payment_type, date_from, date_to, limit, offset
 */
router.get('/', verificarToken, serviceMonthlyPaymentsController.getAllPayments);

/**
 * @route   POST /api/service-monthly-payments
 * @desc    Registrar un nuevo pago (inicial o mensual)
 * @access  Private
 * @body    {
 *            consultation_additional_service_id: number (required),
 *            consultation_id: number (required),
 *            patient_id: number (required),
 *            branch_id: number (required),
 *            payment_amount: number (required),
 *            payment_type: 'initial' | 'monthly' (default: 'monthly'),
 *            registered_by_dentist_id: number (required),
 *            clinical_notes: string (optional),
 *            service_name: string (optional - para descripcion del ingreso)
 *          }
 */
router.post('/', verificarToken, serviceMonthlyPaymentsController.registerPayment);

/**
 * @route   GET /api/service-monthly-payments/service/:serviceId
 * @desc    Obtener todos los pagos de un servicio adicional especifico
 * @access  Private
 * @param   serviceId - ID del consultation_additional_service
 */
router.get('/service/:serviceId', verificarToken, serviceMonthlyPaymentsController.getPaymentsByService);

/**
 * @route   GET /api/service-monthly-payments/status/:serviceId
 * @desc    Obtener estado completo de un servicio con sus pagos y resumen
 * @access  Private
 * @param   serviceId - ID del consultation_additional_service
 * @returns {
 *            service: {...},
 *            payments: { initial: [], monthly: [], all: [] },
 *            summary: { initial_paid, monthly_count, total_paid, service_status, is_completed }
 *          }
 */
router.get('/status/:serviceId', verificarToken, serviceMonthlyPaymentsController.getServicePaymentStatus);

/**
 * @route   GET /api/service-monthly-payments/count/:serviceId
 * @desc    Obtener conteo de pagos de un servicio
 * @access  Private
 * @param   serviceId - ID del consultation_additional_service
 * @returns { initial_count, monthly_count, total_paid }
 */
router.get('/count/:serviceId', verificarToken, serviceMonthlyPaymentsController.getPaymentCount);

/**
 * @route   GET /api/service-monthly-payments/patient/:patientId
 * @desc    Obtener todos los pagos de un paciente
 * @access  Private
 * @param   patientId - ID del paciente
 */
router.get('/patient/:patientId', verificarToken, serviceMonthlyPaymentsController.getPaymentsByPatient);

/**
 * @route   GET /api/service-monthly-payments/dentist/:dentistId
 * @desc    Obtener pagos registrados por un dentista (para comisiones)
 * @access  Private
 * @param   dentistId - ID del dentista
 * @query   start_date, end_date (opcionales, default: mes actual)
 * @returns { payments: [], summary: [], period: { start_date, end_date } }
 */
router.get('/dentist/:dentistId', verificarToken, serviceMonthlyPaymentsController.getPaymentsByDentist);

/**
 * @route   POST /api/service-monthly-payments/finalize/:serviceId
 * @desc    Finalizar un servicio (marcar como completado)
 * @access  Private
 * @param   serviceId - ID del consultation_additional_service
 * @body    {
 *            dentist_id: number (required),
 *            notes: string (optional)
 *          }
 */
router.post('/finalize/:serviceId', verificarToken, serviceMonthlyPaymentsController.finalizeService);

/**
 * @route   DELETE /api/service-monthly-payments/:paymentId
 * @desc    Eliminar un pago (soft delete)
 * @access  Private
 * @param   paymentId - ID del pago a eliminar
 */
router.delete('/:paymentId', verificarToken, serviceMonthlyPaymentsController.deletePayment);

module.exports = router;
