/**
 * Controller: evolutionOdontogramController.js
 * Controlador para el odontograma de evolucion
 */

const {
  getAllEvolutionOdontogram,
  getEvolutionOdontogramById,
  createEvolutionOdontogram,
  updateEvolutionOdontogram,
  deleteEvolutionOdontogram,
  getPatientEvolutionOdontogram,
  getToothEvolutionStatus,
  getPatientEvolutionSummary,
  upsertEvolutionOdontogram
} = require('../models/evolutionOdontogramModel');

/**
 * GET /api/evolution-odontogram
 * Obtener evolucion de odontograma con filtros
 */
const getEvolutionOdontogramList = async (req, res) => {
  try {
    const {
      patient_id,
      consultation_id,
      condition_status,
      tooth_position_id,
      page = 1,
      limit = 100
    } = req.query;

    const filters = {
      patient_id: patient_id ? parseInt(patient_id) : null,
      consultation_id: consultation_id ? parseInt(consultation_id) : null,
      condition_status: condition_status || null,
      tooth_position_id: tooth_position_id ? parseInt(tooth_position_id) : null,
      limit: parseInt(limit),
      offset: (parseInt(page) - 1) * parseInt(limit)
    };

    const evolutions = await getAllEvolutionOdontogram(filters);

    res.json({
      success: true,
      data: evolutions
    });
  } catch (error) {
    console.error('Error al obtener evolucion de odontograma:', error);
    res.status(500).json({
      success: false,
      error: 'Error al obtener evolucion de odontograma'
    });
  }
};

/**
 * GET /api/evolution-odontogram/:id
 * Obtener evolucion por ID
 */
const getEvolutionOdontogram = async (req, res) => {
  try {
    const { id } = req.params;
    const evolution = await getEvolutionOdontogramById(parseInt(id));

    if (!evolution) {
      return res.status(404).json({
        success: false,
        error: 'Evolucion no encontrada'
      });
    }

    res.json({
      success: true,
      data: evolution
    });
  } catch (error) {
    console.error('Error al obtener evolucion:', error);
    res.status(500).json({
      success: false,
      error: 'Error al obtener evolucion'
    });
  }
};

/**
 * GET /api/evolution-odontogram/patient/:patientId
 * Obtener evolucion del odontograma por paciente
 */
const getPatientEvolution = async (req, res) => {
  try {
    const { patientId } = req.params;
    const evolution = await getPatientEvolutionOdontogram(parseInt(patientId));

    // Agrupar por diente para facilitar el renderizado en frontend
    const groupedByTooth = {};
    evolution.forEach(item => {
      const toothNum = item.tooth_number;
      if (!groupedByTooth[toothNum]) {
        groupedByTooth[toothNum] = {
          tooth_number: toothNum,
          tooth_name: item.tooth_name,
          quadrant: item.quadrant,
          is_adult: item.is_adult,
          surfaces: []
        };
      }
      groupedByTooth[toothNum].surfaces.push({
        evolution_id: item.evolution_id,
        condition_status: item.condition_status,
        surface_code: item.surface_code,
        surface_name: item.surface_name,
        original_condition_name: item.original_condition_name,
        registered_date: item.registered_date,
        dentist_name: item.dentist_name,
        clinical_observation: item.clinical_observation
      });
    });

    res.json({
      success: true,
      data: {
        raw: evolution,
        grouped: Object.values(groupedByTooth)
      }
    });
  } catch (error) {
    console.error('Error al obtener evolucion del paciente:', error);
    res.status(500).json({
      success: false,
      error: 'Error al obtener evolucion del paciente'
    });
  }
};

/**
 * GET /api/evolution-odontogram/patient/:patientId/summary
 * Obtener resumen de evolucion por paciente
 */
const getPatientEvolutionSummaryData = async (req, res) => {
  try {
    const { patientId } = req.params;
    const summary = await getPatientEvolutionSummary(parseInt(patientId));

    // Formatear resumen
    const formattedSummary = {
      pending: { count: 0, teeth: 0 },
      in_progress: { count: 0, teeth: 0 },
      completed: { count: 0, teeth: 0 }
    };

    summary.forEach(row => {
      if (formattedSummary[row.condition_status]) {
        formattedSummary[row.condition_status] = {
          count: parseInt(row.count),
          teeth: parseInt(row.teeth_count)
        };
      }
    });

    res.json({
      success: true,
      data: formattedSummary
    });
  } catch (error) {
    console.error('Error al obtener resumen de evolucion:', error);
    res.status(500).json({
      success: false,
      error: 'Error al obtener resumen de evolucion'
    });
  }
};

/**
 * GET /api/evolution-odontogram/tooth/:patientId/:toothPositionId
 * Obtener estado de evolucion de un diente especifico
 */
const getToothEvolution = async (req, res) => {
  try {
    const { patientId, toothPositionId } = req.params;
    const { tooth_surface_id } = req.query;

    const evolution = await getToothEvolutionStatus(
      parseInt(patientId),
      parseInt(toothPositionId),
      tooth_surface_id ? parseInt(tooth_surface_id) : null
    );

    res.json({
      success: true,
      data: evolution
    });
  } catch (error) {
    console.error('Error al obtener evolucion del diente:', error);
    res.status(500).json({
      success: false,
      error: 'Error al obtener evolucion del diente'
    });
  }
};

/**
 * POST /api/evolution-odontogram
 * Crear nuevo registro de evolucion
 */
const createNewEvolutionOdontogram = async (req, res) => {
  try {
    const data = {
      ...req.body,
      user_id_registration: req.user.user_id
    };

    // Validaciones basicas
    if (!data.patient_id || !data.consultation_id || !data.tooth_position_id || !data.registered_by_dentist_id) {
      return res.status(400).json({
        success: false,
        error: 'Faltan campos requeridos: patient_id, consultation_id, tooth_position_id, registered_by_dentist_id'
      });
    }

    const newEvolution = await createEvolutionOdontogram(data);

    res.status(201).json({
      success: true,
      message: 'Evolucion registrada exitosamente',
      data: newEvolution
    });
  } catch (error) {
    console.error('Error al crear evolucion:', error);
    res.status(500).json({
      success: false,
      error: 'Error al crear evolucion'
    });
  }
};

/**
 * POST /api/evolution-odontogram/upsert
 * Crear o actualizar evolucion (si ya existe para el diente/superficie)
 */
const upsertEvolution = async (req, res) => {
  try {
    const data = req.body;

    // Validaciones basicas
    if (!data.patient_id || !data.consultation_id || !data.tooth_position_id || !data.registered_by_dentist_id) {
      return res.status(400).json({
        success: false,
        error: 'Faltan campos requeridos: patient_id, consultation_id, tooth_position_id, registered_by_dentist_id'
      });
    }

    const evolution = await upsertEvolutionOdontogram(data, req.user.user_id);

    res.status(200).json({
      success: true,
      message: 'Evolucion guardada exitosamente',
      data: evolution
    });
  } catch (error) {
    console.error('Error al guardar evolucion:', error);
    res.status(500).json({
      success: false,
      error: 'Error al guardar evolucion'
    });
  }
};

/**
 * PUT /api/evolution-odontogram/:id
 * Actualizar estado de evolucion
 */
const updateExistingEvolutionOdontogram = async (req, res) => {
  try {
    const { id } = req.params;
    const updatedEvolution = await updateEvolutionOdontogram(
      parseInt(id),
      req.body,
      req.user.user_id
    );

    if (!updatedEvolution) {
      return res.status(404).json({
        success: false,
        error: 'Evolucion no encontrada'
      });
    }

    res.json({
      success: true,
      message: 'Evolucion actualizada exitosamente',
      data: updatedEvolution
    });
  } catch (error) {
    console.error('Error al actualizar evolucion:', error);
    res.status(500).json({
      success: false,
      error: 'Error al actualizar evolucion'
    });
  }
};

/**
 * DELETE /api/evolution-odontogram/:id
 * Eliminar (soft delete) registro de evolucion
 */
const deleteExistingEvolutionOdontogram = async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await deleteEvolutionOdontogram(parseInt(id), req.user.user_id);

    if (!deleted) {
      return res.status(404).json({
        success: false,
        error: 'Evolucion no encontrada'
      });
    }

    res.json({
      success: true,
      message: 'Evolucion eliminada exitosamente'
    });
  } catch (error) {
    console.error('Error al eliminar evolucion:', error);
    res.status(500).json({
      success: false,
      error: 'Error al eliminar evolucion'
    });
  }
};

module.exports = {
  getEvolutionOdontogramList,
  getEvolutionOdontogram,
  getPatientEvolution,
  getPatientEvolutionSummaryData,
  getToothEvolution,
  createNewEvolutionOdontogram,
  upsertEvolution,
  updateExistingEvolutionOdontogram,
  deleteExistingEvolutionOdontogram
};
