const {
  getAllConsultations,
  getConsultationById,
  createConsultation,
  updateConsultation,
  deleteConsultation,
  countConsultations,
  findByAppointmentId,
  upsertConsultation,
  addDiagnosticCondition,
  deleteDiagnosticCondition,
  getAllConsultationRooms,
  getConsultationRoomById,
  createConsultationRoom,
  updateConsultationRoom,
  deleteConsultationRoom,
  addExtraoralImages,
  addIntraoralImages,
  removeExtraoralImage,
  removeIntraoralImage,
  getClinicalExamImages,
  // Funciones para diagnóstico definitivo
  getDefinitiveDiagnosisConditions,
  addDefinitiveDiagnosisCondition,
  updateDefinitiveDiagnosisCondition,
  deleteDefinitiveDiagnosisCondition,
  saveDefinitiveDiagnosisConditions,
  getDefinitiveDiagnosisSummary,
  updateSelectedProcedure,
  // Funciones para condiciones presuntivas del odontograma
  getPresumptiveConditionsFromOdontogram,
  getPresumptiveConditionsByConsultation
} = require('../models/consultationsModel');

const pool = require('../config/db');
const { getImageRelativePath, deleteImage } = require('../config/multerClinicalExam');

const getConsultations = async (req, res) => {
  try {
    const {
      patient_id,
      dentist_id,
      branch_id,
      date_from,
      date_to,
      page = 1,
      limit = 20
    } = req.query;

    const filters = {
      patient_id: patient_id ? parseInt(patient_id) : null,
      dentist_id: dentist_id ? parseInt(dentist_id) : null,
      branch_id: branch_id ? parseInt(branch_id) : null,
      date_from: date_from || null,
      date_to: date_to || null,
      limit: parseInt(limit),
      offset: (parseInt(page) - 1) * parseInt(limit)
    };

    const [consultations, total] = await Promise.all([
      getAllConsultations(filters),
      countConsultations(filters)
    ]);

    res.json({
      success: true,
      data: consultations,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Error al obtener consultas:', error);
    res.status(500).json({
      success: false,
      error: 'Error al obtener consultas'
    });
  }
};

const getConsultation = async (req, res) => {
  try {
    const { id } = req.params;
    const consultation = await getConsultationById(parseInt(id));

    if (!consultation) {
      return res.status(404).json({
        success: false,
        error: 'Consulta no encontrada'
      });
    }

    res.json({
      success: true,
      data: consultation
    });
  } catch (error) {
    console.error('Error al obtener consulta:', error);
    res.status(500).json({
      success: false,
      error: 'Error al obtener consulta'
    });
  }
};

const createNewConsultation = async (req, res) => {
  try {
    const consultationData = {
      ...req.body,
      user_id_registration: req.user.user_id
    };

    // Validación de campos requeridos
    if (!consultationData.patient_id || !consultationData.dentist_id ||
        !consultationData.branch_id || !consultationData.consultation_date) {
      return res.status(400).json({
        success: false,
        error: 'Faltan campos requeridos: patient_id, dentist_id, branch_id y consultation_date son obligatorios'
      });
    }

    // Validar que el paciente exista
    const patientCheck = await pool.query(
      'SELECT patient_id FROM patients WHERE patient_id = $1 AND status = $2',
      [consultationData.patient_id, 'active']
    );
    if (patientCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: `El paciente con ID ${consultationData.patient_id} no existe o está inactivo`
      });
    }

    // Validar que el dentista exista
    const dentistCheck = await pool.query(
      'SELECT dentist_id FROM dentists WHERE dentist_id = $1 AND status = $2',
      [consultationData.dentist_id, 'active']
    );
    if (dentistCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: `El dentista con ID ${consultationData.dentist_id} no existe o está inactivo`
      });
    }

    // Validar que la sede exista
    const branchCheck = await pool.query(
      "SELECT branch_id FROM branches WHERE branch_id = $1 AND status = 'active'",
      [consultationData.branch_id]
    );
    if (branchCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: `La sede con ID ${consultationData.branch_id} no existe o está inactiva`
      });
    }

    // Validar formato de fecha
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(consultationData.consultation_date)) {
      return res.status(400).json({
        success: false,
        error: 'Formato de fecha inválido. Use YYYY-MM-DD'
      });
    }

    const newConsultation = await createConsultation(consultationData);

    res.status(201).json({
      success: true,
      message: 'Consulta creada exitosamente',
      data: newConsultation
    });
  } catch (error) {
    console.error('Error al crear consulta:', error);

    // Manejo de errores de constraint de base de datos
    if (error.code === '23503') { // Foreign key violation
      return res.status(400).json({
        success: false,
        error: 'Error de integridad referencial: verifique que todos los IDs sean válidos'
      });
    }

    res.status(500).json({
      success: false,
      error: 'Error al crear consulta'
    });
  }
};

const updateExistingConsultation = async (req, res) => {
  try {
    const { id } = req.params;
    const consultationData = {
      ...req.body,
      user_id_modification: req.user.user_id
    };

    const updatedConsultation = await updateConsultation(parseInt(id), consultationData);

    if (!updatedConsultation) {
      return res.status(404).json({
        success: false,
        error: 'Consulta no encontrada'
      });
    }

    res.json({
      success: true,
      message: 'Consulta actualizada exitosamente',
      data: updatedConsultation
    });
  } catch (error) {
    console.error('Error al actualizar consulta:', error);
    res.status(500).json({
      success: false,
      error: 'Error al actualizar consulta'
    });
  }
};

const deleteExistingConsultation = async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await deleteConsultation(parseInt(id), req.user.user_id);

    if (!deleted) {
      return res.status(404).json({
        success: false,
        error: 'Consulta no encontrada'
      });
    }

    res.json({
      success: true,
      message: 'Consulta eliminada exitosamente'
    });
  } catch (error) {
    console.error('Error al eliminar consulta:', error);
    res.status(500).json({
      success: false,
      error: 'Error al eliminar consulta'
    });
  }
};

/**
 * Upsert de consulta: Crea o actualiza según appointment_id
 * Si ya existe una consulta con el mismo appointment_id, la actualiza.
 * Si no existe, crea una nueva.
 */
const upsertConsultationHandler = async (req, res) => {
  try {
    const consultationData = {
      ...req.body,
      user_id_registration: req.user.user_id
    };

    // Validación de campos requeridos
    if (!consultationData.patient_id || !consultationData.dentist_id ||
        !consultationData.branch_id || !consultationData.consultation_date) {
      return res.status(400).json({
        success: false,
        error: 'Faltan campos requeridos: patient_id, dentist_id, branch_id y consultation_date son obligatorios'
      });
    }

    // Validar que el paciente exista
    const patientCheck = await pool.query(
      'SELECT patient_id FROM patients WHERE patient_id = $1 AND status = $2',
      [consultationData.patient_id, 'active']
    );
    if (patientCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: `El paciente con ID ${consultationData.patient_id} no existe o está inactivo`
      });
    }

    // Validar que el dentista exista
    const dentistCheck = await pool.query(
      'SELECT dentist_id FROM dentists WHERE dentist_id = $1 AND status = $2',
      [consultationData.dentist_id, 'active']
    );
    if (dentistCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: `El dentista con ID ${consultationData.dentist_id} no existe o está inactivo`
      });
    }

    // Validar que la sede exista
    const branchCheck = await pool.query(
      "SELECT branch_id FROM branches WHERE branch_id = $1 AND status = 'active'",
      [consultationData.branch_id]
    );
    if (branchCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: `La sede con ID ${consultationData.branch_id} no existe o está inactiva`
      });
    }

    // Validar formato de fecha
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(consultationData.consultation_date)) {
      return res.status(400).json({
        success: false,
        error: 'Formato de fecha inválido. Use YYYY-MM-DD'
      });
    }

    const result = await upsertConsultation(consultationData);

    const statusCode = result.wasUpdated ? 200 : 201;
    const message = result.wasUpdated
      ? 'Consulta actualizada exitosamente'
      : 'Consulta creada exitosamente';

    res.status(statusCode).json({
      success: true,
      message,
      data: result,
      wasUpdated: result.wasUpdated
    });
  } catch (error) {
    console.error('Error en upsert de consulta:', error);

    // Manejo de errores de constraint de base de datos
    if (error.code === '23503') { // Foreign key violation
      return res.status(400).json({
        success: false,
        error: 'Error de integridad referencial: verifique que todos los IDs sean válidos',
        detail: error.detail || error.message
      });
    }

    if (error.code === '23502') { // NOT NULL violation
      return res.status(400).json({
        success: false,
        error: `Campo requerido faltante: ${error.column || 'desconocido'}`,
        detail: error.detail || error.message
      });
    }

    if (error.code === '22P02') { // Invalid input syntax
      return res.status(400).json({
        success: false,
        error: 'Formato de datos inválido',
        detail: error.message
      });
    }

    res.status(500).json({
      success: false,
      error: 'Error al guardar consulta',
      detail: error.message
    });
  }
};

// Condiciones diagnósticas
const addDiagnostic = async (req, res) => {
  try {
    const { id } = req.params;
    const conditionData = {
      ...req.body,
      consultation_id: parseInt(id)
    };

    if (!conditionData.condition_description) {
      return res.status(400).json({
        success: false,
        error: 'La descripción de la condición es requerida'
      });
    }

    const newCondition = await addDiagnosticCondition(conditionData, req.user.user_id);

    res.status(201).json({
      success: true,
      message: 'Condición diagnóstica agregada exitosamente',
      data: newCondition
    });
  } catch (error) {
    console.error('Error al agregar condición diagnóstica:', error);
    res.status(500).json({
      success: false,
      error: 'Error al agregar condición diagnóstica'
    });
  }
};

const removeDiagnostic = async (req, res) => {
  try {
    const { conditionId } = req.params;
    const deleted = await deleteDiagnosticCondition(parseInt(conditionId), req.user.user_id);

    if (!deleted) {
      return res.status(404).json({
        success: false,
        error: 'Condición diagnóstica no encontrada'
      });
    }

    res.json({
      success: true,
      message: 'Condición diagnóstica eliminada exitosamente'
    });
  } catch (error) {
    console.error('Error al eliminar condición diagnóstica:', error);
    res.status(500).json({
      success: false,
      error: 'Error al eliminar condición diagnóstica'
    });
  }
};

// Salas de consulta
const getRooms = async (req, res) => {
  try {
    const { branch_id } = req.query;
    const rooms = await getAllConsultationRooms(branch_id ? parseInt(branch_id) : null);

    res.json({
      success: true,
      data: rooms
    });
  } catch (error) {
    console.error('Error al obtener salas:', error);
    res.status(500).json({
      success: false,
      error: 'Error al obtener salas'
    });
  }
};

const getRoom = async (req, res) => {
  try {
    const { roomId } = req.params;
    const room = await getConsultationRoomById(parseInt(roomId));

    if (!room) {
      return res.status(404).json({
        success: false,
        error: 'Sala no encontrada'
      });
    }

    res.json({
      success: true,
      data: room
    });
  } catch (error) {
    console.error('Error al obtener sala:', error);
    res.status(500).json({
      success: false,
      error: 'Error al obtener sala'
    });
  }
};

const createRoom = async (req, res) => {
  try {
    if (!req.body.branch_id || !req.body.room_name) {
      return res.status(400).json({
        success: false,
        error: 'Faltan campos requeridos'
      });
    }

    const newRoom = await createConsultationRoom(req.body, req.user.user_id);

    res.status(201).json({
      success: true,
      message: 'Sala creada exitosamente',
      data: newRoom
    });
  } catch (error) {
    console.error('Error al crear sala:', error);
    res.status(500).json({
      success: false,
      error: 'Error al crear sala'
    });
  }
};

const updateRoom = async (req, res) => {
  try {
    const { roomId } = req.params;
    const updatedRoom = await updateConsultationRoom(parseInt(roomId), req.body, req.user.user_id);

    if (!updatedRoom) {
      return res.status(404).json({
        success: false,
        error: 'Sala no encontrada'
      });
    }

    res.json({
      success: true,
      message: 'Sala actualizada exitosamente',
      data: updatedRoom
    });
  } catch (error) {
    console.error('Error al actualizar sala:', error);
    res.status(500).json({
      success: false,
      error: 'Error al actualizar sala'
    });
  }
};

const deleteRoom = async (req, res) => {
  try {
    const { roomId } = req.params;
    const deleted = await deleteConsultationRoom(parseInt(roomId), req.user.user_id);

    if (!deleted) {
      return res.status(404).json({
        success: false,
        error: 'Sala no encontrada'
      });
    }

    res.json({
      success: true,
      message: 'Sala eliminada exitosamente'
    });
  } catch (error) {
    console.error('Error al eliminar sala:', error);
    res.status(500).json({
      success: false,
      error: 'Error al eliminar sala'
    });
  }
};

// ============================================================================
// HANDLERS PARA IMAGENES DEL EXAMEN CLINICO
// ============================================================================

/**
 * Sube imagenes del examen extraoral
 * POST /consultations/:consultationId/clinical-exam/extraoral/images
 */
const uploadExtraoralImagesHandler = async (req, res) => {
  try {
    const { consultationId } = req.params;

    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No se proporcionaron imagenes'
      });
    }

    // Construir las rutas relativas de las imagenes
    const imagePaths = req.files.map(file =>
      getImageRelativePath(file.filename, 'extraoral')
    );

    const result = await addExtraoralImages(
      parseInt(consultationId),
      imagePaths,
      req.user.user_id
    );

    if (!result) {
      return res.status(404).json({
        success: false,
        error: 'Consulta no encontrada'
      });
    }

    res.status(201).json({
      success: true,
      message: `${imagePaths.length} imagen(es) extraoral(es) agregada(s) exitosamente`,
      data: {
        consultation_id: result.consultation_id,
        extraoral_exam_images: result.extraoral_exam_images,
        uploaded_files: imagePaths
      }
    });
  } catch (error) {
    console.error('Error al subir imagenes extraorales:', error);
    res.status(500).json({
      success: false,
      error: 'Error al subir imagenes extraorales'
    });
  }
};

/**
 * Sube imagenes del examen intraoral
 * POST /consultations/:consultationId/clinical-exam/intraoral/images
 */
const uploadIntraoralImagesHandler = async (req, res) => {
  try {
    const { consultationId } = req.params;

    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No se proporcionaron imagenes'
      });
    }

    // Construir las rutas relativas de las imagenes
    const imagePaths = req.files.map(file =>
      getImageRelativePath(file.filename, 'intraoral')
    );

    const result = await addIntraoralImages(
      parseInt(consultationId),
      imagePaths,
      req.user.user_id
    );

    if (!result) {
      return res.status(404).json({
        success: false,
        error: 'Consulta no encontrada'
      });
    }

    res.status(201).json({
      success: true,
      message: `${imagePaths.length} imagen(es) intraoral(es) agregada(s) exitosamente`,
      data: {
        consultation_id: result.consultation_id,
        intraoral_exam_images: result.intraoral_exam_images,
        uploaded_files: imagePaths
      }
    });
  } catch (error) {
    console.error('Error al subir imagenes intraorales:', error);
    res.status(500).json({
      success: false,
      error: 'Error al subir imagenes intraorales'
    });
  }
};

/**
 * Elimina una imagen del examen extraoral
 * DELETE /consultations/:consultationId/clinical-exam/extraoral/images
 * Body: { imagePath: "ruta/de/la/imagen.jpg" }
 */
const deleteExtraoralImageHandler = async (req, res) => {
  try {
    const { consultationId } = req.params;
    const { imagePath } = req.body;

    if (!imagePath) {
      return res.status(400).json({
        success: false,
        error: 'Se requiere la ruta de la imagen a eliminar'
      });
    }

    // Eliminar de S3
    await deleteImage(imagePath);

    // Eliminar de la base de datos
    const result = await removeExtraoralImage(
      parseInt(consultationId),
      imagePath,
      req.user.user_id
    );

    if (!result) {
      return res.status(404).json({
        success: false,
        error: 'Consulta no encontrada'
      });
    }

    res.json({
      success: true,
      message: 'Imagen extraoral eliminada exitosamente',
      data: {
        consultation_id: result.consultation_id,
        extraoral_exam_images: result.extraoral_exam_images
      }
    });
  } catch (error) {
    console.error('Error al eliminar imagen extraoral:', error);
    res.status(500).json({
      success: false,
      error: 'Error al eliminar imagen extraoral'
    });
  }
};

/**
 * Elimina una imagen del examen intraoral
 * DELETE /consultations/:consultationId/clinical-exam/intraoral/images
 * Body: { imagePath: "ruta/de/la/imagen.jpg" }
 */
const deleteIntraoralImageHandler = async (req, res) => {
  try {
    const { consultationId } = req.params;
    const { imagePath } = req.body;

    if (!imagePath) {
      return res.status(400).json({
        success: false,
        error: 'Se requiere la ruta de la imagen a eliminar'
      });
    }

    // Eliminar de S3
    await deleteImage(imagePath);

    // Eliminar de la base de datos
    const result = await removeIntraoralImage(
      parseInt(consultationId),
      imagePath,
      req.user.user_id
    );

    if (!result) {
      return res.status(404).json({
        success: false,
        error: 'Consulta no encontrada'
      });
    }

    res.json({
      success: true,
      message: 'Imagen intraoral eliminada exitosamente',
      data: {
        consultation_id: result.consultation_id,
        intraoral_exam_images: result.intraoral_exam_images
      }
    });
  } catch (error) {
    console.error('Error al eliminar imagen intraoral:', error);
    res.status(500).json({
      success: false,
      error: 'Error al eliminar imagen intraoral'
    });
  }
};

/**
 * Obtiene las imagenes del examen clinico de una consulta
 * GET /consultations/:consultationId/clinical-exam/images
 */
const getClinicalExamImagesHandler = async (req, res) => {
  try {
    const { consultationId } = req.params;

    const result = await getClinicalExamImages(parseInt(consultationId));

    if (!result) {
      return res.status(404).json({
        success: false,
        error: 'Consulta no encontrada'
      });
    }

    res.json({
      success: true,
      data: {
        consultation_id: result.consultation_id,
        extraoral_exam_images: result.extraoral_exam_images || [],
        intraoral_exam_images: result.intraoral_exam_images || []
      }
    });
  } catch (error) {
    console.error('Error al obtener imagenes del examen clinico:', error);
    res.status(500).json({
      success: false,
      error: 'Error al obtener imagenes del examen clinico'
    });
  }
};

// ============================================================================
// HANDLERS PARA DIAGNÓSTICO DEFINITIVO
// ============================================================================

/**
 * Obtiene las condiciones del diagnóstico definitivo de una consulta
 * GET /consultations/:consultationId/definitive-diagnosis
 */
const getDefinitiveDiagnosisHandler = async (req, res) => {
  try {
    const { consultationId } = req.params;

    const conditions = await getDefinitiveDiagnosisConditions(parseInt(consultationId));
    const summary = await getDefinitiveDiagnosisSummary(parseInt(consultationId));

    res.json({
      success: true,
      data: {
        conditions,
        summary: {
          total_conditions: parseInt(summary.total_conditions) || 0,
          total_price: parseFloat(summary.total_price) || 0,
          modified_count: parseInt(summary.modified_count) || 0
        }
      }
    });
  } catch (error) {
    console.error('Error al obtener diagnóstico definitivo:', error);
    res.status(500).json({
      success: false,
      error: 'Error al obtener diagnóstico definitivo'
    });
  }
};

/**
 * Agrega una condición al diagnóstico definitivo
 * POST /consultations/:consultationId/definitive-diagnosis
 */
const addDefinitiveDiagnosisHandler = async (req, res) => {
  try {
    const { consultationId } = req.params;
    const conditionData = {
      ...req.body,
      consultation_id: parseInt(consultationId)
    };

    // Validaciones
    if (!conditionData.tooth_position_id || !conditionData.tooth_number) {
      return res.status(400).json({
        success: false,
        error: 'El diente es requerido (tooth_position_id y tooth_number)'
      });
    }

    if (!conditionData.dental_condition_id || !conditionData.condition_label) {
      return res.status(400).json({
        success: false,
        error: 'La condición dental es requerida (dental_condition_id y condition_label)'
      });
    }

    const newCondition = await addDefinitiveDiagnosisCondition(conditionData, req.user.user_id);

    res.status(201).json({
      success: true,
      message: 'Condición del diagnóstico definitivo agregada exitosamente',
      data: newCondition
    });
  } catch (error) {
    console.error('Error al agregar condición del diagnóstico definitivo:', error);
    res.status(500).json({
      success: false,
      error: 'Error al agregar condición del diagnóstico definitivo'
    });
  }
};

/**
 * Actualiza una condición del diagnóstico definitivo
 * PUT /consultations/definitive-diagnosis/:conditionId
 */
const updateDefinitiveDiagnosisHandler = async (req, res) => {
  try {
    const { conditionId } = req.params;

    const updatedCondition = await updateDefinitiveDiagnosisCondition(
      parseInt(conditionId),
      req.body,
      req.user.user_id
    );

    if (!updatedCondition) {
      return res.status(404).json({
        success: false,
        error: 'Condición no encontrada'
      });
    }

    res.json({
      success: true,
      message: 'Condición actualizada exitosamente',
      data: updatedCondition
    });
  } catch (error) {
    console.error('Error al actualizar condición del diagnóstico definitivo:', error);
    res.status(500).json({
      success: false,
      error: 'Error al actualizar condición del diagnóstico definitivo'
    });
  }
};

/**
 * Elimina una condición del diagnóstico definitivo
 * DELETE /consultations/definitive-diagnosis/:conditionId
 */
const deleteDefinitiveDiagnosisHandler = async (req, res) => {
  try {
    const { conditionId } = req.params;

    const deleted = await deleteDefinitiveDiagnosisCondition(
      parseInt(conditionId),
      req.user.user_id
    );

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
    console.error('Error al eliminar condición del diagnóstico definitivo:', error);
    res.status(500).json({
      success: false,
      error: 'Error al eliminar condición del diagnóstico definitivo'
    });
  }
};

/**
 * Guarda todas las condiciones del diagnóstico definitivo (bulk save)
 * POST /consultations/:consultationId/definitive-diagnosis/bulk
 */
const saveDefinitiveDiagnosisBulkHandler = async (req, res) => {
  try {
    const { consultationId } = req.params;
    const { conditions } = req.body;

    if (!Array.isArray(conditions)) {
      return res.status(400).json({
        success: false,
        error: 'Se requiere un array de condiciones'
      });
    }

    // Validar cada condicion
    for (let i = 0; i < conditions.length; i++) {
      const cond = conditions[i];
      if (!cond.tooth_position_id || !cond.tooth_number) {
        return res.status(400).json({
          success: false,
          error: `Condicion ${i + 1}: El diente es requerido`
        });
      }
      if (!cond.dental_condition_id || !cond.condition_label) {
        return res.status(400).json({
          success: false,
          error: `Condicion ${i + 1}: La condicion dental es requerida`
        });
      }
    }

    const savedConditions = await saveDefinitiveDiagnosisConditions(
      parseInt(consultationId),
      conditions,
      req.user.user_id
    );

    const summary = await getDefinitiveDiagnosisSummary(parseInt(consultationId));

    res.json({
      success: true,
      message: `${savedConditions.length} condiciones guardadas exitosamente`,
      data: {
        conditions: savedConditions,
        summary: {
          total_conditions: parseInt(summary.total_conditions) || 0,
          total_price: parseFloat(summary.total_price) || 0,
          modified_count: parseInt(summary.modified_count) || 0
        }
      }
    });
  } catch (error) {
    console.error('Error al guardar condiciones del diagnostico definitivo:', error);
    res.status(500).json({
      success: false,
      error: 'Error al guardar condiciones del diagnostico definitivo'
    });
  }
};

// ============================================================================
// HANDLERS PARA CONDICIONES PRESUNTIVAS DEL ODONTOGRAMA
// ============================================================================

/**
 * Obtiene las condiciones presuntivas del odontograma por consultation_id
 * GET /consultations/:consultationId/presumptive-conditions
 */
const getPresumptiveConditionsHandler = async (req, res) => {
  try {
    const { consultationId } = req.params;

    const conditions = await getPresumptiveConditionsByConsultation(parseInt(consultationId));

    // Calcular totales
    const totalPrice = conditions.reduce((sum, cond) => sum + (parseFloat(cond.price) || 0), 0);

    res.json({
      success: true,
      data: {
        conditions,
        summary: {
          total_conditions: conditions.length,
          total_price: totalPrice
        }
      }
    });
  } catch (error) {
    console.error('Error al obtener condiciones presuntivas:', error);
    res.status(500).json({
      success: false,
      error: 'Error al obtener condiciones presuntivas'
    });
  }
};

/**
 * Obtiene las condiciones presuntivas del odontograma por patient_id
 * GET /consultations/patients/:patientId/presumptive-conditions
 */
const getPresumptiveConditionsByPatientHandler = async (req, res) => {
  try {
    const { patientId } = req.params;

    const conditions = await getPresumptiveConditionsFromOdontogram(parseInt(patientId));

    // Calcular totales
    const totalPrice = conditions.reduce((sum, cond) => sum + (parseFloat(cond.price) || 0), 0);

    res.json({
      success: true,
      data: {
        conditions,
        summary: {
          total_conditions: conditions.length,
          total_price: totalPrice
        }
      }
    });
  } catch (error) {
    console.error('Error al obtener condiciones presuntivas del paciente:', error);
    res.status(500).json({
      success: false,
      error: 'Error al obtener condiciones presuntivas del paciente'
    });
  }
};

/**
 * Actualiza el procedimiento seleccionado de una condicion del diagnostico definitivo
 * PUT /consultations/definitive-diagnosis/:conditionId/procedure
 */
const updateSelectedProcedureHandler = async (req, res) => {
  try {
    const { conditionId } = req.params;
    const { procedure_id, procedure_price } = req.body;

    if (!procedure_id) {
      return res.status(400).json({
        success: false,
        error: 'El ID del procedimiento es requerido'
      });
    }

    const updated = await updateSelectedProcedure(
      parseInt(conditionId),
      parseInt(procedure_id),
      procedure_price ? parseFloat(procedure_price) : null,
      req.user.user_id
    );

    if (!updated) {
      return res.status(404).json({
        success: false,
        error: 'Condicion no encontrada'
      });
    }

    res.json({
      success: true,
      message: 'Procedimiento actualizado exitosamente',
      data: updated
    });
  } catch (error) {
    console.error('Error al actualizar procedimiento:', error);
    res.status(500).json({
      success: false,
      error: 'Error al actualizar procedimiento seleccionado'
    });
  }
};

module.exports = {
  getConsultations,
  getConsultation,
  createNewConsultation,
  updateExistingConsultation,
  deleteExistingConsultation,
  upsertConsultationHandler,
  addDiagnostic,
  removeDiagnostic,
  getRooms,
  getRoom,
  createRoom,
  updateRoom,
  deleteRoom,
  // Handlers para imagenes del examen clinico
  uploadExtraoralImagesHandler,
  uploadIntraoralImagesHandler,
  deleteExtraoralImageHandler,
  deleteIntraoralImageHandler,
  getClinicalExamImagesHandler,
  // Handlers para diagnostico definitivo
  getDefinitiveDiagnosisHandler,
  addDefinitiveDiagnosisHandler,
  updateDefinitiveDiagnosisHandler,
  deleteDefinitiveDiagnosisHandler,
  saveDefinitiveDiagnosisBulkHandler,
  updateSelectedProcedureHandler,
  // Handlers para condiciones presuntivas del odontograma
  getPresumptiveConditionsHandler,
  getPresumptiveConditionsByPatientHandler
};
