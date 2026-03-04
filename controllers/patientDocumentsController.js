const {
  getAllPatientDocuments,
  getPatientDocumentById,
  createPatientDocument,
  updatePatientDocument,
  deletePatientDocument,
  countPatientDocuments
} = require('../models/patientDocumentsModel');

const getPatientDocuments = async (req, res) => {
  try {
    const { patient_id, document_type, search, page = 1, limit = 20 } = req.query;
    const filters = {
      patient_id: patient_id ? parseInt(patient_id) : null,
      document_type,
      search,
      limit: parseInt(limit),
      offset: (parseInt(page) - 1) * parseInt(limit)
    };

    const [documents, total] = await Promise.all([
      getAllPatientDocuments(filters),
      countPatientDocuments(filters)
    ]);

    res.json({
      success: true,
      data: documents,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Error al obtener documentos:', error);
    res.status(500).json({ success: false, error: 'Error al obtener documentos' });
  }
};

const getPatientDocument = async (req, res) => {
  try {
    const { id } = req.params;
    const document = await getPatientDocumentById(parseInt(id));
    if (!document) {
      return res.status(404).json({ success: false, error: 'Documento no encontrado' });
    }
    res.json({ success: true, data: document });
  } catch (error) {
    console.error('Error al obtener documento:', error);
    res.status(500).json({ success: false, error: 'Error al obtener documento' });
  }
};

const createNewPatientDocument = async (req, res) => {
  try {
    const documentData = { ...req.body, user_id_registration: req.user.user_id };
    if (!documentData.patient_id || !documentData.document_name || !documentData.file_path) {
      return res.status(400).json({ success: false, error: 'Faltan campos requeridos' });
    }
    const newDocument = await createPatientDocument(documentData);
    res.status(201).json({ success: true, message: 'Documento creado exitosamente', data: newDocument });
  } catch (error) {
    console.error('Error al crear documento:', error);
    res.status(500).json({ success: false, error: 'Error al crear documento' });
  }
};

const updateExistingPatientDocument = async (req, res) => {
  try {
    const { id } = req.params;
    const documentData = { ...req.body, user_id_modification: req.user.user_id };
    const updatedDocument = await updatePatientDocument(parseInt(id), documentData);
    if (!updatedDocument) {
      return res.status(404).json({ success: false, error: 'Documento no encontrado' });
    }
    res.json({ success: true, message: 'Documento actualizado exitosamente', data: updatedDocument });
  } catch (error) {
    console.error('Error al actualizar documento:', error);
    res.status(500).json({ success: false, error: 'Error al actualizar documento' });
  }
};

const deleteExistingPatientDocument = async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await deletePatientDocument(parseInt(id), req.user.user_id);
    if (!deleted) {
      return res.status(404).json({ success: false, error: 'Documento no encontrado' });
    }
    res.json({ success: true, message: 'Documento eliminado exitosamente' });
  } catch (error) {
    console.error('Error al eliminar documento:', error);
    res.status(500).json({ success: false, error: 'Error al eliminar documento' });
  }
};

module.exports = {
  getPatientDocuments,
  getPatientDocument,
  createNewPatientDocument,
  updateExistingPatientDocument,
  deleteExistingPatientDocument
};
