const {
  getPaymentMethodsByBranch,
  getActivePaymentMethodsByBranch,
  getAllActivePaymentMethods,
  getPaymentMethodById,
  createPaymentMethod,
  updatePaymentMethod,
  deletePaymentMethod
} = require('../models/branchPaymentMethodsModel');

/**
 * Obtener métodos de pago de una sede
 */
const getPaymentMethods = async (req, res) => {
  try {
    const { branch_id } = req.query;

    if (!branch_id) {
      return res.status(400).json({
        success: false,
        error: 'Se requiere el ID de la sede'
      });
    }

    const methods = await getPaymentMethodsByBranch(parseInt(branch_id));

    res.json({
      success: true,
      data: methods
    });
  } catch (error) {
    console.error('Error al obtener métodos de pago:', error);
    res.status(500).json({
      success: false,
      error: 'Error al obtener métodos de pago'
    });
  }
};

/**
 * Obtener métodos de pago activos (para pacientes)
 */
const getActivePaymentMethods = async (req, res) => {
  try {
    const { branch_id } = req.query;

    let methods;
    if (branch_id) {
      methods = await getActivePaymentMethodsByBranch(parseInt(branch_id));
    } else {
      methods = await getAllActivePaymentMethods();
    }

    res.json({
      success: true,
      data: methods
    });
  } catch (error) {
    console.error('Error al obtener métodos de pago activos:', error);
    res.status(500).json({
      success: false,
      error: 'Error al obtener métodos de pago'
    });
  }
};

/**
 * Obtener un método de pago por ID
 */
const getPaymentMethod = async (req, res) => {
  try {
    const { id } = req.params;
    const method = await getPaymentMethodById(parseInt(id));

    if (!method) {
      return res.status(404).json({
        success: false,
        error: 'Método de pago no encontrado'
      });
    }

    res.json({
      success: true,
      data: method
    });
  } catch (error) {
    console.error('Error al obtener método de pago:', error);
    res.status(500).json({
      success: false,
      error: 'Error al obtener método de pago'
    });
  }
};

/**
 * Crear un nuevo método de pago
 */
const createNewPaymentMethod = async (req, res) => {
  try {
    const data = {
      ...req.body,
      user_id_registration: req.user.user_id
    };

    if (!data.branch_id || !data.method_type || !data.method_name) {
      return res.status(400).json({
        success: false,
        error: 'Faltan campos requeridos: branch_id, method_type, method_name'
      });
    }

    const newMethod = await createPaymentMethod(data);

    res.status(201).json({
      success: true,
      message: 'Método de pago creado exitosamente',
      data: newMethod
    });
  } catch (error) {
    console.error('Error al crear método de pago:', error);
    res.status(500).json({
      success: false,
      error: 'Error al crear método de pago'
    });
  }
};

/**
 * Actualizar un método de pago
 */
const updateExistingPaymentMethod = async (req, res) => {
  try {
    const { id } = req.params;
    const data = {
      ...req.body,
      user_id_modification: req.user.user_id
    };

    const updatedMethod = await updatePaymentMethod(parseInt(id), data);

    if (!updatedMethod) {
      return res.status(404).json({
        success: false,
        error: 'Método de pago no encontrado'
      });
    }

    res.json({
      success: true,
      message: 'Método de pago actualizado exitosamente',
      data: updatedMethod
    });
  } catch (error) {
    console.error('Error al actualizar método de pago:', error);
    res.status(500).json({
      success: false,
      error: 'Error al actualizar método de pago'
    });
  }
};

/**
 * Eliminar un método de pago
 */
const deleteExistingPaymentMethod = async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await deletePaymentMethod(parseInt(id), req.user.user_id);

    if (!deleted) {
      return res.status(404).json({
        success: false,
        error: 'Método de pago no encontrado'
      });
    }

    res.json({
      success: true,
      message: 'Método de pago eliminado exitosamente'
    });
  } catch (error) {
    console.error('Error al eliminar método de pago:', error);
    res.status(500).json({
      success: false,
      error: 'Error al eliminar método de pago'
    });
  }
};

module.exports = {
  getPaymentMethods,
  getActivePaymentMethods,
  getPaymentMethod,
  createNewPaymentMethod,
  updateExistingPaymentMethod,
  deleteExistingPaymentMethod
};
