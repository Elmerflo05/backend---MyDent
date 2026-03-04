const express = require('express');
const router = express.Router();
const verificarToken = require('../middleware/authMiddleware');
const {
  getCompanies,
  getCompany,
  createNewCompany,
  updateExistingCompany,
  deleteExistingCompany,
  getCompanyByRuc,
  getCompanyContracts,
  getCompanyContract,
  createNewCompanyContract,
  updateExistingCompanyContract,
  deleteExistingCompanyContract
} = require('../controllers/companiesController');

// Ruta publica: busqueda por RUC (sin auth, para registro de pacientes)
router.get('/by-ruc/:ruc', getCompanyByRuc);

// Middleware para validar los roles permitidos
const verificarRolesPermitidos = (req, res, next) => {
  const rol = req.user?.role_id;
  if (![1, 2, 3, 4, 5, 6].includes(rol)) {
    return res.status(403).json({ mensaje: 'Acceso denegado: Rol no autorizado' });
  }
  next();
};

// Aplicar middlewares a todas las rutas autenticadas
router.use(verificarToken);
router.use(verificarRolesPermitidos);

// Rutas de empresas
router.get('/', getCompanies);
router.get('/:id', getCompany);
router.post('/', createNewCompany);
router.put('/:id', updateExistingCompany);
router.delete('/:id', deleteExistingCompany);

// Rutas de contratos
router.get('/contracts/all', getCompanyContracts);
router.get('/contracts/:id', getCompanyContract);
router.post('/contracts', createNewCompanyContract);
router.put('/contracts/:id', updateExistingCompanyContract);
router.delete('/contracts/:id', deleteExistingCompanyContract);

module.exports = router;
