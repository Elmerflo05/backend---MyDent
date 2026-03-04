const express = require('express');
const router = express.Router();
const verificarToken = require('../middleware/authMiddleware');
const {
  getBranches,
  getBranch,
  createNewBranch,
  updateExistingBranch,
  deleteExistingBranch
} = require('../controllers/branchesController');

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

// Rutas de sedes
router.get('/', getBranches);
router.get('/:id', getBranch);
router.post('/', createNewBranch);
router.put('/:id', updateExistingBranch);
router.delete('/:id', deleteExistingBranch);

module.exports = router;
