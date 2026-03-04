const express = require('express');
const router = express.Router();
const verificarToken = require('../middleware/authMiddleware');
const {
  getDentalProcedures,
  getDentalProcedure,
  createNewDentalProcedure,
  updateExistingDentalProcedure,
  deleteExistingDentalProcedure
} = require('../controllers/dentalProceduresController');

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

// Rutas de procedimientos dentales
router.get('/', getDentalProcedures);
router.get('/:id', getDentalProcedure);
router.post('/', createNewDentalProcedure);
router.put('/:id', updateExistingDentalProcedure);
router.delete('/:id', deleteExistingDentalProcedure);

module.exports = router;
