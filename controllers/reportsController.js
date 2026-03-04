const {
  getReportePorConsultorio,
  getReportePorEspecialidad,
  getReportePorDoctor,
  getEstadisticasConsultorios,
  getResumenConsultorios,
  getOverviewReport,
  getServicesReport,
  getPatientsReport
} = require('../models/reportsModel');

/**
 * Parsea el parámetro branchId con validación de seguridad
 * @param {string|undefined} branchId - Valor de query param
 * @param {Object} user - Usuario autenticado (opcional)
 * @returns {number|null} - ID numérico o null
 */
const parseBranchId = (branchId, user = null) => {
  // Si el usuario es admin de sede, siempre forzar su branchId
  if (user && user.role === 'admin' && user.branch_id) {
    return parseInt(user.branch_id);
  }

  // Super admin puede ver todas las sedes
  if (!branchId || branchId === 'all') {
    return null;
  }
  const parsed = parseInt(branchId);
  return isNaN(parsed) ? null : parsed;
};

/**
 * Calcula el rango de fechas por defecto (último mes)
 * @returns {Object} - Objeto con fechaInicio y fechaFin
 */
const getDefaultDateRange = () => {
  const fechaFin = new Date();
  const fechaInicio = new Date();
  fechaInicio.setMonth(fechaInicio.getMonth() - 1);
  return { fechaInicio, fechaFin };
};

/**
 * Parsea las fechas de query params
 * @param {string|undefined} fechaInicio - Fecha de inicio
 * @param {string|undefined} fechaFin - Fecha de fin
 * @returns {Object} - Objeto con fechas parseadas
 */
const parseDateRange = (fechaInicio, fechaFin) => {
  const defaults = getDefaultDateRange();

  const parsedInicio = fechaInicio ? new Date(fechaInicio) : defaults.fechaInicio;
  const parsedFin = fechaFin ? new Date(fechaFin) : defaults.fechaFin;

  return {
    fechaInicio: parsedInicio,
    fechaFin: parsedFin
  };
};

/**
 * Obtiene el reporte por consultorio
 * GET /api/reports/consultorio
 */
const getReportePorConsultorioHandler = async (req, res) => {
  try {
    const branchId = parseBranchId(req.query.branchId, req.user);
    const { fechaInicio, fechaFin } = parseDateRange(req.query.fechaInicio, req.query.fechaFin);

    const resultado = await getReportePorConsultorio(branchId, fechaInicio, fechaFin);

    res.json({
      success: true,
      data: resultado
    });
  } catch (error) {
    console.error('Error en getReportePorConsultorioHandler:', error);
    res.status(500).json({
      success: false,
      error: 'Error al obtener el reporte por consultorio'
    });
  }
};

/**
 * Obtiene el reporte por especialidad
 * GET /api/reports/especialidad
 */
const getReportePorEspecialidadHandler = async (req, res) => {
  try {
    const branchId = parseBranchId(req.query.branchId, req.user);
    const { fechaInicio, fechaFin } = parseDateRange(req.query.fechaInicio, req.query.fechaFin);

    const resultado = await getReportePorEspecialidad(branchId, fechaInicio, fechaFin);

    res.json({
      success: true,
      data: resultado
    });
  } catch (error) {
    console.error('Error en getReportePorEspecialidadHandler:', error);
    res.status(500).json({
      success: false,
      error: 'Error al obtener el reporte por especialidad'
    });
  }
};

/**
 * Obtiene el reporte por doctor
 * GET /api/reports/doctor
 */
const getReportePorDoctorHandler = async (req, res) => {
  try {
    const branchId = parseBranchId(req.query.branchId, req.user);
    const { fechaInicio, fechaFin } = parseDateRange(req.query.fechaInicio, req.query.fechaFin);

    const resultado = await getReportePorDoctor(branchId, fechaInicio, fechaFin);

    res.json({
      success: true,
      data: resultado
    });
  } catch (error) {
    console.error('Error en getReportePorDoctorHandler:', error);
    res.status(500).json({
      success: false,
      error: 'Error al obtener el reporte por doctor'
    });
  }
};

/**
 * Obtiene estadísticas de consultorios
 * GET /api/reports/consultorios/estadisticas
 */
const getEstadisticasConsultoriosHandler = async (req, res) => {
  try {
    const branchId = parseBranchId(req.query.branchId, req.user);
    const { fechaInicio, fechaFin } = parseDateRange(req.query.fechaInicio, req.query.fechaFin);

    const resultado = await getEstadisticasConsultorios(branchId, fechaInicio, fechaFin);

    res.json({
      success: true,
      data: resultado
    });
  } catch (error) {
    console.error('Error en getEstadisticasConsultoriosHandler:', error);
    res.status(500).json({
      success: false,
      error: 'Error al obtener las estadísticas de consultorios'
    });
  }
};

/**
 * Obtiene resumen general de consultorios
 * GET /api/reports/consultorios/resumen
 */
const getResumenConsultoriosHandler = async (req, res) => {
  try {
    const branchId = parseBranchId(req.query.branchId, req.user);

    const resultado = await getResumenConsultorios(branchId);

    res.json({
      success: true,
      data: resultado
    });
  } catch (error) {
    console.error('Error en getResumenConsultoriosHandler:', error);
    res.status(500).json({
      success: false,
      error: 'Error al obtener el resumen de consultorios'
    });
  }
};

/**
 * Obtiene el reporte Overview (estadísticas generales)
 * GET /api/reports/overview
 */
const getOverviewReportHandler = async (req, res) => {
  try {
    const branchId = parseBranchId(req.query.branchId, req.user);
    const { fechaInicio, fechaFin } = parseDateRange(req.query.fechaInicio, req.query.fechaFin);

    const resultado = await getOverviewReport(branchId, fechaInicio, fechaFin);

    res.json({
      success: true,
      data: resultado
    });
  } catch (error) {
    console.error('Error en getOverviewReportHandler:', error);
    res.status(500).json({
      success: false,
      error: 'Error al obtener el reporte overview'
    });
  }
};

/**
 * Obtiene el reporte de Servicios
 * GET /api/reports/services
 */
const getServicesReportHandler = async (req, res) => {
  try {
    const branchId = parseBranchId(req.query.branchId, req.user);
    const { fechaInicio, fechaFin } = parseDateRange(req.query.fechaInicio, req.query.fechaFin);

    const resultado = await getServicesReport(branchId, fechaInicio, fechaFin);

    res.json({
      success: true,
      data: resultado
    });
  } catch (error) {
    console.error('Error en getServicesReportHandler:', error);
    res.status(500).json({
      success: false,
      error: 'Error al obtener el reporte de servicios'
    });
  }
};

/**
 * Obtiene el reporte de Pacientes
 * GET /api/reports/patients
 */
const getPatientsReportHandler = async (req, res) => {
  try {
    const branchId = parseBranchId(req.query.branchId, req.user);
    const { fechaInicio, fechaFin } = parseDateRange(req.query.fechaInicio, req.query.fechaFin);

    const resultado = await getPatientsReport(branchId, fechaInicio, fechaFin);

    res.json({
      success: true,
      data: resultado
    });
  } catch (error) {
    console.error('Error en getPatientsReportHandler:', error);
    res.status(500).json({
      success: false,
      error: 'Error al obtener el reporte de pacientes'
    });
  }
};

module.exports = {
  getReportePorConsultorioHandler,
  getReportePorEspecialidadHandler,
  getReportePorDoctorHandler,
  getEstadisticasConsultoriosHandler,
  getResumenConsultoriosHandler,
  getOverviewReportHandler,
  getServicesReportHandler,
  getPatientsReportHandler
};
