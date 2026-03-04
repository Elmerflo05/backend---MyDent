const {
  getAllDentalProcedures,
  getDentalProcedureById,
  createDentalProcedure,
  updateDentalProcedure,
  deleteDentalProcedure
} = require('../models/dentalProceduresModel');

const getDentalProcedures = async (req, res) => {
  try {
    const { procedure_category, search } = req.query;
    const filters = {
      procedure_category: procedure_category || null,
      search: search || null
    };

    const procedures = await getAllDentalProcedures(filters);

    res.json({
      success: true,
      data: procedures
    });
  } catch (error) {
    console.error('Error al obtener procedimientos dentales:', error);
    res.status(500).json({
      success: false,
      error: 'Error al obtener procedimientos dentales'
    });
  }
};

const getDentalProcedure = async (req, res) => {
  try {
    const { id } = req.params;
    const procedure = await getDentalProcedureById(parseInt(id));

    if (!procedure) {
      return res.status(404).json({
        success: false,
        error: 'Procedimiento dental no encontrado'
      });
    }

    res.json({
      success: true,
      data: procedure
    });
  } catch (error) {
    console.error('Error al obtener procedimiento dental:', error);
    res.status(500).json({
      success: false,
      error: 'Error al obtener procedimiento dental'
    });
  }
};

const createNewDentalProcedure = async (req, res) => {
  try {
    const procedureData = {
      ...req.body,
      user_id_registration: req.user.user_id
    };

    if (!procedureData.procedure_name) {
      return res.status(400).json({
        success: false,
        error: 'El nombre del procedimiento es requerido'
      });
    }

    const newProcedure = await createDentalProcedure(procedureData);

    res.status(201).json({
      success: true,
      message: 'Procedimiento dental creado exitosamente',
      data: newProcedure
    });
  } catch (error) {
    console.error('Error al crear procedimiento dental:', error);
    res.status(500).json({
      success: false,
      error: 'Error al crear procedimiento dental'
    });
  }
};

const updateExistingDentalProcedure = async (req, res) => {
  try {
    const { id } = req.params;
    const procedureData = {
      ...req.body,
      user_id_modification: req.user.user_id
    };

    const updatedProcedure = await updateDentalProcedure(parseInt(id), procedureData);

    if (!updatedProcedure) {
      return res.status(404).json({
        success: false,
        error: 'Procedimiento dental no encontrado'
      });
    }

    res.json({
      success: true,
      message: 'Procedimiento dental actualizado exitosamente',
      data: updatedProcedure
    });
  } catch (error) {
    console.error('Error al actualizar procedimiento dental:', error);
    res.status(500).json({
      success: false,
      error: 'Error al actualizar procedimiento dental'
    });
  }
};

const deleteExistingDentalProcedure = async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await deleteDentalProcedure(parseInt(id), req.user.user_id);

    if (!deleted) {
      return res.status(404).json({
        success: false,
        error: 'Procedimiento dental no encontrado'
      });
    }

    res.json({
      success: true,
      message: 'Procedimiento dental eliminado exitosamente'
    });
  } catch (error) {
    console.error('Error al eliminar procedimiento dental:', error);
    res.status(500).json({
      success: false,
      error: 'Error al eliminar procedimiento dental'
    });
  }
};

module.exports = {
  getDentalProcedures,
  getDentalProcedure,
  createNewDentalProcedure,
  updateExistingDentalProcedure,
  deleteExistingDentalProcedure
};
