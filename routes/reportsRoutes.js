const express = require('express');
const router = express.Router();
const verificarToken = require('../middleware/authMiddleware');
const {
  getReportePorConsultorioHandler,
  getReportePorEspecialidadHandler,
  getReportePorDoctorHandler,
  getEstadisticasConsultoriosHandler,
  getResumenConsultoriosHandler,
  getOverviewReportHandler,
  getServicesReportHandler,
  getPatientsReportHandler
} = require('../controllers/reportsController');

// Middleware para verificar roles autorizados para reportes
// role_id 1 = super_admin, role_id 2 = admin
const verificarRolReportes = (req, res, next) => {
  const rolesPermitidos = [1, 2];

  if (!req.user || !rolesPermitidos.includes(req.user.role_id)) {
    return res.status(403).json({
      success: false,
      error: 'Acceso denegado. Solo administradores pueden ver reportes.'
    });
  }

  // Si es admin de sede (role_id 2), forzar su branchId para evitar acceso a otras sedes
  if (req.user.role_id === 2 && req.user.branch_id) {
    req.query.branchId = req.user.branch_id.toString();
  }

  next();
};

// Aplicar middleware de autenticación y verificación de roles a todas las rutas
router.use(verificarToken);
router.use(verificarRolReportes);

/**
 * @route   GET /api/reports/consultorio
 * @desc    Obtiene reporte de citas por consultorio
 * @access  Private (requiere autenticación)
 * @query   branchId - ID de la sede (opcional, 'all' para todas)
 * @query   fechaInicio - Fecha de inicio (opcional, formato ISO)
 * @query   fechaFin - Fecha de fin (opcional, formato ISO)
 */
router.get('/consultorio', getReportePorConsultorioHandler);

/**
 * @route   GET /api/reports/especialidad
 * @desc    Obtiene reporte de citas por especialidad
 * @access  Private (requiere autenticación)
 * @query   branchId - ID de la sede (opcional, 'all' para todas)
 * @query   fechaInicio - Fecha de inicio (opcional, formato ISO)
 * @query   fechaFin - Fecha de fin (opcional, formato ISO)
 */
router.get('/especialidad', getReportePorEspecialidadHandler);

/**
 * @route   GET /api/reports/doctor
 * @desc    Obtiene reporte de citas por doctor
 * @access  Private (requiere autenticación)
 * @query   branchId - ID de la sede (opcional, 'all' para todas)
 * @query   fechaInicio - Fecha de inicio (opcional, formato ISO)
 * @query   fechaFin - Fecha de fin (opcional, formato ISO)
 */
router.get('/doctor', getReportePorDoctorHandler);

/**
 * @route   GET /api/reports/consultorios/estadisticas
 * @desc    Obtiene estadísticas detalladas de consultorios
 * @access  Private (requiere autenticación)
 * @query   branchId - ID de la sede (opcional, 'all' para todas)
 * @query   fechaInicio - Fecha de inicio (opcional, formato ISO)
 * @query   fechaFin - Fecha de fin (opcional, formato ISO)
 */
router.get('/consultorios/estadisticas', getEstadisticasConsultoriosHandler);

/**
 * @route   GET /api/reports/consultorios/resumen
 * @desc    Obtiene resumen general de consultorios
 * @access  Private (requiere autenticación)
 * @query   branchId - ID de la sede (opcional, 'all' para todas)
 */
router.get('/consultorios/resumen', getResumenConsultoriosHandler);

/**
 * @route   GET /api/reports/overview
 * @desc    Obtiene estadísticas generales (citas, pacientes, ingresos)
 * @access  Private (requiere autenticación)
 * @query   branchId - ID de la sede (opcional, 'all' para todas)
 * @query   fechaInicio - Fecha de inicio (opcional, formato ISO)
 * @query   fechaFin - Fecha de fin (opcional, formato ISO)
 */
router.get('/overview', getOverviewReportHandler);

/**
 * @route   GET /api/reports/services
 * @desc    Obtiene reporte de servicios (clínica y laboratorio)
 * @access  Private (requiere autenticación)
 * @query   branchId - ID de la sede (opcional, 'all' para todas)
 * @query   fechaInicio - Fecha de inicio (opcional, formato ISO)
 * @query   fechaFin - Fecha de fin (opcional, formato ISO)
 */
router.get('/services', getServicesReportHandler);

/**
 * @route   GET /api/reports/patients
 * @desc    Obtiene reporte de pacientes
 * @access  Private (requiere autenticación)
 * @query   branchId - ID de la sede (opcional, 'all' para todas)
 * @query   fechaInicio - Fecha de inicio (opcional, formato ISO)
 * @query   fechaFin - Fecha de fin (opcional, formato ISO)
 */
router.get('/patients', getPatientsReportHandler);

module.exports = router;
