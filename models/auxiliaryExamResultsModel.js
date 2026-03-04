/**
 * Modelo para Resultados de Examenes Auxiliares (Paso 6 - Atencion Integral)
 * Tabla: auxiliary_exam_results
 *
 * Usa SQL raw porque el cliente Prisma no fue regenerado despues de agregar el modelo.
 * Almacena archivos externos subidos por el doctor y observaciones sobre
 * examenes realizados en otros centros medicos.
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/**
 * Obtener resultado por consultation_id
 * @param {number} consultationId - ID de la consulta
 * @returns {Object|null} Resultado o null si no existe
 */
const getByConsultationId = async (consultationId) => {
  try {
    const results = await prisma.$queryRawUnsafe(`
      SELECT
        aer.*,
        p.patient_id as "patients.patient_id",
        p.first_name as "patients.first_name",
        p.last_name as "patients.last_name",
        p.identification_number as "patients.identification_number",
        d.dentist_id as "dentists.dentist_id",
        u.first_name as "dentists.users.first_name",
        u.last_name as "dentists.users.last_name"
      FROM auxiliary_exam_results aer
      LEFT JOIN patients p ON aer.patient_id = p.patient_id
      LEFT JOIN dentists d ON aer.dentist_id = d.dentist_id
      LEFT JOIN users u ON d.user_id = u.user_id
      WHERE aer.consultation_id = $1
    `, parseInt(consultationId));

    if (!results || results.length === 0) {
      return null;
    }

    // Transformar resultado para coincidir con estructura esperada
    const row = results[0];
    return {
      auxiliary_exam_result_id: row.auxiliary_exam_result_id,
      consultation_id: row.consultation_id,
      patient_id: row.patient_id,
      dentist_id: row.dentist_id,
      doctor_observations: row.doctor_observations,
      external_files: row.external_files || [],
      status: row.status,
      user_id_registration: row.user_id_registration,
      date_time_registration: row.date_time_registration,
      user_id_modification: row.user_id_modification,
      date_time_modification: row.date_time_modification,
      patients: row['patients.patient_id'] ? {
        patient_id: row['patients.patient_id'],
        first_name: row['patients.first_name'],
        last_name: row['patients.last_name'],
        identification_number: row['patients.identification_number']
      } : null,
      dentists: row['dentists.dentist_id'] ? {
        dentist_id: row['dentists.dentist_id'],
        users: {
          first_name: row['dentists.users.first_name'],
          last_name: row['dentists.users.last_name']
        }
      } : null
    };
  } catch (error) {
    console.error('Error en getByConsultationId:', error);
    throw error;
  }
};

/**
 * Obtener todos los resultados de un paciente
 * @param {number} patientId - ID del paciente
 * @returns {Array} Lista de resultados
 */
const getByPatientId = async (patientId) => {
  try {
    const results = await prisma.$queryRawUnsafe(`
      SELECT
        aer.*,
        c.consultation_id as "consultations.consultation_id",
        c.consultation_date as "consultations.consultation_date",
        c.chief_complaint as "consultations.chief_complaint",
        d.dentist_id as "dentists.dentist_id",
        u.first_name as "dentists.users.first_name",
        u.last_name as "dentists.users.last_name"
      FROM auxiliary_exam_results aer
      LEFT JOIN consultations c ON aer.consultation_id = c.consultation_id
      LEFT JOIN dentists d ON aer.dentist_id = d.dentist_id
      LEFT JOIN users u ON d.user_id = u.user_id
      WHERE aer.patient_id = $1 AND aer.status = 'active'
      ORDER BY aer.date_time_registration DESC
    `, parseInt(patientId));

    return results.map(row => ({
      auxiliary_exam_result_id: row.auxiliary_exam_result_id,
      consultation_id: row.consultation_id,
      patient_id: row.patient_id,
      dentist_id: row.dentist_id,
      doctor_observations: row.doctor_observations,
      external_files: row.external_files || [],
      status: row.status,
      date_time_registration: row.date_time_registration,
      consultations: row['consultations.consultation_id'] ? {
        consultation_id: row['consultations.consultation_id'],
        consultation_date: row['consultations.consultation_date'],
        chief_complaint: row['consultations.chief_complaint']
      } : null,
      dentists: row['dentists.dentist_id'] ? {
        dentist_id: row['dentists.dentist_id'],
        users: {
          first_name: row['dentists.users.first_name'],
          last_name: row['dentists.users.last_name']
        }
      } : null
    }));
  } catch (error) {
    console.error('Error en getByPatientId:', error);
    throw error;
  }
};

/**
 * Crear o actualizar resultado (upsert)
 * Si existe un registro para la consulta, lo actualiza. Si no, lo crea.
 * @param {Object} data - Datos del resultado
 * @returns {Object} Resultado creado o actualizado
 */
const upsert = async (data) => {
  try {
    const {
      consultation_id,
      patient_id,
      dentist_id,
      doctor_observations,
      external_files,
      user_id_registration,
      user_id_modification
    } = data;

    // Verificar si existe
    const existingResult = await prisma.$queryRawUnsafe(`
      SELECT * FROM auxiliary_exam_results WHERE consultation_id = $1
    `, parseInt(consultation_id));

    const existing = existingResult.length > 0 ? existingResult[0] : null;

    if (existing) {
      // Actualizar
      const updated = await prisma.$queryRawUnsafe(`
        UPDATE auxiliary_exam_results
        SET
          doctor_observations = COALESCE($1, doctor_observations),
          external_files = COALESCE($2::jsonb, external_files),
          user_id_modification = $3,
          date_time_modification = NOW()
        WHERE consultation_id = $4
        RETURNING *
      `,
        doctor_observations !== undefined ? doctor_observations : existing.doctor_observations,
        external_files !== undefined ? JSON.stringify(external_files) : null,
        user_id_modification || null,
        parseInt(consultation_id)
      );

      return { ...updated[0], wasUpdated: true };
    } else {
      // Crear nuevo
      const created = await prisma.$queryRawUnsafe(`
        INSERT INTO auxiliary_exam_results (
          consultation_id,
          patient_id,
          dentist_id,
          doctor_observations,
          external_files,
          user_id_registration,
          status,
          date_time_registration
        ) VALUES ($1, $2, $3, $4, $5::jsonb, $6, 'active', NOW())
        RETURNING *
      `,
        parseInt(consultation_id),
        parseInt(patient_id),
        parseInt(dentist_id),
        doctor_observations || null,
        JSON.stringify(external_files || []),
        user_id_registration || null
      );

      return { ...created[0], wasUpdated: false };
    }
  } catch (error) {
    console.error('Error en upsert:', error);
    throw error;
  }
};

/**
 * Agregar archivo por consultation_id
 * @param {number} consultationId - ID de la consulta
 * @param {Object} fileData - Datos del archivo
 * @returns {Object} Resultado actualizado
 */
const addExternalFileByConsultation = async (consultationId, fileData) => {
  try {
    // Obtener el registro por consultation_id
    const currentResult = await prisma.$queryRawUnsafe(`
      SELECT * FROM auxiliary_exam_results WHERE consultation_id = $1
    `, parseInt(consultationId));

    if (!currentResult || currentResult.length === 0) {
      throw new Error('Registro no encontrado para esta consulta');
    }

    const current = currentResult[0];

    // Parsear archivos existentes
    let currentFiles = [];
    if (current.external_files) {
      if (typeof current.external_files === 'string') {
        currentFiles = JSON.parse(current.external_files);
      } else {
        currentFiles = current.external_files;
      }
    }

    // Agregar nuevo archivo
    currentFiles.push(fileData);

    // Actualizar
    const updated = await prisma.$queryRawUnsafe(`
      UPDATE auxiliary_exam_results
      SET
        external_files = $1::jsonb,
        date_time_modification = NOW()
      WHERE auxiliary_exam_result_id = $2
      RETURNING *
    `, JSON.stringify(currentFiles), current.auxiliary_exam_result_id);

    return updated[0];
  } catch (error) {
    console.error('Error en addExternalFileByConsultation:', error);
    throw error;
  }
};

/**
 * Remover archivo por consultation_id
 * @param {number} consultationId - ID de la consulta
 * @param {string} fileId - ID del archivo a eliminar
 * @returns {Object} Resultado con archivo eliminado
 */
const removeExternalFileByConsultation = async (consultationId, fileId) => {
  try {
    const currentResult = await prisma.$queryRawUnsafe(`
      SELECT * FROM auxiliary_exam_results WHERE consultation_id = $1
    `, parseInt(consultationId));

    if (!currentResult || currentResult.length === 0) {
      throw new Error('Registro no encontrado para esta consulta');
    }

    const current = currentResult[0];

    // Parsear archivos existentes
    let currentFiles = [];
    if (current.external_files) {
      if (typeof current.external_files === 'string') {
        currentFiles = JSON.parse(current.external_files);
      } else {
        currentFiles = current.external_files;
      }
    }

    // Encontrar el archivo a eliminar para retornar su path
    const fileToRemove = currentFiles.find(f => f.id === fileId);

    // Filtrar el archivo a eliminar
    const updatedFiles = currentFiles.filter(file => file.id !== fileId);

    // Actualizar
    const updated = await prisma.$queryRawUnsafe(`
      UPDATE auxiliary_exam_results
      SET
        external_files = $1::jsonb,
        date_time_modification = NOW()
      WHERE auxiliary_exam_result_id = $2
      RETURNING *
    `, JSON.stringify(updatedFiles), current.auxiliary_exam_result_id);

    return { ...updated[0], removedFile: fileToRemove };
  } catch (error) {
    console.error('Error en removeExternalFileByConsultation:', error);
    throw error;
  }
};

/**
 * Actualizar observaciones por consultation_id
 * @param {number} consultationId - ID de la consulta
 * @param {string} observations - Observaciones del doctor
 * @param {number} userId - ID del usuario que modifica
 * @returns {Object} Resultado actualizado
 */
const updateObservationsByConsultation = async (consultationId, observations, userId = null) => {
  try {
    const currentResult = await prisma.$queryRawUnsafe(`
      SELECT * FROM auxiliary_exam_results WHERE consultation_id = $1
    `, parseInt(consultationId));

    if (!currentResult || currentResult.length === 0) {
      throw new Error('Registro no encontrado para esta consulta');
    }

    const updated = await prisma.$queryRawUnsafe(`
      UPDATE auxiliary_exam_results
      SET
        doctor_observations = $1,
        user_id_modification = $2,
        date_time_modification = NOW()
      WHERE consultation_id = $3
      RETURNING *
    `, observations, userId, parseInt(consultationId));

    return updated[0];
  } catch (error) {
    console.error('Error en updateObservationsByConsultation:', error);
    throw error;
  }
};

/**
 * Obtener resultado por ID
 * @param {number} id - ID del resultado
 * @returns {Object|null} Resultado o null
 */
const getById = async (id) => {
  try {
    const results = await prisma.$queryRawUnsafe(`
      SELECT
        aer.*,
        p.patient_id as "patients.patient_id",
        p.first_name as "patients.first_name",
        p.last_name as "patients.last_name",
        d.dentist_id as "dentists.dentist_id",
        u.first_name as "dentists.users.first_name",
        u.last_name as "dentists.users.last_name",
        c.consultation_id as "consultations.consultation_id",
        c.consultation_date as "consultations.consultation_date"
      FROM auxiliary_exam_results aer
      LEFT JOIN patients p ON aer.patient_id = p.patient_id
      LEFT JOIN dentists d ON aer.dentist_id = d.dentist_id
      LEFT JOIN users u ON d.user_id = u.user_id
      LEFT JOIN consultations c ON aer.consultation_id = c.consultation_id
      WHERE aer.auxiliary_exam_result_id = $1
    `, parseInt(id));

    if (!results || results.length === 0) {
      return null;
    }

    const row = results[0];
    return {
      auxiliary_exam_result_id: row.auxiliary_exam_result_id,
      consultation_id: row.consultation_id,
      patient_id: row.patient_id,
      dentist_id: row.dentist_id,
      doctor_observations: row.doctor_observations,
      external_files: row.external_files || [],
      status: row.status,
      patients: row['patients.patient_id'] ? {
        patient_id: row['patients.patient_id'],
        first_name: row['patients.first_name'],
        last_name: row['patients.last_name']
      } : null,
      dentists: row['dentists.dentist_id'] ? {
        dentist_id: row['dentists.dentist_id'],
        users: {
          first_name: row['dentists.users.first_name'],
          last_name: row['dentists.users.last_name']
        }
      } : null,
      consultations: row['consultations.consultation_id'] ? {
        consultation_id: row['consultations.consultation_id'],
        consultation_date: row['consultations.consultation_date']
      } : null
    };
  } catch (error) {
    console.error('Error en getById:', error);
    throw error;
  }
};

/**
 * Eliminar resultado (soft delete)
 * @param {number} id - ID del resultado
 * @param {number} userId - ID del usuario que elimina
 * @returns {boolean} true si se elimino
 */
const softDelete = async (id, userId = null) => {
  try {
    await prisma.$queryRawUnsafe(`
      UPDATE auxiliary_exam_results
      SET
        status = 'deleted',
        user_id_modification = $1,
        date_time_modification = NOW()
      WHERE auxiliary_exam_result_id = $2
    `, userId, parseInt(id));

    return true;
  } catch (error) {
    console.error('Error en softDelete:', error);
    return false;
  }
};

module.exports = {
  getByConsultationId,
  getByPatientId,
  upsert,
  addExternalFileByConsultation,
  removeExternalFileByConsultation,
  updateObservationsByConsultation,
  getById,
  softDelete
};
