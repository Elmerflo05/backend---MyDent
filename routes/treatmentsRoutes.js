const express = require('express');
const router = express.Router();
const verificarToken = require('../middleware/authMiddleware');
const {
  getTreatments,
  getTreatment,
  createNewTreatment,
  updateExistingTreatment,
  deleteExistingTreatment
} = require('../controllers/treatmentsController');

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

// Rutas de tratamientos
router.get('/', getTreatments);
router.get('/:id', getTreatment);
router.post('/', createNewTreatment);
router.put('/:id', updateExistingTreatment);
router.delete('/:id', deleteExistingTreatment);

module.exports = router;
