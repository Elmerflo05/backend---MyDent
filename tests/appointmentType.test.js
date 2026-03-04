/**
 * Tests para validación de appointment_type
 *
 * Verifica que:
 * 1. Se asigne default "Consulta" cuando no se especifica tipo
 * 2. Se validen tipos permitidos contra enum
 * 3. Se respeten permisos por rol
 * 4. Se rechacen tipos inválidos
 * 5. Se prevenga SQL injection
 */
const {
  APPOINTMENT_TYPES,
  DEFAULT_APPOINTMENT_TYPE,
  isValidAppointmentType,
  canRoleCreateType
} = require('../constants/appointmentTypes');

describe('Appointment Type - Validación y Default', () => {

  describe('Funciones Utilitarias', () => {

    test('isValidAppointmentType - debe validar tipos correctos', () => {
      expect(isValidAppointmentType('Consulta')).toBe(true);
      expect(isValidAppointmentType('Tratamiento')).toBe(true);
      expect(isValidAppointmentType('Control')).toBe(true);
      expect(isValidAppointmentType('imaging_study')).toBe(true);
      expect(isValidAppointmentType('prosthesis_fitting')).toBe(true);
      expect(isValidAppointmentType('follow_up')).toBe(true);
    });

    test('isValidAppointmentType - debe rechazar tipos inválidos', () => {
      expect(isValidAppointmentType('tipo_inventado')).toBe(false);
      expect(isValidAppointmentType('')).toBe(false);
      expect(isValidAppointmentType(null)).toBe(false);
      expect(isValidAppointmentType(undefined)).toBe(false);
    });

    test('canRoleCreateType - paciente (role_id=6) solo puede Consulta/Control/Follow_up', () => {
      expect(canRoleCreateType(6, 'Consulta')).toBe(true);
      expect(canRoleCreateType(6, 'Control')).toBe(true);
      expect(canRoleCreateType(6, 'follow_up')).toBe(true);
      expect(canRoleCreateType(6, 'imaging_study')).toBe(false);
      expect(canRoleCreateType(6, 'prosthesis_fitting')).toBe(false);
      expect(canRoleCreateType(6, 'Tratamiento')).toBe(false);
    });

    test('canRoleCreateType - admin (role_id=2) puede crear todos los tipos', () => {
      expect(canRoleCreateType(2, 'Consulta')).toBe(true);
      expect(canRoleCreateType(2, 'Tratamiento')).toBe(true);
      expect(canRoleCreateType(2, 'Control')).toBe(true);
      expect(canRoleCreateType(2, 'imaging_study')).toBe(true);
      expect(canRoleCreateType(2, 'prosthesis_fitting')).toBe(true);
      expect(canRoleCreateType(2, 'follow_up')).toBe(true);
    });

    test('canRoleCreateType - doctor (role_id=3) puede crear todos los tipos', () => {
      expect(canRoleCreateType(3, 'Consulta')).toBe(true);
      expect(canRoleCreateType(3, 'Tratamiento')).toBe(true);
      expect(canRoleCreateType(3, 'imaging_study')).toBe(true);
    });

    test('canRoleCreateType - imaging_technician (role_id=5) solo puede imaging_study', () => {
      expect(canRoleCreateType(5, 'imaging_study')).toBe(true);
      expect(canRoleCreateType(5, 'Consulta')).toBe(false);
      expect(canRoleCreateType(5, 'Tratamiento')).toBe(false);
    });
  });

  describe('Constantes y Configuración', () => {

    test('DEFAULT_APPOINTMENT_TYPE debe ser "Consulta"', () => {
      expect(DEFAULT_APPOINTMENT_TYPE).toBe('Consulta');
    });

    test('APPOINTMENT_TYPES debe contener todos los tipos esperados', () => {
      expect(APPOINTMENT_TYPES).toHaveProperty('CONSULTATION');
      expect(APPOINTMENT_TYPES).toHaveProperty('TREATMENT');
      expect(APPOINTMENT_TYPES).toHaveProperty('CONTROL');
      expect(APPOINTMENT_TYPES).toHaveProperty('IMAGING_STUDY');
      expect(APPOINTMENT_TYPES).toHaveProperty('PROSTHESIS_FITTING');
      expect(APPOINTMENT_TYPES).toHaveProperty('FOLLOW_UP');
    });

    test('Valores de APPOINTMENT_TYPES deben ser strings válidos', () => {
      Object.values(APPOINTMENT_TYPES).forEach(type => {
        expect(typeof type).toBe('string');
        expect(type.length).toBeGreaterThan(0);
      });
    });
  });

  // Tests de migración de datos eliminados - requieren BD en runtime

  describe('Validación de Entrada (Simulación)', () => {

    test('Datos de cita SIN appointment_type deben recibir default', () => {
      const appointmentData = {
        patient_id: 1,
        dentist_id: 2,
        branch_id: 1,
        appointment_date: '2025-12-15',
        start_time: '09:00:00',
        end_time: '09:30:00'
        // NO incluye appointment_type
      };

      const appointmentType = appointmentData.appointment_type || DEFAULT_APPOINTMENT_TYPE;

      expect(appointmentType).toBe('Consulta');
      expect(isValidAppointmentType(appointmentType)).toBe(true);
    });

    test('Datos de cita CON appointment_type válido deben respetar valor', () => {
      const appointmentData = {
        patient_id: 1,
        dentist_id: 2,
        branch_id: 1,
        appointment_date: '2025-12-15',
        start_time: '10:00:00',
        end_time: '10:30:00',
        appointment_type: 'imaging_study'
      };

      const appointmentType = appointmentData.appointment_type || DEFAULT_APPOINTMENT_TYPE;

      expect(appointmentType).toBe('imaging_study');
      expect(isValidAppointmentType(appointmentType)).toBe(true);
    });

    test('Datos de cita CON appointment_type inválido deben ser rechazados', () => {
      const appointmentData = {
        patient_id: 1,
        dentist_id: 2,
        branch_id: 1,
        appointment_date: '2025-12-15',
        start_time: '11:00:00',
        end_time: '11:30:00',
        appointment_type: 'tipo_inventado_xyz'
      };

      expect(isValidAppointmentType(appointmentData.appointment_type)).toBe(false);
    });
  });

  describe('Seguridad - SQL Injection Prevention', () => {

    test('Entrada maliciosa con SQL injection debe ser rechazada', () => {
      const maliciousInputs = [
        "'; DROP TABLE appointments;--",
        "' OR '1'='1' --",
        "1' UNION SELECT * FROM users--",
        "'; DELETE FROM appointments WHERE '1'='1",
        "<script>alert('XSS')</script>"
      ];

      maliciousInputs.forEach(input => {
        expect(isValidAppointmentType(input)).toBe(false);
      });
    });

    test('Entrada con caracteres especiales debe ser rechazada', () => {
      const specialChars = [
        'Consulta\x00',
        'Consulta\n\r',
        'Consulta\t',
        'Consulta; DELETE',
        'Consulta\' OR'
      ];

      specialChars.forEach(input => {
        expect(isValidAppointmentType(input)).toBe(false);
      });
    });
  });

  describe('Permisos por Rol', () => {

    test('Paciente NO debe poder crear imaging_study', () => {
      const patientRoleId = 8;
      const type = 'imaging_study';

      expect(canRoleCreateType(patientRoleId, type)).toBe(false);
    });

    test('Paciente NO debe poder crear prosthesis_fitting', () => {
      const patientRoleId = 8;
      const type = 'prosthesis_fitting';

      expect(canRoleCreateType(patientRoleId, type)).toBe(false);
    });

    test('Admin SÍ debe poder crear imaging_study', () => {
      const adminRoleId = 2;
      const type = 'imaging_study';

      expect(canRoleCreateType(adminRoleId, type)).toBe(true);
    });

    test('Doctor SÍ debe poder crear prosthesis_fitting', () => {
      const doctorRoleId = 3;
      const type = 'prosthesis_fitting';

      expect(canRoleCreateType(doctorRoleId, type)).toBe(true);
    });

    test('Rol desconocido debe asumir permisos de paciente (restrictivos)', () => {
      const unknownRoleId = 999;
      const type = 'imaging_study';

      expect(canRoleCreateType(unknownRoleId, type)).toBe(false);
    });
  });

  describe('Edge Cases', () => {

    test('appointment_type vacío ("") debe fallar validación', () => {
      expect(isValidAppointmentType('')).toBe(false);
    });

    test('appointment_type con solo espacios debe fallar validación', () => {
      expect(isValidAppointmentType('   ')).toBe(false);
    });

    test('appointment_type con case incorrecto debe fallar validación', () => {
      expect(isValidAppointmentType('consulta')).toBe(false); // minúscula
      expect(isValidAppointmentType('CONSULTA')).toBe(false); // mayúscula
      expect(isValidAppointmentType('CoNsUlTa')).toBe(false); // mixto
    });

    test('appointment_type con espacios extra debe fallar validación', () => {
      expect(isValidAppointmentType(' Consulta ')).toBe(false);
      expect(isValidAppointmentType('Consulta ')).toBe(false);
      expect(isValidAppointmentType(' Consulta')).toBe(false);
    });
  });

  // Tests de estadísticas de BD eliminados - requieren BD en runtime
});

// Exportar para uso en otros tests si es necesario
module.exports = {
  // Se podrían exportar funciones helper aquí
};
