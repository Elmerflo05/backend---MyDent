/**
 * Rutas del Portal del Paciente
 * Endpoints especificos para pacientes logueados (rol 6)
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
const { getMyDocuments } = require('../controllers/patientDocumentsController');
const { uploadPatientExternalExam } = require('../config/multerConfig');
const { s3Upload } = require('../middleware/s3UploadMiddleware');
const {
  getPatientNotifications,
  getPatientUnreadCount,
  markPatientNotificationRead,
  markAllPatientNotificationsRead
} = require('../controllers/notificationsController');

const PATIENT_ROLE_ID = 6;

/**
 * Middleware para validar que el usuario sea un paciente (rol 6)
 * o tenga un rol que permita acceso (roles 1-5 para testing/admin)
 */
const verificarRolPaciente = (req, res, next) => {
  const rol = req.user?.role_id;

  if (![1, 2, 3, 4, 5, 6].includes(rol)) {
    return res.status(403).json({
      success: false,
      mensaje: 'Acceso denegado: Rol no autorizado para el portal de paciente'
    });
  }

  if (rol === PATIENT_ROLE_ID && !req.user?.patient_id) {
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
// RUTAS DE DOCUMENTOS DEL PACIENTE
// ============================================================================

/**
 * GET /api/patient-portal/my-documents
 * Obtiene los documentos del paciente logueado (filtrado por patient_id del token)
 */
router.get('/my-documents', getMyDocuments);

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
