const {
  getAllOdontograms,
  getOdontogramById,
  createOdontogram,
  updateOdontogram,
  deleteOdontogram,
  countOdontograms,
  addCondition,
  deleteCondition,
  addTreatment,
  deleteTreatment,
  // Nuevas funciones para integración relacional
  getCurrentOdontogramByPatient,
  saveConditionsBatch,
  getConditionsByOdontogram,
  upsertOdontogramWithConditions,
  getAllToothPositions,
  getAllToothSurfaces,
  // Funciones para vista de paciente con tabs
  getPatientOdontogramsWithHistory,
  getOdontogramWithConditionsById
} = require('../models/odontogramsModel');

const getOdontograms = async (req, res) => {
  try {
    const { patient_id, dentist_id, is_current_version, page = 1, limit = 20 } = req.query;

    const filters = {
      patient_id: patient_id ? parseInt(patient_id) : null,
      dentist_id: dentist_id ? parseInt(dentist_id) : null,
      is_current_version: is_current_version !== undefined ? is_current_version === 'true' : undefined,
      limit: parseInt(limit),
      offset: (parseInt(page) - 1) * parseInt(limit)
    };

    const [odontograms, total] = await Promise.all([
      getAllOdontograms(filters),
      countOdontograms(filters)
    ]);

    res.json({
      success: true,
      data: odontograms,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Error al obtener odontogramas:', error);
    res.status(500).json({
      success: false,
      error: 'Error al obtener odontogramas'
    });
  }
};

const getOdontogram = async (req, res) => {
  try {
    const { id } = req.params;
    const odontogram = await getOdontogramById(parseInt(id));

    if (!odontogram) {
      return res.status(404).json({
        success: false,
        error: 'Odontograma no encontrado'
      });
    }

    res.json({
      success: true,
      data: odontogram
    });
  } catch (error) {
    console.error('Error al obtener odontograma:', error);
    res.status(500).json({
      success: false,
      error: 'Error al obtener odontograma'
    });
  }
};

const createNewOdontogram = async (req, res) => {
  try {
    const odontogramData = {
      ...req.body,
      user_id_registration: req.user.user_id
    };

    if (!odontogramData.patient_id || !odontogramData.dentist_id ||
        !odontogramData.branch_id || !odontogramData.odontogram_date) {
      return res.status(400).json({
        success: false,
        error: 'Faltan campos requeridos'
      });
    }

    const newOdontogram = await createOdontogram(odontogramData);

    res.status(201).json({
      success: true,
      message: 'Odontograma creado exitosamente',
      data: newOdontogram
    });
  } catch (error) {
    console.error('Error al crear odontograma:', error);
    res.status(500).json({
      success: false,
      error: 'Error al crear odontograma'
    });
  }
};

const updateExistingOdontogram = async (req, res) => {
  try {
    const { id } = req.params;
    const odontogramData = {
      ...req.body,
      user_id_modification: req.user.user_id
    };

    const updatedOdontogram = await updateOdontogram(parseInt(id), odontogramData);

    if (!updatedOdontogram) {
      return res.status(404).json({
        success: false,
        error: 'Odontograma no encontrado'
      });
    }

    res.json({
      success: true,
      message: 'Odontograma actualizado exitosamente',
      data: updatedOdontogram
    });
  } catch (error) {
    console.error('Error al actualizar odontograma:', error);
    res.status(500).json({
      success: false,
      error: 'Error al actualizar odontograma'
    });
  }
};

const deleteExistingOdontogram = async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await deleteOdontogram(parseInt(id), req.user.user_id);

    if (!deleted) {
      return res.status(404).json({
        success: false,
        error: 'Odontograma no encontrado'
      });
    }

    res.json({
      success: true,
      message: 'Odontograma eliminado exitosamente'
    });
  } catch (error) {
    console.error('Error al eliminar odontograma:', error);
    res.status(500).json({
      success: false,
      error: 'Error al eliminar odontograma'
    });
  }
};

// Condiciones
const addOdontogramCondition = async (req, res) => {
  try {
    const { id } = req.params;
    const conditionData = {
      ...req.body,
      odontogram_id: parseInt(id)
    };

    // Validar campos requeridos (dental_condition_id es opcional pero recomendado)
    if (!conditionData.tooth_position_id) {
      return res.status(400).json({
        success: false,
        error: 'Falta el campo requerido: tooth_position_id'
      });
    }

    const newCondition = await addCondition(conditionData, req.user.user_id);

    res.status(201).json({
      success: true,
      message: 'Condición agregada exitosamente',
      data: newCondition
    });
  } catch (error) {
    console.error('Error al agregar condición:', error);
    res.status(500).json({
      success: false,
      error: 'Error al agregar condición'
    });
  }
};

const removeOdontogramCondition = async (req, res) => {
  try {
    const { conditionId } = req.params;
    const deleted = await deleteCondition(parseInt(conditionId), req.user.user_id);

    if (!deleted) {
      return res.status(404).json({
        success: false,
        error: 'Condición no encontrada'
      });
    }

    res.json({
      success: true,
      message: 'Condición eliminada exitosamente'
    });
  } catch (error) {
    console.error('Error al eliminar condición:', error);
    res.status(500).json({
      success: false,
      error: 'Error al eliminar condición'
    });
  }
};

// Tratamientos
const addOdontogramTreatment = async (req, res) => {
  try {
    const { id } = req.params;
    const treatmentData = {
      ...req.body,
      odontogram_id: parseInt(id)
    };

    if (!treatmentData.tooth_position_id || !treatmentData.dental_procedure_id ||
        !treatmentData.treatment_status_id) {
      return res.status(400).json({
        success: false,
        error: 'Faltan campos requeridos'
      });
    }

    const newTreatment = await addTreatment(treatmentData, req.user.user_id);

    res.status(201).json({
      success: true,
      message: 'Tratamiento agregado exitosamente',
      data: newTreatment
    });
  } catch (error) {
    console.error('Error al agregar tratamiento:', error);
    res.status(500).json({
      success: false,
      error: 'Error al agregar tratamiento'
    });
  }
};

const removeOdontogramTreatment = async (req, res) => {
  try {
    const { treatmentId } = req.params;
    const deleted = await deleteTreatment(parseInt(treatmentId), req.user.user_id);

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

// ============================================================
// NUEVOS ENDPOINTS PARA INTEGRACIÓN RELACIONAL DEL ODONTOGRAMA
// ============================================================

/**
 * GET /odontograms/patient/:patientId/current
 * Obtener el odontograma actual de un paciente con todas sus condiciones
 */
const getCurrentPatientOdontogram = async (req, res) => {
  try {
    const { patientId } = req.params;

    if (!patientId) {
      return res.status(400).json({
        success: false,
        error: 'Se requiere el ID del paciente'
      });
    }

    const odontogram = await getCurrentOdontogramByPatient(parseInt(patientId));

    res.json({
      success: true,
      data: odontogram // Puede ser null si no existe
    });
  } catch (error) {
    console.error('Error al obtener odontograma actual del paciente:', error);
    res.status(500).json({
      success: false,
      error: 'Error al obtener odontograma actual del paciente'
    });
  }
};

/**
 * POST /odontograms/:id/conditions/batch
 * Guardar múltiples condiciones en batch (reemplaza las existentes)
 */
const saveOdontogramConditionsBatch = async (req, res) => {
  try {
    const { id } = req.params;
    const { conditions } = req.body;

    if (!id) {
      return res.status(400).json({
        success: false,
        error: 'Se requiere el ID del odontograma'
      });
    }

    if (!conditions || !Array.isArray(conditions)) {
      return res.status(400).json({
        success: false,
        error: 'Se requiere un array de condiciones'
      });
    }

    const result = await saveConditionsBatch(
      parseInt(id),
      conditions,
      req.user.user_id
    );

    res.json({
      success: true,
      message: `${result.count} condiciones guardadas exitosamente`,
      data: result
    });
  } catch (error) {
    console.error('Error al guardar condiciones en batch:', error);
    res.status(500).json({
      success: false,
      error: 'Error al guardar condiciones'
    });
  }
};

/**
 * GET /odontograms/:id/conditions
 * Obtener todas las condiciones de un odontograma
 */
const getOdontogramConditions = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({
        success: false,
        error: 'Se requiere el ID del odontograma'
      });
    }

    const conditions = await getConditionsByOdontogram(parseInt(id));

    res.json({
      success: true,
      data: conditions
    });
  } catch (error) {
    console.error('Error al obtener condiciones:', error);
    res.status(500).json({
      success: false,
      error: 'Error al obtener condiciones'
    });
  }
};

/**
 * POST /odontograms/patient/:patientId/upsert
 * Crear o actualizar el odontograma de un paciente con sus condiciones
 */
const upsertPatientOdontogram = async (req, res) => {
  try {
    const { patientId } = req.params;
    const data = {
      ...req.body,
      patient_id: parseInt(patientId)
    };

    if (!data.dentist_id || !data.branch_id) {
      return res.status(400).json({
        success: false,
        error: 'Se requiere dentist_id y branch_id'
      });
    }

    const odontogram = await upsertOdontogramWithConditions(data, req.user.user_id);

    res.json({
      success: true,
      message: 'Odontograma guardado exitosamente',
      data: odontogram
    });
  } catch (error) {
    console.error('Error al guardar odontograma:', error);
    res.status(500).json({
      success: false,
      error: 'Error al guardar odontograma'
    });
  }
};

/**
 * GET /odontograms/catalogs/tooth-positions
 * Obtener todos los tooth_positions
 */
const getToothPositionsCatalog = async (req, res) => {
  try {
    const positions = await getAllToothPositions();
    res.json({
      success: true,
      data: positions
    });
  } catch (error) {
    console.error('Error al obtener posiciones de dientes:', error);
    res.status(500).json({
      success: false,
      error: 'Error al obtener posiciones de dientes'
    });
  }
};

/**
 * GET /odontograms/catalogs/tooth-surfaces
 * Obtener todos los tooth_surfaces
 */
const getToothSurfacesCatalog = async (req, res) => {
  try {
    const surfaces = await getAllToothSurfaces();
    res.json({
      success: true,
      data: surfaces
    });
  } catch (error) {
    console.error('Error al obtener superficies de dientes:', error);
    res.status(500).json({
      success: false,
      error: 'Error al obtener superficies de dientes'
    });
  }
};

// ============================================================
// ENDPOINTS PARA VISTA DE PACIENTE CON TABS
// ============================================================

/**
 * GET /odontograms/patient/:patientId/with-history
 * Obtener odontogramas del paciente para la vista con tabs:
 * - Tab 1: Odontograma Inicial (primer odontograma registrado)
 * - Tab 2: Odontograma de Evolucion (actual) + historial
 */
const getPatientOdontogramsForTabs = async (req, res) => {
  try {
    const { patientId } = req.params;

    if (!patientId) {
      return res.status(400).json({
        success: false,
        error: 'Se requiere el ID del paciente'
      });
    }

    const data = await getPatientOdontogramsWithHistory(parseInt(patientId));

    res.json({
      success: true,
      data: data
    });
  } catch (error) {
    console.error('Error al obtener odontogramas del paciente:', error);
    res.status(500).json({
      success: false,
      error: 'Error al obtener odontogramas del paciente'
    });
  }
};

/**
 * PUT /odontograms/:id/tooth-price
 * Actualizar el precio personalizado de un diente (cuando tiene múltiples condiciones)
 */
const updateToothCustomPrice = async (req, res) => {
  try {
    const { id } = req.params;
    const { toothNumber, customPrice } = req.body;

    if (!id || !toothNumber || customPrice === undefined) {
      return res.status(400).json({
        success: false,
        error: 'Se requiere odontogram_id, toothNumber y customPrice'
      });
    }

    if (customPrice < 0) {
      return res.status(400).json({
        success: false,
        error: 'El precio no puede ser negativo'
      });
    }

    const { updateToothCustomPrice: updatePrice } = require('../models/odontogramsModel');
    const result = await updatePrice(
      parseInt(id),
      toothNumber,
      parseFloat(customPrice),
      req.user.user_id
    );

    res.json({
      success: true,
      message: 'Precio del diente actualizado exitosamente',
      data: result
    });
  } catch (error) {
    console.error('Error al actualizar precio del diente:', error);
    res.status(500).json({
      success: false,
      error: 'Error al actualizar precio del diente'
    });
  }
};

/**
 * GET /odontograms/:id/full
 * Obtener un odontograma especifico con todas sus condiciones
 * para visualizar en el historial de evolucion
 */
const getOdontogramFull = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({
        success: false,
        error: 'Se requiere el ID del odontograma'
      });
    }

    const odontogram = await getOdontogramWithConditionsById(parseInt(id));

    if (!odontogram) {
      return res.status(404).json({
        success: false,
        error: 'Odontograma no encontrado'
      });
    }

    res.json({
      success: true,
      data: odontogram
    });
  } catch (error) {
    console.error('Error al obtener odontograma:', error);
    res.status(500).json({
      success: false,
      error: 'Error al obtener odontograma'
    });
  }
};

module.exports = {
  getOdontograms,
  getOdontogram,
  createNewOdontogram,
  updateExistingOdontogram,
  deleteExistingOdontogram,
  addOdontogramCondition,
  removeOdontogramCondition,
  addOdontogramTreatment,
  removeOdontogramTreatment,
  // Nuevos endpoints para integración relacional
  getCurrentPatientOdontogram,
  saveOdontogramConditionsBatch,
  getOdontogramConditions,
  upsertPatientOdontogram,
  getToothPositionsCatalog,
  getToothSurfacesCatalog,
  // Endpoints para vista de paciente con tabs
  getPatientOdontogramsForTabs,
  getOdontogramFull,
  // Endpoint para precio personalizado del diente
  updateToothCustomPrice
};
