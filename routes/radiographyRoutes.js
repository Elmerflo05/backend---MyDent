const express = require('express');
const router = express.Router();
const verificarToken = require('../middleware/authMiddleware');
const { uploadRadiographyResults } = require('../config/multerConfig');
const { s3Upload } = require('../middleware/s3UploadMiddleware');
const path = require('path');
const {
  getRadiographyRequests,
  getRadiographyRequest,
  createNewRadiographyRequest,
  updateExistingRadiographyRequest,
  deleteExistingRadiographyRequest,
  upsertRadiographyRequestHandler,
  approvePricingHandler,
  rejectPricingHandler,
  counterOfferHandler,
  markDeliveredHandler,
  uploadResultsHandler,
  getResultsHandler,
  determineUploadSource,
  // Handlers para pagos externos
  setFinalPriceHandler,
  registerPaymentHandler,
  getPaymentInfoHandler,
  getAllExternalPaymentsHandler
} = require('../controllers/radiographyController');

// Middleware para validar los roles permitidos
// 1=super_admin, 2=admin, 3=dentist, 4=receptionist, 5=imaging_technician, 8=external_client
const verificarRolesPermitidos = (req, res, next) => {
  const rol = req.user?.role_id;
  if (![1, 2, 3, 4, 5, 7].includes(rol)) {
    return res.status(403).json({ mensaje: 'Acceso denegado: Rol no autorizado' });
  }
  next();
};

// Middleware para restringir acciones de modificación/eliminación (solo staff interno)
// NOTA: external_client (8) SÍ puede CREAR solicitudes, pero NO puede modificar/eliminar
const verificarRolModificacion = (req, res, next) => {
  const rol = req.user?.role_id;
  // external_client (8) no puede modificar ni eliminar
  if (rol === 8) {
    return res.status(403).json({ mensaje: 'Acceso denegado: No puede modificar solicitudes' });
  }
  next();
};

// Aplicar middlewares a todas las rutas
router.use(verificarToken);
router.use(verificarRolesPermitidos);

// Rutas de lectura (accesibles para external_client)
router.get('/', getRadiographyRequests);

// GET /api/radiography/external-payments - Obtener todos los pagos externos (admin/recepcionista)
// IMPORTANTE: Esta ruta debe ir ANTES de /:id para evitar conflictos
router.get('/external-payments', getAllExternalPaymentsHandler);

router.get('/:id', getRadiographyRequest);

// Rutas específicas para aprobación/rechazo de cotización (external_client puede usar)
router.post('/:id/approve-pricing', approvePricingHandler);
router.post('/:id/reject-pricing', rejectPricingHandler);

// Ruta para contraoferta de precio (solo técnico de imagen o super admin)
router.post('/:id/counter-offer', counterOfferHandler);

// Ruta para marcar como entregada (cuando el cliente visualiza los resultados)
// Permite: external_client (su propia solicitud), imaging_technician, super_admin
router.post('/:id/mark-delivered', markDeliveredHandler);

// Rutas para subir y obtener resultados de radiografías (solo staff interno)
// POST /api/radiography/:id/upload-results - Subir resultados (imágenes, documentos, enlaces)
// El middleware determineUploadSource determina si es solicitud externa o interna
// para guardar los archivos en la carpeta correcta (external requests / internal requests)
// Resolver carpeta S3 dinamicamente segun tipo de archivo y source (external/internal)
const radiographyFolderResolver = (req, file) => {
  const imageTypes = ['image/jpeg', 'image/jpg', 'image/png', 'application/dicom'];
  const imageExtensions = ['.jpg', '.jpeg', '.png', '.dcm'];
  const ext = path.extname(file.originalname).toLowerCase();
  const isImage = imageTypes.includes(file.mimetype) || imageExtensions.includes(ext);
  const baseFolder = req.uploadSource === 'external' ? 'external requests' : 'internal requests';
  return isImage ? `results/${baseFolder}/photos` : `results/${baseFolder}/files`;
};

router.post(
  '/:id/upload-results',
  verificarRolModificacion,
  determineUploadSource, // Determina el source ANTES de multer para usar la carpeta correcta
  uploadRadiographyResults.array('files', 30), // Acepta hasta 30 archivos en el campo 'files'
  s3Upload(null, { folderResolver: radiographyFolderResolver }),
  uploadResultsHandler
);

// GET /api/radiography/:id/results - Obtener resultados de una solicitud
router.get('/:id/results', getResultsHandler);

// Rutas para pagos de solicitudes externas (solo tecnico de imagen o admin)
// POST /api/radiography/:id/set-final-price - Establecer precio final
router.post('/:id/set-final-price', verificarRolModificacion, setFinalPriceHandler);
// POST /api/radiography/:id/register-payment - Registrar pago
router.post('/:id/register-payment', verificarRolModificacion, registerPaymentHandler);
// GET /api/radiography/:id/payment - Obtener info de pago
router.get('/:id/payment', getPaymentInfoHandler);

// Rutas de creación (external_client SÍ puede crear)
router.post('/', createNewRadiographyRequest);
router.post('/upsert', upsertRadiographyRequestHandler);

// Rutas de modificación/eliminación (solo staff interno, external_client NO puede)
router.put('/:id', verificarRolModificacion, updateExistingRadiographyRequest);
router.delete('/:id', verificarRolModificacion, deleteExistingRadiographyRequest);

module.exports = router;
