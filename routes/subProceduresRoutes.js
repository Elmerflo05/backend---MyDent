/**
 * Sub-Procedures Routes
 * Rutas para sub-procedimientos con precios por plan de salud
 */

const express = require('express');
const router = express.Router();
const verificarToken = require('../middleware/authMiddleware');
const {
  getSubProcedures,
  getSubProcedure,
  getSubProcedureByCodeController,
  createNewSubProcedure,
  updateExistingSubProcedure,
  deleteExistingSubProcedure,
  getSubProcedurePrice,
  getSubProcedurePriceForPatient,
  getSubProcedurePriceByCodeForPatient,
  getSubProcedureSpecialties,
  getSubProceduresBySpecialtyWithPrices
} = require('../controllers/subProceduresController');

// Middleware para validar roles con permiso de LECTURA (todos los roles)
const verificarRolesLectura = (req, res, next) => {
  const rol = req.user?.role_id;
  // Roles permitidos: super_admin(1), admin(2), doctor(3), recepcionista(4),
  // tecnico_imagenes(5), almacenero(6), paciente(7)
  if (![1, 2, 3, 4, 5, 6, 7].includes(rol)) {
    return res.status(403).json({ mensaje: 'Acceso denegado: Rol no autorizado' });
  }
  next();
};

// Middleware para validar roles con permiso de ESCRITURA (solo admin y superadmin)
const verificarRolesEscritura = (req, res, next) => {
  const rol = req.user?.role_id;
  // Solo super_admin(1) y admin(2) pueden modificar
  if (![1, 2].includes(rol)) {
    return res.status(403).json({ mensaje: 'Acceso denegado: Solo administradores pueden modificar sub-procedimientos' });
  }
  next();
};

// Aplicar autenticacion a todas las rutas
router.use(verificarToken);

// ============================================================================
// RUTAS DE LECTURA
// ============================================================================

// Obtener todas las especialidades
router.get('/specialties', verificarRolesLectura, getSubProcedureSpecialties);

// Obtener sub-procedimientos por especialidad con precios de un plan
router.get('/specialty/:specialty/with-prices', verificarRolesLectura, getSubProceduresBySpecialtyWithPrices);

// Obtener precio por codigo para un paciente
router.get('/code/:code/price-for-patient/:patientId', verificarRolesLectura, getSubProcedurePriceByCodeForPatient);

// Obtener sub-procedimiento por codigo
router.get('/code/:code', verificarRolesLectura, getSubProcedureByCodeController);

// Obtener precio de sub-procedimiento para un paciente
router.get('/:id/price-for-patient/:patientId', verificarRolesLectura, getSubProcedurePriceForPatient);

// Obtener precio de sub-procedimiento segun plan
router.get('/:id/price', verificarRolesLectura, getSubProcedurePrice);

// Obtener todos los sub-procedimientos
router.get('/', verificarRolesLectura, getSubProcedures);

// Obtener sub-procedimiento por ID
router.get('/:id', verificarRolesLectura, getSubProcedure);

// ============================================================================
// RUTAS DE ESCRITURA (solo admin)
// ============================================================================

// Crear sub-procedimiento
router.post('/', verificarRolesEscritura, createNewSubProcedure);

// Actualizar sub-procedimiento
router.put('/:id', verificarRolesEscritura, updateExistingSubProcedure);

// Eliminar sub-procedimiento
router.delete('/:id', verificarRolesEscritura, deleteExistingSubProcedure);

module.exports = router;
