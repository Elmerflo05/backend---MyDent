/**
 * Controlador para el Portal del Paciente
 * Maneja los endpoints especificos para pacientes logueados (rol 7)
 * con validacion de acceso a sus propios datos
 */

const {
  getPatientIntegralConsultations,
  verifyPatientExists,
  getPatientMedicalSummary,
  getPatientMedicalBackground,
  getPatientLaboratoryRadiographyRequests,
  getPatientProfile,
  updatePatientProfile,
  getPatientExternalExams,
  createPatientExternalExamFile,
  createPatientExternalExamLink,
  deletePatientExternalExam,
  getPatientExternalExamById
} = require('../models/patientPortalModel');
const { deleteFile } = require('../config/s3Client');
const { extractS3Key } = require('../utils/s3KeyHelper');

/**
 * GET /api/patient-portal/medical-history
 * Obtiene el historial completo de atenciones integrales del paciente logueado
 * El paciente solo puede ver su propia informacion
 */
const getMyMedicalHistory = async (req, res) => {
  try {
    // El patient_id viene del token JWT (el paciente logueado)
    const patientId = req.user.patient_id;

    if (!patientId) {
      return res.status(400).json({
        success: false,
        error: 'No se encontro el ID del paciente en la sesion'
      });
    }

    // Verificar que el paciente exista
    const patient = await verifyPatientExists(parseInt(patientId));
    if (!patient) {
      return res.status(404).json({
        success: false,
        error: 'Paciente no encontrado'
      });
    }

    // Obtener el historial completo de atenciones integrales
    const consultations = await getPatientIntegralConsultations(parseInt(patientId));

    // Obtener resumen general
    const summary = await getPatientMedicalSummary(parseInt(patientId));

    // Obtener antecedentes medicos del paciente
    const medicalBackground = await getPatientMedicalBackground(parseInt(patientId));

    // Obtener radiografías del laboratorio (sin consulta asociada)
    const laboratoryRadiographyRequests = await getPatientLaboratoryRadiographyRequests(parseInt(patientId));

    res.json({
      success: true,
      data: {
        patient: {
          patient_id: patient.patient_id,
          first_name: patient.first_name,
          last_name: patient.last_name,
          full_name: `${patient.first_name} ${patient.last_name}`
        },
        summary: {
          total_consultations: parseInt(summary.total_consultations) || 0,
          last_consultation_date: summary.last_consultation_date,
          completed_procedures: parseInt(summary.completed_procedures) || 0,
          total_prescriptions: parseInt(summary.total_prescriptions) || 0
        },
        medical_background: medicalBackground,
        consultations: consultations,
        laboratory_radiography_requests: laboratoryRadiographyRequests
      }
    });
  } catch (error) {
    console.error('Error al obtener historial medico del paciente:', error);
    res.status(500).json({
      success: false,
      error: 'Error al obtener historial medico'
    });
  }
};

/**
 * GET /api/patient-portal/medical-history/:consultationId
 * Obtiene el detalle de una atencion integral especifica
 * El paciente solo puede ver sus propias consultas
 */
const getMyConsultationDetail = async (req, res) => {
  try {
    const patientId = req.user.patient_id;
    const { consultationId } = req.params;

    if (!patientId) {
      return res.status(400).json({
        success: false,
        error: 'No se encontro el ID del paciente en la sesion'
      });
    }

    // Obtener todas las consultas del paciente
    const consultations = await getPatientIntegralConsultations(parseInt(patientId));

    // Buscar la consulta especifica
    const consultation = consultations.find(
      c => c.consultation_id === parseInt(consultationId)
    );

    if (!consultation) {
      return res.status(404).json({
        success: false,
        error: 'Consulta no encontrada o no pertenece al paciente'
      });
    }

    res.json({
      success: true,
      data: consultation
    });
  } catch (error) {
    console.error('Error al obtener detalle de consulta:', error);
    res.status(500).json({
      success: false,
      error: 'Error al obtener detalle de consulta'
    });
  }
};

/**
 * GET /api/patient-portal/summary
 * Obtiene un resumen general del historial medico del paciente
 */
const getMyMedicalSummary = async (req, res) => {
  try {
    const patientId = req.user.patient_id;

    if (!patientId) {
      return res.status(400).json({
        success: false,
        error: 'No se encontro el ID del paciente en la sesion'
      });
    }

    const summary = await getPatientMedicalSummary(parseInt(patientId));

    res.json({
      success: true,
      data: {
        total_consultations: parseInt(summary.total_consultations) || 0,
        last_consultation_date: summary.last_consultation_date,
        completed_procedures: parseInt(summary.completed_procedures) || 0,
        total_prescriptions: parseInt(summary.total_prescriptions) || 0
      }
    });
  } catch (error) {
    console.error('Error al obtener resumen medico:', error);
    res.status(500).json({
      success: false,
      error: 'Error al obtener resumen medico'
    });
  }
};

/**
 * GET /api/patient-portal/profile
 * Obtiene el perfil completo del paciente logueado
 */
const getMyProfile = async (req, res) => {
  try {
    const patientId = req.user.patient_id;

    if (!patientId) {
      return res.status(400).json({
        success: false,
        error: 'No se encontró el ID del paciente en la sesión'
      });
    }

    // Obtener perfil completo del paciente
    const profile = await getPatientProfile(parseInt(patientId));

    if (!profile) {
      return res.status(404).json({
        success: false,
        error: 'Perfil de paciente no encontrado'
      });
    }

    // Obtener también los antecedentes médicos
    const medicalBackground = await getPatientMedicalBackground(parseInt(patientId));

    res.json({
      success: true,
      data: {
        profile,
        medical_background: medicalBackground
      }
    });
  } catch (error) {
    console.error('Error al obtener perfil del paciente:', error);
    res.status(500).json({
      success: false,
      error: 'Error al obtener perfil del paciente'
    });
  }
};

/**
 * PUT /api/patient-portal/profile
 * Actualiza el perfil del paciente logueado
 * Solo permite actualizar campos autorizados (teléfono, dirección, contacto de emergencia, etc.)
 */
const updateMyProfile = async (req, res) => {
  try {
    const patientId = req.user.patient_id;

    if (!patientId) {
      return res.status(400).json({
        success: false,
        error: 'No se encontró el ID del paciente en la sesión'
      });
    }

    // Verificar que el paciente exista
    const existingPatient = await verifyPatientExists(parseInt(patientId));
    if (!existingPatient) {
      return res.status(404).json({
        success: false,
        error: 'Paciente no encontrado'
      });
    }

    // Actualizar el perfil
    const updatedProfile = await updatePatientProfile(parseInt(patientId), req.body);

    // Obtener también los antecedentes médicos actualizados
    const medicalBackground = await getPatientMedicalBackground(parseInt(patientId));

    res.json({
      success: true,
      message: 'Perfil actualizado correctamente',
      data: {
        profile: updatedProfile,
        medical_background: medicalBackground
      }
    });
  } catch (error) {
    console.error('Error al actualizar perfil del paciente:', error);
    res.status(500).json({
      success: false,
      error: 'Error al actualizar perfil del paciente'
    });
  }
};

// ============================================================================
// EXAMENES EXTERNOS DEL PACIENTE
// ============================================================================

/**
 * GET /api/patient-portal/external-exams
 * Obtiene todos los exámenes externos del paciente logueado
 */
const getMyExternalExams = async (req, res) => {
  try {
    const patientId = req.user.patient_id;

    if (!patientId) {
      return res.status(400).json({
        success: false,
        error: 'No se encontró el ID del paciente en la sesión'
      });
    }

    const exams = await getPatientExternalExams(parseInt(patientId));

    res.json({
      success: true,
      data: exams
    });
  } catch (error) {
    console.error('Error al obtener exámenes externos:', error);
    res.status(500).json({
      success: false,
      error: 'Error al obtener exámenes externos'
    });
  }
};

/**
 * POST /api/patient-portal/external-exams/file
 * Sube un archivo de examen externo (PDF, imagen)
 */
const uploadExternalExamFile = async (req, res) => {
  try {
    const patientId = req.user.patient_id;

    if (!patientId) {
      return res.status(400).json({
        success: false,
        error: 'No se encontró el ID del paciente en la sesión'
      });
    }

    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'No se recibió ningún archivo'
      });
    }

    const examData = {
      patient_id: parseInt(patientId),
      file_name: req.file.filename,
      original_name: req.file.originalname,
      file_path: req.file.path,
      file_size: req.file.size,
      mime_type: req.file.mimetype
    };

    const newExam = await createPatientExternalExamFile(examData);

    res.status(201).json({
      success: true,
      message: 'Archivo subido correctamente',
      data: newExam
    });
  } catch (error) {
    console.error('Error al subir archivo de examen externo:', error);
    res.status(500).json({
      success: false,
      error: 'Error al subir archivo de examen externo'
    });
  }
};

/**
 * POST /api/patient-portal/external-exams/link
 * Agrega un link externo de examen
 */
const addExternalExamLink = async (req, res) => {
  try {
    const patientId = req.user.patient_id;
    const { external_url } = req.body;

    if (!patientId) {
      return res.status(400).json({
        success: false,
        error: 'No se encontró el ID del paciente en la sesión'
      });
    }

    if (!external_url) {
      return res.status(400).json({
        success: false,
        error: 'El URL es requerido'
      });
    }

    // Validar que sea una URL válida
    try {
      new URL(external_url);
    } catch {
      return res.status(400).json({
        success: false,
        error: 'El URL proporcionado no es válido'
      });
    }

    const examData = {
      patient_id: parseInt(patientId),
      external_url
    };

    const newExam = await createPatientExternalExamLink(examData);

    res.status(201).json({
      success: true,
      message: 'Link agregado correctamente',
      data: newExam
    });
  } catch (error) {
    console.error('Error al agregar link de examen externo:', error);
    res.status(500).json({
      success: false,
      error: 'Error al agregar link de examen externo'
    });
  }
};

/**
 * DELETE /api/patient-portal/external-exams/:examId
 * Elimina (soft delete) un examen externo del paciente
 */
const deleteMyExternalExam = async (req, res) => {
  try {
    const patientId = req.user.patient_id;
    const { examId } = req.params;

    if (!patientId) {
      return res.status(400).json({
        success: false,
        error: 'No se encontró el ID del paciente en la sesión'
      });
    }

    if (!examId) {
      return res.status(400).json({
        success: false,
        error: 'ID de examen requerido'
      });
    }

    // Verificar que el examen existe y pertenece al paciente
    const exam = await getPatientExternalExamById(parseInt(examId));

    if (!exam) {
      return res.status(404).json({
        success: false,
        error: 'Examen no encontrado'
      });
    }

    if (exam.patient_id !== parseInt(patientId)) {
      return res.status(403).json({
        success: false,
        error: 'No tienes permiso para eliminar este examen'
      });
    }

    // Eliminar el archivo de S3 si es un archivo
    if (exam.exam_type === 'file' && exam.file_path) {
      try {
        const s3Key = extractS3Key(exam.file_path);
        if (s3Key) {
          await deleteFile(s3Key);
        }
      } catch (s3Error) {
        console.error('Error al eliminar archivo de S3:', s3Error);
        // Continuamos con el soft delete aunque falle el borrado en S3
      }
    }

    // Soft delete en la base de datos
    await deletePatientExternalExam(parseInt(examId), parseInt(patientId));

    res.json({
      success: true,
      message: 'Examen eliminado correctamente'
    });
  } catch (error) {
    console.error('Error al eliminar examen externo:', error);
    res.status(500).json({
      success: false,
      error: 'Error al eliminar examen externo'
    });
  }
};

module.exports = {
  getMyMedicalHistory,
  getMyConsultationDetail,
  getMyMedicalSummary,
  getMyProfile,
  updateMyProfile,
  getMyExternalExams,
  uploadExternalExamFile,
  addExternalExamLink,
  deleteMyExternalExam
};
