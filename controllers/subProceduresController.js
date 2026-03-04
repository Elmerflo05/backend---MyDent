/**
 * Sub-Procedures Controller
 * Controlador para sub-procedimientos con precios por plan de salud
 */

const {
  getAllSubProcedures,
  getSubProcedureById,
  getSubProcedureByCode,
  createSubProcedure,
  updateSubProcedure,
  deleteSubProcedure,
  countSubProcedures,
  getPriceByPlan,
  getPriceForPatient,
  getPriceByCodeForPatient,
  getSpecialties,
  getSubProceduresBySpecialtyWithPlanPrices
} = require('../models/subProceduresModel');

// ============================================================================
// CRUD BASICO
// ============================================================================

/**
 * Obtener todos los sub-procedimientos
 */
const getSubProcedures = async (req, res) => {
  try {
    const { specialty, is_active, search, page = 1, limit = 200 } = req.query;

    const filters = {
      specialty,
      is_active: is_active !== undefined ? is_active === 'true' : undefined,
      search,
      limit: parseInt(limit),
      offset: (parseInt(page) - 1) * parseInt(limit)
    };

    const [subProcedures, total] = await Promise.all([
      getAllSubProcedures(filters),
      countSubProcedures(filters)
    ]);

    res.json({
      success: true,
      data: subProcedures,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Error al obtener sub-procedimientos:', error);
    res.status(500).json({
      success: false,
      error: 'Error al obtener sub-procedimientos'
    });
  }
};

/**
 * Obtener sub-procedimiento por ID
 */
const getSubProcedure = async (req, res) => {
  try {
    const { id } = req.params;
    const subProcedure = await getSubProcedureById(parseInt(id));

    if (!subProcedure) {
      return res.status(404).json({
        success: false,
        error: 'Sub-procedimiento no encontrado'
      });
    }

    res.json({
      success: true,
      data: subProcedure
    });
  } catch (error) {
    console.error('Error al obtener sub-procedimiento:', error);
    res.status(500).json({
      success: false,
      error: 'Error al obtener sub-procedimiento'
    });
  }
};

/**
 * Obtener sub-procedimiento por codigo
 */
const getSubProcedureByCodeController = async (req, res) => {
  try {
    const { code } = req.params;
    const subProcedure = await getSubProcedureByCode(code);

    if (!subProcedure) {
      return res.status(404).json({
        success: false,
        error: 'Sub-procedimiento no encontrado'
      });
    }

    res.json({
      success: true,
      data: subProcedure
    });
  } catch (error) {
    console.error('Error al obtener sub-procedimiento por codigo:', error);
    res.status(500).json({
      success: false,
      error: 'Error al obtener sub-procedimiento'
    });
  }
};

/**
 * Crear sub-procedimiento
 */
const createNewSubProcedure = async (req, res) => {
  try {
    const data = {
      ...req.body,
      user_id_registration: req.user.user_id
    };

    if (!data.sub_procedure_name || data.price_without_plan === undefined) {
      return res.status(400).json({
        success: false,
        error: 'Nombre y precio sin plan son requeridos'
      });
    }

    const newSubProcedure = await createSubProcedure(data);

    res.status(201).json({
      success: true,
      message: 'Sub-procedimiento creado exitosamente',
      data: newSubProcedure
    });
  } catch (error) {
    console.error('Error al crear sub-procedimiento:', error);

    if (error.code === '23505') {
      return res.status(400).json({
        success: false,
        error: 'Ya existe un sub-procedimiento con ese codigo'
      });
    }

    res.status(500).json({
      success: false,
      error: 'Error al crear sub-procedimiento'
    });
  }
};

/**
 * Actualizar sub-procedimiento
 */
const updateExistingSubProcedure = async (req, res) => {
  try {
    const { id } = req.params;
    const data = {
      ...req.body,
      user_id_modification: req.user.user_id
    };

    const updatedSubProcedure = await updateSubProcedure(parseInt(id), data);

    if (!updatedSubProcedure) {
      return res.status(404).json({
        success: false,
        error: 'Sub-procedimiento no encontrado'
      });
    }

    res.json({
      success: true,
      message: 'Sub-procedimiento actualizado exitosamente',
      data: updatedSubProcedure
    });
  } catch (error) {
    console.error('Error al actualizar sub-procedimiento:', error);
    res.status(500).json({
      success: false,
      error: 'Error al actualizar sub-procedimiento'
    });
  }
};

/**
 * Eliminar sub-procedimiento
 */
const deleteExistingSubProcedure = async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await deleteSubProcedure(parseInt(id), req.user.user_id);

    if (!deleted) {
      return res.status(404).json({
        success: false,
        error: 'Sub-procedimiento no encontrado'
      });
    }

    res.json({
      success: true,
      message: 'Sub-procedimiento eliminado exitosamente'
    });
  } catch (error) {
    console.error('Error al eliminar sub-procedimiento:', error);
    res.status(500).json({
      success: false,
      error: 'Error al eliminar sub-procedimiento'
    });
  }
};

// ============================================================================
// LOGICA DE PRECIOS
// ============================================================================

/**
 * Obtener precio de sub-procedimiento segun plan
 * GET /api/sub-procedures/:id/price?plan_code=personal
 */
const getSubProcedurePrice = async (req, res) => {
  try {
    const { id } = req.params;
    const { plan_code } = req.query;

    const priceInfo = await getPriceByPlan(parseInt(id), plan_code || null);

    res.json({
      success: true,
      data: priceInfo
    });
  } catch (error) {
    console.error('Error al obtener precio:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Error al obtener precio'
    });
  }
};

/**
 * Obtener precio de sub-procedimiento para un paciente especifico
 * Detecta automaticamente el plan del paciente
 * GET /api/sub-procedures/:id/price-for-patient/:patientId
 */
const getSubProcedurePriceForPatient = async (req, res) => {
  try {
    const { id, patientId } = req.params;

    const priceInfo = await getPriceForPatient(parseInt(id), parseInt(patientId));

    res.json({
      success: true,
      data: priceInfo
    });
  } catch (error) {
    console.error('Error al obtener precio para paciente:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Error al obtener precio para paciente'
    });
  }
};

/**
 * Obtener precio por codigo de sub-procedimiento para un paciente
 * GET /api/sub-procedures/code/:code/price-for-patient/:patientId
 */
const getSubProcedurePriceByCodeForPatient = async (req, res) => {
  try {
    const { code, patientId } = req.params;

    const priceInfo = await getPriceByCodeForPatient(code, parseInt(patientId));

    res.json({
      success: true,
      data: priceInfo
    });
  } catch (error) {
    console.error('Error al obtener precio por codigo para paciente:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Error al obtener precio'
    });
  }
};

// ============================================================================
// UTILIDADES
// ============================================================================

/**
 * Obtener todas las especialidades
 */
const getSubProcedureSpecialties = async (req, res) => {
  try {
    const specialties = await getSpecialties();

    res.json({
      success: true,
      data: specialties
    });
  } catch (error) {
    console.error('Error al obtener especialidades:', error);
    res.status(500).json({
      success: false,
      error: 'Error al obtener especialidades'
    });
  }
};

/**
 * Obtener sub-procedimientos por especialidad con precios de un plan
 * GET /api/sub-procedures/specialty/:specialty/with-prices?plan_code=personal
 */
const getSubProceduresBySpecialtyWithPrices = async (req, res) => {
  try {
    const { specialty } = req.params;
    const { plan_code } = req.query;

    const subProcedures = await getSubProceduresBySpecialtyWithPlanPrices(
      specialty,
      plan_code || null
    );

    res.json({
      success: true,
      data: subProcedures
    });
  } catch (error) {
    console.error('Error al obtener sub-procedimientos con precios:', error);
    res.status(500).json({
      success: false,
      error: 'Error al obtener sub-procedimientos'
    });
  }
};

module.exports = {
  // CRUD
  getSubProcedures,
  getSubProcedure,
  getSubProcedureByCodeController,
  createNewSubProcedure,
  updateExistingSubProcedure,
  deleteExistingSubProcedure,

  // Precios
  getSubProcedurePrice,
  getSubProcedurePriceForPatient,
  getSubProcedurePriceByCodeForPatient,

  // Utilidades
  getSubProcedureSpecialties,
  getSubProceduresBySpecialtyWithPrices
};
