const express = require('express');
const router = express.Router();
const verificarToken = require('../middleware/authMiddleware');
const {
  getPatientDocuments,
  getPatientDocument,
  createNewPatientDocument,
  updateExistingPatientDocument,
  deleteExistingPatientDocument
} = require('../controllers/patientDocumentsController');

// Solo staff (1: super_admin, 2: admin, 3: doctor, 4: receptionist, 5: imaging_tech)
// El paciente lista sus documentos vía /api/patient-portal/my-documents
const verificarRolesPermitidos = (req, res, next) => {
  const rol = req.user?.role_id;
  if (![1, 2, 3, 4, 5].includes(rol)) {
    return res.status(403).json({ mensaje: 'Acceso denegado: Rol no autorizado' });
  }
  next();
};

router.use(verificarToken);
router.use(verificarRolesPermitidos);

router.get('/', getPatientDocuments);
router.get('/:id', getPatientDocument);
router.post('/', createNewPatientDocument);
router.put('/:id', updateExistingPatientDocument);
router.delete('/:id', deleteExistingPatientDocument);

module.exports = router;
