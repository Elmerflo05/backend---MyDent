const odontogramConditionsModel = require('../models/odontogramConditionsModel');

/**
 * CONTROLADOR DE CONDICIONES DENTALES DEL ODONTOGRAMA
 * Maneja las peticiones HTTP para el catálogo de condiciones dentales
 * y sus procedimientos asociados
 */

// ============================================================
// DENTAL CONDITIONS (Condiciones Dentales)
// ============================================================

/**
 * GET /api/catalogs/dental-conditions
 * Obtener todas las condiciones dentales
 */
const getDentalConditions = async (req, res) => {
  try {
    const { category, search, status } = req.query;

    const filters = {};
    if (category) {
      filters.category = category;
    }
    if (search) {
      filters.search = search;
    }
    if (status) {
      filters.status = status;
    }

    const conditions = await odontogramConditionsModel.getAllDentalConditions(filters);

    res.status(200).json({
      success: true,
      message: 'Condiciones dentales obtenidas correctamente',
      data: conditions,
      total: conditions.length,
      filters: filters
    });
  } catch (error) {
    console.error('Error al obtener condiciones dentales:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener condiciones dentales',
      error: error.message
    });
  }
};

/**
 * GET /api/catalogs/dental-conditions/by-category
 * Obtener condiciones dentales agrupadas por categoría
 */
const getDentalConditionsByCategory = async (req, res) => {
  try {
    const conditionsByCategory = await odontogramConditionsModel.getDentalConditionsByCategory();

    res.status(200).json({
      success: true,
      message: 'Condiciones dentales por categoría obtenidas correctamente',
      data: conditionsByCategory,
      total: conditionsByCategory.length
    });
  } catch (error) {
    console.error('Error al obtener condiciones por categoría:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener condiciones por categoría',
      error: error.message
    });
  }
};

/**
 * GET /api/catalogs/dental-conditions/:code
 * Obtener una condición dental por código
 */
const getDentalConditionByCode = async (req, res) => {
  try {
    const { code } = req.params;

    if (!code) {
      return res.status(400).json({
        success: false,
        message: 'El código de condición es requerido'
      });
    }

    const condition = await odontogramConditionsModel.getDentalConditionByCode(code);

    if (!condition) {
      return res.status(404).json({
        success: false,
        message: `Condición dental con código ${code} no encontrada`
      });
    }

    res.status(200).json({
      success: true,
      message: 'Condición dental obtenida correctamente',
      data: condition
    });
  } catch (error) {
    console.error('Error al obtener condición dental:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener condición dental',
      error: error.message
    });
  }
};

/**
 * GET /api/catalogs/dental-conditions/id/:id
 * Obtener una condición dental por ID
 */
const getDentalConditionById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({
        success: false,
        message: 'El ID de condición es requerido'
      });
    }

    const condition = await odontogramConditionsModel.getDentalConditionById(parseInt(id));

    if (!condition) {
      return res.status(404).json({
        success: false,
        message: `Condición dental con ID ${id} no encontrada`
      });
    }

    res.status(200).json({
      success: true,
      message: 'Condición dental obtenida correctamente',
      data: condition
    });
  } catch (error) {
    console.error('Error al obtener condición dental:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener condición dental',
      error: error.message
    });
  }
};

/**
 * PUT /api/catalogs/dental-conditions/:id/price
 * Actualizar precio por defecto de una condición
 */
const updateConditionPrice = async (req, res) => {
  try {
    const { id } = req.params;
    const { price } = req.body;
    const userId = req.user?.user_id || 1; // Usuario desde middleware de autenticación

    if (!id || price === undefined) {
      return res.status(400).json({
        success: false,
        message: 'El ID y el precio son requeridos'
      });
    }

    if (price < 0) {
      return res.status(400).json({
        success: false,
        message: 'El precio no puede ser negativo'
      });
    }

    const updatedCondition = await odontogramConditionsModel.updateConditionPrice(
      parseInt(id),
      price,
      userId
    );

    if (!updatedCondition) {
      return res.status(404).json({
        success: false,
        message: `Condición dental con ID ${id} no encontrada`
      });
    }

    res.status(200).json({
      success: true,
      message: 'Precio actualizado correctamente',
      data: updatedCondition
    });
  } catch (error) {
    console.error('Error al actualizar precio de condición:', error);
    res.status(500).json({
      success: false,
      message: 'Error al actualizar precio de condición',
      error: error.message
    });
  }
};

/**
 * PUT /api/catalogs/dental-conditions/:id/prices
 * Actualizar precios variables de una condición (JSON)
 */
const updateConditionPrices = async (req, res) => {
  try {
    const { id } = req.params;
    const { prices } = req.body;
    const userId = req.user?.user_id || 1;

    console.log('\n🟢 [BACKEND-CONTROLLER] ========================================');
    console.log('📥 PUT /api/catalogs/dental-conditions/:id/prices');
    console.log('🔑 Condition ID:', id);
    console.log('👤 User ID:', userId);
    console.log('📦 Prices recibidos:', JSON.stringify(prices, null, 2));

    if (!id || !prices) {
      console.warn('⚠️ Validación fallida: ID o prices faltantes');
      return res.status(400).json({
        success: false,
        message: 'El ID y los precios son requeridos'
      });
    }

    if (typeof prices !== 'object') {
      console.warn('⚠️ Validación fallida: prices no es un objeto');
      console.warn('   Tipo recibido:', typeof prices);
      return res.status(400).json({
        success: false,
        message: 'Los precios deben ser un objeto JSON'
      });
    }

    console.log('✅ Validaciones pasadas, llamando a modelo...');

    const updatedCondition = await odontogramConditionsModel.updateConditionPrices(
      parseInt(id),
      prices,
      userId
    );

    if (!updatedCondition) {
      console.warn('❌ Condición no encontrada en BD');
      return res.status(404).json({
        success: false,
        message: `Condición dental con ID ${id} no encontrada`
      });
    }

    console.log('✅ Condición actualizada exitosamente');
    console.log('📤 Respuesta:', {
      condition_id: updatedCondition.condition_id,
      condition_name: updatedCondition.condition_name,
      prices: updatedCondition.prices
    });
    console.log('========================================\n');

    res.status(200).json({
      success: true,
      message: 'Precios actualizados correctamente',
      data: updatedCondition
    });
  } catch (error) {
    console.error('❌ [BACKEND-CONTROLLER] Error fatal:', error.message);
    console.error('Stack:', error.stack);
    console.log('========================================\n');
    res.status(500).json({
      success: false,
      message: 'Error al actualizar precios de condición',
      error: error.message
    });
  }
};

// ============================================================
// CONDITION PROCEDURES (Procedimientos por Condición)
// ============================================================

/**
 * GET /api/catalogs/dental-conditions/:conditionId/procedures
 * Obtener todos los procedimientos de una condición
 */
const getConditionProcedures = async (req, res) => {
  try {
    const { conditionId } = req.params;

    if (!conditionId) {
      return res.status(400).json({
        success: false,
        message: 'El ID de condición es requerido'
      });
    }

    const procedures = await odontogramConditionsModel.getConditionProcedures(parseInt(conditionId));

    res.status(200).json({
      success: true,
      message: 'Procedimientos de la condición obtenidos correctamente',
      data: procedures,
      total: procedures.length
    });
  } catch (error) {
    console.error('Error al obtener procedimientos de condición:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener procedimientos de condición',
      error: error.message
    });
  }
};

/**
 * POST /api/catalogs/dental-conditions/:conditionId/procedures
 * Crear un nuevo procedimiento para una condición
 */
const createConditionProcedure = async (req, res) => {
  try {
    const { conditionId } = req.params;
    const procedureData = req.body;
    const userId = req.user?.user_id || 1;

    if (!conditionId) {
      return res.status(400).json({
        success: false,
        message: 'El ID de condición es requerido'
      });
    }

    if (!procedureData.procedure_name) {
      return res.status(400).json({
        success: false,
        message: 'El nombre del procedimiento es requerido'
      });
    }

    // Agregar el condition_id al objeto de datos
    procedureData.odontogram_condition_id = parseInt(conditionId);

    const newProcedure = await odontogramConditionsModel.createConditionProcedure(
      procedureData,
      userId
    );

    res.status(201).json({
      success: true,
      message: 'Procedimiento creado correctamente',
      data: newProcedure
    });
  } catch (error) {
    console.error('Error al crear procedimiento de condición:', error);
    res.status(500).json({
      success: false,
      message: 'Error al crear procedimiento de condición',
      error: error.message
    });
  }
};

/**
 * PUT /api/catalogs/dental-conditions/:conditionId/procedures/:procedureId
 * Actualizar un procedimiento de una condición
 */
const updateConditionProcedure = async (req, res) => {
  try {
    const { conditionId, procedureId } = req.params;
    const procedureData = req.body;
    const userId = req.user?.user_id || 1;

    if (!conditionId || !procedureId) {
      return res.status(400).json({
        success: false,
        message: 'El ID de condición y procedimiento son requeridos'
      });
    }

    const updatedProcedure = await odontogramConditionsModel.updateConditionProcedure(
      parseInt(procedureId),
      procedureData,
      userId
    );

    if (!updatedProcedure) {
      return res.status(404).json({
        success: false,
        message: `Procedimiento con ID ${procedureId} no encontrado`
      });
    }

    res.status(200).json({
      success: true,
      message: 'Procedimiento actualizado correctamente',
      data: updatedProcedure
    });
  } catch (error) {
    console.error('Error al actualizar procedimiento de condición:', error);
    res.status(500).json({
      success: false,
      message: 'Error al actualizar procedimiento de condición',
      error: error.message
    });
  }
};

/**
 * DELETE /api/catalogs/dental-conditions/:conditionId/procedures/:procedureId
 * Eliminar (desactivar) un procedimiento de una condición
 */
const deleteConditionProcedure = async (req, res) => {
  try {
    const { conditionId, procedureId } = req.params;
    const userId = req.user?.user_id || 1;

    if (!conditionId || !procedureId) {
      return res.status(400).json({
        success: false,
        message: 'El ID de condición y procedimiento son requeridos'
      });
    }

    const deletedProcedure = await odontogramConditionsModel.deleteConditionProcedure(
      parseInt(procedureId),
      userId
    );

    if (!deletedProcedure) {
      return res.status(404).json({
        success: false,
        message: `Procedimiento con ID ${procedureId} no encontrado`
      });
    }

    res.status(200).json({
      success: true,
      message: 'Procedimiento eliminado correctamente',
      data: deletedProcedure
    });
  } catch (error) {
    console.error('Error al eliminar procedimiento de condición:', error);
    res.status(500).json({
      success: false,
      message: 'Error al eliminar procedimiento de condición',
      error: error.message
    });
  }
};

// ============================================================
// ESTADÍSTICAS
// ============================================================

/**
 * GET /api/catalogs/dental-conditions/statistics
 * Obtener estadísticas de condiciones dentales
 */
const getDentalConditionsStatistics = async (req, res) => {
  try {
    const statistics = await odontogramConditionsModel.getDentalConditionsStatistics();

    res.status(200).json({
      success: true,
      message: 'Estadísticas obtenidas correctamente',
      data: statistics
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
  // Dental Conditions
  getDentalConditions,
  getDentalConditionsByCategory,
  getDentalConditionByCode,
  getDentalConditionById,
  updateConditionPrice,
  updateConditionPrices,

  // Condition Procedures
  getConditionProcedures,
  createConditionProcedure,
  updateConditionProcedure,
  deleteConditionProcedure,

  // Statistics
  getDentalConditionsStatistics
};
