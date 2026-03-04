const express = require('express');
const router = express.Router();
const verificarToken = require('../middleware/authMiddleware');
const {
  getContractTemplates,
  getContractTemplate,
  createNewContractTemplate,
  updateExistingContractTemplate,
  deleteExistingContractTemplate
} = require('../controllers/contractTemplatesController');

// Middleware de autenticación para todas las rutas
router.use(verificarToken);

// Middleware de autorización - Roles permitidos para administrar plantillas
// 1: Super Admin, 2: Admin, 3: Doctor, 4: Recepcionista
const verificarRolesAdmin = (req, res, next) => {
  const rol = req.user?.role_id;
  if (![1, 2, 3, 4].includes(rol)) {
    return res.status(403).json({ mensaje: 'Acceso denegado: Rol no autorizado para administrar plantillas' });
  }
  next();
};

// Middleware de lectura - Incluye pacientes para ver plantillas públicas
// 1-7: Todos los roles autenticados pueden ver
const verificarRolesLectura = (req, res, next) => {
  const rol = req.user?.role_id;
  if (![1, 2, 3, 4, 5, 6, 7].includes(rol)) {
    return res.status(403).json({ mensaje: 'Acceso denegado: Rol no autorizado' });
  }
  next();
};

// Rutas de plantillas de contratos

// GET - Obtener todas las plantillas (con filtros y paginación)
// Query params: template_category, template_type, is_active, search, page, limit
router.get('/', verificarRolesLectura, getContractTemplates);

// GET - Obtener una plantilla por ID
router.get('/:id', verificarRolesLectura, getContractTemplate);

// POST - Crear nueva plantilla
router.post('/', verificarRolesAdmin, createNewContractTemplate);

// PUT - Actualizar plantilla existente
router.put('/:id', verificarRolesAdmin, updateExistingContractTemplate);

// DELETE - Eliminar plantilla (soft delete)
router.delete('/:id', verificarRolesAdmin, deleteExistingContractTemplate);

module.exports = router;
