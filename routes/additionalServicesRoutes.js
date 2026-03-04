const express = require('express');
const router = express.Router();
const additionalServicesController = require('../controllers/additionalServicesController');
const verificarToken = require('../middleware/authMiddleware');

/**
 * RUTAS DE SERVICIOS ADICIONALES
 * Endpoints para planes de ortodoncia, implantes dentales y protesis
 * Todas las rutas requieren autenticacion
 *
 * Base path: /api/additional-services
 */

// ============================================================
// ENDPOINT UNIFICADO - Todos los servicios en una sola peticion
// ============================================================

/**
 * @route   GET /api/additional-services/all
 * @desc    Obtener todos los servicios adicionales en una sola peticion
 * @access  Private (requiere token)
 * @returns {Object} - Planes de ortodoncia, implantes y items de protesis
 */
router.get('/all', verificarToken, additionalServicesController.getAllAdditionalServices);

// ============================================================
// PLANES DE ORTODONCIA
// ============================================================

/**
 * @route   GET /api/additional-services/orthodontic-plans
 * @desc    Obtener todos los planes de ortodoncia
 * @access  Private (requiere token)
 * @returns {Array} - Lista de planes: brackets_convencionales, autoligantes, zafiro, alineadores
 */
router.get('/orthodontic-plans', verificarToken, additionalServicesController.getOrthodonticPlans);

/**
 * @route   PUT /api/additional-services/orthodontic-plans
 * @desc    Actualizar todos los planes de ortodoncia de una vez
 * @access  Private (requiere token)
 * @body    {Array} plans - Array de planes a actualizar
 * @returns {Array} - Planes actualizados
 */
router.put('/orthodontic-plans', verificarToken, additionalServicesController.updateAllOrthodonticPlans);

/**
 * @route   PUT /api/additional-services/orthodontic-plans/:planType/:modality
 * @desc    Actualizar un plan de ortodoncia especifico
 * @access  Private (requiere token)
 * @param   {String} planType - Tipo de plan (brackets_convencionales, autoligantes, zafiro, alineadores)
 * @param   {String} modality - Modalidad (presupuesto_total, sin_presupuesto, sin_inicial)
 * @body    {Object} - { monto_total, inicial, pago_mensual }
 * @returns {Object} - Plan actualizado
 */
router.put(
  '/orthodontic-plans/:planType/:modality',
  verificarToken,
  additionalServicesController.updateOrthodonticPlan
);

// ============================================================
// PLANES DE IMPLANTES DENTALES
// ============================================================

/**
 * @route   GET /api/additional-services/implant-plans
 * @desc    Obtener todos los planes de implantes dentales
 * @access  Private (requiere token)
 * @returns {Array} - Lista de planes: inmediato, convencional, hibrido_superior, hibrido_inferior
 */
router.get('/implant-plans', verificarToken, additionalServicesController.getImplantPlans);

/**
 * @route   PUT /api/additional-services/implant-plans
 * @desc    Actualizar todos los planes de implantes de una vez
 * @access  Private (requiere token)
 * @body    {Array} plans - Array de planes a actualizar
 * @returns {Array} - Planes actualizados
 */
router.put('/implant-plans', verificarToken, additionalServicesController.updateAllImplantPlans);

/**
 * @route   PUT /api/additional-services/implant-plans/:planType
 * @desc    Actualizar un plan de implantes especifico
 * @access  Private (requiere token)
 * @param   {String} planType - Tipo de plan (inmediato, convencional, hibrido_superior, hibrido_inferior)
 * @body    {Object} - { monto_total, inicial, mensual }
 * @returns {Object} - Plan actualizado
 */
router.put(
  '/implant-plans/:planType',
  verificarToken,
  additionalServicesController.updateImplantPlan
);

// ============================================================
// ITEMS DE PROTESIS (Rehabilitacion Integral)
// ============================================================

/**
 * @route   GET /api/additional-services/prosthesis-items
 * @desc    Obtener todos los items de protesis
 * @access  Private (requiere token)
 * @returns {Array} - Lista de items con total y resumen
 */
router.get('/prosthesis-items', verificarToken, additionalServicesController.getProsthesisItems);

/**
 * @route   POST /api/additional-services/prosthesis-items
 * @desc    Crear un nuevo item de protesis
 * @access  Private (requiere token)
 * @body    {Object} - { item_number, treatment_projection, cost, display_order? }
 * @returns {Object} - Item creado
 */
router.post('/prosthesis-items', verificarToken, additionalServicesController.createProsthesisItem);

/**
 * @route   PUT /api/additional-services/prosthesis-items/replace-all
 * @desc    Reemplazar todos los items de protesis de una vez
 * @access  Private (requiere token)
 * @body    {Array} items - Array de items
 * @returns {Array} - Items insertados
 */
router.put(
  '/prosthesis-items/replace-all',
  verificarToken,
  additionalServicesController.replaceAllProsthesisItems
);

/**
 * @route   PUT /api/additional-services/prosthesis-items/:id
 * @desc    Actualizar un item de protesis existente
 * @access  Private (requiere token)
 * @param   {Number} id - ID del item
 * @body    {Object} - { item_number?, treatment_projection?, cost?, display_order? }
 * @returns {Object} - Item actualizado
 */
router.put(
  '/prosthesis-items/:id',
  verificarToken,
  additionalServicesController.updateProsthesisItem
);

/**
 * @route   DELETE /api/additional-services/prosthesis-items/:id
 * @desc    Eliminar un item de protesis (soft delete)
 * @access  Private (requiere token)
 * @param   {Number} id - ID del item
 * @returns {Object} - Item eliminado
 */
router.delete(
  '/prosthesis-items/:id',
  verificarToken,
  additionalServicesController.deleteProsthesisItem
);

// ============================================================
// SERVICIOS ADICIONALES DE CONSULTA (para finalizar y comisiones)
// ============================================================

/**
 * @route   GET /api/additional-services/consultation/:consultationId
 * @desc    Obtener servicios adicionales de una consulta con estado y pagos
 * @access  Private (requiere token)
 * @param   {Number} consultationId - ID de la consulta
 * @returns {Array} - Lista de servicios con estado, pagos realizados, etc.
 */
router.get(
  '/consultation/:consultationId',
  verificarToken,
  additionalServicesController.getConsultationServices
);

/**
 * @route   PUT /api/additional-services/consultation-service/:serviceId/complete
 * @desc    Finalizar un servicio adicional y generar ingreso para comision
 * @access  Private (requiere token)
 * @param   {Number} serviceId - ID del servicio adicional (consultation_additional_service_id)
 * @body    {String} notes - Notas opcionales de finalización
 * @returns {Object} - Servicio actualizado e ingreso generado
 *
 * IMPORTANTE:
 * - Cambia service_status a 'completed'
 * - Genera UN procedure_income con el monto TOTAL del servicio
 * - Ese ingreso se usa para calcular la comisión del doctor
 * - Las cuotas mensuales previas NO generan comisión, son solo cobros
 */
router.put(
  '/consultation-service/:serviceId/complete',
  verificarToken,
  additionalServicesController.completeConsultationService
);

module.exports = router;
