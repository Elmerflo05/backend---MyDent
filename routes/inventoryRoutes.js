const express = require('express');
const router = express.Router();
const verificarToken = require('../middleware/authMiddleware');
const {
  getInventoryItems,
  getInventoryItem,
  createNewInventoryItem,
  updateExistingInventoryItem,
  adjustItemQuantity,
  deleteExistingInventoryItem,
  getInventoryCategories,
  getInventoryCategory,
  createNewInventoryCategory,
  updateExistingInventoryCategory,
  deleteExistingInventoryCategory
} = require('../controllers/inventoryController');

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

// Rutas de items de inventario
router.get('/items', getInventoryItems);
router.get('/items/:id', getInventoryItem);
router.post('/items', createNewInventoryItem);
router.put('/items/:id', updateExistingInventoryItem);
router.put('/items/:id/adjust', adjustItemQuantity);
router.delete('/items/:id', deleteExistingInventoryItem);

// Rutas de categorías de inventario
router.get('/categories', getInventoryCategories);
router.get('/categories/:id', getInventoryCategory);
router.post('/categories', createNewInventoryCategory);
router.put('/categories/:id', updateExistingInventoryCategory);
router.delete('/categories/:id', deleteExistingInventoryCategory);

module.exports = router;
