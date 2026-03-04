/**
 * Pricing Controller
 * Controlador para el servicio de precios segun planes de salud
 */

const {
  getPatientActivePlan,
  calculateSubProcedurePrice,
  calculateSubProcedurePriceByCode,
  calculateMultipleSubProcedurePrices,
  isFirstFreeConsultationAvailable,
  useFirstFreeConsultation,
  getPatientCoverageSummary
} = require('../services/pricingService');

/**
 * Obtener plan activo de un paciente
 */
const getActivePlan = async (req, res) => {
  try {
    const { patientId } = req.params;

    const plan = await getPatientActivePlan(parseInt(patientId));

    res.json({
      success: true,
      has_active_plan: plan !== null,
      data: plan
    });
  } catch (error) {
    console.error('Error al obtener plan activo:', error);
    res.status(500).json({
      success: false,
      error: 'Error al obtener plan activo'
    });
  }
};

/**
 * Calcular precio de un sub-procedimiento
 */
const calculatePrice = async (req, res) => {
  try {
    const { subProcedureId, patientId } = req.params;

    const priceInfo = await calculateSubProcedurePrice(
      parseInt(subProcedureId),
      parseInt(patientId)
    );

    res.json({
      success: true,
      data: priceInfo
    });
  } catch (error) {
    console.error('Error al calcular precio:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Error al calcular precio'
    });
  }
};

/**
 * Calcular precio por codigo de sub-procedimiento
 */
const calculatePriceByCode = async (req, res) => {
  try {
    const { code, patientId } = req.params;

    const priceInfo = await calculateSubProcedurePriceByCode(
      code,
      parseInt(patientId)
    );

    res.json({
      success: true,
      data: priceInfo
    });
  } catch (error) {
    console.error('Error al calcular precio por codigo:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Error al calcular precio'
    });
  }
};

/**
 * Calcular precios de multiples sub-procedimientos
 */
const calculateMultiplePrices = async (req, res) => {
  try {
    const { patientId } = req.params;
    const { sub_procedure_ids } = req.body;

    if (!sub_procedure_ids || !Array.isArray(sub_procedure_ids)) {
      return res.status(400).json({
        success: false,
        error: 'Se requiere un array de IDs de sub-procedimientos'
      });
    }

    const priceInfo = await calculateMultipleSubProcedurePrices(
      sub_procedure_ids.map(id => parseInt(id)),
      parseInt(patientId)
    );

    res.json({
      success: true,
      data: priceInfo
    });
  } catch (error) {
    console.error('Error al calcular precios multiples:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Error al calcular precios'
    });
  }
};

/**
 * Verificar disponibilidad de primera consulta gratis
 */
const checkFirstFreeConsultation = async (req, res) => {
  try {
    const { patientId } = req.params;

    const result = await isFirstFreeConsultationAvailable(parseInt(patientId));

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('Error al verificar primera consulta:', error);
    res.status(500).json({
      success: false,
      error: 'Error al verificar'
    });
  }
};

/**
 * Usar primera consulta gratis
 */
const useFirstConsultation = async (req, res) => {
  try {
    const { patientId } = req.params;

    const result = await useFirstFreeConsultation(
      parseInt(patientId),
      req.user.user_id
    );

    res.json({
      success: true,
      message: 'Primera consulta gratis marcada como utilizada',
      data: result
    });
  } catch (error) {
    console.error('Error al usar primera consulta:', error);
    res.status(400).json({
      success: false,
      error: error.message || 'Error al procesar'
    });
  }
};

/**
 * Obtener resumen de cobertura de un paciente
 * (Para mostrar al dentista cuando atiende)
 */
const getCoverageSummary = async (req, res) => {
  try {
    const { patientId } = req.params;

    const summary = await getPatientCoverageSummary(parseInt(patientId));

    res.json({
      success: true,
      data: summary
    });
  } catch (error) {
    console.error('Error al obtener resumen de cobertura:', error);
    res.status(500).json({
      success: false,
      error: 'Error al obtener resumen'
    });
  }
};

module.exports = {
  getActivePlan,
  calculatePrice,
  calculatePriceByCode,
  calculateMultiplePrices,
  checkFirstFreeConsultation,
  useFirstConsultation,
  getCoverageSummary
};
