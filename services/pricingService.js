/**
 * Pricing Service
 * Servicio centralizado para calcular precios segun empresas corporativas y planes de salud
 * Single Source of Truth para toda la logica de precios
 *
 * Prioridad de precios:
 * 1. Empresa corporativa vigente -> precios corporativos
 * 2. Plan de salud activo -> precios del plan
 * 3. Sin cobertura -> precio regular (price_without_plan)
 */

const pool = require('../config/db');
const { normalizePlanCode, getPriceColumnForPlan } = require('../constants/healthPlanCodes');
const { getCorporatePrice } = require('../models/companyCorporatePricingModel');

/**
 * Obtener plan activo de un paciente (considera titular o dependiente)
 * @param {number} patientId - ID del paciente
 * @returns {object|null} Informacion del plan o null si no tiene
 */
const getPatientActivePlan = async (patientId) => {
  // Primero verificar si es titular
  const titularQuery = `
    SELECT
      hps.subscription_id,
      hps.first_free_consultation_used,
      hps.first_free_consultation_date,
      hp.health_plan_id,
      hp.plan_name,
      hp.plan_code,
      hp.plan_type,
      hp.monthly_fee,
      hp.coverage_details,
      'titular' as coverage_type,
      hps.start_date,
      hps.end_date
    FROM health_plan_subscriptions hps
    INNER JOIN health_plans hp ON hps.health_plan_id = hp.health_plan_id
    WHERE hps.patient_id = $1
      AND hps.status = 'active'
      AND hps.subscription_status = 'active'
      AND hps.approval_status = 'approved'
      AND (hps.end_date IS NULL OR hps.end_date >= CURRENT_DATE)
    ORDER BY hps.start_date DESC
    LIMIT 1
  `;

  let result = await pool.query(titularQuery, [patientId]);

  if (result.rows.length > 0) {
    return result.rows[0];
  }

  // Si no es titular, verificar si es dependiente
  const dependentQuery = `
    SELECT
      hps.subscription_id,
      hps.first_free_consultation_used,
      hps.first_free_consultation_date,
      hp.health_plan_id,
      hp.plan_name,
      hp.plan_code,
      hp.plan_type,
      hp.monthly_fee,
      hp.coverage_details,
      'dependiente' as coverage_type,
      hpd.relationship,
      titular.first_name || ' ' || titular.last_name as titular_name,
      hps.start_date,
      hps.end_date
    FROM health_plan_dependents hpd
    INNER JOIN health_plan_subscriptions hps ON hpd.subscription_id = hps.subscription_id
    INNER JOIN health_plans hp ON hps.health_plan_id = hp.health_plan_id
    INNER JOIN patients titular ON hps.patient_id = titular.patient_id
    WHERE hpd.patient_id = $1
      AND hpd.status = 'active'
      AND hpd.is_active = true
      AND hps.status = 'active'
      AND hps.subscription_status = 'active'
      AND hps.approval_status = 'approved'
      AND (hps.end_date IS NULL OR hps.end_date >= CURRENT_DATE)
    ORDER BY hps.start_date DESC
    LIMIT 1
  `;

  result = await pool.query(dependentQuery, [patientId]);

  if (result.rows.length > 0) {
    return result.rows[0];
  }

  return null;
};

/**
 * Obtener empresa activa de un paciente (vinculada y vigente)
 * @param {number} patientId - ID del paciente
 * @returns {object|null} Informacion de la empresa o null
 */
const getPatientActiveCompany = async (patientId) => {
  const query = `
    SELECT
      c.company_id,
      c.company_name,
      c.ruc,
      c.vigencia_inicio,
      c.vigencia_fin
    FROM patients p
    INNER JOIN companies c ON p.company_id = c.company_id
    WHERE p.patient_id = $1
      AND p.status = 'active'
      AND c.status = 'active'
      AND (c.vigencia_fin IS NULL OR c.vigencia_fin >= CURRENT_DATE)
  `;

  const result = await pool.query(query, [patientId]);

  if (result.rows.length === 0) {
    return null;
  }

  return result.rows[0];
};

/**
 * Calcular precio de un sub-procedimiento para un paciente
 * Prioridad: empresa corporativa > plan de salud > precio regular
 * @param {number} subProcedureId - ID del sub-procedimiento
 * @param {number} patientId - ID del paciente
 * @returns {object} Objeto con precios y descuentos
 */
const calculateSubProcedurePrice = async (subProcedureId, patientId) => {
  // Obtener sub-procedimiento
  const spQuery = `
    SELECT *
    FROM sub_procedures
    WHERE sub_procedure_id = $1 AND status = 'active'
  `;

  const spResult = await pool.query(spQuery, [subProcedureId]);

  if (spResult.rows.length === 0) {
    throw new Error('Sub-procedimiento no encontrado');
  }

  const subProcedure = spResult.rows[0];
  const priceWithoutPlan = parseFloat(subProcedure.price_without_plan) || 0;

  // PRIORIDAD 1: Verificar empresa corporativa vigente
  const company = await getPatientActiveCompany(patientId);

  if (company) {
    const corporatePrice = await getCorporatePrice(company.company_id, 'sub_procedure', subProcedureId);

    if (corporatePrice !== null) {
      const discount = priceWithoutPlan - corporatePrice;
      const discountPercentage = priceWithoutPlan > 0
        ? Math.round((discount / priceWithoutPlan) * 100)
        : 0;

      return {
        sub_procedure_id: subProcedure.sub_procedure_id,
        sub_procedure_code: subProcedure.sub_procedure_code,
        sub_procedure_name: subProcedure.sub_procedure_name,
        specialty: subProcedure.specialty,
        price_without_plan: priceWithoutPlan,
        price_with_plan: corporatePrice,
        discount_amount: discount,
        discount_percentage: discountPercentage,
        pricing_source: 'corporate',
        company_id: company.company_id,
        company_name: company.company_name,
        company_ruc: company.ruc,
        plan_applied: null,
        plan_name: null,
        coverage_type: 'corporate',
        is_included_in_plan: false,
        has_discount: discount > 0
      };
    }
    // Si la empresa no tiene precio para este procedimiento, usar precio regular
    // (NO caer a plan de salud, empresa tiene prioridad absoluta)
    return {
      sub_procedure_id: subProcedure.sub_procedure_id,
      sub_procedure_code: subProcedure.sub_procedure_code,
      sub_procedure_name: subProcedure.sub_procedure_name,
      specialty: subProcedure.specialty,
      price_without_plan: priceWithoutPlan,
      price_with_plan: priceWithoutPlan,
      discount_amount: 0,
      discount_percentage: 0,
      pricing_source: 'corporate',
      company_id: company.company_id,
      company_name: company.company_name,
      company_ruc: company.ruc,
      plan_applied: null,
      plan_name: null,
      coverage_type: 'corporate',
      is_included_in_plan: false,
      has_discount: false
    };
  }

  // PRIORIDAD 2: Verificar plan de salud (solo si NO tiene empresa)
  const plan = await getPatientActivePlan(patientId);

  let priceWithPlan = priceWithoutPlan;
  let planApplied = null;
  let planName = null;
  let coverageType = null;

  if (plan) {
    const normalizedCode = normalizePlanCode(plan.plan_code);
    const planPriceField = getPriceColumnForPlan(plan.plan_code);

    if (planPriceField && subProcedure[planPriceField] !== null) {
      priceWithPlan = parseFloat(subProcedure[planPriceField]);
      planApplied = normalizedCode || plan.plan_code;
      planName = plan.plan_name;
      coverageType = plan.coverage_type;
    }
  }

  const discount = priceWithoutPlan - priceWithPlan;
  const discountPercentage = priceWithoutPlan > 0
    ? Math.round((discount / priceWithoutPlan) * 100)
    : 0;

  return {
    sub_procedure_id: subProcedure.sub_procedure_id,
    sub_procedure_code: subProcedure.sub_procedure_code,
    sub_procedure_name: subProcedure.sub_procedure_name,
    specialty: subProcedure.specialty,
    price_without_plan: priceWithoutPlan,
    price_with_plan: priceWithPlan,
    discount_amount: discount,
    discount_percentage: discountPercentage,
    pricing_source: planApplied ? 'health_plan' : 'regular',
    company_id: null,
    company_name: null,
    company_ruc: null,
    plan_applied: planApplied,
    plan_name: planName,
    coverage_type: coverageType,
    is_included_in_plan: planApplied !== null,
    has_discount: discount > 0
  };
};

/**
 * Calcular precio de un sub-procedimiento por codigo
 */
const calculateSubProcedurePriceByCode = async (subProcedureCode, patientId) => {
  const query = `
    SELECT sub_procedure_id
    FROM sub_procedures
    WHERE sub_procedure_code = $1 AND status = 'active'
  `;

  const result = await pool.query(query, [subProcedureCode]);

  if (result.rows.length === 0) {
    throw new Error('Sub-procedimiento no encontrado');
  }

  return await calculateSubProcedurePrice(result.rows[0].sub_procedure_id, patientId);
};

/**
 * Calcular precio de multiples sub-procedimientos para un paciente
 * @param {number[]} subProcedureIds - Array de IDs de sub-procedimientos
 * @param {number} patientId - ID del paciente
 * @returns {object} Objeto con detalles y totales
 */
const calculateMultipleSubProcedurePrices = async (subProcedureIds, patientId) => {
  const details = await Promise.all(
    subProcedureIds.map(id => calculateSubProcedurePrice(id, patientId))
  );

  const totals = details.reduce((acc, item) => ({
    total_without_plan: acc.total_without_plan + item.price_without_plan,
    total_with_plan: acc.total_with_plan + item.price_with_plan,
    total_discount: acc.total_discount + item.discount_amount
  }), {
    total_without_plan: 0,
    total_with_plan: 0,
    total_discount: 0
  });

  const plan = details.length > 0 && details[0].plan_applied
    ? {
        plan_code: details[0].plan_applied,
        plan_name: details[0].plan_name,
        coverage_type: details[0].coverage_type
      }
    : null;

  return {
    details,
    totals,
    plan,
    item_count: details.length
  };
};

/**
 * Verificar si la primera consulta gratis esta disponible
 */
const isFirstFreeConsultationAvailable = async (patientId) => {
  const plan = await getPatientActivePlan(patientId);

  if (!plan) {
    return {
      available: false,
      reason: 'El paciente no tiene plan activo'
    };
  }

  if (plan.first_free_consultation_used) {
    return {
      available: false,
      reason: 'Primera consulta gratis ya fue utilizada',
      used_date: plan.first_free_consultation_date
    };
  }

  return {
    available: true,
    plan_name: plan.plan_name,
    subscription_id: plan.subscription_id
  };
};

/**
 * Marcar primera consulta gratis como usada
 */
const useFirstFreeConsultation = async (patientId, userId) => {
  const plan = await getPatientActivePlan(patientId);

  if (!plan) {
    throw new Error('El paciente no tiene plan activo');
  }

  if (plan.first_free_consultation_used) {
    throw new Error('Primera consulta gratis ya fue utilizada');
  }

  const query = `
    UPDATE health_plan_subscriptions SET
      first_free_consultation_used = true,
      first_free_consultation_date = CURRENT_DATE,
      user_id_modification = $1,
      date_time_modification = CURRENT_TIMESTAMP
    WHERE subscription_id = $2
    RETURNING *
  `;

  const result = await pool.query(query, [userId, plan.subscription_id]);
  return result.rows[0];
};

/**
 * Obtener resumen de cobertura de un paciente para mostrar al dentista
 * Prioridad: empresa corporativa > plan de salud > sin cobertura
 */
const getPatientCoverageSummary = async (patientId) => {
  // PRIORIDAD 1: Verificar empresa corporativa
  const company = await getPatientActiveCompany(patientId);

  if (company) {
    // Calcular dias restantes de vigencia
    let daysRemaining = null;
    let vigenciaWarning = null;
    if (company.vigencia_fin) {
      daysRemaining = Math.ceil(
        (new Date(company.vigencia_fin) - new Date()) / (1000 * 60 * 60 * 24)
      );
      if (daysRemaining <= 30 && daysRemaining > 0) {
        vigenciaWarning = `El convenio con ${company.company_name} vence en ${daysRemaining} dias`;
      }
    }

    return {
      has_coverage: true,
      pricing_source: 'corporate',
      company_id: company.company_id,
      company_name: company.company_name,
      company_ruc: company.ruc,
      vigencia_inicio: company.vigencia_inicio,
      vigencia_fin: company.vigencia_fin,
      days_remaining: daysRemaining,
      coverage_type: 'corporate',
      coverage_label: `Cliente Corporativo: ${company.company_name}`,
      vigencia_warning: vigenciaWarning,
      message: `Precios corporativos - Empresa: ${company.company_name}`
    };
  }

  // PRIORIDAD 2: Verificar plan de salud
  const plan = await getPatientActivePlan(patientId);

  if (!plan) {
    return {
      has_coverage: false,
      pricing_source: 'regular',
      message: 'Sin plan de salud activo ni empresa corporativa'
    };
  }

  const firstFreeConsultation = await isFirstFreeConsultationAvailable(patientId);

  return {
    has_coverage: true,
    pricing_source: 'health_plan',
    plan_code: plan.plan_code,
    plan_name: plan.plan_name,
    coverage_type: plan.coverage_type,
    coverage_label: plan.coverage_type === 'titular'
      ? `Titular del ${plan.plan_name}`
      : `Dependiente (${plan.relationship}) del ${plan.plan_name} - Titular: ${plan.titular_name}`,
    monthly_fee: plan.monthly_fee,
    start_date: plan.start_date,
    end_date: plan.end_date,
    first_free_consultation: firstFreeConsultation,
    message: `Plan activo: ${plan.plan_name}`
  };
};

module.exports = {
  getPatientActivePlan,
  getPatientActiveCompany,
  calculateSubProcedurePrice,
  calculateSubProcedurePriceByCode,
  calculateMultipleSubProcedurePrices,
  isFirstFreeConsultationAvailable,
  useFirstFreeConsultation,
  getPatientCoverageSummary
};
