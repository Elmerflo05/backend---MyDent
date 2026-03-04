/**
 * MODELO DE PRESUPUESTOS DE CONSULTA
 * Maneja las operaciones CRUD para consultation_budgets (Paso 9)
 *
 * Arquitectura: Este modelo encapsula toda la logica de acceso a datos
 * para presupuestos consolidados. Los triggers en la BD mantienen
 * los totales sincronizados automaticamente.
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/**
 * Obtiene el presupuesto de una consulta por consultation_id
 * @param {number} consultationId - ID de la consulta
 * @returns {object|null} - Presupuesto con datos completos o null
 */
async function getByConsultationId(consultationId) {
  const budget = await prisma.consultation_budgets.findUnique({
    where: { consultation_id: consultationId },
    include: {
      consultations: {
        select: {
          consultation_id: true,
          patient_id: true,
          dentist_id: true,
          consultation_date: true,
          patients: {
            select: {
              patient_id: true,
              first_name: true,
              last_name: true,
              identification_type_id: true,
              identification_number: true,
              phone: true,
              mobile: true
            }
          },
          dentists: {
            select: {
              dentist_id: true,
              users: {
                select: {
                  first_name: true,
                  last_name: true
                }
              },
              specialties: {
                select: {
                  specialty_name: true
                }
              }
            }
          }
        }
      }
    }
  });

  if (!budget) return null;

  // Formatear respuesta
  return {
    consultation_budget_id: budget.consultation_budget_id,
    consultation_id: budget.consultation_id,
    definitive_diagnosis_total: parseFloat(budget.definitive_diagnosis_total) || 0,
    treatments_total: parseFloat(budget.treatments_total) || 0,
    additional_services_total: parseFloat(budget.additional_services_total) || 0,
    exams_total: parseFloat(budget.exams_total) || 0,
    subtotal: parseFloat(budget.subtotal) || 0,
    promotion_id: budget.promotion_id,
    discount_type: budget.discount_type,
    discount_value: parseFloat(budget.discount_value) || 0,
    discount_amount: parseFloat(budget.discount_amount) || 0,
    grand_total: parseFloat(budget.grand_total) || 0,
    advance_payment: parseFloat(budget.advance_payment) || 0,
    balance: parseFloat(budget.balance) || 0,
    observations: budget.observations,
    status: budget.status,
    date_time_registration: budget.date_time_registration,
    date_time_modification: budget.date_time_modification,
    // Datos de la consulta
    patient: budget.consultations?.patients ? {
      patient_id: budget.consultations.patients.patient_id,
      first_name: budget.consultations.patients.first_name,
      last_name: budget.consultations.patients.last_name,
      full_name: `${budget.consultations.patients.first_name} ${budget.consultations.patients.last_name}`,
      identification_type_id: budget.consultations.patients.identification_type_id,
      identification_number: budget.consultations.patients.identification_number,
      phone: budget.consultations.patients.phone || budget.consultations.patients.mobile
    } : null,
    dentist: budget.consultations?.dentists ? {
      dentist_id: budget.consultations.dentists.dentist_id,
      first_name: budget.consultations.dentists.users?.first_name || '',
      last_name: budget.consultations.dentists.users?.last_name || '',
      full_name: `${budget.consultations.dentists.users?.first_name || ''} ${budget.consultations.dentists.users?.last_name || ''}`.trim(),
      specialty: budget.consultations.dentists.specialties?.specialty_name || ''
    } : null,
    consultation_date: budget.consultations?.consultation_date
  };
}

/**
 * Verifica si existe un presupuesto para la consulta
 * @param {number} consultationId - ID de la consulta
 * @returns {boolean}
 */
async function exists(consultationId) {
  const count = await prisma.consultation_budgets.count({
    where: { consultation_id: consultationId }
  });
  return count > 0;
}

/**
 * Crea o actualiza un presupuesto (UPSERT)
 * Los totales se actualizan automaticamente por los triggers de la BD.
 * Este metodo se usa principalmente para guardar:
 * - advance_payment (adelanto del cliente)
 * - observations (observaciones del presupuesto)
 * - status (estado del presupuesto)
 *
 * @param {number} consultationId - ID de la consulta
 * @param {object} data - Datos del presupuesto
 * @param {number} userId - ID del usuario que realiza la operacion
 * @returns {object} - Presupuesto creado/actualizado
 */
async function upsertBudget(consultationId, data, userId) {
  // Verificar si la consulta existe
  const consultation = await prisma.consultations.findUnique({
    where: { consultation_id: consultationId }
  });

  if (!consultation) {
    throw new Error(`Consulta con ID ${consultationId} no encontrada`);
  }

  // Preparar datos para upsert
  const budgetData = {
    advance_payment: data.advancePayment !== undefined
      ? parseFloat(data.advancePayment) || 0
      : undefined,
    observations: data.observations !== undefined
      ? data.observations
      : undefined,
    status: data.status || undefined
  };

  // Remover campos undefined
  Object.keys(budgetData).forEach(key => {
    if (budgetData[key] === undefined) delete budgetData[key];
  });

  // Si se proporcionan totales manualmente (para casos especiales)
  if (data.definitiveDiagnosisTotal !== undefined) {
    budgetData.definitive_diagnosis_total = parseFloat(data.definitiveDiagnosisTotal) || 0;
  }
  if (data.treatmentsTotal !== undefined) {
    budgetData.treatments_total = parseFloat(data.treatmentsTotal) || 0;
  }
  if (data.additionalServicesTotal !== undefined) {
    budgetData.additional_services_total = parseFloat(data.additionalServicesTotal) || 0;
  }
  if (data.examsTotal !== undefined) {
    budgetData.exams_total = parseFloat(data.examsTotal) || 0;
  }

  // Campos de promocion/descuento
  if (data.promotionId !== undefined) {
    budgetData.promotion_id = data.promotionId ? parseInt(data.promotionId) : null;
  }
  if (data.discountType !== undefined) {
    budgetData.discount_type = data.discountType || null;
  }
  if (data.discountValue !== undefined) {
    budgetData.discount_value = parseFloat(data.discountValue) || 0;
  }
  if (data.discountAmount !== undefined) {
    budgetData.discount_amount = parseFloat(data.discountAmount) || 0;
  }
  if (data.subtotal !== undefined) {
    budgetData.subtotal = parseFloat(data.subtotal) || 0;
  }
  if (data.grandTotal !== undefined) {
    budgetData.grand_total = parseFloat(data.grandTotal) || 0;
  }

  // Verificar si ya existe
  const existingBudget = await prisma.consultation_budgets.findUnique({
    where: { consultation_id: consultationId }
  });

  let budget;

  if (existingBudget) {
    // Actualizar
    budget = await prisma.consultation_budgets.update({
      where: { consultation_id: consultationId },
      data: {
        ...budgetData,
        user_id_modification: userId,
        date_time_modification: new Date()
      }
    });
  } else {
    // Crear nuevo
    budget = await prisma.consultation_budgets.create({
      data: {
        consultation_id: consultationId,
        ...budgetData,
        user_id_registration: userId,
        date_time_registration: new Date()
      }
    });
  }

  // Retornar presupuesto completo
  return await getByConsultationId(consultationId);
}

/**
 * Actualiza solo el adelanto y recalcula el saldo
 * @param {number} consultationId - ID de la consulta
 * @param {number} advancePayment - Monto del adelanto
 * @param {number} userId - ID del usuario
 * @returns {object} - Presupuesto actualizado
 */
async function updateAdvancePayment(consultationId, advancePayment, userId) {
  // Verificar si existe el presupuesto
  const existingBudget = await prisma.consultation_budgets.findUnique({
    where: { consultation_id: consultationId }
  });

  if (!existingBudget) {
    // Crear presupuesto si no existe
    await prisma.consultation_budgets.create({
      data: {
        consultation_id: consultationId,
        advance_payment: parseFloat(advancePayment) || 0,
        user_id_registration: userId
      }
    });
  } else {
    // Actualizar adelanto (el trigger recalculara el balance)
    await prisma.consultation_budgets.update({
      where: { consultation_id: consultationId },
      data: {
        advance_payment: parseFloat(advancePayment) || 0,
        user_id_modification: userId,
        date_time_modification: new Date()
      }
    });
  }

  return await getByConsultationId(consultationId);
}

/**
 * Actualiza el estado del presupuesto
 * @param {number} consultationId - ID de la consulta
 * @param {string} status - Nuevo estado
 * @param {number} userId - ID del usuario
 * @returns {object} - Presupuesto actualizado
 */
async function updateStatus(consultationId, status, userId) {
  const validStatuses = ['draft', 'approved', 'rejected', 'completed', 'cancelled'];

  if (!validStatuses.includes(status)) {
    throw new Error(`Estado invalido: ${status}. Estados validos: ${validStatuses.join(', ')}`);
  }

  await prisma.consultation_budgets.update({
    where: { consultation_id: consultationId },
    data: {
      status,
      user_id_modification: userId,
      date_time_modification: new Date()
    }
  });

  return await getByConsultationId(consultationId);
}

/**
 * Obtiene el resumen del presupuesto (totales calculados)
 * @param {number} consultationId - ID de la consulta
 * @returns {object} - Resumen con totales
 */
async function getSummary(consultationId) {
  const budget = await prisma.consultation_budgets.findUnique({
    where: { consultation_id: consultationId },
    select: {
      consultation_budget_id: true,
      consultation_id: true,
      definitive_diagnosis_total: true,
      treatments_total: true,
      additional_services_total: true,
      exams_total: true,
      subtotal: true,
      promotion_id: true,
      discount_type: true,
      discount_value: true,
      discount_amount: true,
      grand_total: true,
      advance_payment: true,
      balance: true,
      status: true
    }
  });

  if (!budget) return null;

  return {
    consultation_budget_id: budget.consultation_budget_id,
    consultation_id: budget.consultation_id,
    definitive_diagnosis_total: parseFloat(budget.definitive_diagnosis_total) || 0,
    treatments_total: parseFloat(budget.treatments_total) || 0,
    additional_services_total: parseFloat(budget.additional_services_total) || 0,
    exams_total: parseFloat(budget.exams_total) || 0,
    subtotal: parseFloat(budget.subtotal) || 0,
    promotion_id: budget.promotion_id,
    discount_type: budget.discount_type,
    discount_value: parseFloat(budget.discount_value) || 0,
    discount_amount: parseFloat(budget.discount_amount) || 0,
    grand_total: parseFloat(budget.grand_total) || 0,
    advance_payment: parseFloat(budget.advance_payment) || 0,
    balance: parseFloat(budget.balance) || 0,
    status: budget.status
  };
}

/**
 * Elimina el presupuesto de una consulta (soft delete via status)
 * @param {number} consultationId - ID de la consulta
 * @param {number} userId - ID del usuario
 * @returns {boolean}
 */
async function deleteByConsultationId(consultationId, userId) {
  const budget = await prisma.consultation_budgets.findUnique({
    where: { consultation_id: consultationId }
  });

  if (!budget) return false;

  // Soft delete: cambiar status a cancelled
  await prisma.consultation_budgets.update({
    where: { consultation_id: consultationId },
    data: {
      status: 'cancelled',
      user_id_modification: userId,
      date_time_modification: new Date()
    }
  });

  return true;
}

/**
 * Sincroniza los totales del presupuesto desde las tablas relacionadas
 * Util para forzar un recalculo manual si los triggers no se ejecutaron
 * @param {number} consultationId - ID de la consulta
 * @param {number} userId - ID del usuario
 * @returns {object} - Presupuesto actualizado
 */
async function syncTotals(consultationId, userId) {
  // Calcular total de diagnostico definitivo
  const ddResult = await prisma.definitive_diagnosis_conditions.aggregate({
    where: {
      consultation_id: consultationId,
      status: 'active'
    },
    _sum: { price: true }
  });
  const definitiveDiagnosisTotal = parseFloat(ddResult._sum.price) || 0;

  // Obtener totales del plan de tratamiento
  const treatmentPlan = await prisma.consultation_treatment_plans.findUnique({
    where: { consultation_id: consultationId },
    select: {
      treatments_total: true,
      additional_services_total: true
    }
  });
  const treatmentsTotal = treatmentPlan ? parseFloat(treatmentPlan.treatments_total) || 0 : 0;
  const additionalServicesTotal = treatmentPlan ? parseFloat(treatmentPlan.additional_services_total) || 0 : 0;

  // Obtener total de examenes (radiografias)
  const radiographyRequest = await prisma.radiography_requests.findFirst({
    where: { consultation_id: consultationId },
    select: { pricing_data: true }
  });
  const examsTotal = radiographyRequest?.pricing_data?.finalPrice ||
                     radiographyRequest?.pricing_data?.suggestedPrice || 0;

  // Verificar si existe el presupuesto
  const existingBudget = await prisma.consultation_budgets.findUnique({
    where: { consultation_id: consultationId }
  });

  if (existingBudget) {
    // Actualizar totales
    await prisma.consultation_budgets.update({
      where: { consultation_id: consultationId },
      data: {
        definitive_diagnosis_total: definitiveDiagnosisTotal,
        treatments_total: treatmentsTotal,
        additional_services_total: additionalServicesTotal,
        exams_total: examsTotal,
        user_id_modification: userId,
        date_time_modification: new Date()
      }
    });
  } else {
    // Crear presupuesto con los totales
    await prisma.consultation_budgets.create({
      data: {
        consultation_id: consultationId,
        definitive_diagnosis_total: definitiveDiagnosisTotal,
        treatments_total: treatmentsTotal,
        additional_services_total: additionalServicesTotal,
        exams_total: examsTotal,
        user_id_registration: userId
      }
    });
  }

  return await getByConsultationId(consultationId);
}

module.exports = {
  getByConsultationId,
  exists,
  upsertBudget,
  updateAdvancePayment,
  updateStatus,
  getSummary,
  deleteByConsultationId,
  syncTotals
};
