const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcrypt");
const { getConsentTemplatesData } = require("./consent-templates-data");
const prisma = new PrismaClient();

// Función auxiliar para crear hashes de contraseña
async function hashPassword(password) {
  return await bcrypt.hash(password, 10);
}

// Función auxiliar para obtener fecha/hora en zona horaria de Lima, Perú
function getLimaDate(dateString) {
  if (dateString) {
    return new Date(dateString + "T00:00:00-05:00");
  }
  const now = new Date();
  return new Date(now.toLocaleString("en-US", { timeZone: "America/Lima" }));
}

function getLimaDateTime() {
  const now = new Date();
  return new Date(now.toLocaleString("en-US", { timeZone: "America/Lima" }));
}

async function main() {
  console.log("🦷 Iniciando seeder del sistema odontológico My Dent...");
  console.log("📍 Zona horaria: Lima, Perú (UTC-5)");

  const hashedPassword = await hashPassword("123456");

  // =====================================================
  // 1. COMPAÑÍAS (companies) - Primero porque branches depende de esto
  // =====================================================
  console.log("\n📋 Poblando compañías...");
  await prisma.companies.createMany({
    data: [
      {
        company_name: "My Dent Clínica Dental",
        tax_id: "20600123456",
        ruc: "20600123456",
        legal_name: "My Dent Servicios Odontológicos S.A.C.",
        phone: "(01) 234-5678",
        email: "contacto@mydent.pe",
        website: "https://mydent.pe",
        address: "Av. Javier Prado Este 4567, San Isidro",
        city: "Lima",
        state: "Lima",
        country: "Perú",
        postal_code: "15036",
        contact_person: "Dr. Carlos Mendoza",
        status: "active",
        user_id_registration: 1,
        date_time_registration: getLimaDateTime(),
      },
    ],
    skipDuplicates: true,
  });

  // =====================================================
  // 2. ROLES (roles)
  // =====================================================
  console.log("👥 Poblando roles...");
  await prisma.roles.createMany({
    data: [
      {
        role_name: "Super Administrador",
        role_description:
          "Acceso total al sistema, gestión de configuraciones, sedes, usuarios y permisos globales.",
        role_level: 1,
        status: "active",
        user_id_registration: 1,
        date_time_registration: getLimaDateTime(),
      },
      {
        role_name: "Administrador de Sede",
        role_description:
          "Gestiona una sede específica, supervisa operaciones diarias, personal y reportes de la sucursal.",
        role_level: 2,
        status: "active",
        user_id_registration: 1,
        date_time_registration: getLimaDateTime(),
      },
      {
        role_name: "Odontólogo",
        role_description:
          "Profesional de salud dental que atiende pacientes, realiza diagnósticos y tratamientos.",
        role_level: 3,
        status: "active",
        user_id_registration: 1,
        date_time_registration: getLimaDateTime(),
      },
      {
        role_name: "Recepcionista",
        role_description:
          "Gestiona citas, atiende pacientes en recepción y coordina agenda de odontólogos.",
        role_level: 4,
        status: "active",
        user_id_registration: 1,
        date_time_registration: getLimaDateTime(),
      },
      {
        role_name: "Técnico de Imágenes",
        role_description:
          "Especialista en estudios imagenológicos dentales: toma radiografías, gestiona equipos de diagnóstico por imagen y procesa estudios radiológicos.",
        role_level: 5,
        status: "active",
        user_id_registration: 1,
        date_time_registration: getLimaDateTime(),
      },
      {
        role_name: "Paciente",
        role_description:
          "Usuario paciente que puede ver sus citas, historial médico y pagos.",
        role_level: 7,
        status: "active",
        user_id_registration: 1,
        date_time_registration: getLimaDateTime(),
      },
      {
        role_name: "Cliente Externo",
        role_description:
          "Cliente externo que solicita servicios de laboratorio e imágenes.",
        role_level: 8,
        status: "active",
        user_id_registration: 1,
        date_time_registration: getLimaDateTime(),
      },
    ],
    skipDuplicates: true,
  });

  // =====================================================
  // 3. SEDES (branches) - Necesita company_id
  // =====================================================
  console.log("🏥 Poblando sedes...");
  await prisma.branches.createMany({
    data: [
      {
        company_id: 1,
        branch_name: "My Dent - San Isidro (Sede Principal)",
        branch_code: "SI01",
        phone: "(01) 234-5678",
        email: "sanisidro@mydent.pe",
        address: "Av. Javier Prado Este 4567",
        city: "Lima",
        state: "Lima",
        country: "Perú",
        postal_code: "15036",
        latitude: -12.0944,
        longitude: -77.0283,
        is_main_office: true,
        administrator_id: null, // Se asignará después
        configuration: {
          horario_atencion: {
            lunes_viernes: "08:00 - 20:00",
            sabado: "09:00 - 14:00",
            domingo: "Cerrado",
          },
          servicios_destacados: ["Ortodoncia", "Implantes", "Estética Dental"],
        },
        status: "active",
        user_id_registration: 1,
        date_time_registration: getLimaDateTime(),
      },
      {
        company_id: 1,
        branch_name: "My Dent - Miraflores",
        branch_code: "MF02",
        phone: "(01) 345-6789",
        email: "miraflores@mydent.pe",
        address: "Av. Larco 1234, Miraflores",
        city: "Lima",
        state: "Lima",
        country: "Perú",
        postal_code: "15074",
        latitude: -12.1217,
        longitude: -77.0281,
        is_main_office: false,
        administrator_id: null,
        configuration: {
          horario_atencion: {
            lunes_viernes: "09:00 - 19:00",
            sabado: "09:00 - 13:00",
            domingo: "Cerrado",
          },
          servicios_destacados: [
            "Blanqueamiento",
            "Odontopediatría",
            "Endodoncia",
          ],
        },
        status: "active",
        user_id_registration: 1,
        date_time_registration: getLimaDateTime(),
      },
      {
        company_id: 1,
        branch_name: "My Dent - Surco",
        branch_code: "SU03",
        phone: "(01) 456-7890",
        email: "surco@mydent.pe",
        address: "Av. Primavera 987, Santiago de Surco",
        city: "Lima",
        state: "Lima",
        country: "Perú",
        postal_code: "15023",
        latitude: -12.1391,
        longitude: -77.005,
        is_main_office: false,
        administrator_id: null,
        configuration: {
          horario_atencion: {
            lunes_viernes: "08:30 - 20:30",
            sabado: "08:00 - 15:00",
            domingo: "Cerrado",
          },
          servicios_destacados: [
            "Periodoncia",
            "Cirugía Oral",
            "Rehabilitación Oral",
          ],
        },
        status: "active",
        user_id_registration: 1,
        date_time_registration: getLimaDateTime(),
      },
    ],
    skipDuplicates: true,
  });

  // =====================================================
  // 4. USUARIOS (users) - Necesita role_id y branch_id
  // =====================================================
  console.log("👤 Poblando usuarios...");
  await prisma.users.createMany({
    data: [
      // Super Administrador
      {
        role_id: 1,
        branch_id: 1,
        username: "admin",
        email: "admin@mydent.pe",
        password_hash: hashedPassword,
        first_name: "Carlos",
        last_name: "Mendoza",
        phone: "(01) 234-5678",
        mobile: "987654321",
        is_active: true,
        email_verified: true,
        commission_percentage: 0,
        branches_access: [1, 2, 3],
        profile: {
          cargo: "Director General",
          especialidad: "Administración",
        },
        status: "active",
        user_id_registration: 1,
        date_time_registration: getLimaDateTime(),
      },
      // Administradores de Sede
      {
        role_id: 2,
        branch_id: 1,
        username: "admin.sanisidro",
        email: "admin.sanisidro@mydent.pe",
        password_hash: hashedPassword,
        first_name: "María",
        last_name: "Torres",
        phone: "(01) 234-5679",
        mobile: "987654322",
        is_active: true,
        email_verified: true,
        commission_percentage: 0,
        branches_access: [1],
        profile: {
          cargo: "Administradora de Sede",
        },
        status: "active",
        user_id_registration: 1,
        date_time_registration: getLimaDateTime(),
      },
      {
        role_id: 2,
        branch_id: 2,
        username: "admin.miraflores",
        email: "admin.miraflores@mydent.pe",
        password_hash: hashedPassword,
        first_name: "Luis",
        last_name: "Ramírez",
        phone: "(01) 345-6790",
        mobile: "987654323",
        is_active: true,
        email_verified: true,
        commission_percentage: 0,
        branches_access: [2],
        profile: {
          cargo: "Administrador de Sede",
        },
        status: "active",
        user_id_registration: 1,
        date_time_registration: getLimaDateTime(),
      },
      {
        role_id: 2,
        branch_id: 3,
        username: "admin.surco",
        email: "admin.surco@mydent.pe",
        password_hash: hashedPassword,
        first_name: "Ana",
        last_name: "Gutiérrez",
        phone: "(01) 456-7891",
        mobile: "987654324",
        is_active: true,
        email_verified: true,
        commission_percentage: 0,
        branches_access: [3],
        profile: {
          cargo: "Administradora de Sede",
        },
        status: "active",
        user_id_registration: 1,
        date_time_registration: getLimaDateTime(),
      },
      // Odontólogos
      {
        role_id: 3,
        branch_id: 1,
        username: "dr.fernandez",
        email: "dr.fernandez@mydent.pe",
        password_hash: hashedPassword,
        first_name: "Roberto",
        last_name: "Fernández",
        phone: "(01) 234-5680",
        mobile: "987654325",
        is_active: true,
        email_verified: true,
        commission_percentage: 50.0,
        branches_access: [1],
        profile: {
          cargo: "Odontólogo General",
          especialidad: "Ortodoncia",
        },
        status: "active",
        user_id_registration: 1,
        date_time_registration: getLimaDateTime(),
      },
      {
        role_id: 3,
        branch_id: 1,
        username: "dra.castillo",
        email: "dra.castillo@mydent.pe",
        password_hash: hashedPassword,
        first_name: "Patricia",
        last_name: "Castillo",
        phone: "(01) 234-5681",
        mobile: "987654326",
        is_active: true,
        email_verified: true,
        commission_percentage: 55.0,
        branches_access: [1],
        profile: {
          cargo: "Odontóloga",
          especialidad: "Endodoncia",
        },
        status: "active",
        user_id_registration: 1,
        date_time_registration: getLimaDateTime(),
      },
      {
        role_id: 3,
        branch_id: 2,
        username: "dr.garcia",
        email: "dr.garcia@mydent.pe",
        password_hash: hashedPassword,
        first_name: "Jorge",
        last_name: "García",
        phone: "(01) 345-6791",
        mobile: "987654327",
        is_active: true,
        email_verified: true,
        commission_percentage: 50.0,
        branches_access: [2],
        profile: {
          cargo: "Odontólogo",
          especialidad: "Implantología",
        },
        status: "active",
        user_id_registration: 1,
        date_time_registration: getLimaDateTime(),
      },
      {
        role_id: 3,
        branch_id: 2,
        username: "dra.lopez",
        email: "dra.lopez@mydent.pe",
        password_hash: hashedPassword,
        first_name: "Carmen",
        last_name: "López",
        phone: "(01) 345-6792",
        mobile: "987654328",
        is_active: true,
        email_verified: true,
        commission_percentage: 52.0,
        branches_access: [2],
        profile: {
          cargo: "Odontóloga",
          especialidad: "Odontopediatría",
        },
        status: "active",
        user_id_registration: 1,
        date_time_registration: getLimaDateTime(),
      },
      {
        role_id: 3,
        branch_id: 3,
        username: "dr.morales",
        email: "dr.morales@mydent.pe",
        password_hash: hashedPassword,
        first_name: "Ricardo",
        last_name: "Morales",
        phone: "(01) 456-7892",
        mobile: "987654329",
        is_active: true,
        email_verified: true,
        commission_percentage: 50.0,
        branches_access: [3],
        profile: {
          cargo: "Odontólogo",
          especialidad: "Periodoncia",
        },
        status: "active",
        user_id_registration: 1,
        date_time_registration: getLimaDateTime(),
      },
      {
        role_id: 3,
        branch_id: 3,
        username: "dra.rodriguez",
        email: "dra.rodriguez@mydent.pe",
        password_hash: hashedPassword,
        first_name: "Sandra",
        last_name: "Rodríguez",
        phone: "(01) 456-7893",
        mobile: "987654330",
        is_active: true,
        email_verified: true,
        commission_percentage: 53.0,
        branches_access: [3],
        profile: {
          cargo: "Odontóloga",
          especialidad: "Rehabilitación Oral",
        },
        status: "active",
        user_id_registration: 1,
        date_time_registration: getLimaDateTime(),
      },
      // Recepcionistas
      {
        role_id: 4,
        branch_id: 1,
        username: "recep.sanisidro",
        email: "recepcion.sanisidro@mydent.pe",
        password_hash: hashedPassword,
        first_name: "Rosa",
        last_name: "Pérez",
        phone: "(01) 234-5682",
        mobile: "987654331",
        is_active: true,
        email_verified: true,
        commission_percentage: 0,
        branches_access: [1],
        status: "active",
        user_id_registration: 1,
        date_time_registration: getLimaDateTime(),
      },
      {
        role_id: 4,
        branch_id: 2,
        username: "recep.miraflores",
        email: "recepcion.miraflores@mydent.pe",
        password_hash: hashedPassword,
        first_name: "Laura",
        last_name: "Vargas",
        phone: "(01) 345-6793",
        mobile: "987654332",
        is_active: true,
        email_verified: true,
        commission_percentage: 0,
        branches_access: [2],
        status: "active",
        user_id_registration: 1,
        date_time_registration: getLimaDateTime(),
      },
      {
        role_id: 4,
        branch_id: 3,
        username: "recep.surco",
        email: "recepcion.surco@mydent.pe",
        password_hash: hashedPassword,
        first_name: "Claudia",
        last_name: "Ríos",
        phone: "(01) 456-7894",
        mobile: "987654333",
        is_active: true,
        email_verified: true,
        commission_percentage: 0,
        branches_access: [3],
        status: "active",
        user_id_registration: 1,
        date_time_registration: getLimaDateTime(),
      },
      // Técnico de Imágenes (único, acceso global a todas las sedes)
      {
        role_id: 5,
        branch_id: null, // Sin sede asignada - acceso global
        username: "tecnico.imagen",
        email: "tecnico.imagen@mydent.pe",
        password_hash: hashedPassword,
        first_name: "Carlos",
        last_name: "Mendoza",
        phone: "(01) 234-5683",
        mobile: "987654334",
        is_active: true,
        email_verified: true,
        commission_percentage: 0,
        branches_access: [1, 2, 3], // Acceso a todas las sedes
        status: "active",
        user_id_registration: 1,
        date_time_registration: getLimaDateTime(),
      },
      // Pacientes (usuarios vinculados a la tabla patients)
      {
        role_id: 6,
        branch_id: 1,
        username: "paciente.jcperez",
        email: "jcperez@gmail.com",
        password_hash: hashedPassword,
        first_name: "Juan Carlos",
        last_name: "Pérez Gómez",
        phone: "",
        mobile: "987123456",
        is_active: true,
        email_verified: true,
        commission_percentage: 0,
        branches_access: [1],
        profile: {
          tipo_paciente: "Regular",
        },
        status: "active",
        user_id_registration: 1,
        date_time_registration: getLimaDateTime(),
      },
      {
        role_id: 6,
        branch_id: 1,
        username: "paciente.metorres",
        email: "metorres@hotmail.com",
        password_hash: hashedPassword,
        first_name: "María Elena",
        last_name: "Torres Vásquez",
        phone: "",
        mobile: "987234567",
        is_active: true,
        email_verified: true,
        commission_percentage: 0,
        branches_access: [1],
        profile: {
          tipo_paciente: "Regular",
        },
        status: "active",
        user_id_registration: 1,
        date_time_registration: getLimaDateTime(),
      },
      {
        role_id: 6,
        branch_id: 2,
        username: "paciente.pramirez",
        email: "pasilva@yahoo.com",
        password_hash: hashedPassword,
        first_name: "Pedro Antonio",
        last_name: "Ramírez Silva",
        phone: "",
        mobile: "987345678",
        is_active: true,
        email_verified: true,
        commission_percentage: 0,
        branches_access: [2],
        profile: {
          tipo_paciente: "Regular",
        },
        status: "active",
        user_id_registration: 1,
        date_time_registration: getLimaDateTime(),
      },
      // Cliente Externo (usuario de ejemplo)
      {
        role_id: 7,
        branch_id: 1,
        username: "cliente.externo",
        email: "cliente.externo@dental.com",
        password_hash: hashedPassword,
        first_name: "Dr. Carlos",
        last_name: "Rodríguez",
        phone: "(01) 555-1234",
        mobile: "987654338",
        is_active: true,
        email_verified: true,
        commission_percentage: 0,
        branches_access: [1, 2, 3],
        profile: {
          tipo_cliente: "Clínica Asociada",
          empresa: "Clínica Dental Sonrisas",
          ruc: "20123456789",
          direccion: "Av. Principal 123, Lima",
          fecha_registro: "2025-01-15",
        },
        status: "active",
        user_id_registration: 1,
        date_time_registration: getLimaDateTime(),
      },
    ],
    skipDuplicates: true,
  });

  // Actualizar administradores de sedes
  console.log("🔄 Asignando administradores a sedes...");
  await prisma.branches.update({
    where: { branch_id: 1 },
    data: { administrator_id: 2 },
  });
  await prisma.branches.update({
    where: { branch_id: 2 },
    data: { administrator_id: 3 },
  });
  await prisma.branches.update({
    where: { branch_id: 3 },
    data: { administrator_id: 4 },
  });

  // =====================================================
  // 5. PERMISOS (permissions)
  // =====================================================
  console.log("🔐 Poblando permisos...");
  await prisma.permissions.createMany({
    data: [
      // Permisos de Super Administrador
      {
        permission_name: "administrator.dashboard",
        permission_description: "Acceso al dashboard de administrador",
        resource: "dashboard",
        action: "view",
        status: "active",
        user_id_registration: 1,
        date_time_registration: getLimaDateTime(),
      },
      {
        permission_name: "administrator.branches",
        permission_description: "Gestión de sedes",
        resource: "branches",
        action: "manage",
        status: "active",
        user_id_registration: 1,
        date_time_registration: getLimaDateTime(),
      },
      {
        permission_name: "administrator.users",
        permission_description: "Gestión de usuarios",
        resource: "users",
        action: "manage",
        status: "active",
        user_id_registration: 1,
        date_time_registration: getLimaDateTime(),
      },
      {
        permission_name: "administrator.roles",
        permission_description: "Gestión de roles",
        resource: "roles",
        action: "manage",
        status: "active",
        user_id_registration: 1,
        date_time_registration: getLimaDateTime(),
      },
      {
        permission_name: "administrator.permissions",
        permission_description: "Gestión de permisos",
        resource: "permissions",
        action: "manage",
        status: "active",
        user_id_registration: 1,
        date_time_registration: getLimaDateTime(),
      },
      {
        permission_name: "administrator.reports",
        permission_description: "Acceso a reportes generales",
        resource: "reports",
        action: "view",
        status: "active",
        user_id_registration: 1,
        date_time_registration: getLimaDateTime(),
      },
      {
        permission_name: "administrator.settings",
        permission_description: "Configuración del sistema",
        resource: "settings",
        action: "manage",
        status: "active",
        user_id_registration: 1,
        date_time_registration: getLimaDateTime(),
      },
      {
        permission_name: "administrator.audit",
        permission_description: "Acceso a logs de auditoría",
        resource: "audit",
        action: "view",
        status: "active",
        user_id_registration: 1,
        date_time_registration: getLimaDateTime(),
      },

      // Permisos de Administrador de Sede
      {
        permission_name: "branchAdmin.dashboard",
        permission_description: "Dashboard de administrador de sede",
        resource: "dashboard",
        action: "view",
        status: "active",
        user_id_registration: 1,
        date_time_registration: getLimaDateTime(),
      },
      {
        permission_name: "branchAdmin.appointments",
        permission_description: "Gestión de citas",
        resource: "appointments",
        action: "manage",
        status: "active",
        user_id_registration: 1,
        date_time_registration: getLimaDateTime(),
      },
      {
        permission_name: "branchAdmin.patients",
        permission_description: "Gestión de pacientes",
        resource: "patients",
        action: "manage",
        status: "active",
        user_id_registration: 1,
        date_time_registration: getLimaDateTime(),
      },
      {
        permission_name: "branchAdmin.schedules",
        permission_description: "Gestión de horarios",
        resource: "schedules",
        action: "manage",
        status: "active",
        user_id_registration: 1,
        date_time_registration: getLimaDateTime(),
      },
      {
        permission_name: "branchAdmin.inventory",
        permission_description: "Gestión de inventario",
        resource: "inventory",
        action: "manage",
        status: "active",
        user_id_registration: 1,
        date_time_registration: getLimaDateTime(),
      },
      {
        permission_name: "branchAdmin.reports",
        permission_description: "Reportes de sede",
        resource: "reports",
        action: "view",
        status: "active",
        user_id_registration: 1,
        date_time_registration: getLimaDateTime(),
      },

      // Permisos de Odontólogo
      {
        permission_name: "dentist.dashboard",
        permission_description: "Dashboard de odontólogo",
        resource: "dashboard",
        action: "view",
        status: "active",
        user_id_registration: 1,
        date_time_registration: getLimaDateTime(),
      },
      {
        permission_name: "dentist.appointments",
        permission_description: "Ver y gestionar sus citas",
        resource: "appointments",
        action: "view",
        status: "active",
        user_id_registration: 1,
        date_time_registration: getLimaDateTime(),
      },
      {
        permission_name: "dentist.patients",
        permission_description: "Ver y editar pacientes",
        resource: "patients",
        action: "edit",
        status: "active",
        user_id_registration: 1,
        date_time_registration: getLimaDateTime(),
      },
      {
        permission_name: "dentist.treatments",
        permission_description: "Gestión de tratamientos",
        resource: "treatments",
        action: "manage",
        status: "active",
        user_id_registration: 1,
        date_time_registration: getLimaDateTime(),
      },
      {
        permission_name: "dentist.odontogram",
        permission_description: "Gestión de odontogramas",
        resource: "odontogram",
        action: "manage",
        status: "active",
        user_id_registration: 1,
        date_time_registration: getLimaDateTime(),
      },
      {
        permission_name: "dentist.prescriptions",
        permission_description: "Crear recetas médicas",
        resource: "prescriptions",
        action: "create",
        status: "active",
        user_id_registration: 1,
        date_time_registration: getLimaDateTime(),
      },
      {
        permission_name: "dentist.history",
        permission_description: "Ver historial médico",
        resource: "history",
        action: "view",
        status: "active",
        user_id_registration: 1,
        date_time_registration: getLimaDateTime(),
      },
      {
        permission_name: "dentist.budgets",
        permission_description: "Crear presupuestos",
        resource: "budgets",
        action: "create",
        status: "active",
        user_id_registration: 1,
        date_time_registration: getLimaDateTime(),
      },

      // Permisos de Recepcionista
      {
        permission_name: "receptionist.dashboard",
        permission_description: "Dashboard de recepcionista",
        resource: "dashboard",
        action: "view",
        status: "active",
        user_id_registration: 1,
        date_time_registration: getLimaDateTime(),
      },
      {
        permission_name: "receptionist.appointments",
        permission_description: "Gestión de citas",
        resource: "appointments",
        action: "manage",
        status: "active",
        user_id_registration: 1,
        date_time_registration: getLimaDateTime(),
      },
      {
        permission_name: "receptionist.patients",
        permission_description: "Registro y edición de pacientes",
        resource: "patients",
        action: "edit",
        status: "active",
        user_id_registration: 1,
        date_time_registration: getLimaDateTime(),
      },
      {
        permission_name: "receptionist.payments",
        permission_description: "Registro de pagos",
        resource: "payments",
        action: "create",
        status: "active",
        user_id_registration: 1,
        date_time_registration: getLimaDateTime(),
      },

      // Permisos de Asistente Dental (LEGACY - mantener para compatibilidad temporal)
      {
        permission_name: "assistant.dashboard",
        permission_description: "Dashboard de asistente",
        resource: "dashboard",
        action: "view",
        status: "active",
        user_id_registration: 1,
        date_time_registration: getLimaDateTime(),
      },
      {
        permission_name: "assistant.appointments",
        permission_description: "Ver citas del día",
        resource: "appointments",
        action: "view",
        status: "active",
        user_id_registration: 1,
        date_time_registration: getLimaDateTime(),
      },
      {
        permission_name: "assistant.inventory",
        permission_description: "Gestión de inventario",
        resource: "inventory",
        action: "edit",
        status: "active",
        user_id_registration: 1,
        date_time_registration: getLimaDateTime(),
      },

      // Permisos de Técnico de Imágenes
      {
        permission_name: "imaging_dashboard",
        permission_description: "Panel del técnico de imágenes",
        resource: "imaging",
        action: "dashboard",
        status: "active",
        user_id_registration: 1,
        date_time_registration: getLimaDateTime(),
      },
      {
        permission_name: "imaging_requests",
        permission_description: "Gestionar solicitudes de radiografías",
        resource: "imaging",
        action: "requests",
        status: "active",
        user_id_registration: 1,
        date_time_registration: getLimaDateTime(),
      },
      {
        permission_name: "imaging_upload",
        permission_description: "Subir imágenes radiográficas",
        resource: "imaging",
        action: "upload",
        status: "active",
        user_id_registration: 1,
        date_time_registration: getLimaDateTime(),
      },
      {
        permission_name: "imaging_view",
        permission_description: "Visualizar estudios imagenológicos",
        resource: "imaging",
        action: "view",
        status: "active",
        user_id_registration: 1,
        date_time_registration: getLimaDateTime(),
      },
      {
        permission_name: "imaging_reports",
        permission_description: "Generar reportes de productividad",
        resource: "imaging",
        action: "reports",
        status: "active",
        user_id_registration: 1,
        date_time_registration: getLimaDateTime(),
      },

      // Permisos de Paciente
      {
        permission_name: "patient_dashboard",
        permission_description: "Panel del paciente",
        resource: "patient",
        action: "dashboard",
        status: "active",
        user_id_registration: 1,
        date_time_registration: getLimaDateTime(),
      },
      {
        permission_name: "patient_appointments",
        permission_description: "Ver y gestionar citas propias",
        resource: "patient",
        action: "appointments",
        status: "active",
        user_id_registration: 1,
        date_time_registration: getLimaDateTime(),
      },
      {
        permission_name: "patient_history",
        permission_description: "Ver historial médico propio",
        resource: "patient",
        action: "history",
        status: "active",
        user_id_registration: 1,
        date_time_registration: getLimaDateTime(),
      },
      {
        permission_name: "patient_documents",
        permission_description: "Ver documentos médicos propios",
        resource: "patient",
        action: "documents",
        status: "active",
        user_id_registration: 1,
        date_time_registration: getLimaDateTime(),
      },
      {
        permission_name: "patient_payments",
        permission_description: "Ver y realizar pagos",
        resource: "patient",
        action: "payments",
        status: "active",
        user_id_registration: 1,
        date_time_registration: getLimaDateTime(),
      },
      {
        permission_name: "patient_profile",
        permission_description: "Actualizar perfil personal",
        resource: "patient",
        action: "profile",
        status: "active",
        user_id_registration: 1,
        date_time_registration: getLimaDateTime(),
      },

      // Permisos de Cliente Externo
      {
        permission_name: "external_dashboard",
        permission_description: "Panel de cliente externo",
        resource: "external",
        action: "dashboard",
        status: "active",
        user_id_registration: 1,
        date_time_registration: getLimaDateTime(),
      },
      {
        permission_name: "external_requests",
        permission_description: "Crear solicitudes de laboratorio",
        resource: "external",
        action: "requests",
        status: "active",
        user_id_registration: 1,
        date_time_registration: getLimaDateTime(),
      },
      {
        permission_name: "external_tracking",
        permission_description: "Rastrear estado de solicitudes",
        resource: "external",
        action: "tracking",
        status: "active",
        user_id_registration: 1,
        date_time_registration: getLimaDateTime(),
      },
      {
        permission_name: "external_payments",
        permission_description: "Gestionar pagos",
        resource: "external",
        action: "payments",
        status: "active",
        user_id_registration: 1,
        date_time_registration: getLimaDateTime(),
      },
      {
        permission_name: "external_history",
        permission_description: "Ver historial de trabajos",
        resource: "external",
        action: "history",
        status: "active",
        user_id_registration: 1,
        date_time_registration: getLimaDateTime(),
      },
      {
        permission_name: "external_notifications",
        permission_description: "Recibir notificaciones",
        resource: "external",
        action: "notifications",
        status: "active",
        user_id_registration: 1,
        date_time_registration: getLimaDateTime(),
      },
    ],
    skipDuplicates: true,
  });

  // =====================================================
  // 6. ASIGNACIÓN DE PERMISOS A ROLES (roles_permissions)
  // =====================================================
  console.log("🔗 Asignando permisos a roles...");

  const allPermissions = await prisma.permissions.findMany();

  // Super Administrador - Todos los permisos
  const adminPermissions = allPermissions.map((p) => ({
    role_id: 1,
    permission_id: p.permission_id,
    status: "active",
    user_id_registration: 1,
    date_time_registration: getLimaDateTime(),
  }));

  // Administrador de Sede (incluye administrator.users para gestión de usuarios)
  const branchAdminPermissions = allPermissions
    .filter(
      (p) =>
        p.permission_name === "administrator.users" ||
        p.permission_name.startsWith("branchAdmin.") ||
        p.permission_name.startsWith("dentist.") ||
        p.permission_name.startsWith("receptionist."),
    )
    .map((p) => ({
      role_id: 2,
      permission_id: p.permission_id,
      status: "active",
      user_id_registration: 1,
      date_time_registration: getLimaDateTime(),
    }));

  // Odontólogo
  const dentistPermissions = allPermissions
    .filter((p) => p.permission_name.startsWith("dentist."))
    .map((p) => ({
      role_id: 3,
      permission_id: p.permission_id,
      status: "active",
      user_id_registration: 1,
      date_time_registration: getLimaDateTime(),
    }));

  // Recepcionista
  const receptionistPermissions = allPermissions
    .filter((p) => p.permission_name.startsWith("receptionist."))
    .map((p) => ({
      role_id: 4,
      permission_id: p.permission_id,
      status: "active",
      user_id_registration: 1,
      date_time_registration: getLimaDateTime(),
    }));

  // Técnico de Imágenes (incluye permisos legacy de assistant y nuevos de imaging)
  const imagingTechnicianPermissions = allPermissions
    .filter(
      (p) =>
        p.permission_name.startsWith("assistant.") ||
        p.permission_name.startsWith("imaging_"),
    )
    .map((p) => ({
      role_id: 5,
      permission_id: p.permission_id,
      status: "active",
      user_id_registration: 1,
      date_time_registration: getLimaDateTime(),
    }));

  // Paciente
  const patientPermissions = allPermissions
    .filter((p) => p.permission_name.startsWith("patient_"))
    .map((p) => ({
      role_id: 6,
      permission_id: p.permission_id,
      status: "active",
      user_id_registration: 1,
      date_time_registration: getLimaDateTime(),
    }));

  // Cliente Externo
  const externalClientPermissions = allPermissions
    .filter((p) => p.permission_name.startsWith("external_"))
    .map((p) => ({
      role_id: 7,
      permission_id: p.permission_id,
      status: "active",
      user_id_registration: 1,
      date_time_registration: getLimaDateTime(),
    }));

  await prisma.roles_permissions.createMany({
    data: [
      ...adminPermissions,
      ...branchAdminPermissions,
      ...dentistPermissions,
      ...receptionistPermissions,
      ...imagingTechnicianPermissions,
      ...patientPermissions,
      ...externalClientPermissions,
    ],
    skipDuplicates: true,
  });

  // =====================================================
  // 7. ESPECIALIDADES (specialties)
  // =====================================================
  console.log("🦷 Poblando especialidades odontológicas...");
  await prisma.specialties.createMany({
    data: [
      {
        specialty_name: "Odontología General",
        specialty_description: "Atención dental integral y preventiva",
        status: "active",
        user_id_registration: 1,
        date_time_registration: getLimaDateTime(),
      },
      {
        specialty_name: "Ortodoncia",
        specialty_description:
          "Corrección de malposiciones dentales y maxilares",
        status: "active",
        user_id_registration: 1,
        date_time_registration: getLimaDateTime(),
      },
      {
        specialty_name: "Endodoncia",
        specialty_description: "Tratamiento de conductos radiculares",
        status: "active",
        user_id_registration: 1,
        date_time_registration: getLimaDateTime(),
      },
      {
        specialty_name: "Periodoncia",
        specialty_description: "Tratamiento de enfermedades de las encías",
        status: "active",
        user_id_registration: 1,
        date_time_registration: getLimaDateTime(),
      },
      {
        specialty_name: "Implantología",
        specialty_description: "Colocación de implantes dentales",
        status: "active",
        user_id_registration: 1,
        date_time_registration: getLimaDateTime(),
      },
      {
        specialty_name: "Odontopediatría",
        specialty_description: "Atención dental especializada en niños",
        status: "active",
        user_id_registration: 1,
        date_time_registration: getLimaDateTime(),
      },
      {
        specialty_name: "Cirugía Oral y Maxilofacial",
        specialty_description: "Cirugías de boca, mandíbula y rostro",
        status: "active",
        user_id_registration: 1,
        date_time_registration: getLimaDateTime(),
      },
      {
        specialty_name: "Rehabilitación Oral",
        specialty_description: "Restauración completa de la función dental",
        status: "active",
        user_id_registration: 1,
        date_time_registration: getLimaDateTime(),
      },
      {
        specialty_name: "Estética Dental",
        specialty_description: "Tratamientos estéticos y blanqueamiento",
        status: "active",
        user_id_registration: 1,
        date_time_registration: getLimaDateTime(),
      },
    ],
    skipDuplicates: true,
  });

  // =====================================================
  // 8. ODONTÓLOGOS (dentists) - Necesita user_id y specialty_id
  // =====================================================
  console.log("👨‍⚕️ Creando perfiles de odontólogos...");
  await prisma.dentists.createMany({
    data: [
      {
        user_id: 5, // Dr. Roberto Fernández
        specialty_id: 2, // Ortodoncia
        professional_license: "COP-45623",
        license_country: "Perú",
        bio: "Especialista en ortodoncia con 12 años de experiencia. Egresado de la Universidad Peruana Cayetano Heredia.",
        years_experience: 12,
        consultation_fee: 150.0,
        status: "active",
        user_id_registration: 1,
        date_time_registration: getLimaDateTime(),
      },
      {
        user_id: 6, // Dra. Patricia Castillo
        specialty_id: 3, // Endodoncia
        professional_license: "COP-38921",
        license_country: "Perú",
        bio: "Endodoncista con amplia experiencia en tratamientos de conducto. Maestría en UNMSM.",
        years_experience: 10,
        consultation_fee: 140.0,
        status: "active",
        user_id_registration: 1,
        date_time_registration: getLimaDateTime(),
      },
      {
        user_id: 7, // Dr. Jorge García
        specialty_id: 5, // Implantología
        professional_license: "COP-52341",
        license_country: "Perú",
        bio: "Especialista en implantes dentales y cirugía oral. Certificación internacional en implantología.",
        years_experience: 15,
        consultation_fee: 200.0,
        status: "active",
        user_id_registration: 1,
        date_time_registration: getLimaDateTime(),
      },
      {
        user_id: 8, // Dra. Carmen López
        specialty_id: 6, // Odontopediatría
        professional_license: "COP-41287",
        license_country: "Perú",
        bio: "Odontopediatra con vocación por el cuidado dental infantil. Especialización en UPCH.",
        years_experience: 8,
        consultation_fee: 120.0,
        status: "active",
        user_id_registration: 1,
        date_time_registration: getLimaDateTime(),
      },
      {
        user_id: 9, // Dr. Ricardo Morales
        specialty_id: 4, // Periodoncia
        professional_license: "COP-49856",
        license_country: "Perú",
        bio: "Periodoncista dedicado al tratamiento de enfermedades de las encías y tejidos de soporte.",
        years_experience: 11,
        consultation_fee: 145.0,
        status: "active",
        user_id_registration: 1,
        date_time_registration: getLimaDateTime(),
      },
      {
        user_id: 10, // Dra. Sandra Rodríguez
        specialty_id: 8, // Rehabilitación Oral
        professional_license: "COP-44782",
        license_country: "Perú",
        bio: "Especialista en rehabilitación oral y prótesis dentales. Docente universitaria.",
        years_experience: 13,
        consultation_fee: 160.0,
        status: "active",
        user_id_registration: 1,
        date_time_registration: getLimaDateTime(),
      },
    ],
    skipDuplicates: true,
  });

  // =====================================================
  // 8.1 ESPECIALIDADES DE ODONTÓLOGOS (dentist_specialties)
  // =====================================================
  console.log("🦷 Poblando especialidades de odontólogos...");
  await prisma.dentist_specialties.createMany({
    data: [
      // Dentist 1 - Dr. Carlos Mendoza: Odontología General + Estética Dental
      {
        dentist_id: 1,
        specialty_id: 1,
        is_primary: true,
        status: "active",
        user_id_registration: 1,
        date_time_registration: getLimaDateTime(),
      },
      {
        dentist_id: 1,
        specialty_id: 9,
        is_primary: false,
        status: "active",
        user_id_registration: 1,
        date_time_registration: getLimaDateTime(),
      },
      // Dentist 2 - Dra. María García: Endodoncia + Periodoncia
      {
        dentist_id: 2,
        specialty_id: 3,
        is_primary: true,
        status: "active",
        user_id_registration: 1,
        date_time_registration: getLimaDateTime(),
      },
      {
        dentist_id: 2,
        specialty_id: 4,
        is_primary: false,
        status: "active",
        user_id_registration: 1,
        date_time_registration: getLimaDateTime(),
      },
      // Dentist 3 - Dr. Jorge Ramírez: Ortodoncia + Odontología General
      {
        dentist_id: 3,
        specialty_id: 2,
        is_primary: true,
        status: "active",
        user_id_registration: 1,
        date_time_registration: getLimaDateTime(),
      },
      {
        dentist_id: 3,
        specialty_id: 1,
        is_primary: false,
        status: "active",
        user_id_registration: 1,
        date_time_registration: getLimaDateTime(),
      },
      // Dentist 4 - Dra. Ana Torres: Odontopediatría (primary) + Rehabilitación Oral
      {
        dentist_id: 4,
        specialty_id: 6,
        is_primary: true,
        status: "active",
        user_id_registration: 1,
        date_time_registration: getLimaDateTime(),
      },
      {
        dentist_id: 4,
        specialty_id: 8,
        is_primary: false,
        status: "active",
        user_id_registration: 1,
        date_time_registration: getLimaDateTime(),
      },
      // Dentist 5 - Dr. Roberto Díaz: Implantología + Cirugía Oral y Maxilofacial
      {
        dentist_id: 5,
        specialty_id: 5,
        is_primary: true,
        status: "active",
        user_id_registration: 1,
        date_time_registration: getLimaDateTime(),
      },
      {
        dentist_id: 5,
        specialty_id: 7,
        is_primary: false,
        status: "active",
        user_id_registration: 1,
        date_time_registration: getLimaDateTime(),
      },
      // Dentist 6 - Dra. Patricia Vega: Rehabilitación Oral + Estética Dental
      {
        dentist_id: 6,
        specialty_id: 8,
        is_primary: true,
        status: "active",
        user_id_registration: 1,
        date_time_registration: getLimaDateTime(),
      },
      {
        dentist_id: 6,
        specialty_id: 9,
        is_primary: false,
        status: "active",
        user_id_registration: 1,
        date_time_registration: getLimaDateTime(),
      },
    ],
    skipDuplicates: true,
  });

  // =====================================================
  // 9. TIPOS DE IDENTIFICACIÓN (identification_types)
  // =====================================================
  console.log("🆔 Poblando tipos de identificación...");
  await prisma.identification_types.createMany({
    data: [
      {
        type_name: "DNI",
        type_code: "DNI",
        country: "Perú",
        status: "active",
        user_id_registration: 1,
        date_time_registration: getLimaDateTime(),
      },
      {
        type_name: "Carnet de Extranjería",
        type_code: "CE",
        country: "Perú",
        status: "active",
        user_id_registration: 1,
        date_time_registration: getLimaDateTime(),
      },
      {
        type_name: "Pasaporte",
        type_code: "PASS",
        country: "Internacional",
        status: "active",
        user_id_registration: 1,
        date_time_registration: getLimaDateTime(),
      },
      {
        type_name: "RUC",
        type_code: "RUC",
        country: "Perú",
        status: "active",
        user_id_registration: 1,
        date_time_registration: getLimaDateTime(),
      },
    ],
    skipDuplicates: true,
  });

  // =====================================================
  // 10. GÉNEROS (genders)
  // =====================================================
  console.log("⚥ Poblando géneros...");
  await prisma.genders.createMany({
    data: [
      {
        gender_name: "Masculino",
        gender_code: "M",
        status: "active",
        user_id_registration: 1,
        date_time_registration: getLimaDateTime(),
      },
      {
        gender_name: "Femenino",
        gender_code: "F",
        status: "active",
        user_id_registration: 1,
        date_time_registration: getLimaDateTime(),
      },
      {
        gender_name: "Otro",
        gender_code: "O",
        status: "active",
        user_id_registration: 1,
        date_time_registration: getLimaDateTime(),
      },
    ],
    skipDuplicates: true,
  });

  // =====================================================
  // 11. TIPOS DE SANGRE (blood_types)
  // =====================================================
  console.log("🩸 Poblando tipos de sangre...");
  await prisma.blood_types.createMany({
    data: [
      {
        blood_type_name: "A+",
        status: "active",
        user_id_registration: 1,
        date_time_registration: getLimaDateTime(),
      },
      {
        blood_type_name: "A-",
        status: "active",
        user_id_registration: 1,
        date_time_registration: getLimaDateTime(),
      },
      {
        blood_type_name: "B+",
        status: "active",
        user_id_registration: 1,
        date_time_registration: getLimaDateTime(),
      },
      {
        blood_type_name: "B-",
        status: "active",
        user_id_registration: 1,
        date_time_registration: getLimaDateTime(),
      },
      {
        blood_type_name: "AB+",
        status: "active",
        user_id_registration: 1,
        date_time_registration: getLimaDateTime(),
      },
      {
        blood_type_name: "AB-",
        status: "active",
        user_id_registration: 1,
        date_time_registration: getLimaDateTime(),
      },
      {
        blood_type_name: "O+",
        status: "active",
        user_id_registration: 1,
        date_time_registration: getLimaDateTime(),
      },
      {
        blood_type_name: "O-",
        status: "active",
        user_id_registration: 1,
        date_time_registration: getLimaDateTime(),
      },
    ],
    skipDuplicates: true,
  });

  // =====================================================
  // 12. ESTADOS CIVILES (marital_statuses)
  // =====================================================
  console.log("💑 Poblando estados civiles...");
  await prisma.marital_statuses.createMany({
    data: [
      {
        status_name: "Soltero(a)",
        status_code: "S",
        status: "active",
        user_id_registration: 1,
        date_time_registration: getLimaDateTime(),
      },
      {
        status_name: "Casado(a)",
        status_code: "C",
        status: "active",
        user_id_registration: 1,
        date_time_registration: getLimaDateTime(),
      },
      {
        status_name: "Divorciado(a)",
        status_code: "D",
        status: "active",
        user_id_registration: 1,
        date_time_registration: getLimaDateTime(),
      },
      {
        status_name: "Viudo(a)",
        status_code: "V",
        status: "active",
        user_id_registration: 1,
        date_time_registration: getLimaDateTime(),
      },
      {
        status_name: "Conviviente",
        status_code: "CV",
        status: "active",
        user_id_registration: 1,
        date_time_registration: getLimaDateTime(),
      },
    ],
    skipDuplicates: true,
  });

  // =====================================================
  // 13. PACIENTES (patients) - Vinculados a users 15, 16, 17
  // =====================================================
  console.log("🧑‍🦱 Poblando pacientes...");

  // Paciente 1 → user_id 15 (Juan Carlos Pérez Gómez)
  await prisma.patients.create({
    data: {
      user_id: 15,
      branch_id: 1,
      identification_type_id: 1,
      identification_number: "47856321",
      first_name: "Juan Carlos",
      last_name: "Pérez Gómez",
      birth_date: getLimaDate("1985-03-15"),
      gender_id: 1,
      blood_type_id: 7,
      marital_status_id: 1,
      email: "jcperez@gmail.com",
      mobile: "987123456",
      address: "Av. Arequipa 2345, Lince",
      city: "Lima",
      country: "Perú",
      emergency_contact_name: "Contacto de Emergencia",
      emergency_contact_phone: "987000100",
      emergency_contact_relationship: "Familiar",
      is_basic_registration: false,
      completed_at: getLimaDateTime(),
      medical_record_number: "MED-2025001",
      status: "active",
      user_id_registration: 1,
      date_time_registration: getLimaDateTime(),
    },
  });

  // Paciente 2 → user_id 16 (María Elena Torres Vásquez)
  await prisma.patients.create({
    data: {
      user_id: 16,
      branch_id: 1,
      identification_type_id: 1,
      identification_number: "52341876",
      first_name: "María Elena",
      last_name: "Torres Vásquez",
      birth_date: getLimaDate("1992-07-22"),
      gender_id: 2,
      blood_type_id: 1,
      marital_status_id: 2,
      email: "metorres@hotmail.com",
      mobile: "987234567",
      address: "Jr. Los Olivos 456, San Isidro",
      city: "Lima",
      country: "Perú",
      emergency_contact_name: "Contacto de Emergencia",
      emergency_contact_phone: "987000101",
      emergency_contact_relationship: "Familiar",
      is_basic_registration: false,
      completed_at: getLimaDateTime(),
      medical_record_number: "MED-2025002",
      status: "active",
      user_id_registration: 1,
      date_time_registration: getLimaDateTime(),
    },
  });

  // Paciente 3 → user_id 17 (Pedro Antonio Ramírez Silva)
  await prisma.patients.create({
    data: {
      user_id: 17,
      branch_id: 2,
      identification_type_id: 1,
      identification_number: "41237865",
      first_name: "Pedro Antonio",
      last_name: "Ramírez Silva",
      birth_date: getLimaDate("1978-11-10"),
      gender_id: 1,
      blood_type_id: 3,
      marital_status_id: 1,
      email: "pasilva@yahoo.com",
      mobile: "987345678",
      address: "Calle Las Magnolias 789, Surco",
      city: "Lima",
      country: "Perú",
      emergency_contact_name: "Contacto de Emergencia",
      emergency_contact_phone: "987000102",
      emergency_contact_relationship: "Familiar",
      is_basic_registration: false,
      completed_at: getLimaDateTime(),
      medical_record_number: "MED-2025003",
      status: "active",
      user_id_registration: 1,
      date_time_registration: getLimaDateTime(),
    },
  });

  // =====================================================
  // 14. PROCEDIMIENTOS DENTALES (dental_procedures)
  // =====================================================
  console.log("🦷 Poblando procedimientos dentales...");
  await prisma.dental_procedures.createMany({
    data: [
      {
        procedure_code: "PROC-001",
        procedure_name: "Limpieza Dental (Profilaxis)",
        procedure_category: "Preventivo",
        description: "Limpieza profesional de dientes",
        default_price: 120.0,
        estimated_duration: 30,
        status: "active",
        user_id_registration: 1,
        date_time_registration: getLimaDateTime(),
      },
      {
        procedure_code: "PROC-002",
        procedure_name: "Extracción Simple",
        procedure_category: "Cirugía",
        description: "Extracción de pieza dental sin complicaciones",
        default_price: 150.0,
        estimated_duration: 30,
        requires_anesthesia: true,
        status: "active",
        user_id_registration: 1,
        date_time_registration: getLimaDateTime(),
      },
      {
        procedure_code: "PROC-003",
        procedure_name: "Extracción Compleja",
        procedure_category: "Cirugía",
        description: "Extracción quirúrgica de pieza dental",
        default_price: 300.0,
        estimated_duration: 60,
        requires_anesthesia: true,
        status: "active",
        user_id_registration: 1,
        date_time_registration: getLimaDateTime(),
      },
      {
        procedure_code: "PROC-004",
        procedure_name: "Resina Dental",
        procedure_category: "Restaurador",
        description: "Obturación con resina compuesta",
        default_price: 180.0,
        estimated_duration: 45,
        status: "active",
        user_id_registration: 1,
        date_time_registration: getLimaDateTime(),
      },
      {
        procedure_code: "PROC-005",
        procedure_name: "Tratamiento de Conducto (Endodoncia)",
        procedure_category: "Endodoncia",
        description: "Tratamiento de conductos radiculares",
        default_price: 450.0,
        estimated_duration: 90,
        requires_anesthesia: true,
        status: "active",
        user_id_registration: 1,
        date_time_registration: getLimaDateTime(),
      },
      {
        procedure_code: "PROC-006",
        procedure_name: "Corona Dental",
        procedure_category: "Rehabilitación",
        description: "Colocación de corona de porcelana",
        default_price: 800.0,
        estimated_duration: 60,
        status: "active",
        user_id_registration: 1,
        date_time_registration: getLimaDateTime(),
      },
      {
        procedure_code: "PROC-007",
        procedure_name: "Blanqueamiento Dental",
        procedure_category: "Estética",
        description: "Blanqueamiento dental profesional",
        default_price: 600.0,
        estimated_duration: 60,
        status: "active",
        user_id_registration: 1,
        date_time_registration: getLimaDateTime(),
      },
      {
        procedure_code: "PROC-008",
        procedure_name: "Implante Dental",
        procedure_category: "Implantología",
        description: "Colocación de implante de titanio",
        default_price: 2500.0,
        estimated_duration: 120,
        requires_anesthesia: true,
        status: "active",
        user_id_registration: 1,
        date_time_registration: getLimaDateTime(),
      },
      {
        procedure_code: "PROC-009",
        procedure_name: "Ortodoncia - Bracket Metálico",
        procedure_category: "Ortodoncia",
        description: "Instalación de brackets metálicos",
        default_price: 350.0,
        estimated_duration: 60,
        status: "active",
        user_id_registration: 1,
        date_time_registration: getLimaDateTime(),
      },
      {
        procedure_code: "PROC-010",
        procedure_name: "Ortodoncia - Bracket Estético",
        procedure_category: "Ortodoncia",
        description: "Instalación de brackets cerámicos",
        default_price: 500.0,
        estimated_duration: 60,
        status: "active",
        user_id_registration: 1,
        date_time_registration: getLimaDateTime(),
      },
      {
        procedure_code: "PROC-011",
        procedure_name: "Prótesis Dental Removible",
        procedure_category: "Rehabilitación",
        description: "Prótesis dental removible",
        default_price: 1200.0,
        estimated_duration: 45,
        status: "active",
        user_id_registration: 1,
        date_time_registration: getLimaDateTime(),
      },
      {
        procedure_code: "PROC-012",
        procedure_name: "Radiografía Panorámica",
        procedure_category: "Diagnóstico",
        description: "Radiografía panorámica digital",
        default_price: 80.0,
        estimated_duration: 15,
        status: "active",
        user_id_registration: 1,
        date_time_registration: getLimaDateTime(),
      },
      {
        procedure_code: "PROC-013",
        procedure_name: "Destartraje (Limpieza Profunda)",
        procedure_category: "Periodoncia",
        description: "Limpieza profunda de encías",
        default_price: 250.0,
        estimated_duration: 60,
        status: "active",
        user_id_registration: 1,
        date_time_registration: getLimaDateTime(),
      },
      {
        procedure_code: "PROC-014",
        procedure_name: "Aplicación de Flúor",
        procedure_category: "Preventivo",
        description: "Aplicación de barniz de flúor",
        default_price: 50.0,
        estimated_duration: 15,
        status: "active",
        user_id_registration: 1,
        date_time_registration: getLimaDateTime(),
      },
      {
        procedure_code: "PROC-015",
        procedure_name: "Sellantes Dentales",
        procedure_category: "Preventivo",
        description: "Aplicación de sellantes en molares",
        default_price: 80.0,
        estimated_duration: 30,
        status: "active",
        user_id_registration: 1,
        date_time_registration: getLimaDateTime(),
      },
    ],
    skipDuplicates: true,
  });

  // =====================================================
  // 15. ESTADOS DE CITA (appointment_statuses)
  // =====================================================
  console.log("📅 Poblando estados de citas...");

  // Crear estado con ID 0 primero (Pendiente de Aprobación)
  await prisma.$executeRaw`
    INSERT INTO appointment_statuses (appointment_status_id, status_name, status_code, status_color, status, user_id_registration, date_time_registration)
    VALUES (0, 'Pendiente de Aprobación', 'PENDING_APPROVAL', '#9CA3AF', 'active', 1, NOW())
    ON CONFLICT (appointment_status_id) DO NOTHING
  `;

  await prisma.appointment_statuses.createMany({
    data: [
      {
        status_name: "Programada",
        status_code: "SCHEDULED",
        status_color: "#3B82F6",
        status: "active",
        user_id_registration: 1,
        date_time_registration: getLimaDateTime(),
      },
      {
        status_name: "Confirmada",
        status_code: "CONFIRMED",
        status_color: "#10B981",
        status: "active",
        user_id_registration: 1,
        date_time_registration: getLimaDateTime(),
      },
      {
        status_name: "En Proceso",
        status_code: "IN_PROGRESS",
        status_color: "#F59E0B",
        status: "active",
        user_id_registration: 1,
        date_time_registration: getLimaDateTime(),
      },
      {
        status_name: "Completada",
        status_code: "COMPLETED",
        status_color: "#059669",
        status: "active",
        user_id_registration: 1,
        date_time_registration: getLimaDateTime(),
      },
      {
        status_name: "Cancelada",
        status_code: "CANCELLED",
        status_color: "#EF4444",
        status: "active",
        user_id_registration: 1,
        date_time_registration: getLimaDateTime(),
      },
      {
        status_name: "No Asistió",
        status_code: "NO_SHOW",
        status_color: "#DC2626",
        status: "active",
        user_id_registration: 1,
        date_time_registration: getLimaDateTime(),
      },
      {
        status_name: "Reprogramada",
        status_code: "RESCHEDULED",
        status_color: "#8B5CF6",
        status: "active",
        user_id_registration: 1,
        date_time_registration: getLimaDateTime(),
      },
      {
        status_name: "Rechazada",
        status_code: "REJECTED",
        status_color: "#DC2626",
        status: "active",
        user_id_registration: 1,
        date_time_registration: getLimaDateTime(),
      },
    ],
    skipDuplicates: true,
  });

  // =====================================================
  // 16. MÉTODOS DE PAGO (payment_methods)
  // =====================================================
  console.log("💳 Poblando métodos de pago...");
  await prisma.payment_methods.createMany({
    data: [
      {
        method_name: "Efectivo",
        method_code: "CASH",
        requires_reference: false,
        is_electronic: false,
        status: "active",
        user_id_registration: 1,
        date_time_registration: getLimaDateTime(),
      },
      {
        method_name: "Tarjeta de Débito",
        method_code: "DEBIT",
        requires_reference: true,
        is_electronic: true,
        status: "active",
        user_id_registration: 1,
        date_time_registration: getLimaDateTime(),
      },
      {
        method_name: "Tarjeta de Crédito",
        method_code: "CREDIT",
        requires_reference: true,
        is_electronic: true,
        status: "active",
        user_id_registration: 1,
        date_time_registration: getLimaDateTime(),
      },
      {
        method_name: "Transferencia Bancaria",
        method_code: "TRANSFER",
        requires_reference: true,
        is_electronic: true,
        status: "active",
        user_id_registration: 1,
        date_time_registration: getLimaDateTime(),
      },
      {
        method_name: "Yape",
        method_code: "YAPE",
        requires_reference: true,
        is_electronic: true,
        status: "active",
        user_id_registration: 1,
        date_time_registration: getLimaDateTime(),
      },
      {
        method_name: "Plin",
        method_code: "PLIN",
        requires_reference: true,
        is_electronic: true,
        status: "active",
        user_id_registration: 1,
        date_time_registration: getLimaDateTime(),
      },
      {
        method_name: "Depósito Bancario",
        method_code: "DEPOSIT",
        requires_reference: true,
        is_electronic: false,
        status: "active",
        user_id_registration: 1,
        date_time_registration: getLimaDateTime(),
      },
    ],
    skipDuplicates: true,
  });

  // =====================================================
  // 16.1 MÉTODOS DE PAGO POR SEDE (branch_payment_methods)
  // =====================================================
  console.log("💳 Poblando métodos de pago por sede...");
  await prisma.branch_payment_methods.createMany({
    data: [
      {
        branch_id: 1,
        method_type: "yape",
        method_name: "Yape MyDent",
        account_holder: "MyDent SAC",
        phone_number: "999888777",
        is_active: true,
        status: "active",
        user_id_registration: 1,
        date_time_registration: getLimaDateTime(),
      },
      {
        branch_id: 1,
        method_type: "plin",
        method_name: "Plin MyDent",
        account_holder: "MyDent SAC",
        phone_number: "999888777",
        is_active: true,
        status: "active",
        user_id_registration: 1,
        date_time_registration: getLimaDateTime(),
      },
      {
        branch_id: 1,
        method_type: "bank_transfer",
        method_name: "BCP - Cuenta Corriente",
        bank_name: "BCP",
        account_number: "191-12345678-0-12",
        account_holder: "MyDent SAC",
        is_active: true,
        status: "active",
        user_id_registration: 1,
        date_time_registration: getLimaDateTime(),
      },
    ],
    skipDuplicates: true,
  });

  // =====================================================
  // 17. CITAS (appointments) - Ejemplos
  // =====================================================
  console.log("📆 Poblando citas de ejemplo...");

  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const nextWeek = new Date(today);
  nextWeek.setDate(nextWeek.getDate() + 7);

  await prisma.appointments.createMany({
    data: [
      {
        patient_id: 1,
        dentist_id: 1, // Dr. Fernández
        branch_id: 1,
        specialty_id: 2, // Ortodoncia
        appointment_status_id: 2, // Confirmada
        appointment_date: tomorrow,
        start_time: new Date("1970-01-01T09:00:00Z"),
        end_time: new Date("1970-01-01T09:30:00Z"),
        appointment_type: "Consulta",
        reason: "Revisión de brackets",
        duration: 30,
        price: 150.0,
        confirmed: true,
        confirmed_at: getLimaDateTime(),
        confirmed_by: 11, // Recepcionista
        status: "active",
        user_id_registration: 11,
        date_time_registration: getLimaDateTime(),
      },
      {
        patient_id: 2,
        dentist_id: 2, // Dra. Castillo
        branch_id: 1,
        specialty_id: 3, // Endodoncia
        appointment_status_id: 1, // Programada
        appointment_date: nextWeek,
        start_time: new Date("1970-01-01T10:00:00Z"),
        end_time: new Date("1970-01-01T11:30:00Z"),
        appointment_type: "Tratamiento",
        reason: "Tratamiento de conducto",
        duration: 90,
        price: 450.0,
        confirmed: false,
        status: "active",
        user_id_registration: 11,
        date_time_registration: getLimaDateTime(),
      },
      {
        patient_id: 3,
        dentist_id: 4, // Dra. López
        branch_id: 2,
        specialty_id: 6, // Odontopediatría
        appointment_status_id: 2, // Confirmada
        appointment_date: tomorrow,
        start_time: new Date("1970-01-01T11:00:00Z"),
        end_time: new Date("1970-01-01T11:30:00Z"),
        appointment_type: "Control",
        reason: "Control pediátrico",
        duration: 30,
        price: 120.0,
        confirmed: true,
        confirmed_at: getLimaDateTime(),
        confirmed_by: 12,
        status: "active",
        user_id_registration: 12,
        date_time_registration: getLimaDateTime(),
      },
    ],
    skipDuplicates: true,
  });

  // =====================================================
  // 18. CONSULTORIOS (consultation_rooms)
  // =====================================================
  console.log("🏥 Poblando consultorios...");
  await prisma.consultation_rooms.createMany({
    data: [
      {
        branch_id: 1,
        room_name: "Consultorio 1",
        room_code: "C1-SI",
        floor: "1",
        capacity: 1,
        equipment_description: "Sillón dental, lámpara, unidad dental completa",
        is_active: true,
        status: "active",
        user_id_registration: 1,
        date_time_registration: getLimaDateTime(),
      },
      {
        branch_id: 1,
        room_name: "Consultorio 2",
        room_code: "C2-SI",
        floor: "1",
        capacity: 1,
        equipment_description: "Sillón dental, lámpara, unidad dental completa",
        is_active: true,
        status: "active",
        user_id_registration: 1,
        date_time_registration: getLimaDateTime(),
      },
      {
        branch_id: 1,
        room_name: "Consultorio 3 - Cirugía",
        room_code: "C3-SI",
        floor: "2",
        capacity: 1,
        equipment_description:
          "Equipamiento quirúrgico, sillón dental especializado",
        is_active: true,
        status: "active",
        user_id_registration: 1,
        date_time_registration: getLimaDateTime(),
      },
      {
        branch_id: 2,
        room_name: "Consultorio 1",
        room_code: "C1-MF",
        floor: "1",
        capacity: 1,
        equipment_description: "Sillón dental, lámpara, unidad dental completa",
        is_active: true,
        status: "active",
        user_id_registration: 1,
        date_time_registration: getLimaDateTime(),
      },
      {
        branch_id: 2,
        room_name: "Consultorio 2",
        room_code: "C2-MF",
        floor: "1",
        capacity: 1,
        equipment_description: "Sillón dental pediátrico, decoración infantil",
        is_active: true,
        status: "active",
        user_id_registration: 1,
        date_time_registration: getLimaDateTime(),
      },
      {
        branch_id: 3,
        room_name: "Consultorio 1",
        room_code: "C1-SU",
        floor: "1",
        capacity: 1,
        equipment_description: "Sillón dental, lámpara, unidad dental completa",
        is_active: true,
        status: "active",
        user_id_registration: 1,
        date_time_registration: getLimaDateTime(),
      },
      {
        branch_id: 3,
        room_name: "Consultorio 2",
        room_code: "C2-SU",
        floor: "1",
        capacity: 1,
        equipment_description: "Sillón dental, lámpara, unidad dental completa",
        is_active: true,
        status: "active",
        user_id_registration: 1,
        date_time_registration: getLimaDateTime(),
      },
    ],
    skipDuplicates: true,
  });

  // =====================================================
  // 19. POSICIONES DE DIENTES (tooth_positions)
  // =====================================================
  console.log("🦷 Poblando posiciones dentales...");

  const toothPositions = [];

  // Sistema FDI para adultos (cuadrantes 1-4)
  for (let quadrant = 1; quadrant <= 4; quadrant++) {
    for (let tooth = 1; tooth <= 8; tooth++) {
      const toothNumber = `${quadrant}${tooth}`;
      const toothNames = {
        1: "Incisivo Central",
        2: "Incisivo Lateral",
        3: "Canino",
        4: "Primer Premolar",
        5: "Segundo Premolar",
        6: "Primer Molar",
        7: "Segundo Molar",
        8: "Tercer Molar (Muela del Juicio)",
      };
      toothPositions.push({
        tooth_number: toothNumber,
        tooth_name: toothNames[tooth],
        quadrant: quadrant,
        tooth_type: tooth <= 3 ? "Anterior" : "Posterior",
        is_adult: true,
        status: "active",
        user_id_registration: 1,
        date_time_registration: getLimaDateTime(),
      });
    }
  }

  // Sistema FDI para niños (cuadrantes 5-8)
  for (let quadrant = 5; quadrant <= 8; quadrant++) {
    for (let tooth = 1; tooth <= 5; tooth++) {
      const toothNumber = `${quadrant}${tooth}`;
      const toothNames = {
        1: "Incisivo Central Deciduo",
        2: "Incisivo Lateral Deciduo",
        3: "Canino Deciduo",
        4: "Primer Molar Deciduo",
        5: "Segundo Molar Deciduo",
      };
      toothPositions.push({
        tooth_number: toothNumber,
        tooth_name: toothNames[tooth],
        quadrant: quadrant,
        tooth_type: tooth <= 3 ? "Anterior" : "Posterior",
        is_adult: false,
        status: "active",
        user_id_registration: 1,
        date_time_registration: getLimaDateTime(),
      });
    }
  }

  await prisma.tooth_positions.createMany({
    data: toothPositions,
    skipDuplicates: true,
  });

  // =====================================================
  // 20. SUPERFICIES DENTALES (tooth_surfaces)
  // =====================================================
  console.log("🦷 Poblando superficies dentales...");
  await prisma.tooth_surfaces.createMany({
    data: [
      {
        surface_code: "V",
        surface_name: "Vestibular",
        description: "Cara externa del diente hacia labios o mejillas",
        status: "active",
        user_id_registration: 1,
        date_time_registration: getLimaDateTime(),
      },
      {
        surface_code: "L",
        surface_name: "Lingual/Palatina",
        description: "Cara interna del diente hacia lengua o paladar",
        status: "active",
        user_id_registration: 1,
        date_time_registration: getLimaDateTime(),
      },
      {
        surface_code: "M",
        surface_name: "Mesial",
        description: "Cara del diente hacia la línea media",
        status: "active",
        user_id_registration: 1,
        date_time_registration: getLimaDateTime(),
      },
      {
        surface_code: "D",
        surface_name: "Distal",
        description: "Cara del diente alejada de la línea media",
        status: "active",
        user_id_registration: 1,
        date_time_registration: getLimaDateTime(),
      },
      {
        surface_code: "C",
        surface_name: "Corona",
        description:
          "Superficie central/superior del diente (oclusal en molares, incisal en incisivos)",
        status: "active",
        user_id_registration: 1,
        date_time_registration: getLimaDateTime(),
      },
    ],
    skipDuplicates: true,
  });

  // =====================================================
  // 21. ESTADOS DE TRATAMIENTO (treatment_statuses)
  // =====================================================
  console.log("📋 Poblando estados de tratamiento...");
  await prisma.treatment_statuses.createMany({
    data: [
      {
        status_name: "Pendiente",
        status_code: "PENDING",
        status_color: "#F59E0B",
        status: "active",
        user_id_registration: 1,
        date_time_registration: getLimaDateTime(),
      },
      {
        status_name: "En Proceso",
        status_code: "IN_PROGRESS",
        status_color: "#3B82F6",
        status: "active",
        user_id_registration: 1,
        date_time_registration: getLimaDateTime(),
      },
      {
        status_name: "Completado",
        status_code: "COMPLETED",
        status_color: "#10B981",
        status: "active",
        user_id_registration: 1,
        date_time_registration: getLimaDateTime(),
      },
      {
        status_name: "Cancelado",
        status_code: "CANCELLED",
        status_color: "#EF4444",
        status: "active",
        user_id_registration: 1,
        date_time_registration: getLimaDateTime(),
      },
    ],
    skipDuplicates: true,
  });

  // =====================================================
  // 22. ESTADOS DE PLAN DE TRATAMIENTO (treatment_plan_statuses)
  // =====================================================
  console.log("📋 Poblando estados de plan de tratamiento...");
  await prisma.treatment_plan_statuses.createMany({
    data: [
      {
        status_name: "Borrador",
        status_code: "DRAFT",
        status_color: "#9CA3AF",
        status: "active",
        user_id_registration: 1,
        date_time_registration: getLimaDateTime(),
      },
      {
        status_name: "Pendiente de Aprobación",
        status_code: "PENDING",
        status_color: "#F59E0B",
        status: "active",
        user_id_registration: 1,
        date_time_registration: getLimaDateTime(),
      },
      {
        status_name: "Aprobado",
        status_code: "APPROVED",
        status_color: "#10B981",
        status: "active",
        user_id_registration: 1,
        date_time_registration: getLimaDateTime(),
      },
      {
        status_name: "En Tratamiento",
        status_code: "IN_PROGRESS",
        status_color: "#3B82F6",
        status: "active",
        user_id_registration: 1,
        date_time_registration: getLimaDateTime(),
      },
      {
        status_name: "Completado",
        status_code: "COMPLETED",
        status_color: "#059669",
        status: "active",
        user_id_registration: 1,
        date_time_registration: getLimaDateTime(),
      },
      {
        status_name: "Cancelado",
        status_code: "CANCELLED",
        status_color: "#EF4444",
        status: "active",
        user_id_registration: 1,
        date_time_registration: getLimaDateTime(),
      },
    ],
    skipDuplicates: true,
  });

  // =====================================================
  // 23. ESTADOS DE PRESUPUESTO (budget_statuses)
  // =====================================================
  console.log("💰 Poblando estados de presupuesto...");
  await prisma.budget_statuses.createMany({
    data: [
      {
        status_name: "Borrador",
        status_code: "DRAFT",
        status_color: "#9CA3AF",
        status: "active",
        user_id_registration: 1,
        date_time_registration: getLimaDateTime(),
      },
      {
        status_name: "Enviado",
        status_code: "SENT",
        status_color: "#3B82F6",
        status: "active",
        user_id_registration: 1,
        date_time_registration: getLimaDateTime(),
      },
      {
        status_name: "Aceptado",
        status_code: "ACCEPTED",
        status_color: "#10B981",
        status: "active",
        user_id_registration: 1,
        date_time_registration: getLimaDateTime(),
      },
      {
        status_name: "Rechazado",
        status_code: "REJECTED",
        status_color: "#EF4444",
        status: "active",
        user_id_registration: 1,
        date_time_registration: getLimaDateTime(),
      },
      {
        status_name: "Expirado",
        status_code: "EXPIRED",
        status_color: "#DC2626",
        status: "active",
        user_id_registration: 1,
        date_time_registration: getLimaDateTime(),
      },
    ],
    skipDuplicates: true,
  });

  // =====================================================
  // 24. PLANES DE SALUD (health_plans)
  // =====================================================
  console.log("💳 Poblando planes de salud...");
  await prisma.health_plans.createMany({
    data: [
      {
        plan_name: "Plan Personal",
        plan_code: "personal",
        plan_type: "personal",
        description:
          "Plan de salud dental individual con cobertura básica y preventiva",
        monthly_fee: 50,
        enrollment_fee: 0,
        coverage_details: {
          incluidos_100: [
            "2 limpiezas dentales al año",
            "2 consultas de evaluación preventiva al año",
            "2 aplicaciones de flúor al año",
            "1 radiografía panorámica al año",
            "Atención de emergencias",
            "Consultas ilimitadas de orientación y diagnóstico",
          ],
          descuento_20: [
            "Resinas (obturaciones estéticas)",
            "Extracciones simples",
            "Curaciones",
            "Radiografías periapicales",
          ],
          descuento_15: [
            "Tratamientos de conducto (endodoncia)",
            "Extracciones complejas",
            "Limpiezas profundas",
            "Cirugías dentales menores",
          ],
          descuento_10: [
            "Coronas y puentes",
            "Prótesis dentales",
            "Blanqueamiento dental",
            "Ortodoncia",
            "Implantes dentales",
          ],
        },
        max_subscribers: 1,
        is_active: true,
        status: "active",
        user_id_registration: 1,
        date_time_registration: getLimaDateTime(),
      },
      {
        plan_name: "Plan Familiar",
        plan_code: "familiar",
        plan_type: "familiar",
        description:
          "Plan de salud dental para toda la familia (hasta 5 miembros)",
        monthly_fee: 150,
        enrollment_fee: 0,
        coverage_details: {
          incluidos_100: [
            "2 limpiezas dentales al año por persona",
            "2 consultas de evaluación preventiva al año por persona",
            "3 aplicaciones de flúor al año por persona",
            "1 radiografía panorámica al año por persona",
            "Atención de emergencias para todos",
            "Consultas ilimitadas para todos los miembros",
          ],
          descuento_25: [
            "Resinas (obturaciones estéticas)",
            "Extracciones simples",
            "Curaciones",
            "Radiografías periapicales",
          ],
          descuento_20: [
            "Tratamientos de conducto (endodoncia)",
            "Extracciones complejas",
            "Limpiezas profundas",
            "Cirugías dentales menores",
          ],
          descuento_15: [
            "Coronas y puentes",
            "Prótesis dentales",
            "Blanqueamiento dental",
            "Ortodoncia",
            "Implantes dentales",
          ],
        },
        max_subscribers: 5,
        is_active: true,
        status: "active",
        user_id_registration: 1,
        date_time_registration: getLimaDateTime(),
      },
      {
        plan_name: "Plan Platinium",
        plan_code: "platinium",
        plan_type: "platinium",
        description:
          "Plan premium con cobertura completa de servicios preventivos y correctivos",
        monthly_fee: 200,
        enrollment_fee: 0,
        coverage_details: {
          incluidos_100: [
            "Limpiezas dentales ilimitadas",
            "Consultas de evaluación ilimitadas",
            "4 aplicaciones de flúor al año",
            "2 radiografías panorámicas al año",
            "Atención de emergencias prioritaria",
            "Sellantes de fosas y fisuras",
            "1 blanqueamiento dental al año",
          ],
          descuento_40: [
            "Resinas (obturaciones estéticas)",
            "Extracciones simples y complejas",
            "Tratamientos de conducto (endodoncia)",
            "Radiografías especializadas",
          ],
          descuento_30: [
            "Coronas y puentes",
            "Limpiezas profundas",
            "Cirugías dentales",
            "Prótesis parciales",
          ],
          descuento_20: [
            "Ortodoncia",
            "Implantes dentales",
            "Prótesis completas",
            "Rehabilitación oral completa",
          ],
        },
        max_subscribers: 1,
        is_active: true,
        status: "active",
        user_id_registration: 1,
        date_time_registration: getLimaDateTime(),
      },
      {
        plan_name: "Plan Oro",
        plan_code: "oro",
        plan_type: "oro",
        description:
          "El plan más completo con cobertura total en servicios preventivos",
        monthly_fee: 350,
        enrollment_fee: 0,
        coverage_details: {
          incluidos_100: [
            "Limpiezas dentales ilimitadas",
            "Consultas ilimitadas",
            "Aplicaciones de flúor ilimitadas",
            "Todas las radiografías",
            "Atención de emergencias VIP",
            "Sellantes de fosas y fisuras",
            "2 blanqueamientos dentales al año",
            "Todos los servicios preventivos",
          ],
          descuento_50: [
            "Resinas (obturaciones estéticas)",
            "Extracciones simples y complejas",
            "Tratamientos de conducto (endodoncia)",
            "Coronas y puentes",
            "Limpiezas profundas",
            "Cirugías dentales",
          ],
          descuento_40: [
            "Ortodoncia",
            "Prótesis dentales",
            "Rehabilitación oral",
          ],
          descuento_30: [
            "Implantes dentales",
            "Cirugía maxilofacial",
            "Tratamientos estéticos avanzados",
          ],
        },
        max_subscribers: 1,
        is_active: true,
        status: "active",
        user_id_registration: 1,
        date_time_registration: getLimaDateTime(),
      },
    ],
    skipDuplicates: true,
  });

  // =====================================================
  // 25. PROMOCIONES (promotions)
  // =====================================================
  console.log("🎉 Poblando promociones...");

  const todayLima = getLimaDate(null);
  const sevenDaysAgo = new Date(todayLima);
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const threeDaysAgo = new Date(todayLima);
  threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
  const tenDaysAgo = new Date(todayLima);
  tenDaysAgo.setDate(tenDaysAgo.getDate() - 10);
  const fiveDaysAgo = new Date(todayLima);
  fiveDaysAgo.setDate(fiveDaysAgo.getDate() - 5);

  const in60Days = new Date(todayLima);
  in60Days.setDate(in60Days.getDate() + 60);
  const in30Days = new Date(todayLima);
  in30Days.setDate(in30Days.getDate() + 30);
  const in90Days = new Date(todayLima);
  in90Days.setDate(in90Days.getDate() + 90);
  const in45Days = new Date(todayLima);
  in45Days.setDate(in45Days.getDate() + 45);
  const in25Days = new Date(todayLima);
  in25Days.setDate(in25Days.getDate() + 25);

  await prisma.promotions.createMany({
    data: [
      {
        branch_id: 1,
        promotion_name: "Descuento Primera Consulta",
        promotion_code: "PRIMERA30",
        promotion_type: "clinic",
        description:
          "Obtén 30% de descuento en tu primera consulta odontológica. Válido para todos nuestros servicios de odontología general.",
        discount_type: "percentage",
        discount_value: 30,
        min_purchase_amount: 50,
        max_discount_amount: null,
        start_date: sevenDaysAgo,
        end_date: in60Days,
        max_uses: 100,
        current_uses: 0,
        applicable_procedures: null,
        terms_and_conditions:
          "Válido solo para nuevos pacientes. No acumulable con otras promociones. Sujeto a disponibilidad de horarios.",
        is_active: true,
        status: "active",
        user_id_registration: 1,
        date_time_registration: getLimaDateTime(),
      },
      {
        branch_id: 1,
        promotion_name: "Limpieza Dental + Blanqueamiento",
        promotion_code: "BLANQUEO200",
        promotion_type: "clinic",
        description:
          "Paquete especial: Limpieza dental profesional + blanqueamiento LED por solo S/. 200. Precio regular S/. 350.",
        discount_type: "fixed",
        discount_value: 150,
        min_purchase_amount: 200,
        max_discount_amount: 150,
        start_date: threeDaysAgo,
        end_date: in30Days,
        max_uses: 50,
        current_uses: 0,
        applicable_procedures: null,
        terms_and_conditions:
          "El paquete debe completarse en una sola sesión. No incluye tratamientos adicionales. Previa evaluación dental.",
        is_active: true,
        status: "active",
        user_id_registration: 1,
        date_time_registration: getLimaDateTime(),
      },
      {
        branch_id: null, // Todas las sedes
        promotion_name: "Plan Familia - 20% OFF",
        promotion_code: "FAMILIA20",
        promotion_type: "clinic",
        description:
          "Descuento especial del 20% en todos los tratamientos cuando registras a 3 o más miembros de tu familia.",
        discount_type: "percentage",
        discount_value: 20,
        min_purchase_amount: null,
        max_discount_amount: null,
        start_date: tenDaysAgo,
        end_date: in90Days,
        max_uses: null,
        current_uses: 0,
        applicable_procedures: null,
        terms_and_conditions:
          "Mínimo 3 familiares registrados. Descuento aplicable a todos los miembros. Válido por 3 meses desde la activación.",
        is_active: true,
        status: "active",
        user_id_registration: 1,
        date_time_registration: getLimaDateTime(),
      },
      {
        branch_id: 1,
        promotion_name: "Ortodoncia - Consulta Gratis",
        promotion_code: "ORTODON0",
        promotion_type: "clinic",
        description:
          "Evaluación y plan de tratamiento de ortodoncia completamente gratis. Incluye radiografías panorámicas.",
        discount_type: "percentage",
        discount_value: 100, // 100% = gratis
        min_purchase_amount: null,
        max_discount_amount: null,
        start_date: todayLima,
        end_date: in45Days,
        max_uses: 30,
        current_uses: 0,
        applicable_procedures: null,
        terms_and_conditions:
          "Solo para nuevos pacientes de ortodoncia. No incluye aparatos ni tratamiento. Requiere cita previa.",
        is_active: true,
        status: "active",
        user_id_registration: 1,
        date_time_registration: getLimaDateTime(),
      },
      {
        branch_id: null, // Todas las sedes
        promotion_name: "Mes del Cuidado Dental",
        promotion_code: "CUIDADO15",
        promotion_type: "clinic",
        description:
          "15% de descuento en todos los servicios preventivos durante todo el mes. Cuida tu sonrisa con nosotros.",
        discount_type: "percentage",
        discount_value: 15,
        min_purchase_amount: 80,
        max_discount_amount: null,
        start_date: fiveDaysAgo,
        end_date: in25Days,
        max_uses: null,
        current_uses: 0,
        applicable_procedures: null,
        terms_and_conditions:
          "Aplicable a limpiezas, fluorización y sellantes. Un uso por paciente al mes. No incluye tratamientos correctivos.",
        is_active: true,
        status: "active",
        user_id_registration: 1,
        date_time_registration: getLimaDateTime(),
      },
    ],
    skipDuplicates: true,
  });

  // =====================================================
  // 27. CONFIGURACIONES DE APLICACIÓN (app_settings)
  // =====================================================
  console.log("⚙️ Poblando configuraciones de aplicación...");
  await prisma.app_settings.createMany({
    data: [
      // === APPOINTMENTS ===
      {
        branch_id: null,
        setting_key: "appointment_duration_config",
        setting_value:
          '{"defaultDuration":30,"maxDurationForRegularUsers":60,"allowedRolesForLongAppointments":["RECEPTIONIST"]}',
        setting_type: "json",
        setting_category: "appointments",
        description:
          "Configuración de duración de citas. Define la duración predeterminada y los roles que pueden exceder el límite estándar.",
        is_public: false,
        status: "active",
        user_id_registration: 1,
        date_time_registration: getLimaDateTime(),
      },
      // === CLINIC ===
      {
        branch_id: null,
        setting_key: "timezone",
        setting_value: "America/Lima",
        setting_type: "string",
        setting_category: "clinic",
        is_public: false,
        status: "active",
        user_id_registration: 1,
        date_time_registration: getLimaDateTime(),
      },
      {
        branch_id: null,
        setting_key: "clinic_name",
        setting_value: "My Dent Clínica Dental",
        setting_type: "string",
        setting_category: "clinic",
        is_public: false,
        status: "active",
        user_id_registration: 1,
        date_time_registration: getLimaDateTime(),
      },
      {
        branch_id: null,
        setting_key: "clinic_website",
        setting_value: "www.mydent.pe",
        setting_type: "string",
        setting_category: "clinic",
        is_public: false,
        status: "active",
        user_id_registration: 1,
        date_time_registration: getLimaDateTime(),
      },
      {
        branch_id: null,
        setting_key: "language",
        setting_value: "es",
        setting_type: "string",
        setting_category: "clinic",
        is_public: false,
        status: "active",
        user_id_registration: 1,
        date_time_registration: getLimaDateTime(),
      },
      {
        branch_id: null,
        setting_key: "clinic_address",
        setting_value: "Av. Javier Prado Este 4567, San Isidro",
        setting_type: "string",
        setting_category: "clinic",
        is_public: false,
        status: "active",
        user_id_registration: 1,
        date_time_registration: getLimaDateTime(),
      },
      {
        branch_id: null,
        setting_key: "currency",
        setting_value: "PEN",
        setting_type: "string",
        setting_category: "clinic",
        is_public: false,
        status: "active",
        user_id_registration: 1,
        date_time_registration: getLimaDateTime(),
      },
      {
        branch_id: null,
        setting_key: "clinic_email",
        setting_value: "contacto@mydent.pe",
        setting_type: "string",
        setting_category: "clinic",
        is_public: false,
        status: "active",
        user_id_registration: 1,
        date_time_registration: getLimaDateTime(),
      },
      {
        branch_id: null,
        setting_key: "clinic_phone",
        setting_value: "999888777",
        setting_type: "string",
        setting_category: "clinic",
        is_public: false,
        status: "active",
        user_id_registration: 1,
        date_time_registration: getLimaDateTime(),
      },
      // === CONTACT ===
      {
        branch_id: null,
        setting_key: "address_main",
        setting_value: "Av. Javier Prado Este 4567, San Isidro, Lima",
        setting_type: "string",
        setting_category: "contact",
        is_public: false,
        status: "active",
        user_id_registration: 1,
        date_time_registration: getLimaDateTime(),
      },
      {
        branch_id: null,
        setting_key: "phone_main",
        setting_value: "+51 01 234 5678",
        setting_type: "string",
        setting_category: "contact",
        is_public: false,
        status: "active",
        user_id_registration: 1,
        date_time_registration: getLimaDateTime(),
      },
      {
        branch_id: null,
        setting_key: "phone_emergency",
        setting_value: "+51 999 888 777",
        setting_type: "string",
        setting_category: "contact",
        is_public: false,
        status: "active",
        user_id_registration: 1,
        date_time_registration: getLimaDateTime(),
      },
      {
        branch_id: null,
        setting_key: "email_info",
        setting_value: "info@mydent.pe",
        setting_type: "string",
        setting_category: "contact",
        is_public: false,
        status: "active",
        user_id_registration: 1,
        date_time_registration: getLimaDateTime(),
      },
      {
        branch_id: null,
        setting_key: "email_appointments",
        setting_value: "citas@mydent.pe",
        setting_type: "string",
        setting_category: "contact",
        is_public: false,
        status: "active",
        user_id_registration: 1,
        date_time_registration: getLimaDateTime(),
      },
      {
        branch_id: null,
        setting_key: "email_support",
        setting_value: "soporte@mydent.pe",
        setting_type: "string",
        setting_category: "contact",
        is_public: false,
        status: "active",
        user_id_registration: 1,
        date_time_registration: getLimaDateTime(),
      },
      // === WHATSAPP ===
      {
        branch_id: null,
        setting_key: "whatsapp_number",
        setting_value: "51999888777",
        setting_type: "string",
        setting_category: "whatsapp",
        is_public: false,
        status: "active",
        user_id_registration: 1,
        date_time_registration: getLimaDateTime(),
      },
      {
        branch_id: null,
        setting_key: "whatsapp_display",
        setting_value: "+51 999 888 777",
        setting_type: "string",
        setting_category: "whatsapp",
        is_public: false,
        status: "active",
        user_id_registration: 1,
        date_time_registration: getLimaDateTime(),
      },
      {
        branch_id: null,
        setting_key: "whatsapp_imaging",
        setting_value: "51999888776",
        setting_type: "string",
        setting_category: "whatsapp",
        is_public: false,
        status: "active",
        user_id_registration: 1,
        date_time_registration: getLimaDateTime(),
      },
      {
        branch_id: null,
        setting_key: "whatsapp_imaging_display",
        setting_value: "+51 999 888 776",
        setting_type: "string",
        setting_category: "whatsapp",
        is_public: false,
        status: "active",
        user_id_registration: 1,
        date_time_registration: getLimaDateTime(),
      },
      // === SECURITY ===
      {
        branch_id: null,
        setting_key: "session_timeout",
        setting_value: "30",
        setting_type: "number",
        setting_category: "security",
        description:
          "Tiempo de inactividad de sesion en minutos (5-1440). Cierra la sesion automaticamente despues de este tiempo de inactividad.",
        is_public: false,
        status: "active",
        user_id_registration: 1,
        date_time_registration: getLimaDateTime(),
      },
      {
        branch_id: null,
        setting_key: "max_login_attempts",
        setting_value: "5",
        setting_type: "number",
        setting_category: "security",
        description:
          "Numero maximo de intentos de inicio de sesion fallidos antes de bloquear la cuenta (3-10).",
        is_public: false,
        status: "active",
        user_id_registration: 1,
        date_time_registration: getLimaDateTime(),
      },
      {
        branch_id: null,
        setting_key: "password_expiry",
        setting_value: "90",
        setting_type: "number",
        setting_category: "security",
        description:
          "Dias hasta que la contrasena debe ser cambiada (30-365). Requiere cambio de contrasena periodico.",
        is_public: false,
        status: "active",
        user_id_registration: 1,
        date_time_registration: getLimaDateTime(),
      },
      {
        branch_id: null,
        setting_key: "audit_log",
        setting_value: "true",
        setting_type: "boolean",
        setting_category: "security",
        description:
          "Habilita o deshabilita el registro detallado de acciones del sistema para auditoria.",
        is_public: false,
        status: "active",
        user_id_registration: 1,
        date_time_registration: getLimaDateTime(),
      },
      {
        branch_id: null,
        setting_key: "two_factor_auth",
        setting_value: "false",
        setting_type: "boolean",
        setting_category: "security",
        description:
          "Habilita o deshabilita la autenticacion de dos factores para todos los usuarios.",
        is_public: false,
        status: "active",
        user_id_registration: 1,
        date_time_registration: getLimaDateTime(),
      },
      // === INVENTORY ===
      {
        branch_id: null,
        setting_key: "inventory_alert_settings",
        setting_value: '{"diasAntes":14}',
        setting_type: "json",
        setting_category: "inventory",
        description:
          "Configuracion de alertas de inventario. diasAntes: dias antes del vencimiento para alertar.",
        is_public: false,
        status: "active",
        user_id_registration: 1,
        date_time_registration: getLimaDateTime(),
      },
      // === NOTIFICATIONS ===
      {
        branch_id: null,
        setting_key: "sms_notifications",
        setting_value: "false",
        setting_type: "boolean",
        setting_category: "notifications",
        is_public: false,
        status: "active",
        user_id_registration: 1,
        date_time_registration: getLimaDateTime(),
      },
      {
        branch_id: null,
        setting_key: "email_notifications",
        setting_value: "true",
        setting_type: "boolean",
        setting_category: "notifications",
        is_public: false,
        status: "active",
        user_id_registration: 1,
        date_time_registration: getLimaDateTime(),
      },
      {
        branch_id: null,
        setting_key: "appointment_reminders",
        setting_value: "true",
        setting_type: "boolean",
        setting_category: "notifications",
        is_public: false,
        status: "active",
        user_id_registration: 1,
        date_time_registration: getLimaDateTime(),
      },
      {
        branch_id: null,
        setting_key: "system_alerts",
        setting_value: "true",
        setting_type: "boolean",
        setting_category: "notifications",
        is_public: false,
        status: "active",
        user_id_registration: 1,
        date_time_registration: getLimaDateTime(),
      },
      {
        branch_id: null,
        setting_key: "reminder_time",
        setting_value: "24",
        setting_type: "number",
        setting_category: "notifications",
        description:
          "Horas antes de la cita para enviar recordatorio.",
        is_public: false,
        status: "active",
        user_id_registration: 1,
        date_time_registration: getLimaDateTime(),
      },
    ],
    skipDuplicates: true,
  });

  // =====================================================
  // 28. PRECIOS DE SERVICIOS DE LABORATORIO (laboratory_service_prices)
  // =====================================================
  console.log("🔬 Poblando precios de servicios de laboratorio...");
  await prisma.laboratory_service_prices.createMany({
    data: [
      // Tomografía 3D - Tipo de Entrega
      {
        service_code: "tomo_con_informe",
        service_name: "Con Informe",
        service_category: "tomografia3d",
        service_subcategory: "tipo_entrega",
        base_price: 1,
        currency: "PEN",
        has_quantity: false,
        has_options: false,
        legacy_field_name: "conInforme",
        description: "Tomografía 3D con informe médico incluido",
        is_active: true,
        display_order: 1,
        status: "active",
        user_id_registration: 1,
        date_time_registration: getLimaDateTime(),
      },
      {
        service_code: "tomo_sin_informe",
        service_name: "Sin Informe",
        service_category: "tomografia3d",
        service_subcategory: "tipo_entrega",
        base_price: 11,
        currency: "PEN",
        has_quantity: false,
        has_options: false,
        legacy_field_name: "sinInforme",
        description: "Tomografía 3D sin informe médico",
        is_active: true,
        display_order: 2,
        status: "active",
        user_id_registration: 1,
        date_time_registration: getLimaDateTime(),
      },
      {
        service_code: "tomo_dicom",
        service_name: "DICOM",
        service_category: "tomografia3d",
        service_subcategory: "tipo_entrega",
        base_price: 111,
        currency: "PEN",
        has_quantity: false,
        has_options: false,
        legacy_field_name: "dicom",
        description: "Formato DICOM para visualización profesional",
        is_active: true,
        display_order: 3,
        status: "active",
        user_id_registration: 1,
        date_time_registration: getLimaDateTime(),
      },
      {
        service_code: "tomo_solo_usb",
        service_name: "Solo USB",
        service_category: "tomografia3d",
        service_subcategory: "tipo_entrega",
        base_price: 1111,
        currency: "PEN",
        has_quantity: false,
        has_options: false,
        legacy_field_name: "soloUsb",
        description: "Entrega en USB sin informe",
        is_active: true,
        display_order: 4,
        status: "active",
        user_id_registration: 1,
        date_time_registration: getLimaDateTime(),
      },
      // Tomografía 3D - Campo Pequeño
      {
        service_code: "tomo_endodoncia",
        service_name: "Endodoncia",
        service_category: "tomografia3d",
        service_subcategory: "campo_pequeno",
        base_price: 12,
        currency: "PEN",
        has_quantity: true,
        quantity_unit: "piezas",
        has_options: false,
        legacy_field_name: "endodoncia",
        description: "Tomografía para tratamiento endodóntico",
        is_active: true,
        display_order: 5,
        status: "active",
        user_id_registration: 1,
        date_time_registration: getLimaDateTime(),
      },
      {
        service_code: "tomo_fractura_radicular",
        service_name: "Fractura Radicular",
        service_category: "tomografia3d",
        service_subcategory: "campo_pequeno",
        base_price: 13,
        currency: "PEN",
        has_quantity: true,
        quantity_unit: "piezas",
        has_options: false,
        legacy_field_name: "fracturaRadicular",
        description: "Diagnóstico de fractura radicular",
        is_active: true,
        display_order: 6,
        status: "active",
        user_id_registration: 1,
        date_time_registration: getLimaDateTime(),
      },
      {
        service_code: "tomo_anatomia_endodontica",
        service_name: "Anatomía Endodóntica",
        service_category: "tomografia3d",
        service_subcategory: "campo_pequeno",
        base_price: 14,
        currency: "PEN",
        has_quantity: true,
        quantity_unit: "piezas",
        has_options: false,
        legacy_field_name: "anatomiaEndodontica",
        description: "Estudio de anatomía para endodoncia",
        is_active: true,
        display_order: 7,
        status: "active",
        user_id_registration: 1,
        date_time_registration: getLimaDateTime(),
      },
      // Tomografía 3D - Campo Mediano
      {
        service_code: "tomo_localizacion_diente",
        service_name: "Localización Diente",
        service_category: "tomografia3d",
        service_subcategory: "campo_mediano",
        base_price: 15,
        currency: "PEN",
        has_quantity: true,
        quantity_unit: "piezas",
        has_options: false,
        legacy_field_name: "localizacionDiente",
        description: "Localización exacta de dientes retenidos",
        is_active: true,
        display_order: 8,
        status: "active",
        user_id_registration: 1,
        date_time_registration: getLimaDateTime(),
      },
      {
        service_code: "tomo_implantes",
        service_name: "Implantes",
        service_category: "tomografia3d",
        service_subcategory: "campo_mediano",
        base_price: 16,
        currency: "PEN",
        has_quantity: true,
        quantity_unit: "cortes",
        has_options: true,
        options_config: { guiaQuirurgica: true },
        legacy_field_name: "implantes",
        description: "Planificación de implantes dentales",
        is_active: true,
        display_order: 9,
        status: "active",
        user_id_registration: 1,
        date_time_registration: getLimaDateTime(),
      },
      {
        service_code: "tomo_maxilar_superior",
        service_name: "Maxilar Superior e Inferior",
        service_category: "tomografia3d",
        service_subcategory: "campo_mediano",
        base_price: 17,
        currency: "PEN",
        has_quantity: false,
        has_options: false,
        legacy_field_name: "maxilarSuperior",
        description: "Estudio de ambos maxilares",
        is_active: true,
        display_order: 10,
        status: "active",
        user_id_registration: 1,
        date_time_registration: getLimaDateTime(),
      },
      // Tomografía 3D - Campo Mediano Grande
      {
        service_code: "tomo_via_aerea",
        service_name: "Vía Aérea",
        service_category: "tomografia3d",
        service_subcategory: "campo_mediano_grande",
        base_price: 150,
        currency: "PEN",
        has_quantity: false,
        has_options: true,
        options_config: { guia: true },
        legacy_field_name: "viaAerea",
        description: "Estudio de vía aérea",
        is_active: true,
        display_order: 11,
        status: "active",
        user_id_registration: 1,
        date_time_registration: getLimaDateTime(),
      },
      {
        service_code: "tomo_ortognatica",
        service_name: "Ortognática",
        service_category: "tomografia3d",
        service_subcategory: "campo_mediano_grande",
        base_price: 160,
        currency: "PEN",
        has_quantity: false,
        has_options: true,
        options_config: { guia: true, planificacion: true },
        legacy_field_name: "ortognatica",
        description: "Planificación de cirugía ortognática",
        is_active: true,
        display_order: 12,
        status: "active",
        user_id_registration: 1,
        date_time_registration: getLimaDateTime(),
      },
      // Tomografía 3D - Ortodoncia
      {
        service_code: "tomo_marpe",
        service_name: "MARPE",
        service_category: "tomografia3d",
        service_subcategory: "ortodoncia",
        base_price: 140,
        currency: "PEN",
        has_quantity: false,
        has_options: false,
        legacy_field_name: "marpe",
        description: "Expansión maxilar rápida asistida por mini-implantes",
        is_active: true,
        display_order: 13,
        status: "active",
        user_id_registration: 1,
        date_time_registration: getLimaDateTime(),
      },
      {
        service_code: "tomo_mini_implantes",
        service_name: "Mini Implantes",
        service_category: "tomografia3d",
        service_subcategory: "ortodoncia",
        base_price: 130,
        currency: "PEN",
        has_quantity: false,
        has_options: true,
        options_config: { guia: true, tipos: true },
        legacy_field_name: "miniImplantes",
        description: "Planificación de mini implantes ortodónticos",
        is_active: true,
        display_order: 14,
        status: "active",
        user_id_registration: 1,
        date_time_registration: getLimaDateTime(),
      },
      // Tomografía 3D - Otras Opciones
      {
        service_code: "tomo_atm",
        service_name: "ATM",
        service_category: "tomografia3d",
        service_subcategory: "otras_opciones",
        base_price: 125,
        currency: "PEN",
        has_quantity: false,
        has_options: true,
        options_config: { bocaAbierta: true, bocaCerrada: true },
        legacy_field_name: "atm",
        description: "Articulación temporomandibular",
        is_active: true,
        display_order: 15,
        status: "active",
        user_id_registration: 1,
        date_time_registration: getLimaDateTime(),
      },
      {
        service_code: "tomo_macizo_facial",
        service_name: "Macizo Facial",
        service_category: "tomografia3d",
        service_subcategory: "otras_opciones",
        base_price: 135,
        currency: "PEN",
        has_quantity: false,
        has_options: true,
        options_config: { tercio: true },
        legacy_field_name: "macizoFacial",
        description: "Estudio del macizo facial",
        is_active: true,
        display_order: 16,
        status: "active",
        user_id_registration: 1,
        date_time_registration: getLimaDateTime(),
      },
      // Radiografías - Intraorales Periapical
      {
        service_code: "radio_periapical_fisico",
        service_name: "Periapical Físico",
        service_category: "radiografias",
        service_subcategory: "intraorales_periapical",
        base_price: 22,
        currency: "PEN",
        has_quantity: true,
        quantity_unit: "dientes",
        has_options: false,
        legacy_field_name: "periapicalFisico",
        description: "Radiografía periapical en formato físico",
        is_active: true,
        display_order: 17,
        status: "active",
        user_id_registration: 1,
        date_time_registration: getLimaDateTime(),
      },
      {
        service_code: "radio_periapical_digital",
        service_name: "Periapical Digital",
        service_category: "radiografias",
        service_subcategory: "intraorales_periapical",
        base_price: 21,
        currency: "PEN",
        has_quantity: true,
        quantity_unit: "dientes",
        has_options: false,
        legacy_field_name: "periapicalDigital",
        description: "Radiografía periapical en formato digital",
        is_active: true,
        display_order: 18,
        status: "active",
        user_id_registration: 1,
        date_time_registration: getLimaDateTime(),
      },
      // Radiografías - Bitewing
      {
        service_code: "radio_bitewing_ambos",
        service_name: "Bitewing Ambos Lados",
        service_category: "radiografias",
        service_subcategory: "bitewing",
        base_price: 60,
        currency: "PEN",
        has_quantity: false,
        has_options: false,
        legacy_field_name: "bitewingAmbos",
        description: "Radiografía bitewing bilateral",
        is_active: true,
        display_order: 19,
        status: "active",
        user_id_registration: 1,
        date_time_registration: getLimaDateTime(),
      },
      {
        service_code: "radio_bitewing_derecho",
        service_name: "Bitewing Derecho",
        service_category: "radiografias",
        service_subcategory: "bitewing",
        base_price: 35,
        currency: "PEN",
        has_quantity: false,
        has_options: false,
        legacy_field_name: "bitewingDerecho",
        description: "Radiografía bitewing lado derecho",
        is_active: true,
        display_order: 20,
        status: "active",
        user_id_registration: 1,
        date_time_registration: getLimaDateTime(),
      },
      {
        service_code: "radio_bitewing_izquierdo",
        service_name: "Bitewing Izquierdo",
        service_category: "radiografias",
        service_subcategory: "bitewing",
        base_price: 35,
        currency: "PEN",
        has_quantity: false,
        has_options: false,
        legacy_field_name: "bitewingIzquierdo",
        description: "Radiografía bitewing lado izquierdo",
        is_active: true,
        display_order: 21,
        status: "active",
        user_id_registration: 1,
        date_time_registration: getLimaDateTime(),
      },
      // Radiografías - Oclusal
      {
        service_code: "radio_oclusal_superiores",
        service_name: "Oclusal Superiores",
        service_category: "radiografias",
        service_subcategory: "oclusal",
        base_price: 40,
        currency: "PEN",
        has_quantity: false,
        has_options: false,
        legacy_field_name: "oclusalSuperiores",
        description: "Radiografía oclusal superior",
        is_active: true,
        display_order: 22,
        status: "active",
        user_id_registration: 1,
        date_time_registration: getLimaDateTime(),
      },
      {
        service_code: "radio_oclusal_inferiores",
        service_name: "Oclusal Inferiores",
        service_category: "radiografias",
        service_subcategory: "oclusal",
        base_price: 40,
        currency: "PEN",
        has_quantity: false,
        has_options: false,
        legacy_field_name: "oclusalInferiores",
        description: "Radiografía oclusal inferior",
        is_active: true,
        display_order: 23,
        status: "active",
        user_id_registration: 1,
        date_time_registration: getLimaDateTime(),
      },
      // Radiografías - Otras Intraorales
      {
        service_code: "radio_seriada",
        service_name: "Seriada",
        service_category: "radiografias",
        service_subcategory: "otras_intraorales",
        base_price: 280,
        currency: "PEN",
        has_quantity: false,
        has_options: false,
        legacy_field_name: "seriada",
        description: "Serie radiográfica completa",
        is_active: true,
        display_order: 24,
        status: "active",
        user_id_registration: 1,
        date_time_registration: getLimaDateTime(),
      },
      {
        service_code: "radio_radiografias",
        service_name: "Radiografías",
        service_category: "radiografias",
        service_subcategory: "otras_intraorales",
        base_price: 50,
        currency: "PEN",
        has_quantity: false,
        has_options: false,
        legacy_field_name: "radiografias",
        description: "Radiografías intraorales generales",
        is_active: true,
        display_order: 25,
        status: "active",
        user_id_registration: 1,
        date_time_registration: getLimaDateTime(),
      },
      // Radiografías - Extraorales
      {
        service_code: "radio_halografia_panoramica",
        service_name: "Halografía Panorámica",
        service_category: "radiografias",
        service_subcategory: "extraorales",
        base_price: 80,
        currency: "PEN",
        has_quantity: false,
        has_options: false,
        legacy_field_name: "halografiaPanoramica",
        description: "Radiografía panorámica digital",
        is_active: true,
        display_order: 26,
        status: "active",
        user_id_registration: 1,
        date_time_registration: getLimaDateTime(),
      },
      {
        service_code: "radio_halografia_lateral",
        service_name: "Halografía Lateral",
        service_category: "radiografias",
        service_subcategory: "extraorales",
        base_price: 70,
        currency: "PEN",
        has_quantity: false,
        has_options: false,
        legacy_field_name: "halografiaLateral",
        description: "Radiografía lateral de cráneo",
        is_active: true,
        display_order: 27,
        status: "active",
        user_id_registration: 1,
        date_time_registration: getLimaDateTime(),
      },
      {
        service_code: "radio_halografia_posterior",
        service_name: "Halografía Posterior",
        service_category: "radiografias",
        service_subcategory: "extraorales",
        base_price: 75,
        currency: "PEN",
        has_quantity: false,
        has_options: false,
        legacy_field_name: "halografiaPosterior",
        description: "Radiografía posteroanterior",
        is_active: true,
        display_order: 28,
        status: "active",
        user_id_registration: 1,
        date_time_registration: getLimaDateTime(),
      },
      {
        service_code: "radio_estudios_atm",
        service_name: "Estudios ATM",
        service_category: "radiografias",
        service_subcategory: "extraorales",
        base_price: 120,
        currency: "PEN",
        has_quantity: false,
        has_options: false,
        legacy_field_name: "estudiosAtm",
        description: "Estudio de articulación temporomandibular",
        is_active: true,
        display_order: 29,
        status: "active",
        user_id_registration: 1,
        date_time_registration: getLimaDateTime(),
      },
      {
        service_code: "radio_cefalometrica",
        service_name: "Radiografía Cefalométrica",
        service_category: "radiografias",
        service_subcategory: "extraorales",
        base_price: 90,
        currency: "PEN",
        has_quantity: false,
        has_options: false,
        legacy_field_name: "radiografiaCefalometrica",
        description: "Radiografía para análisis cefalométrico",
        is_active: true,
        display_order: 30,
        status: "active",
        user_id_registration: 1,
        date_time_registration: getLimaDateTime(),
      },
      // Radiografías - Asesoría Ortodoncia P1
      {
        service_code: "radio_paq1_con_asesoria",
        service_name: "Paquete 1 Con Asesoría",
        service_category: "radiografias",
        service_subcategory: "asesoria_ortodoncia_p1",
        base_price: 400,
        currency: "PEN",
        has_quantity: false,
        has_options: false,
        legacy_field_name: "paq1ConAsesoria",
        description: "Paquete ortodóntico 1 con asesoría profesional",
        is_active: true,
        display_order: 31,
        status: "active",
        user_id_registration: 1,
        date_time_registration: getLimaDateTime(),
      },
      {
        service_code: "radio_paq1_sin_asesoria",
        service_name: "Paquete 1 Sin Asesoría",
        service_category: "radiografias",
        service_subcategory: "asesoria_ortodoncia_p1",
        base_price: 350,
        currency: "PEN",
        has_quantity: false,
        has_options: false,
        legacy_field_name: "paq1SinAsesoria",
        description: "Paquete ortodóntico 1 sin asesoría",
        is_active: true,
        display_order: 32,
        status: "active",
        user_id_registration: 1,
        date_time_registration: getLimaDateTime(),
      },
      // Radiografías - Asesoría Ortodoncia P2
      {
        service_code: "radio_paq2_con_asesoria",
        service_name: "Paquete 2 Con Asesoría",
        service_category: "radiografias",
        service_subcategory: "asesoria_ortodoncia_p2",
        base_price: 300,
        currency: "PEN",
        has_quantity: false,
        has_options: false,
        legacy_field_name: "paq2ConAsesoria",
        description: "Paquete ortodóntico 2 con asesoría profesional",
        is_active: true,
        display_order: 33,
        status: "active",
        user_id_registration: 1,
        date_time_registration: getLimaDateTime(),
      },
      {
        service_code: "radio_paq2_sin_asesoria",
        service_name: "Paquete 2 Sin Asesoría",
        service_category: "radiografias",
        service_subcategory: "asesoria_ortodoncia_p2",
        base_price: 250,
        currency: "PEN",
        has_quantity: false,
        has_options: false,
        legacy_field_name: "paq2SinAsesoria",
        description: "Paquete ortodóntico 2 sin asesoría",
        is_active: true,
        display_order: 34,
        status: "active",
        user_id_registration: 1,
        date_time_registration: getLimaDateTime(),
      },
      // Radiografías - Asesoría Ortodoncia P3
      {
        service_code: "radio_paq3_con_asesoria",
        service_name: "Paquete 3 Con Asesoría",
        service_category: "radiografias",
        service_subcategory: "asesoria_ortodoncia_p3",
        base_price: 450,
        currency: "PEN",
        has_quantity: false,
        has_options: false,
        legacy_field_name: "paq3ConAsesoria",
        description: "Paquete ortodóntico 3 con asesoría profesional",
        is_active: true,
        display_order: 35,
        status: "active",
        user_id_registration: 1,
        date_time_registration: getLimaDateTime(),
      },
      {
        service_code: "radio_paq3_sin_asesoria",
        service_name: "Paquete 3 Sin Asesoría",
        service_category: "radiografias",
        service_subcategory: "asesoria_ortodoncia_p3",
        base_price: 400,
        currency: "PEN",
        has_quantity: false,
        has_options: false,
        legacy_field_name: "paq3SinAsesoria",
        description: "Paquete ortodóntico 3 sin asesoría",
        is_active: true,
        display_order: 36,
        status: "active",
        user_id_registration: 1,
        date_time_registration: getLimaDateTime(),
      },
      // Radiografías - Modelos y Fotos
      {
        service_code: "radio_modelos_estudio",
        service_name: "Modelos de Estudio",
        service_category: "radiografias",
        service_subcategory: "modelos_fotos",
        base_price: 100,
        currency: "PEN",
        has_quantity: false,
        has_options: false,
        legacy_field_name: "modelosEstudio",
        description: "Modelos de estudio para ortodoncia",
        is_active: true,
        display_order: 37,
        status: "active",
        user_id_registration: 1,
        date_time_registration: getLimaDateTime(),
      },
      {
        service_code: "radio_fotos",
        service_name: "Fotografías",
        service_category: "radiografias",
        service_subcategory: "modelos_fotos",
        base_price: 50,
        currency: "PEN",
        has_quantity: false,
        has_options: false,
        legacy_field_name: "fotos",
        description: "Fotografías clínicas dentales",
        is_active: true,
        display_order: 38,
        status: "active",
        user_id_registration: 1,
        date_time_registration: getLimaDateTime(),
      },
      // Modelos 3D
      {
        service_code: "modelo_digital_completo",
        service_name: "Modelo Digital Completo",
        service_category: "modelos3d",
        service_subcategory: "escaneo_intraoral",
        base_price: 200,
        currency: "PEN",
        has_quantity: false,
        has_options: false,
        legacy_field_name: "modeloDigitalCompleto",
        description: "Escaneo intraoral completo de ambas arcadas",
        is_active: true,
        display_order: 39,
        status: "active",
        user_id_registration: 1,
        date_time_registration: getLimaDateTime(),
      },
      {
        service_code: "modelo_digital_arcada",
        service_name: "Modelo Digital por Arcada",
        service_category: "modelos3d",
        service_subcategory: "escaneo_intraoral",
        base_price: 120,
        currency: "PEN",
        has_quantity: false,
        has_options: false,
        legacy_field_name: "modeloDigitalArcada",
        description: "Escaneo intraoral de una arcada",
        is_active: true,
        display_order: 40,
        status: "active",
        user_id_registration: 1,
        date_time_registration: getLimaDateTime(),
      },
      {
        service_code: "modelo_impreso_completo",
        service_name: "Modelo Impreso Completo",
        service_category: "modelos3d",
        service_subcategory: "impresion_3d",
        base_price: 180,
        currency: "PEN",
        has_quantity: false,
        has_options: false,
        legacy_field_name: "modeloImpresoCompleto",
        description: "Impresión 3D de modelo completo",
        is_active: true,
        display_order: 41,
        status: "active",
        user_id_registration: 1,
        date_time_registration: getLimaDateTime(),
      },
      {
        service_code: "modelo_impreso_arcada",
        service_name: "Modelo Impreso por Arcada",
        service_category: "modelos3d",
        service_subcategory: "impresion_3d",
        base_price: 100,
        currency: "PEN",
        has_quantity: false,
        has_options: false,
        legacy_field_name: "modeloImpresoArcada",
        description: "Impresión 3D de una arcada",
        is_active: true,
        display_order: 42,
        status: "active",
        user_id_registration: 1,
        date_time_registration: getLimaDateTime(),
      },
      {
        service_code: "guia_quirurgica_impresa",
        service_name: "Guía Quirúrgica Impresa",
        service_category: "modelos3d",
        service_subcategory: "guias_quirurgicas",
        base_price: 250,
        currency: "PEN",
        has_quantity: false,
        has_options: false,
        legacy_field_name: "guiaQuirurgicaImpresa",
        description: "Guía quirúrgica para implantes impresa en 3D",
        is_active: true,
        display_order: 43,
        status: "active",
        user_id_registration: 1,
        date_time_registration: getLimaDateTime(),
      },
      {
        service_code: "guia_quirurgica_digital",
        service_name: "Guía Quirúrgica Digital",
        service_category: "modelos3d",
        service_subcategory: "guias_quirurgicas",
        base_price: 300,
        currency: "PEN",
        has_quantity: false,
        has_options: false,
        legacy_field_name: "guiaQuirurgicaDigital",
        description: "Planificación digital de guía quirúrgica",
        is_active: true,
        display_order: 44,
        status: "active",
        user_id_registration: 1,
        date_time_registration: getLimaDateTime(),
      },
      // Fotografías Clínicas
      {
        service_code: "foto_intraoral_set",
        service_name: "Set Fotográfico Intraoral",
        service_category: "fotografias",
        service_subcategory: "intraoral",
        base_price: 80,
        currency: "PEN",
        has_quantity: false,
        has_options: false,
        legacy_field_name: "fotoIntraoralSet",
        description: "Set completo de fotografías intraorales",
        is_active: true,
        display_order: 45,
        status: "active",
        user_id_registration: 1,
        date_time_registration: getLimaDateTime(),
      },
      {
        service_code: "foto_extraoral_set",
        service_name: "Set Fotográfico Extraoral",
        service_category: "fotografias",
        service_subcategory: "extraoral",
        base_price: 60,
        currency: "PEN",
        has_quantity: false,
        has_options: false,
        legacy_field_name: "fotoExtraoralSet",
        description: "Set completo de fotografías extraorales",
        is_active: true,
        display_order: 46,
        status: "active",
        user_id_registration: 1,
        date_time_registration: getLimaDateTime(),
      },
      {
        service_code: "foto_completo_ortodoncia",
        service_name: "Set Completo Ortodoncia",
        service_category: "fotografias",
        service_subcategory: "ortodoncia",
        base_price: 120,
        currency: "PEN",
        has_quantity: false,
        has_options: false,
        legacy_field_name: "fotoCompletoOrtodoncia",
        description: "Set fotográfico completo para ortodoncia",
        is_active: true,
        display_order: 47,
        status: "active",
        user_id_registration: 1,
        date_time_registration: getLimaDateTime(),
      },
      {
        service_code: "foto_antes_despues",
        service_name: "Fotografías Antes/Después",
        service_category: "fotografias",
        service_subcategory: "estetica",
        base_price: 50,
        currency: "PEN",
        has_quantity: false,
        has_options: false,
        legacy_field_name: "fotoAntesDespues",
        description: "Fotografías comparativas de tratamiento",
        is_active: true,
        display_order: 48,
        status: "active",
        user_id_registration: 1,
        date_time_registration: getLimaDateTime(),
      },
    ],
    skipDuplicates: true,
  });

  // =====================================================
  // 29. CONDICIONES DENTALES DEL ODONTOGRAMA (odontogram_dental_conditions)
  // =====================================================
  console.log("🦷 Poblando condiciones dentales del odontograma...");
  await prisma.odontogram_dental_conditions.createMany({
    data: [
      // Patologías
      {
        condition_code: "caries-mb",
        condition_name: "Mancha Blanca (Caries Incipiente)",
        category: "patologia",
        cie10_code: "K02.0",
        abbreviation: "MB",
        description:
          "Lesión dibujada en rojo en las superficies comprometidas - A nivel del esmalte",
        specifications: "Caries inicial reversible con flúor",
        symbol_type: "fill",
        color_type: "red",
        fill_surfaces: true,
        between_teeth: false,
        default_price: 50,

        status: "active",
        user_id_registration: 1,
        date_time_registration: getLimaDateTime(),
      },
      {
        condition_code: "caries-ce",
        condition_name: "Caries de Esmalte",
        category: "patologia",
        cie10_code: "K02.0",
        abbreviation: "CE",
        description:
          "Lesión dibujada en rojo en las superficies comprometidas - A nivel del esmalte",
        specifications: "Caries limitada al esmalte dental",
        symbol_type: "fill",
        color_type: "red",
        fill_surfaces: true,
        between_teeth: false,
        default_price: 60,

        status: "active",
        user_id_registration: 1,
        date_time_registration: getLimaDateTime(),
      },
      {
        condition_code: "caries-cd",
        condition_name: "Caries de Dentina",
        category: "patologia",
        cie10_code: "K02.1",
        abbreviation: "CD",
        description:
          "Lesión dibujada en rojo en las superficies comprometidas - A nivel de la dentina",
        specifications: "Caries que ha penetrado la dentina",
        symbol_type: "fill",
        color_type: "red",
        fill_surfaces: true,
        between_teeth: false,
        default_price: 50,

        status: "active",
        user_id_registration: 1,
        date_time_registration: getLimaDateTime(),
      },
      {
        condition_code: "caries-cdp",
        condition_name: "Caries con Compromiso Pulpar",
        category: "patologia",
        cie10_code: "K04.0",
        abbreviation: "CDP",
        description:
          "Lesión dibujada en rojo en las superficies comprometidas - Compromiso de pulpa",
        specifications:
          "Caries profunda con afectación pulpar. Requiere tratamiento de conducto",
        symbol_type: "fill",
        color_type: "red",
        fill_surfaces: true,
        between_teeth: false,
        default_price: 100,

        status: "active",
        user_id_registration: 1,
        date_time_registration: getLimaDateTime(),
      },
      {
        condition_code: "fractura",
        condition_name: "Fractura",
        category: "patologia",
        cie10_code: "S02.5",
        description:
          "Línea recta roja según dirección de la fractura (corona o raíz)",
        symbol_type: "line",
        color_type: "red",
        fill_surfaces: false,
        between_teeth: false,
        default_price: 150,

        status: "active",
        user_id_registration: 1,
        date_time_registration: getLimaDateTime(),
      },
      {
        condition_code: "remanente-radicular",
        condition_name: "Remanente Radicular",
        category: "patologia",
        cie10_code: "K04.1",
        abbreviation: "RR",
        description: "Letras RR sobre la raíz correspondiente",
        symbol_type: "text",
        color_type: "red",
        fill_surfaces: false,
        between_teeth: false,
        default_price: 60,

        status: "active",
        user_id_registration: 1,
        date_time_registration: getLimaDateTime(),
      },
      {
        condition_code: "dde-hipoplasia",
        condition_name: "Hipoplasia del Esmalte",
        category: "patologia",
        cie10_code: "K00.4",
        abbreviation: "HP",
        description: "Letras HP en recuadro. Defecto en la cantidad de esmalte",
        specifications: "Identificar superficies dentarias afectadas",
        symbol_type: "text",
        color_type: "red",
        fill_surfaces: false,
        between_teeth: false,
        default_price: 0,

        status: "active",
        user_id_registration: 1,
        date_time_registration: getLimaDateTime(),
      },
      {
        condition_code: "dde-hipomineralizacion",
        condition_name: "Hipo mineralización del Esmalte",
        category: "patologia",
        cie10_code: "K00.3",
        abbreviation: "HM",
        description: "Letras HM en recuadro. Defecto en la calidad del esmalte",
        specifications: "Identificar superficies dentarias afectadas",
        symbol_type: "text",
        color_type: "red",
        fill_surfaces: false,
        between_teeth: false,
        default_price: 0,

        status: "active",
        user_id_registration: 1,
        date_time_registration: getLimaDateTime(),
      },
      {
        condition_code: "dde-opacidades",
        condition_name: "Opacidades del Esmalte",
        category: "patologia",
        cie10_code: "K00.3",
        abbreviation: "O",
        description:
          "Letra O en recuadro. Cambios en la translucidez del esmalte",
        specifications: "Identificar superficies dentarias afectadas",
        symbol_type: "text",
        color_type: "red",
        fill_surfaces: false,
        between_teeth: false,
        default_price: 0,

        status: "active",
        user_id_registration: 1,
        date_time_registration: getLimaDateTime(),
      },
      {
        condition_code: "dde-decoloracion",
        condition_name: "Decoloración del Esmalte",
        category: "patologia",
        cie10_code: "K03.7",
        abbreviation: "D",
        description: "Letra D en recuadro. Alteración del color del esmalte",
        specifications: "Identificar superficies dentarias afectadas",
        symbol_type: "text",
        color_type: "red",
        fill_surfaces: false,
        between_teeth: false,
        default_price: 0,

        status: "active",
        user_id_registration: 1,
        date_time_registration: getLimaDateTime(),
      },
      {
        condition_code: "fluorosis",
        condition_name: "Fluorosis Dental",
        category: "patologia",
        cie10_code: "K00.3",
        abbreviation: "F",
        description:
          "Letra F en recuadro. Hipomineralización por exceso de flúor",
        specifications: "Detallar clasificación utilizada y grado de severidad",
        symbol_type: "text",
        color_type: "red",
        fill_surfaces: false,
        between_teeth: false,
        default_price: 0,

        status: "active",
        user_id_registration: 1,
        date_time_registration: getLimaDateTime(),
      },
      {
        condition_code: "movilidad",
        condition_name: "Movilidad Patológica",
        category: "patologia",
        cie10_code: "K04.5",
        abbreviations: {
          M1: "Movilidad Grado 1",
          M2: "Movilidad Grado 2",
          M3: "Movilidad Grado 3",
        },
        description:
          "M + número del grado de movilidad en recuadro (M1, M2, M3)",
        specifications: "Anotar clasificación usada (ej. Miller o Nyman)",
        symbol_type: "text",
        color_type: "red",
        fill_surfaces: false,
        between_teeth: false,
        default_price: 0,

        status: "active",
        user_id_registration: 1,
        date_time_registration: getLimaDateTime(),
      },
      {
        condition_code: "desgaste",
        condition_name: "Desgaste Oclusal/Incisal",
        category: "patologia",
        cie10_code: "K03.0",
        abbreviation: "DES",
        description:
          "Área desgastada dibujada en rojo en las superficies comprometidas. Abreviatura DES en recuadro",
        specifications:
          "Registrar tipo: abrasión, erosión o abfracción. Se dibuja el área desgastada en rojo",
        symbol_type: "fill",
        color_type: "red",
        fill_surfaces: true,
        between_teeth: false,
        default_price: 0,

        status: "active",
        user_id_registration: 1,
        date_time_registration: getLimaDateTime(),
      },
      {
        condition_code: "gingivitis",
        condition_name: "Gingivitis",
        category: "patologia",
        cie10_code: "K05.0",
        description:
          "Línea horizontal roja arriba del diente (separada), indicando inflamación gingival",
        specifications:
          "Inflamación de las encías. La línea se dibuja arriba del diente, completamente separada",
        symbol_type: "horizontal-line-top",
        color_type: "red",
        fill_surfaces: false,
        between_teeth: false,
        default_price: 100,

        status: "active",
        user_id_registration: 1,
        date_time_registration: getLimaDateTime(),
      },
      {
        condition_code: "periodontitis",
        condition_name: "Periodontitis",
        category: "patologia",
        cie10_code: "K05.3",
        description:
          "Línea horizontal roja debajo de la corona, entre el diente y su número, indicando enfermedad periodontal",
        specifications:
          "Enfermedad periodontal con pérdida de soporte óseo. La línea se dibuja debajo de la corona del diente",
        symbol_type: "horizontal-line-bottom",
        color_type: "red",
        fill_surfaces: false,
        between_teeth: false,
        default_price: 200,

        status: "active",
        user_id_registration: 1,
        date_time_registration: getLimaDateTime(),
      },
      // Prótesis
      {
        condition_code: "protesis-fija",
        condition_name: "Prótesis Fija",
        category: "protesis",
        description:
          "Línea horizontal que indica extensión del puente, con líneas verticales en dientes pilares",
        specifications: "Azul (buen estado), Rojo (mal estado)",
        symbol_type: "horizontal-with-verticals",
        color_type: "blue",
        fill_surfaces: false,
        between_teeth: false,
        color_conditional: { badState: "red", goodState: "blue" },
        default_price: 800,

        status: "active",
        user_id_registration: 1,
        date_time_registration: getLimaDateTime(),
      },
      {
        condition_code: "protesis-removible",
        condition_name: "Prótesis Removible",
        category: "protesis",
        description:
          "Dos líneas rectas paralelas y horizontales a nivel de ápices",
        specifications:
          "Azul (buen estado), Rojo (mal estado). Registrar tipo de material",
        symbol_type: "double-line",
        color_type: "blue",
        fill_surfaces: false,
        between_teeth: false,
        color_conditional: { badState: "red", goodState: "blue" },
        default_price: 600,

        status: "active",
        user_id_registration: 1,
        date_time_registration: getLimaDateTime(),
      },
      {
        condition_code: "protesis-total",
        condition_name: "Prótesis Total",
        category: "protesis",
        description:
          "Dos líneas horizontales paralelas sobre coronas ausentes del arco edéntulo",
        specifications:
          "Azul (buen estado), Rojo (mal estado). Conecta dos dientes extremos del arco",
        symbol_type: "single-horizontal",
        color_type: "blue",
        fill_surfaces: false,
        between_teeth: false,
        color_conditional: { badState: "red", goodState: "blue" },
        default_price: 1200,

        status: "active",
        user_id_registration: 1,
        date_time_registration: getLimaDateTime(),
      },
      {
        condition_code: "implante",
        condition_name: "Implante",
        category: "protesis",
        abbreviation: "IMP",
        description:
          "Abreviatura IMP en recuadro (azul buen estado, rojo periimplantitis o rechazo)",
        symbol_type: "text",
        color_type: "blue",
        fill_surfaces: false,
        between_teeth: false,
        color_conditional: { badState: "red", goodState: "blue" },
        default_price: 1500,

        status: "active",
        user_id_registration: 1,
        date_time_registration: getLimaDateTime(),
      },
      // Anomalías
      {
        condition_code: "diente-ausente",
        condition_name: "Diente Ausente",
        category: "anomalia",
        cie10_code: "K08.1",
        description: "Aspa (X) sobre la figura del diente",
        symbol_type: "aspa",
        color_type: "blue",
        fill_surfaces: false,
        between_teeth: false,
        default_price: 0,

        status: "active",
        user_id_registration: 1,
        date_time_registration: getLimaDateTime(),
      },
      {
        condition_code: "edentulo-total",
        condition_name: "Edéntulo Total",
        category: "anomalia",
        cie10_code: "K08.1",
        description:
          "Línea recta horizontal azul sobre coronas ausentes en el arco correspondiente",
        symbol_type: "line",
        color_type: "blue",
        fill_surfaces: false,
        between_teeth: false,
        default_price: 0,

        status: "active",
        user_id_registration: 1,
        date_time_registration: getLimaDateTime(),
      },
      {
        condition_code: "supernumerario",
        condition_name: "Supernumerario",
        category: "anomalia",
        cie10_code: "K00.1",
        description:
          "Letra S azul encerrada en una circunferencia entre los ápices de dientes adyacentes",
        symbol_type: "circle",
        color_type: "blue",
        fill_surfaces: false,
        between_teeth: true,
        default_price: 0,

        status: "active",
        user_id_registration: 1,
        date_time_registration: getLimaDateTime(),
      },
      {
        condition_code: "pieza-en-erupcion",
        condition_name: "Pieza Dentaria en Erupción",
        category: "anomalia",
        cie10_code: "K00.6",
        description:
          "Flecha en zigzag de color azul dirigida hacia el plano oclusal",
        specifications: "Indica proceso de erupción dental activo",
        symbol_type: "arrow-zigzag",
        color_type: "blue",
        fill_surfaces: false,
        between_teeth: false,
        default_price: 0,

        status: "active",
        user_id_registration: 1,
        date_time_registration: getLimaDateTime(),
      },
      {
        condition_code: "fosas-fisuras-profundas",
        condition_name: "Fosas y Fisuras Profundas",
        category: "anomalia",
        abbreviation: "FFP",
        description:
          "Letras FFP en recuadro. Característica anatómica que requiere vigilancia",
        symbol_type: "text",
        color_type: "blue",
        fill_surfaces: false,
        between_teeth: false,
        default_price: 0,

        status: "active",
        user_id_registration: 1,
        date_time_registration: getLimaDateTime(),
      },
      {
        condition_code: "diastema",
        condition_name: "Diastema",
        category: "anomalia",
        cie10_code: "K07.3",
        description:
          "Signo de paréntesis invertido ) ( entre las piezas dentarias (abiertos hacia afuera)",
        symbol_type: "parenthesis",
        color_type: "blue",
        fill_surfaces: false,
        between_teeth: true,
        default_price: 50,

        status: "active",
        user_id_registration: 1,
        date_time_registration: getLimaDateTime(),
      },
      {
        condition_code: "diente-ectopico",
        condition_name: "Diente Ectópico",
        category: "anomalia",
        cie10_code: "K07.4",
        abbreviation: "E",
        description: "Letra E en recuadro",
        symbol_type: "text",
        color_type: "blue",
        fill_surfaces: false,
        between_teeth: false,
        default_price: 0,

        status: "active",
        user_id_registration: 1,
        date_time_registration: getLimaDateTime(),
      },
      {
        condition_code: "diente-en-clavija",
        condition_name: "Diente en Clavija",
        category: "anomalia",
        cie10_code: "K00.2",
        description: "Triángulo azul circunscribiendo el número del diente",
        symbol_type: "triangle",
        color_type: "blue",
        fill_surfaces: false,
        between_teeth: false,
        default_price: 0,

        status: "active",
        user_id_registration: 1,
        date_time_registration: getLimaDateTime(),
      },
      {
        condition_code: "diente-extruido",
        condition_name: "Diente Extruido",
        category: "anomalia",
        cie10_code: "K07.4",
        description: "Flecha azul dirigida hacia el plano oclusal",
        symbol_type: "arrow",
        color_type: "blue",
        fill_surfaces: false,
        between_teeth: false,
        default_price: 0,

        status: "active",
        user_id_registration: 1,
        date_time_registration: getLimaDateTime(),
      },
      {
        condition_code: "diente-intruido",
        condition_name: "Diente Intruido",
        category: "anomalia",
        cie10_code: "K07.3",
        description: "Flecha azul dirigida hacia el ápice del diente",
        symbol_type: "arrow",
        color_type: "blue",
        fill_surfaces: false,
        between_teeth: false,
        default_price: 0,

        status: "active",
        user_id_registration: 1,
        date_time_registration: getLimaDateTime(),
      },
      {
        condition_code: "giroversion",
        condition_name: "Giroversión",
        category: "anomalia",
        cie10_code: "K07.3",
        description: "Flecha curva azul siguiendo el sentido de la giroversión",
        symbol_type: "curve-arrow",
        color_type: "blue",
        fill_surfaces: false,
        between_teeth: false,
        default_price: 0,

        status: "active",
        user_id_registration: 1,
        date_time_registration: getLimaDateTime(),
      },
      {
        condition_code: "migracion",
        condition_name: "Migración",
        category: "anomalia",
        cie10_code: "K07.3",
        description:
          "Flecha recta horizontal azul indicando el sentido del desplazamiento (mesial o distal). Seleccione dirección al aplicar",
        specifications:
          "Seleccionar dirección: Mesial (M) hacia el centro de la arcada, Distal (D) alejándose del centro",
        symbol_type: "arrow",
        color_type: "blue",
        fill_surfaces: false,
        between_teeth: false,
        default_price: 0,

        status: "active",
        user_id_registration: 1,
        date_time_registration: getLimaDateTime(),
      },
      {
        condition_code: "transposicion",
        condition_name: "Transposición",
        category: "anomalia",
        cie10_code: "K07.3",
        description:
          "Dos flechas curvas azules entrecruzadas entre los números de las piezas. Requiere seleccionar 2 dientes que intercambian posición",
        specifications:
          "Norma 5.3.37 - Dos flechas curvas cruzadas a la altura de los números de diente indicando intercambio de posición",
        symbol_type: "crossed-arrows",
        color_type: "blue",
        fill_surfaces: false,
        between_teeth: false,
        default_price: 0,

        status: "active",
        user_id_registration: 1,
        date_time_registration: getLimaDateTime(),
      },
      {
        condition_code: "geminacion",
        condition_name: "Geminación",
        category: "anomalia",
        cie10_code: "K00.2",
        description:
          "Circunferencia azul encerrando el número del diente (un diente intenta dividirse en dos)",
        symbol_type: "double-circle",
        color_type: "blue",
        fill_surfaces: false,
        between_teeth: false,
        default_price: 0,

        status: "active",
        user_id_registration: 1,
        date_time_registration: getLimaDateTime(),
      },
      {
        condition_code: "fusion",
        condition_name: "Fusión",
        category: "anomalia",
        cie10_code: "K00.2",
        description:
          "Dos circunferencias interceptadas de color azul que encierran los números de las piezas afectadas (dos dientes unidos en uno)",
        symbol_type: "double-circle",
        color_type: "blue",
        fill_surfaces: false,
        between_teeth: false,
        default_price: 0,

        status: "active",
        user_id_registration: 1,
        date_time_registration: getLimaDateTime(),
      },
      {
        condition_code: "impactacion",
        condition_name: "Impactación",
        category: "anomalia",
        cie10_code: "K01.1",
        abbreviation: "I",
        description: "Letra I en recuadro",
        symbol_type: "text",
        color_type: "blue",
        fill_surfaces: false,
        between_teeth: false,
        default_price: 0,

        status: "active",
        user_id_registration: 1,
        date_time_registration: getLimaDateTime(),
      },
      {
        condition_code: "semi-impactacion",
        condition_name: "Semi-impactación",
        category: "anomalia",
        cie10_code: "K01.1",
        abbreviation: "SI",
        description: "Letras SI en recuadro",
        symbol_type: "text",
        color_type: "blue",
        fill_surfaces: false,
        between_teeth: false,
        default_price: 0,

        status: "active",
        user_id_registration: 1,
        date_time_registration: getLimaDateTime(),
      },
      {
        condition_code: "diente-discromico",
        condition_name: "Diente Discrómico",
        category: "anomalia",
        cie10_code: "K03.7",
        abbreviation: "DIS",
        description: "Abreviatura DIS en recuadro",
        symbol_type: "text",
        color_type: "blue",
        fill_surfaces: false,
        between_teeth: false,
        default_price: 0,

        status: "active",
        user_id_registration: 1,
        date_time_registration: getLimaDateTime(),
      },
      {
        condition_code: "macrodoncia",
        condition_name: "Macrodoncia",
        category: "anomalia",
        cie10_code: "K00.2",
        abbreviation: "MAC",
        description: "Abreviatura MAC en recuadro",
        symbol_type: "text",
        color_type: "blue",
        fill_surfaces: false,
        between_teeth: false,
        default_price: 0,

        status: "active",
        user_id_registration: 1,
        date_time_registration: getLimaDateTime(),
      },
      {
        condition_code: "microdoncia",
        condition_name: "Microdoncia",
        category: "anomalia",
        cie10_code: "K00.2",
        abbreviation: "MIC",
        description: "Abreviatura MIC en recuadro",
        symbol_type: "text",
        color_type: "blue",
        fill_surfaces: false,
        between_teeth: false,
        default_price: 0,

        status: "active",
        user_id_registration: 1,
        date_time_registration: getLimaDateTime(),
      },
      {
        condition_code: "posicion-dentaria",
        condition_name: "Posición Dentaria Alterada",
        category: "anomalia",
        cie10_code: "K07.3",
        abbreviations: {
          D: "Distalizado",
          L: "Lingualizado",
          M: "Mesializado",
          P: "Palatinizado",
          V: "Vestibularizado",
        },
        description:
          "Abreviatura de posición en recuadro. Permite combinaciones (ej. M+V, D+P)",
        specifications: "Se pueden combinar múltiples posiciones según el caso",
        symbol_type: "text",
        color_type: "blue",
        fill_surfaces: false,
        between_teeth: false,
        default_price: 0,

        status: "active",
        user_id_registration: 1,
        date_time_registration: getLimaDateTime(),
      },
      // Ortodoncia
      {
        condition_code: "aparato-fijo",
        condition_name: "Aparato Ortodóncico Fijo",
        category: "ortodoncia",
        description:
          "Cuadrados con cruz en su interior, ubicados a nivel de los ápices de las piezas extremas, unidos por una línea recta",
        specifications:
          "Azul (buen estado), Rojo (mal estado). Detallar tipo de aparatología",
        symbol_type: "cross-square",
        color_type: "blue",
        fill_surfaces: false,
        between_teeth: false,
        color_conditional: { badState: "red", goodState: "blue" },
        default_price: 0,

        status: "active",
        user_id_registration: 1,
        date_time_registration: getLimaDateTime(),
      },
      {
        condition_code: "aparato-removible",
        condition_name: "Aparato Ortodóncico Removible",
        category: "ortodoncia",
        description:
          "Línea en zigzag a la altura de los ápices de las piezas del maxilar en tratamiento",
        specifications:
          "Azul (buen estado), Rojo (mal estado). Tipo de aparato",
        symbol_type: "zigzag",
        color_type: "blue",
        fill_surfaces: false,
        between_teeth: false,
        color_conditional: { badState: "red", goodState: "blue" },
        default_price: 0,

        status: "active",
        user_id_registration: 1,
        date_time_registration: getLimaDateTime(),
      },
      // Tratamientos
      {
        condition_code: "restauracion",
        condition_name: "Restauración Definitiva",
        category: "tratamiento",
        abbreviations: {
          C: "Carilla estética",
          R: "Resina",
          AM: "Amalgama",
          IE: "Incrustación estética",
          IM: "Incrustación metálica",
          IV: "Ionómero de vidrio",
        },
        description:
          "Pintar totalmente la superficie comprometida según estado (azul buen estado, rojo mal estado)",
        specifications:
          "Sigla del material empleado (mayúsculas). Carillas solo en cara vestibular de dientes anteriores",
        symbol_type: "fill",
        color_type: "blue",
        fill_surfaces: true,
        between_teeth: false,
        color_conditional: { badState: "red", goodState: "blue" },
        default_price: 80,

        status: "active",
        user_id_registration: 1,
        date_time_registration: getLimaDateTime(),
      },
      {
        condition_code: "restauracion-temporal",
        condition_name: "Restauración Temporal",
        category: "tratamiento",
        description:
          "Contorno rojo de la restauración, siguiendo su forma (solo borde, sin relleno)",
        symbol_type: "outline",
        color_type: "red",
        fill_surfaces: false,
        between_teeth: false,
        default_price: 40,

        status: "active",
        user_id_registration: 1,
        date_time_registration: getLimaDateTime(),
      },
      {
        condition_code: "sellantes",
        condition_name: "Sellantes",
        category: "tratamiento",
        abbreviation: "S",
        description:
          "Se dibuja el recorrido del sellante según forma de fosas y fisuras. Colocar S en recuadro",
        specifications:
          "Azul (buen estado), Rojo (mal estado). En mal estado se dibuja azul + rojo en área afectada",
        symbol_type: "outline",
        color_type: "blue",
        fill_surfaces: false,
        between_teeth: false,
        color_conditional: { badState: "red", goodState: "blue" },
        default_price: 30,

        status: "active",
        user_id_registration: 1,
        date_time_registration: getLimaDateTime(),
      },
      {
        condition_code: "corona-definitiva",
        condition_name: "Corona Definitiva",
        category: "tratamiento",
        abbreviations: {
          CM: "Corona Metálica (solo metálica)",
          CF: "Corona Fenestrada (ventana vestibular)",
          CMC: "Corona Metal Cerámica",
          CV: "Corona Veneer (metálica con frente estético)",
          CJ: "Corona Jacket (estética libre de metal)",
        },
        description:
          "Cuadrado que encierra la corona de la pieza tratada. CMC aparece en ROJO, las demás en AZUL",
        specifications:
          "Registrar color del metal (dorado o plateado). Sigla del tipo de corona en recuadro. CMC se dibuja en rojo automáticamente, las demás en azul",
        symbol_type: "square",
        color_type: "blue",
        fill_surfaces: false,
        between_teeth: false,
        default_price: 500,

        status: "active",
        user_id_registration: 1,
        date_time_registration: getLimaDateTime(),
      },
      {
        condition_code: "corona-temporal",
        condition_name: "Corona Temporal",
        category: "tratamiento",
        abbreviation: "CT",
        description:
          "Cuadrado rojo que encierra la corona de la pieza tratada. Abreviatura CT en recuadro",
        symbol_type: "square",
        color_type: "red",
        fill_surfaces: false,
        between_teeth: false,
        default_price: 150,

        status: "active",
        user_id_registration: 1,
        date_time_registration: getLimaDateTime(),
      },
      {
        condition_code: "espigo-munon",
        condition_name: "Espigo - Muñón",
        category: "tratamiento",
        description:
          "Línea vertical en la raíz unida a un cuadrado en la corona",
        specifications:
          "Azul (buen estado), Rojo (mal estado). Registrar cuando se observe clínica o radiográficamente",
        symbol_type: "square",
        color_type: "blue",
        fill_surfaces: false,
        between_teeth: false,
        color_conditional: { badState: "red", goodState: "blue" },
        default_price: 200,

        status: "active",
        user_id_registration: 1,
        date_time_registration: getLimaDateTime(),
      },
      {
        condition_code: "tratamiento-pulpar",
        condition_name: "Tratamiento Pulpar",
        category: "tratamiento",
        description:
          "TC y PC: Línea vertical en raíz. PP: Cuadrado en cámara pulpar coronal. Seleccionar estado y luego el tipo específico (TC, PC o PP)",
        specifications:
          "Norma 5.3.36 - TC y PC se dibujan igual (línea en raíz) pero con abreviaturas diferentes. PP dibuja cuadrado en pulpa coronal",
        symbol_type: "line",
        color_type: "blue",
        fill_surfaces: false,
        between_teeth: false,
        color_conditional: { badState: "red", goodState: "blue" },
        default_price: 250,

        status: "active",
        user_id_registration: 1,
        date_time_registration: getLimaDateTime(),
      },
    ],
    skipDuplicates: true,
  });

  // =====================================================
  // 30. PLANES DE ORTODONCIA (orthodontic_plans)
  // =====================================================
  console.log("🦷 Poblando planes de ortodoncia...");
  await prisma.orthodontic_plans.createMany({
    data: [
      {
        plan_type: "brackets_convencionales",
        plan_modality: "presupuesto_total",
        monto_total: 4000.00,
        inicial: 600.00,
        pago_mensual: 150.00,
        status: "active",
        user_id_registration: 1,
        date_time_registration: getLimaDateTime(),
      },
      {
        plan_type: "brackets_convencionales",
        plan_modality: "sin_presupuesto",
        monto_total: null,
        inicial: 600.00,
        pago_mensual: 180.00,
        status: "active",
        user_id_registration: 1,
        date_time_registration: getLimaDateTime(),
      },
      {
        plan_type: "brackets_convencionales",
        plan_modality: "sin_inicial",
        monto_total: null,
        inicial: null,
        pago_mensual: 220.00,
        status: "active",
        user_id_registration: 1,
        date_time_registration: getLimaDateTime(),
      },
      {
        plan_type: "autoligantes",
        plan_modality: "presupuesto_total",
        monto_total: 6000.00,
        inicial: 1000.00,
        pago_mensual: 150.00,
        status: "active",
        user_id_registration: 1,
        date_time_registration: getLimaDateTime(),
      },
      {
        plan_type: "zafiro",
        plan_modality: "presupuesto_total",
        monto_total: 6000.00,
        inicial: 1000.00,
        pago_mensual: 200.00,
        status: "active",
        user_id_registration: 1,
        date_time_registration: getLimaDateTime(),
      },
      {
        plan_type: "alineadores",
        plan_modality: "presupuesto_total",
        monto_total: 8000.00,
        inicial: 2000.00,
        pago_mensual: 300.00,
        status: "active",
        user_id_registration: 1,
        date_time_registration: getLimaDateTime(),
      },
    ],
    skipDuplicates: true,
  });

  // =====================================================
  // 31. PLANES DE IMPLANTES (implant_plans)
  // =====================================================
  console.log("🦷 Poblando planes de implantes...");
  await prisma.implant_plans.createMany({
    data: [
      {
        plan_type: "inmediato",
        monto_total: 3500.00,
        inicial: 1500.00,
        mensual: 500.00,
        status: "active",
        user_id_registration: 1,
        date_time_registration: getLimaDateTime(),
      },
      {
        plan_type: "convencional",
        monto_total: 3500.00,
        inicial: 1500.00,
        mensual: 500.00,
        status: "active",
        user_id_registration: 1,
        date_time_registration: getLimaDateTime(),
      },
      {
        plan_type: "hibrido_superior",
        monto_total: 15000.00,
        inicial: 5000.00,
        mensual: 2500.00,
        status: "active",
        user_id_registration: 1,
        date_time_registration: getLimaDateTime(),
      },
      {
        plan_type: "hibrido_inferior",
        monto_total: 11000.00,
        inicial: 4000.00,
        mensual: 1750.00,
        status: "active",
        user_id_registration: 1,
        date_time_registration: getLimaDateTime(),
      },
    ],
    skipDuplicates: true,
  });

  // =====================================================
  // 32. CONFIGURACIÓN DE BENEFICIOS (benefit_settings)
  // =====================================================
  console.log("🎁 Poblando configuración de beneficios...");
  await prisma.benefit_settings.createMany({
    data: [
      {
        benefit_code: "PRIMERA_CONSULTA",
        benefit_name: "Primera Consulta",
        description: "Beneficio de primera consulta gratuita para pacientes con plan de salud. Solo aplica a la primera cita de atencion del paciente.",
        price_without_plan: 50.00,
        price_plan_personal: 0.00,
        price_plan_familiar: 0.00,
        price_plan_platinium: 0.00,
        price_plan_oro: 0.00,
        is_active: true,
        status: "active",
        user_id_registration: 1,
        date_time_registration: getLimaDateTime(),
      },
    ],
    skipDuplicates: true,
  });

  // =====================================================
  // 33. ITEMS DE PRÓTESIS (prosthesis_items)
  // =====================================================
  console.log("🦷 Poblando items de prótesis...");
  await prisma.prosthesis_items.createMany({
    data: [
      {
        item_number: 1,
        treatment_projection: "modelos  estudio",
        cost: 150.00,
        display_order: 1,
        status: "active",
        user_id_registration: 1,
        date_time_registration: getLimaDateTime(),
      },
      {
        item_number: 2,
        treatment_projection: "jig multifuncional",
        cost: 150.00,
        display_order: 2,
        status: "active",
        user_id_registration: 1,
        date_time_registration: getLimaDateTime(),
      },
      {
        item_number: 3,
        treatment_projection: "encerado de diagnostico",
        cost: 100.00,
        display_order: 3,
        status: "active",
        user_id_registration: 1,
        date_time_registration: getLimaDateTime(),
      },
      {
        item_number: 4,
        treatment_projection: "simulación",
        cost: 100.00,
        display_order: 4,
        status: "active",
        user_id_registration: 1,
        date_time_registration: getLimaDateTime(),
      },
    ],
    skipDuplicates: true,
  });

  // =====================================================
  // 34. PROCEDIMIENTOS DE CONDICIONES DEL ODONTOGRAMA (odontogram_condition_procedures)
  // =====================================================
  console.log("🦷 Poblando procedimientos de condiciones del odontograma...");
  await prisma.odontogram_condition_procedures.createMany({
    data: [
      // Odontología Integral - Caries con Compromiso Pulpar (condition_id: 4)
      { odontogram_condition_id: 4, procedure_name: "Medicación", procedure_code: "OI001", display_order: 1, specialty: "Odontología Integral", price_without_plan: 50.00, price_plan_personal: 0.00, price_plan_familiar: 0.00, price_plan_platinium: 0.00, price_plan_oro: 0.00, status: "active", user_id_registration: 1, date_time_registration: getLimaDateTime() },
      { odontogram_condition_id: 4, procedure_name: "Pulpitis aguda", procedure_code: "OI002", display_order: 2, specialty: "Odontología Integral", price_without_plan: 100.00, price_plan_personal: 20.00, price_plan_familiar: 20.00, price_plan_platinium: 0.00, price_plan_oro: 0.00, status: "active", user_id_registration: 1, date_time_registration: getLimaDateTime() },

      // Odontología Integral - Caries de Dentina (condition_id: 3)
      { odontogram_condition_id: 3, procedure_name: "Reconstrucción de ángulo", procedure_code: "OI003", display_order: 1, specialty: "Odontología Integral", price_without_plan: 150.00, price_plan_personal: 40.00, price_plan_familiar: 40.00, price_plan_platinium: 40.00, price_plan_oro: 40.00, status: "active", user_id_registration: 1, date_time_registration: getLimaDateTime() },
      { odontogram_condition_id: 3, procedure_name: "Restauración estética compuesta", procedure_code: "OI004", display_order: 2, specialty: "Odontología Integral", price_without_plan: 130.00, price_plan_personal: 30.00, price_plan_familiar: 30.00, price_plan_platinium: 30.00, price_plan_oro: 30.00, status: "active", user_id_registration: 1, date_time_registration: getLimaDateTime() },
      { odontogram_condition_id: 3, procedure_name: "Restauración estética compleja", procedure_code: "OI005", display_order: 3, specialty: "Odontología Integral", price_without_plan: 150.00, price_plan_personal: 30.00, price_plan_familiar: 30.00, price_plan_platinium: 30.00, price_plan_oro: 30.00, status: "active", user_id_registration: 1, date_time_registration: getLimaDateTime() },

      // Odontología Integral - Caries de Esmalte (condition_id: 2)
      { odontogram_condition_id: 2, procedure_name: "Restauración estética simple", procedure_code: "OI006", display_order: 1, specialty: "Odontología Integral", price_without_plan: 70.00, price_plan_personal: 20.00, price_plan_familiar: 20.00, price_plan_platinium: 20.00, price_plan_oro: 20.00, status: "active", user_id_registration: 1, date_time_registration: getLimaDateTime() },
      { odontogram_condition_id: 2, procedure_name: "Inactivación de caries incipientes", procedure_code: "OI007", display_order: 2, specialty: "Odontología Integral", price_without_plan: 40.00, price_plan_personal: 10.00, price_plan_familiar: 10.00, price_plan_platinium: 10.00, price_plan_oro: 0.00, status: "active", user_id_registration: 1, date_time_registration: getLimaDateTime() },

      // Rehabilitación Oral - Corona Definitiva (condition_id: 46)
      { odontogram_condition_id: 46, procedure_name: "Corona colada", procedure_code: "RO001", display_order: 1, specialty: "Rehabilitación Oral", price_without_plan: 350.00, price_plan_personal: null, price_plan_familiar: null, price_plan_platinium: 80.00, price_plan_oro: 80.00, status: "active", user_id_registration: 1, date_time_registration: getLimaDateTime() },
      { odontogram_condition_id: 46, procedure_name: "Corona Veneer acrílico", procedure_code: "RO002", display_order: 2, specialty: "Rehabilitación Oral", price_without_plan: 400.00, price_plan_personal: null, price_plan_familiar: null, price_plan_platinium: 80.00, price_plan_oro: 80.00, status: "active", user_id_registration: 1, date_time_registration: getLimaDateTime() },
      { odontogram_condition_id: 46, procedure_name: "Corona acrílico", procedure_code: "RO003", display_order: 3, specialty: "Rehabilitación Oral", price_without_plan: 400.00, price_plan_personal: null, price_plan_familiar: null, price_plan_platinium: 80.00, price_plan_oro: 80.00, status: "active", user_id_registration: 1, date_time_registration: getLimaDateTime() },
      { odontogram_condition_id: 46, procedure_name: "Corona composite", procedure_code: "RO004", display_order: 4, specialty: "Rehabilitación Oral", price_without_plan: 650.00, price_plan_personal: null, price_plan_familiar: null, price_plan_platinium: 100.00, price_plan_oro: 100.00, status: "active", user_id_registration: 1, date_time_registration: getLimaDateTime() },
      { odontogram_condition_id: 46, procedure_name: "Corona porcelana sobre metal", procedure_code: "RO005", display_order: 5, specialty: "Rehabilitación Oral", price_without_plan: 750.00, price_plan_personal: null, price_plan_familiar: null, price_plan_platinium: 300.00, price_plan_oro: 300.00, status: "active", user_id_registration: 1, date_time_registration: getLimaDateTime() },
      { odontogram_condition_id: 46, procedure_name: "Corona libre sin metal", procedure_code: "RO006", display_order: 6, specialty: "Rehabilitación Oral", price_without_plan: 1200.00, price_plan_personal: null, price_plan_familiar: null, price_plan_platinium: 350.00, price_plan_oro: 350.00, status: "active", user_id_registration: 1, date_time_registration: getLimaDateTime() },
      { odontogram_condition_id: 46, procedure_name: "Corona de Zirconio", procedure_code: "RO007", display_order: 7, specialty: "Rehabilitación Oral", price_without_plan: 1200.00, price_plan_personal: null, price_plan_familiar: null, price_plan_platinium: 350.00, price_plan_oro: 350.00, status: "active", user_id_registration: 1, date_time_registration: getLimaDateTime() },
      { odontogram_condition_id: 46, procedure_name: "Corona sobre implantes", procedure_code: "PI001", display_order: 8, specialty: "Periodoncia e Implantes", price_without_plan: 2000.00, price_plan_personal: null, price_plan_familiar: null, price_plan_platinium: 1000.00, price_plan_oro: 500.00, status: "active", user_id_registration: 1, date_time_registration: getLimaDateTime() },
      { odontogram_condition_id: 46, procedure_name: "Corona inceran (Inc-Laboratorio)", procedure_code: "PI002", display_order: 9, specialty: "Periodoncia e Implantes", price_without_plan: 1000.00, price_plan_personal: null, price_plan_familiar: null, price_plan_platinium: 250.00, price_plan_oro: 250.00, status: "active", user_id_registration: 1, date_time_registration: getLimaDateTime() },
      { odontogram_condition_id: 46, procedure_name: "Corona Jacket de acrílico termocurada", procedure_code: "PI003", display_order: 10, specialty: "Periodoncia e Implantes", price_without_plan: 500.00, price_plan_personal: null, price_plan_familiar: null, price_plan_platinium: 100.00, price_plan_oro: 100.00, status: "active", user_id_registration: 1, date_time_registration: getLimaDateTime() },
      { odontogram_condition_id: 46, procedure_name: "Corona metal free CEREC pilar zircon CADCAM", procedure_code: "PI004", display_order: 11, specialty: "Periodoncia e Implantes", price_without_plan: 3000.00, price_plan_personal: null, price_plan_familiar: null, price_plan_platinium: 500.00, price_plan_oro: 500.00, status: "active", user_id_registration: 1, date_time_registration: getLimaDateTime() },
      { odontogram_condition_id: 46, procedure_name: "Corona Provisional con Ucla de Titanio", procedure_code: "PI005", display_order: 12, specialty: "Periodoncia e Implantes", price_without_plan: 500.00, price_plan_personal: null, price_plan_familiar: null, price_plan_platinium: 250.00, price_plan_oro: 250.00, status: "active", user_id_registration: 1, date_time_registration: getLimaDateTime() },
      { odontogram_condition_id: 46, procedure_name: "Corona s/implante cement.(CONEXAO NEODENT) car inm", procedure_code: "PI006", display_order: 13, specialty: "Periodoncia e Implantes", price_without_plan: 2000.00, price_plan_personal: null, price_plan_familiar: null, price_plan_platinium: 1000.00, price_plan_oro: 500.00, status: "active", user_id_registration: 1, date_time_registration: getLimaDateTime() },
      { odontogram_condition_id: 46, procedure_name: "Corona s/implante cement.(CONEXAO NEODENT) car.dif", procedure_code: "PI007", display_order: 14, specialty: "Periodoncia e Implantes", price_without_plan: 2000.00, price_plan_personal: null, price_plan_familiar: null, price_plan_platinium: 1000.00, price_plan_oro: 500.00, status: "active", user_id_registration: 1, date_time_registration: getLimaDateTime() },
      { odontogram_condition_id: 46, procedure_name: "Corona E max (Disilicato de litio)", procedure_code: "PI008", display_order: 15, specialty: "Periodoncia e Implantes", price_without_plan: 1200.00, price_plan_personal: null, price_plan_familiar: null, price_plan_platinium: 500.00, price_plan_oro: 250.00, status: "active", user_id_registration: 1, date_time_registration: getLimaDateTime() },

      // Corona Temporal (condition_id: 47)
      { odontogram_condition_id: 47, procedure_name: "Corona provisoria de acrílico", procedure_code: "RO008", display_order: 1, specialty: "Rehabilitación Oral", price_without_plan: 200.00, price_plan_personal: null, price_plan_familiar: null, price_plan_platinium: 50.00, price_plan_oro: 50.00, status: "active", user_id_registration: 1, date_time_registration: getLimaDateTime() },

      // Decoloración (condition_id: 10)
      { odontogram_condition_id: 10, procedure_name: "Jeringa para aclaramiento (Unidad)", procedure_code: "PI009", display_order: 1, specialty: "Periodoncia e Implantes", price_without_plan: 250.00, price_plan_personal: null, price_plan_familiar: null, price_plan_platinium: 150.00, price_plan_oro: 150.00, status: "active", user_id_registration: 1, date_time_registration: getLimaDateTime() },

      // Desgaste (condition_id: 13)
      { odontogram_condition_id: 13, procedure_name: "Desgaste selectivo, por sesión", procedure_code: "PE001", display_order: 1, specialty: "Periodoncia", price_without_plan: 50.00, price_plan_personal: 0.00, price_plan_familiar: 0.00, price_plan_platinium: 0.00, price_plan_oro: 0.00, status: "active", user_id_registration: 1, date_time_registration: getLimaDateTime() },

      // Espigo Muñón (condition_id: 48)
      { odontogram_condition_id: 48, procedure_name: "Perno fibra de vidrio", procedure_code: "RO009", display_order: 1, specialty: "Rehabilitación Oral", price_without_plan: 250.00, price_plan_personal: null, price_plan_familiar: null, price_plan_platinium: 50.00, price_plan_oro: 50.00, status: "active", user_id_registration: 1, date_time_registration: getLimaDateTime() },
      { odontogram_condition_id: 48, procedure_name: "Perno fibra de vidrio indirecto", procedure_code: "RO010", display_order: 2, specialty: "Rehabilitación Oral", price_without_plan: 250.00, price_plan_personal: null, price_plan_familiar: null, price_plan_platinium: 60.00, price_plan_oro: 60.00, status: "active", user_id_registration: 1, date_time_registration: getLimaDateTime() },
      { odontogram_condition_id: 48, procedure_name: "Perno compuesto (secc. o pasante) indirecto", procedure_code: "RO011", display_order: 3, specialty: "Rehabilitación Oral", price_without_plan: 250.00, price_plan_personal: null, price_plan_familiar: null, price_plan_platinium: 60.00, price_plan_oro: 60.00, status: "active", user_id_registration: 1, date_time_registration: getLimaDateTime() },
      { odontogram_condition_id: 48, procedure_name: "Perno preformado simple", procedure_code: "RO012", display_order: 4, specialty: "Rehabilitación Oral", price_without_plan: 250.00, price_plan_personal: null, price_plan_familiar: null, price_plan_platinium: 50.00, price_plan_oro: 50.00, status: "active", user_id_registration: 1, date_time_registration: getLimaDateTime() },
      { odontogram_condition_id: 48, procedure_name: "Perno preformado compuesto (doble)", procedure_code: "RO013", display_order: 5, specialty: "Rehabilitación Oral", price_without_plan: 300.00, price_plan_personal: null, price_plan_familiar: null, price_plan_platinium: 50.00, price_plan_oro: 50.00, status: "active", user_id_registration: 1, date_time_registration: getLimaDateTime() },
      { odontogram_condition_id: 48, procedure_name: "Reconstrucción muñón sin perno (build up)", procedure_code: "RO014", display_order: 6, specialty: "Rehabilitación Oral", price_without_plan: 250.00, price_plan_personal: null, price_plan_familiar: null, price_plan_platinium: 30.00, price_plan_oro: 30.00, status: "active", user_id_registration: 1, date_time_registration: getLimaDateTime() },

      // Fluorosis (condition_id: 11)
      { odontogram_condition_id: 11, procedure_name: "Inactivación de policaries activas", procedure_code: "OI008", display_order: 1, specialty: "Odontología Integral", price_without_plan: 50.00, price_plan_personal: 20.00, price_plan_familiar: 20.00, price_plan_platinium: 20.00, price_plan_oro: 0.00, status: "active", user_id_registration: 1, date_time_registration: getLimaDateTime() },
      { odontogram_condition_id: 11, procedure_name: "Educación para la salud (fisiot. oral, nutric.)", procedure_code: "OI009", display_order: 2, specialty: "Odontología Integral", price_without_plan: 40.00, price_plan_personal: 0.00, price_plan_familiar: 0.00, price_plan_platinium: 0.00, price_plan_oro: 0.00, status: "active", user_id_registration: 1, date_time_registration: getLimaDateTime() },

      // Fractura (condition_id: 5)
      { odontogram_condition_id: 5, procedure_name: "Traumatismo dental con fractura amelodentinaria", procedure_code: "OI010", display_order: 1, specialty: "Odontología Integral", price_without_plan: 100.00, price_plan_personal: 40.00, price_plan_familiar: 40.00, price_plan_platinium: 40.00, price_plan_oro: 40.00, status: "active", user_id_registration: 1, date_time_registration: getLimaDateTime() },
      { odontogram_condition_id: 5, procedure_name: "Traumatismo dent. con exposición pulpar", procedure_code: "OI011", display_order: 2, specialty: "Odontología Integral", price_without_plan: 100.00, price_plan_personal: null, price_plan_familiar: null, price_plan_platinium: 50.00, price_plan_oro: 50.00, status: "active", user_id_registration: 1, date_time_registration: getLimaDateTime() },
      { odontogram_condition_id: 5, procedure_name: "Traumatismo dent. con luxación o avulsión", procedure_code: "OI012", display_order: 3, specialty: "Odontología Integral", price_without_plan: 100.00, price_plan_personal: 20.00, price_plan_familiar: 20.00, price_plan_platinium: 20.00, price_plan_oro: 20.00, status: "active", user_id_registration: 1, date_time_registration: getLimaDateTime() },

      // Gingivitis (condition_id: 14)
      { odontogram_condition_id: 14, procedure_name: "G.U.N.A. o P.U.N.A.", procedure_code: "OI013", display_order: 1, specialty: "Odontología Integral", price_without_plan: 80.00, price_plan_personal: 20.00, price_plan_familiar: 20.00, price_plan_platinium: 30.00, price_plan_oro: 30.00, status: "active", user_id_registration: 1, date_time_registration: getLimaDateTime() },
      { odontogram_condition_id: 14, procedure_name: "Tartrectomía supragingival, cepill. mecánico", procedure_code: "OI014", display_order: 2, specialty: "Odontología Integral", price_without_plan: 60.00, price_plan_personal: 20.00, price_plan_familiar: 20.00, price_plan_platinium: 20.00, price_plan_oro: 20.00, status: "active", user_id_registration: 1, date_time_registration: getLimaDateTime() },
      { odontogram_condition_id: 14, procedure_name: "Tratamiento supragingival, por maxilar", procedure_code: "PE002", display_order: 3, specialty: "Periodoncia", price_without_plan: 100.00, price_plan_personal: 30.00, price_plan_familiar: 30.00, price_plan_platinium: 30.00, price_plan_oro: 0.00, status: "active", user_id_registration: 1, date_time_registration: getLimaDateTime() },
      { odontogram_condition_id: 14, procedure_name: "Tratamiento subgingival, por sector", procedure_code: "PE003", display_order: 4, specialty: "Periodoncia", price_without_plan: 100.00, price_plan_personal: 30.00, price_plan_familiar: 30.00, price_plan_platinium: 30.00, price_plan_oro: 0.00, status: "active", user_id_registration: 1, date_time_registration: getLimaDateTime() },

      // Impactación (condition_id: 35)
      { odontogram_condition_id: 35, procedure_name: "Exodoncia compleja", procedure_code: "CB001", display_order: 1, specialty: "Cirugía Bucal y Maxilofacial", price_without_plan: 400.00, price_plan_personal: null, price_plan_familiar: null, price_plan_platinium: 200.00, price_plan_oro: 200.00, status: "active", user_id_registration: 1, date_time_registration: getLimaDateTime() },
      { odontogram_condition_id: 35, procedure_name: "Cirugía retención dentaria mucosa", procedure_code: "CB002", display_order: 2, specialty: "Cirugía Bucal y Maxilofacial", price_without_plan: 400.00, price_plan_personal: null, price_plan_familiar: null, price_plan_platinium: 200.00, price_plan_oro: 200.00, status: "active", user_id_registration: 1, date_time_registration: getLimaDateTime() },
      { odontogram_condition_id: 35, procedure_name: "Cirugía retención dentaria ósea", procedure_code: "CB003", display_order: 3, specialty: "Cirugía Bucal y Maxilofacial", price_without_plan: 400.00, price_plan_personal: null, price_plan_familiar: null, price_plan_platinium: 200.00, price_plan_oro: 200.00, status: "active", user_id_registration: 1, date_time_registration: getLimaDateTime() },
      { odontogram_condition_id: 35, procedure_name: "Germectomía", procedure_code: "CB004", display_order: 4, specialty: "Cirugía Bucal y Maxilofacial", price_without_plan: 400.00, price_plan_personal: null, price_plan_familiar: null, price_plan_platinium: 200.00, price_plan_oro: 200.00, status: "active", user_id_registration: 1, date_time_registration: getLimaDateTime() },
      { odontogram_condition_id: 35, procedure_name: "Liberación de dientes retenidos", procedure_code: "CB005", display_order: 5, specialty: "Cirugía Bucal y Maxilofacial", price_without_plan: 400.00, price_plan_personal: null, price_plan_familiar: null, price_plan_platinium: 200.00, price_plan_oro: 200.00, status: "active", user_id_registration: 1, date_time_registration: getLimaDateTime() },

      // Implante (condition_id: 19)
      { odontogram_condition_id: 19, procedure_name: "Implante dental", procedure_code: "PI010", display_order: 1, specialty: "Periodoncia e Implantes", price_without_plan: 2000.00, price_plan_personal: null, price_plan_familiar: null, price_plan_platinium: 1000.00, price_plan_oro: 500.00, status: "active", user_id_registration: 1, date_time_registration: getLimaDateTime() },

      // Mancha Blanca (condition_id: 1)
      { odontogram_condition_id: 1, procedure_name: "Topicación de flúor", procedure_code: "OI015", display_order: 1, specialty: "Odontología Integral", price_without_plan: 30.00, price_plan_personal: 10.00, price_plan_familiar: 10.00, price_plan_platinium: 10.00, price_plan_oro: 0.00, status: "active", user_id_registration: 1, date_time_registration: getLimaDateTime() },
      { odontogram_condition_id: 1, procedure_name: "Inactivación de caries incipientes", procedure_code: "OI016", display_order: 2, specialty: "Odontología Integral", price_without_plan: 40.00, price_plan_personal: 10.00, price_plan_familiar: 10.00, price_plan_platinium: 10.00, price_plan_oro: 0.00, status: "active", user_id_registration: 1, date_time_registration: getLimaDateTime() },

      // Periodontitis (condition_id: 15)
      { odontogram_condition_id: 15, procedure_name: "Raspado y alisado radicular por sector", procedure_code: "PE004", display_order: 1, specialty: "Periodoncia", price_without_plan: 150.00, price_plan_personal: 50.00, price_plan_familiar: 50.00, price_plan_platinium: 50.00, price_plan_oro: 0.00, status: "active", user_id_registration: 1, date_time_registration: getLimaDateTime() },
      { odontogram_condition_id: 15, procedure_name: "Cirugía periodontal por sector", procedure_code: "PE005", display_order: 2, specialty: "Periodoncia", price_without_plan: 300.00, price_plan_personal: null, price_plan_familiar: null, price_plan_platinium: 100.00, price_plan_oro: 100.00, status: "active", user_id_registration: 1, date_time_registration: getLimaDateTime() },
      { odontogram_condition_id: 15, procedure_name: "Regeneración tisular guiada", procedure_code: "PE006", display_order: 3, specialty: "Periodoncia", price_without_plan: 500.00, price_plan_personal: null, price_plan_familiar: null, price_plan_platinium: 200.00, price_plan_oro: 200.00, status: "active", user_id_registration: 1, date_time_registration: getLimaDateTime() },

      // Prótesis Fija (condition_id: 16)
      { odontogram_condition_id: 16, procedure_name: "Puente colado (3 unidades)", procedure_code: "RO015", display_order: 1, specialty: "Rehabilitación Oral", price_without_plan: 1050.00, price_plan_personal: null, price_plan_familiar: null, price_plan_platinium: 240.00, price_plan_oro: 240.00, status: "active", user_id_registration: 1, date_time_registration: getLimaDateTime() },
      { odontogram_condition_id: 16, procedure_name: "Puente porcelana sobre metal (3 unidades)", procedure_code: "RO016", display_order: 2, specialty: "Rehabilitación Oral", price_without_plan: 2250.00, price_plan_personal: null, price_plan_familiar: null, price_plan_platinium: 900.00, price_plan_oro: 900.00, status: "active", user_id_registration: 1, date_time_registration: getLimaDateTime() },
      { odontogram_condition_id: 16, procedure_name: "Puente de Zirconio (3 unidades)", procedure_code: "RO017", display_order: 3, specialty: "Rehabilitación Oral", price_without_plan: 3600.00, price_plan_personal: null, price_plan_familiar: null, price_plan_platinium: 1050.00, price_plan_oro: 1050.00, status: "active", user_id_registration: 1, date_time_registration: getLimaDateTime() },

      // Prótesis Removible (condition_id: 17)
      { odontogram_condition_id: 17, procedure_name: "PPR acrílico (1-3 dientes)", procedure_code: "RO018", display_order: 1, specialty: "Rehabilitación Oral", price_without_plan: 400.00, price_plan_personal: null, price_plan_familiar: null, price_plan_platinium: 100.00, price_plan_oro: 100.00, status: "active", user_id_registration: 1, date_time_registration: getLimaDateTime() },
      { odontogram_condition_id: 17, procedure_name: "PPR acrílico (4-6 dientes)", procedure_code: "RO019", display_order: 2, specialty: "Rehabilitación Oral", price_without_plan: 500.00, price_plan_personal: null, price_plan_familiar: null, price_plan_platinium: 150.00, price_plan_oro: 150.00, status: "active", user_id_registration: 1, date_time_registration: getLimaDateTime() },
      { odontogram_condition_id: 17, procedure_name: "PPR metálico esquelético", procedure_code: "RO020", display_order: 3, specialty: "Rehabilitación Oral", price_without_plan: 800.00, price_plan_personal: null, price_plan_familiar: null, price_plan_platinium: 250.00, price_plan_oro: 250.00, status: "active", user_id_registration: 1, date_time_registration: getLimaDateTime() },
      { odontogram_condition_id: 17, procedure_name: "PPR flexible", procedure_code: "RO021", display_order: 4, specialty: "Rehabilitación Oral", price_without_plan: 700.00, price_plan_personal: null, price_plan_familiar: null, price_plan_platinium: 200.00, price_plan_oro: 200.00, status: "active", user_id_registration: 1, date_time_registration: getLimaDateTime() },

      // Prótesis Total (condition_id: 18)
      { odontogram_condition_id: 18, procedure_name: "Prótesis total acrílica superior", procedure_code: "RO022", display_order: 1, specialty: "Rehabilitación Oral", price_without_plan: 800.00, price_plan_personal: null, price_plan_familiar: null, price_plan_platinium: 250.00, price_plan_oro: 250.00, status: "active", user_id_registration: 1, date_time_registration: getLimaDateTime() },
      { odontogram_condition_id: 18, procedure_name: "Prótesis total acrílica inferior", procedure_code: "RO023", display_order: 2, specialty: "Rehabilitación Oral", price_without_plan: 800.00, price_plan_personal: null, price_plan_familiar: null, price_plan_platinium: 250.00, price_plan_oro: 250.00, status: "active", user_id_registration: 1, date_time_registration: getLimaDateTime() },
      { odontogram_condition_id: 18, procedure_name: "Prótesis total bimaxilar", procedure_code: "RO024", display_order: 3, specialty: "Rehabilitación Oral", price_without_plan: 1500.00, price_plan_personal: null, price_plan_familiar: null, price_plan_platinium: 450.00, price_plan_oro: 450.00, status: "active", user_id_registration: 1, date_time_registration: getLimaDateTime() },

      // Remanente Radicular (condition_id: 6)
      { odontogram_condition_id: 6, procedure_name: "Exodoncia simple", procedure_code: "OI017", display_order: 1, specialty: "Odontología Integral", price_without_plan: 50.00, price_plan_personal: 20.00, price_plan_familiar: 20.00, price_plan_platinium: 20.00, price_plan_oro: 20.00, status: "active", user_id_registration: 1, date_time_registration: getLimaDateTime() },
      { odontogram_condition_id: 6, procedure_name: "Exodoncia de remanente radicular", procedure_code: "OI018", display_order: 2, specialty: "Odontología Integral", price_without_plan: 80.00, price_plan_personal: 30.00, price_plan_familiar: 30.00, price_plan_platinium: 30.00, price_plan_oro: 30.00, status: "active", user_id_registration: 1, date_time_registration: getLimaDateTime() },

      // Restauración Definitiva (condition_id: 43)
      { odontogram_condition_id: 43, procedure_name: "Restauración con resina simple", procedure_code: "OI019", display_order: 1, specialty: "Odontología Integral", price_without_plan: 70.00, price_plan_personal: 20.00, price_plan_familiar: 20.00, price_plan_platinium: 20.00, price_plan_oro: 20.00, status: "active", user_id_registration: 1, date_time_registration: getLimaDateTime() },
      { odontogram_condition_id: 43, procedure_name: "Restauración con resina compuesta", procedure_code: "OI020", display_order: 2, specialty: "Odontología Integral", price_without_plan: 100.00, price_plan_personal: 30.00, price_plan_familiar: 30.00, price_plan_platinium: 30.00, price_plan_oro: 30.00, status: "active", user_id_registration: 1, date_time_registration: getLimaDateTime() },
      { odontogram_condition_id: 43, procedure_name: "Restauración con resina compleja", procedure_code: "OI021", display_order: 3, specialty: "Odontología Integral", price_without_plan: 130.00, price_plan_personal: 40.00, price_plan_familiar: 40.00, price_plan_platinium: 40.00, price_plan_oro: 40.00, status: "active", user_id_registration: 1, date_time_registration: getLimaDateTime() },
      { odontogram_condition_id: 43, procedure_name: "Incrustación estética (Inlay/Onlay)", procedure_code: "RO025", display_order: 4, specialty: "Rehabilitación Oral", price_without_plan: 400.00, price_plan_personal: null, price_plan_familiar: null, price_plan_platinium: 100.00, price_plan_oro: 100.00, status: "active", user_id_registration: 1, date_time_registration: getLimaDateTime() },

      // Sellantes (condition_id: 45)
      { odontogram_condition_id: 45, procedure_name: "Sellante de fosas y fisuras", procedure_code: "OI022", display_order: 1, specialty: "Odontología Integral", price_without_plan: 30.00, price_plan_personal: 10.00, price_plan_familiar: 10.00, price_plan_platinium: 10.00, price_plan_oro: 0.00, status: "active", user_id_registration: 1, date_time_registration: getLimaDateTime() },

      // Tratamiento Pulpar (condition_id: 49) - Incluye TC, PC y PP
      { odontogram_condition_id: 49, procedure_name: "Endodoncia unirradicular", procedure_code: "EN001", display_order: 1, specialty: "Endodoncia", price_without_plan: 250.00, price_plan_personal: 80.00, price_plan_familiar: 80.00, price_plan_platinium: 80.00, price_plan_oro: 80.00, status: "active", user_id_registration: 1, date_time_registration: getLimaDateTime() },
      { odontogram_condition_id: 49, procedure_name: "Endodoncia birradicular", procedure_code: "EN002", display_order: 2, specialty: "Endodoncia", price_without_plan: 350.00, price_plan_personal: 100.00, price_plan_familiar: 100.00, price_plan_platinium: 100.00, price_plan_oro: 100.00, status: "active", user_id_registration: 1, date_time_registration: getLimaDateTime() },
      { odontogram_condition_id: 49, procedure_name: "Endodoncia multirradicular", procedure_code: "EN003", display_order: 3, specialty: "Endodoncia", price_without_plan: 450.00, price_plan_personal: 150.00, price_plan_familiar: 150.00, price_plan_platinium: 150.00, price_plan_oro: 150.00, status: "active", user_id_registration: 1, date_time_registration: getLimaDateTime() },
      { odontogram_condition_id: 49, procedure_name: "Retratamiento endodóntico", procedure_code: "EN004", display_order: 4, specialty: "Endodoncia", price_without_plan: 500.00, price_plan_personal: null, price_plan_familiar: null, price_plan_platinium: 200.00, price_plan_oro: 200.00, status: "active", user_id_registration: 1, date_time_registration: getLimaDateTime() },
      { odontogram_condition_id: 49, procedure_name: "Pulpotomía", procedure_code: "EN005", display_order: 5, specialty: "Endodoncia", price_without_plan: 150.00, price_plan_personal: 50.00, price_plan_familiar: 50.00, price_plan_platinium: 50.00, price_plan_oro: 50.00, status: "active", user_id_registration: 1, date_time_registration: getLimaDateTime() },
      { odontogram_condition_id: 49, procedure_name: "Pulpectomía", procedure_code: "EN006", display_order: 6, specialty: "Endodoncia", price_without_plan: 200.00, price_plan_personal: 80.00, price_plan_familiar: 80.00, price_plan_platinium: 80.00, price_plan_oro: 80.00, status: "active", user_id_registration: 1, date_time_registration: getLimaDateTime() },
      { odontogram_condition_id: 49, procedure_name: "Recubrimiento pulpar directo", procedure_code: "EN007", display_order: 7, specialty: "Endodoncia", price_without_plan: 80.00, price_plan_personal: 30.00, price_plan_familiar: 30.00, price_plan_platinium: 30.00, price_plan_oro: 30.00, status: "active", user_id_registration: 1, date_time_registration: getLimaDateTime() },
      { odontogram_condition_id: 49, procedure_name: "Recubrimiento pulpar indirecto", procedure_code: "EN008", display_order: 8, specialty: "Endodoncia", price_without_plan: 60.00, price_plan_personal: 20.00, price_plan_familiar: 20.00, price_plan_platinium: 20.00, price_plan_oro: 20.00, status: "active", user_id_registration: 1, date_time_registration: getLimaDateTime() },

      // Diente Ausente (condition_id: 20)
      { odontogram_condition_id: 20, procedure_name: "Implante dental unitario", procedure_code: "PI011", display_order: 1, specialty: "Periodoncia e Implantes", price_without_plan: 2000.00, price_plan_personal: null, price_plan_familiar: null, price_plan_platinium: 1000.00, price_plan_oro: 500.00, status: "active", user_id_registration: 1, date_time_registration: getLimaDateTime() },
      { odontogram_condition_id: 20, procedure_name: "Prótesis parcial removible", procedure_code: "RO026", display_order: 2, specialty: "Rehabilitación Oral", price_without_plan: 500.00, price_plan_personal: null, price_plan_familiar: null, price_plan_platinium: 150.00, price_plan_oro: 150.00, status: "active", user_id_registration: 1, date_time_registration: getLimaDateTime() },
      { odontogram_condition_id: 20, procedure_name: "Puente dental fijo", procedure_code: "RO027", display_order: 3, specialty: "Rehabilitación Oral", price_without_plan: 1500.00, price_plan_personal: null, price_plan_familiar: null, price_plan_platinium: 500.00, price_plan_oro: 500.00, status: "active", user_id_registration: 1, date_time_registration: getLimaDateTime() },

      // Edéntulo Total (condition_id: 21)
      { odontogram_condition_id: 21, procedure_name: "Prótesis total convencional", procedure_code: "RO028", display_order: 1, specialty: "Rehabilitación Oral", price_without_plan: 800.00, price_plan_personal: null, price_plan_familiar: null, price_plan_platinium: 250.00, price_plan_oro: 250.00, status: "active", user_id_registration: 1, date_time_registration: getLimaDateTime() },
      { odontogram_condition_id: 21, procedure_name: "Sobredentadura sobre implantes", procedure_code: "PI012", display_order: 2, specialty: "Periodoncia e Implantes", price_without_plan: 5000.00, price_plan_personal: null, price_plan_familiar: null, price_plan_platinium: 2000.00, price_plan_oro: 1500.00, status: "active", user_id_registration: 1, date_time_registration: getLimaDateTime() },
      { odontogram_condition_id: 21, procedure_name: "Prótesis híbrida sobre implantes", procedure_code: "PI013", display_order: 3, specialty: "Periodoncia e Implantes", price_without_plan: 8000.00, price_plan_personal: null, price_plan_familiar: null, price_plan_platinium: 3500.00, price_plan_oro: 2500.00, status: "active", user_id_registration: 1, date_time_registration: getLimaDateTime() },

      // Diastema (condition_id: 25)
      { odontogram_condition_id: 25, procedure_name: "Cierre de diastema con resina", procedure_code: "OI023", display_order: 1, specialty: "Odontología Integral", price_without_plan: 150.00, price_plan_personal: 50.00, price_plan_familiar: 50.00, price_plan_platinium: 50.00, price_plan_oro: 50.00, status: "active", user_id_registration: 1, date_time_registration: getLimaDateTime() },
      { odontogram_condition_id: 25, procedure_name: "Carillas para cierre de diastema", procedure_code: "RO029", display_order: 2, specialty: "Rehabilitación Oral", price_without_plan: 600.00, price_plan_personal: null, price_plan_familiar: null, price_plan_platinium: 200.00, price_plan_oro: 200.00, status: "active", user_id_registration: 1, date_time_registration: getLimaDateTime() },
      { odontogram_condition_id: 25, procedure_name: "Ortodoncia para cierre de diastema", procedure_code: "OR001", display_order: 3, specialty: "Ortodoncia", price_without_plan: 3000.00, price_plan_personal: null, price_plan_familiar: null, price_plan_platinium: 1000.00, price_plan_oro: 500.00, status: "active", user_id_registration: 1, date_time_registration: getLimaDateTime() },

      // Ortodoncia Fija (condition_id: 41)
      { odontogram_condition_id: 41, procedure_name: "Brackets metálicos convencionales", procedure_code: "OR002", display_order: 1, specialty: "Ortodoncia", price_without_plan: 4000.00, price_plan_personal: null, price_plan_familiar: null, price_plan_platinium: 1500.00, price_plan_oro: 1000.00, status: "active", user_id_registration: 1, date_time_registration: getLimaDateTime() },
      { odontogram_condition_id: 41, procedure_name: "Brackets autoligantes", procedure_code: "OR003", display_order: 2, specialty: "Ortodoncia", price_without_plan: 6000.00, price_plan_personal: null, price_plan_familiar: null, price_plan_platinium: 2500.00, price_plan_oro: 1500.00, status: "active", user_id_registration: 1, date_time_registration: getLimaDateTime() },
      { odontogram_condition_id: 41, procedure_name: "Brackets estéticos de zafiro", procedure_code: "OR004", display_order: 3, specialty: "Ortodoncia", price_without_plan: 6000.00, price_plan_personal: null, price_plan_familiar: null, price_plan_platinium: 2500.00, price_plan_oro: 1500.00, status: "active", user_id_registration: 1, date_time_registration: getLimaDateTime() },
      { odontogram_condition_id: 41, procedure_name: "Alineadores invisibles", procedure_code: "OR005", display_order: 4, specialty: "Ortodoncia", price_without_plan: 8000.00, price_plan_personal: null, price_plan_familiar: null, price_plan_platinium: 3500.00, price_plan_oro: 2000.00, status: "active", user_id_registration: 1, date_time_registration: getLimaDateTime() },

      // Ortodoncia Removible (condition_id: 42)
      { odontogram_condition_id: 42, procedure_name: "Aparato removible de expansión", procedure_code: "OR006", display_order: 1, specialty: "Ortodoncia", price_without_plan: 500.00, price_plan_personal: null, price_plan_familiar: null, price_plan_platinium: 200.00, price_plan_oro: 150.00, status: "active", user_id_registration: 1, date_time_registration: getLimaDateTime() },
      { odontogram_condition_id: 42, procedure_name: "Placa activa", procedure_code: "OR007", display_order: 2, specialty: "Ortodoncia", price_without_plan: 400.00, price_plan_personal: null, price_plan_familiar: null, price_plan_platinium: 150.00, price_plan_oro: 100.00, status: "active", user_id_registration: 1, date_time_registration: getLimaDateTime() },
      { odontogram_condition_id: 42, procedure_name: "Retenedor de Hawley", procedure_code: "OR008", display_order: 3, specialty: "Ortodoncia", price_without_plan: 300.00, price_plan_personal: null, price_plan_familiar: null, price_plan_platinium: 100.00, price_plan_oro: 80.00, status: "active", user_id_registration: 1, date_time_registration: getLimaDateTime() },
    ],
    skipDuplicates: true,
  });

  // =====================================================
  // 35. SUB-PROCEDIMIENTOS (sub_procedures)
  // =====================================================
  console.log("🦷 Poblando sub-procedimientos...");
  await prisma.sub_procedures.createMany({
    data: [
      // Odontología Integral
      { sub_procedure_code: "OI002", sub_procedure_name: "Abscesos agudos", specialty: "Odontologia Integral", price_without_plan: 100.00, price_plan_personal: 0.00, price_plan_familiar: 0.00, price_plan_platinium: 30.00, price_plan_oro: 0.00, estimated_duration: 30, requires_anesthesia: false, is_active: true, status: "active", user_id_registration: 1, date_time_registration: getLimaDateTime() },
      { sub_procedure_code: "OI003", sub_procedure_name: "Alveolitis y hemorragias post-exodoncia", specialty: "Odontologia Integral", price_without_plan: 100.00, price_plan_personal: 20.00, price_plan_familiar: 20.00, price_plan_platinium: 20.00, price_plan_oro: 20.00, estimated_duration: 30, requires_anesthesia: false, is_active: true, status: "active", user_id_registration: 1, date_time_registration: getLimaDateTime() },

      // Rehabilitación Oral
      { sub_procedure_code: "RO001", sub_procedure_name: "Extraccion de corona", specialty: "Rehabilitacion Oral", price_without_plan: 80.00, price_plan_personal: null, price_plan_familiar: null, price_plan_platinium: 50.00, price_plan_oro: 50.00, estimated_duration: 30, requires_anesthesia: false, is_active: true, status: "active", user_id_registration: 1, date_time_registration: getLimaDateTime() },
      { sub_procedure_code: "RO002", sub_procedure_name: "Extraccion de perno", specialty: "Rehabilitacion Oral", price_without_plan: 80.00, price_plan_personal: null, price_plan_familiar: null, price_plan_platinium: 30.00, price_plan_oro: 20.00, estimated_duration: 30, requires_anesthesia: false, is_active: true, status: "active", user_id_registration: 1, date_time_registration: getLimaDateTime() },
      { sub_procedure_code: "RO003", sub_procedure_name: "Reparacion simple", specialty: "Rehabilitacion Oral", price_without_plan: 200.00, price_plan_personal: null, price_plan_familiar: null, price_plan_platinium: 50.00, price_plan_oro: 50.00, estimated_duration: 30, requires_anesthesia: false, is_active: true, status: "active", user_id_registration: 1, date_time_registration: getLimaDateTime() },
      { sub_procedure_code: "RO004", sub_procedure_name: "Rebasado Protesis Completa autocurado", specialty: "Rehabilitacion Oral", price_without_plan: 300.00, price_plan_personal: null, price_plan_familiar: null, price_plan_platinium: 80.00, price_plan_oro: 50.00, estimated_duration: 30, requires_anesthesia: false, is_active: true, status: "active", user_id_registration: 1, date_time_registration: getLimaDateTime() },
      { sub_procedure_code: "RO005", sub_procedure_name: "Rebasado Protesis Completa termocurado", specialty: "Rehabilitacion Oral", price_without_plan: 350.00, price_plan_personal: null, price_plan_familiar: null, price_plan_platinium: 80.00, price_plan_oro: 50.00, estimated_duration: 30, requires_anesthesia: false, is_active: true, status: "active", user_id_registration: 1, date_time_registration: getLimaDateTime() },
      { sub_procedure_code: "RO006", sub_procedure_name: "Rebasado P.P.R. autocurado", specialty: "Rehabilitacion Oral", price_without_plan: 300.00, price_plan_personal: null, price_plan_familiar: null, price_plan_platinium: 80.00, price_plan_oro: 50.00, estimated_duration: 30, requires_anesthesia: false, is_active: true, status: "active", user_id_registration: 1, date_time_registration: getLimaDateTime() },
      { sub_procedure_code: "RO007", sub_procedure_name: "Mantenedor de espacio simple", specialty: "Rehabilitacion Oral", price_without_plan: 250.00, price_plan_personal: null, price_plan_familiar: null, price_plan_platinium: 100.00, price_plan_oro: 100.00, estimated_duration: 30, requires_anesthesia: false, is_active: true, status: "active", user_id_registration: 1, date_time_registration: getLimaDateTime() },
      { sub_procedure_code: "RO008", sub_procedure_name: "Mantenedor de espacio complejo", specialty: "Rehabilitacion Oral", price_without_plan: 300.00, price_plan_personal: null, price_plan_familiar: null, price_plan_platinium: 100.00, price_plan_oro: 100.00, estimated_duration: 30, requires_anesthesia: false, is_active: true, status: "active", user_id_registration: 1, date_time_registration: getLimaDateTime() },
      { sub_procedure_code: "RO009", sub_procedure_name: "Reduccion de luxacion con inmov. dentaria", specialty: "Rehabilitacion Oral", price_without_plan: 200.00, price_plan_personal: 10.00, price_plan_familiar: 10.00, price_plan_platinium: 10.00, price_plan_oro: 0.00, estimated_duration: 30, requires_anesthesia: false, is_active: true, status: "active", user_id_registration: 1, date_time_registration: getLimaDateTime() },

      // Periodoncia
      { sub_procedure_code: "PE001", sub_procedure_name: "Historia clinica periodontal", specialty: "Periodoncia", price_without_plan: 50.00, price_plan_personal: 0.00, price_plan_familiar: 0.00, price_plan_platinium: 0.00, price_plan_oro: 0.00, estimated_duration: 30, requires_anesthesia: false, is_active: true, status: "active", user_id_registration: 1, date_time_registration: getLimaDateTime() },

      // Radiología
      { sub_procedure_code: "RA001", sub_procedure_name: "Radiografia periapical", specialty: "Radiologia", price_without_plan: 25.00, price_plan_personal: 10.00, price_plan_familiar: 10.00, price_plan_platinium: 10.00, price_plan_oro: 0.00, estimated_duration: 30, requires_anesthesia: false, is_active: true, status: "active", user_id_registration: 1, date_time_registration: getLimaDateTime() },
      { sub_procedure_code: "RA002", sub_procedure_name: "Radiografia seriada un maxilar (de 4 a 7 Rx)", specialty: "Radiologia", price_without_plan: 210.00, price_plan_personal: 50.00, price_plan_familiar: 50.00, price_plan_platinium: 50.00, price_plan_oro: 20.00, estimated_duration: 30, requires_anesthesia: false, is_active: true, status: "active", user_id_registration: 1, date_time_registration: getLimaDateTime() },
      { sub_procedure_code: "RA003", sub_procedure_name: "Radiografia ambos maxilares (de 10 a 14 Rx)", specialty: "Radiologia", price_without_plan: 420.00, price_plan_personal: 100.00, price_plan_familiar: 100.00, price_plan_platinium: 100.00, price_plan_oro: 50.00, estimated_duration: 30, requires_anesthesia: false, is_active: true, status: "active", user_id_registration: 1, date_time_registration: getLimaDateTime() },
      { sub_procedure_code: "RA004", sub_procedure_name: "Radiografia oclusal", specialty: "Radiologia", price_without_plan: 50.00, price_plan_personal: 20.00, price_plan_familiar: 20.00, price_plan_platinium: 20.00, price_plan_oro: 10.00, estimated_duration: 30, requires_anesthesia: false, is_active: true, status: "active", user_id_registration: 1, date_time_registration: getLimaDateTime() },

      // Cirugía Bucal y Maxilofacial
      { sub_procedure_code: "CB001", sub_procedure_name: "Plastica de comunicacion buco-sinusal", specialty: "Cirugia Bucal y Maxilofacial", price_without_plan: 300.00, price_plan_personal: null, price_plan_familiar: null, price_plan_platinium: 200.00, price_plan_oro: 200.00, estimated_duration: 30, requires_anesthesia: false, is_active: true, status: "active", user_id_registration: 1, date_time_registration: getLimaDateTime() },
      { sub_procedure_code: "CB002", sub_procedure_name: "Biopsia por puncion o aspiracion", specialty: "Cirugia Bucal y Maxilofacial", price_without_plan: 150.00, price_plan_personal: 50.00, price_plan_familiar: 50.00, price_plan_platinium: 50.00, price_plan_oro: 50.00, estimated_duration: 30, requires_anesthesia: false, is_active: true, status: "active", user_id_registration: 1, date_time_registration: getLimaDateTime() },
      { sub_procedure_code: "CB003", sub_procedure_name: "Reimplante dentario inmed. al traumatismo", specialty: "Cirugia Bucal y Maxilofacial", price_without_plan: 400.00, price_plan_personal: null, price_plan_familiar: null, price_plan_platinium: 200.00, price_plan_oro: 200.00, estimated_duration: 30, requires_anesthesia: false, is_active: true, status: "active", user_id_registration: 1, date_time_registration: getLimaDateTime() },
      { sub_procedure_code: "CB004", sub_procedure_name: "Incision y drenaje de abscesos via bucal", specialty: "Cirugia Bucal y Maxilofacial", price_without_plan: 200.00, price_plan_personal: null, price_plan_familiar: null, price_plan_platinium: 100.00, price_plan_oro: 100.00, estimated_duration: 30, requires_anesthesia: false, is_active: true, status: "active", user_id_registration: 1, date_time_registration: getLimaDateTime() },
      { sub_procedure_code: "CB005", sub_procedure_name: "Biopsia por escision", specialty: "Cirugia Bucal y Maxilofacial", price_without_plan: 300.00, price_plan_personal: null, price_plan_familiar: null, price_plan_platinium: 100.00, price_plan_oro: 100.00, estimated_duration: 30, requires_anesthesia: false, is_active: true, status: "active", user_id_registration: 1, date_time_registration: getLimaDateTime() },
      { sub_procedure_code: "CB006", sub_procedure_name: "Alargamiento quirurg. de la corona clinica", specialty: "Cirugia Bucal y Maxilofacial", price_without_plan: 200.00, price_plan_personal: null, price_plan_familiar: null, price_plan_platinium: 80.00, price_plan_oro: 20.00, estimated_duration: 30, requires_anesthesia: false, is_active: true, status: "active", user_id_registration: 1, date_time_registration: getLimaDateTime() },
      { sub_procedure_code: "CB007", sub_procedure_name: "Apicectomia", specialty: "Cirugia Bucal y Maxilofacial", price_without_plan: 400.00, price_plan_personal: null, price_plan_familiar: null, price_plan_platinium: 200.00, price_plan_oro: 200.00, estimated_duration: 30, requires_anesthesia: false, is_active: true, status: "active", user_id_registration: 1, date_time_registration: getLimaDateTime() },

      // Endodoncia
      { sub_procedure_code: "EN006", sub_procedure_name: "Aparato de contencion (SUP-INF)", specialty: "Endodoncia", price_without_plan: 500.00, price_plan_personal: null, price_plan_familiar: null, price_plan_platinium: 50.00, price_plan_oro: 50.00, estimated_duration: 30, requires_anesthesia: false, is_active: true, status: "active", user_id_registration: 1, date_time_registration: getLimaDateTime() },

      // Ortodoncia
      { sub_procedure_code: "OR001", sub_procedure_name: "Modelos de estudio", specialty: "Ortodoncia", price_without_plan: 200.00, price_plan_personal: null, price_plan_familiar: null, price_plan_platinium: 50.00, price_plan_oro: 0.00, estimated_duration: 30, requires_anesthesia: false, is_active: true, status: "active", user_id_registration: 1, date_time_registration: getLimaDateTime() },
      { sub_procedure_code: "OR002", sub_procedure_name: "Placas de contencion inferior", specialty: "Ortodoncia", price_without_plan: 250.00, price_plan_personal: null, price_plan_familiar: null, price_plan_platinium: 100.00, price_plan_oro: 0.00, estimated_duration: 30, requires_anesthesia: false, is_active: true, status: "active", user_id_registration: 1, date_time_registration: getLimaDateTime() },
      { sub_procedure_code: "OR003", sub_procedure_name: "Placas de contencion superior", specialty: "Ortodoncia", price_without_plan: 250.00, price_plan_personal: null, price_plan_familiar: null, price_plan_platinium: 100.00, price_plan_oro: 0.00, estimated_duration: 30, requires_anesthesia: false, is_active: true, status: "active", user_id_registration: 1, date_time_registration: getLimaDateTime() },
      { sub_procedure_code: "OR004", sub_procedure_name: "Retiro de brackets (2 arcadas)", specialty: "Ortodoncia", price_without_plan: 200.00, price_plan_personal: null, price_plan_familiar: null, price_plan_platinium: 50.00, price_plan_oro: 0.00, estimated_duration: 30, requires_anesthesia: false, is_active: true, status: "active", user_id_registration: 1, date_time_registration: getLimaDateTime() },
      { sub_procedure_code: "OR005", sub_procedure_name: "Escaneado mas impresion de modelos contencion c/u", specialty: "Ortodoncia", price_without_plan: 600.00, price_plan_personal: null, price_plan_familiar: null, price_plan_platinium: 250.00, price_plan_oro: 250.00, estimated_duration: 30, requires_anesthesia: false, is_active: true, status: "active", user_id_registration: 1, date_time_registration: getLimaDateTime() },

      // Periodoncia e Implantes
      { sub_procedure_code: "PI001", sub_procedure_name: "0,5 CC hueso liofilizado", specialty: "Periodoncia e Implantes", price_without_plan: 300.00, price_plan_personal: null, price_plan_familiar: null, price_plan_platinium: 100.00, price_plan_oro: 100.00, estimated_duration: 30, requires_anesthesia: false, is_active: true, status: "active", user_id_registration: 1, date_time_registration: getLimaDateTime() },
      { sub_procedure_code: "PI002", sub_procedure_name: "1 Pontico", specialty: "Periodoncia e Implantes", price_without_plan: 750.00, price_plan_personal: null, price_plan_familiar: null, price_plan_platinium: 100.00, price_plan_oro: 100.00, estimated_duration: 30, requires_anesthesia: false, is_active: true, status: "active", user_id_registration: 1, date_time_registration: getLimaDateTime() },
      { sub_procedure_code: "PI003", sub_procedure_name: "1.0 CC hueso liofilizado", specialty: "Periodoncia e Implantes", price_without_plan: 500.00, price_plan_personal: null, price_plan_familiar: null, price_plan_platinium: 200.00, price_plan_oro: 200.00, estimated_duration: 30, requires_anesthesia: false, is_active: true, status: "active", user_id_registration: 1, date_time_registration: getLimaDateTime() },
      { sub_procedure_code: "PI004", sub_procedure_name: "Aumento de reborde (c/injerto oseo en bloque)", specialty: "Periodoncia e Implantes", price_without_plan: 800.00, price_plan_personal: null, price_plan_familiar: null, price_plan_platinium: 250.00, price_plan_oro: 250.00, estimated_duration: 30, requires_anesthesia: false, is_active: true, status: "active", user_id_registration: 1, date_time_registration: getLimaDateTime() },
      { sub_procedure_code: "PI005", sub_procedure_name: "Aumento de reborde (c/injerto de tej blando)", specialty: "Periodoncia e Implantes", price_without_plan: 600.00, price_plan_personal: null, price_plan_familiar: null, price_plan_platinium: 250.00, price_plan_oro: 250.00, estimated_duration: 30, requires_anesthesia: false, is_active: true, status: "active", user_id_registration: 1, date_time_registration: getLimaDateTime() },
      { sub_procedure_code: "PI006", sub_procedure_name: "Carilla de resina (Inc.Laboratorio)", specialty: "Periodoncia e Implantes", price_without_plan: 750.00, price_plan_personal: null, price_plan_familiar: null, price_plan_platinium: 250.00, price_plan_oro: 250.00, estimated_duration: 30, requires_anesthesia: false, is_active: true, status: "active", user_id_registration: 1, date_time_registration: getLimaDateTime() },
      { sub_procedure_code: "PI007", sub_procedure_name: "Carilla de E-max", specialty: "Periodoncia e Implantes", price_without_plan: 1200.00, price_plan_personal: null, price_plan_familiar: null, price_plan_platinium: 500.00, price_plan_oro: 500.00, estimated_duration: 30, requires_anesthesia: false, is_active: true, status: "active", user_id_registration: 1, date_time_registration: getLimaDateTime() },
      { sub_procedure_code: "PI008", sub_procedure_name: "Carillas de porcelana (Inc-Laboratorio)", specialty: "Periodoncia e Implantes", price_without_plan: 1000.00, price_plan_personal: null, price_plan_familiar: null, price_plan_platinium: 500.00, price_plan_oro: 500.00, estimated_duration: 30, requires_anesthesia: false, is_active: true, status: "active", user_id_registration: 1, date_time_registration: getLimaDateTime() },
      { sub_procedure_code: "PI009", sub_procedure_name: "Carilla de resina", specialty: "Periodoncia e Implantes", price_without_plan: 600.00, price_plan_personal: null, price_plan_familiar: null, price_plan_platinium: 300.00, price_plan_oro: 300.00, estimated_duration: 30, requires_anesthesia: false, is_active: true, status: "active", user_id_registration: 1, date_time_registration: getLimaDateTime() },
      { sub_procedure_code: "PI010", sub_procedure_name: "Diagnostico (modelo de estud. Y encerado de diagn)", specialty: "Periodoncia e Implantes", price_without_plan: 500.00, price_plan_personal: null, price_plan_familiar: null, price_plan_platinium: 250.00, price_plan_oro: 250.00, estimated_duration: 30, requires_anesthesia: false, is_active: true, status: "active", user_id_registration: 1, date_time_registration: getLimaDateTime() },
      { sub_procedure_code: "PI011", sub_procedure_name: "Exod. C/injerto oseo y blando (no incluye hueso)", specialty: "Periodoncia e Implantes", price_without_plan: 250.00, price_plan_personal: null, price_plan_familiar: null, price_plan_platinium: 100.00, price_plan_oro: 100.00, estimated_duration: 30, requires_anesthesia: false, is_active: true, status: "active", user_id_registration: 1, date_time_registration: getLimaDateTime() },
      { sub_procedure_code: "PI012", sub_procedure_name: "Exodoncia con injerto de tejido blando (Exod.tapa)", specialty: "Periodoncia e Implantes", price_without_plan: 300.00, price_plan_personal: null, price_plan_familiar: null, price_plan_platinium: 150.00, price_plan_oro: 150.00, estimated_duration: 30, requires_anesthesia: false, is_active: true, status: "active", user_id_registration: 1, date_time_registration: getLimaDateTime() },
      { sub_procedure_code: "PI013", sub_procedure_name: "Exodoncia de remanente radicular por pieza", specialty: "Periodoncia e Implantes", price_without_plan: 50.00, price_plan_personal: 20.00, price_plan_familiar: 20.00, price_plan_platinium: 20.00, price_plan_oro: 20.00, estimated_duration: 30, requires_anesthesia: false, is_active: true, status: "active", user_id_registration: 1, date_time_registration: getLimaDateTime() },
      { sub_procedure_code: "PI014", sub_procedure_name: "Ferula (tomografica-quirurgica) Clin-lab", specialty: "Periodoncia e Implantes", price_without_plan: 300.00, price_plan_personal: null, price_plan_familiar: null, price_plan_platinium: 150.00, price_plan_oro: 150.00, estimated_duration: 30, requires_anesthesia: false, is_active: true, status: "active", user_id_registration: 1, date_time_registration: getLimaDateTime() },
      { sub_procedure_code: "PI015", sub_procedure_name: "Ferula oclusal de proteccion (incluye 3 controles)", specialty: "Periodoncia e Implantes", price_without_plan: 300.00, price_plan_personal: null, price_plan_familiar: null, price_plan_platinium: 150.00, price_plan_oro: 150.00, estimated_duration: 30, requires_anesthesia: false, is_active: true, status: "active", user_id_registration: 1, date_time_registration: getLimaDateTime() },
      { sub_procedure_code: "PI016", sub_procedure_name: "Ferulizacion dentaria con resina por 3 piezas", specialty: "Periodoncia e Implantes", price_without_plan: 100.00, price_plan_personal: 50.00, price_plan_familiar: 50.00, price_plan_platinium: 50.00, price_plan_oro: 50.00, estimated_duration: 30, requires_anesthesia: false, is_active: true, status: "active", user_id_registration: 1, date_time_registration: getLimaDateTime() },
      { sub_procedure_code: "PI017", sub_procedure_name: "Ferulizacion dentaria con resina por pieza", specialty: "Periodoncia e Implantes", price_without_plan: 60.00, price_plan_personal: 20.00, price_plan_familiar: 20.00, price_plan_platinium: 20.00, price_plan_oro: 20.00, estimated_duration: 30, requires_anesthesia: false, is_active: true, status: "active", user_id_registration: 1, date_time_registration: getLimaDateTime() },
      { sub_procedure_code: "PI018", sub_procedure_name: "Ferulizacion dentaria con resina por sextante", specialty: "Periodoncia e Implantes", price_without_plan: 200.00, price_plan_personal: 50.00, price_plan_familiar: 50.00, price_plan_platinium: 50.00, price_plan_oro: 50.00, estimated_duration: 30, requires_anesthesia: false, is_active: true, status: "active", user_id_registration: 1, date_time_registration: getLimaDateTime() },
      { sub_procedure_code: "PI019", sub_procedure_name: "Gingivoplastia por pieza", specialty: "Periodoncia e Implantes", price_without_plan: 60.00, price_plan_personal: 20.00, price_plan_familiar: 20.00, price_plan_platinium: 20.00, price_plan_oro: 20.00, estimated_duration: 30, requires_anesthesia: false, is_active: true, status: "active", user_id_registration: 1, date_time_registration: getLimaDateTime() },
      { sub_procedure_code: "PI020", sub_procedure_name: "Gingivoplastia por sextante", specialty: "Periodoncia e Implantes", price_without_plan: 300.00, price_plan_personal: 100.00, price_plan_familiar: 100.00, price_plan_platinium: 100.00, price_plan_oro: 100.00, estimated_duration: 30, requires_anesthesia: false, is_active: true, status: "active", user_id_registration: 1, date_time_registration: getLimaDateTime() },
      { sub_procedure_code: "PI021", sub_procedure_name: "Injerto de menton", specialty: "Periodoncia e Implantes", price_without_plan: 600.00, price_plan_personal: null, price_plan_familiar: null, price_plan_platinium: 200.00, price_plan_oro: 200.00, estimated_duration: 30, requires_anesthesia: false, is_active: true, status: "active", user_id_registration: 1, date_time_registration: getLimaDateTime() },
      { sub_procedure_code: "PI022", sub_procedure_name: "Injerto de tejido conectivo", specialty: "Periodoncia e Implantes", price_without_plan: 500.00, price_plan_personal: null, price_plan_familiar: null, price_plan_platinium: 300.00, price_plan_oro: 300.00, estimated_duration: 30, requires_anesthesia: false, is_active: true, status: "active", user_id_registration: 1, date_time_registration: getLimaDateTime() },
      { sub_procedure_code: "PI023", sub_procedure_name: "Instruccion de higiene oral", specialty: "Periodoncia e Implantes", price_without_plan: 50.00, price_plan_personal: 0.00, price_plan_familiar: 0.00, price_plan_platinium: 0.00, price_plan_oro: 0.00, estimated_duration: 30, requires_anesthesia: false, is_active: true, status: "active", user_id_registration: 1, date_time_registration: getLimaDateTime() },
      { sub_procedure_code: "PI024", sub_procedure_name: "Injerto Autologo de Mandibula", specialty: "Periodoncia e Implantes", price_without_plan: 800.00, price_plan_personal: null, price_plan_familiar: null, price_plan_platinium: 300.00, price_plan_oro: 300.00, estimated_duration: 30, requires_anesthesia: false, is_active: true, status: "active", user_id_registration: 1, date_time_registration: getLimaDateTime() },
      { sub_procedure_code: "PI025", sub_procedure_name: "Mantenimiento de implantes no incl. aditamentos ni RX", specialty: "Periodoncia e Implantes", price_without_plan: 100.00, price_plan_personal: null, price_plan_familiar: null, price_plan_platinium: 200.00, price_plan_oro: 200.00, estimated_duration: 30, requires_anesthesia: false, is_active: true, status: "active", user_id_registration: 1, date_time_registration: getLimaDateTime() },
      { sub_procedure_code: "PI026", sub_procedure_name: "PPR wipla", specialty: "Periodoncia e Implantes", price_without_plan: 500.00, price_plan_personal: 200.00, price_plan_familiar: 200.00, price_plan_platinium: 200.00, price_plan_oro: 200.00, estimated_duration: 30, requires_anesthesia: false, is_active: true, status: "active", user_id_registration: 1, date_time_registration: getLimaDateTime() },
      { sub_procedure_code: "PI027", sub_procedure_name: "Provisional autocurado sobre implantes", specialty: "Periodoncia e Implantes", price_without_plan: 80.00, price_plan_personal: null, price_plan_familiar: null, price_plan_platinium: 50.00, price_plan_oro: 50.00, estimated_duration: 30, requires_anesthesia: false, is_active: true, status: "active", user_id_registration: 1, date_time_registration: getLimaDateTime() },
      { sub_procedure_code: "PI028", sub_procedure_name: "Rebasado de protesis con acond. de tejido", specialty: "Periodoncia e Implantes", price_without_plan: 300.00, price_plan_personal: null, price_plan_familiar: null, price_plan_platinium: 100.00, price_plan_oro: 100.00, estimated_duration: 30, requires_anesthesia: false, is_active: true, status: "active", user_id_registration: 1, date_time_registration: getLimaDateTime() },
      { sub_procedure_code: "PI029", sub_procedure_name: "Rebasado de protesis con acrilico termocurado", specialty: "Periodoncia e Implantes", price_without_plan: 400.00, price_plan_personal: null, price_plan_familiar: null, price_plan_platinium: 100.00, price_plan_oro: 100.00, estimated_duration: 30, requires_anesthesia: false, is_active: true, status: "active", user_id_registration: 1, date_time_registration: getLimaDateTime() },
      { sub_procedure_code: "PI030", sub_procedure_name: "Regeneracion osea guiada (No Incl. hueso,memb,torn)", specialty: "Periodoncia e Implantes", price_without_plan: 500.00, price_plan_personal: null, price_plan_familiar: null, price_plan_platinium: 300.00, price_plan_oro: 250.00, estimated_duration: 30, requires_anesthesia: false, is_active: true, status: "active", user_id_registration: 1, date_time_registration: getLimaDateTime() },
      { sub_procedure_code: "PI031", sub_procedure_name: "Regeneracion tisular guiada (no incluye huesos ni memb)", specialty: "Periodoncia e Implantes", price_without_plan: 450.00, price_plan_personal: null, price_plan_familiar: null, price_plan_platinium: 250.00, price_plan_oro: 250.00, estimated_duration: 30, requires_anesthesia: false, is_active: true, status: "active", user_id_registration: 1, date_time_registration: getLimaDateTime() },
      { sub_procedure_code: "PI032", sub_procedure_name: "Reparacion de protesis", specialty: "Periodoncia e Implantes", price_without_plan: 200.00, price_plan_personal: null, price_plan_familiar: null, price_plan_platinium: 80.00, price_plan_oro: 80.00, estimated_duration: 30, requires_anesthesia: false, is_active: true, status: "active", user_id_registration: 1, date_time_registration: getLimaDateTime() },
      { sub_procedure_code: "PI033", sub_procedure_name: "Laserterapia por sesion", specialty: "Periodoncia e Implantes", price_without_plan: 450.00, price_plan_personal: null, price_plan_familiar: null, price_plan_platinium: 200.00, price_plan_oro: 200.00, estimated_duration: 30, requires_anesthesia: false, is_active: true, status: "active", user_id_registration: 1, date_time_registration: getLimaDateTime() },
      { sub_procedure_code: "PI034", sub_procedure_name: "Remodelado gingival con electrobisturi por pieza", specialty: "Periodoncia e Implantes", price_without_plan: 70.00, price_plan_personal: null, price_plan_familiar: null, price_plan_platinium: 30.00, price_plan_oro: 30.00, estimated_duration: 30, requires_anesthesia: false, is_active: true, status: "active", user_id_registration: 1, date_time_registration: getLimaDateTime() },
    ],
    skipDuplicates: true,
  });

  // =====================================================
  // 36. CONFIGURACIÓN GLOBAL DE PLANES DE SALUD (health_plan_global_settings)
  // =====================================================
  console.log("⚙️ Poblando configuración global de planes de salud...");
  await prisma.health_plan_global_settings.createMany({
    data: [
      {
        grace_days: 3,
        reminder_days_before: [7, 3, 1],
        enable_email_notifications: true,
        enable_in_app_notifications: true,
        voucher_required: true,
        auto_approve_vouchers: false,
        status: "active",
        user_id_registration: 1,
        date_time_registration: getLimaDateTime(),
      },
    ],
    skipDuplicates: true,
  });

  // =====================================================
  // 37. CONFIGURACIONES POR PLAN DE SALUD (health_plan_settings)
  // =====================================================
  console.log("⚙️ Poblando configuraciones por plan de salud...");
  await prisma.health_plan_settings.createMany({
    data: [
      // Plan Personal (health_plan_id: 1)
      { health_plan_id: 1, setting_key: "max_appointments_per_month", setting_value: "4", setting_type: "integer", description: "Máximo de citas por mes", status: "active", user_id_registration: 1, date_time_registration: getLimaDateTime() },
      { health_plan_id: 1, setting_key: "waiting_days", setting_value: "30", setting_type: "integer", description: "Días de espera antes de usar el plan", status: "active", user_id_registration: 1, date_time_registration: getLimaDateTime() },
      { health_plan_id: 1, setting_key: "cancellation_period_days", setting_value: "7", setting_type: "integer", description: "Días de anticipación para cancelar cita sin penalidad", status: "active", user_id_registration: 1, date_time_registration: getLimaDateTime() },
      { health_plan_id: 1, setting_key: "max_cleanings_per_year", setting_value: "2", setting_type: "integer", description: "Máximo de limpiezas dentales al año", status: "active", user_id_registration: 1, date_time_registration: getLimaDateTime() },
      { health_plan_id: 1, setting_key: "max_xrays_per_year", setting_value: "1", setting_type: "integer", description: "Máximo de radiografías panorámicas al año", status: "active", user_id_registration: 1, date_time_registration: getLimaDateTime() },
      // Plan Familiar (health_plan_id: 2)
      { health_plan_id: 2, setting_key: "max_appointments_per_month", setting_value: "8", setting_type: "integer", description: "Máximo de citas por mes (todos los miembros)", status: "active", user_id_registration: 1, date_time_registration: getLimaDateTime() },
      { health_plan_id: 2, setting_key: "waiting_days", setting_value: "15", setting_type: "integer", description: "Días de espera antes de usar el plan", status: "active", user_id_registration: 1, date_time_registration: getLimaDateTime() },
      { health_plan_id: 2, setting_key: "cancellation_period_days", setting_value: "3", setting_type: "integer", description: "Días de anticipación para cancelar cita sin penalidad", status: "active", user_id_registration: 1, date_time_registration: getLimaDateTime() },
      { health_plan_id: 2, setting_key: "max_dependents", setting_value: "4", setting_type: "integer", description: "Máximo de dependientes (además del titular)", status: "active", user_id_registration: 1, date_time_registration: getLimaDateTime() },
      { health_plan_id: 2, setting_key: "max_cleanings_per_year", setting_value: "2", setting_type: "integer", description: "Máximo de limpiezas dentales al año por persona", status: "active", user_id_registration: 1, date_time_registration: getLimaDateTime() },
      { health_plan_id: 2, setting_key: "max_xrays_per_year", setting_value: "1", setting_type: "integer", description: "Máximo de radiografías panorámicas al año por persona", status: "active", user_id_registration: 1, date_time_registration: getLimaDateTime() },
      // Plan Platinium (health_plan_id: 3)
      { health_plan_id: 3, setting_key: "max_appointments_per_month", setting_value: "12", setting_type: "integer", description: "Máximo de citas por mes", status: "active", user_id_registration: 1, date_time_registration: getLimaDateTime() },
      { health_plan_id: 3, setting_key: "waiting_days", setting_value: "7", setting_type: "integer", description: "Días de espera antes de usar el plan", status: "active", user_id_registration: 1, date_time_registration: getLimaDateTime() },
      { health_plan_id: 3, setting_key: "cancellation_period_days", setting_value: "1", setting_type: "integer", description: "Días de anticipación para cancelar cita sin penalidad", status: "active", user_id_registration: 1, date_time_registration: getLimaDateTime() },
      { health_plan_id: 3, setting_key: "max_cleanings_per_year", setting_value: "0", setting_type: "integer", description: "Limpiezas ilimitadas (0 = sin límite)", status: "active", user_id_registration: 1, date_time_registration: getLimaDateTime() },
      { health_plan_id: 3, setting_key: "max_xrays_per_year", setting_value: "2", setting_type: "integer", description: "Máximo de radiografías panorámicas al año", status: "active", user_id_registration: 1, date_time_registration: getLimaDateTime() },
      { health_plan_id: 3, setting_key: "priority_scheduling", setting_value: "true", setting_type: "boolean", description: "Acceso a horarios prioritarios", status: "active", user_id_registration: 1, date_time_registration: getLimaDateTime() },
      // Plan Oro (health_plan_id: 4)
      { health_plan_id: 4, setting_key: "max_appointments_per_month", setting_value: "0", setting_type: "integer", description: "Citas ilimitadas (0 = sin límite)", status: "active", user_id_registration: 1, date_time_registration: getLimaDateTime() },
      { health_plan_id: 4, setting_key: "waiting_days", setting_value: "0", setting_type: "integer", description: "Sin período de espera", status: "active", user_id_registration: 1, date_time_registration: getLimaDateTime() },
      { health_plan_id: 4, setting_key: "cancellation_period_days", setting_value: "0", setting_type: "integer", description: "Sin penalidad por cancelación", status: "active", user_id_registration: 1, date_time_registration: getLimaDateTime() },
      { health_plan_id: 4, setting_key: "max_cleanings_per_year", setting_value: "0", setting_type: "integer", description: "Limpiezas ilimitadas (0 = sin límite)", status: "active", user_id_registration: 1, date_time_registration: getLimaDateTime() },
      { health_plan_id: 4, setting_key: "max_xrays_per_year", setting_value: "0", setting_type: "integer", description: "Radiografías ilimitadas (0 = sin límite)", status: "active", user_id_registration: 1, date_time_registration: getLimaDateTime() },
      { health_plan_id: 4, setting_key: "priority_scheduling", setting_value: "true", setting_type: "boolean", description: "Acceso a horarios prioritarios VIP", status: "active", user_id_registration: 1, date_time_registration: getLimaDateTime() },
      { health_plan_id: 4, setting_key: "emergency_priority", setting_value: "true", setting_type: "boolean", description: "Atención de emergencias VIP", status: "active", user_id_registration: 1, date_time_registration: getLimaDateTime() },
    ],
    skipDuplicates: true,
  });

  // =====================================================
  // 38. TÉRMINOS DE PLANES DE SALUD (health_plan_terms)
  // =====================================================
  console.log("📝 Poblando términos de planes de salud...");
  await prisma.health_plan_terms.createMany({
    data: [
      {
        health_plan_id: 1,
        term_type: "general",
        term_description: "Términos y condiciones del Plan Personal. El afiliado acepta las condiciones establecidas y se compromete a cumplir con los pagos mensuales de S/50.00.",
        term_value: "1.0",
        effective_date: getLimaDateTime(),
        status: "active",
        user_id_registration: 1,
        date_time_registration: getLimaDateTime(),
      },
      {
        health_plan_id: 2,
        term_type: "general",
        term_description: "Términos y condiciones del Plan Familiar. El afiliado acepta las condiciones establecidas y se compromete a cumplir con los pagos mensuales de S/150.00.",
        term_value: "1.0",
        effective_date: getLimaDateTime(),
        status: "active",
        user_id_registration: 1,
        date_time_registration: getLimaDateTime(),
      },
      {
        health_plan_id: 3,
        term_type: "general",
        term_description: "Términos y condiciones del Plan Planitium. El afiliado acepta las condiciones establecidas y se compromete a cumplir con los pagos mensuales de S/200.00.",
        term_value: "1.0",
        effective_date: getLimaDateTime(),
        status: "active",
        user_id_registration: 1,
        date_time_registration: getLimaDateTime(),
      },
      {
        health_plan_id: 4,
        term_type: "general",
        term_description: "Términos y condiciones del Plan Gold. El afiliado acepta las condiciones establecidas y se compromete a cumplir con los pagos mensuales de S/350.00.",
        term_value: "1.0",
        effective_date: getLimaDateTime(),
        status: "active",
        user_id_registration: 1,
        date_time_registration: getLimaDateTime(),
      },
    ],
    skipDuplicates: true,
  });

  // =====================================================
  // 39. FORMULARIOS PÚBLICOS (public_forms)
  // =====================================================
  console.log("📋 Poblando formularios públicos...");
  await prisma.public_forms.createMany({
    data: [
      {
        branch_id: 1,
        form_name: "Solicitud de Radiografías y Tomografías 3D - San Isidro",
        form_code: "RAD-SI01",
        form_description: "Formulario público para solicitar estudios de imágenes dentomaxilofaciales en la sede San Isidro",
        form_type: "radiography",
        form_config: {
          services: ["Tomografía 3D", "Radiografía Periapical", "Radiografía Panorámica", "Radiografía Oclusal", "Radiografía Cefalométrica"],
          requiredFields: [
            { name: "paciente_nombres", label: "Nombres del Paciente", type: "text", placeholder: "Ingrese nombres" },
            { name: "paciente_apellidos", label: "Apellidos del Paciente", type: "text", placeholder: "Ingrese apellidos" },
            { name: "paciente_dni", label: "DNI del Paciente", type: "text", placeholder: "12345678" },
            { name: "paciente_telefono", label: "Teléfono", type: "tel", placeholder: "+51 912 345 678" },
            { name: "doctor_nombres", label: "Nombres del Odontólogo", type: "text", placeholder: "Ingrese nombres" },
            { name: "doctor_apellidos", label: "Apellidos del Odontólogo", type: "text", placeholder: "Ingrese apellidos" },
            { name: "doctor_cop", label: "COP (Colegiatura)", type: "text", placeholder: "12345" },
          ],
          optionalFields: [
            { name: "paciente_email", label: "Email del Paciente", type: "email", placeholder: "correo@ejemplo.com" },
            { name: "paciente_edad", label: "Edad", type: "number", placeholder: "25" },
            { name: "doctor_especialidad", label: "Especialidad", type: "text", placeholder: "Ortodoncia" },
            { name: "doctor_telefono", label: "Teléfono del Doctor", type: "tel", placeholder: "+51 912 345 678" },
          ],
          successMessage: "Su solicitud ha sido registrada exitosamente. Nos contactaremos con usted en las próximas 24 horas para confirmar su cita.",
          redirectUrl: "",
        },
        is_active: true,
        require_authentication: false,
        success_message: "Su solicitud ha sido registrada exitosamente. Nos contactaremos con usted en las próximas 24 horas.",
        status: "active",
        user_id_registration: 1,
        date_time_registration: getLimaDateTime(),
      },
      {
        branch_id: 2,
        form_name: "Solicitud de Radiografías y Tomografías 3D - Miraflores",
        form_code: "RAD-MF02",
        form_description: "Formulario público para solicitar estudios de imágenes dentomaxilofaciales en la sede Miraflores",
        form_type: "radiography",
        form_config: {
          services: ["Tomografía 3D", "Radiografía Periapical", "Radiografía Panorámica", "Radiografía Oclusal", "Radiografía Cefalométrica"],
          requiredFields: [
            { name: "paciente_nombres", label: "Nombres del Paciente", type: "text", placeholder: "Ingrese nombres" },
            { name: "paciente_apellidos", label: "Apellidos del Paciente", type: "text", placeholder: "Ingrese apellidos" },
            { name: "paciente_dni", label: "DNI del Paciente", type: "text", placeholder: "12345678" },
            { name: "paciente_telefono", label: "Teléfono", type: "tel", placeholder: "+51 912 345 678" },
            { name: "doctor_nombres", label: "Nombres del Odontólogo", type: "text", placeholder: "Ingrese nombres" },
            { name: "doctor_apellidos", label: "Apellidos del Odontólogo", type: "text", placeholder: "Ingrese apellidos" },
            { name: "doctor_cop", label: "COP (Colegiatura)", type: "text", placeholder: "12345" },
          ],
          optionalFields: [
            { name: "paciente_email", label: "Email del Paciente", type: "email", placeholder: "correo@ejemplo.com" },
            { name: "paciente_edad", label: "Edad", type: "number", placeholder: "25" },
            { name: "doctor_especialidad", label: "Especialidad", type: "text", placeholder: "Ortodoncia" },
            { name: "doctor_telefono", label: "Teléfono del Doctor", type: "tel", placeholder: "+51 912 345 678" },
          ],
          successMessage: "Su solicitud ha sido registrada exitosamente. Nos contactaremos con usted en las próximas 24 horas para confirmar su cita.",
          redirectUrl: "",
        },
        is_active: true,
        require_authentication: false,
        success_message: "Su solicitud ha sido registrada exitosamente. Nos contactaremos con usted en las próximas 24 horas.",
        status: "active",
        user_id_registration: 1,
        date_time_registration: getLimaDateTime(),
      },
      {
        branch_id: 3,
        form_name: "Solicitud de Radiografías y Tomografías 3D - Surco",
        form_code: "RAD-SU03",
        form_description: "Formulario público para solicitar estudios de imágenes dentomaxilofaciales en la sede Surco",
        form_type: "radiography",
        form_config: {
          services: ["Tomografía 3D", "Radiografía Periapical", "Radiografía Panorámica", "Radiografía Oclusal", "Radiografía Cefalométrica"],
          requiredFields: [
            { name: "paciente_nombres", label: "Nombres del Paciente", type: "text", placeholder: "Ingrese nombres" },
            { name: "paciente_apellidos", label: "Apellidos del Paciente", type: "text", placeholder: "Ingrese apellidos" },
            { name: "paciente_dni", label: "DNI del Paciente", type: "text", placeholder: "12345678" },
            { name: "paciente_telefono", label: "Teléfono", type: "tel", placeholder: "+51 912 345 678" },
            { name: "doctor_nombres", label: "Nombres del Odontólogo", type: "text", placeholder: "Ingrese nombres" },
            { name: "doctor_apellidos", label: "Apellidos del Odontólogo", type: "text", placeholder: "Ingrese apellidos" },
            { name: "doctor_cop", label: "COP (Colegiatura)", type: "text", placeholder: "12345" },
          ],
          optionalFields: [
            { name: "paciente_email", label: "Email del Paciente", type: "email", placeholder: "correo@ejemplo.com" },
            { name: "paciente_edad", label: "Edad", type: "number", placeholder: "25" },
            { name: "doctor_especialidad", label: "Especialidad", type: "text", placeholder: "Ortodoncia" },
            { name: "doctor_telefono", label: "Teléfono del Doctor", type: "tel", placeholder: "+51 912 345 678" },
          ],
          successMessage: "Su solicitud ha sido registrada exitosamente. Nos contactaremos con usted en las próximas 24 horas para confirmar su cita.",
          redirectUrl: "",
        },
        is_active: true,
        require_authentication: false,
        success_message: "Su solicitud ha sido registrada exitosamente. Nos contactaremos con usted en las próximas 24 horas.",
        status: "active",
        user_id_registration: 1,
        date_time_registration: getLimaDateTime(),
      },
    ],
    skipDuplicates: true,
  });

  // =====================================================
  // 40. UNIDADES DE MEDICACIÓN (medication_units)
  // =====================================================
  console.log("💊 Poblando unidades de medicación...");
  await prisma.medication_units.createMany({
    data: [
      { unit_name: "Miligramos", unit_abbreviation: "mg", status: "active", user_id_registration: 1, date_time_registration: getLimaDateTime() },
      { unit_name: "Gramos", unit_abbreviation: "g", status: "active", user_id_registration: 1, date_time_registration: getLimaDateTime() },
      { unit_name: "Mililitros", unit_abbreviation: "ml", status: "active", user_id_registration: 1, date_time_registration: getLimaDateTime() },
      { unit_name: "Microgramos", unit_abbreviation: "mcg", status: "active", user_id_registration: 1, date_time_registration: getLimaDateTime() },
      { unit_name: "Unidades Internacionales", unit_abbreviation: "UI", status: "active", user_id_registration: 1, date_time_registration: getLimaDateTime() },
      { unit_name: "Tabletas", unit_abbreviation: "tab", status: "active", user_id_registration: 1, date_time_registration: getLimaDateTime() },
      { unit_name: "Cápsulas", unit_abbreviation: "cap", status: "active", user_id_registration: 1, date_time_registration: getLimaDateTime() },
      { unit_name: "Gotas", unit_abbreviation: "gts", status: "active", user_id_registration: 1, date_time_registration: getLimaDateTime() },
      { unit_name: "Cucharaditas", unit_abbreviation: "cdta", status: "active", user_id_registration: 1, date_time_registration: getLimaDateTime() },
      { unit_name: "Porcentaje", unit_abbreviation: "%", status: "active", user_id_registration: 1, date_time_registration: getLimaDateTime() },
    ],
    skipDuplicates: true,
  });

  // =====================================================
  // 41. DURACIONES DE PRESCRIPCIÓN (prescription_durations)
  // =====================================================
  console.log("⏱️ Poblando duraciones de prescripción...");
  await prisma.prescription_durations.createMany({
    data: [
      { duration_name: "1 día", duration_code: "1D", days: 1, status: "active", user_id_registration: 1, date_time_registration: getLimaDateTime() },
      { duration_name: "3 días", duration_code: "3D", days: 3, status: "active", user_id_registration: 1, date_time_registration: getLimaDateTime() },
      { duration_name: "5 días", duration_code: "5D", days: 5, status: "active", user_id_registration: 1, date_time_registration: getLimaDateTime() },
      { duration_name: "7 días", duration_code: "7D", days: 7, status: "active", user_id_registration: 1, date_time_registration: getLimaDateTime() },
      { duration_name: "10 días", duration_code: "10D", days: 10, status: "active", user_id_registration: 1, date_time_registration: getLimaDateTime() },
      { duration_name: "14 días", duration_code: "14D", days: 14, status: "active", user_id_registration: 1, date_time_registration: getLimaDateTime() },
      { duration_name: "21 días", duration_code: "21D", days: 21, status: "active", user_id_registration: 1, date_time_registration: getLimaDateTime() },
      { duration_name: "30 días", duration_code: "30D", days: 30, status: "active", user_id_registration: 1, date_time_registration: getLimaDateTime() },
    ],
    skipDuplicates: true,
  });

  // =====================================================
  // 42. FRECUENCIAS DE PRESCRIPCIÓN (prescription_frequencies)
  // =====================================================
  console.log("🔄 Poblando frecuencias de prescripción...");
  await prisma.prescription_frequencies.createMany({
    data: [
      { frequency_name: "Cada 4 horas", frequency_code: "Q4H", hours_interval: 4, times_per_day: 6, status: "active", user_id_registration: 1, date_time_registration: getLimaDateTime() },
      { frequency_name: "Cada 6 horas", frequency_code: "Q6H", hours_interval: 6, times_per_day: 4, status: "active", user_id_registration: 1, date_time_registration: getLimaDateTime() },
      { frequency_name: "Cada 8 horas", frequency_code: "Q8H", hours_interval: 8, times_per_day: 3, status: "active", user_id_registration: 1, date_time_registration: getLimaDateTime() },
      { frequency_name: "Cada 12 horas", frequency_code: "Q12H", hours_interval: 12, times_per_day: 2, status: "active", user_id_registration: 1, date_time_registration: getLimaDateTime() },
      { frequency_name: "Una vez al día", frequency_code: "QD", hours_interval: 24, times_per_day: 1, status: "active", user_id_registration: 1, date_time_registration: getLimaDateTime() },
      { frequency_name: "Dos veces al día", frequency_code: "BID", hours_interval: 12, times_per_day: 2, status: "active", user_id_registration: 1, date_time_registration: getLimaDateTime() },
      { frequency_name: "Tres veces al día", frequency_code: "TID", hours_interval: 8, times_per_day: 3, status: "active", user_id_registration: 1, date_time_registration: getLimaDateTime() },
      { frequency_name: "Según sea necesario", frequency_code: "PRN", hours_interval: null, times_per_day: null, status: "active", user_id_registration: 1, date_time_registration: getLimaDateTime() },
      { frequency_name: "Dosis única", frequency_code: "STAT", hours_interval: null, times_per_day: 1, status: "active", user_id_registration: 1, date_time_registration: getLimaDateTime() },
    ],
    skipDuplicates: true,
  });

  // =====================================================
  // 43. TIPOS DE RECORDATORIO (reminder_types)
  // =====================================================
  console.log("🔔 Poblando tipos de recordatorio...");
  await prisma.reminder_types.createMany({
    data: [
      { type_name: "Email", type_code: "EMAIL", description: "Recordatorio por correo electrónico", status: "active", user_id_registration: 1, date_time_registration: getLimaDateTime() },
      { type_name: "SMS", type_code: "SMS", description: "Recordatorio por mensaje de texto", status: "active", user_id_registration: 1, date_time_registration: getLimaDateTime() },
      { type_name: "WhatsApp", type_code: "WHATSAPP", description: "Recordatorio por WhatsApp", status: "active", user_id_registration: 1, date_time_registration: getLimaDateTime() },
      { type_name: "Llamada telefónica", type_code: "CALL", description: "Recordatorio por llamada telefónica", status: "active", user_id_registration: 1, date_time_registration: getLimaDateTime() },
      { type_name: "Notificación en app", type_code: "PUSH", description: "Notificación push en la aplicación", status: "active", user_id_registration: 1, date_time_registration: getLimaDateTime() },
    ],
    skipDuplicates: true,
  });

  // =====================================================
  // 44. TIPOS DE DOCUMENTO (document_types)
  // =====================================================
  console.log("📄 Poblando tipos de documento...");
  await prisma.document_types.createMany({
    data: [
      { type_name: "Radiografía", type_code: "XRAY", description: "Radiografía dental", status: "active", user_id_registration: 1, date_time_registration: getLimaDateTime() },
      { type_name: "Tomografía", type_code: "CT", description: "Tomografía computarizada", status: "active", user_id_registration: 1, date_time_registration: getLimaDateTime() },
      { type_name: "Fotografía Clínica", type_code: "PHOTO", description: "Fotografía clínica intraoral o extraoral", status: "active", user_id_registration: 1, date_time_registration: getLimaDateTime() },
      { type_name: "Consentimiento Informado", type_code: "CONSENT", description: "Documento de consentimiento informado firmado", status: "active", user_id_registration: 1, date_time_registration: getLimaDateTime() },
      { type_name: "Receta Médica", type_code: "PRESCRIPTION", description: "Receta médica emitida", status: "active", user_id_registration: 1, date_time_registration: getLimaDateTime() },
      { type_name: "Informe Clínico", type_code: "REPORT", description: "Informe clínico o de evolución", status: "active", user_id_registration: 1, date_time_registration: getLimaDateTime() },
      { type_name: "Resultado de Laboratorio", type_code: "LAB", description: "Resultado de análisis de laboratorio", status: "active", user_id_registration: 1, date_time_registration: getLimaDateTime() },
      { type_name: "DNI / Identificación", type_code: "ID", description: "Copia del documento de identidad", status: "active", user_id_registration: 1, date_time_registration: getLimaDateTime() },
      { type_name: "Contrato", type_code: "CONTRACT", description: "Contrato de servicios firmado", status: "active", user_id_registration: 1, date_time_registration: getLimaDateTime() },
      { type_name: "Otro", type_code: "OTHER", description: "Otro tipo de documento", status: "active", user_id_registration: 1, date_time_registration: getLimaDateTime() },
    ],
    skipDuplicates: true,
  });

  // =====================================================
  // 45. ESTADOS DE USUARIO (user_statuses)
  // =====================================================
  console.log("👤 Poblando estados de usuario...");
  await prisma.user_statuses.createMany({
    data: [
      { status_name: "Activo", status_code: "ACTIVE", status: "active", user_id_registration: 1, date_time_registration: getLimaDateTime() },
      { status_name: "Inactivo", status_code: "INACTIVE", status: "active", user_id_registration: 1, date_time_registration: getLimaDateTime() },
      { status_name: "Suspendido", status_code: "SUSPENDED", status: "active", user_id_registration: 1, date_time_registration: getLimaDateTime() },
      { status_name: "En Licencia", status_code: "ON_LEAVE", status: "active", user_id_registration: 1, date_time_registration: getLimaDateTime() },
    ],
    skipDuplicates: true,
  });

  // =====================================================
  // 46. OPCIONES DE DIAGNÓSTICO (diagnosis_options)
  // =====================================================
  console.log("🔬 Poblando opciones de diagnóstico...");
  await prisma.diagnosis_options.createMany({
    data: [
      { diagnosis_code: "K02.0", diagnosis_name: "Caries limitada al esmalte", diagnosis_category: "Caries", description: "Mancha blanca o lesión inicial en esmalte", status: "active", user_id_registration: 1, date_time_registration: getLimaDateTime() },
      { diagnosis_code: "K02.1", diagnosis_name: "Caries de la dentina", diagnosis_category: "Caries", description: "Caries que ha avanzado hasta la dentina", status: "active", user_id_registration: 1, date_time_registration: getLimaDateTime() },
      { diagnosis_code: "K02.2", diagnosis_name: "Caries del cemento", diagnosis_category: "Caries", description: "Caries radicular en cemento dental", status: "active", user_id_registration: 1, date_time_registration: getLimaDateTime() },
      { diagnosis_code: "K04.0", diagnosis_name: "Pulpitis", diagnosis_category: "Endodoncia", description: "Inflamación de la pulpa dental", status: "active", user_id_registration: 1, date_time_registration: getLimaDateTime() },
      { diagnosis_code: "K04.1", diagnosis_name: "Necrosis pulpar", diagnosis_category: "Endodoncia", description: "Muerte del tejido pulpar", status: "active", user_id_registration: 1, date_time_registration: getLimaDateTime() },
      { diagnosis_code: "K04.7", diagnosis_name: "Absceso periapical sin fístula", diagnosis_category: "Endodoncia", description: "Absceso en ápice radicular", status: "active", user_id_registration: 1, date_time_registration: getLimaDateTime() },
      { diagnosis_code: "K05.0", diagnosis_name: "Gingivitis aguda", diagnosis_category: "Periodontal", description: "Inflamación aguda de las encías", status: "active", user_id_registration: 1, date_time_registration: getLimaDateTime() },
      { diagnosis_code: "K05.1", diagnosis_name: "Gingivitis crónica", diagnosis_category: "Periodontal", description: "Inflamación crónica de las encías", status: "active", user_id_registration: 1, date_time_registration: getLimaDateTime() },
      { diagnosis_code: "K05.3", diagnosis_name: "Periodontitis crónica", diagnosis_category: "Periodontal", description: "Enfermedad periodontal avanzada con pérdida ósea", status: "active", user_id_registration: 1, date_time_registration: getLimaDateTime() },
      { diagnosis_code: "K05.4", diagnosis_name: "Periodontitis agresiva", diagnosis_category: "Periodontal", description: "Periodontitis de avance rápido", status: "active", user_id_registration: 1, date_time_registration: getLimaDateTime() },
      { diagnosis_code: "K03.0", diagnosis_name: "Abrasión dental", diagnosis_category: "Desgaste", description: "Pérdida de estructura dental por abrasión mecánica", status: "active", user_id_registration: 1, date_time_registration: getLimaDateTime() },
      { diagnosis_code: "K03.1", diagnosis_name: "Erosión dental", diagnosis_category: "Desgaste", description: "Pérdida de estructura dental por erosión ácida", status: "active", user_id_registration: 1, date_time_registration: getLimaDateTime() },
      { diagnosis_code: "K07.3", diagnosis_name: "Maloclusión", diagnosis_category: "Ortodoncia", description: "Anomalía de la posición de los dientes", status: "active", user_id_registration: 1, date_time_registration: getLimaDateTime() },
      { diagnosis_code: "K01.1", diagnosis_name: "Diente impactado", diagnosis_category: "Cirugía", description: "Diente retenido o impactado en hueso", status: "active", user_id_registration: 1, date_time_registration: getLimaDateTime() },
      { diagnosis_code: "S02.5", diagnosis_name: "Fractura coronaria", diagnosis_category: "Traumatología", description: "Fractura de la corona del diente", status: "active", user_id_registration: 1, date_time_registration: getLimaDateTime() },
      { diagnosis_code: "K08.1", diagnosis_name: "Pérdida de dientes por extracción", diagnosis_category: "Edentulismo", description: "Ausencia de dientes por extracción previa", status: "active", user_id_registration: 1, date_time_registration: getLimaDateTime() },
      { diagnosis_code: "K03.8", diagnosis_name: "Hipersensibilidad dentinaria", diagnosis_category: "Sensibilidad", description: "Sensibilidad dental al frío, calor o estímulos", status: "active", user_id_registration: 1, date_time_registration: getLimaDateTime() },
      { diagnosis_code: "K06.0", diagnosis_name: "Recesión gingival", diagnosis_category: "Periodontal", description: "Retracción de la encía exponiendo la raíz", status: "active", user_id_registration: 1, date_time_registration: getLimaDateTime() },
      { diagnosis_code: "K00.4", diagnosis_name: "Fluorosis dental", diagnosis_category: "Desarrollo", description: "Manchas en esmalte por exceso de flúor", status: "active", user_id_registration: 1, date_time_registration: getLimaDateTime() },
      { diagnosis_code: "K07.6", diagnosis_name: "Bruxismo", diagnosis_category: "Parafunción", description: "Hábito de apretar o rechinar los dientes", status: "active", user_id_registration: 1, date_time_registration: getLimaDateTime() },
    ],
    skipDuplicates: true,
  });

  // =====================================================
  // 47. MEDICAMENTOS (medications)
  // =====================================================
  console.log("💉 Poblando medicamentos...");
  await prisma.medications.createMany({
    data: [
      { medication_name: "Amoxicilina 500mg", generic_name: "Amoxicilina", medication_type: "Antibiótico", concentration: "500mg", description: "Antibiótico beta-lactámico para infecciones dentales", status: "active", user_id_registration: 1, date_time_registration: getLimaDateTime() },
      { medication_name: "Amoxicilina 875mg + Ác. Clavulánico 125mg", generic_name: "Amoxicilina/Clavulanato", medication_type: "Antibiótico", concentration: "875/125mg", description: "Antibiótico combinado para infecciones severas", status: "active", user_id_registration: 1, date_time_registration: getLimaDateTime() },
      { medication_name: "Azitromicina 500mg", generic_name: "Azitromicina", medication_type: "Antibiótico", concentration: "500mg", description: "Antibiótico macrólido, alternativa a penicilina", status: "active", user_id_registration: 1, date_time_registration: getLimaDateTime() },
      { medication_name: "Clindamicina 300mg", generic_name: "Clindamicina", medication_type: "Antibiótico", concentration: "300mg", description: "Antibiótico para infecciones anaeróbicas y abscesos", status: "active", user_id_registration: 1, date_time_registration: getLimaDateTime() },
      { medication_name: "Metronidazol 500mg", generic_name: "Metronidazol", medication_type: "Antibiótico", concentration: "500mg", description: "Antibiótico para infecciones anaeróbicas orales", status: "active", user_id_registration: 1, date_time_registration: getLimaDateTime() },
      { medication_name: "Ibuprofeno 400mg", generic_name: "Ibuprofeno", medication_type: "Analgésico/Antiinflamatorio", concentration: "400mg", description: "AINE para dolor e inflamación moderada", status: "active", user_id_registration: 1, date_time_registration: getLimaDateTime() },
      { medication_name: "Ibuprofeno 600mg", generic_name: "Ibuprofeno", medication_type: "Analgésico/Antiinflamatorio", concentration: "600mg", description: "AINE para dolor e inflamación intensa", status: "active", user_id_registration: 1, date_time_registration: getLimaDateTime() },
      { medication_name: "Paracetamol 500mg", generic_name: "Paracetamol", medication_type: "Analgésico", concentration: "500mg", description: "Analgésico y antipirético para dolor leve a moderado", status: "active", user_id_registration: 1, date_time_registration: getLimaDateTime() },
      { medication_name: "Diclofenaco 50mg", generic_name: "Diclofenaco Sódico", medication_type: "Analgésico/Antiinflamatorio", concentration: "50mg", description: "AINE potente para dolor post-quirúrgico", status: "active", user_id_registration: 1, date_time_registration: getLimaDateTime() },
      { medication_name: "Ketorolaco 10mg", generic_name: "Ketorolaco Trometamina", medication_type: "Analgésico", concentration: "10mg", description: "Analgésico potente para dolor agudo", status: "active", user_id_registration: 1, date_time_registration: getLimaDateTime() },
      { medication_name: "Dexametasona 4mg", generic_name: "Dexametasona", medication_type: "Corticoide", concentration: "4mg", description: "Antiinflamatorio esteroidal para edema post-quirúrgico", status: "active", user_id_registration: 1, date_time_registration: getLimaDateTime() },
      { medication_name: "Clorhexidina 0.12%", generic_name: "Digluconato de Clorhexidina", medication_type: "Antiséptico", concentration: "0.12%", description: "Enjuague bucal antiséptico", status: "active", user_id_registration: 1, date_time_registration: getLimaDateTime() },
      { medication_name: "Lidocaína 2% con Epinefrina", generic_name: "Clorhidrato de Lidocaína", medication_type: "Anestésico", concentration: "2%", description: "Anestésico local con vasoconstrictor", status: "active", user_id_registration: 1, date_time_registration: getLimaDateTime() },
      { medication_name: "Tramadol 50mg", generic_name: "Tramadol", medication_type: "Analgésico", concentration: "50mg", description: "Analgésico opioide para dolor severo", status: "active", user_id_registration: 1, date_time_registration: getLimaDateTime() },
      { medication_name: "Triamcinolona Acetonido 0.1%", generic_name: "Triamcinolona", medication_type: "Corticoide Tópico", concentration: "0.1%", description: "Pasta oral para úlceras y lesiones bucales", status: "active", user_id_registration: 1, date_time_registration: getLimaDateTime() },
    ],
    skipDuplicates: true,
  });

  // =====================================================
  // 48. PLANTILLAS DE CONSENTIMIENTO INFORMADO (consent_templates)
  // =====================================================
  console.log("📋 Poblando plantillas de consentimiento informado...");
  const consentTemplatesData = getConsentTemplatesData(getLimaDateTime);
  for (const template of consentTemplatesData) {
    await prisma.consent_templates.upsert({
      where: { template_code: template.template_code },
      update: {},
      create: template,
    });
  }

  console.log("\n✅ ¡Seeder ejecutado exitosamente!");
  console.log("📊 Resumen:");
  console.log("   - Compañías: 1");
  console.log("   - Sedes: 3");
  console.log("   - Roles: 7");
  console.log("   - Usuarios: 18");
  console.log("   - Permisos: 46");
  console.log("   - Especialidades: 9");
  console.log("   - Odontólogos: 6");
  console.log("   - Pacientes: 3 (vinculados a usuarios)");
  console.log("   - Procedimientos dentales: 15");
  console.log("   - Planes de Salud: 4");
  console.log("   - Configuración global de planes: 1");
  console.log("   - Configuraciones por plan: 23");
  console.log("   - Términos de planes: 4");
  console.log("   - Planes de Ortodoncia: 6");
  console.log("   - Planes de Implantes: 4");
  console.log("   - Promociones: 5");
  console.log("   - Posiciones dentales: 52 (32 adultos + 20 niños)");
  console.log("   - Superficies dentales: 5");
  console.log("   - Estados de cita: 9");
  console.log("   - Configuraciones app: 30");
  console.log("   - Especialidades de odontólogos: 12");
  console.log("   - Métodos de pago por sede: 3");
  console.log("   - Beneficios: 1");
  console.log("   - Items de prótesis: 4");
  console.log("   - Precios de laboratorio: 48");
  console.log("   - Condiciones dentales: 50");
  console.log("   - Procedimientos de condiciones: 104");
  console.log("   - Sub-procedimientos: 63");
  console.log("   - Formularios públicos: 3");
  console.log("   - Unidades de medicación: 10");
  console.log("   - Duraciones de prescripción: 8");
  console.log("   - Frecuencias de prescripción: 9");
  console.log("   - Tipos de recordatorio: 5");
  console.log("   - Tipos de documento: 10");
  console.log("   - Estados de usuario: 4");
  console.log("   - Opciones de diagnóstico: 20");
  console.log("   - Medicamentos: 15");
  console.log("   - Plantillas de consentimiento: 15");
  console.log("   - Citas de ejemplo: 3");
  console.log("\n🔑 Credenciales de acceso:");
  console.log("   Usuario: admin");
  console.log("   Contraseña: 123456");
  console.log("\n📍 Timezone: America/Lima (UTC-5)");
}

main()
  .catch((e) => {
    console.error("❌ Error ejecutando el seeder:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
