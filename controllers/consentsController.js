const {
  getAllConsentTemplates,
  getConsentTemplateById,
  createConsentTemplate,
  updateConsentTemplate,
  deleteConsentTemplate,
  getAllSignedConsents,
  getSignedConsentById,
  createSignedConsent,
  deleteSignedConsent,
  countConsentTemplates,
  countSignedConsents
} = require('../models/consentsModel');

const PATIENT_ROLE_ID = 6;

// Templates
const getConsentTemplates = async (req, res) => {
  try {
    const { consent_type, search, page = 1, limit = 20 } = req.query;
    const filters = { consent_type, search, limit: parseInt(limit), offset: (parseInt(page) - 1) * parseInt(limit) };
    const [templates, total] = await Promise.all([getAllConsentTemplates(filters), countConsentTemplates(filters)]);
    res.json({ success: true, data: templates, pagination: { total, page: parseInt(page), limit: parseInt(limit), totalPages: Math.ceil(total / parseInt(limit)) } });
  } catch (error) {
    console.error('Error al obtener plantillas:', error);
    res.status(500).json({ success: false, error: 'Error al obtener plantillas' });
  }
};

const getConsentTemplate = async (req, res) => {
  try {
    const template = await getConsentTemplateById(parseInt(req.params.id));
    if (!template) return res.status(404).json({ success: false, error: 'Plantilla no encontrada' });
    res.json({ success: true, data: template });
  } catch (error) {
    console.error('Error al obtener plantilla:', error);
    res.status(500).json({ success: false, error: 'Error al obtener plantilla' });
  }
};

const createNewConsentTemplate = async (req, res) => {
  try {
    if (!req.body.template_name || !req.body.template_content) {
      return res.status(400).json({ success: false, error: 'Faltan campos requeridos' });
    }
    const newTemplate = await createConsentTemplate(req.body, req.user.user_id);
    res.status(201).json({ success: true, message: 'Plantilla creada exitosamente', data: newTemplate });
  } catch (error) {
    console.error('Error al crear plantilla:', error);
    res.status(500).json({ success: false, error: 'Error al crear plantilla' });
  }
};

const updateExistingConsentTemplate = async (req, res) => {
  try {
    const updated = await updateConsentTemplate(parseInt(req.params.id), req.body, req.user.user_id);
    if (!updated) return res.status(404).json({ success: false, error: 'Plantilla no encontrada' });
    res.json({ success: true, message: 'Plantilla actualizada exitosamente', data: updated });
  } catch (error) {
    console.error('Error al actualizar plantilla:', error);
    res.status(500).json({ success: false, error: 'Error al actualizar plantilla' });
  }
};

const deleteExistingConsentTemplate = async (req, res) => {
  try {
    const deleted = await deleteConsentTemplate(parseInt(req.params.id), req.user.user_id);
    if (!deleted) return res.status(404).json({ success: false, error: 'Plantilla no encontrada' });
    res.json({ success: true, message: 'Plantilla eliminada exitosamente' });
  } catch (error) {
    console.error('Error al eliminar plantilla:', error);
    res.status(500).json({ success: false, error: 'Error al eliminar plantilla' });
  }
};

// Signed Consents
const getSignedConsents = async (req, res) => {
  try {
    const { patient_id, consent_template_id, page = 1, limit = 20 } = req.query;
    const isPatient = req.user?.role_id === PATIENT_ROLE_ID;
    const effectivePatientId = isPatient ? req.user?.patient_id : (patient_id ? parseInt(patient_id) : null);
    const filters = {
      patient_id: effectivePatientId,
      consent_template_id: consent_template_id ? parseInt(consent_template_id) : null,
      limit: parseInt(limit),
      offset: (parseInt(page) - 1) * parseInt(limit)
    };
    const [consents, total] = await Promise.all([getAllSignedConsents(filters), countSignedConsents(filters)]);
    res.json({ success: true, data: consents, pagination: { total, page: parseInt(page), limit: parseInt(limit), totalPages: Math.ceil(total / parseInt(limit)) } });
  } catch (error) {
    console.error('Error al obtener consentimientos:', error);
    res.status(500).json({ success: false, error: 'Error al obtener consentimientos' });
  }
};

const getSignedConsent = async (req, res) => {
  try {
    const consent = await getSignedConsentById(parseInt(req.params.id));
    if (!consent) return res.status(404).json({ success: false, error: 'Consentimiento no encontrado' });
    if (req.user?.role_id === PATIENT_ROLE_ID && consent.patient_id !== req.user?.patient_id) {
      return res.status(403).json({ success: false, error: 'Acceso denegado al consentimiento' });
    }
    res.json({ success: true, data: consent });
  } catch (error) {
    console.error('Error al obtener consentimiento:', error);
    res.status(500).json({ success: false, error: 'Error al obtener consentimiento' });
  }
};

const createNewSignedConsent = async (req, res) => {
  try {
    if (!req.body.patient_id || !req.body.consent_content) {
      return res.status(400).json({ success: false, error: 'Faltan campos requeridos' });
    }
    const newConsent = await createSignedConsent(req.body, req.user.user_id);
    res.status(201).json({ success: true, message: 'Consentimiento creado exitosamente', data: newConsent });
  } catch (error) {
    console.error('Error al crear consentimiento:', error);
    res.status(500).json({ success: false, error: 'Error al crear consentimiento' });
  }
};

const deleteExistingSignedConsent = async (req, res) => {
  try {
    const consentId = parseInt(req.params.id);
    const existing = await getSignedConsentById(consentId);
    const deleted = await deleteSignedConsent(consentId, req.user.user_id);
    if (!deleted) return res.status(404).json({ success: false, error: 'Consentimiento no encontrado' });

    if (global.io && existing?.patient_id) {
      global.io.to(`patient-${existing.patient_id}`).emit('consent-deleted', {
        signed_consent_id: consentId,
        patient_id: existing.patient_id,
        timestamp: new Date().toISOString()
      });
    }

    res.json({ success: true, message: 'Consentimiento eliminado exitosamente' });
  } catch (error) {
    console.error('Error al eliminar consentimiento:', error);
    res.status(500).json({ success: false, error: 'Error al eliminar consentimiento' });
  }
};

module.exports = {
  getConsentTemplates,
  getConsentTemplate,
  createNewConsentTemplate,
  updateExistingConsentTemplate,
  deleteExistingConsentTemplate,
  getSignedConsents,
  getSignedConsent,
  createNewSignedConsent,
  deleteExistingSignedConsent
};
