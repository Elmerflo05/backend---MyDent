/**
 * Treatment Packs Routes
 * Rutas para el sistema de Packs de Tratamientos
 */

const express = require('express');
const router = express.Router();
const verificarToken = require('../middleware/authMiddleware');
const {
  // CRUD principal
  getTreatmentPacks,
  getTreatmentPack,
  createTreatmentPack,
  updateTreatmentPack,
  deleteTreatmentPack,

  // Items de condiciones
  addConditionItem,
  removeConditionItem,

  // Items personalizados
  addCustomItem,
  removeCustomItem,

  // Auxiliares
  getPackCategories,
  getAvailableConditions,
  getConditionProcedures,
  recalculateTotal,
  duplicatePack
} = require('../controllers/treatmentPacksController');

// Middleware para validar roles permitidos
// Roles: 1=Superadmin, 2=Admin, 3=Dentista, 4=Recepcionista, 5=Asistente, 6=Paciente
const verificarRolesPermitidos = (req, res, next) => {
  const rol = req.user?.role_id;
  // Solo Superadmin y Admin pueden gestionar packs de tratamientos
  if (![1, 2].includes(rol)) {
    return res.status(403).json({
      success: false,
      error: 'Acceso denegado: Solo administradores pueden gestionar packs de tratamientos'
    });
  }
  next();
};

// Middleware para roles de solo lectura (incluye dentistas y recepcionistas)
const verificarRolesLectura = (req, res, next) => {
  const rol = req.user?.role_id;
  if (![1, 2, 3, 4].includes(rol)) {
    return res.status(403).json({
      success: false,
      error: 'Acceso denegado: Rol no autorizado'
    });
  }
  next();
};

// Aplicar middleware de autenticacion a todas las rutas
router.use(verificarToken);

// =============================================================================
// RUTAS AUXILIARES (van primero para evitar conflictos con :id)
// =============================================================================

// GET /api/treatment-packs/categories - Obtener categorias de packs
router.get('/categories', verificarRolesLectura, getPackCategories);

// GET /api/treatment-packs/available-conditions - Obtener condiciones disponibles
router.get('/available-conditions', verificarRolesLectura, getAvailableConditions);

// GET /api/treatment-packs/conditions/:conditionId/procedures - Obtener procedimientos de una condicion
router.get('/conditions/:conditionId/procedures', verificarRolesLectura, getConditionProcedures);

// =============================================================================
// RUTAS CRUD PRINCIPALES
// =============================================================================

// GET /api/treatment-packs - Listar todos los packs
router.get('/', verificarRolesLectura, getTreatmentPacks);

// GET /api/treatment-packs/:id - Obtener un pack por ID
router.get('/:id', verificarRolesLectura, getTreatmentPack);

// POST /api/treatment-packs - Crear un nuevo pack
router.post('/', verificarRolesPermitidos, createTreatmentPack);

// PUT /api/treatment-packs/:id - Actualizar un pack
router.put('/:id', verificarRolesPermitidos, updateTreatmentPack);

// DELETE /api/treatment-packs/:id - Eliminar un pack
router.delete('/:id', verificarRolesPermitidos, deleteTreatmentPack);

// =============================================================================
// RUTAS PARA ITEMS DE CONDICIONES
// =============================================================================

// POST /api/treatment-packs/:id/condition-items - Agregar item de condicion
router.post('/:id/condition-items', verificarRolesPermitidos, addConditionItem);

// DELETE /api/treatment-packs/:packId/condition-items/:itemId - Eliminar item de condicion
router.delete('/:packId/condition-items/:itemId', verificarRolesPermitidos, removeConditionItem);

// =============================================================================
// RUTAS PARA ITEMS PERSONALIZADOS
// =============================================================================

// POST /api/treatment-packs/:id/custom-items - Agregar item personalizado
router.post('/:id/custom-items', verificarRolesPermitidos, addCustomItem);

// DELETE /api/treatment-packs/:packId/custom-items/:itemId - Eliminar item personalizado
router.delete('/:packId/custom-items/:itemId', verificarRolesPermitidos, removeCustomItem);

// =============================================================================
// RUTAS DE ACCIONES ESPECIALES
// =============================================================================

// POST /api/treatment-packs/:id/recalculate - Recalcular precio total
router.post('/:id/recalculate', verificarRolesPermitidos, recalculateTotal);

// POST /api/treatment-packs/:id/duplicate - Duplicar un pack
router.post('/:id/duplicate', verificarRolesPermitidos, duplicatePack);

module.exports = router;
