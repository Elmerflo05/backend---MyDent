/**
 * Controller para Income Payments (Aplicación de pagos a deudas)
 * Endpoints para gestionar la relación entre pagos y deudas (procedure_income)
 */

const incomePaymentsModel = require('../models/incomePaymentsModel');
const procedureIncomeModel = require('../models/procedureIncomeModel');
const pool = require('../config/db');
const { createNotification } = require('../models/notificationsModel');
const { addStatusHistory } = require('../models/appointmentsModel');

/**
 * Aplicar un pago a una o más deudas
 * POST /api/income-payments/apply
 * Body: { payment_id, applications: [{ procedure_income_id, amount_applied, notes? }] }
 */
const applyPayment = async (req, res) => {
  try {
    const { payment_id, applications } = req.body;
    const userId = req.user?.user_id;

    // Validaciones
    if (!payment_id) {
      return res.status(400).json({
        success: false,
        message: 'payment_id es requerido'
      });
    }

    if (!applications || !Array.isArray(applications) || applications.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'applications es requerido y debe ser un array no vacío'
      });
    }

    // Validar cada aplicación
    for (const app of applications) {
      if (!app.procedure_income_id || !app.amount_applied) {
        return res.status(400).json({
          success: false,
          message: 'Cada aplicación debe tener procedure_income_id y amount_applied'
        });
      }

      if (app.amount_applied <= 0) {
        return res.status(400).json({
          success: false,
          message: 'amount_applied debe ser mayor a 0'
        });
      }
    }

    const result = await incomePaymentsModel.applyPaymentToIncomes(
      payment_id,
      applications,
      userId
    );

    res.status(200).json({
      success: true,
      message: `Pago aplicado a ${result.applied_count} deuda(s)`,
      data: result
    });
  } catch (error) {
    console.error('Error al aplicar pago:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error al aplicar pago'
    });
  }
};

/**
 * Obtener aplicaciones de un pago
 * GET /api/income-payments/payment/:paymentId
 */
const getPaymentApplications = async (req, res) => {
  try {
    const { paymentId } = req.params;

    if (!paymentId) {
      return res.status(400).json({
        success: false,
        message: 'paymentId es requerido'
      });
    }

    const applications = await incomePaymentsModel.getPaymentApplications(parseInt(paymentId));

    res.status(200).json({
      success: true,
      data: applications
    });
  } catch (error) {
    console.error('Error al obtener aplicaciones del pago:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener aplicaciones del pago'
    });
  }
};

/**
 * Obtener historial de pagos de una deuda
 * GET /api/income-payments/income/:incomeId
 */
const getIncomePaymentHistory = async (req, res) => {
  try {
    const { incomeId } = req.params;

    if (!incomeId) {
      return res.status(400).json({
        success: false,
        message: 'incomeId es requerido'
      });
    }

    const history = await incomePaymentsModel.getIncomePaymentHistory(parseInt(incomeId));

    res.status(200).json({
      success: true,
      data: history
    });
  } catch (error) {
    console.error('Error al obtener historial de pagos:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener historial de pagos'
    });
  }
};

/**
 * Revertir una aplicación de pago
 * DELETE /api/income-payments/:incomePaymentId
 */
const revertPaymentApplication = async (req, res) => {
  try {
    const { incomePaymentId } = req.params;
    const userId = req.user?.user_id;

    if (!incomePaymentId) {
      return res.status(400).json({
        success: false,
        message: 'incomePaymentId es requerido'
      });
    }

    const result = await incomePaymentsModel.revertPaymentApplication(
      parseInt(incomePaymentId),
      userId
    );

    res.status(200).json({
      success: true,
      message: 'Aplicación de pago revertida exitosamente',
      data: result
    });
  } catch (error) {
    console.error('Error al revertir aplicación de pago:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error al revertir aplicación de pago'
    });
  }
};

/**
 * Marcar una deuda como cortesía
 * PATCH /api/income-payments/courtesy/:incomeId
 */
const markAsCourtesy = async (req, res) => {
  try {
    const { incomeId } = req.params;
    const { notes } = req.body;
    const userId = req.user?.user_id;

    if (!incomeId) {
      return res.status(400).json({
        success: false,
        message: 'incomeId es requerido'
      });
    }

    const result = await incomePaymentsModel.markAsCourtesy(
      parseInt(incomeId),
      userId,
      notes
    );

    res.status(200).json({
      success: true,
      message: 'Deuda marcada como cortesía exitosamente',
      data: result
    });
  } catch (error) {
    console.error('Error al marcar como cortesía:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error al marcar como cortesía'
    });
  }
};

/**
 * Obtener resumen de cuentas por cobrar
 * GET /api/income-payments/accounts-receivable/summary
 */
const getAccountsReceivableSummary = async (req, res) => {
  try {
    const { branch_id } = req.query;

    const summary = await incomePaymentsModel.getAccountsReceivableSummary(
      branch_id ? parseInt(branch_id) : null
    );

    res.status(200).json({
      success: true,
      data: summary
    });
  } catch (error) {
    console.error('Error al obtener resumen de cuentas por cobrar:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener resumen de cuentas por cobrar'
    });
  }
};

/**
 * Obtener pacientes con deudas pendientes
 * GET /api/income-payments/patients-with-debts
 */
const getPatientsWithDebts = async (req, res) => {
  try {
    const { branch_id, min_balance, only_overdue, limit } = req.query;

    const patients = await incomePaymentsModel.getPatientsWithDebts({
      branch_id: branch_id ? parseInt(branch_id) : null,
      min_balance: min_balance ? parseFloat(min_balance) : null,
      only_overdue: only_overdue === 'true',
      limit: limit ? parseInt(limit) : null
    });

    res.status(200).json({
      success: true,
      data: patients,
      total: patients.length
    });
  } catch (error) {
    console.error('Error al obtener pacientes con deudas:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener pacientes con deudas'
    });
  }
};

/**
 * Obtener deudas pendientes de un paciente
 * GET /api/income-payments/patient/:patientId/pending
 */
const getPatientPendingDebts = async (req, res) => {
  try {
    const { patientId } = req.params;
    const { branch_id, only_overdue, include_all } = req.query;

    if (!patientId) {
      return res.status(400).json({
        success: false,
        message: 'patientId es requerido'
      });
    }

    const debts = await procedureIncomeModel.getPatientPendingDebts(
      parseInt(patientId),
      {
        branch_id: branch_id ? parseInt(branch_id) : null,
        only_overdue: only_overdue === 'true',
        include_all: include_all === 'true'
      }
    );

    // Calcular totales (excluir rechazados del balance pendiente)
    const totalBalance = debts
      .filter(d => d.payment_status !== 'rejected')
      .reduce((sum, d) => sum + parseFloat(d.balance || 0), 0);

    res.status(200).json({
      success: true,
      data: {
        debts,
        total_balance: totalBalance,
        total_items: debts.length
      }
    });
  } catch (error) {
    console.error('Error al obtener deudas del paciente:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener deudas del paciente'
    });
  }
};

/**
 * Obtener balance de un paciente
 * GET /api/income-payments/patient/:patientId/balance
 */
const getPatientBalance = async (req, res) => {
  try {
    const { patientId } = req.params;
    const { branch_id } = req.query;

    if (!patientId) {
      return res.status(400).json({
        success: false,
        message: 'patientId es requerido'
      });
    }

    const balance = await procedureIncomeModel.getPatientBalance(
      parseInt(patientId),
      branch_id ? parseInt(branch_id) : null
    );

    res.status(200).json({
      success: true,
      data: balance
    });
  } catch (error) {
    console.error('Error al obtener balance del paciente:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener balance del paciente'
    });
  }
};

/**
 * Marcar paciente como notificado
 * POST /api/income-payments/patient/:patientId/notify
 */
const markPatientAsNotified = async (req, res) => {
  try {
    const { patientId } = req.params;

    if (!patientId) {
      return res.status(400).json({
        success: false,
        message: 'patientId es requerido'
      });
    }

    const updatedCount = await procedureIncomeModel.markPatientAsNotified(parseInt(patientId));

    res.status(200).json({
      success: true,
      message: `${updatedCount} deuda(s) marcada(s) como notificada(s)`,
      data: { updated_count: updatedCount }
    });
  } catch (error) {
    console.error('Error al marcar paciente como notificado:', error);
    res.status(500).json({
      success: false,
      message: 'Error al marcar paciente como notificado'
    });
  }
};

// ============================================================
// ENDPOINTS DE VOUCHER Y VERIFICACIÓN
// ============================================================

/**
 * Enviar voucher de pago (paciente sube comprobante)
 * POST /api/income-payments/submit-voucher
 * Body: { income_ids, voucher_url, payment_method_id }
 */
const submitVoucher = async (req, res) => {
  try {
    const { income_ids, voucher_url, payment_method_id } = req.body;
    const patientId = req.user?.patient_id;

    // Validaciones
    if (!income_ids || !Array.isArray(income_ids) || income_ids.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'income_ids es requerido y debe ser un array no vacío'
      });
    }

    if (!voucher_url) {
      return res.status(400).json({
        success: false,
        message: 'voucher_url es requerido'
      });
    }

    if (!payment_method_id) {
      return res.status(400).json({
        success: false,
        message: 'payment_method_id es requerido'
      });
    }

    if (!patientId) {
      return res.status(403).json({
        success: false,
        message: 'Solo pacientes pueden enviar vouchers'
      });
    }

    const result = await incomePaymentsModel.submitVoucher(
      income_ids.map(id => parseInt(id)),
      voucher_url,
      parseInt(payment_method_id),
      patientId
    );

    res.status(200).json({
      success: true,
      message: 'Voucher enviado exitosamente. Pendiente de verificación.',
      data: result
    });
  } catch (error) {
    console.error('Error al enviar voucher:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error al enviar voucher'
    });
  }
};

/**
 * Obtener pagos pendientes de verificación
 * GET /api/income-payments/pending-verification
 */
const getPendingVerification = async (req, res) => {
  try {
    const { branch_id, patient_id } = req.query;

    const payments = await incomePaymentsModel.getPendingVerification({
      branch_id: branch_id ? parseInt(branch_id) : null,
      patient_id: patient_id ? parseInt(patient_id) : null
    });

    res.status(200).json({
      success: true,
      data: payments,
      total: payments.length
    });
  } catch (error) {
    console.error('Error al obtener pagos pendientes de verificación:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener pagos pendientes de verificación'
    });
  }
};

/**
 * Aprobar voucher de pago
 * PATCH /api/income-payments/approve/:incomeId
 */
const approveVoucher = async (req, res) => {
  try {
    const { incomeId } = req.params;
    const userId = req.user?.user_id;

    if (!incomeId) {
      return res.status(400).json({
        success: false,
        message: 'incomeId es requerido'
      });
    }

    const result = await incomePaymentsModel.approveVoucher(
      parseInt(incomeId),
      userId
    );

    // ============================================
    // SINCRONIZACIÓN: Aprobar cita asociada si está pendiente de aprobación
    // Si el voucher fue aprobado y la cita está en estado 0, aprobarla automáticamente
    // ============================================
    let appointmentApproved = false;
    try {
      if (result.appointment_id) {
        const appointmentCheck = await pool.query(
          `SELECT appointment_id, appointment_status_id, patient_id, branch_id
           FROM appointments
           WHERE appointment_id = $1 AND status = 'active' AND appointment_status_id = 0`,
          [result.appointment_id]
        );

        if (appointmentCheck.rows.length > 0) {
          await pool.query(
            `UPDATE appointments SET
               appointment_status_id = 1,
               approved_at = CURRENT_TIMESTAMP,
               approved_by = $1,
               approval_notes = 'Aprobación automática por verificación de voucher',
               user_id_modification = $1,
               date_time_modification = CURRENT_TIMESTAMP
             WHERE appointment_id = $2 AND status = 'active' AND appointment_status_id = 0`,
            [userId, result.appointment_id]
          );

          // Registrar en historial
          await addStatusHistory({
            appointment_id: result.appointment_id,
            old_status_id: 0,
            new_status_id: 1,
            changed_by_user_id: userId,
            notes: 'Cita aprobada automáticamente por aprobación de voucher'
          });

          // Emitir WebSocket
          const apt = appointmentCheck.rows[0];
          if (global.io && apt.branch_id) {
            const eventData = {
              type: 'approved',
              appointment: { appointment_id: result.appointment_id, appointment_status_id: 1 },
              timestamp: new Date().toISOString()
            };
            global.io.to(`branch-${apt.branch_id}`).emit('appointment-update', eventData);
            global.io.to('global-appointments').emit('appointment-update', eventData);
            if (apt.patient_id) {
              global.io.to(`patient-${apt.patient_id}`).emit('appointment-update', eventData);
            }
          }

          appointmentApproved = true;
          console.log(`🔗 Sincronización pago→cita: Cita #${result.appointment_id} aprobada por verificación de voucher`);
        }
      }
    } catch (syncError) {
      console.error('⚠️ Error al sincronizar aprobación de voucher con cita:', syncError.message);
    }

    res.status(200).json({
      success: true,
      message: appointmentApproved
        ? 'Pago aprobado y cita asociada aprobada automáticamente'
        : 'Pago aprobado exitosamente',
      data: result,
      appointment_approved: appointmentApproved
    });
  } catch (error) {
    console.error('Error al aprobar voucher:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error al aprobar voucher'
    });
  }
};

/**
 * Rechazar voucher de pago
 * PATCH /api/income-payments/reject/:incomeId
 * Body: { reason }
 */
const rejectVoucher = async (req, res) => {
  try {
    const { incomeId } = req.params;
    const { reason } = req.body;
    const userId = req.user?.user_id;

    if (!incomeId) {
      return res.status(400).json({
        success: false,
        message: 'incomeId es requerido'
      });
    }

    if (!reason) {
      return res.status(400).json({
        success: false,
        message: 'reason es requerido'
      });
    }

    const result = await incomePaymentsModel.rejectVoucher(
      parseInt(incomeId),
      userId,
      reason
    );

    // ============================================
    // SINCRONIZACIÓN: Rechazar cita asociada si está pendiente de aprobación
    // Si el voucher fue rechazado y la cita está en estado 0 (Pendiente de Aprobación),
    // también rechazar la cita (no tiene sentido mantenerla pendiente sin pago válido)
    // ============================================
    let appointmentRejected = false;
    try {
      if (result.appointment_id) {
        // Verificar que la cita está en estado "Pendiente de Aprobación" (0)
        const appointmentCheck = await pool.query(
          `SELECT appointment_id, appointment_status_id, patient_id, branch_id,
                  appointment_date, start_time
           FROM appointments
           WHERE appointment_id = $1 AND status = 'active' AND appointment_status_id = 0`,
          [result.appointment_id]
        );

        if (appointmentCheck.rows.length > 0) {
          const apt = appointmentCheck.rows[0];

          // Rechazar la cita
          await pool.query(
            `UPDATE appointments SET
               appointment_status_id = 8,
               rejected_at = CURRENT_TIMESTAMP,
               rejected_by = $1,
               rejection_reason = $2,
               user_id_modification = $1,
               date_time_modification = CURRENT_TIMESTAMP
             WHERE appointment_id = $3 AND status = 'active' AND appointment_status_id = 0`,
            [userId, `Voucher rechazado: ${reason}`, result.appointment_id]
          );

          // Registrar en historial de estados
          await addStatusHistory({
            appointment_id: result.appointment_id,
            old_status_id: 0,
            new_status_id: 8,
            changed_by_user_id: userId,
            notes: `Cita rechazada automáticamente por rechazo de voucher: ${reason}`
          });

          // Notificar al paciente
          if (apt.patient_id) {
            const dateStr = apt.appointment_date instanceof Date
              ? apt.appointment_date.toISOString().split('T')[0]
              : String(apt.appointment_date).split('T')[0];
            const appointmentDate = new Date(dateStr + 'T12:00:00');
            const formattedDate = appointmentDate.toLocaleDateString('es-PE', {
              weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
            });
            const formattedTime = apt.start_time ? apt.start_time.substring(0, 5) : '';

            await createNotification({
              patient_id: apt.patient_id,
              notification_type: 'appointment_rejected',
              notification_title: 'Cita Rechazada - Voucher Inválido',
              notification_message: `Tu cita del ${formattedDate} a las ${formattedTime} fue rechazada porque el voucher de pago no es válido. Motivo: ${reason}. Si deseas reagendar, deberás registrar una nueva cita.`,
              notification_data: JSON.stringify({
                appointment_id: result.appointment_id,
                rejection_reason: reason,
                rejected_at: new Date().toISOString()
              }),
              priority: 'high',
              user_id_registration: userId
            });
          }

          // Emitir WebSocket si está disponible
          if (global.io && apt.branch_id) {
            const eventData = {
              type: 'rejected',
              appointment: { appointment_id: result.appointment_id, appointment_status_id: 8 },
              timestamp: new Date().toISOString()
            };
            global.io.to(`branch-${apt.branch_id}`).emit('appointment-update', eventData);
            global.io.to('global-appointments').emit('appointment-update', eventData);
            if (apt.patient_id) {
              global.io.to(`patient-${apt.patient_id}`).emit('appointment-update', eventData);
            }
          }

          // Cancelar el procedure_income asociado (la deuda ya no aplica si la cita fue rechazada)
          await pool.query(
            `UPDATE procedure_income SET
               income_status = 'cancelled',
               balance = 0,
               payment_status = 'rejected',
               user_id_modification = $1,
               date_time_modification = CURRENT_TIMESTAMP
             WHERE income_id = $2 AND status = 'active'`,
            [userId, parseInt(incomeId)]
          );

          appointmentRejected = true;
          console.log(`🔗 Sincronización pago→cita: Cita #${result.appointment_id} rechazada por voucher inválido. Income #${incomeId} cancelado.`);
        }
      }
    } catch (syncError) {
      console.error('⚠️ Error al sincronizar rechazo de voucher con cita:', syncError.message);
      // No fallar la operación principal
    }

    res.status(200).json({
      success: true,
      message: appointmentRejected
        ? 'Pago rechazado y cita asociada rechazada automáticamente'
        : 'Pago rechazado',
      data: result,
      appointment_rejected: appointmentRejected
    });
  } catch (error) {
    console.error('Error al rechazar voucher:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error al rechazar voucher'
    });
  }
};

/**
 * Registrar pago en efectivo (directo por recepción/admin)
 * POST /api/income-payments/register-cash
 * Body: { income_ids, notes? }
 */
const registerCashPayment = async (req, res) => {
  try {
    const { income_ids, notes } = req.body;
    const userId = req.user?.user_id;

    if (!income_ids || !Array.isArray(income_ids) || income_ids.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'income_ids es requerido y debe ser un array no vacío'
      });
    }

    const result = await incomePaymentsModel.registerCashPayment(
      income_ids.map(id => parseInt(id)),
      userId,
      notes
    );

    res.status(200).json({
      success: true,
      message: `${result.updated_count} pago(s) registrado(s) en efectivo`,
      data: result
    });
  } catch (error) {
    console.error('Error al registrar pago en efectivo:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error al registrar pago en efectivo'
    });
  }
};

/**
 * Obtener historial de pagos verificados/rechazados
 * GET /api/income-payments/verified
 */
const getVerifiedPayments = async (req, res) => {
  try {
    const { branch_id, payment_status, date_from, date_to, limit } = req.query;

    const payments = await incomePaymentsModel.getVerifiedPayments({
      branch_id: branch_id ? parseInt(branch_id) : null,
      payment_status: payment_status || null,
      date_from: date_from || null,
      date_to: date_to || null,
      limit: limit ? parseInt(limit) : null
    });

    res.status(200).json({
      success: true,
      data: payments,
      total: payments.length
    });
  } catch (error) {
    console.error('Error al obtener pagos verificados:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener pagos verificados'
    });
  }
};

/**
 * Obtener historial completo de servicios/pagos
 * GET /api/income-payments/history
 * Query: branch_id?, payment_status?, date_from?, date_to?, limit?, offset?
 */
const getAllPaymentHistory = async (req, res) => {
  try {
    const { branch_id, payment_status, date_from, date_to, limit, offset } = req.query;

    const history = await incomePaymentsModel.getAllPaymentHistory({
      branch_id: branch_id ? parseInt(branch_id) : null,
      payment_status: payment_status || null,
      date_from: date_from || null,
      date_to: date_to || null,
      limit: limit ? parseInt(limit) : 200,
      offset: offset ? parseInt(offset) : 0
    });

    res.status(200).json({
      success: true,
      data: history,
      total: history.length
    });
  } catch (error) {
    console.error('Error al obtener historial de pagos:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener historial de pagos'
    });
  }
};

// ============================================================
// ENDPOINTS DE GENERACIÓN AUTOMÁTICA DE CUOTAS
// ============================================================

/**
 * Genera cuotas automáticamente para un servicio adicional
 * POST /api/income-payments/generate-quotas/:serviceId
 * Body: { startDate?, paymentDay? }
 */
const generateServiceQuotas = async (req, res) => {
  try {
    const { serviceId } = req.params;
    const { startDate, paymentDay } = req.body;
    const userId = req.user?.user_id;

    if (!serviceId) {
      return res.status(400).json({
        success: false,
        message: 'serviceId es requerido'
      });
    }

    const result = await incomePaymentsModel.generateServiceQuotas(
      parseInt(serviceId),
      userId,
      {
        startDate: startDate || null,
        paymentDay: paymentDay ? parseInt(paymentDay) : 5
      }
    );

    if (!result.success) {
      return res.status(400).json(result);
    }

    res.status(200).json(result);
  } catch (error) {
    console.error('Error al generar cuotas del servicio:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error al generar cuotas del servicio'
    });
  }
};

/**
 * Obtiene las cuotas de un servicio adicional
 * GET /api/income-payments/service-quotas/:serviceId
 */
const getServiceQuotas = async (req, res) => {
  try {
    const { serviceId } = req.params;

    if (!serviceId) {
      return res.status(400).json({
        success: false,
        message: 'serviceId es requerido'
      });
    }

    const quotas = await incomePaymentsModel.getServiceQuotas(parseInt(serviceId));

    // Calcular resumen
    const totalAmount = quotas.reduce((sum, q) => sum + parseFloat(q.final_amount || 0), 0);
    const paidAmount = quotas.reduce((sum, q) => sum + parseFloat(q.amount_paid || 0), 0);
    const pendingAmount = totalAmount - paidAmount;
    const paidQuotas = quotas.filter(q => q.payment_status === 'paid').length;

    res.status(200).json({
      success: true,
      data: {
        quotas,
        summary: {
          total_quotas: quotas.length,
          paid_quotas: paidQuotas,
          pending_quotas: quotas.length - paidQuotas,
          total_amount: totalAmount,
          paid_amount: paidAmount,
          pending_amount: pendingAmount
        }
      }
    });
  } catch (error) {
    console.error('Error al obtener cuotas del servicio:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener cuotas del servicio'
    });
  }
};

/**
 * Obtiene servicios adicionales pendientes de generar cuotas
 * GET /api/income-payments/services-without-quotas
 * Query: branch_id?, patient_id?
 */
const getServicesWithoutQuotas = async (req, res) => {
  try {
    const { branch_id, patient_id } = req.query;

    const services = await incomePaymentsModel.getServicesWithoutQuotas({
      branch_id: branch_id ? parseInt(branch_id) : null,
      patient_id: patient_id ? parseInt(patient_id) : null
    });

    res.status(200).json({
      success: true,
      data: services,
      total: services.length
    });
  } catch (error) {
    console.error('Error al obtener servicios sin cuotas:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener servicios sin cuotas'
    });
  }
};

module.exports = {
  applyPayment,
  getPaymentApplications,
  getIncomePaymentHistory,
  revertPaymentApplication,
  markAsCourtesy,
  getAccountsReceivableSummary,
  getPatientsWithDebts,
  getPatientPendingDebts,
  getPatientBalance,
  markPatientAsNotified,
  // Voucher y verificación
  submitVoucher,
  getPendingVerification,
  approveVoucher,
  rejectVoucher,
  registerCashPayment,
  getVerifiedPayments,
  // Historial de pagos
  getAllPaymentHistory,
  // Generación de cuotas
  generateServiceQuotas,
  getServiceQuotas,
  getServicesWithoutQuotas
};
