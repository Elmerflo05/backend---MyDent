const express = require('express');
const router = express.Router();
const verificarToken = require('../middleware/authMiddleware');
const {
  getHealthPlans,
  getHealthPlan,
  createNewHealthPlan,
  updateExistingHealthPlan,
  deleteExistingHealthPlan,
  getHealthPlanSubscriptions,
  getHealthPlanSubscription,
  createNewHealthPlanSubscription,
  updateExistingHealthPlanSubscription,
  deleteExistingHealthPlanSubscription,
  getAllTerms,
  getHealthPlanTerms,
  getHealthPlanTerm,
  createNewHealthPlanTerm,
  updateExistingHealthPlanTerm,
  deleteExistingHealthPlanTerm
} = require('../controllers/healthPlansController');

// Middleware para validar roles con permiso de LECTURA (incluyendo Pacientes)
const verificarRolesLectura = (req, res, next) => {
  const rol = req.user?.role_id;
  // Roles permitidos: super_admin(1), admin(2), doctor(3), recepcionista(4),
  // tecnico_imagenes(5), almacenero(6), paciente(7)
  if (![1, 2, 3, 4, 5, 6, 7].includes(rol)) {
    return res.status(403).json({ mensaje: 'Acceso denegado: Rol no autorizado' });
  }
  next();
};

// Middleware para validar roles con permiso de ESCRITURA (solo admin)
const verificarRolesEscritura = (req, res, next) => {
  const rol = req.user?.role_id;
  // Roles permitidos: solo roles administrativos (1-6)
  if (![1, 2, 3, 4, 5, 6].includes(rol)) {
    return res.status(403).json({ mensaje: 'Acceso denegado: Solo usuarios administrativos pueden modificar planes' });
  }
  next();
};

// Aplicar autenticación a todas las rutas
router.use(verificarToken);

// Ruta para obtener TODOS los términos de todos los planes (antes de /:id)
router.get('/all-terms', verificarRolesLectura, getAllTerms);

// Rutas de LECTURA de planes de salud (Pacientes pueden acceder)
router.get('/', verificarRolesLectura, getHealthPlans);
router.get('/:id', verificarRolesLectura, getHealthPlan);

// Rutas de ESCRITURA de planes (Solo admin)
router.post('/', verificarRolesEscritura, createNewHealthPlan);
router.put('/:id', verificarRolesEscritura, updateExistingHealthPlan);
router.delete('/:id', verificarRolesEscritura, deleteExistingHealthPlan);

// Rutas de suscripciones
router.get('/subscriptions/all', verificarRolesLectura, getHealthPlanSubscriptions);
router.get('/subscriptions/:id', verificarRolesLectura, getHealthPlanSubscription);
router.post('/subscriptions', verificarRolesLectura, createNewHealthPlanSubscription); // Pacientes pueden crear su suscripción
router.put('/subscriptions/:id', verificarRolesEscritura, updateExistingHealthPlanSubscription);
router.delete('/subscriptions/:id', verificarRolesEscritura, deleteExistingHealthPlanSubscription);

// Rutas de términos del plan (LECTURA para todos)
router.get('/:planId/terms', verificarRolesLectura, getHealthPlanTerms);
router.get('/terms/:id', verificarRolesLectura, getHealthPlanTerm);
router.post('/:planId/terms', verificarRolesEscritura, createNewHealthPlanTerm);
router.put('/terms/:id', verificarRolesEscritura, updateExistingHealthPlanTerm);
router.delete('/terms/:id', verificarRolesEscritura, deleteExistingHealthPlanTerm);

module.exports = router;
