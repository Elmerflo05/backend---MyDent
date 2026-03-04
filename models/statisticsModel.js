const pool = require('../config/db');
const { formatDateYMD } = require('../utils/dateUtils');

/**
 * Obtiene estadísticas globales del sistema
 * Incluye totales de pacientes, doctores, personal, citas y ingresos
 */
const getGlobalStatistics = async () => {
  try {
    // Total de sedes activas (tabla: branches)
    const branchesQuery = `
      SELECT COUNT(*) as total
      FROM branches
      WHERE status = 'active'
    `;
    const branchesResult = await pool.query(branchesQuery);
    const totalBranches = parseInt(branchesResult.rows[0].total) || 0;

    // Total de pacientes activos (tabla: patients)
    const patientsQuery = `
      SELECT COUNT(*) as total
      FROM patients
      WHERE status = 'active'
    `;
    const patientsResult = await pool.query(patientsQuery);
    const totalPatients = parseInt(patientsResult.rows[0].total) || 0;

    // Total de doctores/dentistas activos (tabla: dentists)
    const dentistsQuery = `
      SELECT COUNT(*) as total
      FROM dentists
      WHERE status = 'active'
    `;
    const dentistsResult = await pool.query(dentistsQuery);
    const totalDoctors = parseInt(dentistsResult.rows[0].total) || 0;

    // Total de personal/usuarios activos (tabla: users)
    const staffQuery = `
      SELECT COUNT(*) as total
      FROM users
      WHERE status = 'active'
    `;
    const staffResult = await pool.query(staffQuery);
    const totalStaff = parseInt(staffResult.rows[0].total) || 0;

    // Citas de hoy (tabla: appointments)
    // Estados activos: 0=Pendiente Aprobación, 1=Programada, 2=Confirmada, 3=En Proceso
    const today = formatDateYMD();
    const appointmentsTodayQuery = `
      SELECT COUNT(*) as total
      FROM appointments a
      WHERE DATE(a.appointment_date) = $1
      AND a.status = 'active'
      AND a.appointment_status_id IN (0, 1, 2, 3)
    `;
    const appointmentsTodayResult = await pool.query(appointmentsTodayQuery, [today]);
    const appointmentsToday = parseInt(appointmentsTodayResult.rows[0].total) || 0;

    // Ingresos del mes actual (tabla: procedure_income)
    // Solo cuenta los ingresos efectivamente cobrados (payment_status = 'paid')
    // Usa verified_at (fecha de verificación del pago) para reflejar cuándo entró el dinero
    const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM
    const revenueQuery = `
      SELECT COALESCE(SUM(amount_paid), 0) as total
      FROM procedure_income
      WHERE TO_CHAR(COALESCE(verified_at, performed_date), 'YYYY-MM') = $1
      AND status = 'active'
      AND payment_status = 'paid'
    `;
    const revenueResult = await pool.query(revenueQuery, [currentMonth]);
    const monthlyRevenue = parseFloat(revenueResult.rows[0].total) || 0;

    return {
      totalBranches,
      totalPatients,
      totalDoctors,
      totalStaff,
      appointmentsToday,
      monthlyRevenue
    };
  } catch (error) {
    console.error('Error en getGlobalStatistics:', error);
    throw error;
  }
};

/**
 * Obtiene estadísticas de una sede específica (branch)
 */
const getBranchStatistics = async (branchId) => {
  try {
    // Total de pacientes de la sede (tabla: patients con branch_id)
    const patientsQuery = `
      SELECT COUNT(*) as total
      FROM patients
      WHERE branch_id = $1 AND status = 'active'
    `;
    const patientsResult = await pool.query(patientsQuery, [branchId]);
    const totalPatients = parseInt(patientsResult.rows[0].total) || 0;

    // Total de doctores asignados a la sede
    // Nota: dentists no tiene branch_id directo, así que contamos usuarios dentistas asignados a la sede
    const dentistsQuery = `
      SELECT COUNT(*) as total
      FROM dentists d
      INNER JOIN users u ON d.user_id = u.user_id
      WHERE u.branch_id = $1 AND d.status = 'active' AND u.status = 'active'
    `;
    const dentistsResult = await pool.query(dentistsQuery, [branchId]);
    const totalDoctors = parseInt(dentistsResult.rows[0].total) || 0;

    // Total de personal asignado a la sede (tabla: users con branch_id)
    const staffQuery = `
      SELECT COUNT(*) as total
      FROM users
      WHERE branch_id = $1 AND status = 'active'
    `;
    const staffResult = await pool.query(staffQuery, [branchId]);
    const totalStaff = parseInt(staffResult.rows[0].total) || 0;

    // Citas de hoy en la sede (tabla: appointments con branch_id)
    // Estados activos: 0=Pendiente Aprobación, 1=Programada, 2=Confirmada, 3=En Proceso
    const today = formatDateYMD();
    const appointmentsTodayQuery = `
      SELECT COUNT(*) as total
      FROM appointments a
      WHERE a.branch_id = $1
      AND DATE(a.appointment_date) = $2
      AND a.status = 'active'
      AND a.appointment_status_id IN (0, 1, 2, 3)
    `;
    const appointmentsTodayResult = await pool.query(appointmentsTodayQuery, [branchId, today]);
    const appointmentsToday = parseInt(appointmentsTodayResult.rows[0].total) || 0;

    // Ingresos del mes actual de la sede (tabla: procedure_income con branch_id)
    // Solo cuenta los ingresos efectivamente cobrados (payment_status = 'paid')
    // Usa verified_at (fecha de verificación del pago) para reflejar cuándo entró el dinero
    const currentMonth = new Date().toISOString().slice(0, 7);
    const revenueQuery = `
      SELECT COALESCE(SUM(amount_paid), 0) as total
      FROM procedure_income
      WHERE branch_id = $1
      AND TO_CHAR(COALESCE(verified_at, performed_date), 'YYYY-MM') = $2
      AND status = 'active'
      AND payment_status = 'paid'
    `;
    const revenueResult = await pool.query(revenueQuery, [branchId, currentMonth]);
    const monthlyRevenue = parseFloat(revenueResult.rows[0].total) || 0;

    return {
      branch_id: branchId,
      totalPatients,
      totalDoctors,
      totalStaff,
      appointmentsToday,
      monthlyRevenue
    };
  } catch (error) {
    console.error('Error en getBranchStatistics:', error);
    throw error;
  }
};

/**
 * Obtiene estadísticas de todas las sedes activas
 */
const getAllBranchesStatistics = async () => {
  try {
    // Primero obtener todas las sedes activas (tabla: branches)
    const branchesQuery = `
      SELECT branch_id
      FROM branches
      WHERE status = 'active'
      ORDER BY branch_id
    `;
    const branchesResult = await pool.query(branchesQuery);
    const branches = branchesResult.rows;

    // Obtener estadísticas para cada sede
    const statistics = {};

    for (const branch of branches) {
      const branchStats = await getBranchStatistics(branch.branch_id);
      statistics[branch.branch_id] = branchStats;
    }

    return statistics;
  } catch (error) {
    console.error('Error en getAllBranchesStatistics:', error);
    throw error;
  }
};

/**
 * Obtiene la actividad reciente del sistema (pacientes, citas, pagos)
 */
const getRecentActivity = async (limit = 10) => {
  try {
    const activities = [];

    // Pacientes registrados recientemente
    const patientsQuery = `
      SELECT
        'new_patient' as type,
        patient_id as id,
        first_name || ' ' || last_name as description,
        date_time_registration as created_at
      FROM patients
      WHERE status = 'active'
      ORDER BY date_time_registration DESC
      LIMIT 5
    `;
    const patientsResult = await pool.query(patientsQuery);
    activities.push(...patientsResult.rows.map(row => ({
      type: 'new_patient',
      id: row.id,
      description: `Nuevo paciente: ${row.description}`,
      createdAt: row.created_at
    })));

    // Citas recientes
    const appointmentsQuery = `
      SELECT
        'appointment' as type,
        a.appointment_id as id,
        p.first_name || ' ' || p.last_name as patient_name,
        ast.status_name,
        a.date_time_registration as created_at
      FROM appointments a
      INNER JOIN patients p ON a.patient_id = p.patient_id
      LEFT JOIN appointment_statuses ast ON a.appointment_status_id = ast.appointment_status_id
      WHERE a.status = 'active'
      ORDER BY a.date_time_registration DESC
      LIMIT 5
    `;
    const appointmentsResult = await pool.query(appointmentsQuery);
    activities.push(...appointmentsResult.rows.map(row => {
      let statusLabel = 'programada';
      if (row.status_name === 'confirmed') statusLabel = 'confirmada';
      if (row.status_name === 'completed') statusLabel = 'completada';
      if (row.status_name === 'cancelled') statusLabel = 'cancelada';
      if (row.status_name === 'in_progress') statusLabel = 'en progreso';

      return {
        type: 'appointment',
        id: row.id,
        description: `Cita ${statusLabel}: ${row.patient_name}`,
        createdAt: row.created_at
      };
    }));

    // Pagos recientes (desde procedure_income)
    const paymentsQuery = `
      SELECT
        'payment' as type,
        pi.income_id as id,
        p.first_name || ' ' || p.last_name as patient_name,
        pi.amount_paid as amount,
        pi.item_name,
        COALESCE(pi.verified_at, pi.date_time_registration) as created_at
      FROM procedure_income pi
      INNER JOIN patients p ON pi.patient_id = p.patient_id
      WHERE pi.status = 'active'
      AND pi.payment_status = 'paid'
      ORDER BY COALESCE(pi.verified_at, pi.date_time_registration) DESC
      LIMIT 5
    `;
    const paymentsResult = await pool.query(paymentsQuery);
    activities.push(...paymentsResult.rows.map(row => ({
      type: 'payment',
      id: row.id,
      description: `Pago S/. ${parseFloat(row.amount).toFixed(2)}: ${row.patient_name} - ${row.item_name}`,
      createdAt: row.created_at
    })));

    // Ordenar por fecha y limitar
    activities.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    return activities.slice(0, limit);
  } catch (error) {
    console.error('Error en getRecentActivity:', error);
    return [];
  }
};

module.exports = {
  getGlobalStatistics,
  getBranchStatistics,
  getAllBranchesStatistics,
  getRecentActivity
};
