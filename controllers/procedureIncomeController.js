/**
 * Controller: procedureIncomeController.js
 * Controlador para el registro financiero de ingresos por procedimientos
 *
 * Incluye soporte para:
 * - Sistema de cuotas (quota_number, is_final_quota, quota_type)
 * - Validacion de 1 cuota por cita (appointment_id)
 * - Guardado en lote de procedimientos completados
 */

const { formatDateYMD } = require('../utils/dateUtils');
const {
  getAllProcedureIncome,
  getProcedureIncomeById,
  createProcedureIncome,
  createProcedureIncomeWithTracking,
  updateProcedureIncome,
  deleteProcedureIncome,
  countProcedureIncome,
  getDentistIncome,
  getDentistIncomeSummary,
  getPatientIncome,
  checkQuotaExistsForAppointment,
  getNextQuotaNumber,
  getServiceQuotaHistory,
  createMonthlyQuota,
  checkProcedureExists
} = require('../models/procedureIncomeModel');

/**
 * GET /api/procedure-income
 * Obtener ingresos con filtros
 */
const getProcedureIncomeList = async (req, res) => {
  try {
    const {
      patient_id,
      consultation_id,
      dentist_id,
      branch_id,
      income_type,
      income_status,
      date_from,
      date_to,
      page = 1,
      limit = 50
    } = req.query;

    const filters = {
      patient_id: patient_id ? parseInt(patient_id) : null,
      consultation_id: consultation_id ? parseInt(consultation_id) : null,
      dentist_id: dentist_id ? parseInt(dentist_id) : null,
      branch_id: branch_id ? parseInt(branch_id) : null,
      income_type: income_type || null,
      income_status: income_status || null,
      date_from: date_from || null,
      date_to: date_to || null,
      limit: parseInt(limit),
      offset: (parseInt(page) - 1) * parseInt(limit)
    };

    const [incomes, total] = await Promise.all([
      getAllProcedureIncome(filters),
      countProcedureIncome(filters)
    ]);

    res.json({
      success: true,
      data: incomes,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Error al obtener ingresos:', error);
    res.status(500).json({
      success: false,
      error: 'Error al obtener ingresos'
    });
  }
};

/**
 * GET /api/procedure-income/:id
 * Obtener ingreso por ID
 */
const getProcedureIncome = async (req, res) => {
  try {
    const { id } = req.params;
    const income = await getProcedureIncomeById(parseInt(id));

    if (!income) {
      return res.status(404).json({
        success: false,
        error: 'Ingreso no encontrado'
      });
    }

    res.json({
      success: true,
      data: income
    });
  } catch (error) {
    console.error('Error al obtener ingreso:', error);
    res.status(500).json({
      success: false,
      error: 'Error al obtener ingreso'
    });
  }
};

/**
 * GET /api/procedure-income/patient/:patientId
 * Obtener ingresos por paciente
 */
const getPatientIncomeList = async (req, res) => {
  try {
    const { patientId } = req.params;
    const incomes = await getPatientIncome(parseInt(patientId));

    res.json({
      success: true,
      data: incomes
    });
  } catch (error) {
    console.error('Error al obtener ingresos del paciente:', error);
    res.status(500).json({
      success: false,
      error: 'Error al obtener ingresos del paciente'
    });
  }
};

/**
 * GET /api/procedure-income/dentist/:dentistId
 * Obtener ingresos por dentista (para comisiones)
 */
const getDentistIncomeList = async (req, res) => {
  try {
    const { dentistId } = req.params;
    const { date_from, date_to } = req.query;

    // Si no se proporcionan fechas, usar el mes actual
    const today = new Date();
    const defaultDateFrom = date_from || formatDateYMD(new Date(today.getFullYear(), today.getMonth(), 1));
    const defaultDateTo = date_to || formatDateYMD(new Date(today.getFullYear(), today.getMonth() + 1, 0));

    const incomes = await getDentistIncome(
      parseInt(dentistId),
      defaultDateFrom,
      defaultDateTo
    );

    res.json({
      success: true,
      data: incomes,
      period: {
        date_from: defaultDateFrom,
        date_to: defaultDateTo
      }
    });
  } catch (error) {
    console.error('Error al obtener ingresos del dentista:', error);
    res.status(500).json({
      success: false,
      error: 'Error al obtener ingresos del dentista'
    });
  }
};

/**
 * GET /api/procedure-income/dentist/:dentistId/summary
 * Obtener resumen de ingresos por dentista
 */
const getDentistIncomeSummaryData = async (req, res) => {
  try {
    const { dentistId } = req.params;
    const { date_from, date_to } = req.query;

    // Si no se proporcionan fechas, usar el mes actual
    const today = new Date();
    const defaultDateFrom = date_from || formatDateYMD(new Date(today.getFullYear(), today.getMonth(), 1));
    const defaultDateTo = date_to || formatDateYMD(new Date(today.getFullYear(), today.getMonth() + 1, 0));

    const summary = await getDentistIncomeSummary(
      parseInt(dentistId),
      defaultDateFrom,
      defaultDateTo
    );

    // Calcular totales
    let totalIncome = 0;
    let totalProcedures = 0;
    let totalDiscounts = 0;
    let uniquePatients = new Set();

    summary.forEach(row => {
      totalIncome += parseFloat(row.total_income || 0);
      totalProcedures += parseInt(row.total_procedures || 0);
      totalDiscounts += parseFloat(row.total_discounts || 0);
    });

    res.json({
      success: true,
      data: {
        details: summary,
        totals: {
          total_income: totalIncome,
          total_procedures: totalProcedures,
          total_discounts: totalDiscounts
        },
        period: {
          date_from: defaultDateFrom,
          date_to: defaultDateTo
        }
      }
    });
  } catch (error) {
    console.error('Error al obtener resumen del dentista:', error);
    res.status(500).json({
      success: false,
      error: 'Error al obtener resumen del dentista'
    });
  }
};

/**
 * POST /api/procedure-income
 * Crear nuevo registro de ingreso
 * INCLUYE: Validación de duplicados para procedimientos de odontograma
 */
const createNewProcedureIncome = async (req, res) => {
  try {
    const data = {
      ...req.body,
      user_id_registration: req.user.user_id
    };

    // Validaciones basicas
    if (!data.consultation_id || !data.patient_id || !data.branch_id ||
        !data.income_type || !data.item_name || !data.performed_by_dentist_id) {
      return res.status(400).json({
        success: false,
        error: 'Faltan campos requeridos: consultation_id, patient_id, branch_id, income_type, item_name, performed_by_dentist_id'
      });
    }

    if (data.amount === undefined || data.amount === null) {
      return res.status(400).json({
        success: false,
        error: 'El campo amount es requerido'
      });
    }

    // VALIDACIÓN DE DUPLICADOS: Para procedimientos del odontograma
    // Si ya existe un registro guardado para este tooth_position_id + item_name, rechazar
    if (data.income_type === 'odontogram_procedure' && data.tooth_position_id) {
      const existing = await checkProcedureExists(
        data.consultation_id,
        data.tooth_position_id,
        data.item_name
      );

      if (existing) {
        return res.status(409).json({
          success: false,
          error: 'ALREADY_SAVED',
          message: 'Este procedimiento ya fue guardado y no puede modificarse',
          existing_income_id: existing.income_id
        });
      }
    }

    // Usar createProcedureIncomeWithTracking para inicializar campos de deuda
    const newIncome = await createProcedureIncomeWithTracking(data);

    res.status(201).json({
      success: true,
      message: 'Ingreso registrado exitosamente',
      data: newIncome
    });
  } catch (error) {
    console.error('Error al crear ingreso:', error);
    res.status(500).json({
      success: false,
      error: 'Error al crear ingreso'
    });
  }
};

/**
 * PUT /api/procedure-income/:id
 * Actualizar registro de ingreso
 */
const updateExistingProcedureIncome = async (req, res) => {
  try {
    const { id } = req.params;
    const updatedIncome = await updateProcedureIncome(
      parseInt(id),
      req.body,
      req.user.user_id
    );

    if (!updatedIncome) {
      return res.status(404).json({
        success: false,
        error: 'Ingreso no encontrado'
      });
    }

    res.json({
      success: true,
      message: 'Ingreso actualizado exitosamente',
      data: updatedIncome
    });
  } catch (error) {
    console.error('Error al actualizar ingreso:', error);
    res.status(500).json({
      success: false,
      error: 'Error al actualizar ingreso'
    });
  }
};

/**
 * DELETE /api/procedure-income/:id
 * Eliminar (soft delete) registro de ingreso
 */
const deleteExistingProcedureIncome = async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await deleteProcedureIncome(parseInt(id), req.user.user_id);

    if (!deleted) {
      return res.status(404).json({
        success: false,
        error: 'Ingreso no encontrado'
      });
    }

    res.json({
      success: true,
      message: 'Ingreso eliminado exitosamente'
    });
  } catch (error) {
    console.error('Error al eliminar ingreso:', error);
    res.status(500).json({
      success: false,
      error: 'Error al eliminar ingreso'
    });
  }
};

/**
 * POST /api/procedure-income/batch
 * Crear multiples registros de ingresos en lote
 * Usado para guardar todos los tratamientos marcados de una sola vez
 * INCLUYE: Validación de duplicados - salta items ya guardados sin error
 */
const createBatchProcedureIncome = async (req, res) => {
  try {
    const { items } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Se requiere un array de items para guardar'
      });
    }

    const results = [];
    const errors = [];
    const skipped = []; // Items que ya existían (no son errores, solo se saltan)

    for (const item of items) {
      try {
        // Validar campos requeridos
        if (!item.consultation_id || !item.patient_id || !item.branch_id ||
            !item.income_type || !item.item_name || !item.performed_by_dentist_id) {
          errors.push({
            item: item.item_name || 'Sin nombre',
            error: 'Faltan campos requeridos'
          });
          continue;
        }

        // VALIDACIÓN DE DUPLICADOS: Para procedimientos del odontograma
        // Si ya existe, saltar sin error (es normal en re-guardados)
        if (item.income_type === 'odontogram_procedure' && item.tooth_position_id) {
          const existing = await checkProcedureExists(
            item.consultation_id,
            item.tooth_position_id,
            item.item_name
          );

          if (existing) {
            skipped.push({
              item: item.item_name,
              reason: 'Ya guardado previamente',
              existing_income_id: existing.income_id
            });
            continue; // Saltar al siguiente item sin error
          }
        }

        const data = {
          ...item,
          user_id_registration: req.user.user_id
        };

        // Usar createProcedureIncomeWithTracking para inicializar campos de deuda
        const newIncome = await createProcedureIncomeWithTracking(data);
        results.push(newIncome);
      } catch (itemError) {
        errors.push({
          item: item.item_name || 'Sin nombre',
          error: itemError.message
        });
      }
    }

    res.status(201).json({
      success: true,
      message: `${results.length} ingresos registrados exitosamente${skipped.length > 0 ? `, ${skipped.length} ya existían` : ''}`,
      data: results,
      skipped: skipped.length > 0 ? skipped : undefined,
      errors: errors.length > 0 ? errors : undefined
    });
  } catch (error) {
    console.error('Error al crear ingresos en lote:', error);
    res.status(500).json({
      success: false,
      error: 'Error al crear ingresos en lote'
    });
  }
};

/**
 * POST /api/procedure-income/quota
 * Crear cuota mensual para servicios adicionales (ortodoncia/implantes)
 * Incluye validacion de 1 cuota por cita
 */
const createQuotaPayment = async (req, res) => {
  try {
    const data = {
      ...req.body,
      user_id_registration: req.user.user_id
    };

    // Validaciones basicas
    if (!data.consultation_id || !data.patient_id || !data.branch_id ||
        !data.item_name || !data.performed_by_dentist_id || !data.parent_additional_service_id) {
      return res.status(400).json({
        success: false,
        error: 'Faltan campos requeridos para la cuota'
      });
    }

    if (data.amount === undefined || data.amount === null) {
      return res.status(400).json({
        success: false,
        error: 'El campo amount es requerido'
      });
    }

    // Usar la funcion que valida e inserta
    const newQuota = await createMonthlyQuota(data);

    res.status(201).json({
      success: true,
      message: `Cuota #${newQuota.quota_number} registrada exitosamente`,
      data: newQuota
    });
  } catch (error) {
    console.error('Error al crear cuota:', error);

    // Error especifico de cuota duplicada
    if (error.message.includes('Ya existe una cuota')) {
      return res.status(409).json({
        success: false,
        error: error.message
      });
    }

    res.status(500).json({
      success: false,
      error: 'Error al crear cuota'
    });
  }
};

/**
 * GET /api/procedure-income/quota/check/:appointmentId/:serviceId
 * Verificar si ya existe una cuota para un servicio en una cita
 */
const checkQuotaExists = async (req, res) => {
  try {
    const { appointmentId, serviceId } = req.params;

    const exists = await checkQuotaExistsForAppointment(
      parseInt(appointmentId),
      parseInt(serviceId)
    );

    res.json({
      success: true,
      data: {
        exists,
        message: exists
          ? 'Ya existe una cuota registrada para este servicio en esta cita'
          : 'No existe cuota para este servicio en esta cita'
      }
    });
  } catch (error) {
    console.error('Error al verificar cuota:', error);
    res.status(500).json({
      success: false,
      error: 'Error al verificar cuota'
    });
  }
};

/**
 * GET /api/procedure-income/quota/history/:serviceId
 * Obtener historial de cuotas de un servicio
 */
const getQuotaHistory = async (req, res) => {
  try {
    const { serviceId } = req.params;

    const history = await getServiceQuotaHistory(parseInt(serviceId));

    // Calcular resumen
    let totalPaid = 0;
    let quotaCount = 0;
    let hasFinalQuota = false;

    history.forEach(quota => {
      totalPaid += parseFloat(quota.final_amount || quota.amount || 0);
      if (quota.quota_type === 'monthly' || quota.quota_type === 'initial') {
        quotaCount++;
      }
      if (quota.is_final_quota) {
        hasFinalQuota = true;
      }
    });

    res.json({
      success: true,
      data: {
        quotas: history,
        summary: {
          total_paid: totalPaid,
          quota_count: quotaCount,
          is_completed: hasFinalQuota,
          next_quota_number: quotaCount + 1
        }
      }
    });
  } catch (error) {
    console.error('Error al obtener historial de cuotas:', error);
    res.status(500).json({
      success: false,
      error: 'Error al obtener historial de cuotas'
    });
  }
};

/**
 * GET /api/procedure-income/consultation/:consultationId/items
 * Obtener todos los ingresos registrados para una consulta
 * Usado para determinar que items ya fueron guardados (para bloquearlos)
 */
const getConsultationIncomeItems = async (req, res) => {
  try {
    const { consultationId } = req.params;

    const filters = {
      consultation_id: parseInt(consultationId)
    };

    const incomes = await getAllProcedureIncome(filters);

    // Agrupar por tipo para facilitar el uso en el frontend
    const grouped = {
      procedures: incomes.filter(i => i.income_type === 'odontogram_procedure'),
      treatments: incomes.filter(i => i.income_type === 'treatment'),
      additional_services: incomes.filter(i => i.income_type === 'additional_service'),
      quotas: incomes.filter(i => i.income_type === 'monthly_quota' || i.quota_type),
      exams: incomes.filter(i => i.income_type === 'diagnostic_exam')
    };

    res.json({
      success: true,
      data: {
        items: incomes,
        grouped,
        count: incomes.length
      }
    });
  } catch (error) {
    console.error('Error al obtener items de consulta:', error);
    res.status(500).json({
      success: false,
      error: 'Error al obtener items de consulta'
    });
  }
};

module.exports = {
  getProcedureIncomeList,
  getProcedureIncome,
  getPatientIncomeList,
  getDentistIncomeList,
  getDentistIncomeSummaryData,
  createNewProcedureIncome,
  updateExistingProcedureIncome,
  deleteExistingProcedureIncome,
  // Nuevos endpoints para sistema de cuotas y lotes
  createBatchProcedureIncome,
  createQuotaPayment,
  checkQuotaExists,
  getQuotaHistory,
  getConsultationIncomeItems
};
