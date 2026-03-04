const {
  getAllTreatments,
  getTreatmentById,
  createTreatment,
  updateTreatment,
  deleteTreatment,
  countTreatments
} = require('../models/treatmentsModel');

const getTreatments = async (req, res) => {
  try {
    const { patient_id, dentist_id, branch_id, treatment_status_id, page = 1, limit = 20 } = req.query;

    const filters = {
      patient_id: patient_id ? parseInt(patient_id) : null,
      dentist_id: dentist_id ? parseInt(dentist_id) : null,
      branch_id: branch_id ? parseInt(branch_id) : null,
      treatment_status_id: treatment_status_id ? parseInt(treatment_status_id) : null,
      limit: parseInt(limit),
      offset: (parseInt(page) - 1) * parseInt(limit)
    };

    const [treatments, total] = await Promise.all([
      getAllTreatments(filters),
      countTreatments(filters)
    ]);

    res.json({
      success: true,
      data: treatments,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Error al obtener tratamientos:', error);
    res.status(500).json({
      success: false,
      error: 'Error al obtener tratamientos'
    });
  }
};

const getTreatment = async (req, res) => {
  try {
    const { id } = req.params;
    const treatment = await getTreatmentById(parseInt(id));

    if (!treatment) {
      return res.status(404).json({
        success: false,
        error: 'Tratamiento no encontrado'
      });
    }

    res.json({
      success: true,
      data: treatment
    });
  } catch (error) {
    console.error('Error al obtener tratamiento:', error);
    res.status(500).json({
      success: false,
      error: 'Error al obtener tratamiento'
    });
  }
};

const createNewTreatment = async (req, res) => {
  try {
    const treatmentData = {
      ...req.body,
      user_id_registration: req.user.user_id
    };

    if (!treatmentData.patient_id || !treatmentData.dentist_id ||
        !treatmentData.branch_id || !treatmentData.dental_procedure_id ||
        !treatmentData.treatment_status_id || !treatmentData.treatment_date ||
        !treatmentData.cost || !treatmentData.final_cost) {
      return res.status(400).json({
        success: false,
        error: 'Faltan campos requeridos'
      });
    }

    const newTreatment = await createTreatment(treatmentData);

    res.status(201).json({
      success: true,
      message: 'Tratamiento creado exitosamente',
      data: newTreatment
    });
  } catch (error) {
    console.error('Error al crear tratamiento:', error);
    res.status(500).json({
      success: false,
      error: 'Error al crear tratamiento'
    });
  }
};

const updateExistingTreatment = async (req, res) => {
  try {
    const { id } = req.params;
    const treatmentData = {
      ...req.body,
      user_id_modification: req.user.user_id
    };

    const updatedTreatment = await updateTreatment(parseInt(id), treatmentData);

    if (!updatedTreatment) {
      return res.status(404).json({
        success: false,
        error: 'Tratamiento no encontrado'
      });
    }

    res.json({
      success: true,
      message: 'Tratamiento actualizado exitosamente',
      data: updatedTreatment
    });
  } catch (error) {
    console.error('Error al actualizar tratamiento:', error);
    res.status(500).json({
      success: false,
      error: 'Error al actualizar tratamiento'
    });
  }
};

const deleteExistingTreatment = async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await deleteTreatment(parseInt(id), req.user.user_id);

    if (!deleted) {
      return res.status(404).json({
        success: false,
        error: 'Tratamiento no encontrado'
      });
    }

    res.json({
      success: true,
      message: 'Tratamiento eliminado exitosamente'
    });
  } catch (error) {
    console.error('Error al eliminar tratamiento:', error);
    res.status(500).json({
      success: false,
      error: 'Error al eliminar tratamiento'
    });
  }
};

module.exports = {
  getTreatments,
  getTreatment,
  createNewTreatment,
  updateExistingTreatment,
  deleteExistingTreatment
};
