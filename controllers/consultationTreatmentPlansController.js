const consultationTreatmentPlansModel = require('../models/consultationTreatmentPlansModel');

/**
 * CONTROLADOR DE PLANES DE TRATAMIENTO DE CONSULTA
 * Maneja las operaciones del plan de tratamiento del Paso 8 de Atencion Integral
 */

/**
 * Obtiene el plan de tratamiento completo de una consulta
 * GET /consultations/:consultationId/treatment-plan
 */
const getConsultationTreatmentPlan = async (req, res) => {
  try {
    const { consultationId } = req.params;

    if (!consultationId || isNaN(parseInt(consultationId))) {
      return res.status(400).json({
        success: false,
        error: 'ID de consulta invalido'
      });
    }

    const plan = await consultationTreatmentPlansModel.getByConsultationId(parseInt(consultationId));

    // Si no existe plan, devolver null (no es un error, es un estado valido)
    res.json({
      success: true,
      data: plan || null
    });
  } catch (error) {
    console.error('Error al obtener plan de tratamiento:', error);
    res.status(500).json({
      success: false,
      error: 'Error al obtener plan de tratamiento'
    });
  }
};

/**
 * Obtiene un resumen del plan de tratamiento
 * GET /consultations/:consultationId/treatment-plan/summary
 */
const getConsultationTreatmentPlanSummary = async (req, res) => {
  try {
    const { consultationId } = req.params;

    if (!consultationId || isNaN(parseInt(consultationId))) {
      return res.status(400).json({
        success: false,
        error: 'ID de consulta invalido'
      });
    }

    const summary = await consultationTreatmentPlansModel.getSummary(parseInt(consultationId));

    if (!summary) {
      return res.status(404).json({
        success: false,
        error: 'No se encontro plan de tratamiento para esta consulta'
      });
    }

    res.json({
      success: true,
      data: summary
    });
  } catch (error) {
    console.error('Error al obtener resumen del plan:', error);
    res.status(500).json({
      success: false,
      error: 'Error al obtener resumen del plan de tratamiento'
    });
  }
};

/**
 * Crea o actualiza el plan de tratamiento de una consulta
 * POST /consultations/:consultationId/treatment-plan
 *
 * Body esperado:
 * {
 *   planName?: string,
 *   definitiveConditionsTotal: number,
 *   treatmentsTotal: number,
 *   additionalServicesTotal: number,
 *   grandTotal: number,
 *   hasInitialPayment: boolean,
 *   initialPayment: number,
 *   monthlyPayment: number,
 *   observations?: string,
 *   appliedTreatments: [{
 *     treatmentId: string,
 *     treatmentName: string,
 *     totalAmount: number,
 *     conditions: [{
 *       label: string,
 *       price: number,
 *       quantity: number
 *     }]
 *   }],
 *   selectedAdditionalServices: [{
 *     id: string,        // "ortho-1", "implant-2", "prosthesis-3"
 *     type: string,      // "orthodontic", "implant", "prosthesis"
 *     name: string,
 *     modality?: string,
 *     description?: string,
 *     originalFields: { montoTotal, inicial, mensual },
 *     editedFields: { montoTotal, inicial, mensual }
 *   }]
 * }
 */
const upsertConsultationTreatmentPlan = async (req, res) => {
  try {
    const { consultationId } = req.params;
    const userId = req.user?.user_id;

    if (!consultationId || isNaN(parseInt(consultationId))) {
      return res.status(400).json({
        success: false,
        error: 'ID de consulta invalido'
      });
    }

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Usuario no autenticado'
      });
    }

    const data = req.body;

    // Validaciones basicas
    if (data.appliedTreatments && !Array.isArray(data.appliedTreatments)) {
      return res.status(400).json({
        success: false,
        error: 'appliedTreatments debe ser un array'
      });
    }

    if (data.selectedAdditionalServices && !Array.isArray(data.selectedAdditionalServices)) {
      return res.status(400).json({
        success: false,
        error: 'selectedAdditionalServices debe ser un array'
      });
    }

    // Verificar si ya existia un plan
    const existedBefore = await consultationTreatmentPlansModel.exists(parseInt(consultationId));

    const plan = await consultationTreatmentPlansModel.upsertConsultationTreatmentPlan(
      parseInt(consultationId),
      data,
      userId
    );

    res.status(existedBefore ? 200 : 201).json({
      success: true,
      message: existedBefore
        ? 'Plan de tratamiento actualizado exitosamente'
        : 'Plan de tratamiento creado exitosamente',
      data: plan,
      wasUpdated: existedBefore
    });
  } catch (error) {
    console.error('Error al guardar plan de tratamiento:', error);
    res.status(500).json({
      success: false,
      error: 'Error al guardar plan de tratamiento',
      details: error.message
    });
  }
};

/**
 * Elimina el plan de tratamiento de una consulta (soft delete)
 * DELETE /consultations/:consultationId/treatment-plan
 */
const deleteConsultationTreatmentPlan = async (req, res) => {
  try {
    const { consultationId } = req.params;
    const userId = req.user?.user_id;

    if (!consultationId || isNaN(parseInt(consultationId))) {
      return res.status(400).json({
        success: false,
        error: 'ID de consulta invalido'
      });
    }

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Usuario no autenticado'
      });
    }

    const deleted = await consultationTreatmentPlansModel.deleteByConsultationId(
      parseInt(consultationId),
      userId
    );

    if (!deleted) {
      return res.status(404).json({
        success: false,
        error: 'No se encontro plan de tratamiento para esta consulta'
      });
    }

    res.json({
      success: true,
      message: 'Plan de tratamiento eliminado exitosamente'
    });
  } catch (error) {
    console.error('Error al eliminar plan de tratamiento:', error);
    res.status(500).json({
      success: false,
      error: 'Error al eliminar plan de tratamiento'
    });
  }
};

/**
 * Verifica si existe un plan de tratamiento para la consulta
 * GET /consultations/:consultationId/treatment-plan/exists
 */
const checkTreatmentPlanExists = async (req, res) => {
  try {
    const { consultationId } = req.params;

    if (!consultationId || isNaN(parseInt(consultationId))) {
      return res.status(400).json({
        success: false,
        error: 'ID de consulta invalido'
      });
    }

    const exists = await consultationTreatmentPlansModel.exists(parseInt(consultationId));

    res.json({
      success: true,
      exists
    });
  } catch (error) {
    console.error('Error al verificar plan de tratamiento:', error);
    res.status(500).json({
      success: false,
      error: 'Error al verificar plan de tratamiento'
    });
  }
};

module.exports = {
  getConsultationTreatmentPlan,
  getConsultationTreatmentPlanSummary,
  upsertConsultationTreatmentPlan,
  deleteConsultationTreatmentPlan,
  checkTreatmentPlanExists
};
