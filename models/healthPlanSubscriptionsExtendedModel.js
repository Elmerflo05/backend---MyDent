/**
 * Health Plan Subscriptions Extended Model
 * Funciones extendidas para suscripciones con voucher y aprobacion
 */

const pool = require('../config/db');

// ============================================================================
// CREAR SUSCRIPCION CON VOUCHER
// ============================================================================

/**
 * Crear suscripcion con voucher (desde portal paciente)
 */
const createSubscriptionWithVoucher = async (data) => {
  const query = `
    INSERT INTO health_plan_subscriptions (
      health_plan_id, patient_id, subscription_number, start_date, end_date,
      subscription_status, voucher_url, payment_method, approval_status,
      notes, user_id_registration
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
    RETURNING *
  `;

  // Generar numero de suscripcion unico
  const subscriptionNumber = `SUB-${Date.now()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;

  const values = [
    data.health_plan_id,
    data.patient_id,
    subscriptionNumber,
    data.start_date || new Date(),
    data.end_date || null,
    'pending_payment', // Estado inicial: esperando aprobacion de voucher
    data.voucher_url || null,
    data.payment_method || null,
    'pending', // approval_status inicial
    data.notes || null,
    data.user_id_registration
  ];

  const result = await pool.query(query, values);
  return result.rows[0];
};

// ============================================================================
// APROBACION Y RECHAZO
// ============================================================================

/**
 * Aprobar suscripcion
 */
const approveSubscription = async (subscriptionId, approvedBy) => {
  // Primero obtener la fecha actual para calcular fecha de fin (1 ano)
  const query = `
    UPDATE health_plan_subscriptions SET
      subscription_status = 'active',
      approval_status = 'approved',
      approved_by = $1,
      approved_at = CURRENT_TIMESTAMP,
      start_date = CURRENT_DATE,
      end_date = CURRENT_DATE + INTERVAL '1 year',
      user_id_modification = $1,
      date_time_modification = CURRENT_TIMESTAMP
    WHERE subscription_id = $2 AND status = 'active' AND approval_status = 'pending'
    RETURNING *
  `;

  const result = await pool.query(query, [approvedBy, subscriptionId]);

  if (result.rows.length === 0) {
    throw new Error('Suscripcion no encontrada o ya fue procesada');
  }

  return result.rows[0];
};

/**
 * Rechazar suscripcion
 */
const rejectSubscription = async (subscriptionId, rejectedBy, rejectionReason) => {
  const query = `
    UPDATE health_plan_subscriptions SET
      subscription_status = 'cancelled',
      approval_status = 'rejected',
      rejected_by = $1,
      rejected_at = CURRENT_TIMESTAMP,
      rejection_reason = $2,
      user_id_modification = $1,
      date_time_modification = CURRENT_TIMESTAMP
    WHERE subscription_id = $3 AND status = 'active' AND approval_status = 'pending'
    RETURNING *
  `;

  const result = await pool.query(query, [rejectedBy, rejectionReason, subscriptionId]);

  if (result.rows.length === 0) {
    throw new Error('Suscripcion no encontrada o ya fue procesada');
  }

  return result.rows[0];
};

// ============================================================================
// CONSULTAS ESPECIALIZADAS
// ============================================================================

/**
 * Obtener suscripciones pendientes de aprobacion
 */
const getPendingSubscriptions = async (filters = {}) => {
  let query = `
    SELECT
      hps.*,
      hp.plan_name,
      hp.plan_code,
      hp.monthly_fee,
      p.first_name || ' ' || p.last_name as patient_name,
      p.identification_number,
      p.email as patient_email,
      p.phone as patient_phone,
      -- Convertir timestamps a zona horaria Lima para mostrar correctamente
      TO_CHAR(hps.date_time_registration AT TIME ZONE 'America/Lima', 'DD/MM/YYYY HH24:MI') as fecha_solicitud_formatted,
      TO_CHAR(hps.approved_at AT TIME ZONE 'America/Lima', 'DD/MM/YYYY HH24:MI') as fecha_aprobacion_formatted,
      TO_CHAR(hps.rejected_at AT TIME ZONE 'America/Lima', 'DD/MM/YYYY HH24:MI') as fecha_rechazo_formatted
    FROM health_plan_subscriptions hps
    INNER JOIN health_plans hp ON hps.health_plan_id = hp.health_plan_id
    INNER JOIN patients p ON hps.patient_id = p.patient_id
    WHERE hps.status = 'active'
      AND hps.approval_status = 'pending'
  `;

  const params = [];
  let paramIndex = 1;

  if (filters.health_plan_id) {
    query += ` AND hps.health_plan_id = $${paramIndex}`;
    params.push(filters.health_plan_id);
    paramIndex++;
  }

  query += ` ORDER BY hps.date_time_registration ASC`;

  if (filters.limit) {
    query += ` LIMIT $${paramIndex}`;
    params.push(filters.limit);
    paramIndex++;
  }

  if (filters.offset) {
    query += ` OFFSET $${paramIndex}`;
    params.push(filters.offset);
  }

  const result = await pool.query(query, params);
  return result.rows;
};

/**
 * Contar suscripciones pendientes
 */
const countPendingSubscriptions = async () => {
  const query = `
    SELECT COUNT(*) as total
    FROM health_plan_subscriptions
    WHERE status = 'active' AND approval_status = 'pending'
  `;

  const result = await pool.query(query);
  return parseInt(result.rows[0].total);
};

/**
 * Obtener suscripcion activa de un paciente
 */
const getActiveSubscriptionByPatient = async (patientId) => {
  const query = `
    SELECT
      hps.*,
      hp.plan_name,
      hp.plan_code,
      hp.plan_type,
      hp.monthly_fee,
      hp.coverage_details
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

  const result = await pool.query(query, [patientId]);
  return result.rows.length > 0 ? result.rows[0] : null;
};

/**
 * Verificar si paciente tiene plan activo
 */
const hasActivePlan = async (patientId) => {
  const subscription = await getActiveSubscriptionByPatient(patientId);
  return subscription !== null;
};

// ============================================================================
// PRIMERA CONSULTA GRATIS
// ============================================================================

/**
 * Marcar primera consulta gratis como usada
 */
const markFirstFreeConsultationUsed = async (subscriptionId, userId) => {
  const query = `
    UPDATE health_plan_subscriptions SET
      first_free_consultation_used = true,
      first_free_consultation_date = CURRENT_DATE,
      user_id_modification = $1,
      date_time_modification = CURRENT_TIMESTAMP
    WHERE subscription_id = $2
      AND status = 'active'
      AND first_free_consultation_used = false
    RETURNING *
  `;

  const result = await pool.query(query, [userId, subscriptionId]);
  return result.rows.length > 0 ? result.rows[0] : null;
};

/**
 * Verificar si la primera consulta gratis esta disponible
 */
const isFirstFreeConsultationAvailable = async (subscriptionId) => {
  const query = `
    SELECT first_free_consultation_used
    FROM health_plan_subscriptions
    WHERE subscription_id = $1
      AND status = 'active'
      AND approval_status = 'approved'
  `;

  const result = await pool.query(query, [subscriptionId]);

  if (result.rows.length === 0) {
    return false;
  }

  return !result.rows[0].first_free_consultation_used;
};

// ============================================================================
// ESTADISTICAS
// ============================================================================

/**
 * Obtener estadisticas de suscripciones
 */
const getSubscriptionStats = async () => {
  const query = `
    SELECT
      hp.plan_name,
      hp.plan_code,
      COUNT(hps.subscription_id) as total_subscriptions,
      COUNT(CASE WHEN hps.subscription_status = 'active' AND hps.approval_status = 'approved' THEN 1 END) as active_subscriptions,
      COUNT(CASE WHEN hps.approval_status = 'pending' THEN 1 END) as pending_subscriptions,
      COUNT(CASE WHEN hps.approval_status = 'rejected' THEN 1 END) as rejected_subscriptions,
      SUM(CASE WHEN hps.subscription_status = 'active' AND hps.approval_status = 'approved' THEN hp.monthly_fee ELSE 0 END) as monthly_revenue
    FROM health_plans hp
    LEFT JOIN health_plan_subscriptions hps ON hp.health_plan_id = hps.health_plan_id AND hps.status = 'active'
    WHERE hp.status = 'active' AND hp.is_active = true
    GROUP BY hp.health_plan_id, hp.plan_name, hp.plan_code
    ORDER BY hp.monthly_fee ASC
  `;

  const result = await pool.query(query);
  return result.rows;
};

/**
 * Obtener historial de suscripciones de un paciente
 */
const getPatientSubscriptionHistory = async (patientId) => {
  const query = `
    SELECT
      hps.*,
      hp.plan_name,
      hp.plan_code,
      hp.monthly_fee,
      approver.first_name || ' ' || approver.last_name as approved_by_name,
      rejector.first_name || ' ' || rejector.last_name as rejected_by_name
    FROM health_plan_subscriptions hps
    INNER JOIN health_plans hp ON hps.health_plan_id = hp.health_plan_id
    LEFT JOIN users approver ON hps.approved_by = approver.user_id
    LEFT JOIN users rejector ON hps.rejected_by = rejector.user_id
    WHERE hps.patient_id = $1
    ORDER BY hps.date_time_registration DESC
  `;

  const result = await pool.query(query, [patientId]);
  return result.rows;
};

module.exports = {
  // Crear con voucher
  createSubscriptionWithVoucher,

  // Aprobacion/Rechazo
  approveSubscription,
  rejectSubscription,

  // Consultas
  getPendingSubscriptions,
  countPendingSubscriptions,
  getActiveSubscriptionByPatient,
  hasActivePlan,

  // Primera consulta gratis
  markFirstFreeConsultationUsed,
  isFirstFreeConsultationAvailable,

  // Estadisticas
  getSubscriptionStats,
  getPatientSubscriptionHistory
};
