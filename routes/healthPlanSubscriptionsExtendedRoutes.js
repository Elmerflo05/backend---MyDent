/**
 * Health Plan Subscriptions Extended Routes
 * Rutas extendidas para suscripciones con voucher y aprobacion
 */

const express = require('express');
const router = express.Router();
const verificarToken = require('../middleware/authMiddleware');
const { uploadVoucherPlan } = require('../config/multerConfig');
const { s3Upload } = require('../middleware/s3UploadMiddleware');
const {
  createSubscription,
  approve,
  reject,
  getPending,
  getActiveByPatient,
  checkActivePlan,
  useFirstFreeConsultation,
  checkFirstFreeConsultation,
  getStats,
  getPatientHistory
} = require('../controllers/healthPlanSubscriptionsExtendedController');

// Middleware para validar roles con permiso de LECTURA
const verificarRolesLectura = (req, res, next) => {
  const rol = req.user?.role_id;
  if (![1, 2, 3, 4, 5, 6, 7].includes(rol)) {
    return res.status(403).json({ mensaje: 'Acceso denegado: Rol no autorizado' });
  }
  next();
};

// Middleware para validar roles de paciente (puede crear su propia suscripcion)
const verificarPacienteOAdmin = (req, res, next) => {
  const rol = req.user?.role_id;
  // Paciente (7) puede crear su suscripcion, admin tambien
  if (![1, 2, 7].includes(rol)) {
    return res.status(403).json({ mensaje: 'Acceso denegado: Rol no autorizado' });
  }
  next();
};

// Middleware para validar solo superadmin/admin
const verificarSuperAdmin = (req, res, next) => {
  const rol = req.user?.role_id;
  if (![1, 2].includes(rol)) {
    return res.status(403).json({ mensaje: 'Acceso denegado: Solo superadministradores pueden realizar esta accion' });
  }
  next();
};

// Aplicar autenticacion a todas las rutas
router.use(verificarToken);

// ============================================================================
// ESTADISTICAS (solo admin)
// ============================================================================

// Obtener estadisticas de suscripciones
router.get('/stats', verificarSuperAdmin, getStats);

// ============================================================================
// GESTION DE APROBACIONES (solo admin)
// ============================================================================

// Obtener suscripciones pendientes de aprobacion
router.get('/pending', verificarSuperAdmin, getPending);

// Aprobar suscripcion
router.post('/:id/approve', verificarSuperAdmin, approve);

// Rechazar suscripcion
router.post('/:id/reject', verificarSuperAdmin, reject);

// ============================================================================
// PRIMERA CONSULTA GRATIS
// ============================================================================

// Marcar primera consulta gratis como usada
router.post('/:subscriptionId/use-first-free-consultation', verificarRolesLectura, useFirstFreeConsultation);

// Verificar disponibilidad de primera consulta gratis
router.get('/:subscriptionId/first-free-consultation-available', verificarRolesLectura, checkFirstFreeConsultation);

// ============================================================================
// CONSULTAS POR PACIENTE
// ============================================================================

// Obtener suscripcion activa de un paciente
router.get('/patient/:patientId/active', verificarRolesLectura, getActiveByPatient);

// Verificar si paciente tiene plan activo
router.get('/patient/:patientId/has-active', verificarRolesLectura, checkActivePlan);

// Obtener historial de suscripciones de un paciente
router.get('/patient/:patientId/history', verificarRolesLectura, getPatientHistory);

// ============================================================================
// CREAR SUSCRIPCION (portal paciente)
// ============================================================================

// Crear suscripcion con voucher (usando Multer para subir imagen)
router.post('/', verificarPacienteOAdmin, uploadVoucherPlan.single('voucher'), s3Upload('vouchers_plan', { prefix: 'plan_voucher' }), createSubscription);

module.exports = router;
