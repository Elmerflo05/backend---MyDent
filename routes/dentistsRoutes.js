const express = require('express');
const router = express.Router();
const verificarToken = require('../middleware/authMiddleware');
const {
  getDentists,
  getDentist,
  createNewDentist,
  createCompleteDentist,
  updateExistingDentist,
  deleteExistingDentist,
  addSchedule,
  updateSchedule,
  deleteSchedule,
  addBulkSchedules,
  getDentistBranches,
  assignBranchToDentist,
  removeBranchFromDentist,
  getExceptions,
  addException,
  deleteException,
  getDentistsByBranch,
  searchDentistByCop
} = require('../controllers/dentistsController');

// Middleware para validar los roles permitidos
const verificarRolesPermitidos = (req, res, next) => {
  const rol = req.user?.role_id;
  if (![1, 2, 3, 4, 5, 6, 7].includes(rol)) {
    return res.status(403).json({ mensaje: 'Acceso denegado: Rol no autorizado' });
  }
  next();
};

// Aplicar middlewares a todas las rutas
router.use(verificarToken);
router.use(verificarRolesPermitidos);

// Rutas de dentistas
router.get('/', getDentists);
router.get('/by-branch/:branchId', getDentistsByBranch); // Obtener dentistas por sede
router.get('/search/cop/:cop', searchDentistByCop); // Buscar dentista por COP (para laboratorio)
router.get('/:id', getDentist);
router.post('/', createNewDentist);
router.post('/complete', createCompleteDentist); // Crear médico completo (usuario + dentista + horarios)
router.put('/:id', updateExistingDentist);
router.delete('/:id', deleteExistingDentist);

// Rutas de horarios
router.post('/:id/schedules', addSchedule);
router.post('/:dentist_id/schedules/bulk', addBulkSchedules); // Crear horarios masivos
router.put('/schedules/:scheduleId', updateSchedule);
router.delete('/schedules/:scheduleId', deleteSchedule);

// Rutas de sedes asignadas
router.get('/:id/branches', getDentistBranches); // Obtener sedes asignadas
router.post('/:id/branches', assignBranchToDentist); // Asignar sede
router.delete('/:id/branches/:branch_id', removeBranchFromDentist); // Remover sede

// Rutas de excepciones de horario
router.get('/:id/exceptions', getExceptions);
router.post('/:id/exceptions', addException);
router.delete('/exceptions/:exceptionId', deleteException);

module.exports = router;
