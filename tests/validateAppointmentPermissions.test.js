/**
 * Tests para middlewares de validación de permisos de citas
 * Prueba las 4 funciones de validación principales
 */

// Mock del pool de base de datos (debe estar antes de los imports)
jest.mock('../config/db');

const {
  validateAppointmentPermission,
  validate24HourCancellation,
  validateWorkingHours,
  rateLimitReschedule
} = require('../middlewares/validateAppointmentPermissions');
const pool = require('../config/db');

describe('Middleware: validateAppointmentPermission', () => {
  let req, res, next;

  beforeEach(() => {
    req = {
      user: { userId: 1, role_id: 2 },
      params: { id: 10 },
      appointment: null,
      userRole: null
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };
    next = jest.fn();
    jest.clearAllMocks();
  });

  describe('Super Admin Access', () => {
    test('Debe permitir acceso total a super_admin sin validaciones adicionales', async () => {
      pool.query.mockResolvedValueOnce({
        rows: [{ role_name: 'super_admin' }]
      });

      const middleware = validateAppointmentPermission(['admin']);
      await middleware(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(req.userRole).toBe('super_admin');
      expect(pool.query).toHaveBeenCalledTimes(1);
    });
  });

  describe('Role Validation', () => {
    test('Debe rechazar usuario sin autenticación', async () => {
      req.user = null;

      const middleware = validateAppointmentPermission(['admin']);
      await middleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'Usuario no autenticado'
      });
      expect(next).not.toHaveBeenCalled();
    });

    test('Debe rechazar rol no válido', async () => {
      pool.query.mockResolvedValueOnce({
        rows: []
      });

      const middleware = validateAppointmentPermission(['admin']);
      await middleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'Rol de usuario no válido'
      });
      expect(next).not.toHaveBeenCalled();
    });

    test('Debe rechazar rol no permitido', async () => {
      pool.query.mockResolvedValueOnce({
        rows: [{ role_name: 'patient' }]
      });

      const middleware = validateAppointmentPermission(['admin', 'receptionist']);
      await middleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'Operación no permitida para rol: patient'
      });
      expect(next).not.toHaveBeenCalled();
    });

    test('Debe permitir rol autorizado', async () => {
      // Sin appointment ID para probar solo validación de rol
      req.params.id = undefined;

      pool.query.mockResolvedValueOnce({
        rows: [{ role_name: 'admin' }]
      });

      const middleware = validateAppointmentPermission(['admin', 'receptionist']);
      await middleware(req, res, next);

      expect(req.userRole).toBe('admin');
      expect(next).toHaveBeenCalled();
    });
  });

  describe('Admin/Receptionist Branch Validation', () => {
    test('Debe validar que admin pertenezca a la misma sede que la cita', async () => {
      pool.query
        .mockResolvedValueOnce({ rows: [{ role_name: 'admin' }] })
        .mockResolvedValueOnce({
          rows: [{
            branch_id: 5,
            patient_id: 20,
            dentist_id: 30,
            appointment_status_id: 1
          }]
        })
        .mockResolvedValueOnce({ rows: [{ branch_id: 5 }] });

      const middleware = validateAppointmentPermission(['admin']);
      await middleware(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(req.appointment).toBeDefined();
      expect(req.appointment.branch_id).toBe(5);
    });

    test('Debe rechazar admin de diferente sede', async () => {
      pool.query
        .mockResolvedValueOnce({ rows: [{ role_name: 'admin' }] })
        .mockResolvedValueOnce({
          rows: [{
            branch_id: 5,
            patient_id: 20,
            dentist_id: 30,
            appointment_status_id: 1
          }]
        })
        .mockResolvedValueOnce({ rows: [{ branch_id: 3 }] });

      const middleware = validateAppointmentPermission(['admin']);
      await middleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'No tienes permiso para esta cita (diferente sede)'
      });
      expect(next).not.toHaveBeenCalled();
    });
  });

  describe('Doctor Validation', () => {
    test('Debe validar que doctor sea el asignado a la cita', async () => {
      pool.query
        .mockResolvedValueOnce({ rows: [{ role_name: 'doctor' }] })
        .mockResolvedValueOnce({
          rows: [{
            branch_id: 5,
            patient_id: 20,
            dentist_id: 30,
            appointment_status_id: 1
          }]
        })
        .mockResolvedValueOnce({ rows: [{ dentist_id: 30 }] });

      const middleware = validateAppointmentPermission(['doctor']);
      await middleware(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(req.appointment.dentist_id).toBe(30);
    });

    test('Debe rechazar doctor no asignado a la cita', async () => {
      pool.query
        .mockResolvedValueOnce({ rows: [{ role_name: 'doctor' }] })
        .mockResolvedValueOnce({
          rows: [{
            branch_id: 5,
            patient_id: 20,
            dentist_id: 30,
            appointment_status_id: 1
          }]
        })
        .mockResolvedValueOnce({ rows: [{ dentist_id: 99 }] });

      const middleware = validateAppointmentPermission(['doctor']);
      await middleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'No tienes permiso para esta cita (no eres el doctor asignado)'
      });
      expect(next).not.toHaveBeenCalled();
    });
  });

  describe('Patient Validation', () => {
    test('Debe validar que paciente sea el de la cita', async () => {
      pool.query
        .mockResolvedValueOnce({ rows: [{ role_name: 'patient' }] })
        .mockResolvedValueOnce({
          rows: [{
            branch_id: 5,
            patient_id: 20,
            dentist_id: 30,
            appointment_status_id: 1
          }]
        })
        .mockResolvedValueOnce({ rows: [{ patient_id: 20 }] });

      const middleware = validateAppointmentPermission(['patient']);
      await middleware(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(req.appointment.patient_id).toBe(20);
    });

    test('Debe rechazar paciente que no es el de la cita', async () => {
      pool.query
        .mockResolvedValueOnce({ rows: [{ role_name: 'patient' }] })
        .mockResolvedValueOnce({
          rows: [{
            branch_id: 5,
            patient_id: 20,
            dentist_id: 30,
            appointment_status_id: 1
          }]
        })
        .mockResolvedValueOnce({ rows: [{ patient_id: 99 }] });

      const middleware = validateAppointmentPermission(['patient']);
      await middleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'No tienes permiso para esta cita (no eres el paciente)'
      });
      expect(next).not.toHaveBeenCalled();
    });
  });

  describe('Appointment Not Found', () => {
    test('Debe retornar 404 si la cita no existe', async () => {
      pool.query
        .mockResolvedValueOnce({ rows: [{ role_name: 'admin' }] })
        .mockResolvedValueOnce({ rows: [] });

      const middleware = validateAppointmentPermission(['admin']);
      await middleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'Cita no encontrada'
      });
      expect(next).not.toHaveBeenCalled();
    });
  });
});

describe('Middleware: validate24HourCancellation', () => {
  let req, res, next;

  beforeEach(() => {
    req = {
      userRole: 'admin',
      appointment: null
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };
    next = jest.fn();
    jest.clearAllMocks();
  });

  test('Debe permitir super_admin cancelar sin restricción de tiempo', async () => {
    const appointmentDate = new Date();
    appointmentDate.setHours(appointmentDate.getHours() + 1); // Cita en 1 hora

    req.userRole = 'super_admin';
    req.appointment = {
      appointment_date: appointmentDate.toISOString().split('T')[0],
      start_time: appointmentDate.toTimeString().split(' ')[0]
    };

    await validate24HourCancellation(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });

  test('Debe rechazar cancelación con menos de 24 horas', async () => {
    const appointmentDate = new Date();
    appointmentDate.setHours(appointmentDate.getHours() + 12); // Cita en 12 horas

    req.appointment = {
      appointment_date: appointmentDate.toISOString().split('T')[0],
      start_time: appointmentDate.toTimeString().split(' ')[0]
    };

    await validate24HourCancellation(req, res, next);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        error: 'No se puede cancelar con menos de 24 horas de anticipación'
      })
    );
    expect(next).not.toHaveBeenCalled();
  });

  test('Debe permitir cancelación con más de 24 horas', async () => {
    // Usar una fecha fija muy en el futuro para asegurar > 24 horas
    req.appointment = {
      appointment_date: '2025-12-31',
      start_time: '10:00:00'
    };

    await validate24HourCancellation(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });

  test('Debe retornar error si no hay información de cita', async () => {
    req.appointment = null;

    await validate24HourCancellation(req, res, next);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      error: 'Información de cita no disponible'
    });
    expect(next).not.toHaveBeenCalled();
  });
});

describe('Middleware: validateWorkingHours', () => {
  let req, res, next;

  beforeEach(() => {
    req = { body: {} };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };
    next = jest.fn();
    jest.clearAllMocks();
  });

  test('Debe permitir horario válido dentro del horario laboral', async () => {
    // Usar miércoles 29 de enero de 2025 para evitar problemas de zona horaria
    req.body = {
      appointment_date: '2025-01-29', // Miércoles
      start_time: '10:00',
      end_time: '11:00'
    };

    await validateWorkingHours(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });

  test('Debe rechazar horario antes de 8:00 AM', async () => {
    req.body = {
      appointment_date: '2025-01-27',
      start_time: '07:30',
      end_time: '08:30'
    };

    await validateWorkingHours(req, res, next);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        error: 'Horario fuera del horario laboral (8:00 AM - 6:00 PM)'
      })
    );
    expect(next).not.toHaveBeenCalled();
  });

  test('Debe rechazar horario después de 6:00 PM', async () => {
    req.body = {
      appointment_date: '2025-01-27',
      start_time: '17:00',
      end_time: '18:30'
    };

    await validateWorkingHours(req, res, next);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        error: 'Horario fuera del horario laboral (8:00 AM - 6:00 PM)'
      })
    );
    expect(next).not.toHaveBeenCalled();
  });

  test('Debe rechazar horario durante almuerzo (12:00 PM - 1:00 PM)', async () => {
    req.body = {
      appointment_date: '2025-01-27',
      start_time: '11:30',
      end_time: '12:30'
    };

    await validateWorkingHours(req, res, next);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        error: 'El horario no puede estar durante el almuerzo (12:00 PM - 1:00 PM)'
      })
    );
    expect(next).not.toHaveBeenCalled();
  });

  test('Debe permitir citas los domingos si el médico tiene horario configurado', async () => {
    // La disponibilidad de domingos se determina por la configuración del médico, no por restricciones del sistema
    // Crear fecha garantizada de domingo
    const baseDate = new Date(2025, 1, 1); // 1 de febrero 2025
    const daysUntilSunday = (7 - baseDate.getDay()) % 7;
    const nextSunday = new Date(baseDate);
    nextSunday.setDate(baseDate.getDate() + (daysUntilSunday === 0 ? 7 : daysUntilSunday));

    const year = nextSunday.getFullYear();
    const month = String(nextSunday.getMonth() + 1).padStart(2, '0');
    const day = String(nextSunday.getDate()).padStart(2, '0');
    const dateString = `${year}-${month}-${day}`;

    req.body = {
      appointment_date: dateString,
      start_time: '10:00',
      end_time: '11:00'
    };

    await validateWorkingHours(req, res, next);

    // Ahora las citas en domingo deben pasar la validación de horarios laborales
    // La disponibilidad real se valida contra los horarios configurados del médico
    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });

  test('Debe permitir horarios válidos en reschedule (new_date, new_start_time, new_end_time)', async () => {
    req.body = {
      new_date: '2025-01-29', // Miércoles
      new_start_time: '14:00',
      new_end_time: '15:00'
    };

    await validateWorkingHours(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });

  test('Debe pasar al siguiente middleware si no hay campos de horario', async () => {
    req.body = {};

    await validateWorkingHours(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });
});

describe('Middleware: rateLimitReschedule', () => {
  let req, res, next;

  beforeEach(() => {
    req = {
      params: { id: 10 },
      user: { userId: 1 }
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };
    next = jest.fn();
    jest.clearAllMocks();
  });

  test('Debe permitir propuesta si no ha alcanzado el límite', async () => {
    pool.query.mockResolvedValueOnce({
      rows: [{ count: '2' }]
    });

    await rateLimitReschedule(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });

  test('Debe rechazar si ha alcanzado el límite de 3 propuestas', async () => {
    pool.query.mockResolvedValueOnce({
      rows: [{ count: '3' }]
    });

    await rateLimitReschedule(req, res, next);

    expect(res.status).toHaveBeenCalledWith(429);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        error: 'Has alcanzado el límite de 3 propuestas de reprogramación en 24 horas',
        details: expect.objectContaining({
          limit: 3,
          current: 3
        })
      })
    );
    expect(next).not.toHaveBeenCalled();
  });

  test('Debe contar solo propuestas de las últimas 24 horas', async () => {
    await rateLimitReschedule(req, res, next);

    expect(pool.query).toHaveBeenCalledWith(
      expect.stringContaining('WHERE appointment_id = $1'),
      expect.arrayContaining([
        10,
        1,
        expect.any(Date)
      ])
    );
  });

  test('Debe manejar correctamente valores de count como string', async () => {
    pool.query.mockResolvedValueOnce({
      rows: [{ count: '0' }]
    });

    await rateLimitReschedule(req, res, next);

    expect(next).toHaveBeenCalled();
  });
});

describe('Error Handling', () => {
  let req, res, next;

  beforeEach(() => {
    req = {
      user: { userId: 1, role_id: 2 },
      params: { id: 10 }
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };
    next = jest.fn();
    jest.clearAllMocks();
  });

  test('validateAppointmentPermission debe manejar errores de base de datos', async () => {
    pool.query.mockRejectedValueOnce(new Error('Database connection failed'));

    const middleware = validateAppointmentPermission(['admin']);
    await middleware(req, res, next);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      error: 'Error al validar permisos'
    });
    expect(next).not.toHaveBeenCalled();
  });

  test('rateLimitReschedule debe manejar errores de base de datos', async () => {
    pool.query.mockRejectedValueOnce(new Error('Query failed'));

    await rateLimitReschedule(req, res, next);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      error: 'Error al validar límite de solicitudes'
    });
    expect(next).not.toHaveBeenCalled();
  });
});
