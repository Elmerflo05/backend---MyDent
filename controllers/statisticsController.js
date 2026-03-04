const {
  getGlobalStatistics,
  getBranchStatistics,
  getAllBranchesStatistics,
  getRecentActivity
} = require('../models/statisticsModel');

/**
 * Obtiene estadísticas globales del sistema
 * GET /api/statistics/global
 */
const getGlobalStats = async (req, res) => {
  try {
    const statistics = await getGlobalStatistics();

    res.json({
      success: true,
      data: statistics
    });
  } catch (error) {
    console.error('Error al obtener estadísticas globales:', error);
    res.status(500).json({
      success: false,
      error: 'Error al obtener estadísticas globales'
    });
  }
};

/**
 * Obtiene estadísticas de una sede específica
 * GET /api/statistics/branch/:id
 */
const getBranchStats = async (req, res) => {
  try {
    const { id } = req.params;
    const branchId = parseInt(id);

    if (!branchId || isNaN(branchId)) {
      return res.status(400).json({
        success: false,
        error: 'ID de sede inválido'
      });
    }

    const statistics = await getBranchStatistics(branchId);

    res.json({
      success: true,
      data: statistics
    });
  } catch (error) {
    console.error('Error al obtener estadísticas de sede:', error);
    res.status(500).json({
      success: false,
      error: 'Error al obtener estadísticas de sede'
    });
  }
};

/**
 * Obtiene estadísticas de todas las sedes
 * GET /api/statistics/branches
 */
const getAllBranchesStats = async (req, res) => {
  try {
    const statistics = await getAllBranchesStatistics();

    res.json({
      success: true,
      data: statistics
    });
  } catch (error) {
    console.error('Error al obtener estadísticas de sedes:', error);
    res.status(500).json({
      success: false,
      error: 'Error al obtener estadísticas de sedes'
    });
  }
};

/**
 * Obtiene la actividad reciente del sistema
 * GET /api/statistics/activity
 */
const getRecentActivityHandler = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    const activities = await getRecentActivity(limit);

    res.json({
      success: true,
      data: activities
    });
  } catch (error) {
    console.error('Error al obtener actividad reciente:', error);
    res.status(500).json({
      success: false,
      error: 'Error al obtener actividad reciente'
    });
  }
};

module.exports = {
  getGlobalStats,
  getBranchStats,
  getAllBranchesStats,
  getRecentActivityHandler
};
