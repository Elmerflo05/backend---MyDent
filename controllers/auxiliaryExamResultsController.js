/**
 * Controlador para Resultados de Examenes Auxiliares (Paso 6 - Atencion Integral)
 *
 * Maneja las operaciones CRUD para resultados de examenes auxiliares,
 * incluyendo subida de archivos externos y observaciones del doctor.
 */

const {
  getByConsultationId,
  getByPatientId,
  upsert,
  addExternalFileByConsultation,
  removeExternalFileByConsultation,
  updateObservationsByConsultation,
  getById
} = require('../models/auxiliaryExamResultsModel');

const { getPatientExternalExams } = require('../models/patientPortalModel');

const { deleteFile } = require('../config/s3Client');
const { extractS3Key } = require('../utils/s3KeyHelper');

/**
 * Obtener resultado por consultation_id
 * GET /api/auxiliary-exam-results/consultation/:consultationId
 */
const getByConsultationHandler = async (req, res) => {
  try {
    const { consultationId } = req.params;

    if (!consultationId || isNaN(parseInt(consultationId))) {
      return res.status(400).json({
        success: false,
        error: 'ID de consulta invalido'
      });
    }

    const result = await getByConsultationId(parseInt(consultationId));

    if (!result) {
      return res.json({
        success: true,
        data: null,
        message: 'No se encontro registro para esta consulta'
      });
    }

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('Error al obtener resultado por consulta:', error);
    res.status(500).json({
      success: false,
      error: 'Error al obtener resultado de examenes auxiliares'
    });
  }
};

/**
 * Obtener todos los resultados de un paciente
 * GET /api/auxiliary-exam-results/patient/:patientId
 */
const getByPatientHandler = async (req, res) => {
  try {
    const { patientId } = req.params;

    if (!patientId || isNaN(parseInt(patientId))) {
      return res.status(400).json({
        success: false,
        error: 'ID de paciente invalido'
      });
    }

    const results = await getByPatientId(parseInt(patientId));

    res.json({
      success: true,
      data: results,
      count: results.length
    });
  } catch (error) {
    console.error('Error al obtener resultados por paciente:', error);
    res.status(500).json({
      success: false,
      error: 'Error al obtener resultados de examenes auxiliares'
    });
  }
};

/**
 * Crear o actualizar resultado (upsert)
 * POST /api/auxiliary-exam-results/upsert
 *
 * Body esperado:
 * {
 *   consultation_id: number (requerido),
 *   patient_id: number (requerido para crear),
 *   dentist_id: number (requerido para crear),
 *   doctor_observations: string (opcional),
 *   external_files: array (opcional)
 * }
 */
const upsertResultHandler = async (req, res) => {
  try {
    const {
      consultation_id,
      patient_id,
      dentist_id,
      doctor_observations,
      external_files
    } = req.body;

    // Validar consultation_id
    if (!consultation_id) {
      return res.status(400).json({
        success: false,
        error: 'consultation_id es requerido'
      });
    }

    // Para crear, necesitamos patient_id y dentist_id
    const existing = await getByConsultationId(consultation_id);
    if (!existing && (!patient_id || !dentist_id)) {
      return res.status(400).json({
        success: false,
        error: 'patient_id y dentist_id son requeridos para crear un nuevo registro'
      });
    }

    const data = {
      consultation_id,
      patient_id: patient_id || existing?.patient_id,
      dentist_id: dentist_id || existing?.dentist_id,
      doctor_observations,
      external_files,
      user_id_registration: req.user?.user_id,
      user_id_modification: req.user?.user_id
    };

    const result = await upsert(data);

    const statusCode = result.wasUpdated ? 200 : 201;
    const message = result.wasUpdated
      ? 'Resultado actualizado exitosamente'
      : 'Resultado creado exitosamente';

    res.status(statusCode).json({
      success: true,
      message,
      data: result,
      wasUpdated: result.wasUpdated
    });
  } catch (error) {
    console.error('Error en upsert de resultado:', error);
    res.status(500).json({
      success: false,
      error: 'Error al guardar resultado de examenes auxiliares'
    });
  }
};

/**
 * Subir archivo externo
 * POST /api/auxiliary-exam-results/consultation/:consultationId/upload-file
 *
 * Usa multer para manejar la subida.
 * El archivo se guarda en: uploads/integral_atention/step_6_Results_of_Auxiliary_Exams
 */
const uploadExternalFileHandler = async (req, res) => {
  try {
    const { consultationId } = req.params;

    if (!consultationId || isNaN(parseInt(consultationId))) {
      return res.status(400).json({
        success: false,
        error: 'ID de consulta invalido'
      });
    }

    // Verificar que se subio un archivo
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'No se proporciono ningun archivo'
      });
    }

    // Verificar que existe el registro
    let existing = await getByConsultationId(parseInt(consultationId));

    // Si no existe, necesitamos patient_id y dentist_id del body
    if (!existing) {
      const { patient_id, dentist_id } = req.body;

      if (!patient_id || !dentist_id) {
        return res.status(400).json({
          success: false,
          error: 'No existe registro para esta consulta. Proporcione patient_id y dentist_id para crearlo.'
        });
      }

      // Crear registro
      await upsert({
        consultation_id: parseInt(consultationId),
        patient_id: parseInt(patient_id),
        dentist_id: parseInt(dentist_id),
        user_id_registration: req.user?.user_id
      });

      existing = await getByConsultationId(parseInt(consultationId));
    }

    // Construir datos del archivo (req.file.path ya viene del middleware s3Upload)
    const fileData = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      name: req.file.originalname,
      type: req.file.mimetype,
      size: req.file.size,
      path: req.file.path,
      uploadedAt: new Date().toISOString()
    };

    // Agregar archivo al registro
    const updated = await addExternalFileByConsultation(parseInt(consultationId), fileData);

    res.status(201).json({
      success: true,
      message: 'Archivo subido exitosamente',
      data: {
        file: fileData,
        result: updated
      }
    });
  } catch (error) {
    console.error('Error al subir archivo externo:', error);

    res.status(500).json({
      success: false,
      error: 'Error al subir archivo externo'
    });
  }
};

/**
 * Eliminar archivo externo
 * DELETE /api/auxiliary-exam-results/consultation/:consultationId/file/:fileId
 */
const deleteExternalFileHandler = async (req, res) => {
  try {
    const { consultationId, fileId } = req.params;

    if (!consultationId || isNaN(parseInt(consultationId))) {
      return res.status(400).json({
        success: false,
        error: 'ID de consulta invalido'
      });
    }

    if (!fileId) {
      return res.status(400).json({
        success: false,
        error: 'ID de archivo es requerido'
      });
    }

    // Eliminar del registro
    const result = await removeExternalFileByConsultation(parseInt(consultationId), fileId);

    // Si se encontro el archivo, eliminarlo de S3
    if (result.removedFile && result.removedFile.path) {
      try {
        const s3Key = extractS3Key(result.removedFile.path);
        if (s3Key) {
          await deleteFile(s3Key);
        }
      } catch (s3Error) {
        console.error('Error al eliminar archivo de S3:', s3Error);
      }
    }

    res.json({
      success: true,
      message: 'Archivo eliminado exitosamente',
      data: result
    });
  } catch (error) {
    console.error('Error al eliminar archivo externo:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Error al eliminar archivo externo'
    });
  }
};

/**
 * Actualizar observaciones del doctor
 * PUT /api/auxiliary-exam-results/consultation/:consultationId/observations
 *
 * Body esperado:
 * {
 *   observations: string
 * }
 */
const updateObservationsHandler = async (req, res) => {
  try {
    const { consultationId } = req.params;
    const { observations } = req.body;

    if (!consultationId || isNaN(parseInt(consultationId))) {
      return res.status(400).json({
        success: false,
        error: 'ID de consulta invalido'
      });
    }

    // Verificar que existe el registro
    const existing = await getByConsultationId(parseInt(consultationId));
    if (!existing) {
      return res.status(404).json({
        success: false,
        error: 'No existe registro para esta consulta'
      });
    }

    const result = await updateObservationsByConsultation(
      parseInt(consultationId),
      observations,
      req.user?.user_id
    );

    res.json({
      success: true,
      message: 'Observaciones actualizadas exitosamente',
      data: result
    });
  } catch (error) {
    console.error('Error al actualizar observaciones:', error);
    res.status(500).json({
      success: false,
      error: 'Error al actualizar observaciones'
    });
  }
};

/**
 * Obtener resultado por ID
 * GET /api/auxiliary-exam-results/:id
 */
const getByIdHandler = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id || isNaN(parseInt(id))) {
      return res.status(400).json({
        success: false,
        error: 'ID invalido'
      });
    }

    const result = await getById(parseInt(id));

    if (!result) {
      return res.status(404).json({
        success: false,
        error: 'Resultado no encontrado'
      });
    }

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('Error al obtener resultado por ID:', error);
    res.status(500).json({
      success: false,
      error: 'Error al obtener resultado'
    });
  }
};

/**
 * Obtener examenes externos subidos por el paciente
 * GET /api/auxiliary-exam-results/patient/:patientId/external-exams
 *
 * Permite al doctor ver los examenes que el paciente subio desde su portal
 */
const getPatientExternalExamsHandler = async (req, res) => {
  try {
    const { patientId } = req.params;

    if (!patientId || isNaN(parseInt(patientId))) {
      return res.status(400).json({
        success: false,
        error: 'ID de paciente invalido'
      });
    }

    const exams = await getPatientExternalExams(parseInt(patientId));

    res.json({
      success: true,
      data: exams
    });
  } catch (error) {
    console.error('Error al obtener examenes externos del paciente:', error);
    res.status(500).json({
      success: false,
      error: 'Error al obtener examenes externos del paciente'
    });
  }
};

module.exports = {
  getByConsultationHandler,
  getByPatientHandler,
  upsertResultHandler,
  uploadExternalFileHandler,
  deleteExternalFileHandler,
  updateObservationsHandler,
  getByIdHandler,
  getPatientExternalExamsHandler
};
