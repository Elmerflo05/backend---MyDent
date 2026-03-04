const express = require('express');
const router = express.Router();
const catalogsController = require('../controllers/catalogsController');
const odontogramConditionsController = require('../controllers/odontogramConditionsController');
const verificarToken = require('../middleware/authMiddleware');

/**
 * RUTAS DE CATÁLOGOS DEL ODONTOGRAMA
 * Endpoints para obtener todos los catálogos maestros
 * Todas las rutas requieren autenticación
 */

// ============================================================
// ENDPOINT UNIFICADO - Todos los catálogos en una sola petición
// ============================================================

/**
 * @route   GET /api/catalogs/all
 * @desc    Obtener todos los catálogos del odontograma en una sola petición
 * @access  Private (requiere token)
 * @returns {Object} - Todos los catálogos: surfaces, positions, statuses, diagnosis, procedures
 */
router.get('/all', verificarToken, catalogsController.getAllCatalogs);

/**
 * @route   GET /api/catalogs/statistics
 * @desc    Obtener estadísticas de todos los catálogos
 * @access  Private (requiere token)
 * @returns {Object} - Conteo de registros por cada catálogo
 */
router.get('/statistics', verificarToken, catalogsController.getCatalogStatistics);

// ============================================================
// TOOTH SURFACES (Superficies Dentales)
// ============================================================

/**
 * @route   GET /api/catalogs/tooth-surfaces
 * @desc    Obtener todas las superficies dentales
 * @access  Private (requiere token)
 * @returns {Array} - Lista de superficies: mesial, distal, oclusal, vestibular, palatino, raíz, cervical
 */
router.get('/tooth-surfaces', verificarToken, catalogsController.getToothSurfaces);

// ============================================================
// TOOTH POSITIONS (Posiciones Dentales)
// ============================================================

/**
 * @route   GET /api/catalogs/tooth-positions
 * @desc    Obtener todas las posiciones dentales (con filtros opcionales)
 * @access  Private (requiere token)
 * @query   {Boolean} is_adult - Filtrar por dientes adultos (true) o niños (false)
 * @query   {Number} quadrant - Filtrar por cuadrante (1, 2, 3, 4)
 * @query   {String} tooth_type - Filtrar por tipo (incisivo, canino, premolar, molar)
 * @returns {Array} - Lista de 52 posiciones (32 adultos + 20 niños)
 */
router.get('/tooth-positions', verificarToken, catalogsController.getToothPositions);

/**
 * @route   GET /api/catalogs/tooth-positions/:toothNumber
 * @desc    Obtener información de un diente específico por su número FDI
 * @access  Private (requiere token)
 * @param   {String} toothNumber - Número FDI del diente (ej: 11, 21, 51)
 * @returns {Object} - Información completa del diente
 */
router.get('/tooth-positions/:toothNumber', verificarToken, catalogsController.getToothPositionByNumber);

// ============================================================
// TREATMENT STATUSES (Estados de Tratamiento)
// ============================================================

/**
 * @route   GET /api/catalogs/treatment-statuses
 * @desc    Obtener todos los estados de tratamiento
 * @access  Private (requiere token)
 * @returns {Array} - Lista de estados: Pendiente, En Proceso, Completado, etc.
 */
router.get('/treatment-statuses', verificarToken, catalogsController.getTreatmentStatuses);

// ============================================================
// DIAGNOSIS OPTIONS (Condiciones/Diagnósticos Dentales)
// ============================================================

/**
 * @route   GET /api/catalogs/diagnosis-options
 * @desc    Obtener todas las opciones de diagnóstico (con filtros opcionales)
 * @access  Private (requiere token)
 * @query   {String} category - Filtrar por categoría (Patología, Tratamiento, Prótesis, Anomalía, Ortodoncia)
 * @query   {String} search - Buscar por nombre, código o descripción
 * @returns {Array} - Lista de 52+ condiciones dentales oficiales
 */
router.get('/diagnosis-options', verificarToken, catalogsController.getDiagnosisOptions);

/**
 * @route   GET /api/catalogs/diagnosis-options/by-category
 * @desc    Obtener opciones de diagnóstico agrupadas por categoría
 * @access  Private (requiere token)
 * @returns {Object} - Diagnósticos agrupados: { "Patología": [...], "Tratamiento": [...], ... }
 */
router.get('/diagnosis-options/by-category', verificarToken, catalogsController.getDiagnosisOptionsByCategory);

// ============================================================
// DENTAL PROCEDURES (Procedimientos Dentales)
// ============================================================

/**
 * @route   GET /api/catalogs/dental-procedures
 * @desc    Obtener todos los procedimientos dentales (con filtros opcionales)
 * @access  Private (requiere token)
 * @query   {String} category - Filtrar por categoría (Restauración, Endodoncia, Cirugía, etc.)
 * @query   {String} search - Buscar por nombre, código o descripción
 * @query   {Boolean} requires_anesthesia - Filtrar por si requiere anestesia
 * @returns {Array} - Lista de 80+ procedimientos con precios y duraciones
 */
router.get('/dental-procedures', verificarToken, catalogsController.getDentalProcedures);

/**
 * @route   GET /api/catalogs/dental-procedures/by-category
 * @desc    Obtener procedimientos dentales agrupados por categoría
 * @access  Private (requiere token)
 * @returns {Object} - Procedimientos agrupados: { "Restauración": [...], "Endodoncia": [...], ... }
 */
router.get('/dental-procedures/by-category', verificarToken, catalogsController.getDentalProceduresByCategory);

// ============================================================
// DENTAL CONDITIONS (Condiciones Dentales del Odontograma)
// ============================================================

/**
 * @route   GET /api/catalogs/dental-conditions/statistics
 * @desc    Obtener estadísticas de condiciones dentales
 * @access  Private (requiere token)
 * @returns {Object} - Estadísticas por categoría
 */
router.get('/dental-conditions/statistics', verificarToken, odontogramConditionsController.getDentalConditionsStatistics);

/**
 * @route   GET /api/catalogs/dental-conditions/by-category
 * @desc    Obtener condiciones dentales agrupadas por categoría
 * @access  Private (requiere token)
 * @returns {Object} - Condiciones agrupadas: { "patologia": [...], "tratamiento": [...], ... }
 */
router.get('/dental-conditions/by-category', verificarToken, odontogramConditionsController.getDentalConditionsByCategory);

/**
 * @route   GET /api/catalogs/dental-conditions/id/:id
 * @desc    Obtener una condición dental por ID
 * @access  Private (requiere token)
 * @param   {Number} id - ID de la condición
 * @returns {Object} - Condición dental completa
 */
router.get('/dental-conditions/id/:id', verificarToken, odontogramConditionsController.getDentalConditionById);

/**
 * @route   GET /api/catalogs/dental-conditions/:code
 * @desc    Obtener una condición dental por código
 * @access  Private (requiere token)
 * @param   {String} code - Código de la condición (ej: caries-cd, restauracion, corona-definitiva)
 * @returns {Object} - Condición dental completa con CIE-10, precios, especificaciones
 */
router.get('/dental-conditions/:code', verificarToken, odontogramConditionsController.getDentalConditionByCode);

/**
 * @route   GET /api/catalogs/dental-conditions
 * @desc    Obtener todas las condiciones dentales (con filtros opcionales)
 * @access  Private (requiere token)
 * @query   {String} category - Filtrar por categoría (patologia, tratamiento, protesis, anomalia, ortodoncia)
 * @query   {String} search - Buscar por nombre, código, CIE-10 o descripción
 * @query   {String} status - Filtrar por estado (active, inactive)
 * @returns {Array} - Lista de 51 condiciones dentales con toda su configuración visual
 */
router.get('/dental-conditions', verificarToken, odontogramConditionsController.getDentalConditions);

/**
 * @route   PUT /api/catalogs/dental-conditions/:id/price
 * @desc    Actualizar precio por defecto de una condición
 * @access  Private (requiere token)
 * @param   {Number} id - ID de la condición
 * @body    {Number} price - Nuevo precio por defecto
 * @returns {Object} - Condición actualizada
 */
router.put('/dental-conditions/:id/price', verificarToken, odontogramConditionsController.updateConditionPrice);

/**
 * @route   PUT /api/catalogs/dental-conditions/:id/prices
 * @desc    Actualizar precios variables de una condición (JSON)
 * @access  Private (requiere token)
 * @param   {Number} id - ID de la condición
 * @body    {Object} prices - Objeto JSON con precios variables por tipo
 * @returns {Object} - Condición actualizada
 */
router.put('/dental-conditions/:id/prices', verificarToken, odontogramConditionsController.updateConditionPrices);

// ============================================================
// CONDITION PROCEDURES (Procedimientos por Condición)
// ============================================================

/**
 * @route   GET /api/catalogs/dental-conditions/:conditionId/procedures
 * @desc    Obtener todos los procedimientos de una condición dental específica
 * @access  Private (requiere token)
 * @param   {Number} conditionId - ID de la condición
 * @returns {Array} - Lista de procedimientos asociados a la condición
 */
router.get('/dental-conditions/:conditionId/procedures', verificarToken, odontogramConditionsController.getConditionProcedures);

/**
 * @route   POST /api/catalogs/dental-conditions/:conditionId/procedures
 * @desc    Crear un nuevo procedimiento para una condición
 * @access  Private (requiere token)
 * @param   {Number} conditionId - ID de la condición
 * @body    {Object} procedureData - Datos del procedimiento (procedure_name, procedure_code, default_price, etc.)
 * @returns {Object} - Procedimiento creado
 */
router.post('/dental-conditions/:conditionId/procedures', verificarToken, odontogramConditionsController.createConditionProcedure);

/**
 * @route   PUT /api/catalogs/dental-conditions/:conditionId/procedures/:procedureId
 * @desc    Actualizar un procedimiento de una condición
 * @access  Private (requiere token)
 * @param   {Number} conditionId - ID de la condición
 * @param   {Number} procedureId - ID del procedimiento
 * @body    {Object} procedureData - Datos a actualizar
 * @returns {Object} - Procedimiento actualizado
 */
router.put('/dental-conditions/:conditionId/procedures/:procedureId', verificarToken, odontogramConditionsController.updateConditionProcedure);

/**
 * @route   DELETE /api/catalogs/dental-conditions/:conditionId/procedures/:procedureId
 * @desc    Eliminar (desactivar) un procedimiento de una condición
 * @access  Private (requiere token)
 * @param   {Number} conditionId - ID de la condición
 * @param   {Number} procedureId - ID del procedimiento
 * @returns {Object} - Procedimiento eliminado
 */
router.delete('/dental-conditions/:conditionId/procedures/:procedureId', verificarToken, odontogramConditionsController.deleteConditionProcedure);

module.exports = router;
