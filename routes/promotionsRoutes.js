const express = require('express');
const router = express.Router();
const verificarToken = require('../middleware/authMiddleware');
const {
  getPromotions,
  getPromotion,
  createNewPromotion,
  updateExistingPromotion,
  deleteExistingPromotion,
  usePromotion,
  validatePromotionEndpoint,
  applyPromotionEndpoint,
  getAvailablePromotionsEndpoint,
  checkStackableEndpoint
} = require('../controllers/promotionsController');

// Middleware para validar roles con permiso de lectura (incluyendo Pacientes)
const verificarRolesLectura = (req, res, next) => {
  const rol = req.user?.role_id;
  if (![1, 2, 3, 4, 5, 6, 7].includes(rol)) {
    return res.status(403).json({ mensaje: 'Acceso denegado: Rol no autorizado' });
  }
  next();
};

// Middleware para validar roles con permiso de escritura (solo admin)
const verificarRolesEscritura = (req, res, next) => {
  const rol = req.user?.role_id;
  if (![1, 2, 3, 4, 5, 6].includes(rol)) {
    return res.status(403).json({ mensaje: 'Acceso denegado: Solo usuarios administrativos pueden modificar promociones' });
  }
  next();
};

// Aplicar autenticacion a todas las rutas
router.use(verificarToken);

// Rutas de LECTURA (Pacientes pueden acceder)
router.get('/', verificarRolesLectura, getPromotions);
router.get('/available-for-procedure', verificarRolesLectura, getAvailablePromotionsEndpoint);
router.get('/can-stack', verificarRolesLectura, checkStackableEndpoint);
router.get('/:id', verificarRolesLectura, getPromotion);

// Rutas de VALIDACION Y APLICACION (Pacientes y admin pueden usar)
router.post('/validate', verificarRolesLectura, validatePromotionEndpoint);
router.post('/apply', verificarRolesLectura, applyPromotionEndpoint);

// Rutas de ESCRITURA (Solo admin)
router.post('/', verificarRolesEscritura, createNewPromotion);
router.put('/:id', verificarRolesEscritura, updateExistingPromotion);
router.put('/:id/use', verificarRolesEscritura, usePromotion);
router.delete('/:id', verificarRolesEscritura, deleteExistingPromotion);

module.exports = router;
