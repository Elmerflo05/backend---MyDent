/**
 * Rutas de Comisiones de Dentistas
 * /api/commissions
 */

const express = require('express');
const router = express.Router();
const commissionsController = require('../controllers/commissionsController');
const verificarToken = require('../middleware/authMiddleware');

// Todas las rutas requieren autenticación
router.use(verificarToken);

// GET /api/commissions - Obtener todas las comisiones (admin)
router.get('/', commissionsController.getAllCommissions);

// GET /api/commissions/pending/:dentistId - Obtener ingresos pendientes de comisión
router.get('/pending/:dentistId', commissionsController.getPendingIncomes);

// GET /api/commissions/summary/:dentistId - Obtener resumen de comisiones de un dentista
router.get('/summary/:dentistId', commissionsController.getCommissionSummary);

// GET /api/commissions/dentist/:dentistId - Obtener comisiones de un dentista específico
router.get('/dentist/:dentistId', commissionsController.getCommissionsByDentist);

// GET /api/commissions/:commissionId - Obtener detalle de una comisión
router.get('/:commissionId', commissionsController.getCommissionDetail);

// POST /api/commissions/calculate - Calcular y crear una comisión
router.post('/calculate', commissionsController.calculateCommission);

// PUT /api/commissions/:commissionId/approve - Aprobar una comisión
router.put('/:commissionId/approve', commissionsController.approveCommission);

// PUT /api/commissions/:commissionId/reject - Rechazar una comisión
router.put('/:commissionId/reject', commissionsController.rejectCommission);

// PUT /api/commissions/:commissionId/pay - Marcar comisión como pagada
router.put('/:commissionId/pay', commissionsController.payCommission);

module.exports = router;
