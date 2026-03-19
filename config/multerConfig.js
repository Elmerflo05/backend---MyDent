/**
 * Configuracion de Multer para subida de archivos
 * Usa memoryStorage para subir a S3 via middleware posterior
 */

const multer = require('multer');
const path = require('path');

// Storage en memoria (el buffer se sube a S3 en el middleware s3Upload)
const memoryStorage = multer.memoryStorage();

/**
 * Filtro de archivos para vouchers
 * Solo permite: JPG, JPEG, PNG, PDF
 */
const voucherFileFilter = (req, file, cb) => {
  const allowedMimeTypes = [
    'image/jpeg',
    'image/jpg',
    'image/png',
    'application/pdf'
  ];

  if (allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Tipo de archivo no permitido. Solo se permiten JPG, PNG o PDF.'), false);
  }
};

/**
 * Configuracion de Multer para vouchers
 */
const uploadVoucher = multer({
  storage: memoryStorage,
  fileFilter: voucherFileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB maximo
  }
});

/**
 * Filtro de archivos para vouchers de planes de salud
 * Solo permite: JPG, JPEG, PNG
 */
const voucherPlanFileFilter = (req, file, cb) => {
  const allowedMimeTypes = [
    'image/jpeg',
    'image/jpg',
    'image/png'
  ];

  if (allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Tipo de archivo no permitido. Solo se permiten JPG o PNG.'), false);
  }
};

/**
 * Configuracion de Multer para vouchers de planes de salud
 */
const uploadVoucherPlan = multer({
  storage: memoryStorage,
  fileFilter: voucherPlanFileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB maximo
  }
});

/**
 * Filtro combinado para imagenes y documentos de radiografias
 */
const radiographyResultsFileFilter = (req, file, cb) => {
  const imageTypes = ['image/jpeg', 'image/jpg', 'image/png', 'application/dicom'];
  const docTypes = [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ];
  const allowedExtensions = ['.jpg', '.jpeg', '.png', '.dcm', '.pdf', '.doc', '.docx'];
  const ext = path.extname(file.originalname).toLowerCase();

  if (imageTypes.includes(file.mimetype) || docTypes.includes(file.mimetype) || allowedExtensions.includes(ext)) {
    cb(null, true);
  } else {
    cb(new Error('Tipo de archivo no permitido. Solo se permiten JPG, PNG, DICOM, PDF o DOCX.'), false);
  }
};

/**
 * Configuracion de Multer para resultados de radiografias
 * Acepta multiples archivos (imagenes y documentos)
 */
const uploadRadiographyResults = multer({
  storage: memoryStorage,
  fileFilter: radiographyResultsFileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB maximo por archivo
    files: 30 // Maximo 30 archivos por solicitud
  }
});

/**
 * Filtro de archivos para examenes auxiliares
 * Permite: JPG, JPEG, PNG, GIF, PDF
 */
const auxiliaryExamFileFilter = (req, file, cb) => {
  const allowedMimeTypes = [
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/gif',
    'application/pdf'
  ];

  if (allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Tipo de archivo no permitido. Solo se permiten JPG, PNG, GIF o PDF.'), false);
  }
};

/**
 * Configuracion de Multer para archivos de examenes auxiliares
 */
const uploadAuxiliaryExamFiles = multer({
  storage: memoryStorage,
  fileFilter: auxiliaryExamFileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB maximo por archivo
  }
});

/**
 * Filtro de archivos para contratos
 * Permite: JPG, JPEG, PNG, PDF
 */
const contractFileFilter = (req, file, cb) => {
  const allowedMimeTypes = [
    'image/jpeg',
    'image/jpg',
    'image/png',
    'application/pdf'
  ];

  if (allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Tipo de archivo no permitido. Solo se permiten JPG, PNG o PDF.'), false);
  }
};

/**
 * Configuracion de Multer para archivos de contratos
 */
const uploadContractFile = multer({
  storage: memoryStorage,
  fileFilter: contractFileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB maximo
  }
});

/**
 * Filtro de archivos para contratos de clientes
 * Permite: PDF solamente
 */
const clientsContractFileFilter = (req, file, cb) => {
  const allowedMimeTypes = [
    'application/pdf'
  ];

  if (allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Tipo de archivo no permitido. Solo se permiten archivos PDF.'), false);
  }
};

/**
 * Configuracion de Multer para contratos de clientes
 */
const uploadClientContract = multer({
  storage: memoryStorage,
  fileFilter: clientsContractFileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB maximo
  }
});

/**
 * Filtro de archivos para examenes externos del paciente
 * Permite: JPG, JPEG, PNG, PDF
 */
const patientExternalExamsFileFilter = (req, file, cb) => {
  const allowedMimeTypes = [
    'image/jpeg',
    'image/jpg',
    'image/png',
    'application/pdf'
  ];

  if (allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Tipo de archivo no permitido. Solo se permiten JPG, PNG o PDF.'), false);
  }
};

/**
 * Configuracion de Multer para examenes externos del paciente
 */
const uploadPatientExternalExam = multer({
  storage: memoryStorage,
  fileFilter: patientExternalExamsFileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB maximo
  }
});

/**
 * Filtro de archivos para QR de métodos de pago
 * Solo permite: JPG, JPEG, PNG
 */
const qrImageFileFilter = (req, file, cb) => {
  const allowedMimeTypes = [
    'image/jpeg',
    'image/jpg',
    'image/png'
  ];

  if (allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Tipo de archivo no permitido. Solo se permiten JPG o PNG.'), false);
  }
};

/**
 * Configuracion de Multer para imagenes QR de metodos de pago
 */
const uploadQrImage = multer({
  storage: memoryStorage,
  fileFilter: qrImageFileFilter,
  limits: {
    fileSize: 2 * 1024 * 1024 // 2MB maximo
  }
});

module.exports = {
  uploadVoucher,
  uploadVoucherPlan,
  uploadRadiographyResults,
  uploadAuxiliaryExamFiles,
  uploadContractFile,
  uploadClientContract,
  uploadPatientExternalExam,
  uploadQrImage
};
