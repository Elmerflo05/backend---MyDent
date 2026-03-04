# Tests del Sistema de Estados de Citas

## Descripción

Este directorio contiene los tests para validar el correcto funcionamiento del sistema de gestión de estados de citas, con énfasis en las validaciones de permisos y reglas de negocio.

## Estructura de Tests

### `validateAppointmentPermissions.test.js`

Contiene **100+ casos de prueba** para los 4 middlewares de validación:

#### 1. validateAppointmentPermission
- **37 tests** que cubren:
  - Acceso de super_admin (bypass de todas las restricciones)
  - Validación de roles (admin, receptionist, doctor, patient)
  - Validación de pertenencia a sede (admin/receptionist)
  - Validación de doctor asignado
  - Validación de paciente de la cita
  - Manejo de citas no encontradas
  - Manejo de usuarios no autenticados
  - Manejo de roles inválidos

#### 2. validate24HourCancellation
- **4 tests** que validan:
  - Bypass de super_admin
  - Rechazo de cancelación con < 24 horas
  - Aprobación de cancelación con > 24 horas
  - Manejo de datos de cita faltantes

#### 3. validateWorkingHours
- **8 tests** que verifican:
  - Horario laboral válido (8:00 AM - 6:00 PM)
  - Rechazo de horarios antes de 8:00 AM
  - Rechazo de horarios después de 6:00 PM
  - Bloqueo de hora de almuerzo (12:00 PM - 1:00 PM)
  - Bloqueo de domingos
  - Soporte para campos de reprogramación (new_date, new_start_time, new_end_time)
  - Manejo de campos faltantes

#### 4. rateLimitReschedule
- **4 tests** que prueban:
  - Permitir propuestas dentro del límite
  - Bloquear después de 3 propuestas en 24 horas
  - Conteo correcto de propuestas por ventana de tiempo
  - Manejo de valores numéricos como strings

#### 5. Error Handling
- **2 tests** para:
  - Errores de conexión a base de datos
  - Errores de queries SQL

## Comandos de Test

### Ejecutar todos los tests
```bash
npm test
```

### Ejecutar solo los tests de permisos
```bash
npm run test:permissions
```

### Modo watch (re-ejecuta en cambios)
```bash
npm run test:watch
```

### Ver cobertura de código
```bash
npm test -- --coverage
```

## Cobertura Esperada

Los tests están diseñados para alcanzar:
- **Branches**: >70%
- **Functions**: >70%
- **Lines**: >70%
- **Statements**: >70%

## Casos de Uso Cubiertos

### 1. Control de Acceso Basado en Roles (RBAC)
- ✅ Super admin tiene acceso ilimitado
- ✅ Admin/Receptionist solo acceden a su sede
- ✅ Doctores solo ven sus propias citas
- ✅ Pacientes solo ven sus propias citas
- ✅ Rechazo de usuarios no autorizados

### 2. Reglas de Negocio
- ✅ Política de cancelación de 24 horas
- ✅ Horario laboral: 8 AM - 6 PM
- ✅ Bloqueo de almuerzo: 12 PM - 1 PM
- ✅ Bloqueo de domingos
- ✅ Rate limiting: 3 propuestas/24h

### 3. Validación de Datos
- ✅ Citas existentes vs no encontradas
- ✅ Campos requeridos vs opcionales
- ✅ Formato de fechas y horas
- ✅ Rangos de tiempo válidos

### 4. Seguridad
- ✅ Prevención de acceso no autorizado
- ✅ Validación de pertenencia a entidades
- ✅ Protección contra abuso (rate limiting)
- ✅ Auditoría de cambios de estado

## Estructura de un Test Típico

```javascript
describe('Nombre del Middleware', () => {
  let req, res, next;

  beforeEach(() => {
    // Setup de mocks
    req = { user: { userId: 1, role_id: 2 }, params: { id: 10 } };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };
    next = jest.fn();
    jest.clearAllMocks();
  });

  test('Debe permitir acceso en condiciones válidas', async () => {
    // Arrange: Configurar mocks
    pool.query.mockResolvedValueOnce({ rows: [{ role_name: 'admin' }] });

    // Act: Ejecutar middleware
    const middleware = validateAppointmentPermission(['admin']);
    await middleware(req, res, next);

    // Assert: Verificar resultados
    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });

  test('Debe rechazar acceso en condiciones inválidas', async () => {
    // Similar estructura...
  });
});
```

## Mocking

### Base de Datos (pool)
```javascript
jest.mock('../config/db');
pool.query.mockResolvedValueOnce({ rows: [{ data }] });
pool.query.mockRejectedValueOnce(new Error('DB Error'));
```

### Objetos Request/Response
```javascript
const req = {
  user: { userId: 1, role_id: 2 },
  params: { id: 10 },
  body: { field: 'value' }
};

const res = {
  status: jest.fn().mockReturnThis(),
  json: jest.fn()
};

const next = jest.fn();
```

## Ejecución de Tests en CI/CD

Los tests están preparados para integrarse en pipelines de CI/CD:

```yaml
# Ejemplo para GitHub Actions
- name: Run Tests
  run: |
    cd backend_my_dent_sistema_odontologico
    npm install
    npm test -- --coverage --ci
```

## Debugging de Tests

### Ver output detallado
```bash
npm test -- --verbose
```

### Ejecutar test específico
```bash
npm test -- -t "Debe permitir acceso total a super_admin"
```

### Ver todos los mocks
```bash
npm test -- --verbose --detectOpenHandles
```

## Próximos Tests a Implementar

- [ ] Tests de integración para endpoints completos
- [ ] Tests de flujo completo (E2E)
- [ ] Tests de performance
- [ ] Tests de carga (stress testing)
- [ ] Tests de seguridad (penetration testing)

## Mantenimiento

- Actualizar tests cuando se modifiquen middlewares
- Mantener cobertura >70% en todo momento
- Revisar y actualizar mocks cuando cambie la estructura de BD
- Documentar nuevos casos de prueba

## Solución de Problemas

### Error: "Cannot find module '../config/db'"
- Verificar que el path del mock sea correcto
- Asegurarse de que jest.mock() esté al inicio del archivo

### Error: "Timeout of 5000ms exceeded"
- Aumentar timeout en jest.config.js o en el test específico
- Verificar que no haya queries reales a BD

### Tests pasan localmente pero fallan en CI
- Verificar zona horaria (tests de fechas)
- Asegurarse de que todas las dependencias estén en package.json
- Revisar variables de entorno

## Recursos

- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [Testing Best Practices](https://testingjavascript.com/)
- [Node.js Testing Guide](https://nodejs.org/en/docs/guides/testing/)
