const pool = require('../config/db');

/**
 * Reporte por consultorio/sala
 * @param {number|null} branchId - ID de la sede (null para todas las sedes)
 * @param {Date} fechaInicio - Fecha de inicio del reporte
 * @param {Date} fechaFin - Fecha de fin del reporte
 * @returns {Promise<Array>} Array con estadísticas por consultorio
 */
const getReportePorConsultorio = async (branchId, fechaInicio, fechaFin) => {
  try {
    const query = `
      SELECT
        COALESCE(a.room, 'Sin asignar') as consultorio,
        COUNT(a.appointment_id) as "totalCitas",
        COUNT(CASE WHEN ast.status_code = 'COMPLETED' THEN 1 END) as "citasCompletadas",
        COUNT(CASE WHEN ast.status_code = 'CANCELLED' THEN 1 END) as "citasCanceladas",
        COALESCE(SUM(CASE WHEN pi.payment_status = 'paid' THEN pi.amount_paid ELSE 0 END), 0) as "ingresosBruto",
        COALESCE(AVG(a.duration), 30) as "duracionPromedio",
        CASE
          WHEN COUNT(a.appointment_id) > 0
          THEN ROUND((COUNT(CASE WHEN ast.status_code = 'COMPLETED' THEN 1 END)::numeric / COUNT(a.appointment_id)::numeric) * 100, 2)
          ELSE 0
        END as "tasaOcupacion"
      FROM appointments a
      LEFT JOIN appointment_statuses ast ON a.appointment_status_id = ast.appointment_status_id
      LEFT JOIN procedure_income pi ON a.appointment_id = pi.appointment_id AND pi.status = 'active'
      WHERE a.appointment_date >= $1
        AND a.appointment_date <= $2
        AND a.status = 'active'
        ${branchId ? 'AND a.branch_id = $3' : ''}
      GROUP BY a.room
      ORDER BY "ingresosBruto" DESC
    `;

    const params = branchId
      ? [fechaInicio, fechaFin, branchId]
      : [fechaInicio, fechaFin];

    const result = await pool.query(query, params);
    return result.rows.map(row => ({
      consultorio: row.consultorio,
      totalCitas: parseInt(row.totalCitas) || 0,
      citasCompletadas: parseInt(row.citasCompletadas) || 0,
      citasCanceladas: parseInt(row.citasCanceladas) || 0,
      ingresosBruto: parseFloat(row.ingresosBruto) || 0,
      duracionPromedio: parseFloat(row.duracionPromedio) || 0,
      tasaOcupacion: parseFloat(row.tasaOcupacion) || 0
    }));
  } catch (error) {
    console.error('Error en getReportePorConsultorio:', error);
    throw error;
  }
};

/**
 * Reporte por especialidad
 * @param {number|null} branchId - ID de la sede (null para todas las sedes)
 * @param {Date} fechaInicio - Fecha de inicio del reporte
 * @param {Date} fechaFin - Fecha de fin del reporte
 * @returns {Promise<Array>} Array con estadísticas por especialidad
 */
const getReportePorEspecialidad = async (branchId, fechaInicio, fechaFin) => {
  try {
    const query = `
      SELECT
        s.specialty_id,
        s.specialty_name as especialidad,
        COUNT(DISTINCT a.appointment_id) as "totalCitas",
        COUNT(DISTINCT CASE WHEN ast.status_code = 'COMPLETED' THEN a.appointment_id END) as "citasCompletadas",
        COALESCE(SUM(CASE WHEN pi.payment_status = 'paid' THEN pi.amount_paid ELSE 0 END), 0) as "ingresosBruto",
        COUNT(DISTINCT ds.dentist_id) as doctores,
        CASE
          WHEN COUNT(DISTINCT CASE WHEN ast.status_code = 'COMPLETED' THEN a.appointment_id END) > 0
          THEN ROUND(COALESCE(SUM(CASE WHEN pi.payment_status = 'paid' THEN pi.amount_paid ELSE 0 END), 0)::numeric /
               NULLIF(COUNT(DISTINCT CASE WHEN ast.status_code = 'COMPLETED' THEN a.appointment_id END), 0)::numeric, 2)
          ELSE 0
        END as "precioPromedio"
      FROM specialties s
      LEFT JOIN dentist_specialties ds ON s.specialty_id = ds.specialty_id
      LEFT JOIN appointments a ON a.specialty_id = s.specialty_id
        AND a.appointment_date >= $1
        AND a.appointment_date <= $2
        AND a.status = 'active'
        ${branchId ? 'AND a.branch_id = $3' : ''}
      LEFT JOIN appointment_statuses ast ON a.appointment_status_id = ast.appointment_status_id
      LEFT JOIN procedure_income pi ON a.appointment_id = pi.appointment_id AND pi.status = 'active'
      WHERE s.status = 'active'
      GROUP BY s.specialty_id, s.specialty_name
      ORDER BY "totalCitas" DESC, "ingresosBruto" DESC
    `;

    const params = branchId
      ? [fechaInicio, fechaFin, branchId]
      : [fechaInicio, fechaFin];

    const result = await pool.query(query, params);
    return result.rows.map(row => ({
      especialidad: row.especialidad,
      totalCitas: parseInt(row.totalCitas) || 0,
      citasCompletadas: parseInt(row.citasCompletadas) || 0,
      ingresosBruto: parseFloat(row.ingresosBruto) || 0,
      doctores: parseInt(row.doctores) || 0,
      precioPromedio: parseFloat(row.precioPromedio) || 0
    }));
  } catch (error) {
    console.error('Error en getReportePorEspecialidad:', error);
    throw error;
  }
};

/**
 * Reporte por doctor
 * @param {number|null} branchId - ID de la sede (null para todas las sedes)
 * @param {Date} fechaInicio - Fecha de inicio del reporte
 * @param {Date} fechaFin - Fecha de fin del reporte
 * @returns {Promise<Array>} Array con estadísticas por doctor
 */
const getReportePorDoctor = async (branchId, fechaInicio, fechaFin) => {
  try {
    // Primero obtenemos los doctores con sus citas
    const doctoresQuery = `
      SELECT
        d.dentist_id as "doctorId",
        CONCAT(u.first_name, ' ', u.last_name) as "nombreCompleto",
        COUNT(DISTINCT a.appointment_id) as "totalCitas",
        COUNT(DISTINCT CASE WHEN ast.status_code = 'COMPLETED' THEN a.appointment_id END) as "citasCompletadas",
        COUNT(DISTINCT CASE WHEN ast.status_code = 'CANCELLED' THEN a.appointment_id END) as "citasCanceladas",
        COALESCE(SUM(CASE WHEN pi.payment_status = 'paid' THEN pi.amount_paid ELSE 0 END), 0) as "ingresosBruto"
      FROM dentists d
      INNER JOIN users u ON d.user_id = u.user_id
      LEFT JOIN appointments a ON d.dentist_id = a.dentist_id
        AND a.appointment_date >= $1
        AND a.appointment_date <= $2
        AND a.status = 'active'
        ${branchId ? 'AND a.branch_id = $3' : ''}
      LEFT JOIN appointment_statuses ast ON a.appointment_status_id = ast.appointment_status_id
      LEFT JOIN procedure_income pi ON a.appointment_id = pi.appointment_id
        AND pi.performed_by_dentist_id = d.dentist_id
        AND pi.status = 'active'
      WHERE d.status = 'active'
      GROUP BY d.dentist_id, u.first_name, u.last_name
      ORDER BY "ingresosBruto" DESC
    `;

    const params = branchId
      ? [fechaInicio, fechaFin, branchId]
      : [fechaInicio, fechaFin];

    const doctoresResult = await pool.query(doctoresQuery, params);

    // Obtener especialidades para cada doctor
    const especialidadesQuery = `
      SELECT
        ds.dentist_id,
        ARRAY_AGG(s.specialty_name) as especialidades
      FROM dentist_specialties ds
      INNER JOIN specialties s ON ds.specialty_id = s.specialty_id AND s.status = 'active'
      WHERE ds.status = 'active'
      GROUP BY ds.dentist_id
    `;
    const especialidadesResult = await pool.query(especialidadesQuery);
    const especialidadesMap = {};
    especialidadesResult.rows.forEach(row => {
      especialidadesMap[row.dentist_id] = row.especialidades || [];
    });

    return doctoresResult.rows.map(row => {
      const totalCitas = parseInt(row.totalCitas) || 0;
      const citasCompletadas = parseInt(row.citasCompletadas) || 0;
      const ingresosBruto = parseFloat(row.ingresosBruto) || 0;

      return {
        doctorId: row.doctorId.toString(),
        nombreCompleto: row.nombreCompleto,
        especialidades: especialidadesMap[row.doctorId] || [],
        totalCitas,
        citasCompletadas,
        citasCanceladas: parseInt(row.citasCanceladas) || 0,
        ingresosBruto,
        promedioIngresoPorCita: totalCitas > 0 ? Math.round((ingresosBruto / totalCitas) * 100) / 100 : 0,
        tasaCompletacion: totalCitas > 0 ? Math.round((citasCompletadas / totalCitas) * 100 * 100) / 100 : 0
      };
    });
  } catch (error) {
    console.error('Error en getReportePorDoctor:', error);
    throw error;
  }
};

/**
 * Estadísticas de consultorios
 * @param {number|null} branchId - ID de la sede (null para todas las sedes)
 * @param {Date} fechaInicio - Fecha de inicio del reporte
 * @param {Date} fechaFin - Fecha de fin del reporte
 * @returns {Promise<Array>} Array con estadísticas de consultorios
 */
const getEstadisticasConsultorios = async (branchId, fechaInicio, fechaFin) => {
  try {
    // Query principal de estadísticas por consultorio
    const query = `
      SELECT
        cr.consultation_room_id as "consultorioId",
        cr.room_name as nombre,
        COUNT(a.appointment_id) as "totalCitas",
        COUNT(CASE WHEN ast.status_code = 'COMPLETED' THEN 1 END) as "citasCompletadas",
        COUNT(CASE WHEN ast.status_code = 'CANCELLED' THEN 1 END) as "citasCanceladas",
        COUNT(CASE WHEN ast.status_code IN ('SCHEDULED', 'CONFIRMED', 'PENDING_APPROVAL') THEN 1 END) as "citasPendientes",
        CASE
          WHEN COUNT(a.appointment_id) > 0
          THEN ROUND((COUNT(CASE WHEN ast.status_code = 'COMPLETED' THEN 1 END)::numeric / COUNT(a.appointment_id)::numeric) * 100, 2)
          ELSE 0
        END as "ocupacionPorcentaje"
      FROM consultation_rooms cr
      LEFT JOIN appointments a ON cr.room_name = a.room
        AND a.appointment_date >= $1
        AND a.appointment_date <= $2
        AND a.status = 'active'
        ${branchId ? 'AND a.branch_id = $3' : ''}
      LEFT JOIN appointment_statuses ast ON a.appointment_status_id = ast.appointment_status_id
      WHERE cr.status = 'active'
        ${branchId ? 'AND cr.branch_id = $3' : ''}
      GROUP BY cr.consultation_room_id, cr.room_name
      ORDER BY "ocupacionPorcentaje" DESC
    `;

    // Query para citas por mes por consultorio
    const citasPorMesQuery = `
      SELECT
        cr.room_name as nombre,
        TO_CHAR(a.appointment_date, 'Mon') as mes,
        EXTRACT(MONTH FROM a.appointment_date) as mes_num,
        COUNT(a.appointment_id) as cantidad
      FROM consultation_rooms cr
      LEFT JOIN appointments a ON cr.room_name = a.room
        AND a.appointment_date >= $1
        AND a.appointment_date <= $2
        AND a.status = 'active'
        ${branchId ? 'AND a.branch_id = $3' : ''}
      WHERE cr.status = 'active'
        ${branchId ? 'AND cr.branch_id = $3' : ''}
      GROUP BY cr.room_name, TO_CHAR(a.appointment_date, 'Mon'), EXTRACT(MONTH FROM a.appointment_date)
      ORDER BY cr.room_name, mes_num
    `;

    // Query para estado de citas por consultorio
    const estadoCitasQuery = `
      SELECT
        cr.room_name as nombre,
        ast.status_name as estado,
        ast.status_code as codigo,
        COUNT(a.appointment_id) as cantidad
      FROM consultation_rooms cr
      LEFT JOIN appointments a ON cr.room_name = a.room
        AND a.appointment_date >= $1
        AND a.appointment_date <= $2
        AND a.status = 'active'
        ${branchId ? 'AND a.branch_id = $3' : ''}
      LEFT JOIN appointment_statuses ast ON a.appointment_status_id = ast.appointment_status_id
      WHERE cr.status = 'active'
        ${branchId ? 'AND cr.branch_id = $3' : ''}
        AND ast.status_code IS NOT NULL
      GROUP BY cr.room_name, ast.status_name, ast.status_code
      ORDER BY cr.room_name, cantidad DESC
    `;

    const params = branchId
      ? [fechaInicio, fechaFin, branchId]
      : [fechaInicio, fechaFin];

    // Ejecutar todas las queries en paralelo
    const [result, citasPorMesResult, estadoCitasResult] = await Promise.all([
      pool.query(query, params),
      pool.query(citasPorMesQuery, params),
      pool.query(estadoCitasQuery, params)
    ]);

    // Crear mapas para citas por mes y estado por consultorio
    const citasPorMesMap = {};
    citasPorMesResult.rows.forEach(row => {
      if (!citasPorMesMap[row.nombre]) {
        citasPorMesMap[row.nombre] = [];
      }
      if (row.mes && row.cantidad > 0) {
        citasPorMesMap[row.nombre].push({
          mes: row.mes,
          cantidad: parseInt(row.cantidad) || 0
        });
      }
    });

    const estadoCitasMap = {};
    estadoCitasResult.rows.forEach(row => {
      if (!estadoCitasMap[row.nombre]) {
        estadoCitasMap[row.nombre] = [];
      }
      if (row.estado && row.cantidad > 0) {
        estadoCitasMap[row.nombre].push({
          estado: row.estado,
          codigo: row.codigo,
          cantidad: parseInt(row.cantidad) || 0
        });
      }
    });

    return result.rows.map(row => ({
      consultorioId: row.consultorioId.toString(),
      nombre: row.nombre,
      totalCitas: parseInt(row.totalCitas) || 0,
      citasCompletadas: parseInt(row.citasCompletadas) || 0,
      citasCanceladas: parseInt(row.citasCanceladas) || 0,
      citasPendientes: parseInt(row.citasPendientes) || 0,
      ocupacionPorcentaje: parseFloat(row.ocupacionPorcentaje) || 0,
      citasPorMes: citasPorMesMap[row.nombre] || [],
      estadoCitas: estadoCitasMap[row.nombre] || []
    }));
  } catch (error) {
    console.error('Error en getEstadisticasConsultorios:', error);
    throw error;
  }
};

/**
 * Resumen general de consultorios
 * @param {number|null} branchId - ID de la sede (null para todas las sedes)
 * @returns {Promise<Object>} Objeto con resumen general
 */
const getResumenConsultorios = async (branchId) => {
  try {
    const query = `
      WITH consultorio_stats AS (
        SELECT
          cr.consultation_room_id,
          cr.room_name,
          COUNT(a.appointment_id) as total_citas,
          COUNT(CASE WHEN ast.status_code = 'COMPLETED' THEN 1 END) as completadas,
          COUNT(CASE WHEN ast.status_code = 'CANCELLED' THEN 1 END) as canceladas,
          CASE
            WHEN COUNT(a.appointment_id) > 0
            THEN (COUNT(CASE WHEN ast.status_code = 'COMPLETED' THEN 1 END)::numeric / COUNT(a.appointment_id)::numeric) * 100
            ELSE 0
          END as ocupacion
        FROM consultation_rooms cr
        LEFT JOIN appointments a ON cr.room_name = a.room AND a.status = 'active'
          ${branchId ? 'AND a.branch_id = $1' : ''}
        LEFT JOIN appointment_statuses ast ON a.appointment_status_id = ast.appointment_status_id
        WHERE cr.status = 'active'
          ${branchId ? 'AND cr.branch_id = $1' : ''}
        GROUP BY cr.consultation_room_id, cr.room_name
      )
      SELECT
        COUNT(DISTINCT consultation_room_id) as "totalConsultorios",
        COALESCE(SUM(total_citas), 0) as "totalCitas",
        COALESCE(SUM(completadas), 0) as "totalCompletadas",
        COALESCE(SUM(canceladas), 0) as "totalCanceladas",
        COALESCE(ROUND(AVG(ocupacion), 2), 0) as "ocupacionPromedio",
        (
          SELECT room_name
          FROM consultorio_stats
          ORDER BY ocupacion DESC
          LIMIT 1
        ) as "consultorioMasOcupado"
      FROM consultorio_stats
    `;

    const params = branchId ? [branchId] : [];
    const result = await pool.query(query, params);

    const row = result.rows[0];
    return {
      totalConsultorios: parseInt(row?.totalConsultorios) || 0,
      totalCitas: parseInt(row?.totalCitas) || 0,
      totalCompletadas: parseInt(row?.totalCompletadas) || 0,
      totalCanceladas: parseInt(row?.totalCanceladas) || 0,
      ocupacionPromedio: parseFloat(row?.ocupacionPromedio) || 0,
      consultorioMasOcupado: row?.consultorioMasOcupado || 'N/A'
    };
  } catch (error) {
    console.error('Error en getResumenConsultorios:', error);
    throw error;
  }
};

/**
 * Reporte Overview - Estadísticas generales
 * @param {number|null} branchId - ID de la sede (null para todas las sedes)
 * @param {Date} fechaInicio - Fecha de inicio del reporte
 * @param {Date} fechaFin - Fecha de fin del reporte
 * @returns {Promise<Object>} Objeto con estadísticas generales
 */
const getOverviewReport = async (branchId, fechaInicio, fechaFin) => {
  try {
    // Query para estadísticas de citas
    const appointmentsQuery = `
      SELECT
        COUNT(a.appointment_id) as total,
        COUNT(CASE WHEN ast.status_code = 'COMPLETED' THEN 1 END) as completed,
        COUNT(CASE WHEN ast.status_code = 'CANCELLED' THEN 1 END) as cancelled,
        COUNT(CASE WHEN ast.status_code IN ('SCHEDULED', 'CONFIRMED', 'PENDING_APPROVAL') THEN 1 END) as pending
      FROM appointments a
      LEFT JOIN appointment_statuses ast ON a.appointment_status_id = ast.appointment_status_id
      WHERE a.appointment_date >= $1
        AND a.appointment_date <= $2
        AND a.status = 'active'
        ${branchId ? 'AND a.branch_id = $3' : ''}
    `;

    // Query para citas por mes
    const monthlyQuery = `
      SELECT
        TO_CHAR(a.appointment_date, 'Mon') as month,
        EXTRACT(MONTH FROM a.appointment_date) as month_num,
        COUNT(a.appointment_id) as count
      FROM appointments a
      WHERE a.appointment_date >= $1
        AND a.appointment_date <= $2
        AND a.status = 'active'
        ${branchId ? 'AND a.branch_id = $3' : ''}
      GROUP BY TO_CHAR(a.appointment_date, 'Mon'), EXTRACT(MONTH FROM a.appointment_date)
      ORDER BY month_num
    `;

    // Query para pacientes
    const patientsQuery = `
      SELECT
        COUNT(DISTINCT p.patient_id) as total,
        COUNT(DISTINCT CASE WHEN p.date_time_registration >= $1 THEN p.patient_id END) as new
      FROM patients p
      WHERE p.status = 'active'
        ${branchId ? 'AND p.branch_id = $2' : ''}
    `;

    // Query para distribución por edad
    const ageGroupsQuery = `
      SELECT
        CASE
          WHEN EXTRACT(YEAR FROM AGE(CURRENT_DATE, p.birth_date)) <= 18 THEN '0-18'
          WHEN EXTRACT(YEAR FROM AGE(CURRENT_DATE, p.birth_date)) <= 35 THEN '19-35'
          WHEN EXTRACT(YEAR FROM AGE(CURRENT_DATE, p.birth_date)) <= 50 THEN '36-50'
          WHEN EXTRACT(YEAR FROM AGE(CURRENT_DATE, p.birth_date)) <= 65 THEN '51-65'
          ELSE '65+'
        END as range,
        COUNT(DISTINCT p.patient_id) as count
      FROM patients p
      WHERE p.status = 'active'
        AND p.birth_date IS NOT NULL
        ${branchId ? 'AND p.branch_id = $1' : ''}
      GROUP BY range
      ORDER BY range
    `;

    // Query para ingresos
    const revenueQuery = `
      SELECT
        COALESCE(SUM(CASE WHEN pi.payment_status = 'paid' THEN pi.amount_paid ELSE 0 END), 0) as total
      FROM procedure_income pi
      INNER JOIN appointments a ON pi.appointment_id = a.appointment_id
      WHERE a.appointment_date >= $1
        AND a.appointment_date <= $2
        AND pi.status = 'active'
        ${branchId ? 'AND a.branch_id = $3' : ''}
    `;

    // Query para ingresos por servicio
    const revenueByServiceQuery = `
      SELECT
        COALESCE(pi.item_name, 'Otros') as name,
        COALESCE(SUM(CASE WHEN pi.payment_status = 'paid' THEN pi.amount_paid ELSE 0 END), 0) as amount
      FROM procedure_income pi
      INNER JOIN appointments a ON pi.appointment_id = a.appointment_id
      WHERE a.appointment_date >= $1
        AND a.appointment_date <= $2
        AND pi.status = 'active'
        ${branchId ? 'AND a.branch_id = $3' : ''}
      GROUP BY pi.item_name
      ORDER BY amount DESC
      LIMIT 5
    `;

    // Parámetros para queries con rango de fechas y branchId
    const params = branchId ? [fechaInicio, fechaFin, branchId] : [fechaInicio, fechaFin];
    // Parámetros para query de pacientes (solo fechaInicio y branchId)
    const paramsPatients = branchId ? [fechaInicio, branchId] : [fechaInicio];
    // Parámetros para query de grupos de edad (solo branchId)
    const paramsSingle = branchId ? [branchId] : [];

    const [appointmentsResult, monthlyResult, patientsResult, ageResult, revenueResult, revenueByServiceResult] = await Promise.all([
      pool.query(appointmentsQuery, params),
      pool.query(monthlyQuery, params),
      pool.query(patientsQuery, paramsPatients),
      pool.query(ageGroupsQuery, paramsSingle),
      pool.query(revenueQuery, params),
      pool.query(revenueByServiceQuery, params)
    ]);

    const appointments = appointmentsResult.rows[0];
    const patients = patientsResult.rows[0];
    const revenue = revenueResult.rows[0];

    return {
      appointments: {
        total: parseInt(appointments?.total) || 0,
        completed: parseInt(appointments?.completed) || 0,
        cancelled: parseInt(appointments?.cancelled) || 0,
        pending: parseInt(appointments?.pending) || 0,
        monthlyData: monthlyResult.rows.map(row => ({
          month: row.month,
          count: parseInt(row.count) || 0
        }))
      },
      patients: {
        total: parseInt(patients?.total) || 0,
        new: parseInt(patients?.new) || 0,
        continuing: (parseInt(patients?.total) || 0) - (parseInt(patients?.new) || 0),
        ageGroups: ageResult.rows.map(row => ({
          range: row.range,
          count: parseInt(row.count) || 0
        }))
      },
      revenue: {
        total: parseFloat(revenue?.total) || 0,
        monthly: parseFloat(revenue?.total) || 0,
        services: revenueByServiceResult.rows.map(row => ({
          name: row.name,
          amount: parseFloat(row.amount) || 0
        }))
      }
    };
  } catch (error) {
    console.error('Error en getOverviewReport:', error);
    throw error;
  }
};

/**
 * Reporte de Servicios
 * @param {number|null} branchId - ID de la sede (null para todas las sedes)
 * @param {Date} fechaInicio - Fecha de inicio del reporte
 * @param {Date} fechaFin - Fecha de fin del reporte
 * @returns {Promise<Object>} Objeto con estadísticas de servicios
 */
const getServicesReport = async (branchId, fechaInicio, fechaFin) => {
  try {
    // Query para servicios de clínica (procedimientos dentales)
    const clinicQuery = `
      SELECT
        COALESCE(pi.item_name, 'Procedimiento') as name,
        COUNT(pi.income_id) as count
      FROM procedure_income pi
      INNER JOIN appointments a ON pi.appointment_id = a.appointment_id
      WHERE a.appointment_date >= $1
        AND a.appointment_date <= $2
        AND pi.status = 'active'
        ${branchId ? 'AND a.branch_id = $3' : ''}
      GROUP BY pi.item_name
      ORDER BY count DESC
      LIMIT 10
    `;

    // Query para servicios de laboratorio (radiografías)
    const labQuery = `
      SELECT
        COALESCE(rr.radiography_type, 'Radiografía') as name,
        COUNT(rr.radiography_request_id) as count
      FROM radiography_requests rr
      WHERE rr.request_date >= $1
        AND rr.request_date <= $2
        AND rr.status = 'active'
        ${branchId ? 'AND rr.branch_id = $3' : ''}
      GROUP BY rr.radiography_type
      ORDER BY count DESC
      LIMIT 10
    `;

    const params = branchId ? [fechaInicio, fechaFin, branchId] : [fechaInicio, fechaFin];

    const [clinicResult, labResult] = await Promise.all([
      pool.query(clinicQuery, params),
      pool.query(labQuery, params)
    ]);

    return {
      clinic: clinicResult.rows.map(row => ({
        name: row.name,
        count: parseInt(row.count) || 0
      })),
      laboratory: labResult.rows.map(row => ({
        name: row.name,
        count: parseInt(row.count) || 0
      }))
    };
  } catch (error) {
    console.error('Error en getServicesReport:', error);
    throw error;
  }
};

/**
 * Reporte de Pacientes
 * @param {number|null} branchId - ID de la sede (null para todas las sedes)
 * @param {Date} fechaInicio - Fecha de inicio del reporte
 * @param {Date} fechaFin - Fecha de fin del reporte
 * @returns {Promise<Object>} Objeto con estadísticas de pacientes
 */
const getPatientsReport = async (branchId, fechaInicio, fechaFin) => {
  try {
    // Query para totales de pacientes (usa $1 para fechaInicio, $2 para branchId)
    const totalsQuery = `
      SELECT
        COUNT(DISTINCT p.patient_id) as total,
        COUNT(DISTINCT CASE WHEN p.date_time_registration >= $1 THEN p.patient_id END) as new
      FROM patients p
      WHERE p.status = 'active'
        ${branchId ? 'AND p.branch_id = $2' : ''}
    `;

    // Query para distribución por edad (usa $1 para branchId)
    const ageGroupsQuery = `
      SELECT
        CASE
          WHEN EXTRACT(YEAR FROM AGE(CURRENT_DATE, p.birth_date)) <= 18 THEN '0-18'
          WHEN EXTRACT(YEAR FROM AGE(CURRENT_DATE, p.birth_date)) <= 35 THEN '19-35'
          WHEN EXTRACT(YEAR FROM AGE(CURRENT_DATE, p.birth_date)) <= 50 THEN '36-50'
          WHEN EXTRACT(YEAR FROM AGE(CURRENT_DATE, p.birth_date)) <= 65 THEN '51-65'
          ELSE '65+'
        END as range,
        COUNT(DISTINCT p.patient_id) as count
      FROM patients p
      WHERE p.status = 'active'
        AND p.birth_date IS NOT NULL
        ${branchId ? 'AND p.branch_id = $1' : ''}
      GROUP BY range
      ORDER BY range
    `;

    // Parámetros para query de totales (fechaInicio y branchId)
    const paramsTotals = branchId ? [fechaInicio, branchId] : [fechaInicio];
    // Parámetros para query de grupos de edad (solo branchId)
    const paramsSingle = branchId ? [branchId] : [];

    const [totalsResult, ageResult] = await Promise.all([
      pool.query(totalsQuery, paramsTotals),
      pool.query(ageGroupsQuery, paramsSingle)
    ]);

    const totals = totalsResult.rows[0];
    const total = parseInt(totals?.total) || 0;
    const newPatients = parseInt(totals?.new) || 0;

    return {
      total,
      new: newPatients,
      continuing: total - newPatients,
      ageGroups: ageResult.rows.map(row => ({
        range: row.range,
        count: parseInt(row.count) || 0
      }))
    };
  } catch (error) {
    console.error('Error en getPatientsReport:', error);
    throw error;
  }
};

module.exports = {
  getReportePorConsultorio,
  getReportePorEspecialidad,
  getReportePorDoctor,
  getEstadisticasConsultorios,
  getResumenConsultorios,
  getOverviewReport,
  getServicesReport,
  getPatientsReport
};
