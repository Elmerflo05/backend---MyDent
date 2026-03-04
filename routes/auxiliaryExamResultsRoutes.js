/**
 * Rutas para Resultados de Examenes Auxiliares (Paso 6 - Atencion Integral)
 *
 * Endpoints:
 * - GET    /api/auxiliary-exam-results/consultation/:consultationId  - Obtener por consulta
 * - GET    /api/auxiliary-exam-results/patient/:patientId            - Obtener por paciente
 * - GET    /api/auxiliary-exam-results/:id                           - Obtener por ID
 * - POST   /api/auxiliary-exam-results/upsert                        - Crear o actualizar
 * - POST   /api/auxiliary-exam-results/consultation/:consultationId/upload-file  - Subir archivo
 * - DELETE /api/auxiliary-exam-results/consultation/:consultationId/file/:fileId - Eliminar archivo
 * - PUT    /api/auxiliary-exam-results/consultation/:consultationId/observations - Actualizar observaciones
 */

const express = require('express');
const router = express.Router();
const verificarToken = require('../middleware/authMiddleware');
const { uploadAuxiliaryExamFiles } = require('../config/multerConfig');
const { s3Upload } = require('../middleware/s3UploadMiddleware');
const {
  getByConsultationHandler,
  getByPatientHandler,
  upsertResultHandler,
  uploadExternalFileHandler,
  deleteExternalFileHandler,
  updateObservationsHandler,
  getByIdHandler,
  getPatientExternalExamsHandler
} = require('../controllers/auxiliaryExamResultsController');

// Middleware para validar roles permitidos
// 1=super_admin, 2=admin, 3=dentist
const verificarRolesPermitidos = (req, res, next) => {
  const rol = req.user?.role_id;
  if (![1, 2, 3].includes(rol)) {
    return res.status(403).json({
      success: false,
      error: 'Acceso denegado: Rol no autorizado'
    });
  }
  next();
};

// Aplicar middleware de autenticacion a todas las rutas
router.use(verificarToken);
router.use(verificarRolesPermitidos);

// ============================================================================
// RUTAS DE LECTURA
// ============================================================================

/**
 * Obtener resultado por consultation_id
 * GET /api/auxiliary-exam-results/consultation/:consultationId
 */
router.get('/consultation/:consultationId', getByConsultationHandler);

/**
 * Obtener todos los resultados de un paciente
 * GET /api/auxiliary-exam-results/patient/:patientId
 */
router.get('/patient/:patientId', getByPatientHandler);

/**
 * Obtener examenes externos subidos por el paciente desde su portal
 * GET /api/auxiliary-exam-results/patient/:patientId/external-exams
 */
router.get('/patient/:patientId/external-exams', getPatientExternalExamsHandler);

/**
 * Obtener resultado por ID
 * GET /api/auxiliary-exam-results/:id
 */
router.get('/:id', getByIdHandler);

// ============================================================================
// RUTAS DE ESCRITURA
// ============================================================================

/**
 * Crear o actualizar resultado (upsert)
 * POST /api/auxiliary-exam-results/upsert
 *
 * Body:
 * {
 *   consultation_id: number (requerido),
 *   patient_id: number (requerido para crear),
 *   dentist_id: number (requerido para crear),
 *   doctor_observations: string (opcional),
 *   external_files: array (opcional)
 * }
 */
router.post('/upsert', upsertResultHandler);

/**
 * Subir archivo externo
 * POST /api/auxiliary-exam-results/consultation/:consultationId/upload-file
 *
 * FormData:
 * - file: archivo (imagen o PDF)
 * - patient_id: number (opcional, requerido si no existe registro)
 * - dentist_id: number (opcional, requerido si no existe registro)
 */
router.post(
  '/consultation/:consultationId/upload-file',
  uploadAuxiliaryExamFiles.single('file'),
  s3Upload('integral_atention/step_6_Results_of_Auxiliary_Exams', { prefix: 'aux_exam' }),
  uploadExternalFileHandler
);

/**
 * Eliminar archivo externo
 * DELETE /api/auxiliary-exam-results/consultation/:consultationId/file/:fileId
 */
router.delete('/consultation/:consultationId/file/:fileId', deleteExternalFileHandler);

/**
 * Actualizar observaciones del doctor
 * PUT /api/auxiliary-exam-results/consultation/:consultationId/observations
 *
 * Body:
 * {
 *   observations: string
 * }
 */
router.put('/consultation/:consultationId/observations', updateObservationsHandler);

module.exports = router;
