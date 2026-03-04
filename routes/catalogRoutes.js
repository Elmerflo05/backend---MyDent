const express = require('express');
const verificarToken = require('../middleware/authMiddleware');
const createCatalogController = require('../controllers/catalogController');
const {
  gendersModel,
  bloodTypesModel,
  documentTypesModel,
  maritalStatusesModel,
  identificationTypesModel,
  medicationUnitsModel,
  userStatusesModel,
  diagnosisOptionsModel,
  appointmentStatusesModel,
  budgetStatusesModel,
  treatmentStatusesModel,
  treatmentPlanStatusesModel,
  reminderTypesModel,
  paymentMethodsModel,
  specialtiesModel,
  toothPositionsModel,
  toothSurfacesModel,
  prescriptionFrequenciesModel,
  prescriptionDurationsModel
} = require('../models/catalogModel');

// Middleware para validar los roles permitidos
const verificarRolesPermitidos = (req, res, next) => {
  const rol = req.user?.role_id;
  // Roles 1-6: acceso completo a catálogos
  // Rol 7 (paciente): solo lectura (GET)
  const rolesConAccesoCompleto = [1, 2, 3, 4, 5, 6];
  const rolesConAccesoLectura = [7]; // Pacientes solo pueden leer

  if (rolesConAccesoCompleto.includes(rol)) {
    return next();
  }

  if (rolesConAccesoLectura.includes(rol) && req.method === 'GET') {
    return next();
  }

  return res.status(403).json({ mensaje: 'Acceso denegado: Rol no autorizado' });
};

// Función para crear rutas de catálogo
const createCatalogRoutes = (model, entityName) => {
  const router = express.Router();
  const controller = createCatalogController(model, entityName);

  router.use(verificarToken);
  router.use(verificarRolesPermitidos);

  router.get('/', controller.getAll);
  router.get('/:id', controller.getById);
  router.post('/', controller.create);
  router.put('/:id', controller.update);
  router.delete('/:id', controller.delete);

  return router;
};

// Exportar rutas para todos los catálogos
module.exports = {
  gendersRoutes: createCatalogRoutes(gendersModel, 'Género'),
  bloodTypesRoutes: createCatalogRoutes(bloodTypesModel, 'Tipo de sangre'),
  documentTypesRoutes: createCatalogRoutes(documentTypesModel, 'Tipo de documento'),
  maritalStatusesRoutes: createCatalogRoutes(maritalStatusesModel, 'Estado civil'),
  identificationTypesRoutes: createCatalogRoutes(identificationTypesModel, 'Tipo de identificación'),
  medicationUnitsRoutes: createCatalogRoutes(medicationUnitsModel, 'Unidad de medicación'),
  userStatusesRoutes: createCatalogRoutes(userStatusesModel, 'Estado de usuario'),
  diagnosisOptionsRoutes: createCatalogRoutes(diagnosisOptionsModel, 'Opción de diagnóstico'),
  appointmentStatusesRoutes: createCatalogRoutes(appointmentStatusesModel, 'Estado de cita'),
  budgetStatusesRoutes: createCatalogRoutes(budgetStatusesModel, 'Estado de presupuesto'),
  treatmentStatusesRoutes: createCatalogRoutes(treatmentStatusesModel, 'Estado de tratamiento'),
  treatmentPlanStatusesRoutes: createCatalogRoutes(treatmentPlanStatusesModel, 'Estado de plan de tratamiento'),
  reminderTypesRoutes: createCatalogRoutes(reminderTypesModel, 'Tipo de recordatorio'),
  paymentMethodsRoutes: createCatalogRoutes(paymentMethodsModel, 'Método de pago'),
  specialtiesRoutes: createCatalogRoutes(specialtiesModel, 'Especialidad'),
  toothPositionsRoutes: createCatalogRoutes(toothPositionsModel, 'Posición dental'),
  toothSurfacesRoutes: createCatalogRoutes(toothSurfacesModel, 'Superficie dental'),
  prescriptionFrequenciesRoutes: createCatalogRoutes(prescriptionFrequenciesModel, 'Frecuencia de prescripción'),
  prescriptionDurationsRoutes: createCatalogRoutes(prescriptionDurationsModel, 'Duración de prescripción')
};
