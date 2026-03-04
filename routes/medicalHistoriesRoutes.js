const express = require('express');
const router = express.Router();
const verificarToken = require('../middleware/authMiddleware');
const {
  getMedicalHistories,
  getMedicalHistory,
  getPatientMedicalHistory,
  createNewMedicalHistory,
  updateExistingMedicalHistory,
  deleteExistingMedicalHistory,
  upsertMedicalHistoryHandler
} = require('../controllers/medicalHistoriesController');

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

// Rutas de historias médicas
router.get('/', getMedicalHistories);
router.get('/patient/:patientId', getPatientMedicalHistory);
router.get('/:id', getMedicalHistory);
router.post('/', createNewMedicalHistory);
router.post('/upsert', upsertMedicalHistoryHandler); // Upsert: crea o actualiza según patient_id
router.put('/:id', updateExistingMedicalHistory);
router.delete('/:id', deleteExistingMedicalHistory);

module.exports = router;
