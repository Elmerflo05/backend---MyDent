const {
  getAllRoles,
  getRoleById,
  getRoleWithPermissions,
  createRole,
  updateRole,
  deleteRole,
  getAllPermissions,
  getPermissionById,
  createPermission,
  updatePermission,
  deletePermission,
  countPermissions,
  assignPermissionToRole,
  removePermissionFromRole,
  syncRolePermissions
} = require('../models/rolesModel');

// Roles
const getRoles = async (req, res) => {
  try {
    const roles = await getAllRoles();

    res.json({
      success: true,
      data: roles
    });
  } catch (error) {
    console.error('Error al obtener roles:', error);
    res.status(500).json({
      success: false,
      error: 'Error al obtener roles'
    });
  }
};

const getRole = async (req, res) => {
  try {
    const { id } = req.params;
    const { include_permissions } = req.query;

    let role;
    if (include_permissions === 'true') {
      role = await getRoleWithPermissions(parseInt(id));
    } else {
      role = await getRoleById(parseInt(id));
    }

    if (!role) {
      return res.status(404).json({
        success: false,
        error: 'Rol no encontrado'
      });
    }

    res.json({
      success: true,
      data: role
    });
  } catch (error) {
    console.error('Error al obtener rol:', error);
    res.status(500).json({
      success: false,
      error: 'Error al obtener rol'
    });
  }
};

const createNewRole = async (req, res) => {
  try {
    const roleData = req.body;

    if (!roleData.role_name) {
      return res.status(400).json({
        success: false,
        error: 'El nombre del rol es requerido'
      });
    }

    const newRole = await createRole(roleData, req.user.user_id);

    res.status(201).json({
      success: true,
      message: 'Rol creado exitosamente',
      data: newRole
    });
  } catch (error) {
    console.error('Error al crear rol:', error);
    res.status(500).json({
      success: false,
      error: 'Error al crear rol'
    });
  }
};

const updateExistingRole = async (req, res) => {
  try {
    const { id } = req.params;
    const roleData = req.body;

    const updatedRole = await updateRole(parseInt(id), roleData, req.user.user_id);

    if (!updatedRole) {
      return res.status(404).json({
        success: false,
        error: 'Rol no encontrado'
      });
    }

    res.json({
      success: true,
      message: 'Rol actualizado exitosamente',
      data: updatedRole
    });
  } catch (error) {
    console.error('Error al actualizar rol:', error);
    res.status(500).json({
      success: false,
      error: 'Error al actualizar rol'
    });
  }
};

const deleteExistingRole = async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await deleteRole(parseInt(id), req.user.user_id);

    if (!deleted) {
      return res.status(404).json({
        success: false,
        error: 'Rol no encontrado'
      });
    }

    res.json({
      success: true,
      message: 'Rol eliminado exitosamente'
    });
  } catch (error) {
    console.error('Error al eliminar rol:', error);
    res.status(500).json({
      success: false,
      error: 'Error al eliminar rol'
    });
  }
};

// Permissions
const getPermissions = async (req, res) => {
  try {
    const {
      module,
      search,
      page = 1,
      limit = 50
    } = req.query;

    const filters = {
      module,
      search,
      limit: parseInt(limit),
      offset: (parseInt(page) - 1) * parseInt(limit)
    };

    const [permissions, total] = await Promise.all([
      getAllPermissions(filters),
      countPermissions(filters)
    ]);

    res.json({
      success: true,
      data: permissions,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Error al obtener permisos:', error);
    res.status(500).json({
      success: false,
      error: 'Error al obtener permisos'
    });
  }
};

const getPermission = async (req, res) => {
  try {
    const { id } = req.params;
    const permission = await getPermissionById(parseInt(id));

    if (!permission) {
      return res.status(404).json({
        success: false,
        error: 'Permiso no encontrado'
      });
    }

    res.json({
      success: true,
      data: permission
    });
  } catch (error) {
    console.error('Error al obtener permiso:', error);
    res.status(500).json({
      success: false,
      error: 'Error al obtener permiso'
    });
  }
};

const createNewPermission = async (req, res) => {
  try {
    const permissionData = req.body;

    if (!permissionData.permission_name) {
      return res.status(400).json({
        success: false,
        error: 'El nombre del permiso es requerido'
      });
    }

    const newPermission = await createPermission(permissionData, req.user.user_id);

    res.status(201).json({
      success: true,
      message: 'Permiso creado exitosamente',
      data: newPermission
    });
  } catch (error) {
    console.error('Error al crear permiso:', error);
    res.status(500).json({
      success: false,
      error: 'Error al crear permiso'
    });
  }
};

const updateExistingPermission = async (req, res) => {
  try {
    const { id } = req.params;
    const permissionData = req.body;

    const updatedPermission = await updatePermission(parseInt(id), permissionData, req.user.user_id);

    if (!updatedPermission) {
      return res.status(404).json({
        success: false,
        error: 'Permiso no encontrado'
      });
    }

    res.json({
      success: true,
      message: 'Permiso actualizado exitosamente',
      data: updatedPermission
    });
  } catch (error) {
    console.error('Error al actualizar permiso:', error);
    res.status(500).json({
      success: false,
      error: 'Error al actualizar permiso'
    });
  }
};

const deleteExistingPermission = async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await deletePermission(parseInt(id), req.user.user_id);

    if (!deleted) {
      return res.status(404).json({
        success: false,
        error: 'Permiso no encontrado'
      });
    }

    res.json({
      success: true,
      message: 'Permiso eliminado exitosamente'
    });
  } catch (error) {
    console.error('Error al eliminar permiso:', error);
    res.status(500).json({
      success: false,
      error: 'Error al eliminar permiso'
    });
  }
};

// Role-Permission Assignment
const assignPermission = async (req, res) => {
  try {
    const { roleId } = req.params;
    const { permission_id } = req.body;

    if (!permission_id) {
      return res.status(400).json({
        success: false,
        error: 'El ID del permiso es requerido'
      });
    }

    const assignment = await assignPermissionToRole(parseInt(roleId), parseInt(permission_id));

    res.status(201).json({
      success: true,
      message: 'Permiso asignado al rol exitosamente',
      data: assignment
    });
  } catch (error) {
    console.error('Error al asignar permiso:', error);
    res.status(500).json({
      success: false,
      error: 'Error al asignar permiso'
    });
  }
};

const removePermission = async (req, res) => {
  try {
    const { roleId, permissionId } = req.params;

    const removed = await removePermissionFromRole(parseInt(roleId), parseInt(permissionId));

    if (!removed) {
      return res.status(404).json({
        success: false,
        error: 'Asignación no encontrada'
      });
    }

    res.json({
      success: true,
      message: 'Permiso removido del rol exitosamente'
    });
  } catch (error) {
    console.error('Error al remover permiso:', error);
    res.status(500).json({
      success: false,
      error: 'Error al remover permiso'
    });
  }
};

const syncPermissions = async (req, res) => {
  try {
    const { roleId } = req.params;
    const { permission_ids } = req.body;

    if (!Array.isArray(permission_ids)) {
      return res.status(400).json({
        success: false,
        error: 'permission_ids debe ser un array'
      });
    }

    await syncRolePermissions(parseInt(roleId), permission_ids);

    res.json({
      success: true,
      message: 'Permisos sincronizados exitosamente'
    });
  } catch (error) {
    console.error('Error al sincronizar permisos:', error);
    res.status(500).json({
      success: false,
      error: 'Error al sincronizar permisos'
    });
  }
};

module.exports = {
  getRoles,
  getRole,
  createNewRole,
  updateExistingRole,
  deleteExistingRole,
  getPermissions,
  getPermission,
  createNewPermission,
  updateExistingPermission,
  deleteExistingPermission,
  assignPermission,
  removePermission,
  syncPermissions
};
