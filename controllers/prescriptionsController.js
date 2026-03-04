const {
  getAllPrescriptions,
  getPrescriptionById,
  getPrescriptionWithItems,
  getPrescriptionByConsultationId,
  createPrescription,
  createPrescriptionWithItems,
  updatePrescription,
  deletePrescription,
  countPrescriptions,
  getPrescriptionItems,
  getAllMedications,
  getMedicationById,
  createMedication,
  updateMedication,
  deleteMedication,
  countMedications
} = require('../models/prescriptionsModel');

// Prescriptions
const getPrescriptions = async (req, res) => {
  try {
    const {
      patient_id,
      dentist_id,
      branch_id,
      appointment_id,
      date_from,
      date_to,
      page = 1,
      limit = 20
    } = req.query;

    const filters = {
      patient_id: patient_id ? parseInt(patient_id) : null,
      dentist_id: dentist_id ? parseInt(dentist_id) : null,
      branch_id: branch_id ? parseInt(branch_id) : null,
      appointment_id: appointment_id ? parseInt(appointment_id) : null,
      date_from,
      date_to,
      limit: parseInt(limit),
      offset: (parseInt(page) - 1) * parseInt(limit)
    };

    const [prescriptions, total] = await Promise.all([
      getAllPrescriptions(filters),
      countPrescriptions(filters)
    ]);

    res.json({
      success: true,
      data: prescriptions,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Error al obtener recetas:', error);
    res.status(500).json({
      success: false,
      error: 'Error al obtener recetas'
    });
  }
};

const getPrescription = async (req, res) => {
  try {
    const { id } = req.params;
    const prescription = await getPrescriptionById(parseInt(id));

    if (!prescription) {
      return res.status(404).json({
        success: false,
        error: 'Receta no encontrada'
      });
    }

    res.json({
      success: true,
      data: prescription
    });
  } catch (error) {
    console.error('Error al obtener receta:', error);
    res.status(500).json({
      success: false,
      error: 'Error al obtener receta'
    });
  }
};

/**
 * Crea una nueva receta medica con items (medicamentos)
 */
const createNewPrescription = async (req, res) => {
  try {
    const { items, ...prescriptionHeader } = req.body;

    const prescriptionData = {
      ...prescriptionHeader,
      user_id_registration: req.user.user_id
    };

    // Validaciones
    if (!prescriptionData.patient_id || !prescriptionData.dentist_id ||
        !prescriptionData.branch_id || !prescriptionData.prescription_date) {
      return res.status(400).json({
        success: false,
        error: 'Faltan campos requeridos: patient_id, dentist_id, branch_id, prescription_date'
      });
    }

    // Validar items si se envian
    if (items && items.length > 0) {
      for (const item of items) {
        if (!item.medication_name || !item.quantity || !item.instructions) {
          return res.status(400).json({
            success: false,
            error: 'Cada item debe tener: medication_name, quantity, instructions'
          });
        }
      }
    }

    // Crear prescripcion con items usando transaccion
    const newPrescription = await createPrescriptionWithItems(prescriptionData, items || []);

    res.status(201).json({
      success: true,
      message: 'Receta creada exitosamente',
      data: newPrescription
    });
  } catch (error) {
    console.error('Error al crear receta:', error);
    res.status(500).json({
      success: false,
      error: 'Error al crear receta'
    });
  }
};

/**
 * Obtiene una receta por consultation_id
 */
const getPrescriptionByConsultation = async (req, res) => {
  try {
    const { consultationId } = req.params;

    if (!consultationId) {
      return res.status(400).json({
        success: false,
        error: 'consultation_id es requerido'
      });
    }

    const prescription = await getPrescriptionByConsultationId(parseInt(consultationId));

    if (!prescription) {
      return res.status(404).json({
        success: false,
        error: 'No se encontro receta para esta consulta'
      });
    }

    res.json({
      success: true,
      data: prescription
    });
  } catch (error) {
    console.error('Error al obtener receta por consulta:', error);
    res.status(500).json({
      success: false,
      error: 'Error al obtener receta'
    });
  }
};

/**
 * Obtiene una receta completa con items por ID
 */
const getPrescriptionComplete = async (req, res) => {
  try {
    const { id } = req.params;
    const prescription = await getPrescriptionWithItems(parseInt(id));

    if (!prescription) {
      return res.status(404).json({
        success: false,
        error: 'Receta no encontrada'
      });
    }

    res.json({
      success: true,
      data: prescription
    });
  } catch (error) {
    console.error('Error al obtener receta completa:', error);
    res.status(500).json({
      success: false,
      error: 'Error al obtener receta'
    });
  }
};

const updateExistingPrescription = async (req, res) => {
  try {
    const { id } = req.params;
    const prescriptionData = {
      ...req.body,
      user_id_modification: req.user.user_id
    };

    const updatedPrescription = await updatePrescription(parseInt(id), prescriptionData);

    if (!updatedPrescription) {
      return res.status(404).json({
        success: false,
        error: 'Receta no encontrada'
      });
    }

    res.json({
      success: true,
      message: 'Receta actualizada exitosamente',
      data: updatedPrescription
    });
  } catch (error) {
    console.error('Error al actualizar receta:', error);
    res.status(500).json({
      success: false,
      error: 'Error al actualizar receta'
    });
  }
};

const deleteExistingPrescription = async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await deletePrescription(parseInt(id), req.user.user_id);

    if (!deleted) {
      return res.status(404).json({
        success: false,
        error: 'Receta no encontrada'
      });
    }

    res.json({
      success: true,
      message: 'Receta eliminada exitosamente'
    });
  } catch (error) {
    console.error('Error al eliminar receta:', error);
    res.status(500).json({
      success: false,
      error: 'Error al eliminar receta'
    });
  }
};

// Medications
const getMedications = async (req, res) => {
  try {
    const { medication_type, search, page = 1, limit = 50 } = req.query;

    const filters = {
      medication_type,
      search,
      limit: parseInt(limit),
      offset: (parseInt(page) - 1) * parseInt(limit)
    };

    const [medications, total] = await Promise.all([
      getAllMedications(filters),
      countMedications(filters)
    ]);

    res.json({
      success: true,
      data: medications,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Error al obtener medicamentos:', error);
    res.status(500).json({
      success: false,
      error: 'Error al obtener medicamentos'
    });
  }
};

const getMedication = async (req, res) => {
  try {
    const { id } = req.params;
    const medication = await getMedicationById(parseInt(id));

    if (!medication) {
      return res.status(404).json({
        success: false,
        error: 'Medicamento no encontrado'
      });
    }

    res.json({
      success: true,
      data: medication
    });
  } catch (error) {
    console.error('Error al obtener medicamento:', error);
    res.status(500).json({
      success: false,
      error: 'Error al obtener medicamento'
    });
  }
};

const createNewMedication = async (req, res) => {
  try {
    const medicationData = req.body;

    if (!medicationData.medication_name) {
      return res.status(400).json({
        success: false,
        error: 'El nombre del medicamento es requerido'
      });
    }

    const newMedication = await createMedication(medicationData, req.user.user_id);

    res.status(201).json({
      success: true,
      message: 'Medicamento creado exitosamente',
      data: newMedication
    });
  } catch (error) {
    console.error('Error al crear medicamento:', error);
    res.status(500).json({
      success: false,
      error: 'Error al crear medicamento'
    });
  }
};

const updateExistingMedication = async (req, res) => {
  try {
    const { id } = req.params;
    const medicationData = req.body;

    const updatedMedication = await updateMedication(parseInt(id), medicationData, req.user.user_id);

    if (!updatedMedication) {
      return res.status(404).json({
        success: false,
        error: 'Medicamento no encontrado'
      });
    }

    res.json({
      success: true,
      message: 'Medicamento actualizado exitosamente',
      data: updatedMedication
    });
  } catch (error) {
    console.error('Error al actualizar medicamento:', error);
    res.status(500).json({
      success: false,
      error: 'Error al actualizar medicamento'
    });
  }
};

const deleteExistingMedication = async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await deleteMedication(parseInt(id), req.user.user_id);

    if (!deleted) {
      return res.status(404).json({
        success: false,
        error: 'Medicamento no encontrado'
      });
    }

    res.json({
      success: true,
      message: 'Medicamento eliminado exitosamente'
    });
  } catch (error) {
    console.error('Error al eliminar medicamento:', error);
    res.status(500).json({
      success: false,
      error: 'Error al eliminar medicamento'
    });
  }
};

module.exports = {
  // Prescriptions
  getPrescriptions,
  getPrescription,
  getPrescriptionComplete,
  getPrescriptionByConsultation,
  createNewPrescription,
  updateExistingPrescription,
  deleteExistingPrescription,
  // Medications (catalogo)
  getMedications,
  getMedication,
  createNewMedication,
  updateExistingMedication,
  deleteExistingMedication
};
