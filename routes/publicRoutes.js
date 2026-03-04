const express = require('express');
const router = express.Router();
const { getActiveBranches } = require('../controllers/branchesController');
const { getDentists, getDentistsByBranch } = require('../controllers/dentistsController');
const { getAllSpecialties, getSpecialtiesByBranch } = require('../controllers/specialtiesController');
const availabilityRoutes = require('./availabilityRoutes');

/**
 * Rutas públicas - No requieren autenticación
 * Estas rutas están disponibles para cualquier visitante del sitio
 */

/**
 * GET /api/public/branches/active
 * Obtiene solo las sedes activas con información pública
 * No requiere autenticación
 */
router.get('/branches/active', getActiveBranches);

/**
 * GET /api/public/dentists
 * Obtiene todos los dentistas activos con sus especialidades
 * No requiere autenticación
 */
router.get('/dentists', getDentists);

/**
 * GET /api/public/dentists/by-branch/:branchId
 * Obtiene dentistas activos de una sede específica con sus especialidades
 * No requiere autenticación
 */
router.get('/dentists/by-branch/:branchId', getDentistsByBranch);

/**
 * GET /api/public/specialties
 * Obtiene todas las especialidades activas
 * No requiere autenticación
 */
router.get('/specialties', getAllSpecialties);

/**
 * GET /api/public/specialties/by-branch/:branchId
 * Obtiene especialidades activas disponibles en una sede específica
 * No requiere autenticación
 */
router.get('/specialties/by-branch/:branchId', getSpecialtiesByBranch);

/**
 * Rutas de disponibilidad (horarios y slots)
 * Montadas en /api/public/availability/*
 */
router.use('/availability', availabilityRoutes);

module.exports = router;
