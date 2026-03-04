const {
  getAllInventoryItems,
  getInventoryItemById,
  createInventoryItem,
  updateInventoryItem,
  adjustInventoryQuantity,
  deleteInventoryItem,
  countInventoryItems,
  getAllInventoryCategories,
  getInventoryCategoryById,
  createInventoryCategory,
  updateInventoryCategory,
  deleteInventoryCategory
} = require('../models/inventoryModel');

// Inventory Items
const getInventoryItems = async (req, res) => {
  try {
    const {
      branch_id,
      inventory_category_id,
      search,
      low_stock,
      expiring_soon,
      page = 1,
      limit = 20
    } = req.query;

    const filters = {
      branch_id: branch_id ? parseInt(branch_id) : null,
      inventory_category_id: inventory_category_id ? parseInt(inventory_category_id) : null,
      search,
      low_stock: low_stock === 'true',
      expiring_soon: expiring_soon ? parseInt(expiring_soon) : null,
      limit: parseInt(limit),
      offset: (parseInt(page) - 1) * parseInt(limit)
    };

    const [items, total] = await Promise.all([
      getAllInventoryItems(filters),
      countInventoryItems(filters)
    ]);

    res.json({
      success: true,
      data: items,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Error al obtener items de inventario:', error);
    res.status(500).json({
      success: false,
      error: 'Error al obtener items de inventario'
    });
  }
};

const getInventoryItem = async (req, res) => {
  try {
    const { id } = req.params;
    const item = await getInventoryItemById(parseInt(id));

    if (!item) {
      return res.status(404).json({
        success: false,
        error: 'Item de inventario no encontrado'
      });
    }

    res.json({
      success: true,
      data: item
    });
  } catch (error) {
    console.error('Error al obtener item de inventario:', error);
    res.status(500).json({
      success: false,
      error: 'Error al obtener item de inventario'
    });
  }
};

const createNewInventoryItem = async (req, res) => {
  try {
    const itemData = {
      ...req.body,
      user_id_registration: req.user.user_id
    };

    // Validación mejorada de campos requeridos
    if (!itemData.branch_id || !itemData.item_code || !itemData.item_name) {
      return res.status(400).json({
        success: false,
        error: 'Faltan campos requeridos: branch_id, item_code, item_name son obligatorios'
      });
    }

    // Validar que current_quantity sea un número válido
    if (itemData.current_quantity !== undefined && (isNaN(itemData.current_quantity) || itemData.current_quantity < 0)) {
      return res.status(400).json({
        success: false,
        error: 'La cantidad actual debe ser un número mayor o igual a 0'
      });
    }

    const newItem = await createInventoryItem(itemData);

    res.status(201).json({
      success: true,
      message: 'Item de inventario creado exitosamente',
      data: newItem
    });
  } catch (error) {
    console.error('Error al crear item de inventario:', error);

    // Manejo específico de errores de base de datos
    if (error.code === '23505') { // Unique violation
      return res.status(409).json({
        success: false,
        error: 'El código del item ya existe. Por favor use un código único.'
      });
    }

    if (error.code === '23503') { // Foreign key violation
      return res.status(400).json({
        success: false,
        error: 'La sede o categoría especificada no existe'
      });
    }

    res.status(500).json({
      success: false,
      error: 'Error al crear item de inventario'
    });
  }
};

const updateExistingInventoryItem = async (req, res) => {
  try {
    const { id } = req.params;
    const itemData = {
      ...req.body,
      user_id_modification: req.user.user_id
    };

    const updatedItem = await updateInventoryItem(parseInt(id), itemData);

    if (!updatedItem) {
      return res.status(404).json({
        success: false,
        error: 'Item de inventario no encontrado'
      });
    }

    res.json({
      success: true,
      message: 'Item de inventario actualizado exitosamente',
      data: updatedItem
    });
  } catch (error) {
    console.error('Error al actualizar item de inventario:', error);
    res.status(500).json({
      success: false,
      error: 'Error al actualizar item de inventario'
    });
  }
};

const adjustItemQuantity = async (req, res) => {
  try {
    const { id } = req.params;
    const { quantity_change } = req.body;

    if (quantity_change === undefined || quantity_change === 0) {
      return res.status(400).json({
        success: false,
        error: 'El cambio de cantidad es requerido y debe ser diferente de cero'
      });
    }

    const updatedItem = await adjustInventoryQuantity(parseInt(id), quantity_change, req.user.user_id);

    if (!updatedItem) {
      return res.status(404).json({
        success: false,
        error: 'Item de inventario no encontrado'
      });
    }

    res.json({
      success: true,
      message: `Cantidad ${quantity_change > 0 ? 'agregada' : 'reducida'} exitosamente`,
      data: updatedItem
    });
  } catch (error) {
    console.error('Error al ajustar cantidad de inventario:', error);
    res.status(500).json({
      success: false,
      error: 'Error al ajustar cantidad de inventario'
    });
  }
};

const deleteExistingInventoryItem = async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await deleteInventoryItem(parseInt(id), req.user.user_id);

    if (!deleted) {
      return res.status(404).json({
        success: false,
        error: 'Item de inventario no encontrado'
      });
    }

    res.json({
      success: true,
      message: 'Item de inventario eliminado exitosamente'
    });
  } catch (error) {
    console.error('Error al eliminar item de inventario:', error);
    res.status(500).json({
      success: false,
      error: 'Error al eliminar item de inventario'
    });
  }
};

// Inventory Categories
const getInventoryCategories = async (req, res) => {
  try {
    const categories = await getAllInventoryCategories();

    res.json({
      success: true,
      data: categories
    });
  } catch (error) {
    console.error('Error al obtener categorías de inventario:', error);
    res.status(500).json({
      success: false,
      error: 'Error al obtener categorías de inventario'
    });
  }
};

const getInventoryCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const category = await getInventoryCategoryById(parseInt(id));

    if (!category) {
      return res.status(404).json({
        success: false,
        error: 'Categoría de inventario no encontrada'
      });
    }

    res.json({
      success: true,
      data: category
    });
  } catch (error) {
    console.error('Error al obtener categoría de inventario:', error);
    res.status(500).json({
      success: false,
      error: 'Error al obtener categoría de inventario'
    });
  }
};

const createNewInventoryCategory = async (req, res) => {
  try {
    const categoryData = req.body;

    if (!categoryData.category_name) {
      return res.status(400).json({
        success: false,
        error: 'El nombre de la categoría es requerido'
      });
    }

    const newCategory = await createInventoryCategory(categoryData, req.user.user_id);

    res.status(201).json({
      success: true,
      message: 'Categoría de inventario creada exitosamente',
      data: newCategory
    });
  } catch (error) {
    console.error('Error al crear categoría de inventario:', error);
    res.status(500).json({
      success: false,
      error: 'Error al crear categoría de inventario'
    });
  }
};

const updateExistingInventoryCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const categoryData = req.body;

    const updatedCategory = await updateInventoryCategory(parseInt(id), categoryData, req.user.user_id);

    if (!updatedCategory) {
      return res.status(404).json({
        success: false,
        error: 'Categoría de inventario no encontrada'
      });
    }

    res.json({
      success: true,
      message: 'Categoría de inventario actualizada exitosamente',
      data: updatedCategory
    });
  } catch (error) {
    console.error('Error al actualizar categoría de inventario:', error);
    res.status(500).json({
      success: false,
      error: 'Error al actualizar categoría de inventario'
    });
  }
};

const deleteExistingInventoryCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await deleteInventoryCategory(parseInt(id), req.user.user_id);

    if (!deleted) {
      return res.status(404).json({
        success: false,
        error: 'Categoría de inventario no encontrada'
      });
    }

    res.json({
      success: true,
      message: 'Categoría de inventario eliminada exitosamente'
    });
  } catch (error) {
    console.error('Error al eliminar categoría de inventario:', error);
    res.status(500).json({
      success: false,
      error: 'Error al eliminar categoría de inventario'
    });
  }
};

module.exports = {
  getInventoryItems,
  getInventoryItem,
  createNewInventoryItem,
  updateExistingInventoryItem,
  adjustItemQuantity,
  deleteExistingInventoryItem,
  getInventoryCategories,
  getInventoryCategory,
  createNewInventoryCategory,
  updateExistingInventoryCategory,
  deleteExistingInventoryCategory
};
