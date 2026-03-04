const additionalServicesModel = require('../models/additionalServicesModel');
const pool = require('../config/db');
const { formatDateYMD } = require('../utils/dateUtils');

/**
 * CONTROLADOR DE SERVICIOS ADICIONALES
 * Maneja las peticiones HTTP para planes de ortodoncia, implantes y protesis
 */

// ============================================================
// PLANES DE ORTODONCIA
// ============================================================

/**
 * Obtener todos los planes de ortodoncia
 * GET /api/additional-services/orthodontic-plans
 */
const getOrthodonticPlans = async (req, res) => {
  try {
    const plans = await additionalServicesModel.getAllOrthodonticPlans();

    res.status(200).json({
      success: true,
      message: 'Planes de ortodoncia obtenidos correctamente',
      data: plans,
      total: plans.length
    });
  } catch (error) {
    console.error('Error al obtener planes de ortodoncia:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener planes de ortodoncia',
      error: error.message
    });
  }
};

/**
 * Actualizar un plan de ortodoncia especifico
 * PUT /api/additional-services/orthodontic-plans/:planType/:modality
 */
const updateOrthodonticPlan = async (req, res) => {
  try {
    const { planType, modality } = req.params;
    const userId = req.user?.userId || req.user?.id || null;
    const data = req.body;

    // Validar tipo de plan
    const validTypes = ['brackets_convencionales', 'autoligantes', 'zafiro', 'alineadores'];
    if (!validTypes.includes(planType)) {
      return res.status(400).json({
        success: false,
        message: `Tipo de plan invalido. Valores permitidos: ${validTypes.join(', ')}`
      });
    }

    // Validar modalidad
    const validModalities = ['presupuesto_total', 'sin_presupuesto', 'sin_inicial'];
    if (!validModalities.includes(modality)) {
      return res.status(400).json({
        success: false,
        message: `Modalidad invalida. Valores permitidos: ${validModalities.join(', ')}`
      });
    }

    const updatedPlan = await additionalServicesModel.updateOrthodonticPlan(
      planType,
      modality,
      data,
      userId
    );

    if (!updatedPlan) {
      return res.status(404).json({
        success: false,
        message: 'Plan de ortodoncia no encontrado'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Plan de ortodoncia actualizado correctamente',
      data: updatedPlan
    });
  } catch (error) {
    console.error('Error al actualizar plan de ortodoncia:', error);
    res.status(500).json({
      success: false,
      message: 'Error al actualizar plan de ortodoncia',
      error: error.message
    });
  }
};

/**
 * Actualizar todos los planes de ortodoncia de una vez
 * PUT /api/additional-services/orthodontic-plans
 */
const updateAllOrthodonticPlans = async (req, res) => {
  try {
    const userId = req.user?.userId || req.user?.id || null;
    const { plans } = req.body;

    if (!plans || !Array.isArray(plans)) {
      return res.status(400).json({
        success: false,
        message: 'Se requiere un array de planes a actualizar'
      });
    }

    const updatedPlans = await additionalServicesModel.updateAllOrthodonticPlans(plans, userId);

    res.status(200).json({
      success: true,
      message: 'Planes de ortodoncia actualizados correctamente',
      data: updatedPlans,
      total: updatedPlans.length
    });
  } catch (error) {
    console.error('Error al actualizar planes de ortodoncia:', error);
    res.status(500).json({
      success: false,
      message: 'Error al actualizar planes de ortodoncia',
      error: error.message
    });
  }
};

// ============================================================
// PLANES DE IMPLANTES DENTALES
// ============================================================

/**
 * Obtener todos los planes de implantes
 * GET /api/additional-services/implant-plans
 */
const getImplantPlans = async (req, res) => {
  try {
    const plans = await additionalServicesModel.getAllImplantPlans();

    res.status(200).json({
      success: true,
      message: 'Planes de implantes obtenidos correctamente',
      data: plans,
      total: plans.length
    });
  } catch (error) {
    console.error('Error al obtener planes de implantes:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener planes de implantes',
      error: error.message
    });
  }
};

/**
 * Actualizar un plan de implantes especifico
 * PUT /api/additional-services/implant-plans/:planType
 */
const updateImplantPlan = async (req, res) => {
  try {
    const { planType } = req.params;
    const userId = req.user?.userId || req.user?.id || null;
    const data = req.body;

    // Validar tipo de plan
    const validTypes = ['inmediato', 'convencional', 'hibrido_superior', 'hibrido_inferior'];
    if (!validTypes.includes(planType)) {
      return res.status(400).json({
        success: false,
        message: `Tipo de plan invalido. Valores permitidos: ${validTypes.join(', ')}`
      });
    }

    const updatedPlan = await additionalServicesModel.updateImplantPlan(planType, data, userId);

    if (!updatedPlan) {
      return res.status(404).json({
        success: false,
        message: 'Plan de implantes no encontrado'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Plan de implantes actualizado correctamente',
      data: updatedPlan
    });
  } catch (error) {
    console.error('Error al actualizar plan de implantes:', error);
    res.status(500).json({
      success: false,
      message: 'Error al actualizar plan de implantes',
      error: error.message
    });
  }
};

/**
 * Actualizar todos los planes de implantes de una vez
 * PUT /api/additional-services/implant-plans
 */
const updateAllImplantPlans = async (req, res) => {
  try {
    const userId = req.user?.userId || req.user?.id || null;
    const { plans } = req.body;

    if (!plans || !Array.isArray(plans)) {
      return res.status(400).json({
        success: false,
        message: 'Se requiere un array de planes a actualizar'
      });
    }

    const updatedPlans = await additionalServicesModel.updateAllImplantPlans(plans, userId);

    res.status(200).json({
      success: true,
      message: 'Planes de implantes actualizados correctamente',
      data: updatedPlans,
      total: updatedPlans.length
    });
  } catch (error) {
    console.error('Error al actualizar planes de implantes:', error);
    res.status(500).json({
      success: false,
      message: 'Error al actualizar planes de implantes',
      error: error.message
    });
  }
};

// ============================================================
// ITEMS DE PROTESIS (Rehabilitacion Integral)
// ============================================================

/**
 * Obtener todos los items de protesis
 * GET /api/additional-services/prosthesis-items
 */
const getProsthesisItems = async (req, res) => {
  try {
    const [items, totals] = await Promise.all([
      additionalServicesModel.getAllProsthesisItems(),
      additionalServicesModel.getProsthesisTotal()
    ]);

    res.status(200).json({
      success: true,
      message: 'Items de protesis obtenidos correctamente',
      data: items,
      total: items.length,
      summary: {
        total_cost: parseFloat(totals.total_cost) || 0,
        items_count: parseInt(totals.items_count) || 0
      }
    });
  } catch (error) {
    console.error('Error al obtener items de protesis:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener items de protesis',
      error: error.message
    });
  }
};

/**
 * Crear un nuevo item de protesis
 * POST /api/additional-services/prosthesis-items
 */
const createProsthesisItem = async (req, res) => {
  try {
    const userId = req.user?.userId || req.user?.id || null;
    const { item_number, treatment_projection, cost, display_order } = req.body;

    // Validaciones
    if (!treatment_projection || treatment_projection.trim() === '') {
      return res.status(400).json({
        success: false,
        message: 'La proyeccion de tratamiento es requerida'
      });
    }

    if (cost === undefined || cost === null || cost < 0) {
      return res.status(400).json({
        success: false,
        message: 'El costo es requerido y debe ser un numero positivo'
      });
    }

    const newItem = await additionalServicesModel.createProsthesisItem(
      { item_number, treatment_projection, cost, display_order },
      userId
    );

    res.status(201).json({
      success: true,
      message: 'Item de protesis creado correctamente',
      data: newItem
    });
  } catch (error) {
    console.error('Error al crear item de protesis:', error);
    res.status(500).json({
      success: false,
      message: 'Error al crear item de protesis',
      error: error.message
    });
  }
};

/**
 * Actualizar un item de protesis existente
 * PUT /api/additional-services/prosthesis-items/:id
 */
const updateProsthesisItem = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?.userId || req.user?.id || null;
    const data = req.body;

    if (!id || isNaN(parseInt(id))) {
      return res.status(400).json({
        success: false,
        message: 'ID de item invalido'
      });
    }

    const updatedItem = await additionalServicesModel.updateProsthesisItem(
      parseInt(id),
      data,
      userId
    );

    if (!updatedItem) {
      return res.status(404).json({
        success: false,
        message: 'Item de protesis no encontrado'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Item de protesis actualizado correctamente',
      data: updatedItem
    });
  } catch (error) {
    console.error('Error al actualizar item de protesis:', error);
    res.status(500).json({
      success: false,
      message: 'Error al actualizar item de protesis',
      error: error.message
    });
  }
};

/**
 * Eliminar un item de protesis (soft delete)
 * DELETE /api/additional-services/prosthesis-items/:id
 */
const deleteProsthesisItem = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?.userId || req.user?.id || null;

    if (!id || isNaN(parseInt(id))) {
      return res.status(400).json({
        success: false,
        message: 'ID de item invalido'
      });
    }

    const deletedItem = await additionalServicesModel.deleteProsthesisItem(parseInt(id), userId);

    if (!deletedItem) {
      return res.status(404).json({
        success: false,
        message: 'Item de protesis no encontrado'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Item de protesis eliminado correctamente',
      data: deletedItem
    });
  } catch (error) {
    console.error('Error al eliminar item de protesis:', error);
    res.status(500).json({
      success: false,
      message: 'Error al eliminar item de protesis',
      error: error.message
    });
  }
};

/**
 * Reemplazar todos los items de protesis
 * PUT /api/additional-services/prosthesis-items/replace-all
 */
const replaceAllProsthesisItems = async (req, res) => {
  try {
    const userId = req.user?.userId || req.user?.id || null;
    const { items } = req.body;

    if (!items || !Array.isArray(items)) {
      return res.status(400).json({
        success: false,
        message: 'Se requiere un array de items'
      });
    }

    // Validar cada item
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (!item.treatment_projection || item.treatment_projection.trim() === '') {
        return res.status(400).json({
          success: false,
          message: `Item ${i + 1}: La proyeccion de tratamiento es requerida`
        });
      }
      if (item.cost === undefined || item.cost === null || item.cost < 0) {
        return res.status(400).json({
          success: false,
          message: `Item ${i + 1}: El costo es requerido y debe ser un numero positivo`
        });
      }
    }

    const replacedItems = await additionalServicesModel.replaceAllProsthesisItems(items, userId);

    // Obtener totales actualizados
    const totals = await additionalServicesModel.getProsthesisTotal();

    res.status(200).json({
      success: true,
      message: 'Items de protesis reemplazados correctamente',
      data: replacedItems,
      total: replacedItems.length,
      summary: {
        total_cost: parseFloat(totals.total_cost) || 0,
        items_count: parseInt(totals.items_count) || 0
      }
    });
  } catch (error) {
    console.error('Error al reemplazar items de protesis:', error);
    res.status(500).json({
      success: false,
      message: 'Error al reemplazar items de protesis',
      error: error.message
    });
  }
};

// ============================================================
// OBTENER TODOS LOS SERVICIOS ADICIONALES
// ============================================================

/**
 * Obtener todos los servicios adicionales en una sola llamada
 * GET /api/additional-services/all
 */
const getAllAdditionalServices = async (req, res) => {
  try {
    const services = await additionalServicesModel.getAllAdditionalServices();

    res.status(200).json({
      success: true,
      message: 'Servicios adicionales obtenidos correctamente',
      data: services
    });
  } catch (error) {
    console.error('Error al obtener servicios adicionales:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener servicios adicionales',
      error: error.message
    });
  }
};

// ============================================================
// FINALIZAR SERVICIO ADICIONAL (GENERAR INGRESO PARA COMISION)
// ============================================================

/**
 * Finalizar un servicio adicional y generar ingreso para comision
 * PUT /api/additional-services/consultation-service/:serviceId/complete
 *
 * Al finalizar:
 * 1. Cambia service_status a 'completed'
 * 2. Registra fecha y dentista que finalizó
 * 3. Crea UN procedure_income con el monto TOTAL del servicio
 *    (Este ingreso se usará para calcular la comisión del doctor)
 */
const completeConsultationService = async (req, res) => {
  const client = await pool.connect();

  try {
    const { serviceId } = req.params;
    const { notes } = req.body;
    const userId = req.user?.userId || req.user?.id;
    const dentistId = req.user?.dentistId;

    if (!serviceId) {
      return res.status(400).json({
        success: false,
        message: 'El ID del servicio es requerido'
      });
    }

    await client.query('BEGIN');

    // 1. Obtener el servicio adicional con sus datos
    const serviceResult = await client.query(`
      SELECT
        cas.*,
        ctp.consultation_id,
        c.patient_id,
        c.branch_id,
        c.dentist_id as consultation_dentist_id,
        p.first_name || ' ' || p.last_name as patient_name
      FROM consultation_additional_services cas
      INNER JOIN consultation_treatment_plans ctp ON cas.consultation_treatment_plan_id = ctp.consultation_treatment_plan_id
      INNER JOIN consultations c ON ctp.consultation_id = c.consultation_id
      INNER JOIN patients p ON c.patient_id = p.patient_id
      WHERE cas.consultation_additional_service_id = $1
        AND cas.status = 'active'
    `, [serviceId]);

    if (serviceResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({
        success: false,
        message: 'Servicio adicional no encontrado'
      });
    }

    const service = serviceResult.rows[0];

    // Verificar que no esté ya completado
    if (service.service_status === 'completed') {
      await client.query('ROLLBACK');
      return res.status(400).json({
        success: false,
        message: 'Este servicio ya fue marcado como finalizado'
      });
    }

    // 2. Determinar el monto total del servicio (editado o original)
    const totalAmount = parseFloat(service.edited_monto_total) || parseFloat(service.original_monto_total) || 0;

    if (totalAmount <= 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        success: false,
        message: 'El servicio no tiene un monto válido'
      });
    }

    // 3. Determinar el dentist_id para el ingreso
    const performedByDentistId = dentistId || service.consultation_dentist_id;

    if (!performedByDentistId) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        success: false,
        message: 'No se pudo determinar el dentista que realizó el servicio'
      });
    }

    // 4. Actualizar el servicio como completado
    await client.query(`
      UPDATE consultation_additional_services
      SET
        service_status = 'completed',
        service_completed_date = CURRENT_DATE,
        service_completed_by_dentist_id = $1,
        final_payment_notes = COALESCE(final_payment_notes || E'\n', '') || $2,
        user_id_modification = $3,
        date_time_modification = CURRENT_TIMESTAMP
      WHERE consultation_additional_service_id = $4
    `, [performedByDentistId, notes || 'Servicio finalizado', userId, serviceId]);

    // 5. Crear el procedure_income con el monto TOTAL para comisión
    const incomeResult = await client.query(`
      INSERT INTO procedure_income (
        consultation_id,
        patient_id,
        branch_id,
        income_type,
        additional_service_id,
        parent_additional_service_id,
        item_name,
        item_description,
        amount,
        final_amount,
        performed_by_dentist_id,
        performed_date,
        clinical_notes,
        income_status,
        is_final_quota,
        quota_type,
        status,
        user_id_registration,
        date_time_registration
      ) VALUES (
        $1, $2, $3, 'additional_service', $4, $4, $5, $6, $7, $7, $8, CURRENT_DATE, $9, 'confirmed', true, 'final', 'active', $10, CURRENT_TIMESTAMP
      )
      RETURNING *
    `, [
      service.consultation_id,
      service.patient_id,
      service.branch_id,
      serviceId,
      `${service.service_name} - Servicio Finalizado`,
      `Ingreso total por finalización de ${service.service_type}: ${service.service_name}`,
      totalAmount,
      performedByDentistId,
      notes || 'Servicio completado - Ingreso para comisión',
      userId
    ]);

    await client.query('COMMIT');

    res.status(200).json({
      success: true,
      message: 'Servicio finalizado correctamente. Se generó el ingreso para comisión.',
      data: {
        service: {
          consultation_additional_service_id: parseInt(serviceId),
          service_name: service.service_name,
          service_type: service.service_type,
          service_status: 'completed',
          service_completed_date: formatDateYMD(),
          total_amount: totalAmount
        },
        income: incomeResult.rows[0]
      }
    });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error al finalizar servicio adicional:', error);
    res.status(500).json({
      success: false,
      message: 'Error al finalizar el servicio',
      error: error.message
    });
  } finally {
    client.release();
  }
};

/**
 * Obtener servicios adicionales de una consulta con su estado
 * GET /api/additional-services/consultation/:consultationId
 */
const getConsultationServices = async (req, res) => {
  try {
    const { consultationId } = req.params;

    const result = await pool.query(`
      SELECT
        cas.*,
        u.first_name || ' ' || u.last_name as completed_by_name,
        (
          SELECT COUNT(*)
          FROM service_monthly_payments smp
          WHERE smp.consultation_additional_service_id = cas.consultation_additional_service_id
            AND smp.status = 'active'
        ) as payments_count,
        (
          SELECT COALESCE(SUM(smp.payment_amount), 0)
          FROM service_monthly_payments smp
          WHERE smp.consultation_additional_service_id = cas.consultation_additional_service_id
            AND smp.status = 'active'
        ) as total_paid
      FROM consultation_additional_services cas
      INNER JOIN consultation_treatment_plans ctp ON cas.consultation_treatment_plan_id = ctp.consultation_treatment_plan_id
      LEFT JOIN dentists d ON cas.service_completed_by_dentist_id = d.dentist_id
      LEFT JOIN users u ON d.user_id = u.user_id
      WHERE ctp.consultation_id = $1
        AND cas.status = 'active'
      ORDER BY cas.display_order, cas.consultation_additional_service_id
    `, [consultationId]);

    res.status(200).json({
      success: true,
      data: result.rows
    });

  } catch (error) {
    console.error('Error al obtener servicios de la consulta:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener los servicios',
      error: error.message
    });
  }
};

module.exports = {
  // Ortodoncia
  getOrthodonticPlans,
  updateOrthodonticPlan,
  updateAllOrthodonticPlans,

  // Implantes
  getImplantPlans,
  updateImplantPlan,
  updateAllImplantPlans,

  // Protesis
  getProsthesisItems,
  createProsthesisItem,
  updateProsthesisItem,
  deleteProsthesisItem,
  replaceAllProsthesisItems,

  // Todos los servicios
  getAllAdditionalServices,

  // Servicios de consulta (finalizar para comisión)
  completeConsultationService,
  getConsultationServices
};
