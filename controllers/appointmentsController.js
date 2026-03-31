const pool = require('../config/db');
const {
  isValidAppointmentType,
  canRoleCreateType,
  DEFAULT_APPOINTMENT_TYPE
} = require('../constants/appointmentTypes');
const {
  mapStatusIdToCode
} = require('../constants/appointmentStatuses');
const PRICING = require('../constants/pricing');
const procedureIncomeModel = require('../models/procedureIncomeModel');
const { isFirstFreeConsultationAvailable, useFirstFreeConsultation } = require('../services/pricingService');
const { validateDuration } = require('../services/appointmentConfigService');

/**
 * Emitir evento de actualización de cita por WebSocket
 * @param {string} eventType - Tipo de evento: 'created', 'updated', 'cancelled', 'status_changed'
 * @param {object} appointment - Datos de la cita
 * @param {number} branchId - ID de la sede
 */
const emitAppointmentEvent = (eventType, appointment, branchId) => {
  if (global.io) {
    const eventData = {
      type: eventType,
      appointment,
      timestamp: new Date().toISOString()
    };

    // Emitir a la sala de la sede específica
    if (branchId) {
      global.io.to(`branch-${branchId}`).emit('appointment-update', eventData);
    }

    // Emitir a la sala global (para super_admin)
    global.io.to('global-appointments').emit('appointment-update', eventData);

    // Emitir a la sala del paciente específico (para el portal del paciente)
    const patientId = appointment.patient_id;
    if (patientId) {
      global.io.to(`patient-${patientId}`).emit('appointment-update', eventData);
    }

    console.log(`📡 WebSocket: Evento '${eventType}' emitido para cita ${appointment.appointment_id || appointment.id}`);
  }
};

const {
  getAllAppointments,
  getAppointmentById,
  createAppointment,
  updateAppointment,
  cancelAppointment,
  markAsArrived,
  markAsCompleted,
  deleteAppointment,
  countAppointments,
  approveAppointment,
  rejectAppointment,
  markAsNoShow,
  updateStatus,
  checkAvailability,
  createRescheduleProposal,
  getRescheduleProposal,
  updateRescheduleProposal,
  addStatusHistory
} = require('../models/appointmentsModel');
const { createNotification } = require('../models/notificationsModel');

/**
 * Notificar al personal sobre una nueva cita
 * Notifica a: super_admin (role_id=1), admin de la sede (role_id=2), recepcionistas de la sede (role_id=4)
 * @param {object} appointmentData - Datos de la cita creada
 * @param {number} branchId - ID de la sede
 */
const notifyStaffAboutNewAppointment = async (appointmentData, branchId) => {
  try {
    // Obtener información del paciente y dentista para el mensaje
    // IMPORTANTE: appointments.dentist_id -> dentists.dentist_id -> users.user_id
    const appointmentDetails = await pool.query(`
      SELECT
        a.appointment_id,
        a.appointment_date,
        a.start_time,
        a.end_time,
        a.appointment_type,
        p.first_name as patient_first_name,
        p.last_name as patient_last_name,
        u.first_name as dentist_first_name,
        u.last_name as dentist_last_name,
        u.user_id as dentist_user_id,
        b.branch_name
      FROM appointments a
      LEFT JOIN patients p ON a.patient_id = p.patient_id
      LEFT JOIN dentists d ON a.dentist_id = d.dentist_id
      LEFT JOIN users u ON d.user_id = u.user_id
      LEFT JOIN branches b ON a.branch_id = b.branch_id
      WHERE a.appointment_id = $1
    `, [appointmentData.appointment_id]);

    if (appointmentDetails.rows.length === 0) {
      console.log('⚠️ No se encontró la cita para notificar');
      return;
    }

    const apt = appointmentDetails.rows[0];
    // Parsear fecha evitando problema de zona horaria UTC
    // PostgreSQL DATE viene como 'YYYY-MM-DD', añadir T12:00:00 para evitar cambio de día
    const dateStr = apt.appointment_date instanceof Date
      ? apt.appointment_date.toISOString().split('T')[0]
      : String(apt.appointment_date).split('T')[0];
    const appointmentDate = new Date(dateStr + 'T12:00:00');
    const formattedDate = appointmentDate.toLocaleDateString('es-PE', {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
    });
    const formattedTime = apt.start_time ? apt.start_time.substring(0, 5) : '';
    const patientName = `${apt.patient_first_name || ''} ${apt.patient_last_name || ''}`.trim();
    const dentistName = `${apt.dentist_first_name || ''} ${apt.dentist_last_name || ''}`.trim();

    // Obtener usuarios a notificar:
    // 1. Super admins (role_id = 1) - todos
    // 2. Admins de la sede específica (role_id = 2, branch_id)
    // 3. Recepcionistas de la sede específica (role_id = 4, branch_id)
    // 4. El odontólogo asignado a la cita - usando su user_id real (obtenido del JOIN correcto)
    const dentistUserId = apt.dentist_user_id;

    const usersToNotify = await pool.query(`
      SELECT DISTINCT user_id, first_name, last_name, role_id, branch_id
      FROM users
      WHERE status = 'active'
        AND (
          role_id = 1
          OR (role_id IN (2, 4) AND branch_id = $1)
          OR user_id = $2
        )
    `, [branchId, dentistUserId]);

    const notificationTitle = 'Nueva Cita Programada';
    const notificationMessage = `Nueva cita para ${patientName} el ${formattedDate} a las ${formattedTime} con ${dentistName || 'Odontólogo'}${apt.branch_name ? ` en ${apt.branch_name}` : ''}.`;
    const notificationData = JSON.stringify({
      appointment_id: apt.appointment_id,
      appointment_date: apt.appointment_date,
      start_time: apt.start_time,
      end_time: apt.end_time,
      patient_name: patientName,
      dentist_name: dentistName,
      branch_name: apt.branch_name,
      appointment_type: apt.appointment_type
    });

    // Crear notificación para cada usuario
    let notificationsCreated = 0;
    for (const user of usersToNotify.rows) {
      try {
        await createNotification({
          user_id: user.user_id,
          patient_id: null,
          notification_type: 'appointment_created',
          notification_title: notificationTitle,
          notification_message: notificationMessage,
          notification_data: notificationData,
          priority: 'normal',
          user_id_registration: appointmentData.user_id_registration || 1
        });
        notificationsCreated++;
      } catch (notifErr) {
        console.error(`⚠️ Error al notificar usuario ${user.user_id}:`, notifErr.message);
      }
    }

    console.log(`🔔 Notificaciones enviadas: ${notificationsCreated} usuarios notificados sobre cita #${apt.appointment_id}`);
  } catch (error) {
    console.error('❌ Error al notificar sobre nueva cita:', error.message);
    // No lanzar error para no afectar la creación de la cita
  }
};
const promotionsModel = require('../models/promotionsModel');
const { validateAndApplyPromotion } = require('../utils/promotionValidation');

/**
 * Obtener todas las citas
 */
const getAppointments = async (req, res) => {
  try {
    const {
      branch_id,
      dentist_id,
      patient_id,
      appointment_status_id,
      date_from,
      date_to,
      search,
      page = 1,
      limit = 20
    } = req.query;

    // ✅ FIX: Convertir patient_id - priorizar patient_id sobre user_id
    let realPatientId = patient_id ? parseInt(patient_id) : null;

    if (realPatientId) {
      // Primero buscar por patient_id exacto
      let patientCheck = await pool.query(
        'SELECT patient_id FROM patients WHERE patient_id = $1',
        [realPatientId]
      );

      // Solo si no existe por patient_id, buscar por user_id
      if (patientCheck.rows.length === 0) {
        patientCheck = await pool.query(
          'SELECT patient_id FROM patients WHERE user_id = $1',
          [realPatientId]
        );
      }

      if (patientCheck.rows.length > 0) {
        realPatientId = patientCheck.rows[0].patient_id;
      }
    }

    const filters = {
      branch_id: branch_id ? parseInt(branch_id) : null,
      dentist_id: dentist_id ? parseInt(dentist_id) : null,
      patient_id: realPatientId,
      appointment_status_id: appointment_status_id ? parseInt(appointment_status_id) : null,
      date_from: date_from || null,
      date_to: date_to || null,
      search: search || null,
      limit: parseInt(limit),
      offset: (parseInt(page) - 1) * parseInt(limit)
    };

    const [appointments, total] = await Promise.all([
      getAllAppointments(filters),
      countAppointments(filters)
    ]);

    // Agregar status_code a cada cita para consistencia frontend-backend
    const appointmentsWithStatusCode = appointments.map(apt => ({
      ...apt,
      status_code: mapStatusIdToCode(apt.appointment_status_id)
    }));

    res.json({
      success: true,
      data: appointmentsWithStatusCode,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Error al obtener citas:', error);
    res.status(500).json({
      success: false,
      error: 'Error al obtener citas'
    });
  }
};

/**
 * Obtener una cita por ID
 */
const getAppointment = async (req, res) => {
  try {
    const { id } = req.params;
    const appointment = await getAppointmentById(parseInt(id));

    if (!appointment) {
      return res.status(404).json({
        success: false,
        error: 'Cita no encontrada'
      });
    }

    // Agregar status_code para consistencia
    const appointmentWithStatusCode = {
      ...appointment,
      status_code: mapStatusIdToCode(appointment.appointment_status_id)
    };

    res.json({
      success: true,
      data: appointmentWithStatusCode
    });
  } catch (error) {
    console.error('Error al obtener cita:', error);
    res.status(500).json({
      success: false,
      error: 'Error al obtener cita'
    });
  }
};

/**
 * Crear una nueva cita
 */
const createNewAppointment = async (req, res) => {
  try {
    // Buscar paciente PRIMERO por patient_id exacto, LUEGO por user_id si no existe
    // Esto evita colisiones cuando patient_id coincide con user_id de otro paciente
    let patientCheck = await pool.query(
      'SELECT patient_id, first_name, last_name, user_id FROM patients WHERE patient_id = $1',
      [req.body.patient_id]
    );

    // Si no se encuentra por patient_id, buscar por user_id (caso: paciente logueado usa su user_id)
    if (patientCheck.rows.length === 0) {
      patientCheck = await pool.query(
        'SELECT patient_id, first_name, last_name, user_id FROM patients WHERE user_id = $1',
        [req.body.patient_id]
      );
    }

    if (patientCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Paciente no encontrado',
        message: 'El paciente no existe en el sistema'
      });
    }

    const patientId = patientCheck.rows[0].patient_id;

    // Determinar el estado inicial de la cita según el rol del usuario
    // Roles con aprobación automática: Superadmin (1), Administrador (2), Recepcionista (4)
    // Estos roles crean citas directamente en estado "Programada" (ID = 1)
    // Otros roles crean citas en estado "Pendiente de Aprobación" (ID = 0)
    const rolesConAprobacionAutomatica = [1, 2, 4];
    const userRoleId = req.user.role_id;
    const estadoInicial = rolesConAprobacionAutomatica.includes(userRoleId) ? 1 : 0;

    // ============================================
    // VERIFICAR PRIMERA CONSULTA GRATIS (Plan de Salud)
    // ============================================
    let appointmentPrice = req.body.price || PRICING.APPOINTMENT_BASE_PRICE;
    let isFirstFreeConsultation = false;

    try {
      // Si el frontend indica primera consulta gratis, o verificar automáticamente
      const firstFreeStatus = await isFirstFreeConsultationAvailable(patientId);
      if (firstFreeStatus.available && (req.body.first_free_consultation === true || req.body.price === 0)) {
        appointmentPrice = 0;
        isFirstFreeConsultation = true;
        console.log(`Primera consulta gratis disponible para paciente #${patientId} - Plan: ${firstFreeStatus.plan_name}`);
      }
    } catch (planError) {
      console.log('Info: No se pudo verificar plan de salud (puede no tener):', planError.message);
    }

    // ============================================
    // VERIFICAR SI ES PACIENTE CONTINUADOR
    // ============================================
    let isContinuingPatient = false;

    if (!isFirstFreeConsultation) {
      // SIEMPRE verificar en BD - nunca confiar solo en el flag del frontend
      // Criterios de paciente continuador (cualquiera de estos):
      //   1. Tiene citas completadas/atendidas (status 3 o 4)
      //   2. Tiene tratamiento registrado (atención integral): consulta con plan de tratamiento
      //   3. Marcado manualmente como continuador por SA (patients.is_new_client = false)
      try {
        const continuadorCheck = await pool.query(
          `SELECT
            (SELECT COUNT(*) FROM appointments
             WHERE patient_id = $1 AND appointment_status_id IN (3, 4) AND status = 'active'
            ) AS completed_appointments,
            (SELECT COUNT(*) FROM consultations c
             INNER JOIN consultation_treatment_plans ctp ON ctp.consultation_id = c.consultation_id
             WHERE c.patient_id = $1 AND c.status = 'active' AND ctp.status = 'active'
            ) AS treatment_plans,
            (SELECT CASE WHEN is_new_client = false THEN 1 ELSE 0 END
             FROM patients WHERE patient_id = $1 AND status = 'active'
            ) AS manually_marked`,
          [patientId]
        );
        const hasCompletedAppointments = parseInt(continuadorCheck.rows[0].completed_appointments) > 0;
        const hasTreatmentPlans = parseInt(continuadorCheck.rows[0].treatment_plans) > 0;
        const manuallyMarked = parseInt(continuadorCheck.rows[0].manually_marked) === 1;

        if (hasCompletedAppointments || hasTreatmentPlans || manuallyMarked) {
          isContinuingPatient = true;
          appointmentPrice = 0;
          const reason = hasCompletedAppointments ? 'citas completadas'
            : hasTreatmentPlans ? 'tratamiento registrado (atención integral)'
            : 'marcado manualmente por administrador';
          console.log(`Paciente continuador #${patientId} (verificado en BD: ${reason}) - Sin cobro de cita`);
        } else if (req.body.is_continuing_patient === true) {
          // Frontend dice continuador pero BD no lo confirma - ignorar flag
          console.warn(`ALERTA: Frontend envió is_continuing_patient=true para paciente #${patientId} pero no tiene citas completadas, tratamientos ni marca manual en BD. Ignorando flag.`);
        }
      } catch (contError) {
        console.log('Info: Error verificando estado de continuador:', contError.message);
      }
    }

    const appointmentData = {
      ...req.body,
      patient_id: patientId,
      appointment_status_id: estadoInicial,
      user_id_registration: req.user.user_id,
      // Precio: 0 si primera consulta gratis, sino precio normal
      price: appointmentPrice,
      // Si tiene aprobación automática, registrar quién y cuándo aprobó
      ...(estadoInicial === 1 && {
        approved_at: new Date(),
        approved_by: req.user.user_id,
        approval_notes: 'Aprobación automática por rol autorizado'
      })
    };

    // ============================================
    // VALIDACIÓN DE APPOINTMENT_TYPE
    // Determinar el tipo de cita (usa el enviado o asigna el default)
    const appointmentType = appointmentData.appointment_type || DEFAULT_APPOINTMENT_TYPE;

    // Validar que el tipo de cita sea válido
    if (!isValidAppointmentType(appointmentType)) {
      return res.status(400).json({
        success: false,
        error: 'Tipo de cita inválido',
        message: 'El tipo de cita especificado no es válido. Tipos permitidos: Consulta, Tratamiento, Control, imaging_study, prosthesis_fitting, follow_up'
      });
    }

    // Validar que el rol del usuario tenga permisos para crear este tipo de cita
    if (!canRoleCreateType(req.user.role_id, appointmentType)) {
      return res.status(403).json({
        success: false,
        error: 'No autorizado',
        message: `Su rol no tiene permisos para crear citas de tipo '${appointmentType}'. Contacte al administrador si necesita este acceso.`
      });
    }

    // Asegurar que el tipo esté en los datos (sobrescribe con el validado)
    appointmentData.appointment_type = appointmentType;

    // Validar campos requeridos
    const requiredFields = {
      patient_id: appointmentData.patient_id,
      dentist_id: appointmentData.dentist_id,
      branch_id: appointmentData.branch_id,
      appointment_date: appointmentData.appointment_date,
      start_time: appointmentData.start_time,
      end_time: appointmentData.end_time
    };

    const missingFields = Object.entries(requiredFields)
      .filter(([key, value]) => !value)
      .map(([key]) => key);

    if (missingFields.length > 0) {
      return res.status(400).json({
        success: false,
        error: 'Faltan campos requeridos',
        message: `Campos faltantes: ${missingFields.join(', ')}`
      });
    }

    // VALIDACION: Verificar duración permitida según configuración y rol
    if (appointmentData.duration) {
      const durationValidation = await validateDuration(appointmentData.duration, userRoleId);
      if (!durationValidation.isValid) {
        return res.status(400).json({
          success: false,
          error: 'Duración no permitida',
          message: durationValidation.message,
          maxAllowed: durationValidation.maxAllowed
        });
      }
    }

    // VALIDACION CRITICA: Verificar disponibilidad del odontologo
    // El odontologo NO puede tener dos citas simultaneas (sin importar especialidad o sede)
    const availabilityCheck = await checkAvailability({
      dentist_id: appointmentData.dentist_id,
      appointment_date: appointmentData.appointment_date,
      start_time: appointmentData.start_time,
      end_time: appointmentData.end_time
    });

    if (!availabilityCheck.available) {
      const conflict = availabilityCheck.conflict;
      return res.status(409).json({
        success: false,
        error: 'Horario no disponible',
        code: 'DENTIST_SCHEDULE_CONFLICT',
        message: `El odontologo ya tiene una cita programada de ${conflict.start_time} a ${conflict.end_time}` +
                 (conflict.specialty_name ? ` (${conflict.specialty_name})` : '') +
                 (conflict.branch_name ? ` en ${conflict.branch_name}` : '') +
                 '. No puede tener dos citas simultaneas.',
        conflict: {
          start_time: conflict.start_time,
          end_time: conflict.end_time,
          specialty: conflict.specialty_name,
          branch: conflict.branch_name
        }
      });
    }

    const newAppointment = await createAppointment(appointmentData);

    // ============================================
    // MARCAR PRIMERA CONSULTA GRATIS COMO USADA
    // ============================================
    if (isFirstFreeConsultation) {
      try {
        await useFirstFreeConsultation(patientId, req.user.user_id);
        console.log(`Primera consulta gratis utilizada para paciente #${patientId} en cita #${newAppointment.appointment_id}`);
      } catch (freeConsultError) {
        console.error('Error al marcar primera consulta gratis:', freeConsultError.message);
      }
    }

    // Validar y registrar uso de promoción por código
    // Este es el flujo unificado: paciente ingresa código de promoción directamente
    if (req.body.promotion_code) {
      try {
        const promoResult = await validateAndApplyPromotion({
          promotionCode: req.body.promotion_code,
          patientId: appointmentData.patient_id,
          branchId: appointmentData.branch_id,
          appointmentId: newAppointment.appointment_id,
          subtotal: appointmentData.price || 0,
          usedByUserId: req.user?.user_id,
          notes: `Aplicado en cita #${newAppointment.appointment_id}`
        });

        if (promoResult.success) {
          console.log(`✅ Promoción "${promoResult.promotion?.promotion_name}" aplicada en cita #${newAppointment.appointment_id} - Descuento: ${promoResult.discountAmount}`);
        } else {
          console.warn(`⚠️ Código de promoción no válido: ${promoResult.message}`);
        }
      } catch (promoError) {
        console.error('⚠️ Error al aplicar promoción:', promoError.message);
        // No fallar la creación de la cita si la promoción falla
      }
    }

    // Incrementar current_uses para promociones seleccionadas de la lista (sin código)
    // Esto aplica cuando se selecciona una promoción directamente desde el dropdown
    if (appointmentData.selected_promotion_id && !req.body.promotion_code) {
      try {
        await promotionsModel.incrementPromotionUses(appointmentData.selected_promotion_id);
        console.log(`✅ Incrementado current_uses para promoción #${appointmentData.selected_promotion_id} en cita #${newAppointment.appointment_id}`);
      } catch (promoError) {
        console.error('⚠️ Error al incrementar current_uses de promoción:', promoError.message);
      }
    }

    // Emitir evento WebSocket para actualización en tiempo real
    emitAppointmentEvent('created', newAppointment, appointmentData.branch_id);

    // ============================================
    // NOTIFICACIÓN AUTOMÁTICA AL PERSONAL
    // ============================================
    // Notifica a super_admin, admin de la sede y recepcionistas de la sede
    await notifyStaffAboutNewAppointment(newAppointment, appointmentData.branch_id);

    // ============================================
    // REGISTRO AUTOMÁTICO DE INGRESO POR CITA
    // ============================================
    // Crear registro de ingreso automáticamente para todas las citas
    // Esto permite rastrear los ingresos por concepto de citas en el sistema financiero
    // Si el paciente adjunta un voucher, el pago queda pendiente de verificación
    let incomeCreated = null;
    try {
      // Si es primera consulta gratis o paciente continuador, el precio es 0
      const finalAppointmentPrice = (isFirstFreeConsultation || isContinuingPatient) ? 0 : (newAppointment.price || PRICING.APPOINTMENT_BASE_PRICE);
      const discountAmount = req.body.coupon_discount_value || 0;
      const voucherUrl = req.body.voucher || null;
      const paymentMethodId = req.body.payment_method_id || null;

      const incomeData = {
        appointment_id: newAppointment.appointment_id,
        consultation_id: null, // Las citas no tienen consulta asociada inicialmente
        patient_id: newAppointment.patient_id,
        branch_id: newAppointment.branch_id,
        income_type: PRICING.APPOINTMENT_INCOME_TYPE,
        item_name: PRICING.APPOINTMENT_ITEM_NAME,
        item_description: isFirstFreeConsultation
          ? 'Primera consulta gratis - Beneficio Plan de Salud'
          : isContinuingPatient
            ? 'Cita de paciente continuador - Sin cobro de consulta'
            : PRICING.APPOINTMENT_ITEM_DESCRIPTION,
        amount: finalAppointmentPrice,
        discount_amount: discountAmount,
        currency: PRICING.DEFAULT_CURRENCY,
        performed_by_dentist_id: newAppointment.dentist_id,
        performed_date: newAppointment.appointment_date,
        performed_time: newAppointment.start_time,
        income_status: 'confirmed',
        user_id_registration: req.user.user_id,
        // Campos de voucher - si el paciente adjunta voucher, queda pendiente de verificación
        voucher_url: voucherUrl,
        voucher_payment_method_id: paymentMethodId,
        // payment_status:
        // - Si es primera consulta gratis: 'paid' (no genera deuda)
        // - Si hay voucher: 'pending_verification' (se determina en el modelo)
        // - Si no hay voucher: 'pending' (se determina en el modelo)
        ...((isFirstFreeConsultation || isContinuingPatient) && { payment_status: 'paid' })
      };

      incomeCreated = await procedureIncomeModel.createProcedureIncome(incomeData);
      const statusMsg = isFirstFreeConsultation ? 'primera consulta gratis (pagado)' : isContinuingPatient ? 'paciente continuador (sin cobro)' : (voucherUrl ? 'pendiente de verificación' : 'pendiente de pago');
      console.log(`✅ Ingreso automático #${incomeCreated.income_id} creado para cita #${newAppointment.appointment_id} (${statusMsg})`);
    } catch (incomeError) {
      // Log el error pero no fallar la creación de la cita
      // El ingreso puede ser creado manualmente si es necesario
      console.error('⚠️ Error al crear ingreso automático:', incomeError.message);
    }

    res.status(201).json({
      success: true,
      message: 'Cita creada exitosamente',
      data: newAppointment,
      income: incomeCreated ? { income_id: incomeCreated.income_id, amount: incomeCreated.final_amount } : null
    });
  } catch (error) {
    console.error('Error al crear cita:', error);

    // Manejar error del trigger de BD si llega hasta aca
    if (error.message && error.message.includes('CONFLICT_DENTIST_SCHEDULE')) {
      return res.status(409).json({
        success: false,
        error: 'Horario no disponible',
        code: 'DENTIST_SCHEDULE_CONFLICT',
        message: 'El odontologo ya tiene una cita en este horario. No puede tener dos citas simultaneas.'
      });
    }

    res.status(500).json({
      success: false,
      error: 'Error al crear cita',
      message: error.message
    });
  }
};

/**
 * Actualizar una cita
 * Si se cambia fecha u hora, registra automáticamente en appointment_reschedules
 * para que el badge "Reprogramada" sea visible en el calendario.
 */
const updateExistingAppointment = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.user_id;
    const appointmentData = {
      ...req.body,
      user_id_modification: userId
    };

    // Obtener datos actuales de la cita ANTES de actualizar
    const currentAppointment = await getAppointmentById(parseInt(id));
    if (!currentAppointment) {
      return res.status(404).json({
        success: false,
        error: 'Cita no encontrada'
      });
    }

    const updatedAppointment = await updateAppointment(parseInt(id), appointmentData);

    if (!updatedAppointment) {
      return res.status(404).json({
        success: false,
        error: 'Cita no encontrada'
      });
    }

    // Detectar si hubo cambio de fecha u hora (reprogramación directa por staff)
    // Normalizar fecha actual a YYYY-MM-DD (puede venir como Date object o ISO string)
    const currentDateStr = currentAppointment.appointment_date instanceof Date
      ? currentAppointment.appointment_date.toISOString().split('T')[0]
      : String(currentAppointment.appointment_date).split('T')[0];
    // Normalizar hora actual a HH:MM (puede venir como HH:MM:SS)
    const currentTimeStr = (currentAppointment.start_time || '').substring(0, 5);
    const newTimeStr = (appointmentData.start_time || '').substring(0, 5);

    const dateChanged = appointmentData.appointment_date &&
      appointmentData.appointment_date !== currentDateStr;
    const timeChanged = appointmentData.start_time &&
      newTimeStr !== currentTimeStr;

    if (dateChanged || timeChanged) {
      // Registrar como reprogramación directa aprobada (staff tiene permisos)
      try {
        await createRescheduleProposal({
          appointment_id: parseInt(id),
          proposed_by_user_id: userId,
          proposed_date: appointmentData.appointment_date || String(currentAppointment.appointment_date).split('T')[0],
          proposed_start_time: appointmentData.start_time || currentAppointment.start_time,
          proposed_end_time: appointmentData.end_time || currentAppointment.end_time,
          reason: appointmentData.notes || 'Reprogramación directa por staff',
          status: 'approved'
        });
      } catch (rescheduleError) {
        // No bloquear la actualización si falla el registro de reprogramación
        console.error('⚠️ Error al registrar reprogramación:', rescheduleError.message);
      }
    }

    // Emitir evento WebSocket para actualización en tiempo real
    emitAppointmentEvent('updated', updatedAppointment, updatedAppointment.branch_id);

    res.json({
      success: true,
      message: 'Cita actualizada exitosamente',
      data: updatedAppointment
    });
  } catch (error) {
    console.error('Error al actualizar cita:', error);
    res.status(500).json({
      success: false,
      error: 'Error al actualizar cita'
    });
  }
};

/**
 * Cancelar una cita
 */
const cancelExistingAppointment = async (req, res) => {
  try {
    const { id } = req.params;
    const { cancellation_reason } = req.body;

    // El motivo de cancelación es opcional
    const reason = cancellation_reason?.trim() || 'Sin motivo especificado';

    // Obtener la cita antes de cancelar
    const appointment = await getAppointmentById(parseInt(id));
    if (!appointment) {
      return res.status(404).json({
        success: false,
        error: 'Cita no encontrada'
      });
    }

    // Validar que no tenga datos médicos críticos o pagos verificados asociados
    const medicalDataCheck = await pool.query(`
      SELECT
        (SELECT COUNT(*) FROM payments WHERE appointment_id = $1 AND status = 'active') as payments_count,
        (SELECT COALESCE(SUM(amount), 0) FROM payments WHERE appointment_id = $1 AND status = 'active') as total_paid,
        (SELECT COUNT(*) FROM procedure_income WHERE appointment_id = $1 AND status = 'active' AND payment_status = 'paid') as verified_income_count,
        (SELECT COALESCE(SUM(final_amount), 0) FROM procedure_income WHERE appointment_id = $1 AND status = 'active' AND payment_status = 'paid') as verified_income_total,
        (SELECT COUNT(*) FROM consultations WHERE appointment_id = $1) as consultations_count,
        (SELECT COUNT(*) FROM odontograms WHERE appointment_id = $1) as odontograms_count,
        (SELECT COUNT(*) FROM prescriptions WHERE appointment_id = $1) as prescriptions_count,
        (SELECT COUNT(*) FROM treatment_notes WHERE appointment_id = $1) as treatment_notes_count
    `, [parseInt(id)]);

    const medData = medicalDataCheck.rows[0];

    // BLOQUEAR cancelación si hay pagos directos (tabla payments)
    if (parseInt(medData.payments_count) > 0) {
      return res.status(400).json({
        success: false,
        error: 'No se puede cancelar una cita con pagos asociados',
        code: 'HAS_PAYMENTS',
        message: `Esta cita tiene ${medData.payments_count} pago(s) por un total de S/. ${medData.total_paid}. Debe contactar administración para reembolso.`,
        details: {
          payments_count: parseInt(medData.payments_count),
          total_paid: parseFloat(medData.total_paid)
        }
      });
    }

    // BLOQUEAR cancelación si hay ingresos (procedure_income) con voucher ya verificado/pagado
    if (parseInt(medData.verified_income_count) > 0) {
      return res.status(400).json({
        success: false,
        error: 'No se puede cancelar una cita con pagos verificados',
        code: 'HAS_VERIFIED_INCOME',
        message: `Esta cita tiene ${medData.verified_income_count} pago(s) verificado(s) por un total de S/. ${medData.verified_income_total}. Debe contactar administración para reembolso.`,
        details: {
          verified_income_count: parseInt(medData.verified_income_count),
          verified_income_total: parseFloat(medData.verified_income_total)
        }
      });
    }

    // BLOQUEAR cancelación si hay datos médicos registrados
    if (parseInt(medData.consultations_count) > 0 ||
        parseInt(medData.odontograms_count) > 0 ||
        parseInt(medData.prescriptions_count) > 0 ||
        parseInt(medData.treatment_notes_count) > 0) {
      return res.status(400).json({
        success: false,
        error: 'No se puede cancelar una cita con datos médicos registrados',
        code: 'HAS_MEDICAL_DATA',
        message: 'Esta cita tiene información clínica asociada que debe preservarse. Contacte al administrador.',
        details: {
          consultations: parseInt(medData.consultations_count),
          odontograms: parseInt(medData.odontograms_count),
          prescriptions: parseInt(medData.prescriptions_count),
          treatment_notes: parseInt(medData.treatment_notes_count)
        }
      });
    }

    // BLOQUEAR cancelación si la cita está completada o en proceso
    if ([3, 4].includes(appointment.appointment_status_id)) {
      return res.status(400).json({
        success: false,
        error: 'No se puede cancelar una cita que está en proceso o completada',
        code: 'INVALID_STATUS',
        current_status: appointment.status_name || 'Desconocido'
      });
    }

    // Registrar en historial ANTES de cancelar
    await addStatusHistory({
      appointment_id: parseInt(id),
      old_status_id: appointment.appointment_status_id,
      new_status_id: 5, // Cancelada
      changed_by_user_id: req.user.user_id,
      notes: `Cancelación: ${reason}`
    });

    const cancelledAppointment = await cancelAppointment(
      parseInt(id),
      req.user.user_id,
      reason
    );

    if (!cancelledAppointment) {
      return res.status(404).json({
        success: false,
        error: 'Error al cancelar la cita'
      });
    }

    // ============================================
    // SINCRONIZACIÓN: Cancelar procedure_income pendientes asociados
    // Al cancelar la cita, los ingresos pendientes (no pagados) se cancelan
    // ============================================
    try {
      const incomeResult = await pool.query(
        `UPDATE procedure_income
         SET income_status = 'cancelled',
             payment_status = 'cancelled',
             rejection_reason = $1,
             user_id_modification = $2,
             date_time_modification = NOW()
         WHERE appointment_id = $3
           AND status = 'active'
           AND income_status != 'cancelled'
           AND payment_status NOT IN ('paid')
         RETURNING income_id`,
        [`Cita cancelada: ${reason}`, req.user.user_id, parseInt(id)]
      );

      if (incomeResult.rows.length > 0) {
        console.log(`🔗 Sincronización cita→pago: ${incomeResult.rows.length} ingreso(s) cancelado(s) por cancelación de cita #${id}`);
      }
    } catch (incomeError) {
      console.error('⚠️ Error al cancelar ingresos asociados a cita cancelada:', incomeError.message);
    }

    // Emitir evento WebSocket para actualización en tiempo real
    emitAppointmentEvent('cancelled', cancelledAppointment, appointment.branch_id);

    res.json({
      success: true,
      message: 'Cita cancelada exitosamente',
      data: cancelledAppointment
    });
  } catch (error) {
    console.error('Error al cancelar cita:', error);
    res.status(500).json({
      success: false,
      error: 'Error al cancelar cita',
      message: error.message
    });
  }
};

/**
 * Marcar paciente como llegado
 */
const markAppointmentAsArrived = async (req, res) => {
  try {
    const { id } = req.params;

    // Validar que la cita existe y obtener su estado actual
    const appointment = await getAppointmentById(parseInt(id));
    if (!appointment) {
      return res.status(404).json({
        success: false,
        error: 'Cita no encontrada'
      });
    }

    // Validar estado actual (solo se puede iniciar desde Programada = 1)
    if (appointment.appointment_status_id !== 1) {
      const statusNames = {
        0: 'Pendiente de Aprobación',
        3: 'En Proceso',
        4: 'Completada',
        5: 'Cancelada',
        6: 'No Asistió',
        7: 'Reprogramada',
        8: 'Rechazada'
      };
      return res.status(400).json({
        success: false,
        error: 'Estado no válido para iniciar consulta',
        message: `Solo se puede iniciar consulta desde citas en estado "Programada". Estado actual: "${statusNames[appointment.appointment_status_id] || 'Desconocido'}"`,
        current_status_id: appointment.appointment_status_id
      });
    }

    const arrivedAppointment = await markAsArrived(parseInt(id), req.user.user_id);

    if (!arrivedAppointment) {
      return res.status(500).json({
        success: false,
        error: 'Error al actualizar la cita'
      });
    }

    // Emitir evento WebSocket para actualización en tiempo real
    emitAppointmentEvent('status_changed', arrivedAppointment, arrivedAppointment.branch_id);

    res.json({
      success: true,
      message: 'Paciente marcado como llegado',
      data: arrivedAppointment
    });
  } catch (error) {
    console.error('Error al marcar como llegado:', error);

    // Detectar errores del trigger de BD para dar mensajes más claros
    if (error.message && error.message.includes('Transicion de estado invalida')) {
      return res.status(400).json({
        success: false,
        error: 'Transición de estado no permitida',
        message: error.message
      });
    }

    res.status(500).json({
      success: false,
      error: 'Error al marcar como llegado',
      message: error.message
    });
  }
};

/**
 * Marcar cita como completada
 */
const markAppointmentAsCompleted = async (req, res) => {
  try {
    const { id } = req.params;
    const completedAppointment = await markAsCompleted(parseInt(id), req.user.user_id);

    if (!completedAppointment) {
      return res.status(404).json({
        success: false,
        error: 'Cita no encontrada'
      });
    }

    // Emitir evento WebSocket para actualización en tiempo real
    emitAppointmentEvent('status_changed', completedAppointment, completedAppointment.branch_id);

    res.json({
      success: true,
      message: 'Cita marcada como completada',
      data: completedAppointment
    });
  } catch (error) {
    console.error('Error al marcar como completada:', error);
    res.status(500).json({
      success: false,
      error: 'Error al marcar como completada'
    });
  }
};

/**
 * Eliminar una cita (soft delete)
 */
const deleteExistingAppointment = async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await deleteAppointment(parseInt(id), req.user.user_id);

    if (!deleted) {
      return res.status(404).json({
        success: false,
        error: 'Cita no encontrada'
      });
    }

    res.json({
      success: true,
      message: 'Cita eliminada exitosamente'
    });
  } catch (error) {
    console.error('Error al eliminar cita:', error);
    res.status(500).json({
      success: false,
      error: 'Error al eliminar cita'
    });
  }
};

/**
 * Aprobar una cita pendiente
 * Solo: Superadmin (role_id=1), Admin Sede (role_id=2), Recepcionista (role_id=4)
 */
const approveAppointmentRequest = async (req, res) => {
  try {
    const { id } = req.params;
    const { approval_notes } = req.body;
    const userId = req.user.user_id;
    const userRole = req.user.role_id;

    // Verificar permisos
    const allowedRoles = [1, 2, 4]; // Superadmin, Admin Sede, Recepcionista
    if (!allowedRoles.includes(userRole)) {
      return res.status(403).json({
        success: false,
        error: 'No tienes permisos para aprobar citas'
      });
    }

    // Si es Admin Sede o Recepcionista, verificar que la cita sea de su sede
    if (userRole === 2 || userRole === 4) {
      const appointmentCheck = await getAppointmentById(parseInt(id));
      if (!appointmentCheck) {
        return res.status(404).json({
          success: false,
          error: 'Cita no encontrada'
        });
      }

      // Verificar que el usuario pertenece a la misma sede de la cita
      const userBranchQuery = await pool.query(
        'SELECT branch_id FROM users WHERE user_id = $1',
        [userId]
      );

      if (userBranchQuery.rows.length === 0 ||
          userBranchQuery.rows[0].branch_id !== appointmentCheck.branch_id) {
        return res.status(403).json({
          success: false,
          error: 'Solo puedes aprobar citas de tu sede'
        });
      }
    }

    const approved = await approveAppointment(parseInt(id), userId, approval_notes);

    // Manejar diferentes tipos de errores
    if (!approved) {
      return res.status(404).json({
        success: false,
        error: 'Error inesperado al aprobar la cita'
      });
    }

    // Verificar si es un error de validación
    if (approved.error === 'NOT_FOUND') {
      return res.status(404).json({
        success: false,
        code: 'NOT_FOUND',
        error: approved.message
      });
    }

    if (approved.error === 'INACTIVE') {
      return res.status(400).json({
        success: false,
        code: 'INACTIVE',
        error: approved.message
      });
    }

    if (approved.error === 'INVALID_STATUS') {
      return res.status(400).json({
        success: false,
        code: 'INVALID_STATUS',
        error: approved.message,
        current_status_id: approved.current_status_id
      });
    }

    // ============================================
    // SINCRONIZACIÓN: Actualizar procedure_income asociado
    // Al aprobar la cita, si el voucher estaba pendiente de verificación,
    // marcarlo como pagado (el staff aprobó la cita = validó el voucher)
    // ============================================
    try {
      const incomeResult = await pool.query(
        `UPDATE procedure_income
         SET payment_status = 'paid',
             amount_paid = final_amount,
             balance = 0,
             verified_by_user_id = $1,
             verified_at = NOW(),
             user_id_modification = $1,
             date_time_modification = NOW()
         WHERE appointment_id = $2
           AND status = 'active'
           AND payment_status = 'pending_verification'
         RETURNING income_id`,
        [userId, parseInt(id)]
      );

      if (incomeResult.rows.length > 0) {
        console.log(`🔗 Sincronización cita→pago: Voucher verificado automáticamente para cita #${id} (${incomeResult.rows.length} ingreso(s))`);
      }
    } catch (incomeError) {
      console.error('⚠️ Error al actualizar ingreso asociado a cita aprobada:', incomeError.message);
      // No fallar la operación principal
    }

    // Emitir evento WebSocket para actualización en tiempo real
    emitAppointmentEvent('approved', approved, approved.branch_id);

    res.json({
      success: true,
      message: 'Cita aprobada exitosamente',
      data: approved
    });
  } catch (error) {
    console.error('Error al aprobar cita:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor al aprobar cita',
      details: error.message
    });
  }
};

/**
 * Rechazar una cita pendiente
 * Solo: Superadmin (role_id=1), Admin Sede (role_id=2), Recepcionista (role_id=4)
 */
const rejectAppointmentRequest = async (req, res) => {
  try {
    const { id } = req.params;
    const { rejection_reason } = req.body;
    const userId = req.user.user_id;
    const userRole = req.user.role_id;

    // Verificar permisos
    const allowedRoles = [1, 2, 4]; // Superadmin, Admin Sede, Recepcionista
    if (!allowedRoles.includes(userRole)) {
      return res.status(403).json({
        success: false,
        error: 'No tienes permisos para rechazar citas'
      });
    }

    // Validar razón de rechazo
    if (!rejection_reason || rejection_reason.trim().length < 10) {
      return res.status(400).json({
        success: false,
        error: 'La razón de rechazo debe tener al menos 10 caracteres'
      });
    }

    // Si es Admin Sede o Recepcionista, verificar que la cita sea de su sede
    if (userRole === 2 || userRole === 4) {
      const appointmentCheck = await getAppointmentById(parseInt(id));
      if (!appointmentCheck) {
        return res.status(404).json({
          success: false,
          error: 'Cita no encontrada'
        });
      }

      // Verificar que el usuario pertenece a la misma sede de la cita
      const userBranchQuery = await pool.query(
        'SELECT branch_id FROM users WHERE user_id = $1',
        [userId]
      );

      if (userBranchQuery.rows.length === 0 ||
          userBranchQuery.rows[0].branch_id !== appointmentCheck.branch_id) {
        return res.status(403).json({
          success: false,
          error: 'Solo puedes rechazar citas de tu sede'
        });
      }
    }

    const rejected = await rejectAppointment(parseInt(id), userId, rejection_reason);

    if (!rejected) {
      return res.status(404).json({
        success: false,
        error: 'Cita no encontrada o ya fue procesada'
      });
    }

    // Verificar si hubo un error de validación de estado
    if (rejected.error === 'INVALID_STATUS') {
      return res.status(400).json({
        success: false,
        code: 'INVALID_STATUS',
        error: rejected.message,
        details: {
          current_status_id: rejected.current_status_id
        }
      });
    }

    // ============================================
    // SINCRONIZACIÓN: Cancelar el procedure_income asociado
    // Cuando se rechaza una cita, el ingreso/cobro asociado
    // también debe cancelarse (no tiene sentido cobrar por una cita rechazada)
    // ============================================
    try {
      const incomeResult = await pool.query(
        `UPDATE procedure_income
         SET income_status = 'cancelled',
             payment_status = 'cancelled',
             rejection_reason = $1,
             user_id_modification = $2,
             date_time_modification = NOW()
         WHERE appointment_id = $3
           AND status = 'active'
           AND income_status != 'cancelled'
         RETURNING income_id, payment_status`,
        [rejection_reason, userId, parseInt(id)]
      );

      if (incomeResult.rows.length > 0) {
        console.log(`🔗 Sincronización cita→pago: ${incomeResult.rows.length} ingreso(s) cancelado(s) por rechazo de cita #${id}`);
      }
    } catch (incomeError) {
      console.error('⚠️ Error al cancelar ingreso asociado a cita rechazada:', incomeError.message);
      // No fallar la operación principal
    }

    // Enviar notificación al paciente sobre el rechazo
    try {
      // Obtener datos de la cita para la notificación
      const appointmentData = await getAppointmentById(parseInt(id));
      if (appointmentData && appointmentData.patient_id) {
        // Parsear fecha evitando problema de zona horaria UTC
        const dateStr = appointmentData.appointment_date instanceof Date
          ? appointmentData.appointment_date.toISOString().split('T')[0]
          : String(appointmentData.appointment_date).split('T')[0];
        const appointmentDate = new Date(dateStr + 'T12:00:00');
        const formattedDate = appointmentDate.toLocaleDateString('es-PE', {
          weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
        });
        const formattedTime = appointmentData.start_time ?
          appointmentData.start_time.substring(0, 5) : '';

        await createNotification({
          patient_id: appointmentData.patient_id,
          notification_type: 'appointment_rejected',
          notification_title: 'Solicitud de Cita Rechazada',
          notification_message: `Tu solicitud de cita para el ${formattedDate} a las ${formattedTime} ha sido rechazada. Motivo: ${rejection_reason}`,
          notification_data: JSON.stringify({
            appointment_id: parseInt(id),
            appointment_date: appointmentData.appointment_date,
            start_time: appointmentData.start_time,
            rejection_reason: rejection_reason,
            rejected_at: new Date().toISOString()
          }),
          priority: 'high',
          user_id_registration: userId
        });
        console.log('Notificación de rechazo enviada al paciente:', appointmentData.patient_id);
      }
    } catch (notifError) {
      console.error('Error al enviar notificación de rechazo:', notifError);
      // No fallar la operación principal si la notificación falla
    }

    // Emitir evento WebSocket para actualización en tiempo real
    // Obtener branch_id de la cita original
    const originalAppointment = await getAppointmentById(parseInt(id));
    emitAppointmentEvent('rejected', rejected, originalAppointment?.branch_id);

    res.json({
      success: true,
      message: 'Cita rechazada exitosamente',
      data: rejected
    });
  } catch (error) {
    console.error('Error al rechazar cita:', error);
    console.error('Error stack:', error.stack);
    console.error('Error message:', error.message);
    res.status(500).json({
      success: false,
      error: 'Error al rechazar cita',
      details: error.message
    });
  }
};

/**
 * Marcar cita como "No Asistió"
 */
const markAppointmentAsNoShow = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.user_id;
    const { notes } = req.body;

    // Obtener la cita
    const appointment = await getAppointmentById(id);
    if (!appointment) {
      return res.status(404).json({
        success: false,
        error: 'Cita no encontrada'
      });
    }

    // Verificar que la cita esté en estado "Programada" (ID=1)
    if (appointment.appointment_status_id !== 1) {
      return res.status(400).json({
        success: false,
        error: 'Solo se pueden marcar como "No Asistió" citas en estado Programada'
      });
    }

    // Actualizar estado
    const result = await markAsNoShow(id, userId, notes);

    // Registrar en historial
    await addStatusHistory({
      appointment_id: id,
      old_status_id: 1,
      new_status_id: 6,
      changed_by_user_id: userId,
      notes: notes || 'Paciente no asistió a la cita'
    });

    // Emitir evento WebSocket para actualización en tiempo real
    emitAppointmentEvent('status_changed', result, appointment.branch_id);

    res.json({
      success: true,
      message: 'Cita marcada como No Asistió',
      data: result
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Error al marcar como no asistió'
    });
  }
};

/**
 * Proponer reprogramación de cita
 */
const rescheduleAppointment = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.user_id;
    const {
      new_date,
      new_start_time,
      new_end_time,
      reason
    } = req.body;

    // Validar campos requeridos
    if (!new_date || !new_start_time || !new_end_time) {
      return res.status(400).json({
        success: false,
        error: 'Fecha y horarios son requeridos'
      });
    }

    const appointment = await getAppointmentById(id);
    if (!appointment) {
      return res.status(404).json({
        success: false,
        error: 'Cita no encontrada'
      });
    }

    // Solo permitir desde estados: Programada (1) o No Asistió (6)
    if (![1, 6].includes(appointment.appointment_status_id)) {
      return res.status(400).json({
        success: false,
        error: 'Solo se pueden reprogramar citas en estado Programada o No Asistió'
      });
    }

    // Verificar disponibilidad del nuevo horario
    // El odontologo NO puede tener dos citas simultaneas (sin importar especialidad o sede)
    const availabilityCheck = await checkAvailability({
      dentist_id: appointment.dentist_id,
      appointment_date: new_date,
      start_time: new_start_time,
      end_time: new_end_time,
      exclude_appointment_id: id
    });

    if (!availabilityCheck.available) {
      const conflict = availabilityCheck.conflict;
      return res.status(409).json({
        success: false,
        error: 'El horario propuesto no esta disponible',
        code: 'DENTIST_SCHEDULE_CONFLICT',
        message: `El odontologo ya tiene una cita programada de ${conflict.start_time} a ${conflict.end_time}` +
                 (conflict.specialty_name ? ` (${conflict.specialty_name})` : '') +
                 '. No puede tener dos citas simultaneas.',
        conflict: {
          start_time: conflict.start_time,
          end_time: conflict.end_time,
          specialty: conflict.specialty_name,
          branch: conflict.branch_name
        }
      });
    }

    // Crear registro de reprogramación
    const reschedule = await createRescheduleProposal({
      appointment_id: id,
      proposed_by_user_id: userId,
      proposed_date: new_date,
      proposed_start_time: new_start_time,
      proposed_end_time: new_end_time,
      reason: reason,
      status: 'pending'
    });

    // Cambiar estado de la cita a "Reprogramada" (7)
    await updateStatus(id, 7, userId);

    // Registrar en historial
    await addStatusHistory({
      appointment_id: id,
      old_status_id: appointment.appointment_status_id,
      new_status_id: 7,
      changed_by_user_id: userId,
      notes: `Reprogramación propuesta: ${reason || 'Sin motivo especificado'}`
    });

    // Emitir evento WebSocket para actualización en tiempo real
    const updatedAppointment = await getAppointmentById(id);
    emitAppointmentEvent('rescheduled', updatedAppointment, appointment.branch_id);

    res.json({
      success: true,
      message: 'Reprogramación propuesta enviada',
      data: {
        reschedule_id: reschedule.reschedule_id,
        status: 'pending'
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Error al proponer reprogramación'
    });
  }
};

/**
 * Aprobar reprogramación de cita
 */
const approveReschedule = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.user_id; // FIX: Estandarizar a user_id
    const { reschedule_id } = req.body;

    if (!reschedule_id) {
      return res.status(400).json({
        success: false,
        error: 'Se requiere el ID de la propuesta de reprogramación'
      });
    }

    const reschedule = await getRescheduleProposal(reschedule_id);
    if (!reschedule) {
      return res.status(404).json({
        success: false,
        error: 'Propuesta de reprogramación no encontrada'
      });
    }

    const appointment = await getAppointmentById(id);
    if (!appointment) {
      return res.status(404).json({
        success: false,
        error: 'Cita no encontrada'
      });
    }

    // FIX GAP #1: RE-VALIDAR disponibilidad antes de aprobar
    // (Puede haber cambiado desde que se creó la propuesta)
    const availabilityCheck = await checkAvailability({
      dentist_id: appointment.dentist_id,
      appointment_date: reschedule.proposed_date,
      start_time: reschedule.proposed_start_time,
      end_time: reschedule.proposed_end_time,
      exclude_appointment_id: parseInt(id)
    });

    if (!availabilityCheck.available) {
      // Rechazar automáticamente la propuesta si ya no está disponible
      await updateRescheduleProposal(reschedule_id, {
        status: 'rejected',
        rejected_by_user_id: userId,
        rejected_at: new Date(),
        rejection_reason: 'Horario ya no disponible al momento de aprobación'
      });

      const conflict = availabilityCheck.conflict;
      return res.status(409).json({
        success: false,
        error: 'El horario propuesto ya no está disponible',
        code: 'SCHEDULE_NO_LONGER_AVAILABLE',
        message: `Otro paciente reservó ese horario. Conflicto: ${conflict.start_time} - ${conflict.end_time}`,
        conflict: {
          start_time: conflict.start_time,
          end_time: conflict.end_time,
          specialty_name: conflict.specialty_name,
          branch_name: conflict.branch_name
        }
      });
    }

    // Actualizar la cita con los nuevos datos
    await updateAppointment(id, {
      appointment_date: reschedule.proposed_date,
      start_time: reschedule.proposed_start_time,
      end_time: reschedule.proposed_end_time,
      appointment_status_id: 1,
      user_id_modification: userId
    });

    // Marcar propuesta como aprobada
    await updateRescheduleProposal(reschedule_id, {
      status: 'approved',
      approved_by_user_id: userId,
      approved_at: new Date()
    });

    // Registrar en historial
    await addStatusHistory({
      appointment_id: id,
      old_status_id: 7,
      new_status_id: 1,
      changed_by_user_id: userId,
      notes: 'Reprogramación aprobada'
    });

    // Emitir evento WebSocket para actualización en tiempo real
    const finalAppointment = await getAppointmentById(id);
    emitAppointmentEvent('reschedule_approved', finalAppointment, appointment.branch_id);

    res.json({
      success: true,
      message: 'Reprogramación aprobada exitosamente'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Error al aprobar reprogramación'
    });
  }
};

/**
 * Rechazar reprogramación de cita
 */
const rejectReschedule = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.user_id;
    const { reschedule_id, reason } = req.body;

    if (!reschedule_id) {
      return res.status(400).json({
        success: false,
        error: 'Se requiere el ID de la propuesta de reprogramación'
      });
    }

    const reschedule = await getRescheduleProposal(reschedule_id);
    if (!reschedule) {
      return res.status(404).json({
        success: false,
        error: 'Propuesta de reprogramación no encontrada'
      });
    }

    const appointment = await getAppointmentById(id);
    if (!appointment) {
      return res.status(404).json({
        success: false,
        error: 'Cita no encontrada'
      });
    }

    // Marcar propuesta como rechazada
    await updateRescheduleProposal(reschedule_id, {
      status: 'rejected',
      rejected_by_user_id: userId,
      rejected_at: new Date(),
      rejection_reason: reason
    });

    // Volver la cita a su estado anterior (Programada = 1)
    await updateStatus(id, 1, userId);

    // Registrar en historial
    await addStatusHistory({
      appointment_id: id,
      old_status_id: 7,
      new_status_id: 1,
      changed_by_user_id: userId,
      notes: `Reprogramación rechazada: ${reason || 'Sin motivo especificado'}`
    });

    // Emitir evento WebSocket para actualización en tiempo real
    const finalAppointment = await getAppointmentById(id);
    emitAppointmentEvent('reschedule_rejected', finalAppointment, appointment.branch_id);

    res.json({
      success: true,
      message: 'Reprogramación rechazada'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Error al rechazar reprogramación'
    });
  }
};

/**
 * Reenviar voucher después de rechazo
 */
const resubmitVoucher = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.user_id;
    const { voucher } = req.body;

    const appointment = await getAppointmentById(id);
    if (!appointment) {
      return res.status(404).json({
        success: false,
        error: 'Cita no encontrada'
      });
    }

    // Solo permitir si la cita está en estado "Rechazada" (8)
    if (appointment.appointment_status_id !== 8) {
      return res.status(400).json({
        success: false,
        error: 'Solo se puede reenviar voucher en citas rechazadas'
      });
    }

    if (!voucher) {
      return res.status(400).json({
        success: false,
        error: 'Debe proporcionar el voucher'
      });
    }

    // Actualizar la cita: nuevo voucher y volver a "Pendiente de Aprobación" (0)
    await updateAppointment(id, {
      voucher: voucher,
      appointment_status_id: 0,
      user_id_modification: userId
    });

    // ============================================
    // SINCRONIZACIÓN: Reactivar procedure_income cancelado
    // Al reenviar voucher, el ingreso asociado debe volver a estado pendiente
    // para que aparezca nuevamente en la cola de verificación
    // ============================================
    try {
      const incomeResult = await pool.query(
        `UPDATE procedure_income
         SET income_status = 'confirmed',
             payment_status = 'pending_verification',
             voucher_url = $1,
             voucher_submitted_at = NOW(),
             rejection_reason = NULL,
             verified_by_user_id = NULL,
             verified_at = NULL,
             user_id_modification = $2,
             date_time_modification = NOW()
         WHERE appointment_id = $3
           AND status = 'active'
           AND income_status = 'cancelled'
         RETURNING income_id`,
        [voucher, userId, parseInt(id)]
      );

      if (incomeResult.rows.length > 0) {
        console.log(`🔗 Sincronización cita→pago: ${incomeResult.rows.length} ingreso(s) reactivado(s) por reenvío de voucher en cita #${id}`);
      } else {
        // Si no había ingreso cancelado, crear uno nuevo
        console.log(`ℹ️ No se encontró ingreso cancelado para reactivar en cita #${id}, verificar si se necesita crear uno nuevo`);
      }
    } catch (incomeError) {
      console.error('⚠️ Error al reactivar ingreso por reenvío de voucher:', incomeError.message);
    }

    // Registrar en historial
    await addStatusHistory({
      appointment_id: id,
      old_status_id: 8,
      new_status_id: 0,
      changed_by_user_id: userId,
      notes: 'Voucher reenviado después de rechazo'
    });

    // Emitir evento WebSocket para actualización en tiempo real
    const updatedAppointment = await getAppointmentById(id);
    emitAppointmentEvent('voucher_resubmitted', updatedAppointment, appointment.branch_id);

    res.json({
      success: true,
      message: 'Voucher reenviado exitosamente. La cita está en revisión.'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Error al reenviar voucher'
    });
  }
};

module.exports = {
  getAppointments,
  getAppointment,
  createNewAppointment,
  updateExistingAppointment,
  cancelExistingAppointment,
  markAppointmentAsArrived,
  markAppointmentAsCompleted,
  deleteExistingAppointment,
  approveAppointmentRequest,
  rejectAppointmentRequest,
  markAppointmentAsNoShow,
  rescheduleAppointment,
  approveReschedule,
  rejectReschedule,
  resubmitVoucher
};
