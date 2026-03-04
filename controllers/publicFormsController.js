const {
  getAllPublicForms,
  getPublicFormById,
  createPublicForm,
  updatePublicForm,
  deletePublicForm,
  getAllFormSubmissions,
  getFormSubmissionById,
  createFormSubmission,
  updateFormSubmission,
  deleteFormSubmission,
  countFormSubmissions
} = require('../models/publicFormsModel');

// Forms
const getPublicForms = async (req, res) => {
  try {
    const forms = await getAllPublicForms();
    res.json({ success: true, data: forms });
  } catch (error) {
    console.error('Error al obtener formularios:', error);
    res.status(500).json({ success: false, error: 'Error al obtener formularios' });
  }
};

const getPublicForm = async (req, res) => {
  try {
    const form = await getPublicFormById(parseInt(req.params.id));
    if (!form) return res.status(404).json({ success: false, error: 'Formulario no encontrado' });
    res.json({ success: true, data: form });
  } catch (error) {
    console.error('Error al obtener formulario:', error);
    res.status(500).json({ success: false, error: 'Error al obtener formulario' });
  }
};

const createNewPublicForm = async (req, res) => {
  try {
    if (!req.body.form_name) {
      return res.status(400).json({ success: false, error: 'El nombre del formulario es requerido' });
    }
    const newForm = await createPublicForm(req.body, req.user.user_id);
    res.status(201).json({ success: true, message: 'Formulario creado exitosamente', data: newForm });
  } catch (error) {
    console.error('Error al crear formulario:', error);
    res.status(500).json({ success: false, error: 'Error al crear formulario' });
  }
};

const updateExistingPublicForm = async (req, res) => {
  try {
    const updated = await updatePublicForm(parseInt(req.params.id), req.body, req.user.user_id);
    if (!updated) return res.status(404).json({ success: false, error: 'Formulario no encontrado' });
    res.json({ success: true, message: 'Formulario actualizado exitosamente', data: updated });
  } catch (error) {
    console.error('Error al actualizar formulario:', error);
    res.status(500).json({ success: false, error: 'Error al actualizar formulario' });
  }
};

const deleteExistingPublicForm = async (req, res) => {
  try {
    const deleted = await deletePublicForm(parseInt(req.params.id), req.user.user_id);
    if (!deleted) return res.status(404).json({ success: false, error: 'Formulario no encontrado' });
    res.json({ success: true, message: 'Formulario eliminado exitosamente' });
  } catch (error) {
    console.error('Error al eliminar formulario:', error);
    res.status(500).json({ success: false, error: 'Error al eliminar formulario' });
  }
};

// Submissions
const getFormSubmissions = async (req, res) => {
  try {
    const { public_form_id, submission_status, page = 1, limit = 20 } = req.query;
    const filters = {
      public_form_id: public_form_id ? parseInt(public_form_id) : null,
      submission_status,
      limit: parseInt(limit),
      offset: (parseInt(page) - 1) * parseInt(limit)
    };
    const [submissions, total] = await Promise.all([getAllFormSubmissions(filters), countFormSubmissions(filters)]);
    res.json({ success: true, data: submissions, pagination: { total, page: parseInt(page), limit: parseInt(limit), totalPages: Math.ceil(total / parseInt(limit)) } });
  } catch (error) {
    console.error('Error al obtener envíos:', error);
    res.status(500).json({ success: false, error: 'Error al obtener envíos' });
  }
};

const getFormSubmission = async (req, res) => {
  try {
    const submission = await getFormSubmissionById(parseInt(req.params.id));
    if (!submission) return res.status(404).json({ success: false, error: 'Envío no encontrado' });
    res.json({ success: true, data: submission });
  } catch (error) {
    console.error('Error al obtener envío:', error);
    res.status(500).json({ success: false, error: 'Error al obtener envío' });
  }
};

const createNewFormSubmission = async (req, res) => {
  try {
    const newSubmission = await createFormSubmission(req.body);
    res.status(201).json({ success: true, message: 'Envío creado exitosamente', data: newSubmission });
  } catch (error) {
    console.error('Error al crear envío:', error);
    res.status(500).json({ success: false, error: 'Error al crear envío' });
  }
};

const updateExistingFormSubmission = async (req, res) => {
  try {
    const updated = await updateFormSubmission(parseInt(req.params.id), req.body, req.user.user_id);
    if (!updated) return res.status(404).json({ success: false, error: 'Envío no encontrado' });
    res.json({ success: true, message: 'Envío actualizado exitosamente', data: updated });
  } catch (error) {
    console.error('Error al actualizar envío:', error);
    res.status(500).json({ success: false, error: 'Error al actualizar envío' });
  }
};

const deleteExistingFormSubmission = async (req, res) => {
  try {
    const deleted = await deleteFormSubmission(parseInt(req.params.id), req.user.user_id);
    if (!deleted) return res.status(404).json({ success: false, error: 'Envío no encontrado' });
    res.json({ success: true, message: 'Envío eliminado exitosamente' });
  } catch (error) {
    console.error('Error al eliminar envío:', error);
    res.status(500).json({ success: false, error: 'Error al eliminar envío' });
  }
};

module.exports = {
  getPublicForms,
  getPublicForm,
  createNewPublicForm,
  updateExistingPublicForm,
  deleteExistingPublicForm,
  getFormSubmissions,
  getFormSubmission,
  createNewFormSubmission,
  updateExistingFormSubmission,
  deleteExistingFormSubmission
};
