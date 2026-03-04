/**
 * Treatment Packs Controller
 * Maneja las peticiones HTTP para el sistema de Packs de Tratamientos
 */

const treatmentPacksModel = require('../models/treatmentPacksModel');

// =============================================================================
// CRUD PRINCIPAL - TREATMENT PACKS
// =============================================================================

/**
 * GET /api/treatment-packs
 * Obtiene todos los packs de tratamientos con paginacion y filtros
 */
const getTreatmentPacks = async (req, res) => {
  try {
    const {
      category,
      is_active,
      pack_type,
      only_packs,
      search,
      order_by,
      order_dir,
      page = 1,
      limit = 20
    } = req.query;

    const filters = {
      category: category || null,
      is_active: is_active !== undefined ? is_active === 'true' : undefined,
      pack_type: pack_type || null,
      only_packs: only_packs === 'true',
      search: search || null,
      order_by: order_by || 'treatment_name',
      order_dir: order_dir || 'ASC',
      limit: parseInt(limit),
      offset: (parseInt(page) - 1) * parseInt(limit)
    };

    const [packs, total] = await Promise.all([
      treatmentPacksModel.getAllTreatmentPacks(filters),
      treatmentPacksModel.countTreatmentPacks(filters)
    ]);

    res.json({
      success: true,
      data: packs,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Error al obtener packs de tratamientos:', error);
    res.status(500).json({
      success: false,
      error: 'Error al obtener packs de tratamientos',
      details: error.message
    });
  }
};

/**
 * GET /api/treatment-packs/:id
 * Obtiene un pack de tratamiento por ID con todos sus items
 */
const getTreatmentPack = async (req, res) => {
  try {
    const { id } = req.params;
    const pack = await treatmentPacksModel.getTreatmentPackById(parseInt(id));

    if (!pack) {
      return res.status(404).json({
        success: false,
        error: 'Pack de tratamiento no encontrado'
      });
    }

    res.json({
      success: true,
      data: pack
    });
  } catch (error) {
    console.error('Error al obtener pack de tratamiento:', error);
    res.status(500).json({
      success: false,
      error: 'Error al obtener pack de tratamiento',
      details: error.message
    });
  }
};

/**
 * POST /api/treatment-packs
 * Crea un nuevo pack de tratamiento
 */
const createTreatmentPack = async (req, res) => {
  try {
    const packData = {
      ...req.body,
      user_id_registration: req.user?.user_id
    };

    // Validaciones
    if (!packData.treatment_name) {
      return res.status(400).json({
        success: false,
        error: 'El nombre del pack es requerido'
      });
    }

    // Validar que al menos tenga items si es un pack
    const hasConditionItems = packData.condition_items && packData.condition_items.length > 0;
    const hasCustomItems = packData.custom_items && packData.custom_items.length > 0;

    if (!hasConditionItems && !hasCustomItems && packData.pack_type !== 'simple') {
      return res.status(400).json({
        success: false,
        error: 'Un pack debe tener al menos un item (condicion o personalizado)'
      });
    }

    // Validar items de condiciones
    if (hasConditionItems) {
      for (const item of packData.condition_items) {
        if (!item.odontogram_condition_id) {
          return res.status(400).json({
            success: false,
            error: 'Cada item de condicion debe tener odontogram_condition_id'
          });
        }
        if (item.unit_price === undefined || item.unit_price < 0) {
          return res.status(400).json({
            success: false,
            error: 'Cada item de condicion debe tener un unit_price valido'
          });
        }
      }
    }

    // Validar items personalizados
    if (hasCustomItems) {
      for (const item of packData.custom_items) {
        if (!item.item_name) {
          return res.status(400).json({
            success: false,
            error: 'Cada item personalizado debe tener un nombre'
          });
        }
        if (item.unit_price === undefined || item.unit_price < 0) {
          return res.status(400).json({
            success: false,
            error: 'Cada item personalizado debe tener un unit_price valido'
          });
        }
      }
    }

    const newPack = await treatmentPacksModel.createTreatmentPack(packData);

    res.status(201).json({
      success: true,
      message: 'Pack de tratamiento creado exitosamente',
      data: newPack
    });
  } catch (error) {
    console.error('Error al crear pack de tratamiento:', error);

    // Manejar errores de duplicados
    if (error.code === '23505') {
      return res.status(409).json({
        success: false,
        error: 'Ya existe un pack con ese codigo'
      });
    }

    res.status(500).json({
      success: false,
      error: 'Error al crear pack de tratamiento',
      details: error.message
    });
  }
};

/**
 * PUT /api/treatment-packs/:id
 * Actualiza un pack de tratamiento existente
 */
const updateTreatmentPack = async (req, res) => {
  try {
    const { id } = req.params;
    const packData = {
      ...req.body,
      user_id_modification: req.user?.user_id
    };

    // Validar items si se proporcionan
    if (packData.condition_items) {
      for (const item of packData.condition_items) {
        if (!item.odontogram_condition_id) {
          return res.status(400).json({
            success: false,
            error: 'Cada item de condicion debe tener odontogram_condition_id'
          });
        }
        if (item.unit_price === undefined || item.unit_price < 0) {
          return res.status(400).json({
            success: false,
            error: 'Cada item de condicion debe tener un unit_price valido'
          });
        }
      }
    }

    if (packData.custom_items) {
      for (const item of packData.custom_items) {
        if (!item.item_name) {
          return res.status(400).json({
            success: false,
            error: 'Cada item personalizado debe tener un nombre'
          });
        }
        if (item.unit_price === undefined || item.unit_price < 0) {
          return res.status(400).json({
            success: false,
            error: 'Cada item personalizado debe tener un unit_price valido'
          });
        }
      }
    }

    const updatedPack = await treatmentPacksModel.updateTreatmentPack(parseInt(id), packData);

    res.json({
      success: true,
      message: 'Pack de tratamiento actualizado exitosamente',
      data: updatedPack
    });
  } catch (error) {
    console.error('Error al actualizar pack de tratamiento:', error);

    if (error.message === 'Pack no encontrado') {
      return res.status(404).json({
        success: false,
        error: 'Pack de tratamiento no encontrado'
      });
    }

    res.status(500).json({
      success: false,
      error: 'Error al actualizar pack de tratamiento',
      details: error.message
    });
  }
};

/**
 * DELETE /api/treatment-packs/:id
 * Elimina (soft delete) un pack de tratamiento
 */
const deleteTreatmentPack = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?.user_id;

    const deleted = await treatmentPacksModel.deleteTreatmentPack(parseInt(id), userId);

    if (!deleted) {
      return res.status(404).json({
        success: false,
        error: 'Pack de tratamiento no encontrado'
      });
    }

    res.json({
      success: true,
      message: 'Pack de tratamiento eliminado exitosamente'
    });
  } catch (error) {
    console.error('Error al eliminar pack de tratamiento:', error);
    res.status(500).json({
      success: false,
      error: 'Error al eliminar pack de tratamiento',
      details: error.message
    });
  }
};

// =============================================================================
// ITEMS DE CONDICIONES
// =============================================================================

/**
 * POST /api/treatment-packs/:id/condition-items
 * Agrega un item de condicion a un pack existente
 */
const addConditionItem = async (req, res) => {
  try {
    const { id } = req.params;
    const itemData = {
      ...req.body,
      user_id_registration: req.user?.user_id
    };

    // Validaciones
    if (!itemData.odontogram_condition_id) {
      return res.status(400).json({
        success: false,
        error: 'odontogram_condition_id es requerido'
      });
    }

    if (itemData.unit_price === undefined || itemData.unit_price < 0) {
      return res.status(400).json({
        success: false,
        error: 'unit_price es requerido y debe ser mayor o igual a 0'
      });
    }

    const newItem = await treatmentPacksModel.addConditionItem(parseInt(id), itemData);

    // Obtener el pack actualizado
    const pack = await treatmentPacksModel.getTreatmentPackById(parseInt(id));

    res.status(201).json({
      success: true,
      message: 'Item de condicion agregado exitosamente',
      data: {
        item: newItem,
        pack: pack
      }
    });
  } catch (error) {
    console.error('Error al agregar item de condicion:', error);
    res.status(500).json({
      success: false,
      error: 'Error al agregar item de condicion',
      details: error.message
    });
  }
};

/**
 * DELETE /api/treatment-packs/:packId/condition-items/:itemId
 * Elimina un item de condicion de un pack
 */
const removeConditionItem = async (req, res) => {
  try {
    const { itemId } = req.params;
    const userId = req.user?.user_id;

    const treatmentId = await treatmentPacksModel.removeConditionItem(parseInt(itemId), userId);

    if (!treatmentId) {
      return res.status(404).json({
        success: false,
        error: 'Item de condicion no encontrado'
      });
    }

    // Obtener el pack actualizado
    const pack = await treatmentPacksModel.getTreatmentPackById(treatmentId);

    res.json({
      success: true,
      message: 'Item de condicion eliminado exitosamente',
      data: pack
    });
  } catch (error) {
    console.error('Error al eliminar item de condicion:', error);
    res.status(500).json({
      success: false,
      error: 'Error al eliminar item de condicion',
      details: error.message
    });
  }
};

// =============================================================================
// ITEMS PERSONALIZADOS
// =============================================================================

/**
 * POST /api/treatment-packs/:id/custom-items
 * Agrega un item personalizado a un pack existente
 */
const addCustomItem = async (req, res) => {
  try {
    const { id } = req.params;
    const itemData = {
      ...req.body,
      user_id_registration: req.user?.user_id
    };

    // Validaciones
    if (!itemData.item_name) {
      return res.status(400).json({
        success: false,
        error: 'item_name es requerido'
      });
    }

    if (itemData.unit_price === undefined || itemData.unit_price < 0) {
      return res.status(400).json({
        success: false,
        error: 'unit_price es requerido y debe ser mayor o igual a 0'
      });
    }

    const newItem = await treatmentPacksModel.addCustomItem(parseInt(id), itemData);

    // Obtener el pack actualizado
    const pack = await treatmentPacksModel.getTreatmentPackById(parseInt(id));

    res.status(201).json({
      success: true,
      message: 'Item personalizado agregado exitosamente',
      data: {
        item: newItem,
        pack: pack
      }
    });
  } catch (error) {
    console.error('Error al agregar item personalizado:', error);
    res.status(500).json({
      success: false,
      error: 'Error al agregar item personalizado',
      details: error.message
    });
  }
};

/**
 * DELETE /api/treatment-packs/:packId/custom-items/:itemId
 * Elimina un item personalizado de un pack
 */
const removeCustomItem = async (req, res) => {
  try {
    const { itemId } = req.params;
    const userId = req.user?.user_id;

    const treatmentId = await treatmentPacksModel.removeCustomItem(parseInt(itemId), userId);

    if (!treatmentId) {
      return res.status(404).json({
        success: false,
        error: 'Item personalizado no encontrado'
      });
    }

    // Obtener el pack actualizado
    const pack = await treatmentPacksModel.getTreatmentPackById(treatmentId);

    res.json({
      success: true,
      message: 'Item personalizado eliminado exitosamente',
      data: pack
    });
  } catch (error) {
    console.error('Error al eliminar item personalizado:', error);
    res.status(500).json({
      success: false,
      error: 'Error al eliminar item personalizado',
      details: error.message
    });
  }
};

// =============================================================================
// OPERACIONES AUXILIARES
// =============================================================================

/**
 * GET /api/treatment-packs/categories
 * Obtiene las categorias de packs disponibles
 */
const getPackCategories = async (req, res) => {
  try {
    const categories = await treatmentPacksModel.getPackCategories();

    res.json({
      success: true,
      data: categories
    });
  } catch (error) {
    console.error('Error al obtener categorias de packs:', error);
    res.status(500).json({
      success: false,
      error: 'Error al obtener categorias de packs',
      details: error.message
    });
  }
};

/**
 * GET /api/treatment-packs/available-conditions
 * Obtiene condiciones del odontograma disponibles para agregar a packs
 */
const getAvailableConditions = async (req, res) => {
  try {
    const { category } = req.query;
    const conditions = await treatmentPacksModel.getAvailableConditions(category);

    res.json({
      success: true,
      data: conditions
    });
  } catch (error) {
    console.error('Error al obtener condiciones disponibles:', error);
    res.status(500).json({
      success: false,
      error: 'Error al obtener condiciones disponibles',
      details: error.message
    });
  }
};

/**
 * GET /api/treatment-packs/conditions/:conditionId/procedures
 * Obtiene procedimientos de una condicion especifica
 */
const getConditionProcedures = async (req, res) => {
  try {
    const { conditionId } = req.params;
    const procedures = await treatmentPacksModel.getConditionProcedures(parseInt(conditionId));

    res.json({
      success: true,
      data: procedures
    });
  } catch (error) {
    console.error('Error al obtener procedimientos de la condicion:', error);
    res.status(500).json({
      success: false,
      error: 'Error al obtener procedimientos de la condicion',
      details: error.message
    });
  }
};

/**
 * POST /api/treatment-packs/:id/recalculate
 * Recalcula el precio total de un pack
 */
const recalculateTotal = async (req, res) => {
  try {
    const { id } = req.params;
    const newTotal = await treatmentPacksModel.recalculatePackTotal(parseInt(id));

    res.json({
      success: true,
      message: 'Total recalculado exitosamente',
      data: {
        treatment_id: parseInt(id),
        total_price: newTotal
      }
    });
  } catch (error) {
    console.error('Error al recalcular total del pack:', error);
    res.status(500).json({
      success: false,
      error: 'Error al recalcular total del pack',
      details: error.message
    });
  }
};

/**
 * POST /api/treatment-packs/:id/duplicate
 * Duplica un pack de tratamiento
 */
const duplicatePack = async (req, res) => {
  try {
    const { id } = req.params;
    const { new_name } = req.body;
    const userId = req.user?.user_id;

    const duplicatedPack = await treatmentPacksModel.duplicateTreatmentPack(
      parseInt(id),
      userId,
      new_name
    );

    res.status(201).json({
      success: true,
      message: 'Pack duplicado exitosamente',
      data: duplicatedPack
    });
  } catch (error) {
    console.error('Error al duplicar pack:', error);

    if (error.message === 'Pack original no encontrado') {
      return res.status(404).json({
        success: false,
        error: 'Pack original no encontrado'
      });
    }

    res.status(500).json({
      success: false,
      error: 'Error al duplicar pack',
      details: error.message
    });
  }
};

module.exports = {
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
};
