const express = require('express');
const router = express.Router();
const verificarToken = require('../middleware/authMiddleware');
const {
  getPatients,
  getPatient,
  getPatientCompleteData,
  getPatientIntegralData,
  createNewPatient,
  updateExistingPatient,
  deleteExistingPatient,
  getAccessiblePatients,
  searchPatientByDni,
  getPatientFullIntegralHistory
} = require('../controllers/patientsController');

// Middleware para validar los roles permitidos
const verificarRolesPermitidos = (req, res, next) => {
  const rol = req.user?.role_id;
  if (![1, 2, 3, 4, 5, 6, 7].includes(rol)) {
    return res.status(403).json({ mensaje: 'Acceso denegado: Rol no autorizado' });
  }
  next();
};

// Middleware para verificar rol de Super Admin (role_id = 1)
const verificarSuperAdmin = (req, res, next) => {
  if (req.user?.role_id !== 1) {
    return res.status(403).json({ success: false, error: 'Acceso denegado: Solo Super Administrador' });
  }
  next();
};

// Aplicar middlewares a todas las rutas
router.use(verificarToken);
router.use(verificarRolesPermitidos);

// Rutas de pacientes
router.get('/', getPatients);
// Endpoint para obtener pacientes accesibles por sede (incluye pacientes con citas)
router.get('/accessible', getAccessiblePatients);
// Endpoint para buscar paciente por DNI (para laboratorio de imágenes)
router.get('/search/dni/:dni', searchPatientByDni);
// SA Only: Historial integral completo del paciente
router.get('/:id/integral-history', verificarSuperAdmin, getPatientFullIntegralHistory);
// OPTIMIZACION: Endpoint consolidado para cargar todos los datos del paciente
router.get('/:id/complete-data', getPatientCompleteData);
// Endpoint para obtener datos de atención integral y servicios adicionales
router.get('/:id/integral-data', getPatientIntegralData);
router.get('/:id', getPatient);
router.post('/', createNewPatient);
router.put('/:id', updateExistingPatient);
router.delete('/:id', deleteExistingPatient);

module.exports = router;
