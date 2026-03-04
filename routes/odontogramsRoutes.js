const express = require('express');
const router = express.Router();
const verificarToken = require('../middleware/authMiddleware');
const {
  getOdontograms,
  getOdontogram,
  createNewOdontogram,
  updateExistingOdontogram,
  deleteExistingOdontogram,
  addOdontogramCondition,
  removeOdontogramCondition,
  addOdontogramTreatment,
  removeOdontogramTreatment,
  // Nuevos endpoints para integración relacional
  getCurrentPatientOdontogram,
  saveOdontogramConditionsBatch,
  getOdontogramConditions,
  upsertPatientOdontogram,
  getToothPositionsCatalog,
  getToothSurfacesCatalog,
  // Endpoints para vista de paciente con tabs
  getPatientOdontogramsForTabs,
  getOdontogramFull,
  // Endpoint para precio personalizado por diente
  updateToothCustomPrice
} = require('../controllers/odontogramsController');

// Middleware para validar roles de staff (doctores, admin, etc.)
const verificarRolesStaff = (req, res, next) => {
  const rol = req.user?.role_id;
  if (![1, 2, 3, 4, 5, 6].includes(rol)) {
    return res.status(403).json({ mensaje: 'Acceso denegado: Rol no autorizado' });
  }
  next();
};

// Middleware para permitir acceso a pacientes (solo a su propia información)
const verificarAccesoPaciente = (req, res, next) => {
  const rol = req.user?.role_id;
  const patientIdFromToken = req.user?.patient_id;
  const patientIdFromParams = parseInt(req.params.patientId);

  // Si es staff, permitir acceso
  if ([1, 2, 3, 4, 5, 6].includes(rol)) {
    return next();
  }

  // Si es paciente (rol 7), solo puede ver su propio odontograma
  if (rol === 7) {
    if (patientIdFromToken && patientIdFromToken === patientIdFromParams) {
      return next();
    }
    return res.status(403).json({ mensaje: 'Acceso denegado: Solo puedes ver tu propio odontograma' });
  }

  return res.status(403).json({ mensaje: 'Acceso denegado: Rol no autorizado' });
};

// Aplicar verificación de token a todas las rutas
router.use(verificarToken);

// ============================================================
// RUTAS PARA PACIENTES (permiten acceso a rol 7 - paciente)
// Estas rutas deben ir PRIMERO para que no sean capturadas por rutas genéricas
// ============================================================

// Rutas por paciente - usan verificarAccesoPaciente para permitir rol 7
router.get('/patient/:patientId/current', verificarAccesoPaciente, getCurrentPatientOdontogram);
router.get('/patient/:patientId/with-history', verificarAccesoPaciente, getPatientOdontogramsForTabs);
router.post('/patient/:patientId/upsert', verificarRolesStaff, upsertPatientOdontogram); // Solo staff puede modificar

// ============================================================
// RUTAS DE STAFF (solo roles 1-6)
// ============================================================

// Catálogos (sin parámetros dinámicos)
router.get('/catalogs/tooth-positions', verificarRolesStaff, getToothPositionsCatalog);
router.get('/catalogs/tooth-surfaces', verificarRolesStaff, getToothSurfacesCatalog);

// Rutas de odontogramas
router.get('/', verificarRolesStaff, getOdontograms);
// La ruta :id/full debe ir ANTES de :id para que no sea capturada
router.get('/:id/full', verificarRolesStaff, getOdontogramFull);
router.get('/:id', verificarRolesStaff, getOdontogram);
router.post('/', verificarRolesStaff, createNewOdontogram);
router.put('/:id', verificarRolesStaff, updateExistingOdontogram);
router.delete('/:id', verificarRolesStaff, deleteExistingOdontogram);

// Rutas de condiciones
router.get('/:id/conditions', verificarRolesStaff, getOdontogramConditions);
router.post('/:id/conditions', verificarRolesStaff, addOdontogramCondition);
router.post('/:id/conditions/batch', verificarRolesStaff, saveOdontogramConditionsBatch);
router.delete('/conditions/:conditionId', verificarRolesStaff, removeOdontogramCondition);

// Ruta para actualizar precio personalizado por diente
router.put('/:id/tooth-price', verificarRolesStaff, updateToothCustomPrice);

// Rutas de tratamientos
router.post('/:id/treatments', verificarRolesStaff, addOdontogramTreatment);
router.delete('/treatments/:treatmentId', verificarRolesStaff, removeOdontogramTreatment);

module.exports = router;
