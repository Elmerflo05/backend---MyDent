const express = require('express');
const router = express.Router();
const { getAllSpecialties, getSpecialtiesByBranch } = require('../controllers/specialtiesController');
const verificarToken = require('../middleware/authMiddleware');

/**
 * Rutas de especialidades
 */

// GET /api/specialties - Obtener todas las especialidades activas
router.get('/', verificarToken, getAllSpecialties);

// GET /api/specialties/by-branch/:branchId - Obtener especialidades por sede
router.get('/by-branch/:branchId', verificarToken, getSpecialtiesByBranch);

module.exports = router;
