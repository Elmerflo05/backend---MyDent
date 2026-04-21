const bcrypt = require('bcrypt');
const {
  getAllUsers,
  getUserById,
  createUser,
  updateUser,
  deleteUser,
  getAvailableAdministrators
} = require('../models/usersModel');

const getUsers = async (req, res) => {
  try {
    const { role_id, branch_id, search, is_active, status } = req.query;
    const filters = {
      role_id: role_id ? parseInt(role_id) : null,
      branch_id: branch_id ? parseInt(branch_id) : null,
      search: search || null,
      // Mantener compatibilidad con is_active booleano, pero priorizar status
      is_active: status ? undefined : (is_active !== undefined ? is_active === 'true' : undefined)
    };

    const users = await getAllUsers(filters);

    res.json({
      success: true,
      data: users
    });
  } catch (error) {
    console.error('Error al obtener usuarios:', error);
    res.status(500).json({
      success: false,
      error: 'Error al obtener usuarios'
    });
  }
};

const getUser = async (req, res) => {
  try {
    const { id } = req.params;
    const user = await getUserById(parseInt(id));

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'Usuario no encontrado'
      });
    }

    res.json({
      success: true,
      data: user
    });
  } catch (error) {
    console.error('Error al obtener usuario:', error);
    res.status(500).json({
      success: false,
      error: 'Error al obtener usuario'
    });
  }
};

const createNewUser = async (req, res) => {
  try {
    const { password, branches_access, dni, ...userData } = req.body;

    if (!userData.role_id || !userData.username || !userData.email ||
        !password || !userData.first_name || !userData.last_name) {
      return res.status(400).json({
        success: false,
        error: 'Faltan campos requeridos'
      });
    }

    // ✅ Procesar DNI: guardarlo en el campo profile (JSONB)
    if (dni) {
      userData.profile = {
        ...(userData.profile || {}),
        dni: dni
      };
    }

    // ✅ VALIDACIÓN 1: Superadministrador NO debe tener sede asignada
    if (parseInt(userData.role_id) === 1 && userData.branch_id) {
      return res.status(400).json({
        success: false,
        error: 'El Superadministrador no debe tener una sede asignada. El Superadministrador tiene acceso a todas las sedes.'
      });
    }

    // ✅ VALIDACIÓN 2: Administrador de Sede PUEDE crearse sin sede asignada (quedará inactivo)
    // if (parseInt(userData.role_id) === 2 && !userData.branch_id) {
    //   return res.status(400).json({
    //     success: false,
    //     error: 'El Administrador de Sede debe tener una sede asignada.'
    //   });
    // }
    // CAMBIO: Permitir crear admin sin sede, pero crearlo como inactivo

    // ✅ VALIDACIÓN 2.1: Verificar que la sede no tenga ya otro administrador (SOLO para role_id = 2)
    if (parseInt(userData.role_id) === 2 && userData.branch_id) {
      const { getAllUsers } = require('../models/usersModel');
      // Verificar usuarios activos por status='active'
      const pool = require('../config/db');
      const existingAdmins = await pool.query(
        `SELECT user_id FROM users
         WHERE role_id = 2
         AND branch_id = $1
         AND status = 'active'`,
        [parseInt(userData.branch_id)]
      );

      if (existingAdmins.rows.length > 0) {
        return res.status(409).json({
          success: false,
          error: `La sede ${userData.branch_id} ya tiene un administrador asignado (user_id: ${existingAdmins.rows[0].user_id}). Solo puede haber UN administrador por sede.`
        });
      }
    }

    // ✅ VALIDACIÓN 3: Médicos (role_id 3) - branches_access
    // Para médicos, branches_access puede venir como array de IDs de sedes
    // Si se proporciona branches_access, validar que sea un array
    let processedBranchesAccess = [];
    if (branches_access) {
      if (!Array.isArray(branches_access)) {
        return res.status(400).json({
          success: false,
          error: 'branches_access debe ser un array de IDs de sedes'
        });
      }

      // Convertir a números enteros
      processedBranchesAccess = branches_access.map(id => parseInt(id));

      // Validar que todos sean números válidos
      if (processedBranchesAccess.some(id => isNaN(id))) {
        return res.status(400).json({
          success: false,
          error: 'Todos los IDs de sedes en branches_access deben ser números válidos'
        });
      }
    } else if (userData.branch_id && parseInt(userData.role_id) === 3) {
      // Si es médico y se proporciona branch_id pero no branches_access,
      // inicializar branches_access con la sede principal
      processedBranchesAccess = [parseInt(userData.branch_id)];
    }

    // Hash de la contraseña
    const password_hash = await bcrypt.hash(password, 10);

    // ✅ Si es administrador sin sede, crearlo como inactivo
    if (parseInt(userData.role_id) === 2 && !userData.branch_id) {
      userData.status = 'inactive';
    }

    const newUser = await createUser({
      ...userData,
      password_hash,
      branches_access: processedBranchesAccess,
      user_id_registration: req.user.user_id
    });

    res.status(201).json({
      success: true,
      message: 'Usuario creado exitosamente',
      data: newUser
    });
  } catch (error) {
    console.error('Error al crear usuario:', error);

    // Manejo de errores de unicidad
    if (error.code === '23505') {
      if (error.constraint && error.constraint.includes('unique_administrator_per_branch')) {
        return res.status(409).json({
          success: false,
          error: 'Esta sede ya tiene un administrador asignado. Solo puede haber un administrador por sede.'
        });
      }
      return res.status(409).json({
        success: false,
        error: 'Ya existe un usuario con ese email o username'
      });
    }

    // Manejo de errores de validación del trigger
    if (error.message) {
      if (error.message.includes('ya tiene un administrador asignado')) {
        return res.status(409).json({
          success: false,
          error: error.message
        });
      }
      if (error.message.includes('Superadministrador')) {
        return res.status(400).json({
          success: false,
          error: error.message
        });
      }
      if (error.message.includes('debe tener una sede asignada')) {
        return res.status(400).json({
          success: false,
          error: error.message
        });
      }
    }

    res.status(500).json({
      success: false,
      error: 'Error al crear usuario',
      message: error.message
    });
  }
};

const updateExistingUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { branches_access, dni, ...restData } = req.body;
    const userData = {
      ...restData,
      user_id_modification: req.user.user_id
    };

    // No permitir actualización de password por esta ruta
    delete userData.password;
    delete userData.password_hash;

    // ✅ Procesar DNI: guardarlo en el campo profile (JSONB)
    if (dni !== undefined) {
      // Obtener el usuario actual para preservar otros datos del profile
      const currentUser = await getUserById(parseInt(id));
      const currentProfile = currentUser?.profile || {};
      userData.profile = {
        ...currentProfile,
        dni: dni
      };
    }

    // ✅ VALIDACIÓN 1: Superadministrador NO debe tener sede asignada
    if (userData.role_id && parseInt(userData.role_id) === 1 && userData.branch_id) {
      return res.status(400).json({
        success: false,
        error: 'El Superadministrador no debe tener una sede asignada. El Superadministrador tiene acceso a todas las sedes.'
      });
    }

    // ✅ VALIDACIÓN 2: Administrador de Sede PUEDE estar sin sede asignada (quedará inactivo)
    // if (userData.role_id && parseInt(userData.role_id) === 2 && userData.branch_id === null) {
    //   return res.status(400).json({
    //     success: false,
    //     error: 'El Administrador de Sede debe tener una sede asignada.'
    //   });
    // }
    // CAMBIO: Permitir actualizar admin sin sede (se manejará activación/desactivación en modelo)

    // ✅ VALIDACIÓN 3: Médicos - branches_access
    if (branches_access !== undefined) {
      if (!Array.isArray(branches_access)) {
        return res.status(400).json({
          success: false,
          error: 'branches_access debe ser un array de IDs de sedes'
        });
      }

      // Convertir a números enteros
      const processedBranchesAccess = branches_access.map(id => parseInt(id));

      // Validar que todos sean números válidos
      if (processedBranchesAccess.some(id => isNaN(id))) {
        return res.status(400).json({
          success: false,
          error: 'Todos los IDs de sedes en branches_access deben ser números válidos'
        });
      }

      userData.branches_access = processedBranchesAccess;
    }

    const updatedUser = await updateUser(parseInt(id), userData);

    if (!updatedUser) {
      return res.status(404).json({
        success: false,
        error: 'Usuario no encontrado'
      });
    }

    res.json({
      success: true,
      message: 'Usuario actualizado exitosamente',
      data: updatedUser
    });
  } catch (error) {
    console.error('Error al actualizar usuario:', error);

    // Manejo de errores de unicidad
    if (error.code === '23505') {
      if (error.constraint && error.constraint.includes('unique_administrator_per_branch')) {
        return res.status(409).json({
          success: false,
          error: 'Esta sede ya tiene un administrador asignado. Solo puede haber un administrador por sede.'
        });
      }
      return res.status(409).json({
        success: false,
        error: 'Ya existe un usuario con ese email o username'
      });
    }

    // Manejo de errores de validación del trigger
    if (error.message) {
      if (error.message.includes('ya tiene un administrador asignado')) {
        return res.status(409).json({
          success: false,
          error: error.message
        });
      }
      if (error.message.includes('Superadministrador')) {
        return res.status(400).json({
          success: false,
          error: error.message
        });
      }
      if (error.message.includes('debe tener una sede asignada')) {
        return res.status(400).json({
          success: false,
          error: error.message
        });
      }
    }

    res.status(500).json({
      success: false,
      error: 'Error al actualizar usuario',
      message: error.message
    });
  }
};

const deleteExistingUser = async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await deleteUser(parseInt(id), req.user.user_id);

    if (!deleted) {
      return res.status(404).json({
        success: false,
        error: 'Usuario no encontrado'
      });
    }

    res.json({
      success: true,
      message: 'Usuario eliminado exitosamente'
    });
  } catch (error) {
    console.error('Error al eliminar usuario:', error);
    res.status(500).json({
      success: false,
      error: 'Error al eliminar usuario'
    });
  }
};

const getAvailableAdmins = async (req, res) => {
  try {
    const { exclude_branch_id } = req.query;
    const excludeBranchId = exclude_branch_id ? parseInt(exclude_branch_id) : null;

    const administrators = await getAvailableAdministrators(excludeBranchId);

    res.json({
      success: true,
      data: administrators
    });
  } catch (error) {
    console.error('Error al obtener administradores disponibles:', error);
    res.status(500).json({
      success: false,
      error: 'Error al obtener administradores disponibles'
    });
  }
};

module.exports = {
  getUsers,
  getUser,
  createNewUser,
  updateExistingUser,
  deleteExistingUser,
  getAvailableAdmins
};
