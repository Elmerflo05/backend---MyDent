/**
 * Modelo para Income Payments (Aplicación de pagos a deudas)
 * Maneja la relación N:M entre procedure_income y payments
 */
const pool = require('../config/db');
const { formatDateYMD } = require('../utils/dateUtils');

/**
 * Aplica un pago a uno o más procedure_income (deudas)
 * @param {number} paymentId - ID del pago
 * @param {Array} applications - Array de {procedure_income_id, amount_applied}
 * @param {number} userId - ID del usuario que aplica el pago
 * @returns {Object} Resultado de la aplicación
 */
const applyPaymentToIncomes = async (paymentId, applications, userId) => {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const results = [];

    for (const app of applications) {
      // 1. Verificar que el procedure_income existe y tiene balance
      const incomeResult = await client.query(
        `SELECT income_id, final_amount, amount_paid, balance, payment_status
         FROM procedure_income
         WHERE income_id = $1 AND status = 'active'
         FOR UPDATE`,
        [app.procedure_income_id]
      );

      if (incomeResult.rows.length === 0) {
        throw new Error(`procedure_income ${app.procedure_income_id} no encontrado`);
      }

      const income = incomeResult.rows[0];
      const currentBalance = parseFloat(income.balance) || parseFloat(income.final_amount);

      if (app.amount_applied > currentBalance) {
        throw new Error(
          `Monto a aplicar (${app.amount_applied}) excede el balance (${currentBalance}) para income ${app.procedure_income_id}`
        );
      }

      // 2. Insertar en income_payments
      const insertResult = await client.query(
        `INSERT INTO income_payments (
          procedure_income_id,
          payment_id,
          amount_applied,
          applied_by_user_id,
          notes
        ) VALUES ($1, $2, $3, $4, $5)
        RETURNING *`,
        [app.procedure_income_id, paymentId, app.amount_applied, userId, app.notes || null]
      );

      // 3. Actualizar procedure_income
      const newAmountPaid = parseFloat(income.amount_paid || 0) + parseFloat(app.amount_applied);
      const newBalance = parseFloat(income.final_amount) - newAmountPaid;
      const newStatus = newBalance <= 0 ? 'paid' : 'partial';

      await client.query(
        `UPDATE procedure_income
         SET amount_paid = $1,
             balance = $2,
             payment_status = $3,
             user_id_modification = $4,
             date_time_modification = NOW()
         WHERE income_id = $5`,
        [newAmountPaid, newBalance, newStatus, userId, app.procedure_income_id]
      );

      results.push({
        income_payment: insertResult.rows[0],
        procedure_income_id: app.procedure_income_id,
        new_balance: newBalance,
        new_status: newStatus
      });
    }

    await client.query('COMMIT');

    return {
      success: true,
      applied_count: results.length,
      applications: results
    };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

/**
 * Obtiene las aplicaciones de un pago específico
 * @param {number} paymentId - ID del pago
 * @returns {Array} Lista de aplicaciones
 */
const getPaymentApplications = async (paymentId) => {
  const query = `
    SELECT
      ip.*,
      pi.item_name,
      pi.item_description,
      pi.final_amount,
      pi.balance as current_balance,
      pi.payment_status,
      pi.performed_date,
      pi.batch_id,
      u.first_name || ' ' || u.last_name as applied_by_name
    FROM income_payments ip
    INNER JOIN procedure_income pi ON ip.procedure_income_id = pi.income_id
    LEFT JOIN users u ON ip.applied_by_user_id = u.user_id
    WHERE ip.payment_id = $1 AND ip.status = 'active'
    ORDER BY ip.applied_at DESC
  `;

  const result = await pool.query(query, [paymentId]);
  return result.rows;
};

/**
 * Obtiene el historial de pagos de un procedure_income específico
 * @param {number} incomeId - ID del procedure_income
 * @returns {Array} Lista de pagos aplicados
 */
const getIncomePaymentHistory = async (incomeId) => {
  const query = `
    SELECT
      ip.*,
      p.payment_date,
      p.amount as total_payment_amount,
      pm.method_name as payment_method_name,
      pi.batch_id,
      u.first_name || ' ' || u.last_name as applied_by_name
    FROM income_payments ip
    INNER JOIN procedure_income pi ON ip.procedure_income_id = pi.income_id
    INNER JOIN payments p ON ip.payment_id = p.payment_id
    INNER JOIN payment_methods pm ON p.payment_method_id = pm.payment_method_id
    LEFT JOIN users u ON ip.applied_by_user_id = u.user_id
    WHERE ip.procedure_income_id = $1 AND ip.status = 'active'
    ORDER BY ip.applied_at DESC
  `;

  const result = await pool.query(query, [incomeId]);
  return result.rows;
};

/**
 * Revierte una aplicación de pago
 * @param {number} incomePaymentId - ID del income_payment a revertir
 * @param {number} userId - ID del usuario que revierte
 * @returns {Object} Resultado de la reversión
 */
const revertPaymentApplication = async (incomePaymentId, userId) => {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // 1. Obtener la aplicación de pago
    const appResult = await client.query(
      `SELECT ip.*, pi.amount_paid, pi.final_amount
       FROM income_payments ip
       INNER JOIN procedure_income pi ON ip.procedure_income_id = pi.income_id
       WHERE ip.income_payment_id = $1 AND ip.status = 'active'
       FOR UPDATE`,
      [incomePaymentId]
    );

    if (appResult.rows.length === 0) {
      throw new Error('Aplicación de pago no encontrada');
    }

    const app = appResult.rows[0];

    // 2. Marcar income_payment como inactivo
    await client.query(
      `UPDATE income_payments
       SET status = 'reverted'
       WHERE income_payment_id = $1`,
      [incomePaymentId]
    );

    // 3. Actualizar procedure_income
    const newAmountPaid = parseFloat(app.amount_paid) - parseFloat(app.amount_applied);
    const newBalance = parseFloat(app.final_amount) - newAmountPaid;
    const newStatus = newAmountPaid <= 0 ? 'pending' : 'partial';

    await client.query(
      `UPDATE procedure_income
       SET amount_paid = $1,
           balance = $2,
           payment_status = $3,
           user_id_modification = $4,
           date_time_modification = NOW()
       WHERE income_id = $5`,
      [newAmountPaid, newBalance, newStatus, userId, app.procedure_income_id]
    );

    await client.query('COMMIT');

    return {
      success: true,
      procedure_income_id: app.procedure_income_id,
      amount_reverted: app.amount_applied,
      new_balance: newBalance,
      new_status: newStatus
    };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

/**
 * Marca un procedure_income como cortesía (sin cobro)
 * @param {number} incomeId - ID del procedure_income
 * @param {number} userId - ID del usuario que marca
 * @param {string} notes - Notas/razón de la cortesía
 * @returns {Object} Resultado
 */
const markAsCourtesy = async (incomeId, userId, notes = null) => {
  const query = `
    UPDATE procedure_income
    SET payment_status = 'courtesy',
        amount_paid = final_amount,
        balance = 0,
        user_id_modification = $1,
        date_time_modification = NOW(),
        clinical_notes = COALESCE(clinical_notes, '') || ' [CORTESIA: ' || COALESCE($2, 'Sin notas') || ']'
    WHERE income_id = $3 AND status = 'active'
    RETURNING *
  `;

  const result = await pool.query(query, [userId, notes, incomeId]);

  if (result.rows.length === 0) {
    throw new Error('procedure_income no encontrado');
  }

  return result.rows[0];
};

/**
 * Obtiene el resumen de cuentas por cobrar por sede
 * @param {number} branchId - ID de la sede (opcional)
 * @returns {Object} Resumen de cuentas por cobrar
 */
const getAccountsReceivableSummary = async (branchId = null) => {
  let query = `
    SELECT
      pi.branch_id,
      b.branch_name,
      COUNT(DISTINCT pi.patient_id) as patients_with_debt,
      COUNT(pi.income_id) as pending_incomes,
      SUM(pi.balance) as total_balance,
      MIN(pi.performed_date) as oldest_debt_date,
      COUNT(CASE WHEN pi.due_date < CURRENT_DATE THEN 1 END) as overdue_count,
      SUM(CASE WHEN pi.due_date < CURRENT_DATE THEN pi.balance ELSE 0 END) as overdue_amount
    FROM procedure_income pi
    INNER JOIN branches b ON pi.branch_id = b.branch_id
    WHERE pi.status = 'active'
      AND pi.income_status = 'confirmed'
      AND pi.payment_status IN ('pending', 'partial')
  `;

  const params = [];

  if (branchId) {
    query += ` AND pi.branch_id = $1`;
    params.push(branchId);
  }

  query += ` GROUP BY pi.branch_id, b.branch_name ORDER BY total_balance DESC`;

  const result = await pool.query(query, params);
  return result.rows;
};

/**
 * Obtiene los pacientes con deudas pendientes
 * @param {Object} filters - Filtros opcionales
 * @returns {Array} Lista de pacientes con deudas
 */
const getPatientsWithDebts = async (filters = {}) => {
  let query = `
    SELECT
      pi.patient_id,
      p.first_name || ' ' || p.last_name as patient_name,
      p.identification_number,
      p.mobile,
      p.email,
      COUNT(pi.income_id) as pending_items,
      SUM(pi.balance) as total_balance,
      MIN(pi.performed_date) as oldest_debt_date,
      MAX(pi.performed_date) as latest_service_date,
      COUNT(CASE WHEN pi.due_date < CURRENT_DATE THEN 1 END) as overdue_items
    FROM procedure_income pi
    INNER JOIN patients p ON pi.patient_id = p.patient_id
    WHERE pi.status = 'active'
      AND pi.income_status = 'confirmed'
      AND pi.payment_status IN ('pending', 'partial')
  `;

  const params = [];
  let paramIndex = 1;

  if (filters.branch_id) {
    query += ` AND pi.branch_id = $${paramIndex}`;
    params.push(filters.branch_id);
    paramIndex++;
  }

  if (filters.min_balance) {
    query += ` AND pi.balance >= $${paramIndex}`;
    params.push(filters.min_balance);
    paramIndex++;
  }

  query += ` GROUP BY pi.patient_id, p.first_name, p.last_name, p.identification_number, p.mobile, p.email`;

  if (filters.only_overdue) {
    query += ` HAVING COUNT(CASE WHEN pi.due_date < CURRENT_DATE THEN 1 END) > 0`;
  }

  query += ` ORDER BY total_balance DESC`;

  if (filters.limit) {
    query += ` LIMIT $${paramIndex}`;
    params.push(filters.limit);
    paramIndex++;
  }

  const result = await pool.query(query, params);
  return result.rows;
};

// ============================================================
// FUNCIONES DE VOUCHER Y VERIFICACIÓN
// ============================================================

/**
 * Enviar voucher de pago (paciente sube comprobante)
 * @param {Array} incomeIds - IDs de los procedure_income a pagar
 * @param {string} voucherUrl - URL del archivo voucher
 * @param {number} paymentMethodId - ID del método de pago
 * @param {number} patientId - ID del paciente (para validación)
 * @returns {Object} Resultado
 */
const submitVoucher = async (incomeIds, voucherUrl, paymentMethodId, patientId) => {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // Validar que todos los incomes pertenecen al paciente
    const validateQuery = `
      SELECT income_id, patient_id, payment_status, balance
      FROM procedure_income
      WHERE income_id = ANY($1)
        AND status = 'active'
      FOR UPDATE
    `;
    const validateResult = await client.query(validateQuery, [incomeIds]);

    if (validateResult.rows.length !== incomeIds.length) {
      throw new Error('Algunos procedimientos no fueron encontrados');
    }

    for (const row of validateResult.rows) {
      if (row.patient_id !== patientId) {
        throw new Error('No tiene permiso para pagar estos procedimientos');
      }
      if (row.payment_status === 'paid') {
        throw new Error(`El procedimiento ${row.income_id} ya está pagado`);
      }
      if (row.payment_status === 'pending_verification') {
        throw new Error(`El procedimiento ${row.income_id} ya tiene un voucher pendiente de verificación`);
      }
    }

    // Actualizar todos los incomes con el voucher
    const updateQuery = `
      UPDATE procedure_income
      SET
        voucher_url = $1,
        voucher_submitted_at = NOW(),
        voucher_payment_method_id = $2,
        payment_status = 'pending_verification',
        date_time_modification = NOW()
      WHERE income_id = ANY($3)
      RETURNING *
    `;

    const updateResult = await client.query(updateQuery, [voucherUrl, paymentMethodId, incomeIds]);

    await client.query('COMMIT');

    return {
      success: true,
      updated_count: updateResult.rows.length,
      incomes: updateResult.rows
    };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

/**
 * Obtener pagos pendientes de verificación
 * @param {Object} filters - Filtros opcionales
 * @returns {Array} Lista de pagos pendientes
 */
const getPendingVerification = async (filters = {}) => {
  let query = `
    SELECT
      pi.income_id,
      pi.patient_id,
      pi.branch_id,
      pi.item_name,
      pi.item_description,
      pi.final_amount,
      pi.balance,
      pi.voucher_url,
      pi.voucher_submitted_at,
      pi.voucher_payment_method_id,
      pi.performed_date,
      pi.batch_id,
      p.first_name || ' ' || p.last_name as patient_name,
      p.identification_number as patient_identification,
      p.mobile as patient_mobile,
      b.branch_name,
      pm.method_name as payment_method_name,
      COALESCE(ud.first_name || ' ' || ud.last_name, 'No asignado') as dentist_name
    FROM procedure_income pi
    INNER JOIN patients p ON pi.patient_id = p.patient_id
    INNER JOIN branches b ON pi.branch_id = b.branch_id
    LEFT JOIN payment_methods pm ON pi.voucher_payment_method_id = pm.payment_method_id
    LEFT JOIN dentists d ON pi.performed_by_dentist_id = d.dentist_id
    LEFT JOIN users ud ON d.user_id = ud.user_id
    WHERE pi.status = 'active'
      AND pi.payment_status = 'pending_verification'
  `;

  const params = [];
  let paramIndex = 1;

  if (filters.branch_id) {
    query += ` AND pi.branch_id = $${paramIndex}`;
    params.push(filters.branch_id);
    paramIndex++;
  }

  if (filters.patient_id) {
    query += ` AND pi.patient_id = $${paramIndex}`;
    params.push(filters.patient_id);
    paramIndex++;
  }

  query += ` ORDER BY pi.voucher_submitted_at ASC`; // Más antiguos primero

  const result = await pool.query(query, params);
  return result.rows;
};

/**
 * Aprobar voucher de pago
 * @param {number} incomeId - ID del procedure_income
 * @param {number} userId - ID del usuario que aprueba
 * @returns {Object} Income actualizado
 */
const approveVoucher = async (incomeId, userId) => {
  const query = `
    UPDATE procedure_income
    SET
      payment_status = 'paid',
      amount_paid = final_amount,
      balance = 0,
      verified_by_user_id = $1,
      verified_at = NOW(),
      date_time_modification = NOW(),
      user_id_modification = $1
    WHERE income_id = $2
      AND status = 'active'
      AND payment_status = 'pending_verification'
    RETURNING *
  `;

  const result = await pool.query(query, [userId, incomeId]);

  if (result.rows.length === 0) {
    throw new Error('Pago no encontrado o ya fue procesado');
  }

  return result.rows[0];
};

/**
 * Rechazar voucher de pago
 * @param {number} incomeId - ID del procedure_income
 * @param {number} userId - ID del usuario que rechaza
 * @param {string} reason - Motivo del rechazo
 * @returns {Object} Income actualizado
 */
const rejectVoucher = async (incomeId, userId, reason) => {
  if (!reason || reason.trim().length < 5) {
    throw new Error('Debe proporcionar un motivo de rechazo (mínimo 5 caracteres)');
  }

  const query = `
    UPDATE procedure_income
    SET
      payment_status = 'rejected',
      voucher_url = NULL,
      voucher_submitted_at = NULL,
      voucher_payment_method_id = NULL,
      verified_by_user_id = $1,
      verified_at = NOW(),
      rejection_reason = $2,
      date_time_modification = NOW(),
      user_id_modification = $1
    WHERE income_id = $3
      AND status = 'active'
      AND payment_status = 'pending_verification'
    RETURNING *
  `;

  const result = await pool.query(query, [userId, reason.trim(), incomeId]);

  if (result.rows.length === 0) {
    throw new Error('Pago no encontrado o ya fue procesado');
  }

  return result.rows[0];
};

/**
 * Registrar pago en efectivo (directo por recepción/admin)
 * @param {Array} incomeIds - IDs de los procedure_income
 * @param {number} userId - ID del usuario que registra
 * @param {string} notes - Notas opcionales
 * @returns {Object} Resultado
 */
const registerCashPayment = async (incomeIds, userId, notes = null) => {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const updateQuery = `
      UPDATE procedure_income
      SET
        payment_status = 'paid',
        amount_paid = final_amount,
        balance = 0,
        voucher_payment_method_id = 1, -- Efectivo
        verified_by_user_id = $1,
        verified_at = NOW(),
        clinical_notes = CASE
          WHEN $2 IS NOT NULL THEN COALESCE(clinical_notes, '') || ' [PAGO EFECTIVO: ' || $2 || ']'
          ELSE clinical_notes
        END,
        date_time_modification = NOW(),
        user_id_modification = $1
      WHERE income_id = ANY($3)
        AND status = 'active'
        AND payment_status IN ('pending', 'rejected')
      RETURNING *
    `;

    const result = await client.query(updateQuery, [userId, notes, incomeIds]);

    await client.query('COMMIT');

    return {
      success: true,
      updated_count: result.rows.length,
      incomes: result.rows
    };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

/**
 * Obtener historial de pagos verificados/rechazados
 * @param {Object} filters - Filtros
 * @returns {Array} Lista de pagos
 */
const getVerifiedPayments = async (filters = {}) => {
  let query = `
    SELECT
      pi.income_id,
      pi.patient_id,
      pi.branch_id,
      pi.item_name,
      pi.final_amount,
      pi.payment_status,
      pi.voucher_url,
      pi.voucher_submitted_at,
      pi.verified_at,
      pi.rejection_reason,
      p.first_name || ' ' || p.last_name as patient_name,
      p.identification_number as patient_dni,
      b.branch_name,
      pm.method_name as payment_method_name,
      u.first_name || ' ' || u.last_name as verified_by_name
    FROM procedure_income pi
    INNER JOIN patients p ON pi.patient_id = p.patient_id
    INNER JOIN branches b ON pi.branch_id = b.branch_id
    LEFT JOIN payment_methods pm ON pi.voucher_payment_method_id = pm.payment_method_id
    LEFT JOIN users u ON pi.verified_by_user_id = u.user_id
    WHERE pi.status = 'active'
      AND pi.payment_status IN ('paid', 'rejected')
      AND pi.verified_at IS NOT NULL
  `;

  const params = [];
  let paramIndex = 1;

  if (filters.branch_id) {
    query += ` AND pi.branch_id = $${paramIndex}`;
    params.push(filters.branch_id);
    paramIndex++;
  }

  if (filters.payment_status) {
    query += ` AND pi.payment_status = $${paramIndex}`;
    params.push(filters.payment_status);
    paramIndex++;
  }

  if (filters.date_from) {
    query += ` AND pi.verified_at >= $${paramIndex}`;
    params.push(filters.date_from);
    paramIndex++;
  }

  if (filters.date_to) {
    query += ` AND pi.verified_at <= $${paramIndex}`;
    params.push(filters.date_to);
    paramIndex++;
  }

  query += ` ORDER BY pi.verified_at DESC`;

  if (filters.limit) {
    query += ` LIMIT $${paramIndex}`;
    params.push(filters.limit);
  }

  const result = await pool.query(query, params);
  return result.rows;
};

/**
 * Obtiene el historial de todos los servicios/pagos de procedure_income
 * INCLUYE también los pagos directos de la tabla payments
 * @param {Object} filters - Filtros opcionales
 * @returns {Array} Lista de servicios con información de pago
 */
const getAllPaymentHistory = async (filters = {}) => {
  // Construir filtros dinámicos
  const params = [];
  let paramIndex = 1;

  let branchFilter = '';
  let statusFilter = '';
  let dateFromFilter = '';
  let dateToFilter = '';

  if (filters.branch_id) {
    branchFilter = `$${paramIndex}`;
    params.push(filters.branch_id);
    paramIndex++;
  }

  if (filters.payment_status) {
    statusFilter = `$${paramIndex}`;
    params.push(filters.payment_status);
    paramIndex++;
  }

  if (filters.date_from) {
    dateFromFilter = `$${paramIndex}`;
    params.push(filters.date_from);
    paramIndex++;
  }

  if (filters.date_to) {
    dateToFilter = `$${paramIndex}`;
    params.push(filters.date_to);
    paramIndex++;
  }

  // Query para procedure_income (servicios de consultas)
  let queryProcedureIncome = `
    SELECT
      pi.income_id,
      pi.patient_id,
      p.first_name || ' ' || p.last_name as patient_name,
      p.identification_number as patient_dni,
      pi.branch_id,
      b.branch_name,
      pi.item_name,
      pi.item_description,
      pi.final_amount,
      pi.amount_paid,
      pi.balance,
      pi.payment_status,
      pi.performed_date,
      pi.date_time_registration,
      pi.due_date,
      pi.batch_id,
      tp.tooth_number,
      COALESCE(ud.first_name || ' ' || ud.last_name, 'No asignado') as dentist_name,
      pi.voucher_url,
      pi.voucher_submitted_at,
      pm.method_name as payment_method_name,
      'service' as record_type
    FROM procedure_income pi
    LEFT JOIN patients p ON pi.patient_id = p.patient_id
    LEFT JOIN branches b ON pi.branch_id = b.branch_id
    LEFT JOIN dentists d ON pi.performed_by_dentist_id = d.dentist_id
    LEFT JOIN users ud ON d.user_id = ud.user_id
    LEFT JOIN payment_methods pm ON pi.voucher_payment_method_id = pm.payment_method_id
    LEFT JOIN tooth_positions tp ON pi.tooth_position_id = tp.tooth_position_id
    WHERE pi.status = 'active'
  `;

  if (branchFilter) {
    queryProcedureIncome += ` AND pi.branch_id = ${branchFilter}`;
  }
  if (statusFilter) {
    queryProcedureIncome += ` AND pi.payment_status = ${statusFilter}`;
  }
  if (dateFromFilter) {
    queryProcedureIncome += ` AND pi.performed_date >= ${dateFromFilter}`;
  }
  if (dateToFilter) {
    queryProcedureIncome += ` AND pi.performed_date <= ${dateToFilter}`;
  }

  // Query para payments (pagos directos)
  // Solo incluir si no hay filtro de status O si el status es 'paid'
  let queryPayments = '';
  const includeDirectPayments = !filters.payment_status || filters.payment_status === 'paid';

  if (includeDirectPayments) {
    queryPayments = `
      UNION ALL
      SELECT
        -pay.payment_id as income_id,
        pay.patient_id,
        pt.first_name || ' ' || pt.last_name as patient_name,
        pt.identification_number as patient_dni,
        pay.branch_id,
        br.branch_name,
        COALESCE(pay.notes, 'Pago directo') as item_name,
        pay.notes as item_description,
        pay.amount as final_amount,
        pay.amount as amount_paid,
        0 as balance,
        'paid' as payment_status,
        pay.payment_date as performed_date,
        pay.date_time_registration,
        NULL as due_date,
        NULL as batch_id,
        NULL as tooth_number,
        COALESCE(ur.first_name || ' ' || ur.last_name, 'Sistema') as dentist_name,
        NULL as voucher_url,
        NULL as voucher_submitted_at,
        pmt.method_name as payment_method_name,
        'direct_payment' as record_type
      FROM payments pay
      LEFT JOIN patients pt ON pay.patient_id = pt.patient_id
      LEFT JOIN branches br ON pay.branch_id = br.branch_id
      LEFT JOIN users ur ON pay.received_by = ur.user_id
      LEFT JOIN payment_methods pmt ON pay.payment_method_id = pmt.payment_method_id
      WHERE pay.status = 'active'
    `;

    if (branchFilter) {
      queryPayments += ` AND pay.branch_id = ${branchFilter}`;
    }
    if (dateFromFilter) {
      queryPayments += ` AND pay.payment_date >= ${dateFromFilter}`;
    }
    if (dateToFilter) {
      queryPayments += ` AND pay.payment_date <= ${dateToFilter}`;
    }
  }

  // Combinar queries
  let query = `
    SELECT * FROM (
      ${queryProcedureIncome}
      ${queryPayments}
    ) combined
    ORDER BY date_time_registration DESC NULLS LAST, income_id DESC
  `;

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

// ============================================================
// GENERACIÓN AUTOMÁTICA DE CUOTAS PARA SERVICIOS ADICIONALES
// ============================================================

/**
 * Genera cuotas automáticamente para un servicio adicional (ortodoncia, implantes, etc.)
 * @param {number} serviceId - ID del consultation_additional_service
 * @param {number} userId - ID del usuario que activa el servicio
 * @param {Object} options - Opciones adicionales
 * @returns {Object} - Resultado con las cuotas generadas
 */
const generateServiceQuotas = async (serviceId, userId, options = {}) => {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // 1. Obtener información del servicio adicional
    const serviceResult = await client.query(`
      SELECT
        cas.*,
        ctp.consultation_id,
        c.patient_id,
        c.branch_id,
        c.dentist_id
      FROM consultation_additional_services cas
      INNER JOIN consultation_treatment_plans ctp ON cas.consultation_treatment_plan_id = ctp.consultation_treatment_plan_id
      INNER JOIN consultations c ON ctp.consultation_id = c.consultation_id
      WHERE cas.consultation_additional_service_id = $1
        AND cas.status = 'active'
    `, [serviceId]);

    if (serviceResult.rows.length === 0) {
      throw new Error('Servicio adicional no encontrado');
    }

    const service = serviceResult.rows[0];

    // 2. Verificar si ya existen cuotas para este servicio
    const existingQuotas = await client.query(`
      SELECT COUNT(*) as count
      FROM procedure_income
      WHERE additional_service_id = $1
        AND status = 'active'
        AND quota_type IN ('inicial', 'mensual')
    `, [serviceId]);

    if (parseInt(existingQuotas.rows[0].count) > 0) {
      await client.query('ROLLBACK');
      return {
        success: false,
        message: 'Ya existen cuotas generadas para este servicio',
        quotas_count: parseInt(existingQuotas.rows[0].count)
      };
    }

    // 3. Calcular montos (usar editados si existen, sino originales)
    const montoTotal = parseFloat(service.edited_monto_total) || parseFloat(service.original_monto_total) || 0;
    const inicial = parseFloat(service.edited_inicial) || parseFloat(service.original_inicial) || 0;
    const mensual = parseFloat(service.edited_mensual) || parseFloat(service.original_mensual) || 0;

    if (montoTotal <= 0) {
      await client.query('ROLLBACK');
      return {
        success: false,
        message: 'El servicio no tiene un monto válido'
      };
    }

    // 4. Calcular número de cuotas mensuales
    let numCuotasMensuales = 0;
    if (mensual > 0) {
      const montoRestante = montoTotal - inicial;
      numCuotasMensuales = Math.ceil(montoRestante / mensual);
    }

    const generatedQuotas = [];
    const startDate = options.startDate ? new Date(options.startDate) : new Date();
    let quotaNumber = 1;

    // 5. Generar cuota inicial (si aplica)
    if (inicial > 0) {
      const dueDate = new Date(startDate);
      dueDate.setDate(dueDate.getDate() + 7); // Vence en 7 días

      const initialQuota = await client.query(`
        INSERT INTO procedure_income (
          consultation_id, patient_id, branch_id, income_type,
          additional_service_id, parent_additional_service_id, item_name,
          item_description, amount, final_amount, balance,
          performed_by_dentist_id, performed_date, income_status,
          quota_number, is_final_quota, quota_type, due_date,
          payment_status, status, user_id_registration, date_time_registration
        ) VALUES (
          $1, $2, $3, 'additional_service',
          $4, $4, $5,
          $6, $7, $7, $7,
          $8, $12::date, 'pending',
          $9, false, 'inicial', $10,
          'pending', 'active', $11, CURRENT_TIMESTAMP
        )
        RETURNING *
      `, [
        service.consultation_id,
        service.patient_id,
        service.branch_id,
        serviceId,
        `${service.service_name} - Cuota Inicial`,
        `Pago inicial del servicio: ${service.service_type}`,
        inicial,
        service.dentist_id,
        quotaNumber,
        formatDateYMD(dueDate),
        userId,
        formatDateYMD()
      ]);

      generatedQuotas.push(initialQuota.rows[0]);
      quotaNumber++;
    }

    // 6. Generar cuotas mensuales
    for (let i = 0; i < numCuotasMensuales; i++) {
      const dueDate = new Date(startDate);
      // Primera cuota mensual: 1 mes después, siguientes: i+1 meses después
      const monthOffset = inicial > 0 ? i + 1 : i + 1;
      dueDate.setMonth(dueDate.getMonth() + monthOffset);

      // Ajustar al día de pago preferido (por defecto día 5)
      const paymentDay = options.paymentDay || 5;
      dueDate.setDate(paymentDay);

      const isLastQuota = i === numCuotasMensuales - 1;
      // Ajustar última cuota para que el total sea exacto
      let quotaAmount = mensual;
      if (isLastQuota) {
        const totalGenerado = inicial + (mensual * (numCuotasMensuales - 1));
        quotaAmount = montoTotal - totalGenerado;
        if (quotaAmount < 0) quotaAmount = mensual;
      }

      const monthlyQuota = await client.query(`
        INSERT INTO procedure_income (
          consultation_id, patient_id, branch_id, income_type,
          additional_service_id, parent_additional_service_id, item_name,
          item_description, amount, final_amount, balance,
          performed_by_dentist_id, performed_date, income_status,
          quota_number, is_final_quota, quota_type, due_date,
          payment_status, status, user_id_registration, date_time_registration
        ) VALUES (
          $1, $2, $3, 'additional_service',
          $4, $4, $5,
          $6, $7, $7, $7,
          $8, $13::date, 'pending',
          $9, $10, 'mensual', $11,
          'pending', 'active', $12, CURRENT_TIMESTAMP
        )
        RETURNING *
      `, [
        service.consultation_id,
        service.patient_id,
        service.branch_id,
        serviceId,
        `${service.service_name} - Cuota ${quotaNumber}`,
        `Cuota mensual ${i + 1} de ${numCuotasMensuales} del servicio: ${service.service_type}`,
        quotaAmount,
        service.dentist_id,
        quotaNumber,
        isLastQuota,
        formatDateYMD(dueDate),
        userId,
        formatDateYMD()
      ]);

      generatedQuotas.push(monthlyQuota.rows[0]);
      quotaNumber++;
    }

    // 7. Actualizar el servicio para marcar que las cuotas fueron generadas
    await client.query(`
      UPDATE consultation_additional_services
      SET
        service_status = 'quotas_generated',
        user_id_modification = $1,
        date_time_modification = CURRENT_TIMESTAMP
      WHERE consultation_additional_service_id = $2
    `, [userId, serviceId]);

    await client.query('COMMIT');

    return {
      success: true,
      message: `Se generaron ${generatedQuotas.length} cuotas para el servicio`,
      service_id: serviceId,
      service_name: service.service_name,
      total_amount: montoTotal,
      initial_amount: inicial,
      monthly_amount: mensual,
      quotas_count: generatedQuotas.length,
      quotas: generatedQuotas
    };

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error generando cuotas:', error);
    throw error;
  } finally {
    client.release();
  }
};

/**
 * Obtiene las cuotas de un servicio adicional
 * @param {number} serviceId - ID del consultation_additional_service
 * @returns {Array} - Lista de cuotas
 */
const getServiceQuotas = async (serviceId) => {
  const result = await pool.query(`
    SELECT
      pi.*,
      p.first_name || ' ' || p.last_name as patient_name
    FROM procedure_income pi
    INNER JOIN patients p ON pi.patient_id = p.patient_id
    WHERE pi.additional_service_id = $1
      AND pi.status = 'active'
      AND pi.quota_type IN ('inicial', 'mensual')
    ORDER BY pi.quota_number
  `, [serviceId]);

  return result.rows;
};

/**
 * Obtiene servicios adicionales pendientes de generar cuotas
 * @param {Object} filters - Filtros opcionales (branch_id, patient_id)
 * @returns {Array} - Lista de servicios sin cuotas
 */
const getServicesWithoutQuotas = async (filters = {}) => {
  let query = `
    SELECT
      cas.*,
      ctp.consultation_id,
      c.patient_id,
      c.branch_id,
      p.first_name || ' ' || p.last_name as patient_name,
      b.branch_name,
      (
        SELECT COUNT(*)
        FROM procedure_income pi
        WHERE pi.additional_service_id = cas.consultation_additional_service_id
          AND pi.status = 'active'
          AND pi.quota_type IN ('inicial', 'mensual')
      ) as quotas_count
    FROM consultation_additional_services cas
    INNER JOIN consultation_treatment_plans ctp ON cas.consultation_treatment_plan_id = ctp.consultation_treatment_plan_id
    INNER JOIN consultations c ON ctp.consultation_id = c.consultation_id
    INNER JOIN patients p ON c.patient_id = p.patient_id
    INNER JOIN branches b ON c.branch_id = b.branch_id
    WHERE cas.status = 'active'
      AND cas.service_status IN ('pending', 'quotas_generated')
      AND COALESCE(cas.edited_monto_total, cas.original_monto_total, 0) > 0
  `;

  const params = [];
  let paramIndex = 1;

  if (filters.branch_id) {
    query += ` AND c.branch_id = $${paramIndex}`;
    params.push(filters.branch_id);
    paramIndex++;
  }

  if (filters.patient_id) {
    query += ` AND c.patient_id = $${paramIndex}`;
    params.push(filters.patient_id);
    paramIndex++;
  }

  query += ` ORDER BY cas.date_time_registration DESC`;

  const result = await pool.query(query, params);

  // Filtrar solo los que no tienen cuotas generadas
  return result.rows.filter(s => parseInt(s.quotas_count) === 0);
};

module.exports = {
  applyPaymentToIncomes,
  getPaymentApplications,
  getIncomePaymentHistory,
  revertPaymentApplication,
  markAsCourtesy,
  getAccountsReceivableSummary,
  getPatientsWithDebts,
  // Funciones de voucher y verificación
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
