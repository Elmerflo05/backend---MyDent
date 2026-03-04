const express = require('express');
const cors = require('cors');
const http = require('http');
const path = require('path');
const { Server } = require('socket.io');

// Cargar variables de entorno segun el ambiente
const envFile = process.env.NODE_ENV === 'production' ? '.env' : '.env.development';
require('dotenv').config({ path: path.resolve(__dirname, envFile) });

// Fallback a .env si no existe .env.development
if (!process.env.PORT) {
  require('dotenv').config({ path: path.resolve(__dirname, '.env') });
}

const pool = require('./config/db');

// Importar rutas
const publicRoutes = require('./routes/publicRoutes');
const authRoutes = require('./routes/authRoutes');
const patientsRoutes = require('./routes/patientsRoutes');
const appointmentsRoutes = require('./routes/appointmentsRoutes');
const branchesRoutes = require('./routes/branchesRoutes');
const usersRoutes = require('./routes/usersRoutes');
const treatmentsRoutes = require('./routes/treatmentsRoutes');
const treatmentPacksRoutes = require('./routes/treatmentPacksRoutes'); // Packs de Tratamientos
const dentalProceduresRoutes = require('./routes/dentalProceduresRoutes');
const budgetsRoutes = require('./routes/budgetsRoutes');
const paymentsRoutes = require('./routes/paymentsRoutes');
const dentistsRoutes = require('./routes/dentistsRoutes');
const consultationsRoutes = require('./routes/consultationsRoutes');
const odontogramsRoutes = require('./routes/odontogramsRoutes');
const treatmentPlansRoutes = require('./routes/treatmentPlansRoutes');
const prescriptionsRoutes = require('./routes/prescriptionsRoutes');
const medicalHistoriesRoutes = require('./routes/medicalHistoriesRoutes');
const laboratoryRoutes = require('./routes/laboratoryRoutes');
const laboratoryPricingRoutes = require('./routes/laboratoryPricingRoutes');
const laboratoryServicePricesRoutes = require('./routes/laboratoryServicePricesRoutes');
const radiographyRoutes = require('./routes/radiographyRoutes');
const companiesRoutes = require('./routes/companiesRoutes');
const healthPlansRoutes = require('./routes/healthPlansRoutes');
const promotionsRoutes = require('./routes/promotionsRoutes');
const branchPaymentMethodsRoutes = require('./routes/branchPaymentMethodsRoutes'); // Métodos de pago por sede
const notificationsRoutes = require('./routes/notificationsRoutes');
const inventoryRoutes = require('./routes/inventoryRoutes');
const rolesRoutes = require('./routes/rolesRoutes');
const treatmentNotesRoutes = require('./routes/treatmentNotesRoutes');
const appointmentRemindersRoutes = require('./routes/appointmentRemindersRoutes');
const appointmentConfigRoutes = require('./routes/appointmentConfigRoutes');
const patientDocumentsRoutes = require('./routes/patientDocumentsRoutes');
const consentsRoutes = require('./routes/consentsRoutes');
const contractTemplatesRoutes = require('./routes/contractTemplatesRoutes');
const patientContractsRoutes = require('./routes/patientContractsRoutes');
const prosthesisOrdersRoutes = require('./routes/prosthesisOrdersRoutes');
const publicFormsRoutes = require('./routes/publicFormsRoutes');
const appSettingsRoutes = require('./routes/appSettingsRoutes');
const auditLogsRoutes = require('./routes/auditLogsRoutes');
const statisticsRoutes = require('./routes/statisticsRoutes');
const reportsRoutes = require('./routes/reportsRoutes'); // Reportes por consultorio, especialidad, doctor
const catalogsRoutes = require('./routes/catalogs');
const specialtiesApiRoutes = require('./routes/specialtiesRoutes'); // ✅ Nueva API de especialidades
const uploadsRoutes = require('./routes/uploadsRoutes'); // ✅ API de uploads
const auxiliaryExamResultsRoutes = require('./routes/auxiliaryExamResultsRoutes'); // Resultados de Examenes Auxiliares (Paso 6)
const additionalServicesRoutes = require('./routes/additionalServicesRoutes'); // Servicios Adicionales (Ortodoncia, Implantes, Protesis)
const procedureHistoryRoutes = require('./routes/procedureHistoryRoutes'); // Historial de Procedimientos (Paso 10)
const procedureIncomeRoutes = require('./routes/procedureIncomeRoutes'); // Ingresos por Procedimientos (Comisiones)
const incomePaymentsRoutes = require('./routes/incomePaymentsRoutes'); // Aplicación de Pagos a Deudas (Cuentas por Cobrar)
const evolutionOdontogramRoutes = require('./routes/evolutionOdontogramRoutes'); // Odontograma de Evolucion
const serviceMonthlyPaymentsRoutes = require('./routes/serviceMonthlyPaymentsRoutes'); // Pagos Mensuales Recurrentes
const patientPortalRoutes = require('./routes/patientPortalRoutes'); // Portal del Paciente (Historial Medico)
const subProceduresRoutes = require('./routes/subProceduresRoutes'); // Sub-Procedimientos con precios por plan
const healthPlanDependentsRoutes = require('./routes/healthPlanDependentsRoutes'); // Dependientes del Plan Familiar
const healthPlanSubscriptionsExtendedRoutes = require('./routes/healthPlanSubscriptionsExtendedRoutes'); // Suscripciones extendidas
const healthPlanGlobalSettingsRoutes = require('./routes/healthPlanGlobalSettingsRoutes'); // Configuración global de planes de salud
const pricingRoutes = require('./routes/pricingRoutes'); // Servicio de precios por plan de salud
const conditionProcedurePricingRoutes = require('./routes/conditionProcedurePricingRoutes'); // Precios de procedimientos de condiciones
const commissionsRoutes = require('./routes/commissions'); // Comisiones de Dentistas
const companyCorporatePricingRoutes = require('./routes/companyCorporatePricingRoutes'); // Precios Corporativos por Empresa

// Importar rutas de catálogos
const {
  gendersRoutes,
  bloodTypesRoutes,
  documentTypesRoutes,
  maritalStatusesRoutes,
  identificationTypesRoutes,
  medicationUnitsRoutes,
  userStatusesRoutes,
  diagnosisOptionsRoutes,
  appointmentStatusesRoutes,
  budgetStatusesRoutes,
  treatmentStatusesRoutes,
  treatmentPlanStatusesRoutes,
  reminderTypesRoutes,
  paymentMethodsRoutes,
  specialtiesRoutes,
  toothPositionsRoutes,
  toothSurfacesRoutes,
  prescriptionFrequenciesRoutes,
  prescriptionDurationsRoutes
} = require('./routes/catalogRoutes');

const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 4015;

// Configurar orígenes permitidos para CORS (Railway + localhost)
const allowedOrigins = [
  'http://localhost:3015',
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  process.env.FRONTEND_URL,
  process.env.CORS_ORIGIN
].filter(Boolean);

// Configurar Socket.IO para tiempo real
const io = new Server(server, {
  cors: {
    origin: allowedOrigins.length > 0 ? allowedOrigins : '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    credentials: true
  }
});

// Hacer io disponible globalmente para los controladores
global.io = io;

// Eventos de Socket.IO
io.on('connection', (socket) => {
  // Unirse a una sala específica por sede (branch)
  socket.on('join-branch', (branchId) => {
    socket.join(`branch-${branchId}`);
  });

  // Unirse a la sala global (para super_admin que ve todas las sedes)
  socket.on('join-global', () => {
    socket.join('global-appointments');
  });

  // Unirse a la sala del paciente específico (para el portal del paciente)
  socket.on('join-patient', (patientId) => {
    socket.join(`patient-${patientId}`);
  });

  socket.on('disconnect', () => {});
});

// Middleware CORS configurado para Railway y desarrollo local
app.use(cors({
  origin: function(origin, callback) {
    // Permitir requests sin origin (como mobile apps o curl)
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin) || allowedOrigins.includes('*')) {
      callback(null, true);
    } else {
      callback(null, true); // Permitir todos en producción para evitar problemas
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());

// Servir archivos desde S3 (proxy)
app.use('/uploads', require('./routes/s3ProxyRoute'));

// Rutas públicas (sin autenticación) - DEBE IR ANTES de las rutas autenticadas
app.use('/api/public', publicRoutes);

// Rutas principales
app.use('/api/auth', authRoutes);
app.use('/api/patients', patientsRoutes);
app.use('/api/appointments', appointmentsRoutes);
app.use('/api/branches', branchesRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/treatments', treatmentsRoutes);
app.use('/api/treatment-packs', treatmentPacksRoutes); // Packs de Tratamientos
app.use('/api/dental-procedures', dentalProceduresRoutes);
app.use('/api/budgets', budgetsRoutes);
app.use('/api/payments', paymentsRoutes);
app.use('/api/dentists', dentistsRoutes);
app.use('/api/consultations', consultationsRoutes);
app.use('/api/odontograms', odontogramsRoutes);
app.use('/api/treatment-plans', treatmentPlansRoutes);
app.use('/api/prescriptions', prescriptionsRoutes);
app.use('/api/medical-histories', medicalHistoriesRoutes);
app.use('/api/laboratory', laboratoryRoutes);
app.use('/api/laboratory/pricing', laboratoryPricingRoutes);
app.use('/api/laboratory/service-prices', laboratoryServicePricesRoutes);
app.use('/api/radiography', radiographyRoutes);
app.use('/api/companies', companiesRoutes);
app.use('/api/health-plans', healthPlansRoutes);
app.use('/api/promotions', promotionsRoutes);
app.use('/api/branch-payment-methods', branchPaymentMethodsRoutes); // Métodos de pago por sede
app.use('/api/notifications', notificationsRoutes);
app.use('/api/inventory', inventoryRoutes);
app.use('/api/roles-permissions', rolesRoutes);
app.use('/api/treatment-notes', treatmentNotesRoutes);
app.use('/api/appointment-reminders', appointmentRemindersRoutes);
app.use('/api/appointment-config', appointmentConfigRoutes);
app.use('/api/patient-documents', patientDocumentsRoutes);
app.use('/api/consents', consentsRoutes);
app.use('/api/contract-templates', contractTemplatesRoutes);
app.use('/api/patient-contracts', patientContractsRoutes);
app.use('/api/prosthesis-orders', prosthesisOrdersRoutes);
app.use('/api/public-forms', publicFormsRoutes);
app.use('/api/settings', appSettingsRoutes);
app.use('/api/audit-logs', auditLogsRoutes);
app.use('/api/statistics', statisticsRoutes);
app.use('/api/reports', reportsRoutes); // Reportes por consultorio, especialidad, doctor
app.use('/api/specialties', specialtiesApiRoutes); // ✅ API extendida de especialidades
app.use('/api/uploads', uploadsRoutes); // ✅ API de uploads de archivos
app.use('/api/auxiliary-exam-results', auxiliaryExamResultsRoutes); // Resultados de Examenes Auxiliares (Paso 6)
app.use('/api/additional-services', additionalServicesRoutes); // Servicios Adicionales (Ortodoncia, Implantes, Protesis)
app.use('/api/procedure-history', procedureHistoryRoutes); // Historial de Procedimientos (Paso 10)
app.use('/api/procedure-income', procedureIncomeRoutes); // Ingresos por Procedimientos (Comisiones)
app.use('/api/income-payments', incomePaymentsRoutes); // Aplicación de Pagos a Deudas (Cuentas por Cobrar)
app.use('/api/evolution-odontogram', evolutionOdontogramRoutes); // Odontograma de Evolucion
app.use('/api/service-monthly-payments', serviceMonthlyPaymentsRoutes); // Pagos Mensuales Recurrentes
app.use('/api/patient-portal', patientPortalRoutes); // Portal del Paciente (Historial Medico)
app.use('/api/sub-procedures', subProceduresRoutes); // Sub-Procedimientos con precios por plan
app.use('/api/health-plan-dependents', healthPlanDependentsRoutes); // Dependientes del Plan Familiar
app.use('/api/health-plan-subscriptions', healthPlanSubscriptionsExtendedRoutes); // Suscripciones extendidas (con voucher/aprobacion)
app.use('/api/health-plan-settings', healthPlanGlobalSettingsRoutes); // Configuración global de planes de salud
app.use('/api/pricing', pricingRoutes); // Servicio de precios por plan de salud
app.use('/api/condition-procedure-pricing', conditionProcedurePricingRoutes); // Precios de procedimientos de condiciones
app.use('/api/commissions', commissionsRoutes); // Comisiones de Dentistas
app.use('/api/company-pricing', companyCorporatePricingRoutes); // Precios Corporativos por Empresa

// Ruta unificada de catálogos del odontograma
app.use('/api/catalogs', catalogsRoutes);

// Rutas de catálogos
app.use('/api/catalogs/genders', gendersRoutes);
app.use('/api/catalogs/blood-types', bloodTypesRoutes);
app.use('/api/catalogs/document-types', documentTypesRoutes);
app.use('/api/catalogs/marital-statuses', maritalStatusesRoutes);
app.use('/api/catalogs/identification-types', identificationTypesRoutes);
app.use('/api/catalogs/medication-units', medicationUnitsRoutes);
app.use('/api/catalogs/user-statuses', userStatusesRoutes);
app.use('/api/catalogs/diagnosis-options', diagnosisOptionsRoutes);
app.use('/api/catalogs/appointment-statuses', appointmentStatusesRoutes);
app.use('/api/catalogs/budget-statuses', budgetStatusesRoutes);
app.use('/api/catalogs/treatment-statuses', treatmentStatusesRoutes);
app.use('/api/catalogs/treatment-plan-statuses', treatmentPlanStatusesRoutes);
app.use('/api/catalogs/reminder-types', reminderTypesRoutes);
app.use('/api/catalogs/payment-methods', paymentMethodsRoutes);
app.use('/api/catalogs/specialties', specialtiesRoutes);
app.use('/api/catalogs/tooth-positions', toothPositionsRoutes);
app.use('/api/catalogs/tooth-surfaces', toothSurfacesRoutes);
app.use('/api/catalogs/prescription-frequencies', prescriptionFrequenciesRoutes);
app.use('/api/catalogs/prescription-durations', prescriptionDurationsRoutes);

// Ruta de prueba
app.get('/api/ping', async (req, res) => {
  try {
    const result = await pool.query('SELECT NOW()');
    res.json({ status: 'ok', time: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'DB error' });
  }
});

server.listen(PORT, () => {
  const isProduction = process.env.NODE_ENV === 'production' || process.env.RAILWAY_ENVIRONMENT;
  console.log(`\n========================================`);
  console.log(`  MyDent Sistema Odontologico - Backend`);
  console.log(`========================================`);
  console.log(`  Entorno: ${isProduction ? 'PRODUCCION (Railway)' : 'DESARROLLO LOCAL'}`);
  console.log(`  Puerto: ${PORT}`);
  console.log(`  URL: http://localhost:${PORT}`);
  console.log(`  WebSocket: Habilitado`);
  if (!isProduction) {
    console.log(`  BD: ${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.DB_NAME}`);
  }
  console.log(`========================================\n`);
});
