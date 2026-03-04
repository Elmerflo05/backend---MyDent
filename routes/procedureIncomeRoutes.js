/**
 * Routes: procedureIncomeRoutes.js
 * Rutas para el registro financiero de ingresos por procedimientos
 *
 * Incluye endpoints para:
 * - CRUD de ingresos
 * - Sistema de cuotas (ortodoncia/implantes)
 * - Guardado en lote
 * - Consulta de items por consulta
 */

const express = require('express');
const router = express.Router();
const verificarToken = require('../middleware/authMiddleware');
const {
  getProcedureIncomeList,
  getProcedureIncome,
  getPatientIncomeList,
  getDentistIncomeList,
  getDentistIncomeSummaryData,
  createNewProcedureIncome,
  updateExistingProcedureIncome,
  deleteExistingProcedureIncome,
  createBatchProcedureIncome,
  createQuotaPayment,
  checkQuotaExists,
  getQuotaHistory,
  getConsultationIncomeItems
} = require('../controllers/procedureIncomeController');

// Middleware para validar roles (medicos, recepcionistas, admin)
const verificarRolesPermitidos = (req, res, next) => {
  const rol = req.user?.role_id;
  // 1=SuperAdmin, 2=Admin, 3=Dentista, 4=Recepcionista, 5=Tecnico
  if (![1, 2, 3, 4, 5].includes(rol)) {
    return res.status(403).json({ mensaje: 'Acceso denegado: Rol no autorizado' });
  }
  next();
};

// Aplicar middlewares a todas las rutas
router.use(verificarToken);
router.use(verificarRolesPermitidos);

// ============================================
// RUTAS ESPECIFICAS (deben ir ANTES de /:id)
// ============================================

// Rutas de paciente y dentista
router.get('/patient/:patientId', getPatientIncomeList);
router.get('/dentist/:dentistId/summary', getDentistIncomeSummaryData);
router.get('/dentist/:dentistId', getDentistIncomeList);

// Rutas de cuotas (sistema de pagos mensuales)
router.get('/quota/check/:appointmentId/:serviceId', checkQuotaExists);
router.get('/quota/history/:serviceId', getQuotaHistory);
router.post('/quota', createQuotaPayment);

// Rutas de consulta
router.get('/consultation/:consultationId/items', getConsultationIncomeItems);

// Ruta de guardado en lote
router.post('/batch', createBatchProcedureIncome);

// ============================================
// RUTAS CRUD GENERALES
// ============================================
router.get('/', getProcedureIncomeList);
router.get('/:id', getProcedureIncome);
router.post('/', createNewProcedureIncome);
router.put('/:id', updateExistingProcedureIncome);
router.delete('/:id', deleteExistingProcedureIncome);

module.exports = router;
