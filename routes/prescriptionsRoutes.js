const express = require('express');
const router = express.Router();
const verificarToken = require('../middleware/authMiddleware');
const {
  getPrescriptions,
  getPrescription,
  getPrescriptionComplete,
  getPrescriptionByConsultation,
  createNewPrescription,
  updateExistingPrescription,
  deleteExistingPrescription,
  getMedications,
  getMedication,
  createNewMedication,
  updateExistingMedication,
  deleteExistingMedication
} = require('../controllers/prescriptionsController');

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

// ==================== RUTAS DE MEDICAMENTOS (Catalogo) ====================
// IMPORTANTE: Estas rutas deben ir ANTES de las rutas con :id
router.get('/medications/all', getMedications);
router.get('/medications/:id', getMedication);
router.post('/medications', createNewMedication);
router.put('/medications/:id', updateExistingMedication);
router.delete('/medications/:id', deleteExistingMedication);

// ==================== RUTAS DE RECETAS ====================
// Rutas especificas primero
router.get('/by-consultation/:consultationId', getPrescriptionByConsultation);
router.get('/complete/:id', getPrescriptionComplete);

// Rutas CRUD basicas
router.get('/', getPrescriptions);
router.get('/:id', getPrescription);
router.post('/', createNewPrescription);
router.put('/:id', updateExistingPrescription);
router.delete('/:id', deleteExistingPrescription);

module.exports = router;
