const express = require('express');
const router = express.Router();
const verificarToken = require('../middleware/authMiddleware');
const { uploadContractFile, uploadClientContract } = require('../config/multerConfig');
const { s3Upload } = require('../middleware/s3UploadMiddleware');
const {
  getPatientContracts,
  getPatientContract,
  createNewPatientContract,
  updateExistingPatientContract,
  deleteExistingPatientContract,
  assignContract,
  getMyContracts,
  signMyContract
} = require('../controllers/patientContractsController');

// Middleware de autenticación para todas las rutas
router.use(verificarToken);

// Middleware de autorización - Roles de administración
// 1: Super Admin, 2: Admin, 3: Doctor, 4: Recepcionista, 5: Técnico Imagen
const verificarRolesAdmin = (req, res, next) => {
  const rol = req.user?.role_id;
  if (![1, 2, 3, 4, 5].includes(rol)) {
    return res.status(403).json({ mensaje: 'Acceso denegado: Rol no autorizado para administrar contratos' });
  }
  next();
};

// Middleware para pacientes - Solo rol 6 (Paciente)
const verificarRolPaciente = (req, res, next) => {
  const rol = req.user?.role_id;
  if (rol !== 6) {
    return res.status(403).json({ mensaje: 'Acceso denegado: Solo para pacientes' });
  }
  next();
};

// =====================
// RUTAS PARA PACIENTES
// =====================

// GET - Obtener mis contratos (solo para pacientes - usa patient_id del token)
router.get('/my-contracts', verificarRolPaciente, getMyContracts);

// POST - Firmar un contrato (solo para pacientes)
router.post('/sign/:id', verificarRolPaciente, signMyContract);

// =====================
// RUTAS PARA ADMINS
// =====================

// GET - Obtener todos los contratos (con filtros y paginación)
router.get('/', verificarRolesAdmin, getPatientContracts);

// GET - Obtener un contrato por ID
router.get('/:id', verificarRolesAdmin, getPatientContract);

// POST - Crear nuevo contrato manual (con archivo PDF)
router.post('/', verificarRolesAdmin, uploadClientContract.single('contract_file'), s3Upload('clients_contracts', { prefix: 'client_contract' }), createNewPatientContract);

// POST - Asignar contrato desde plantilla a un paciente (con archivo opcional)
router.post('/assign', verificarRolesAdmin, uploadContractFile.single('contract_file'), s3Upload('contracts', { prefix: 'contract' }), assignContract);

// PUT - Actualizar contrato existente
router.put('/:id', verificarRolesAdmin, updateExistingPatientContract);

// DELETE - Eliminar contrato (soft delete)
router.delete('/:id', verificarRolesAdmin, deleteExistingPatientContract);

module.exports = router;
