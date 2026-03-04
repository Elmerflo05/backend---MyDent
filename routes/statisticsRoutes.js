const express = require('express');
const router = express.Router();
const verificarToken = require('../middleware/authMiddleware');
const {
  getGlobalStats,
  getBranchStats,
  getAllBranchesStats,
  getRecentActivityHandler
} = require('../controllers/statisticsController');

// Aplicar middleware de autenticación a todas las rutas
router.use(verificarToken);

/**
 * @route   GET /api/statistics/global
 * @desc    Obtiene estadísticas globales del sistema
 * @access  Private (requiere autenticación)
 */
router.get('/global', getGlobalStats);

/**
 * @route   GET /api/statistics/branch/:id
 * @desc    Obtiene estadísticas de una sede específica
 * @access  Private (requiere autenticación)
 */
router.get('/branch/:id', getBranchStats);

/**
 * @route   GET /api/statistics/branches
 * @desc    Obtiene estadísticas de todas las sedes
 * @access  Private (requiere autenticación)
 */
router.get('/branches', getAllBranchesStats);

/**
 * @route   GET /api/statistics/activity
 * @desc    Obtiene la actividad reciente del sistema
 * @access  Private (requiere autenticación)
 */
router.get('/activity', getRecentActivityHandler);

module.exports = router;
