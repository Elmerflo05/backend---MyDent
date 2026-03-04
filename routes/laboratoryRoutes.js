const express = require('express');
const router = express.Router();
const verificarToken = require('../middleware/authMiddleware');
const {
  getLaboratoryRequests,
  getLaboratoryRequest,
  createNewLaboratoryRequest,
  updateExistingLaboratoryRequest,
  deleteExistingLaboratoryRequest,
  getLaboratoryServices,
  getLaboratoryService,
  createNewLaboratoryService,
  updateExistingLaboratoryService,
  deleteExistingLaboratoryService,
  // Nuevos endpoints para tabs internas/externas
  getInternalRequests,
  getExternalRequests,
  getRequestsStats
} = require('../controllers/laboratoryController');

// Middleware para validar los roles permitidos
// Roles: 1=super_admin, 2=admin, 3=doctor, 4=receptionist, 5=imaging_technician, 6=?, 8=external_client
const verificarRolesPermitidos = (req, res, next) => {
  const rol = req.user?.role_id;
  if (![1, 2, 3, 4, 5, 6, 7].includes(rol)) {
    return res.status(403).json({ mensaje: 'Acceso denegado: Rol no autorizado' });
  }
  next();
};

// Aplicar middlewares a todas las rutas
router.use(verificarToken);
router.use(verificarRolesPermitidos);

// Rutas para solicitudes internas/externas (tabs)
router.get('/requests/internal', getInternalRequests);
router.get('/requests/external', getExternalRequests);
router.get('/requests/stats', getRequestsStats);

// Rutas de solicitudes de laboratorio
router.get('/requests', getLaboratoryRequests);
router.get('/requests/:id', getLaboratoryRequest);
router.post('/requests', createNewLaboratoryRequest);
router.put('/requests/:id', updateExistingLaboratoryRequest);
router.delete('/requests/:id', deleteExistingLaboratoryRequest);

// Rutas de servicios de laboratorio
router.get('/services', getLaboratoryServices);
router.get('/services/:id', getLaboratoryService);
router.post('/services', createNewLaboratoryService);
router.put('/services/:id', updateExistingLaboratoryService);
router.delete('/services/:id', deleteExistingLaboratoryService);

module.exports = router;
