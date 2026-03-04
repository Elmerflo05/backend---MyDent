const catalogsModel = require('../models/catalogsModel');

/**
 * CONTROLADOR DE CATÁLOGOS DEL ODONTOGRAMA
 * Maneja las peticiones HTTP para todos los catálogos maestros
 */

// ============================================================
// TOOTH SURFACES (Superficies Dentales)
// ============================================================

const getToothSurfaces = async (req, res) => {
  try {
    const surfaces = await catalogsModel.getAllToothSurfaces();

    res.status(200).json({
      success: true,
      message: 'Superficies dentales obtenidas correctamente',
      data: surfaces,
      total: surfaces.length
    });
  } catch (error) {
    console.error('Error al obtener superficies dentales:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener superficies dentales',
      error: error.message
    });
  }
};

// ============================================================
// TOOTH POSITIONS (Posiciones Dentales)
// ============================================================

const getToothPositions = async (req, res) => {
  try {
    const { is_adult, quadrant, tooth_type } = req.query;

    const filters = {};
    if (is_adult !== undefined) {
      filters.is_adult = is_adult === 'true';
    }
    if (quadrant) {
      filters.quadrant = parseInt(quadrant);
    }
    if (tooth_type) {
      filters.tooth_type = tooth_type;
    }

    const positions = await catalogsModel.getAllToothPositions(filters);

    res.status(200).json({
      success: true,
      message: 'Posiciones dentales obtenidas correctamente',
      data: positions,
      total: positions.length,
      filters: filters
    });
  } catch (error) {
    console.error('Error al obtener posiciones dentales:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener posiciones dentales',
      error: error.message
    });
  }
};

const getToothPositionByNumber = async (req, res) => {
  try {
    const { toothNumber } = req.params;

    if (!toothNumber) {
      return res.status(400).json({
        success: false,
        message: 'El número de diente es requerido'
      });
    }

    const position = await catalogsModel.getToothPositionByNumber(toothNumber);

    if (!position) {
      return res.status(404).json({
        success: false,
        message: `Diente ${toothNumber} no encontrado`
      });
    }

    res.status(200).json({
      success: true,
      message: 'Posición dental obtenida correctamente',
      data: position
    });
  } catch (error) {
    console.error('Error al obtener posición dental:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener posición dental',
      error: error.message
    });
  }
};

// ============================================================
// TREATMENT STATUSES (Estados de Tratamiento)
// ============================================================

const getTreatmentStatuses = async (req, res) => {
  try {
    const statuses = await catalogsModel.getAllTreatmentStatuses();

    res.status(200).json({
      success: true,
      message: 'Estados de tratamiento obtenidos correctamente',
      data: statuses,
      total: statuses.length
    });
  } catch (error) {
    console.error('Error al obtener estados de tratamiento:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener estados de tratamiento',
      error: error.message
    });
  }
};

// ============================================================
// DIAGNOSIS OPTIONS (Opciones de Diagnóstico)
// ============================================================

const getDiagnosisOptions = async (req, res) => {
  try {
    const { category, search } = req.query;

    const filters = {};
    if (category) {
      filters.category = category;
    }
    if (search) {
      filters.search = search;
    }

    const options = await catalogsModel.getAllDiagnosisOptions(filters);

    res.status(200).json({
      success: true,
      message: 'Opciones de diagnóstico obtenidas correctamente',
      data: options,
      total: options.length,
      filters: filters
    });
  } catch (error) {
    console.error('Error al obtener opciones de diagnóstico:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener opciones de diagnóstico',
      error: error.message
    });
  }
};

const getDiagnosisOptionsByCategory = async (req, res) => {
  try {
    const groupedOptions = await catalogsModel.getDiagnosisOptionsByCategory();

    // Transformar a un objeto más amigable para el frontend
    const categorizedData = {};
    groupedOptions.forEach(item => {
      categorizedData[item.diagnosis_category] = item.options;
    });

    res.status(200).json({
      success: true,
      message: 'Opciones de diagnóstico agrupadas por categoría',
      data: categorizedData,
      categories: Object.keys(categorizedData)
    });
  } catch (error) {
    console.error('Error al obtener opciones de diagnóstico por categoría:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener opciones de diagnóstico por categoría',
      error: error.message
    });
  }
};

// ============================================================
// DENTAL PROCEDURES (Procedimientos Dentales)
// ============================================================

const getDentalProcedures = async (req, res) => {
  try {
    const { category, search, requires_anesthesia } = req.query;

    const filters = {};
    if (category) {
      filters.category = category;
    }
    if (search) {
      filters.search = search;
    }
    if (requires_anesthesia !== undefined) {
      filters.requires_anesthesia = requires_anesthesia === 'true';
    }

    const procedures = await catalogsModel.getAllDentalProcedures(filters);

    res.status(200).json({
      success: true,
      message: 'Procedimientos dentales obtenidos correctamente',
      data: procedures,
      total: procedures.length,
      filters: filters
    });
  } catch (error) {
    console.error('Error al obtener procedimientos dentales:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener procedimientos dentales',
      error: error.message
    });
  }
};

const getDentalProceduresByCategory = async (req, res) => {
  try {
    const groupedProcedures = await catalogsModel.getDentalProceduresByCategory();

    // Transformar a un objeto más amigable para el frontend
    const categorizedData = {};
    groupedProcedures.forEach(item => {
      categorizedData[item.procedure_category] = item.procedures;
    });

    res.status(200).json({
      success: true,
      message: 'Procedimientos dentales agrupados por categoría',
      data: categorizedData,
      categories: Object.keys(categorizedData)
    });
  } catch (error) {
    console.error('Error al obtener procedimientos dentales por categoría:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener procedimientos dentales por categoría',
      error: error.message
    });
  }
};

// ============================================================
// OBTENER TODOS LOS CATÁLOGOS (Endpoint unificado)
// ============================================================

const getAllCatalogs = async (req, res) => {
  try {
    const [
      surfaces,
      positions,
      statuses,
      diagnosisOptions,
      procedures
    ] = await Promise.all([
      catalogsModel.getAllToothSurfaces(),
      catalogsModel.getAllToothPositions(),
      catalogsModel.getAllTreatmentStatuses(),
      catalogsModel.getAllDiagnosisOptions(),
      catalogsModel.getAllDentalProcedures()
    ]);

    res.status(200).json({
      success: true,
      message: 'Todos los catálogos obtenidos correctamente',
      data: {
        tooth_surfaces: surfaces,
        tooth_positions: positions,
        treatment_statuses: statuses,
        diagnosis_options: diagnosisOptions,
        dental_procedures: procedures
      },
      summary: {
        tooth_surfaces_count: surfaces.length,
        tooth_positions_count: positions.length,
        treatment_statuses_count: statuses.length,
        diagnosis_options_count: diagnosisOptions.length,
        dental_procedures_count: procedures.length,
        total_records: surfaces.length + positions.length + statuses.length + diagnosisOptions.length + procedures.length
      }
    });
  } catch (error) {
    console.error('Error al obtener todos los catálogos:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener todos los catálogos',
      error: error.message
    });
  }
};

// ============================================================
// ESTADÍSTICAS
// ============================================================

const getCatalogStatistics = async (req, res) => {
  try {
    const stats = await catalogsModel.getCatalogStatistics();

    // Transformar en un objeto más amigable
    const statsObject = {};
    stats.forEach(stat => {
      statsObject[stat.catalog_name] = parseInt(stat.total_records);
    });

    const totalRecords = stats.reduce((sum, stat) => sum + parseInt(stat.total_records), 0);

    res.status(200).json({
      success: true,
      message: 'Estadísticas de catálogos obtenidas correctamente',
      data: statsObject,
      total_records: totalRecords
    });
  } catch (error) {
    console.error('Error al obtener estadísticas:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener estadísticas',
      error: error.message
    });
  }
};

module.exports = {
  // Tooth Surfaces
  getToothSurfaces,

  // Tooth Positions
  getToothPositions,
  getToothPositionByNumber,

  // Treatment Statuses
  getTreatmentStatuses,

  // Diagnosis Options
  getDiagnosisOptions,
  getDiagnosisOptionsByCategory,

  // Dental Procedures
  getDentalProcedures,
  getDentalProceduresByCategory,

  // Unified endpoint
  getAllCatalogs,

  // Statistics
  getCatalogStatistics
};
