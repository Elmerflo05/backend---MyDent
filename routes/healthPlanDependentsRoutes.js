/**
 * Health Plan Dependents Routes
 * Rutas para dependientes del Plan Familiar
 */

const express = require('express');
const router = express.Router();
const verificarToken = require('../middleware/authMiddleware');
const {
  getDependents,
  getDependent,
  createDependent,
  modifyDependent,
  deleteDependent,
  checkPatientCoverage,
  getCoveredPatientsList
} = require('../controllers/healthPlanDependentsController');

// Middleware para validar roles con permiso de LECTURA
const verificarRolesLectura = (req, res, next) => {
  const rol = req.user?.role_id;
  // Roles permitidos: todos
  if (![1, 2, 3, 4, 5, 6, 7].includes(rol)) {
    return res.status(403).json({ mensaje: 'Acceso denegado: Rol no autorizado' });
  }
  next();
};

// Middleware para validar roles con permiso de ESCRITURA
const verificarRolesEscritura = (req, res, next) => {
  const rol = req.user?.role_id;
  // Solo admin y superadmin pueden modificar
  if (![1, 2].includes(rol)) {
    return res.status(403).json({ mensaje: 'Acceso denegado: Solo administradores pueden modificar dependientes' });
  }
  next();
};

// Aplicar autenticacion a todas las rutas
router.use(verificarToken);

// ============================================================================
// RUTAS DE VERIFICACION DE COBERTURA
// ============================================================================

// Verificar cobertura de un paciente
router.get('/patient/:patientId/coverage', verificarRolesLectura, checkPatientCoverage);

// ============================================================================
// RUTAS DE DEPENDIENTES POR SUSCRIPCION
// ============================================================================

// Obtener todos los pacientes cubiertos por una suscripcion
router.get('/subscription/:subscriptionId/covered-patients', verificarRolesLectura, getCoveredPatientsList);

// Obtener dependientes de una suscripcion
router.get('/subscription/:subscriptionId', verificarRolesLectura, getDependents);

// Agregar dependiente a una suscripcion
router.post('/subscription/:subscriptionId', verificarRolesEscritura, createDependent);

// ============================================================================
// RUTAS DE DEPENDIENTE INDIVIDUAL
// ============================================================================

// Obtener dependiente por ID
router.get('/:id', verificarRolesLectura, getDependent);

// Actualizar dependiente
router.put('/:id', verificarRolesEscritura, modifyDependent);

// Eliminar dependiente
router.delete('/:id', verificarRolesEscritura, deleteDependent);

module.exports = router;
