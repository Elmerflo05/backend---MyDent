const express = require('express');
const router = express.Router();
const verificarToken = require('../middleware/authMiddleware');
const {
  getTreatmentNotes,
  getTreatmentNote,
  createNewTreatmentNote,
  updateExistingTreatmentNote,
  deleteExistingTreatmentNote
} = require('../controllers/treatmentNotesController');

// Middleware para validar los roles permitidos
const verificarRolesPermitidos = (req, res, next) => {
  const rol = req.user?.role_id;
  if (![1, 2, 3, 4, 5, 6].includes(rol)) {
    return res.status(403).json({ mensaje: 'Acceso denegado: Rol no autorizado' });
  }
  next();
};

// Aplicar middlewares a todas las rutas
router.use(verificarToken);
router.use(verificarRolesPermitidos);

// Rutas de notas de tratamiento
router.get('/', getTreatmentNotes);
router.get('/:id', getTreatmentNote);
router.post('/', createNewTreatmentNote);
router.put('/:id', updateExistingTreatmentNote);
router.delete('/:id', deleteExistingTreatmentNote);

module.exports = router;
