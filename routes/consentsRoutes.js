const express = require('express');
const router = express.Router();
const verificarToken = require('../middleware/authMiddleware');
const {
  getConsentTemplates,
  getConsentTemplate,
  createNewConsentTemplate,
  updateExistingConsentTemplate,
  deleteExistingConsentTemplate,
  getSignedConsents,
  getSignedConsent,
  createNewSignedConsent,
  deleteExistingSignedConsent
} = require('../controllers/consentsController');

// Roles permitidos para administrar consentimientos (crear, editar, eliminar)
// 1: super_admin, 2: admin, 3: doctor, 4: receptionist, 5: imaging_tech
const verificarRolesAdmin = (req, res, next) => {
  const rol = req.user?.role_id;
  if (![1, 2, 3, 4, 5].includes(rol)) {
    return res.status(403).json({ mensaje: 'Acceso denegado: Rol no autorizado' });
  }
  next();
};

// Roles permitidos para ver consentimientos
// 1-5: staff, 6: paciente (solo ve los propios; el filtro se fuerza en el controller)
const verificarRolesLectura = (req, res, next) => {
  const rol = req.user?.role_id;
  if (![1, 2, 3, 4, 5, 6].includes(rol)) {
    return res.status(403).json({ mensaje: 'Acceso denegado: Rol no autorizado' });
  }
  next();
};

router.use(verificarToken);

// Templates - Solo staff puede administrar, pacientes pueden ver
router.get('/templates', verificarRolesLectura, getConsentTemplates);
router.get('/templates/:id', verificarRolesLectura, getConsentTemplate);
router.post('/templates', verificarRolesAdmin, createNewConsentTemplate);
router.put('/templates/:id', verificarRolesAdmin, updateExistingConsentTemplate);
router.delete('/templates/:id', verificarRolesAdmin, deleteExistingConsentTemplate);

// Signed Consents - Pacientes pueden ver y crear (firmar), solo staff puede eliminar
router.get('/signed', verificarRolesLectura, getSignedConsents);
router.get('/signed/:id', verificarRolesLectura, getSignedConsent);
router.post('/signed', verificarRolesLectura, createNewSignedConsent);
router.delete('/signed/:id', verificarRolesAdmin, deleteExistingSignedConsent);

module.exports = router;
