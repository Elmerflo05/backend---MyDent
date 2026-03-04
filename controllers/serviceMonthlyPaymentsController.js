/**
 * Controller: serviceMonthlyPaymentsController.js
 * Controlador para pagos mensuales recurrentes de servicios adicionales
 * (ortodoncia e implantes)
 */

const { formatDateYMD } = require('../utils/dateUtils');
const serviceMonthlyPaymentsModel = require('../models/serviceMonthlyPaymentsModel');
const procedureIncomeModel = require('../models/procedureIncomeModel');

/**
 * Registrar un nuevo pago mensual
 * POST /api/service-monthly-payments
 */
const registerPayment = async (req, res) => {
  try {
    const {
      consultation_additional_service_id,
      consultation_id,
      patient_id,
      branch_id,
      payment_amount,
      payment_type, // 'initial' o 'monthly'
      registered_by_dentist_id,
      clinical_notes,
      service_name
    } = req.body;

    // Validaciones basicas
    if (!consultation_additional_service_id) {
      return res.status(400).json({
        success: false,
        message: 'consultation_additional_service_id es requerido'
      });
    }

    if (!consultation_id || !patient_id || !branch_id) {
      return res.status(400).json({
        success: false,
        message: 'consultation_id, patient_id y branch_id son requeridos'
      });
    }

    if (!payment_amount || payment_amount <= 0) {
      return res.status(400).json({
        success: false,
        message: 'payment_amount debe ser mayor a 0'
      });
    }

    if (!registered_by_dentist_id) {
      return res.status(400).json({
        success: false,
        message: 'registered_by_dentist_id es requerido'
      });
    }

    const userId = req.user?.userId || req.user?.user_id || null;

    // Obtener el estado actual del servicio
    const serviceStatus = await serviceMonthlyPaymentsModel.getServicePaymentStatus(
      consultation_additional_service_id
    );

    if (!serviceStatus) {
      return res.status(404).json({
        success: false,
        message: 'Servicio adicional no encontrado'
      });
    }

    // Verificar que el servicio no este finalizado
    if (serviceStatus.service.service_status === 'completed') {
      return res.status(400).json({
        success: false,
        message: 'No se pueden agregar pagos a un servicio finalizado'
      });
    }

    // Determinar numero de pago
    let payment_number = 1;
    if (payment_type === 'monthly') {
      payment_number = await serviceMonthlyPaymentsModel.getNextPaymentNumber(
        consultation_additional_service_id
      );
    }

    // 1. Primero crear el registro de ingreso (procedure_income) para comisiones
    const incomeData = {
      consultation_id,
      patient_id,
      branch_id,
      income_type: 'additional_service',
      additional_service_id: consultation_additional_service_id,
      item_name: payment_type === 'initial'
        ? `${service_name || 'Servicio'} - Pago Inicial`
        : `${service_name || 'Servicio'} - Cuota Mensual #${payment_number}`,
      item_description: clinical_notes || `Pago ${payment_type === 'initial' ? 'inicial' : 'mensual'} de servicio adicional`,
      amount: payment_amount,
      final_amount: payment_amount,
      performed_by_dentist_id: registered_by_dentist_id,
      performed_date: formatDateYMD(),
      performed_time: new Date().toTimeString().split(' ')[0],
      clinical_notes: clinical_notes,
      income_status: 'confirmed',
      user_id_registration: userId
    };

    // Usar createProcedureIncomeWithTracking para inicializar campos de deuda
    const income = await procedureIncomeModel.createProcedureIncomeWithTracking(incomeData);

    // 2. Crear el registro de pago mensual
    const paymentData = {
      consultation_additional_service_id,
      consultation_id,
      patient_id,
      branch_id,
      payment_number,
      payment_amount,
      payment_date: formatDateYMD(),
      payment_type: payment_type || 'monthly',
      registered_by_dentist_id,
      income_id: income.income_id,
      clinical_notes,
      user_id_registration: userId
    };

    const payment = await serviceMonthlyPaymentsModel.createPayment(paymentData);

    res.status(201).json({
      success: true,
      message: payment_type === 'initial'
        ? 'Pago inicial registrado exitosamente'
        : `Cuota mensual #${payment_number} registrada exitosamente`,
      data: {
        payment,
        income
      }
    });

  } catch (error) {
    console.error('Error en registerPayment:', error);
    res.status(500).json({
      success: false,
      message: 'Error al registrar el pago',
      error: error.message
    });
  }
};

/**
 * Obtener pagos de un servicio especifico
 * GET /api/service-monthly-payments/service/:serviceId
 */
const getPaymentsByService = async (req, res) => {
  try {
    const { serviceId } = req.params;

    if (!serviceId) {
      return res.status(400).json({
        success: false,
        message: 'serviceId es requerido'
      });
    }

    const payments = await serviceMonthlyPaymentsModel.getPaymentsByService(serviceId);

    res.json({
      success: true,
      data: payments
    });

  } catch (error) {
    console.error('Error en getPaymentsByService:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener los pagos del servicio',
      error: error.message
    });
  }
};

/**
 * Obtener estado completo de un servicio con sus pagos
 * GET /api/service-monthly-payments/status/:serviceId
 */
const getServicePaymentStatus = async (req, res) => {
  try {
    const { serviceId } = req.params;

    if (!serviceId) {
      return res.status(400).json({
        success: false,
        message: 'serviceId es requerido'
      });
    }

    const status = await serviceMonthlyPaymentsModel.getServicePaymentStatus(serviceId);

    if (!status) {
      return res.status(404).json({
        success: false,
        message: 'Servicio no encontrado'
      });
    }

    // Calcular totales
    const initialPayments = status.payments.filter(p => p.payment_type === 'initial');
    const monthlyPayments = status.payments.filter(p => p.payment_type === 'monthly');

    const totalPaid = status.payments.reduce((sum, p) => sum + parseFloat(p.payment_amount || 0), 0);

    res.json({
      success: true,
      data: {
        service: status.service,
        payments: {
          initial: initialPayments,
          monthly: monthlyPayments,
          all: status.payments
        },
        summary: {
          initial_paid: initialPayments.length > 0,
          monthly_count: monthlyPayments.length,
          total_paid: totalPaid,
          service_status: status.service.service_status,
          is_completed: status.service.service_status === 'completed'
        }
      }
    });

  } catch (error) {
    console.error('Error en getServicePaymentStatus:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener el estado del servicio',
      error: error.message
    });
  }
};

/**
 * Obtener pagos de un paciente
 * GET /api/service-monthly-payments/patient/:patientId
 */
const getPaymentsByPatient = async (req, res) => {
  try {
    const { patientId } = req.params;

    if (!patientId) {
      return res.status(400).json({
        success: false,
        message: 'patientId es requerido'
      });
    }

    const payments = await serviceMonthlyPaymentsModel.getPaymentsByPatient(patientId);

    res.json({
      success: true,
      data: payments
    });

  } catch (error) {
    console.error('Error en getPaymentsByPatient:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener los pagos del paciente',
      error: error.message
    });
  }
};

/**
 * Obtener pagos de un dentista (para comisiones)
 * GET /api/service-monthly-payments/dentist/:dentistId
 */
const getPaymentsByDentist = async (req, res) => {
  try {
    const { dentistId } = req.params;
    const { start_date, end_date } = req.query;

    if (!dentistId) {
      return res.status(400).json({
        success: false,
        message: 'dentistId es requerido'
      });
    }

    // Si no se proporcionan fechas, usar el mes actual
    const today = new Date();
    const startDate = start_date || formatDateYMD(new Date(today.getFullYear(), today.getMonth(), 1));
    const endDate = end_date || formatDateYMD(new Date(today.getFullYear(), today.getMonth() + 1, 0));

    const [payments, summary] = await Promise.all([
      serviceMonthlyPaymentsModel.getPaymentsByDentist(dentistId, startDate, endDate),
      serviceMonthlyPaymentsModel.getDentistPaymentsSummary(dentistId, startDate, endDate)
    ]);

    res.json({
      success: true,
      data: {
        payments,
        summary,
        period: { start_date: startDate, end_date: endDate }
      }
    });

  } catch (error) {
    console.error('Error en getPaymentsByDentist:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener los pagos del dentista',
      error: error.message
    });
  }
};

/**
 * Finalizar un servicio (marcar como completado)
 * POST /api/service-monthly-payments/finalize/:serviceId
 */
const finalizeService = async (req, res) => {
  try {
    const { serviceId } = req.params;
    const { dentist_id, notes } = req.body;

    if (!serviceId) {
      return res.status(400).json({
        success: false,
        message: 'serviceId es requerido'
      });
    }

    if (!dentist_id) {
      return res.status(400).json({
        success: false,
        message: 'dentist_id es requerido'
      });
    }

    const userId = req.user?.userId || req.user?.user_id || null;

    // Verificar que el servicio existe y no esta ya finalizado
    const serviceStatus = await serviceMonthlyPaymentsModel.getServicePaymentStatus(serviceId);

    if (!serviceStatus) {
      return res.status(404).json({
        success: false,
        message: 'Servicio no encontrado'
      });
    }

    if (serviceStatus.service.service_status === 'completed') {
      return res.status(400).json({
        success: false,
        message: 'El servicio ya esta finalizado'
      });
    }

    const result = await serviceMonthlyPaymentsModel.finalizeService(
      serviceId,
      dentist_id,
      notes,
      userId
    );

    if (!result) {
      return res.status(404).json({
        success: false,
        message: 'No se pudo finalizar el servicio'
      });
    }

    res.json({
      success: true,
      message: 'Servicio finalizado exitosamente',
      data: result
    });

  } catch (error) {
    console.error('Error en finalizeService:', error);
    res.status(500).json({
      success: false,
      message: 'Error al finalizar el servicio',
      error: error.message
    });
  }
};

/**
 * Eliminar un pago
 * DELETE /api/service-monthly-payments/:paymentId
 */
const deletePayment = async (req, res) => {
  try {
    const { paymentId } = req.params;

    if (!paymentId) {
      return res.status(400).json({
        success: false,
        message: 'paymentId es requerido'
      });
    }

    const userId = req.user?.userId || req.user?.user_id || null;

    const result = await serviceMonthlyPaymentsModel.deletePayment(paymentId, userId);

    res.json({
      success: true,
      message: 'Pago eliminado exitosamente',
      data: result
    });

  } catch (error) {
    console.error('Error en deletePayment:', error);

    if (error.message === 'Pago no encontrado') {
      return res.status(404).json({
        success: false,
        message: error.message
      });
    }

    res.status(500).json({
      success: false,
      message: 'Error al eliminar el pago',
      error: error.message
    });
  }
};

/**
 * Obtener todos los pagos con filtros
 * GET /api/service-monthly-payments
 */
const getAllPayments = async (req, res) => {
  try {
    const filters = {
      patient_id: req.query.patient_id,
      dentist_id: req.query.dentist_id,
      branch_id: req.query.branch_id,
      service_type: req.query.service_type,
      payment_type: req.query.payment_type,
      date_from: req.query.date_from,
      date_to: req.query.date_to,
      limit: req.query.limit ? parseInt(req.query.limit) : undefined,
      offset: req.query.offset ? parseInt(req.query.offset) : undefined
    };

    const payments = await serviceMonthlyPaymentsModel.getAllPayments(filters);

    res.json({
      success: true,
      data: payments
    });

  } catch (error) {
    console.error('Error en getAllPayments:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener los pagos',
      error: error.message
    });
  }
};

/**
 * Obtener conteo de pagos de un servicio
 * GET /api/service-monthly-payments/count/:serviceId
 */
const getPaymentCount = async (req, res) => {
  try {
    const { serviceId } = req.params;

    if (!serviceId) {
      return res.status(400).json({
        success: false,
        message: 'serviceId es requerido'
      });
    }

    const count = await serviceMonthlyPaymentsModel.getPaymentCount(serviceId);

    res.json({
      success: true,
      data: count
    });

  } catch (error) {
    console.error('Error en getPaymentCount:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener el conteo de pagos',
      error: error.message
    });
  }
};

module.exports = {
  registerPayment,
  getPaymentsByService,
  getServicePaymentStatus,
  getPaymentsByPatient,
  getPaymentsByDentist,
  finalizeService,
  deletePayment,
  getAllPayments,
  getPaymentCount
};
