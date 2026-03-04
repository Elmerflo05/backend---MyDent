# API de Configuración Global de Planes de Salud

## Descripción General

Backend completo para manejar la configuración global del sistema de planes de salud. Esta API permite a los super administradores configurar parámetros del sistema como días de gracia, recordatorios de pago, requisitos de voucher, etc.

## Arquitectura

### Diagrama de Flujo

```
Frontend (React + TypeScript)
    │
    │ HTTP Request (camelCase)
    ↓
httpClient.ts
    │
    │ /api/health-plan-settings
    ↓
healthPlanGlobalSettingsRoutes.js
    │
    │ Verificar Token + Permisos
    ↓
healthPlanGlobalSettingsController.js
    │
    │ Mapeo camelCase ↔ snake_case
    ↓
healthPlanGlobalSettingsModel.js
    │
    │ SQL Query
    ↓
PostgreSQL
    │
    └── health_plan_global_settings (tabla)
```

## Estructura de Archivos

```
backend_my_dent_sistema_odontologico/
├── models/
│   └── healthPlanGlobalSettingsModel.js        # Acceso a datos (SQL)
├── controllers/
│   └── healthPlanGlobalSettingsController.js   # Lógica de negocio + mapeo
├── routes/
│   └── healthPlanGlobalSettingsRoutes.js       # Definición de endpoints
├── scripts/
│   ├── ensure_health_plan_global_settings_table.js  # Migración/Verificación
│   └── test_health_plan_settings_api.js             # Tests de integración
└── index.js                                     # Registro de rutas

frontend_my_dent_sistema_odontologico/
└── src/
    └── services/
        └── healthPlan/
            └── HealthPlanSettingsService.ts     # Cliente API (actualizado)
```

## Endpoints

### Base URL
```
http://localhost:4015/api/health-plan-settings
```

### GET /
**Descripción:** Obtener la configuración global actual

**Autenticación:** Requerida (cualquier usuario autenticado)

**Response (200):**
```json
{
  "success": true,
  "data": {
    "id": "1",
    "graceDays": 3,
    "reminderDaysBefore": [7, 3, 1],
    "enableEmailNotifications": true,
    "enableInAppNotifications": true,
    "voucherRequired": true,
    "autoApproveVouchers": false,
    "updatedAt": "2026-01-11T16:14:47.102Z",
    "updatedBy": "1"
  }
}
```

**Errores:**
- `401 Unauthorized` - Token no proporcionado o inválido
- `500 Internal Server Error` - Error en servidor

---

### PUT /
**Descripción:** Actualizar la configuración global

**Autenticación:** Requerida (solo super_admin, role_id = 1)

**Request Body:**
```json
{
  "graceDays": 5,
  "reminderDaysBefore": [10, 7, 3, 1],
  "enableEmailNotifications": true,
  "enableInAppNotifications": false,
  "voucherRequired": true,
  "autoApproveVouchers": false
}
```

**Validaciones:**
- `graceDays`: número entre 0 y 30
- `reminderDaysBefore`: array de números, cada uno entre 1 y 30

**Response (200):**
```json
{
  "success": true,
  "message": "Configuración actualizada exitosamente",
  "data": {
    "id": "1",
    "graceDays": 5,
    "reminderDaysBefore": [10, 7, 3, 1],
    "enableEmailNotifications": true,
    "enableInAppNotifications": false,
    "voucherRequired": true,
    "autoApproveVouchers": false,
    "updatedAt": "2026-01-11T16:30:00.000Z",
    "updatedBy": "1"
  }
}
```

**Errores:**
- `400 Bad Request` - Validación fallida
- `401 Unauthorized` - Token no proporcionado o inválido
- `403 Forbidden` - Usuario no es super_admin
- `500 Internal Server Error` - Error en servidor

## Estructura de Base de Datos

### Tabla: `health_plan_global_settings`

```sql
CREATE TABLE health_plan_global_settings (
  setting_id SERIAL PRIMARY KEY,
  grace_days INTEGER DEFAULT 3,
  reminder_days_before JSONB DEFAULT '[7, 3, 1]',
  enable_email_notifications BOOLEAN DEFAULT true,
  enable_in_app_notifications BOOLEAN DEFAULT true,
  voucher_required BOOLEAN DEFAULT true,
  auto_approve_vouchers BOOLEAN DEFAULT false,
  status VARCHAR(20) DEFAULT 'active',
  user_id_registration INTEGER,
  date_time_registration TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  user_id_modification INTEGER,
  date_time_modification TIMESTAMPTZ
);
```

**Características:**
- Siempre existe un único registro activo
- Si no existe, se crea automáticamente con valores por defecto
- Los campos siguen el patrón snake_case (DB)

## Mapeo de Datos

### snake_case (DB) ↔ camelCase (API)

| Base de Datos          | API                       |
|------------------------|---------------------------|
| setting_id             | id                        |
| grace_days             | graceDays                 |
| reminder_days_before   | reminderDaysBefore        |
| enable_email_notifications | enableEmailNotifications |
| enable_in_app_notifications | enableInAppNotifications |
| voucher_required       | voucherRequired           |
| auto_approve_vouchers  | autoApproveVouchers       |
| date_time_modification | updatedAt                 |
| user_id_modification   | updatedBy                 |

## Seguridad y Permisos

### Middleware de Autenticación
- **Archivo:** `middleware/authMiddleware.js`
- **Función:** `verificarToken`
- Valida token JWT en header `Authorization: Bearer <token>`

### Middleware de Autorización
- **Función:** `verificarSuperAdmin` (en rutas)
- Solo permite acceso a usuarios con `role_id = 1` (super_admin)
- Lectura (GET): Cualquier usuario autenticado
- Escritura (PUT): Solo super_admin

## Integración Frontend

### Servicio TypeScript

**Archivo:** `src/services/healthPlan/HealthPlanSettingsService.ts`

```typescript
import httpClient from '@/services/api/httpClient';
import type { HealthPlanSettings } from '@/types/healthPlans';

export class HealthPlanSettingsService {
  private readonly API_ENDPOINT = '/health-plan-settings';

  async getSettings(): Promise<HealthPlanSettings> {
    const response = await httpClient.get<HealthPlanSettings>(this.API_ENDPOINT);
    return response.data;
  }

  async updateSettings(
    updates: Partial<Omit<HealthPlanSettings, 'id'>>,
    updatedBy: string
  ): Promise<HealthPlanSettings> {
    const response = await httpClient.put<HealthPlanSettings>(
      this.API_ENDPOINT,
      updates
    );
    return response.data;
  }
}
```

## Scripts de Utilidad

### 1. Verificar/Crear Tabla
```bash
node scripts/ensure_health_plan_global_settings_table.js
```

**Función:**
- Verifica si existe la tabla `health_plan_global_settings`
- Si no existe, la crea con el schema correcto
- Inserta un registro inicial si la tabla está vacía

### 2. Ejecutar Tests
```bash
node scripts/test_health_plan_settings_api.js
```

**Pruebas:**
- Existencia de tabla
- Lectura de datos
- Modelo: getGlobalSettings()
- Modelo: updateGlobalSettings()
- Controlador: mapeo de datos
- Validación del formato API

## Principios Aplicados

### SOLID
- **S (Single Responsibility):** Cada capa tiene una única responsabilidad
- **O (Open/Closed):** Fácil extensión sin modificar código existente
- **L (Liskov Substitution):** Interfaces consistentes
- **I (Interface Segregation):** APIs pequeñas y específicas
- **D (Dependency Inversion):** Dependencias a través de interfaces

### Single Source of Truth
- La base de datos es la única fuente de verdad
- Toda la lógica se centraliza en el backend
- Frontend solo consume APIs

### DRY (Don't Repeat Yourself)
- Mapeo centralizado en controlador
- Validaciones reutilizables
- Modelo único para acceso a datos

## Notas Técnicas

### Decisiones Arquitectónicas

1. **Registro Único:**
   - Siempre existe un solo registro activo
   - Simplifica la lógica (no necesita ID en requests)

2. **Mapeo Automático:**
   - Controlador maneja toda la conversión snake_case ↔ camelCase
   - Frontend/Backend desacoplados completamente

3. **Validaciones en Dos Capas:**
   - Frontend: Validación inmediata en UI
   - Backend: Validación de seguridad (nunca confiar en frontend)

4. **Manejo de Fechas:**
   - Base de datos: `TIMESTAMPTZ`
   - API: Strings ISO 8601
   - Frontend: Conversión a objetos Date

### Trade-offs

1. **Mapeo Manual vs ORM:**
   - ✅ Control total sobre queries
   - ✅ Mejor rendimiento
   - ❌ Más código boilerplate

2. **Registro Único vs Múltiples:**
   - ✅ Simplicidad conceptual
   - ✅ No necesita gestión de IDs
   - ❌ Menos flexible para futuro multi-tenant

## Ejemplos de Uso

### Obtener Configuración (cURL)
```bash
curl -X GET http://localhost:4015/api/health-plan-settings \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### Actualizar Configuración (cURL)
```bash
curl -X PUT http://localhost:4015/api/health-plan-settings \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "graceDays": 5,
    "reminderDaysBefore": [10, 7, 3, 1]
  }'
```

### Desde Frontend (TypeScript)
```typescript
import { healthPlanSettingsService } from '@/services/healthPlan/HealthPlanSettingsService';

// Obtener configuración
const settings = await healthPlanSettingsService.getSettings();
console.log(settings.graceDays); // 3

// Actualizar configuración
const updated = await healthPlanSettingsService.updateSettings(
  { graceDays: 5 },
  currentUserId
);
```

## Mantenimiento

### Agregar Nuevo Campo

1. **Base de Datos:**
```sql
ALTER TABLE health_plan_global_settings
ADD COLUMN new_field VARCHAR(50);
```

2. **Modelo (healthPlanGlobalSettingsModel.js):**
```javascript
// Agregar en INSERT y UPDATE queries
new_field: data.new_field || 'default_value'
```

3. **Controlador (healthPlanGlobalSettingsController.js):**
```javascript
// Mapeo API → DB
if (apiData.newField !== undefined)
  dbData.new_field = apiData.newField;

// Mapeo DB → API
newField: dbRecord.new_field
```

4. **Frontend (TypeScript):**
```typescript
// Actualizar type en @/types/healthPlans.ts
export interface HealthPlanSettings {
  // ...
  newField?: string;
}
```

## Verificación de Integración

### Checklist

- ✅ Tabla creada en base de datos
- ✅ Registro inicial insertado
- ✅ Modelo implementado y probado
- ✅ Controlador implementado y probado
- ✅ Rutas registradas en index.js
- ✅ Middleware de seguridad aplicado
- ✅ Frontend actualizado para consumir API real
- ✅ Mapeo snake_case ↔ camelCase funcional
- ✅ Tests de integración pasando

### Estado Actual
**Backend:** ✅ Completamente funcional
**Frontend:** ✅ Integrado con API real
**Base de Datos:** ✅ Tabla creada con datos iniciales

---

**Última actualización:** 2026-01-11
**Autor:** Claude Code (Anthropic)
**Versión:** 1.0.0
