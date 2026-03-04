/**
 * Controlador de Comisiones de Dentistas
 * Maneja el cálculo, aprobación y pago de comisiones basadas en procedure_income
 */

const pool = require('../config/db');

/**
 * Obtener ingresos pendientes de comisión para un dentista
 * GET /api/commissions/pending/:dentistId
 */
const getPendingIncomes = async (req, res) => {
  try {
    const { dentistId } = req.params;
    const { branchId, startDate, endDate } = req.query;

    // Validar dentistId
    if (!dentistId) {
      return res.status(400).json({
        success: false,
        message: 'El ID del dentista es requerido'
      });
    }

    // Construir query para obtener ingresos sin comisión asignada
    let query = `
      SELECT
        pi.income_id,
        pi.consultation_id,
        pi.patient_id,
        pi.branch_id,
        pi.income_type,
        pi.item_name,
        pi.item_description,
        pi.amount,
        pi.discount_amount,
        pi.final_amount,
        pi.performed_date,
        pi.performed_time,
        pi.clinical_notes,
        pi.income_status,
        p.first_name || ' ' || p.last_name AS patient_name,
        b.branch_name
      FROM procedure_income pi
      INNER JOIN patients p ON pi.patient_id = p.patient_id
      INNER JOIN branches b ON pi.branch_id = b.branch_id
      WHERE pi.performed_by_dentist_id = $1
        AND pi.commission_id IS NULL
        AND pi.income_status = 'confirmed'
        AND pi.status = 'active'
    `;

    const params = [dentistId];
    let paramIndex = 2;

    // Filtrar por sucursal si se especifica
    if (branchId) {
      query += ` AND pi.branch_id = $${paramIndex}`;
      params.push(branchId);
      paramIndex++;
    }

    // Filtrar por rango de fechas si se especifica
    if (startDate) {
      query += ` AND pi.performed_date >= $${paramIndex}`;
      params.push(startDate);
      paramIndex++;
    }

    if (endDate) {
      query += ` AND pi.performed_date <= $${paramIndex}`;
      params.push(endDate);
      paramIndex++;
    }

    query += ` ORDER BY pi.performed_date DESC, pi.performed_time DESC`;

    const result = await pool.query(query, params);

    // Calcular totales
    const totals = result.rows.reduce((acc, row) => {
      acc.totalAmount += parseFloat(row.final_amount) || 0;
      acc.count++;
      return acc;
    }, { totalAmount: 0, count: 0 });

    res.json({
      success: true,
      data: {
        incomes: result.rows,
        totals: {
          grossIncome: totals.totalAmount,
          incomeCount: totals.count
        }
      }
    });

  } catch (error) {
    console.error('Error al obtener ingresos pendientes:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener los ingresos pendientes',
      error: error.message
    });
  }
};

/**
 * Calcular y crear una comisión
 * POST /api/commissions/calculate
 */
const calculateCommission = async (req, res) => {
  const client = await pool.connect();

  try {
    const {
      dentistId,
      branchId,
      periodStart,
      periodEnd,
      igvAmount = 0,
      prosthesisLabCost = 0,
      materialsCost = 0,
      otherDeductions = 0,
      commissionPercentage,
      notes
    } = req.body;

    const userId = req.user?.id || req.user?.userId;

    // Validaciones
    if (!dentistId || !branchId || !periodStart || !periodEnd) {
      return res.status(400).json({
        success: false,
        message: 'Faltan campos requeridos: dentistId, branchId, periodStart, periodEnd'
      });
    }

    if (commissionPercentage === undefined || commissionPercentage < 0 || commissionPercentage > 100) {
      return res.status(400).json({
        success: false,
        message: 'El porcentaje de comisión debe estar entre 0 y 100'
      });
    }

    await client.query('BEGIN');

    // 1. Obtener ingresos elegibles (no usados en comisión previa)
    const incomesResult = await client.query(`
      SELECT income_id, final_amount
      FROM procedure_income
      WHERE performed_by_dentist_id = $1
        AND branch_id = $2
        AND performed_date >= $3
        AND performed_date <= $4
        AND commission_id IS NULL
        AND income_status = 'confirmed'
        AND status = 'active'
      FOR UPDATE
    `, [dentistId, branchId, periodStart, periodEnd]);

    if (incomesResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        success: false,
        message: 'No hay ingresos elegibles para el período especificado'
      });
    }

    // 2. Calcular montos
    const grossIncome = incomesResult.rows.reduce(
      (sum, row) => sum + parseFloat(row.final_amount),
      0
    );

    const netBase = grossIncome - igvAmount - prosthesisLabCost - materialsCost - otherDeductions;
    const commissionAmount = netBase * (commissionPercentage / 100);

    // 3. Crear registro de comisión
    const commissionResult = await client.query(`
      INSERT INTO dentist_commissions (
        dentist_id,
        branch_id,
        period_start,
        period_end,
        gross_income,
        igv_amount,
        prosthesis_lab_cost,
        materials_cost,
        other_deductions,
        net_base,
        commission_percentage,
        commission_amount,
        income_count,
        commission_status,
        calculated_by,
        notes,
        user_id_registration
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, 'pending', $14, $15, $14)
      RETURNING *
    `, [
      dentistId,
      branchId,
      periodStart,
      periodEnd,
      grossIncome,
      igvAmount,
      prosthesisLabCost,
      materialsCost,
      otherDeductions,
      netBase,
      commissionPercentage,
      commissionAmount,
      incomesResult.rows.length,
      userId,
      notes
    ]);

    const commission = commissionResult.rows[0];

    // 4. Marcar ingresos como usados (vincular a esta comisión)
    const incomeIds = incomesResult.rows.map(row => row.income_id);
    await client.query(`
      UPDATE procedure_income
      SET commission_id = $1,
          user_id_modification = $2,
          date_time_modification = CURRENT_TIMESTAMP
      WHERE income_id = ANY($3)
    `, [commission.commission_id, userId, incomeIds]);

    await client.query('COMMIT');

    // 5. Obtener datos completos para respuesta
    const fullCommissionResult = await pool.query(`
      SELECT
        dc.*,
        u_calc.first_name || ' ' || u_calc.last_name AS calculated_by_name,
        d.professional_license,
        u_dent.first_name || ' ' || u_dent.last_name AS dentist_name,
        b.branch_name
      FROM dentist_commissions dc
      LEFT JOIN users u_calc ON dc.calculated_by = u_calc.user_id
      INNER JOIN dentists d ON dc.dentist_id = d.dentist_id
      INNER JOIN users u_dent ON d.user_id = u_dent.user_id
      INNER JOIN branches b ON dc.branch_id = b.branch_id
      WHERE dc.commission_id = $1
    `, [commission.commission_id]);

    res.status(201).json({
      success: true,
      message: 'Comisión calculada exitosamente',
      data: fullCommissionResult.rows[0]
    });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error al calcular comisión:', error);
    res.status(500).json({
      success: false,
      message: 'Error al calcular la comisión',
      error: error.message
    });
  } finally {
    client.release();
  }
};

/**
 * Obtener comisiones de un dentista
 * GET /api/commissions/dentist/:dentistId
 */
const getCommissionsByDentist = async (req, res) => {
  try {
    const { dentistId } = req.params;
    const { status, startDate, endDate, limit = 50, offset = 0 } = req.query;

    let query = `
      SELECT
        dc.*,
        u_calc.first_name || ' ' || u_calc.last_name AS calculated_by_name,
        u_appr.first_name || ' ' || u_appr.last_name AS approved_by_name,
        u_paid.first_name || ' ' || u_paid.last_name AS paid_by_name,
        d.professional_license,
        u_dent.first_name || ' ' || u_dent.last_name AS dentist_name,
        b.branch_name
      FROM dentist_commissions dc
      LEFT JOIN users u_calc ON dc.calculated_by = u_calc.user_id
      LEFT JOIN users u_appr ON dc.approved_by = u_appr.user_id
      LEFT JOIN users u_paid ON dc.paid_by = u_paid.user_id
      INNER JOIN dentists d ON dc.dentist_id = d.dentist_id
      INNER JOIN users u_dent ON d.user_id = u_dent.user_id
      INNER JOIN branches b ON dc.branch_id = b.branch_id
      WHERE dc.dentist_id = $1
        AND dc.status = 'active'
    `;

    const params = [dentistId];
    let paramIndex = 2;

    if (status) {
      query += ` AND dc.commission_status = $${paramIndex}`;
      params.push(status);
      paramIndex++;
    }

    if (startDate) {
      query += ` AND dc.period_start >= $${paramIndex}`;
      params.push(startDate);
      paramIndex++;
    }

    if (endDate) {
      query += ` AND dc.period_end <= $${paramIndex}`;
      params.push(endDate);
      paramIndex++;
    }

    query += ` ORDER BY dc.calculated_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(limit, offset);

    const result = await pool.query(query, params);

    // Contar total para paginación
    let countQuery = `
      SELECT COUNT(*)
      FROM dentist_commissions dc
      WHERE dc.dentist_id = $1 AND dc.status = 'active'
    `;
    const countParams = [dentistId];

    if (status) {
      countQuery += ` AND dc.commission_status = $2`;
      countParams.push(status);
    }

    const countResult = await pool.query(countQuery, countParams);

    res.json({
      success: true,
      data: {
        commissions: result.rows,
        pagination: {
          total: parseInt(countResult.rows[0].count),
          limit: parseInt(limit),
          offset: parseInt(offset)
        }
      }
    });

  } catch (error) {
    console.error('Error al obtener comisiones:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener las comisiones',
      error: error.message
    });
  }
};

/**
 * Obtener todas las comisiones (para admin)
 * GET /api/commissions
 */
const getAllCommissions = async (req, res) => {
  try {
    const { status, branchId, dentistId, startDate, endDate, limit = 50, offset = 0 } = req.query;

    let query = `
      SELECT
        dc.*,
        u_calc.first_name || ' ' || u_calc.last_name AS calculated_by_name,
        u_appr.first_name || ' ' || u_appr.last_name AS approved_by_name,
        u_paid.first_name || ' ' || u_paid.last_name AS paid_by_name,
        d.professional_license,
        u_dent.first_name || ' ' || u_dent.last_name AS dentist_name,
        b.branch_name
      FROM dentist_commissions dc
      LEFT JOIN users u_calc ON dc.calculated_by = u_calc.user_id
      LEFT JOIN users u_appr ON dc.approved_by = u_appr.user_id
      LEFT JOIN users u_paid ON dc.paid_by = u_paid.user_id
      INNER JOIN dentists d ON dc.dentist_id = d.dentist_id
      INNER JOIN users u_dent ON d.user_id = u_dent.user_id
      INNER JOIN branches b ON dc.branch_id = b.branch_id
      WHERE dc.status = 'active'
    `;

    const params = [];
    let paramIndex = 1;

    if (status) {
      query += ` AND dc.commission_status = $${paramIndex}`;
      params.push(status);
      paramIndex++;
    }

    if (branchId) {
      query += ` AND dc.branch_id = $${paramIndex}`;
      params.push(branchId);
      paramIndex++;
    }

    if (dentistId) {
      query += ` AND dc.dentist_id = $${paramIndex}`;
      params.push(dentistId);
      paramIndex++;
    }

    if (startDate) {
      query += ` AND dc.period_start >= $${paramIndex}`;
      params.push(startDate);
      paramIndex++;
    }

    if (endDate) {
      query += ` AND dc.period_end <= $${paramIndex}`;
      params.push(endDate);
      paramIndex++;
    }

    query += ` ORDER BY dc.calculated_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(limit, offset);

    const result = await pool.query(query, params);

    res.json({
      success: true,
      data: result.rows
    });

  } catch (error) {
    console.error('Error al obtener comisiones:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener las comisiones',
      error: error.message
    });
  }
};

/**
 * Obtener detalle de una comisión (con sus ingresos)
 * GET /api/commissions/:commissionId
 */
const getCommissionDetail = async (req, res) => {
  try {
    const { commissionId } = req.params;

    // Obtener comisión
    const commissionResult = await pool.query(`
      SELECT
        dc.*,
        u_calc.first_name || ' ' || u_calc.last_name AS calculated_by_name,
        u_appr.first_name || ' ' || u_appr.last_name AS approved_by_name,
        u_paid.first_name || ' ' || u_paid.last_name AS paid_by_name,
        d.professional_license,
        u_dent.first_name || ' ' || u_dent.last_name AS dentist_name,
        u_dent.email AS dentist_email,
        b.branch_name
      FROM dentist_commissions dc
      LEFT JOIN users u_calc ON dc.calculated_by = u_calc.user_id
      LEFT JOIN users u_appr ON dc.approved_by = u_appr.user_id
      LEFT JOIN users u_paid ON dc.paid_by = u_paid.user_id
      INNER JOIN dentists d ON dc.dentist_id = d.dentist_id
      INNER JOIN users u_dent ON d.user_id = u_dent.user_id
      INNER JOIN branches b ON dc.branch_id = b.branch_id
      WHERE dc.commission_id = $1
    `, [commissionId]);

    if (commissionResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Comisión no encontrada'
      });
    }

    // Obtener ingresos vinculados
    const incomesResult = await pool.query(`
      SELECT
        pi.*,
        p.first_name || ' ' || p.last_name AS patient_name
      FROM procedure_income pi
      INNER JOIN patients p ON pi.patient_id = p.patient_id
      WHERE pi.commission_id = $1
      ORDER BY pi.performed_date DESC, pi.performed_time DESC
    `, [commissionId]);

    res.json({
      success: true,
      data: {
        commission: commissionResult.rows[0],
        incomes: incomesResult.rows
      }
    });

  } catch (error) {
    console.error('Error al obtener detalle de comisión:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener el detalle de la comisión',
      error: error.message
    });
  }
};

/**
 * Aprobar una comisión
 * PUT /api/commissions/:commissionId/approve
 */
const approveCommission = async (req, res) => {
  try {
    const { commissionId } = req.params;
    const userId = req.user?.id || req.user?.userId;

    const result = await pool.query(`
      UPDATE dentist_commissions
      SET commission_status = 'approved',
          approved_by = $1,
          approved_at = CURRENT_TIMESTAMP,
          user_id_modification = $1,
          date_time_modification = CURRENT_TIMESTAMP
      WHERE commission_id = $2
        AND commission_status = 'pending'
        AND status = 'active'
      RETURNING *
    `, [userId, commissionId]);

    if (result.rows.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No se pudo aprobar la comisión. Verifique que exista y esté en estado pendiente.'
      });
    }

    res.json({
      success: true,
      message: 'Comisión aprobada exitosamente',
      data: result.rows[0]
    });

  } catch (error) {
    console.error('Error al aprobar comisión:', error);
    res.status(500).json({
      success: false,
      message: 'Error al aprobar la comisión',
      error: error.message
    });
  }
};

/**
 * Rechazar una comisión
 * PUT /api/commissions/:commissionId/reject
 */
const rejectCommission = async (req, res) => {
  const client = await pool.connect();

  try {
    const { commissionId } = req.params;
    const { reason } = req.body;
    const userId = req.user?.id || req.user?.userId;

    if (!reason) {
      return res.status(400).json({
        success: false,
        message: 'Debe proporcionar una razón para el rechazo'
      });
    }

    await client.query('BEGIN');

    // Actualizar estado de la comisión
    const result = await client.query(`
      UPDATE dentist_commissions
      SET commission_status = 'cancelled',
          rejected_by = $1,
          rejected_at = CURRENT_TIMESTAMP,
          rejection_reason = $2,
          user_id_modification = $1,
          date_time_modification = CURRENT_TIMESTAMP
      WHERE commission_id = $3
        AND commission_status IN ('pending', 'approved')
        AND status = 'active'
      RETURNING *
    `, [userId, reason, commissionId]);

    if (result.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        success: false,
        message: 'No se pudo rechazar la comisión'
      });
    }

    // Liberar los ingresos (quitar la referencia a esta comisión)
    await client.query(`
      UPDATE procedure_income
      SET commission_id = NULL,
          user_id_modification = $1,
          date_time_modification = CURRENT_TIMESTAMP
      WHERE commission_id = $2
    `, [userId, commissionId]);

    await client.query('COMMIT');

    res.json({
      success: true,
      message: 'Comisión rechazada. Los ingresos han sido liberados para un nuevo cálculo.',
      data: result.rows[0]
    });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error al rechazar comisión:', error);
    res.status(500).json({
      success: false,
      message: 'Error al rechazar la comisión',
      error: error.message
    });
  } finally {
    client.release();
  }
};

/**
 * Marcar comisión como pagada
 * PUT /api/commissions/:commissionId/pay
 */
const payCommission = async (req, res) => {
  try {
    const { commissionId } = req.params;
    const { paymentMethod, paymentReference, paymentNotes } = req.body;
    const userId = req.user?.id || req.user?.userId;

    const result = await pool.query(`
      UPDATE dentist_commissions
      SET commission_status = 'paid',
          paid_by = $1,
          paid_at = CURRENT_TIMESTAMP,
          payment_method = $2,
          payment_reference = $3,
          payment_notes = $4,
          user_id_modification = $1,
          date_time_modification = CURRENT_TIMESTAMP
      WHERE commission_id = $5
        AND commission_status = 'approved'
        AND status = 'active'
      RETURNING *
    `, [userId, paymentMethod, paymentReference, paymentNotes, commissionId]);

    if (result.rows.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No se pudo marcar como pagada. Verifique que la comisión esté aprobada.'
      });
    }

    res.json({
      success: true,
      message: 'Comisión marcada como pagada exitosamente',
      data: result.rows[0]
    });

  } catch (error) {
    console.error('Error al marcar comisión como pagada:', error);
    res.status(500).json({
      success: false,
      message: 'Error al registrar el pago',
      error: error.message
    });
  }
};

/**
 * Obtener resumen de comisiones por dentista
 * GET /api/commissions/summary/:dentistId
 */
const getCommissionSummary = async (req, res) => {
  try {
    const { dentistId } = req.params;

    const result = await pool.query(`
      SELECT
        commission_status,
        COUNT(*) as count,
        SUM(commission_amount) as total_amount
      FROM dentist_commissions
      WHERE dentist_id = $1
        AND status = 'active'
      GROUP BY commission_status
    `, [dentistId]);

    // Calcular ingresos pendientes de comisión
    const pendingIncomesResult = await pool.query(`
      SELECT
        COUNT(*) as pending_count,
        COALESCE(SUM(final_amount), 0) as pending_amount
      FROM procedure_income
      WHERE performed_by_dentist_id = $1
        AND commission_id IS NULL
        AND income_status = 'confirmed'
        AND status = 'active'
    `, [dentistId]);

    const summary = {
      pending: { count: 0, amount: 0 },
      approved: { count: 0, amount: 0 },
      paid: { count: 0, amount: 0 },
      cancelled: { count: 0, amount: 0 },
      pendingIncomes: {
        count: parseInt(pendingIncomesResult.rows[0].pending_count),
        amount: parseFloat(pendingIncomesResult.rows[0].pending_amount)
      }
    };

    result.rows.forEach(row => {
      if (summary[row.commission_status]) {
        summary[row.commission_status] = {
          count: parseInt(row.count),
          amount: parseFloat(row.total_amount)
        };
      }
    });

    res.json({
      success: true,
      data: summary
    });

  } catch (error) {
    console.error('Error al obtener resumen de comisiones:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener el resumen',
      error: error.message
    });
  }
};

module.exports = {
  getPendingIncomes,
  calculateCommission,
  getCommissionsByDentist,
  getAllCommissions,
  getCommissionDetail,
  approveCommission,
  rejectCommission,
  payCommission,
  getCommissionSummary
};
