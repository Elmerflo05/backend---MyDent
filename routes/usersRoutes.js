const express = require('express');
const router = express.Router();
const verificarToken = require('../middleware/authMiddleware');
const {
  getUsers,
  getUser,
  createNewUser,
  updateExistingUser,
  changePassword,
  deleteExistingUser,
  getAvailableAdmins
} = require('../controllers/usersController');

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

// Rutas de usuarios
router.get('/available-administrators', getAvailableAdmins);
router.get('/', getUsers);
router.get('/:id', getUser);
router.post('/', createNewUser);
router.put('/:id', updateExistingUser);
router.put('/:id/password', changePassword);
router.delete('/:id', deleteExistingUser);

module.exports = router;
