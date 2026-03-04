/**
 * Rutas para Income Payments (Aplicación de pagos a deudas)
 * Endpoints para gestionar la relación entre pagos y deudas
 */

const express = require('express');
const router = express.Router();
const verificarToken = require('../middleware/authMiddleware');
const {
  applyPayment,
  getPaymentApplications,
  getIncomePaymentHistory,
  revertPaymentApplication,
  markAsCourtesy,
  getAccountsReceivableSummary,
  getPatientsWithDebts,
  getPatientPendingDebts,
  getPatientBalance,
  markPatientAsNotified,
  // Voucher y verificación
  submitVoucher,
  getPendingVerification,
  approveVoucher,
  rejectVoucher,
  registerCashPayment,
  getVerifiedPayments,
  // Historial
  getAllPaymentHistory,
  // Generación de cuotas
  generateServiceQuotas,
  getServiceQuotas,
  getServicesWithoutQuotas
} = require('../controllers/incomePaymentsController');

// Middleware para validar roles permitidos
// Roles: 1=SuperAdmin, 2=Admin, 3=Doctor, 4=Recepcionista, 5=TécnicoImágenes, 6=Paciente, 7=ClienteExterno
const verificarRolesPermitidos = (rolesPermitidos) => {
  return (req, res, next) => {
    const rol = req.user?.role_id;
    if (!rolesPermitidos.includes(rol)) {
      return res.status(403).json({
        success: false,
        message: 'Acceso denegado: Rol no autorizado'
      });
    }
    next();
  };
};

// Aplicar autenticación a todas las rutas
router.use(verificarToken);

// ============================================================
// RUTAS DE CUENTAS POR COBRAR (Dashboard)
// ============================================================

// Resumen de cuentas por cobrar (admin, recepcionista)
router.get(
  '/accounts-receivable/summary',
  verificarRolesPermitidos([1, 2, 4]),
  getAccountsReceivableSummary
);

// Lista de pacientes con deudas (admin, recepcionista)
router.get(
  '/patients-with-debts',
  verificarRolesPermitidos([1, 2, 4]),
  getPatientsWithDebts
);

// ============================================================
// RUTAS DE PACIENTE
// ============================================================

// Deudas pendientes de un paciente (todos los roles autenticados)
router.get(
  '/patient/:patientId/pending',
  verificarRolesPermitidos([1, 2, 3, 4, 6]), // 6 = paciente
  getPatientPendingDebts
);

// Balance de un paciente (todos los roles autenticados)
router.get(
  '/patient/:patientId/balance',
  verificarRolesPermitidos([1, 2, 3, 4, 6]), // 6 = paciente
  getPatientBalance
);

// Marcar paciente como notificado (admin, recepcionista)
router.post(
  '/patient/:patientId/notify',
  verificarRolesPermitidos([1, 2, 4]),
  markPatientAsNotified
);

// ============================================================
// RUTAS DE APLICACIÓN DE PAGOS
// ============================================================

// Aplicar pago a deudas (admin, recepcionista)
router.post(
  '/apply',
  verificarRolesPermitidos([1, 2, 4]),
  applyPayment
);

// Obtener aplicaciones de un pago específico
router.get(
  '/payment/:paymentId',
  verificarRolesPermitidos([1, 2, 3, 4]),
  getPaymentApplications
);

// Obtener historial de pagos de una deuda
router.get(
  '/income/:incomeId',
  verificarRolesPermitidos([1, 2, 3, 4]),
  getIncomePaymentHistory
);

// Revertir una aplicación de pago (solo admin)
router.delete(
  '/:incomePaymentId',
  verificarRolesPermitidos([1, 2]),
  revertPaymentApplication
);

// Marcar deuda como cortesía (admin, doctor)
router.patch(
  '/courtesy/:incomeId',
  verificarRolesPermitidos([1, 2, 3]),
  markAsCourtesy
);

// ============================================================
// RUTAS DE VOUCHER Y VERIFICACIÓN
// ============================================================

// Paciente envía voucher de pago (rol 7 = paciente)
router.post(
  '/submit-voucher',
  verificarRolesPermitidos([6]),
  submitVoucher
);

// Obtener pagos pendientes de verificación (admin, recepcionista)
router.get(
  '/pending-verification',
  verificarRolesPermitidos([1, 2, 4]),
  getPendingVerification
);

// Aprobar voucher de pago (admin, recepcionista)
router.patch(
  '/approve/:incomeId',
  verificarRolesPermitidos([1, 2, 4]),
  approveVoucher
);

// Rechazar voucher de pago (admin, recepcionista)
router.patch(
  '/reject/:incomeId',
  verificarRolesPermitidos([1, 2, 4]),
  rejectVoucher
);

// Registrar pago en efectivo directamente (admin, recepcionista)
router.post(
  '/register-cash',
  verificarRolesPermitidos([1, 2, 4]),
  registerCashPayment
);

// Historial de pagos verificados/rechazados (admin, recepcionista)
router.get(
  '/verified',
  verificarRolesPermitidos([1, 2, 4]),
  getVerifiedPayments
);

// ============================================================
// HISTORIAL DE PAGOS COMPLETO
// ============================================================

// Historial completo de servicios/pagos (admin, recepcionista, doctor)
router.get(
  '/history',
  verificarRolesPermitidos([1, 2, 3, 4]),
  getAllPaymentHistory
);

// ============================================================
// RUTAS DE GENERACIÓN AUTOMÁTICA DE CUOTAS
// ============================================================

// Obtener servicios sin cuotas generadas (admin, recepcionista, doctor)
router.get(
  '/services-without-quotas',
  verificarRolesPermitidos([1, 2, 3, 4]),
  getServicesWithoutQuotas
);

// Obtener cuotas de un servicio específico (admin, recepcionista, doctor)
router.get(
  '/service-quotas/:serviceId',
  verificarRolesPermitidos([1, 2, 3, 4]),
  getServiceQuotas
);

// Generar cuotas para un servicio adicional (admin, recepcionista, doctor)
router.post(
  '/generate-quotas/:serviceId',
  verificarRolesPermitidos([1, 2, 3, 4]),
  generateServiceQuotas
);

module.exports = router;
