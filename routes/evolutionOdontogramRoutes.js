/**
 * Routes: evolutionOdontogramRoutes.js
 * Rutas para el odontograma de evolucion
 */

const express = require('express');
const router = express.Router();
const verificarToken = require('../middleware/authMiddleware');
const {
  getEvolutionOdontogramList,
  getEvolutionOdontogram,
  getPatientEvolution,
  getPatientEvolutionSummaryData,
  getToothEvolution,
  createNewEvolutionOdontogram,
  upsertEvolution,
  updateExistingEvolutionOdontogram,
  deleteExistingEvolutionOdontogram
} = require('../controllers/evolutionOdontogramController');

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

// Rutas especificas (deben ir ANTES de las rutas con parametros)
router.get('/patient/:patientId/summary', getPatientEvolutionSummaryData);
router.get('/patient/:patientId', getPatientEvolution);
router.get('/tooth/:patientId/:toothPositionId', getToothEvolution);
router.post('/upsert', upsertEvolution);

// Rutas CRUD generales
router.get('/', getEvolutionOdontogramList);
router.get('/:id', getEvolutionOdontogram);
router.post('/', createNewEvolutionOdontogram);
router.put('/:id', updateExistingEvolutionOdontogram);
router.delete('/:id', deleteExistingEvolutionOdontogram);

module.exports = router;
