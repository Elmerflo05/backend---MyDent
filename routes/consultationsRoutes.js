const express = require('express');
const router = express.Router();
const verificarToken = require('../middleware/authMiddleware');
const {
  getConsultations,
  getConsultation,
  createNewConsultation,
  updateExistingConsultation,
  deleteExistingConsultation,
  upsertConsultationHandler,
  addDiagnostic,
  removeDiagnostic,
  getRooms,
  getRoom,
  createRoom,
  updateRoom,
  deleteRoom,
  // Handlers para imagenes del examen clinico
  uploadExtraoralImagesHandler,
  uploadIntraoralImagesHandler,
  deleteExtraoralImageHandler,
  deleteIntraoralImageHandler,
  getClinicalExamImagesHandler,
  // Handlers para diagnostico definitivo
  getDefinitiveDiagnosisHandler,
  addDefinitiveDiagnosisHandler,
  updateDefinitiveDiagnosisHandler,
  deleteDefinitiveDiagnosisHandler,
  saveDefinitiveDiagnosisBulkHandler,
  updateSelectedProcedureHandler,
  // Handlers para condiciones presuntivas del odontograma
  getPresumptiveConditionsHandler,
  getPresumptiveConditionsByPatientHandler
} = require('../controllers/consultationsController');

// Controlador para planes de tratamiento de consulta (Paso 8)
const {
  getConsultationTreatmentPlan,
  getConsultationTreatmentPlanSummary,
  upsertConsultationTreatmentPlan,
  deleteConsultationTreatmentPlan,
  checkTreatmentPlanExists
} = require('../controllers/consultationTreatmentPlansController');

// Controlador para presupuestos de consulta (Paso 9)
const {
  getConsultationBudget,
  getConsultationBudgetSummary,
  upsertConsultationBudget,
  updateConsultationBudget,
  updateAdvancePayment,
  updateBudgetStatus,
  syncBudgetTotals,
  deleteConsultationBudget,
  checkBudgetExists
} = require('../controllers/consultationBudgetsController');

// Configuracion de Multer para imagenes clinicas
const {
  uploadExtraoralImages,
  uploadIntraoralImages
} = require('../config/multerClinicalExam');
const { s3Upload } = require('../middleware/s3UploadMiddleware');

// Middleware para validar los roles permitidos
const verificarRolesPermitidos = (req, res, next) => {
  const rol = req.user?.role_id;
  if (![1, 2, 3, 4, 5, 6].includes(rol)) {
    return res.status(403).json({ mensaje: 'Acceso denegado: Rol no autorizado' });
  }
  next();
};

// Aplicar middlewares a todas las rutas
router.use(verificarToken);
router.use(verificarRolesPermitidos);

// Rutas de consultas
router.get('/', getConsultations);
router.get('/:id', getConsultation);
router.post('/', createNewConsultation);
router.post('/upsert', upsertConsultationHandler); // Upsert: crea o actualiza según appointment_id
router.put('/:id', updateExistingConsultation);
router.delete('/:id', deleteExistingConsultation);

// Rutas de condiciones diagnósticas
router.post('/:id/diagnostics', addDiagnostic);
router.delete('/diagnostics/:conditionId', removeDiagnostic);

// Rutas de salas de consulta
router.get('/rooms/all', getRooms);
router.get('/rooms/:roomId', getRoom);
router.post('/rooms', createRoom);
router.put('/rooms/:roomId', updateRoom);
router.delete('/rooms/:roomId', deleteRoom);

// ============================================================================
// RUTAS PARA IMAGENES DEL EXAMEN CLINICO
// ============================================================================

// Obtener todas las imagenes del examen clinico de una consulta
router.get('/:consultationId/clinical-exam/images', getClinicalExamImagesHandler);

// Subir imagenes del examen extraoral (multiples archivos)
router.post(
  '/:consultationId/clinical-exam/extraoral/images',
  uploadExtraoralImages.array('images', 10),
  s3Upload('integral_atention/step_1_clinical_examination/extraoral_clinical_examination'),
  uploadExtraoralImagesHandler
);

// Subir imagenes del examen intraoral (multiples archivos)
router.post(
  '/:consultationId/clinical-exam/intraoral/images',
  uploadIntraoralImages.array('images', 10),
  s3Upload('integral_atention/step_1_clinical_examination/intraoral_clinical_examination'),
  uploadIntraoralImagesHandler
);

// Eliminar una imagen del examen extraoral
router.delete('/:consultationId/clinical-exam/extraoral/images', deleteExtraoralImageHandler);

// Eliminar una imagen del examen intraoral
router.delete('/:consultationId/clinical-exam/intraoral/images', deleteIntraoralImageHandler);

// ============================================================================
// RUTAS PARA DIAGNÓSTICO DEFINITIVO
// ============================================================================

// Obtener las condiciones del diagnóstico definitivo de una consulta
router.get('/:consultationId/definitive-diagnosis', getDefinitiveDiagnosisHandler);

// Agregar una condición al diagnóstico definitivo
router.post('/:consultationId/definitive-diagnosis', addDefinitiveDiagnosisHandler);

// Guardar todas las condiciones del diagnóstico definitivo (bulk save)
router.post('/:consultationId/definitive-diagnosis/bulk', saveDefinitiveDiagnosisBulkHandler);

// Actualizar una condición del diagnóstico definitivo
router.put('/definitive-diagnosis/:conditionId', updateDefinitiveDiagnosisHandler);

// Eliminar una condicion del diagnostico definitivo
router.delete('/definitive-diagnosis/:conditionId', deleteDefinitiveDiagnosisHandler);

// Actualizar el procedimiento seleccionado de una condicion del diagnostico definitivo
router.put('/definitive-diagnosis/:conditionId/procedure', updateSelectedProcedureHandler);

// ============================================================================
// RUTAS PARA CONDICIONES PRESUNTIVAS DEL ODONTOGRAMA
// ============================================================================

// Obtener condiciones presuntivas por consultation_id (del odontograma del paciente)
router.get('/:consultationId/presumptive-conditions', getPresumptiveConditionsHandler);

// Obtener condiciones presuntivas por patient_id (del odontograma del paciente)
router.get('/patients/:patientId/presumptive-conditions', getPresumptiveConditionsByPatientHandler);

// ============================================================================
// RUTAS PARA PLAN DE TRATAMIENTO DE CONSULTA (Paso 8)
// ============================================================================

// Obtener el plan de tratamiento completo de una consulta
router.get('/:consultationId/treatment-plan', getConsultationTreatmentPlan);

// Obtener resumen del plan de tratamiento
router.get('/:consultationId/treatment-plan/summary', getConsultationTreatmentPlanSummary);

// Verificar si existe un plan de tratamiento
router.get('/:consultationId/treatment-plan/exists', checkTreatmentPlanExists);

// Crear o actualizar el plan de tratamiento de una consulta
router.post('/:consultationId/treatment-plan', upsertConsultationTreatmentPlan);

// Eliminar el plan de tratamiento de una consulta
router.delete('/:consultationId/treatment-plan', deleteConsultationTreatmentPlan);

// ============================================================================
// RUTAS PARA PRESUPUESTO DE CONSULTA (Paso 9)
// ============================================================================

// Obtener el presupuesto completo de una consulta
router.get('/:consultationId/budget', getConsultationBudget);

// Obtener resumen del presupuesto (solo totales)
router.get('/:consultationId/budget/summary', getConsultationBudgetSummary);

// Verificar si existe un presupuesto
router.get('/:consultationId/budget/exists', checkBudgetExists);

// Crear o actualizar el presupuesto de una consulta
router.post('/:consultationId/budget', upsertConsultationBudget);

// Actualizar el presupuesto
router.put('/:consultationId/budget', updateConsultationBudget);

// Actualizar solo el adelanto del presupuesto
router.put('/:consultationId/budget/advance', updateAdvancePayment);

// Actualizar el estado del presupuesto
router.put('/:consultationId/budget/status', updateBudgetStatus);

// Sincronizar totales del presupuesto desde tablas relacionadas
router.post('/:consultationId/budget/sync', syncBudgetTotals);

// Eliminar (cancelar) el presupuesto de una consulta
router.delete('/:consultationId/budget', deleteConsultationBudget);

module.exports = router;
