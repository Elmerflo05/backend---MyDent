const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const verificarToken = require('../middleware/authMiddleware');
const {
  getPrices,
  upsertPrice,
  bulkUpsert,
  deletePrice,
  downloadTemplate,
  importFromExcel,
  extendValidity,
  getValidityHistory
} = require('../controllers/companyCorporatePricingController');

// Middleware para validar roles permitidos (admin y super_admin)
const verificarRolesPermitidos = (req, res, next) => {
  const rol = req.user?.role_id;
  if (![1, 2].includes(rol)) {
    return res.status(403).json({ mensaje: 'Acceso denegado: Rol no autorizado' });
  }
  next();
};

const excelFileFilter = (req, file, cb) => {
  const allowedMimeTypes = [
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-excel'
  ];
  const allowedExtensions = ['.xlsx', '.xls'];
  const ext = path.extname(file.originalname).toLowerCase();

  if (allowedMimeTypes.includes(file.mimetype) || allowedExtensions.includes(ext)) {
    cb(null, true);
  } else {
    cb(new Error('Tipo de archivo no permitido. Solo se permiten archivos Excel (.xlsx).'), false);
  }
};

const uploadExcel = multer({
  storage: multer.memoryStorage(),
  fileFilter: excelFileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB maximo
  }
});

// Aplicar middlewares a todas las rutas
router.use(verificarToken);
router.use(verificarRolesPermitidos);

// Precios corporativos
router.get('/:companyId/prices', getPrices);
router.post('/:companyId/prices', upsertPrice);
router.post('/:companyId/prices/bulk', bulkUpsert);
router.delete('/:companyId/prices/:priceId', deletePrice);

// Plantilla Excel
router.get('/:companyId/template', downloadTemplate);
router.post('/:companyId/import', uploadExcel.single('file'), importFromExcel);

// Vigencia
router.post('/:companyId/extend-validity', extendValidity);
router.get('/:companyId/validity-history', getValidityHistory);

module.exports = router;
