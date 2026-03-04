const pool = require('../config/db');

/**
 * Genera slots de tiempo cada X minutos dentro de un rango horario
 */
function generateTimeSlots(startTime, endTime, interval = 30) {
  const slots = [];
  const [startHour, startMin] = startTime.split(':').map(Number);
  const [endHour, endMin] = endTime.split(':').map(Number);

  let currentMinutes = startHour * 60 + startMin;
  const endMinutes = endHour * 60 + endMin;

  while (currentMinutes < endMinutes) {
    const hour = Math.floor(currentMinutes / 60);
    const min = currentMinutes % 60;
    const timeStr = `${String(hour).padStart(2, '0')}:${String(min).padStart(2, '0')}`;
    slots.push(timeStr);
    currentMinutes += interval;
  }

  return slots;
}

/**
 * Obtiene slots disponibles por especialidad, fecha y sede
 * GET /api/public/availability/slots
 */
const getAvailableSlots = async (req, res) => {
  try {
    const { date, branchId, specialtyId, duration = 30 } = req.query;

    if (!date || !branchId || !specialtyId) {
      return res.status(400).json({
        success: false,
        error: 'Faltan parámetros requeridos: date, branchId, specialtyId'
      });
    }

    const branchIdNum = parseInt(branchId, 10);
    const specialtyIdNum = parseInt(specialtyId, 10);
    const durationNum = parseInt(duration, 10);

    if (isNaN(branchIdNum) || isNaN(specialtyIdNum)) {
      return res.status(400).json({
        success: false,
        error: 'branchId y specialtyId deben ser números válidos'
      });
    }

    // Obtener día de la semana (0 = Domingo, 1 = Lunes, etc.)
    // IMPORTANTE: Parsear la fecha manualmente para evitar problemas de timezone
    const [year, month, day] = date.split('-').map(Number);
    const selectedDate = new Date(year, month - 1, day);
    const dayOfWeek = selectedDate.getDay();

    // Query para obtener doctores con sus horarios y especialidades
    const query = `
      SELECT DISTINCT
        d.dentist_id,
        u.user_id,
        u.first_name,
        u.last_name,
        ds.schedule_id,
        ds.day_of_week,
        ds.start_time,
        ds.end_time,
        ds.slot_duration,
        s.specialty_id,
        s.specialty_name
      FROM dentists d
      INNER JOIN users u ON d.user_id = u.user_id
      INNER JOIN dentist_schedules ds ON d.dentist_id = ds.dentist_id
      INNER JOIN dentist_specialties dsp ON d.dentist_id = dsp.dentist_id
      INNER JOIN specialties s ON dsp.specialty_id = s.specialty_id
      WHERE ds.branch_id = $1
        AND ds.day_of_week = $2
        AND dsp.specialty_id = $3
        AND ds.is_available = true
        AND ds.status = 'active'
        AND d.status = 'active'
        AND u.status = 'active'
        AND s.status = 'active'
      ORDER BY u.first_name, u.last_name, ds.start_time;
    `;

    const result = await pool.query(query, [branchIdNum, dayOfWeek, specialtyIdNum]);

    if (result.rows.length === 0) {
      return res.json({
        success: true,
        data: []
      });
    }

    // Obtener citas ya agendadas para esta fecha
    // IMPORTANTE: NO filtramos por specialty_id ni branch_id porque:
    // - El odontologo es una persona fisica que no puede estar en dos lugares
    // - Si tiene cita de Ortodoncia a las 10:00, NO puede tener cita de Endodoncia a las 10:00
    // - Si tiene cita en Sede A a las 10:00, NO puede tener cita en Sede B a las 10:00
    // Estados que bloquean el horario:
    // 0: Pendiente de Aprobación, 1: Programada, 2: Confirmada, 3: En Proceso, 7: Reprogramada
    const appointmentsQuery = `
      SELECT
        a.dentist_id,
        a.appointment_date,
        a.start_time,
        a.end_time,
        a.duration
      FROM appointments a
      WHERE DATE(a.appointment_date) = DATE($1)
        AND a.status = 'active'
        AND a.appointment_status_id IN (0, 1, 2, 3, 7)
    `;

    const appointmentsResult = await pool.query(appointmentsQuery, [date]);
    const existingAppointments = appointmentsResult.rows;

    // Agrupar horarios por slot de tiempo
    const slotsMap = new Map();

    for (const schedule of result.rows) {
      // Generar todos los slots posibles para este doctor
      const slots = generateTimeSlots(
        schedule.start_time,
        schedule.end_time,
        schedule.slot_duration || durationNum
      );

      for (const timeSlot of slots) {
        // Calcular hora de fin del slot propuesto
        const [slotHour, slotMin] = timeSlot.split(':').map(Number);
        const slotDuration = schedule.slot_duration || durationNum;
        const slotStartMinutes = slotHour * 60 + slotMin;
        const slotEndMinutes = slotStartMinutes + slotDuration;
        const slotEndHour = Math.floor(slotEndMinutes / 60);
        const slotEndMin = slotEndMinutes % 60;
        const slotEndTime = `${String(slotEndHour).padStart(2, '0')}:${String(slotEndMin).padStart(2, '0')}`;

        // Verificar si este doctor tiene cita que se solape con este horario
        // Un odontologo NO puede tener dos citas simultaneas (sin importar especialidad)
        const hasAppointment = existingAppointments.some(apt => {
          if (apt.dentist_id !== schedule.dentist_id) return false;

          // Extraer horas de la cita existente
          const aptStartTime = apt.start_time.substring(0, 5); // "HH:MM"
          const aptEndTime = apt.end_time ? apt.end_time.substring(0, 5) : null;

          // Si no hay end_time, calcular basado en duration
          let aptEnd = aptEndTime;
          if (!aptEnd && apt.duration) {
            const [aptH, aptM] = aptStartTime.split(':').map(Number);
            const aptEndMinutes = aptH * 60 + aptM + apt.duration;
            aptEnd = `${String(Math.floor(aptEndMinutes / 60)).padStart(2, '0')}:${String(aptEndMinutes % 60).padStart(2, '0')}`;
          }

          if (!aptEnd) {
            // Si no podemos determinar fin, comparar solo inicio
            return aptStartTime === timeSlot;
          }

          // Verificar solapamiento de horarios
          // Slot: timeSlot -> slotEndTime
          // Cita: aptStartTime -> aptEnd
          const slotOverlaps = (
            (timeSlot >= aptStartTime && timeSlot < aptEnd) ||
            (slotEndTime > aptStartTime && slotEndTime <= aptEnd) ||
            (timeSlot <= aptStartTime && slotEndTime >= aptEnd)
          );

          return slotOverlaps;
        });

        if (!hasAppointment) {
          // Este slot está disponible
          if (!slotsMap.has(timeSlot)) {
            slotsMap.set(timeSlot, {
              time: timeSlot,
              doctors: []
            });
          }

          const slotData = slotsMap.get(timeSlot);

          // Verificar que no esté duplicado
          const doctorExists = slotData.doctors.some(
            d => d.id === schedule.dentist_id.toString()
          );

          if (!doctorExists) {
            slotData.doctors.push({
              id: schedule.dentist_id.toString(),
              name: `${schedule.first_name} ${schedule.last_name}`,
              specialties: [schedule.specialty_name]
            });
          }
        }
      }
    }

    // Convertir Map a Array y ordenar por hora
    const availableSlots = Array.from(slotsMap.values())
      .filter(slot => slot.doctors.length > 0)
      .sort((a, b) => a.time.localeCompare(b.time));

    res.json({
      success: true,
      data: availableSlots
    });

  } catch (error) {
    console.error('Error obteniendo slots disponibles:', error);
    res.status(500).json({
      success: false,
      error: 'Error al obtener slots disponibles'
    });
  }
};

/**
 * Obtiene el horario de un doctor para una fecha específica
 * GET /api/public/availability/doctor/:doctorId/schedule
 */
const getDoctorSchedule = async (req, res) => {
  try {
    const { doctorId } = req.params;
    const { date, branchId } = req.query;

    if (!date) {
      return res.status(400).json({
        success: false,
        error: 'Falta parámetro requerido: date'
      });
    }

    // IMPORTANTE: Parsear la fecha manualmente para evitar problemas de timezone
    const [year, month, day] = date.split('-').map(Number);
    const selectedDate = new Date(year, month - 1, day);
    const dayOfWeek = selectedDate.getDay();

    // Construir query dinámicamente según si se proporciona branchId
    let query;
    let queryParams;

    if (branchId) {
      // Si se proporciona branchId, filtrar por sede específica
      query = `
        SELECT
          ds.schedule_id,
          ds.dentist_id,
          ds.branch_id,
          ds.day_of_week,
          ds.start_time,
          ds.end_time,
          ds.slot_duration,
          ds.is_available,
          b.branch_name
        FROM dentist_schedules ds
        INNER JOIN branches b ON ds.branch_id = b.branch_id
        WHERE ds.dentist_id = $1
          AND ds.day_of_week = $2
          AND ds.branch_id = $3
          AND ds.is_available = true
          AND ds.status = 'active'
        ORDER BY ds.start_time;
      `;
      queryParams = [doctorId, dayOfWeek, parseInt(branchId)];
    } else {
      // Si no se proporciona branchId, devolver todos los horarios del día
      query = `
        SELECT
          ds.schedule_id,
          ds.dentist_id,
          ds.branch_id,
          ds.day_of_week,
          ds.start_time,
          ds.end_time,
          ds.slot_duration,
          ds.is_available,
          b.branch_name
        FROM dentist_schedules ds
        INNER JOIN branches b ON ds.branch_id = b.branch_id
        WHERE ds.dentist_id = $1
          AND ds.day_of_week = $2
          AND ds.is_available = true
          AND ds.status = 'active'
        ORDER BY ds.start_time;
      `;
      queryParams = [doctorId, dayOfWeek];
    }

    const result = await pool.query(query, queryParams);

    res.json({
      success: true,
      data: result.rows
    });

  } catch (error) {
    console.error('Error obteniendo horario del doctor:', error);
    res.status(500).json({
      success: false,
      error: 'Error al obtener horario del doctor'
    });
  }
};

/**
 * Obtiene las citas de un doctor para una fecha específica
 * GET /api/public/availability/doctor/:doctorId/appointments
 */
const getDoctorAppointments = async (req, res) => {
  try {
    const { doctorId } = req.params;
    const { date } = req.query;

    if (!date) {
      return res.status(400).json({
        success: false,
        error: 'Falta parámetro requerido: date'
      });
    }

    const query = `
      SELECT
        a.appointment_id,
        a.appointment_date,
        a.start_time,
        a.duration,
        a.status,
        p.first_name as patient_first_name,
        p.last_name as patient_last_name
      FROM appointments a
      INNER JOIN patients p ON a.patient_id = p.patient_id
      WHERE a.dentist_id = $1
        AND DATE(a.appointment_date) = DATE($2)
        AND a.status NOT IN ('cancelled', 'no_show')
      ORDER BY a.start_time;
    `;

    const result = await pool.query(query, [doctorId, date]);

    res.json({
      success: true,
      data: result.rows
    });

  } catch (error) {
    console.error('Error obteniendo citas del doctor:', error);
    res.status(500).json({
      success: false,
      error: 'Error al obtener citas del doctor'
    });
  }
};

module.exports = {
  getAvailableSlots,
  getDoctorSchedule,
  getDoctorAppointments
};
