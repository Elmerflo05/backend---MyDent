const {
  getAllMedicalHistories,
  getMedicalHistoryById,
  getMedicalHistoryByPatient,
  createMedicalHistory,
  updateMedicalHistory,
  deleteMedicalHistory,
  countMedicalHistories,
  upsertMedicalHistory
} = require('../models/medicalHistoriesModel');

const pool = require('../config/db');

const getMedicalHistories = async (req, res) => {
  try {
    const {
      patient_id,
      has_allergies,
      has_chronic_diseases,
      has_diabetes,
      has_hypertension,
      page = 1,
      limit = 20
    } = req.query;

    const filters = {
      patient_id: patient_id ? parseInt(patient_id) : null,
      has_allergies: has_allergies !== undefined ? has_allergies === 'true' : undefined,
      has_chronic_diseases: has_chronic_diseases !== undefined ? has_chronic_diseases === 'true' : undefined,
      has_diabetes: has_diabetes !== undefined ? has_diabetes === 'true' : undefined,
      has_hypertension: has_hypertension !== undefined ? has_hypertension === 'true' : undefined,
      limit: parseInt(limit),
      offset: (parseInt(page) - 1) * parseInt(limit)
    };

    const [histories, total] = await Promise.all([
      getAllMedicalHistories(filters),
      countMedicalHistories(filters)
    ]);

    res.json({
      success: true,
      data: histories,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Error al obtener historias médicas:', error);
    res.status(500).json({
      success: false,
      error: 'Error al obtener historias médicas'
    });
  }
};

const getMedicalHistory = async (req, res) => {
  try {
    const { id } = req.params;
    const history = await getMedicalHistoryById(parseInt(id));

    if (!history) {
      return res.status(404).json({
        success: false,
        error: 'Historia médica no encontrada'
      });
    }

    res.json({
      success: true,
      data: history
    });
  } catch (error) {
    console.error('Error al obtener historia médica:', error);
    res.status(500).json({
      success: false,
      error: 'Error al obtener historia médica'
    });
  }
};

const getPatientMedicalHistory = async (req, res) => {
  try {
    const { patientId } = req.params;
    const history = await getMedicalHistoryByPatient(parseInt(patientId));

    // Si no hay historia médica, devolver objeto vacío con success true
    // Esto permite que el frontend maneje el caso sin errores
    res.json({
      success: true,
      data: history || null,
      message: history ? 'Historia médica encontrada' : 'El paciente no tiene historia médica registrada'
    });
  } catch (error) {
    console.error('Error al obtener historia médica del paciente:', error);
    res.status(500).json({
      success: false,
      error: 'Error al obtener historia médica del paciente'
    });
  }
};

const createNewMedicalHistory = async (req, res) => {
  try {
    const historyData = {
      ...req.body,
      user_id_registration: req.user.user_id
    };

    // Validación de campo requerido
    if (!historyData.patient_id) {
      return res.status(400).json({
        success: false,
        error: 'El ID del paciente es requerido'
      });
    }

    // Validar que el paciente exista
    const patientCheck = await pool.query(
      'SELECT patient_id FROM patients WHERE patient_id = $1 AND status = $2',
      [historyData.patient_id, 'active']
    );
    if (patientCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: `El paciente con ID ${historyData.patient_id} no existe o está inactivo`
      });
    }

    // Verificar si ya existe una historia médica para este paciente
    const existingHistory = await pool.query(
      'SELECT medical_history_id FROM medical_histories WHERE patient_id = $1 AND status = $2',
      [historyData.patient_id, 'active']
    );
    if (existingHistory.rows.length > 0) {
      return res.status(409).json({
        success: false,
        error: 'Ya existe una historia médica activa para este paciente. Use la opción de actualizar.',
        existing_id: existingHistory.rows[0].medical_history_id
      });
    }

    const newHistory = await createMedicalHistory(historyData);

    res.status(201).json({
      success: true,
      message: 'Historia médica creada exitosamente',
      data: newHistory
    });
  } catch (error) {
    console.error('Error al crear historia médica:', error);

    // Manejo de errores de constraint de base de datos
    if (error.code === '23503') { // Foreign key violation
      return res.status(400).json({
        success: false,
        error: 'Error de integridad referencial: el paciente no existe'
      });
    }

    if (error.code === '23505') { // Unique violation
      return res.status(409).json({
        success: false,
        error: 'Ya existe una historia médica para este paciente'
      });
    }

    res.status(500).json({
      success: false,
      error: 'Error al crear historia médica'
    });
  }
};

const updateExistingMedicalHistory = async (req, res) => {
  try {
    const { id } = req.params;
    const historyData = {
      ...req.body,
      user_id_modification: req.user.user_id
    };

    const updatedHistory = await updateMedicalHistory(parseInt(id), historyData);

    if (!updatedHistory) {
      return res.status(404).json({
        success: false,
        error: 'Historia médica no encontrada'
      });
    }

    res.json({
      success: true,
      message: 'Historia médica actualizada exitosamente',
      data: updatedHistory
    });
  } catch (error) {
    console.error('Error al actualizar historia médica:', error);
    res.status(500).json({
      success: false,
      error: 'Error al actualizar historia médica'
    });
  }
};

const deleteExistingMedicalHistory = async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await deleteMedicalHistory(parseInt(id), req.user.user_id);

    if (!deleted) {
      return res.status(404).json({
        success: false,
        error: 'Historia médica no encontrada'
      });
    }

    res.json({
      success: true,
      message: 'Historia médica eliminada exitosamente'
    });
  } catch (error) {
    console.error('Error al eliminar historia médica:', error);
    res.status(500).json({
      success: false,
      error: 'Error al eliminar historia médica'
    });
  }
};

/**
 * Upsert de historia médica:
 * Si existe una historia médica activa para el paciente, la actualiza.
 * Si no existe, crea una nueva.
 */
const upsertMedicalHistoryHandler = async (req, res) => {
  try {
    const historyData = {
      ...req.body,
      user_id_registration: req.user.user_id
    };

    // Validación de campo requerido
    if (!historyData.patient_id) {
      return res.status(400).json({
        success: false,
        error: 'El ID del paciente es requerido'
      });
    }

    // Validar que el paciente exista
    const patientCheck = await pool.query(
      'SELECT patient_id FROM patients WHERE patient_id = $1 AND status = $2',
      [historyData.patient_id, 'active']
    );
    if (patientCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: `El paciente con ID ${historyData.patient_id} no existe o está inactivo`
      });
    }

    const result = await upsertMedicalHistory(historyData);

    const statusCode = result.wasUpdated ? 200 : 201;
    const message = result.wasUpdated
      ? 'Historia médica actualizada exitosamente'
      : 'Historia médica creada exitosamente';

    res.status(statusCode).json({
      success: true,
      message,
      data: result,
      wasUpdated: result.wasUpdated
    });
  } catch (error) {
    console.error('Error en upsert de historia médica:', error);
    res.status(500).json({
      success: false,
      error: 'Error al procesar historia médica'
    });
  }
};

module.exports = {
  getMedicalHistories,
  getMedicalHistory,
  getPatientMedicalHistory,
  createNewMedicalHistory,
  updateExistingMedicalHistory,
  deleteExistingMedicalHistory,
  upsertMedicalHistoryHandler
};
