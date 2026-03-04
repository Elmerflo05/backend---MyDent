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

const verificarRolesPermitidos = (req, res, next) => {
  const rol = req.user?.role_id;
  if (![1, 2, 3, 4, 5, 6].includes(rol)) {
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
