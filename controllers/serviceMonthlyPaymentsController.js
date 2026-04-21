/**
 * Controller: serviceMonthlyPaymentsController.js
 * Controlador para pagos fraccionados de servicios adicionales
 * (ortodoncia, implantes y prótesis)
 */

const { formatDateYMD, formatTimeHMS } = require('../utils/dateUtils');
const serviceMonthlyPaymentsModel = require('../models/serviceMonthlyPaymentsModel');

const SUPPORTED_SERVICE_TYPES = ['orthodontic', 'implant', 'prosthesis'];
const SUPPORTED_PAYMENT_TYPES = ['initial', 'monthly'];

/**
 * Construye el summary con saldo, total esperado y progreso a partir del estado crudo del servicio.
 * Sin hardcodeos: todos los valores vienen de consultation_additional_services y los pagos reales.
 */
const buildSummary = (service, payments) => {
  const expectedTotal = Number(service.edited_monto_total || service.original_monto_total || 0);
  const initialExpected = Number(service.edited_inicial || service.original_inicial || 0);
  const monthlyExpected = Number(service.edited_mensual || service.original_mensual || 0);

  const initialPayments = payments.filter(p => p.payment_type === 'initial');
  const monthlyPayments = payments.filter(p => p.payment_type === 'monthly');
  const totalPaid = payments.reduce((sum, p) => sum + Number(p.payment_amount || 0), 0);
  const remainingBalance = Math.max(expectedTotal - totalPaid, 0);
  const progressPercent = expectedTotal > 0
    ? Math.min(100, Math.round((totalPaid / expectedTotal) * 10000) / 100)
    : 0;

  return {
    expected_total: Number(expectedTotal.toFixed(2)),
    initial_expected: Number(initialExpected.toFixed(2)),
    monthly_expected: Number(monthlyExpected.toFixed(2)),
    initial_paid: initialPayments.length > 0,
    monthly_count: monthlyPayments.length,
    total_paid: Number(totalPaid.toFixed(2)),
    remaining_balance: Number(remainingBalance.toFixed(2)),
    progress_percent: progressPercent,
    is_fully_paid: expectedTotal > 0 && remainingBalance <= 0.0001,
    service_status: service.service_status,
    is_completed: service.service_status === 'completed'
  };
};

/**
 * Registrar un pago (inicial o mensual/parcial)
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
      payment_type,
      registered_by_dentist_id,
      clinical_notes,
      service_name
    } = req.body;

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

    if (!payment_amount || Number(payment_amount) <= 0) {
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

    const resolvedPaymentType = payment_type || 'monthly';
    if (!SUPPORTED_PAYMENT_TYPES.includes(resolvedPaymentType)) {
      return res.status(400).json({
        success: false,
        message: `payment_type debe ser uno de: ${SUPPORTED_PAYMENT_TYPES.join(', ')}`
      });
    }

    const userId = req.user?.userId || req.user?.user_id || null;
    const performedDate = formatDateYMD();
    const performedTime = formatTimeHMS();
    const resolvedServiceName = service_name || 'Servicio Adicional';
    const itemName = resolvedPaymentType === 'initial'
      ? `${resolvedServiceName} - Pago Inicial`
      : `${resolvedServiceName} - Cuota`;
    const itemDescription = clinical_notes
      || `Pago ${resolvedPaymentType === 'initial' ? 'inicial' : 'parcial'} de servicio adicional`;

    const result = await serviceMonthlyPaymentsModel.registerPaymentWithIncome({
      incomeData: {
        consultation_id,
        patient_id,
        branch_id,
        item_name: itemName,
        item_description: itemDescription,
        performed_by_dentist_id: registered_by_dentist_id,
        performed_date: performedDate,
        performed_time: performedTime,
        clinical_notes: clinical_notes || null,
        user_id_registration: userId
      },
      paymentData: {
        consultation_additional_service_id,
        consultation_id,
        patient_id,
        branch_id,
        payment_amount,
        payment_date: performedDate,
        payment_type: resolvedPaymentType,
        registered_by_dentist_id,
        clinical_notes: clinical_notes || null,
        user_id_registration: userId
      }
    });

    return res.status(201).json({
      success: true,
      message: resolvedPaymentType === 'initial'
        ? 'Pago inicial registrado exitosamente'
        : `Cuota #${result.payment_number} registrada exitosamente`,
      data: {
        payment: result.payment,
        income: result.income
      }
    });

  } catch (error) {
    console.error('Error en registerPayment:', error);
    const clientErrorMessages = [
      'Servicio adicional no encontrado',
      'No se pueden agregar pagos a un servicio finalizado'
    ];
    if (
      clientErrorMessages.includes(error.message)
      || error.message.startsWith('El monto excede el saldo restante')
    ) {
      const isNotFound = error.message === 'Servicio adicional no encontrado';
      return res.status(isNotFound ? 404 : 400).json({
        success: false,
        message: error.message
      });
    }
    return res.status(500).json({
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

    const initialPayments = status.payments.filter(p => p.payment_type === 'initial');
    const monthlyPayments = status.payments.filter(p => p.payment_type === 'monthly');

    res.json({
      success: true,
      data: {
        service: status.service,
        payments: {
          initial: initialPayments,
          monthly: monthlyPayments,
          all: status.payments
        },
        summary: buildSummary(status.service, status.payments)
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
 * Obtener el estado de cuenta consolidado del paciente:
 * lista de servicios adicionales con presupuesto, saldo, progreso y pagos.
 * GET /api/service-monthly-payments/patient/:patientId/statement
 */
const getPatientAccountStatement = async (req, res) => {
  try {
    const { patientId } = req.params;
    if (!patientId) {
      return res.status(400).json({ success: false, message: 'patientId es requerido' });
    }
    const statement = await serviceMonthlyPaymentsModel.getPatientAccountStatement(Number(patientId));

    const aggregate = statement.reduce((acc, s) => {
      acc.expected_total += s.expected_total;
      acc.total_paid += s.total_paid;
      acc.remaining_balance += s.remaining_balance;
      acc.services_count += 1;
      if (s.service_status === 'in_progress') acc.in_progress_count += 1;
      else if (s.service_status === 'completed') acc.completed_count += 1;
      else if (s.service_status === 'pending') acc.pending_count += 1;
      return acc;
    }, {
      expected_total: 0,
      total_paid: 0,
      remaining_balance: 0,
      services_count: 0,
      in_progress_count: 0,
      completed_count: 0,
      pending_count: 0
    });

    return res.json({
      success: true,
      data: {
        services: statement,
        aggregate: {
          expected_total: Number(aggregate.expected_total.toFixed(2)),
          total_paid: Number(aggregate.total_paid.toFixed(2)),
          remaining_balance: Number(aggregate.remaining_balance.toFixed(2)),
          services_count: aggregate.services_count,
          in_progress_count: aggregate.in_progress_count,
          completed_count: aggregate.completed_count,
          pending_count: aggregate.pending_count
        }
      }
    });
  } catch (error) {
    console.error('Error en getPatientAccountStatement:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al obtener el estado de cuenta del paciente',
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
  getPatientAccountStatement,
  getPaymentsByPatient,
  getPaymentsByDentist,
  finalizeService,
  deletePayment,
  getAllPayments,
  getPaymentCount
};
