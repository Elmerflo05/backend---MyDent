/**
 * Controller: procedureHistoryController.js
 * Controlador para el historial clinico de procedimientos realizados
 */

const {
  getAllProcedureHistory,
  getProcedureHistoryById,
  createProcedureHistory,
  updateProcedureHistory,
  deleteProcedureHistory,
  countProcedureHistory,
  getPatientProcedureHistory
} = require('../models/procedureHistoryModel');

/**
 * GET /api/procedure-history
 * Obtener historial de procedimientos con filtros
 */
const getProcedureHistoryList = async (req, res) => {
  try {
    const {
      patient_id,
      consultation_id,
      dentist_id,
      procedure_type,
      date_from,
      date_to,
      page = 1,
      limit = 50
    } = req.query;

    const filters = {
      patient_id: patient_id ? parseInt(patient_id) : null,
      consultation_id: consultation_id ? parseInt(consultation_id) : null,
      dentist_id: dentist_id ? parseInt(dentist_id) : null,
      procedure_type: procedure_type || null,
      date_from: date_from || null,
      date_to: date_to || null,
      limit: parseInt(limit),
      offset: (parseInt(page) - 1) * parseInt(limit)
    };

    const [procedures, total] = await Promise.all([
      getAllProcedureHistory(filters),
      countProcedureHistory(filters)
    ]);

    res.json({
      success: true,
      data: procedures,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Error al obtener historial de procedimientos:', error);
    res.status(500).json({
      success: false,
      error: 'Error al obtener historial de procedimientos'
    });
  }
};

/**
 * GET /api/procedure-history/:id
 * Obtener procedimiento por ID
 */
const getProcedureHistory = async (req, res) => {
  try {
    const { id } = req.params;
    const procedure = await getProcedureHistoryById(parseInt(id));

    if (!procedure) {
      return res.status(404).json({
        success: false,
        error: 'Procedimiento no encontrado'
      });
    }

    res.json({
      success: true,
      data: procedure
    });
  } catch (error) {
    console.error('Error al obtener procedimiento:', error);
    res.status(500).json({
      success: false,
      error: 'Error al obtener procedimiento'
    });
  }
};

/**
 * GET /api/procedure-history/patient/:patientId
 * Obtener historial de procedimientos por paciente
 */
const getPatientHistory = async (req, res) => {
  try {
    const { patientId } = req.params;
    const history = await getPatientProcedureHistory(parseInt(patientId));

    res.json({
      success: true,
      data: history
    });
  } catch (error) {
    console.error('Error al obtener historial del paciente:', error);
    res.status(500).json({
      success: false,
      error: 'Error al obtener historial del paciente'
    });
  }
};

/**
 * GET /api/procedure-history/consultation/:consultationId
 * Obtener historial de procedimientos por consulta
 */
const getConsultationHistory = async (req, res) => {
  try {
    const { consultationId } = req.params;
    const filters = { consultation_id: parseInt(consultationId) };
    const history = await getAllProcedureHistory(filters);

    res.json({
      success: true,
      data: history
    });
  } catch (error) {
    console.error('Error al obtener historial de consulta:', error);
    res.status(500).json({
      success: false,
      error: 'Error al obtener historial de consulta'
    });
  }
};

/**
 * POST /api/procedure-history
 * Crear nuevo registro de procedimiento
 */
const createNewProcedureHistory = async (req, res) => {
  try {
    const data = {
      ...req.body,
      user_id_registration: req.user.user_id
    };

    // Validaciones basicas
    if (!data.consultation_id || !data.patient_id || !data.procedure_name || !data.performed_by_dentist_id) {
      return res.status(400).json({
        success: false,
        error: 'Faltan campos requeridos: consultation_id, patient_id, procedure_name, performed_by_dentist_id'
      });
    }

    const newProcedure = await createProcedureHistory(data);

    res.status(201).json({
      success: true,
      message: 'Procedimiento registrado exitosamente',
      data: newProcedure
    });
  } catch (error) {
    console.error('Error al crear procedimiento:', error);
    res.status(500).json({
      success: false,
      error: 'Error al crear procedimiento'
    });
  }
};

/**
 * PUT /api/procedure-history/:id
 * Actualizar registro de procedimiento
 */
const updateExistingProcedureHistory = async (req, res) => {
  try {
    const { id } = req.params;
    const updatedProcedure = await updateProcedureHistory(
      parseInt(id),
      req.body,
      req.user.user_id
    );

    if (!updatedProcedure) {
      return res.status(404).json({
        success: false,
        error: 'Procedimiento no encontrado'
      });
    }

    res.json({
      success: true,
      message: 'Procedimiento actualizado exitosamente',
      data: updatedProcedure
    });
  } catch (error) {
    console.error('Error al actualizar procedimiento:', error);
    res.status(500).json({
      success: false,
      error: 'Error al actualizar procedimiento'
    });
  }
};

/**
 * DELETE /api/procedure-history/:id
 * Eliminar (soft delete) registro de procedimiento
 */
const deleteExistingProcedureHistory = async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await deleteProcedureHistory(parseInt(id), req.user.user_id);

    if (!deleted) {
      return res.status(404).json({
        success: false,
        error: 'Procedimiento no encontrado'
      });
    }

    res.json({
      success: true,
      message: 'Procedimiento eliminado exitosamente'
    });
  } catch (error) {
    console.error('Error al eliminar procedimiento:', error);
    res.status(500).json({
      success: false,
      error: 'Error al eliminar procedimiento'
    });
  }
};

module.exports = {
  getProcedureHistoryList,
  getProcedureHistory,
  getPatientHistory,
  getConsultationHistory,
  createNewProcedureHistory,
  updateExistingProcedureHistory,
  deleteExistingProcedureHistory
};
