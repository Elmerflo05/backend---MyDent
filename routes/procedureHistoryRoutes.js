/**
 * Routes: procedureHistoryRoutes.js
 * Rutas para el historial clinico de procedimientos
 */

const express = require('express');
const router = express.Router();
const verificarToken = require('../middleware/authMiddleware');
const {
  getProcedureHistoryList,
  getProcedureHistory,
  getPatientHistory,
  getConsultationHistory,
  createNewProcedureHistory,
  updateExistingProcedureHistory,
  deleteExistingProcedureHistory
} = require('../controllers/procedureHistoryController');

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
router.get('/patient/:patientId', getPatientHistory);
router.get('/consultation/:consultationId', getConsultationHistory);

// Rutas CRUD generales
router.get('/', getProcedureHistoryList);
router.get('/:id', getProcedureHistory);
router.post('/', createNewProcedureHistory);
router.put('/:id', updateExistingProcedureHistory);
router.delete('/:id', deleteExistingProcedureHistory);

module.exports = router;
