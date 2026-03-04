/**
 * Rutas del Portal del Paciente
 * Endpoints especificos para pacientes logueados (rol 7)
 * Permite a los pacientes ver su propio historial medico
 */

const express = require('express');
const router = express.Router();
const verificarToken = require('../middleware/authMiddleware');
const {
  getMyMedicalHistory,
  getMyConsultationDetail,
  getMyMedicalSummary,
  getMyProfile,
  updateMyProfile,
  getMyExternalExams,
  uploadExternalExamFile,
  addExternalExamLink,
  deleteMyExternalExam
} = require('../controllers/patientPortalController');
const { uploadPatientExternalExam } = require('../config/multerConfig');
const { s3Upload } = require('../middleware/s3UploadMiddleware');
const {
  getPatientNotifications,
  getPatientUnreadCount,
  markPatientNotificationRead,
  markAllPatientNotificationsRead
} = require('../controllers/notificationsController');

/**
 * Middleware para validar que el usuario sea un paciente (rol 7)
 * o tenga un rol que permita acceso (roles 1-6 para testing/admin)
 */
const verificarRolPaciente = (req, res, next) => {
  const rol = req.user?.role_id;

  // Rol 7 = Paciente, roles 1-6 = Staff (para testing y administracion)
  if (![1, 2, 3, 4, 5, 6, 7].includes(rol)) {
    return res.status(403).json({
      success: false,
      mensaje: 'Acceso denegado: Rol no autorizado para el portal de paciente'
    });
  }

  // Si es paciente (rol 7), debe tener patient_id
  if (rol === 7 && !req.user?.patient_id) {
    return res.status(403).json({
      success: false,
      mensaje: 'Acceso denegado: Usuario paciente sin ID de paciente asociado'
    });
  }

  next();
};

// Aplicar middleware de autenticacion a todas las rutas
router.use(verificarToken);
router.use(verificarRolPaciente);

/**
 * GET /api/patient-portal/medical-history
 * Obtiene el historial completo de atenciones integrales del paciente
 * Incluye: odontograma, diagnostico, plan de tratamiento, examenes, etc.
 */
router.get('/medical-history', getMyMedicalHistory);

/**
 * GET /api/patient-portal/medical-history/:consultationId
 * Obtiene el detalle de una atencion integral especifica
 */
router.get('/medical-history/:consultationId', getMyConsultationDetail);

/**
 * GET /api/patient-portal/summary
 * Obtiene un resumen general del historial medico
 */
router.get('/summary', getMyMedicalSummary);

/**
 * GET /api/patient-portal/profile
 * Obtiene el perfil completo del paciente logueado
 */
router.get('/profile', getMyProfile);

/**
 * PUT /api/patient-portal/profile
 * Actualiza el perfil del paciente logueado
 */
router.put('/profile', updateMyProfile);

// ============================================================================
// RUTAS DE EXAMENES EXTERNOS DEL PACIENTE
// ============================================================================

/**
 * GET /api/patient-portal/external-exams
 * Obtiene todos los exámenes externos del paciente logueado
 */
router.get('/external-exams', getMyExternalExams);

/**
 * POST /api/patient-portal/external-exams/file
 * Sube un archivo de examen externo (PDF, imagen)
 */
router.post('/external-exams/file', uploadPatientExternalExam.single('file'), s3Upload('patient_external_exams', { prefix: 'external_exam' }), uploadExternalExamFile);

/**
 * POST /api/patient-portal/external-exams/link
 * Agrega un link externo de examen
 */
router.post('/external-exams/link', addExternalExamLink);

/**
 * DELETE /api/patient-portal/external-exams/:examId
 * Elimina un examen externo del paciente
 */
router.delete('/external-exams/:examId', deleteMyExternalExam);

// ============================================================================
// RUTAS DE NOTIFICACIONES DEL PACIENTE
// ============================================================================

/**
 * GET /api/patient-portal/notifications
 * Obtiene todas las notificaciones del paciente logueado
 */
router.get('/notifications', getPatientNotifications);

/**
 * GET /api/patient-portal/notifications/unread-count
 * Obtiene el conteo de notificaciones no leídas
 */
router.get('/notifications/unread-count', getPatientUnreadCount);

/**
 * PUT /api/patient-portal/notifications/mark-all-read
 * Marca todas las notificaciones como leídas
 */
router.put('/notifications/mark-all-read', markAllPatientNotificationsRead);

/**
 * PUT /api/patient-portal/notifications/:id/read
 * Marca una notificación específica como leída
 */
router.put('/notifications/:id/read', markPatientNotificationRead);

module.exports = router;
