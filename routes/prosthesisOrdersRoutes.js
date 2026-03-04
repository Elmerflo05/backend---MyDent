const express = require('express');
const router = express.Router();
const verificarToken = require('../middleware/authMiddleware');
const {
  getProsthesisOrders,
  getProsthesisOrder,
  createNewProsthesisOrder,
  updateExistingProsthesisOrder,
  deleteExistingProsthesisOrder
} = require('../controllers/prosthesisOrdersController');

const verificarRolesPermitidos = (req, res, next) => {
  const rol = req.user?.role_id;
  if (![1, 2, 3, 4, 5, 6].includes(rol)) {
    return res.status(403).json({ mensaje: 'Acceso denegado: Rol no autorizado' });
  }
  next();
};

router.use(verificarToken);
router.use(verificarRolesPermitidos);

router.get('/', getProsthesisOrders);
router.get('/:id', getProsthesisOrder);
router.post('/', createNewProsthesisOrder);
router.put('/:id', updateExistingProsthesisOrder);
router.delete('/:id', deleteExistingProsthesisOrder);

module.exports = router;
