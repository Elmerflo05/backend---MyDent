const express = require('express');
const router = express.Router();
const verificarToken = require('../middleware/authMiddleware');
const {
  getBudgets,
  getBudget,
  createNewBudget,
  updateExistingBudget,
  acceptExistingBudget,
  deleteExistingBudget,
  addDetailToBudget,
  removeDetailFromBudget
} = require('../controllers/budgetsController');

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

// Rutas de presupuestos
router.get('/', getBudgets);
router.get('/:id', getBudget);
router.post('/', createNewBudget);
router.put('/:id', updateExistingBudget);
router.put('/:id/accept', acceptExistingBudget);
router.delete('/:id', deleteExistingBudget);

// Rutas de detalles de presupuesto
router.post('/:id/details', addDetailToBudget);
router.delete('/details/:detailId', removeDetailFromBudget);

module.exports = router;
