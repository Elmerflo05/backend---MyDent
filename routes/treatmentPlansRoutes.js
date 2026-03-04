const express = require('express');
const router = express.Router();
const verificarToken = require('../middleware/authMiddleware');
const {
  getTreatmentPlans,
  getTreatmentPlan,
  createNewTreatmentPlan,
  updateExistingTreatmentPlan,
  approveExistingTreatmentPlan,
  deleteExistingTreatmentPlan,
  addProcedureToPlan,
  updatePlanProcedure,
  removeProcedureFromPlan
} = require('../controllers/treatmentPlansController');

// Middleware para validar los roles permitidos
// Roles: 1=SuperAdmin, 2=Admin, 3=Doctor, 4=Recepcionista, 5=LabTechnician, 6=ImagingTech, 7=Paciente
const verificarRolesPermitidos = (req, res, next) => {
  const rol = req.user?.role_id;
  // Permitir acceso a staff (1-6) y pacientes (7) para ver sus propios tratamientos
  if (![1, 2, 3, 4, 5, 6, 7].includes(rol)) {
    return res.status(403).json({ mensaje: 'Acceso denegado: Rol no autorizado' });
  }
  next();
};

// Middleware para restringir escritura solo a staff (no pacientes)
const verificarRolesEscritura = (req, res, next) => {
  const rol = req.user?.role_id;
  if (![1, 2, 3, 4, 5, 6].includes(rol)) {
    return res.status(403).json({ mensaje: 'Acceso denegado: Solo personal autorizado puede modificar' });
  }
  next();
};

// Aplicar middlewares a todas las rutas
router.use(verificarToken);
router.use(verificarRolesPermitidos);

// Rutas de planes de tratamiento - Lectura (pacientes pueden acceder)
router.get('/', getTreatmentPlans);
router.get('/:id', getTreatmentPlan);

// Rutas de planes de tratamiento - Escritura (solo staff)
router.post('/', verificarRolesEscritura, createNewTreatmentPlan);
router.put('/:id', verificarRolesEscritura, updateExistingTreatmentPlan);
router.put('/:id/approve', verificarRolesEscritura, approveExistingTreatmentPlan);
router.delete('/:id', verificarRolesEscritura, deleteExistingTreatmentPlan);

// Rutas de procedimientos del plan - Escritura (solo staff)
router.post('/:id/procedures', verificarRolesEscritura, addProcedureToPlan);
router.put('/procedures/:procedureId', verificarRolesEscritura, updatePlanProcedure);
router.delete('/procedures/:procedureId', verificarRolesEscritura, removeProcedureFromPlan);

module.exports = router;
