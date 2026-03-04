const {
  getAllBranches,
  getBranchById,
  createBranch,
  updateBranch,
  deleteBranch
} = require('../models/branchesModel');

const getBranches = async (req, res) => {
  try {
    const { company_id, search, status } = req.query;
    const filters = {
      company_id: company_id ? parseInt(company_id) : null,
      search: search || null,
      status: status || 'active'
    };

    const branches = await getAllBranches(filters);

    res.json({
      success: true,
      data: branches
    });
  } catch (error) {
    console.error('Error al obtener sedes:', error);
    res.status(500).json({
      success: false,
      error: 'Error al obtener sedes'
    });
  }
};

const getBranch = async (req, res) => {
  try {
    const { id } = req.params;
    const branch = await getBranchById(parseInt(id));

    if (!branch) {
      return res.status(404).json({
        success: false,
        error: 'Sede no encontrada'
      });
    }

    res.json({
      success: true,
      data: branch
    });
  } catch (error) {
    console.error('Error al obtener sede:', error);
    res.status(500).json({
      success: false,
      error: 'Error al obtener sede'
    });
  }
};

const createNewBranch = async (req, res) => {
  try {
    const {
      branch_name,
      branch_code,
      phone,
      email,
      address,
      city,
      state,
      country,
      postal_code,
      is_main_office,
      mobile,
      manager_name,
      manager_phone,
      opening_hours,
      department,
      notes,
      latitude,
      longitude,
      administrator_id
    } = req.body;

    // Validaciones obligatorias
    if (!branch_name) {
      return res.status(400).json({
        success: false,
        error: 'El nombre de la sede es requerido'
      });
    }

    if (!address) {
      return res.status(400).json({
        success: false,
        error: 'La dirección es requerida'
      });
    }

    if (!city) {
      return res.status(400).json({
        success: false,
        error: 'La ciudad es requerida'
      });
    }

    if (!phone) {
      return res.status(400).json({
        success: false,
        error: 'El teléfono es requerido'
      });
    }

    // Validación de email (si se proporciona)
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({
        success: false,
        error: 'El formato del email no es válido'
      });
    }

    const branchData = {
      branch_name,
      branch_code,
      phone,
      email,
      address,
      city,
      state,
      country: country || 'Peru',
      postal_code,
      is_main_office,
      mobile,
      manager_name,
      manager_phone,
      opening_hours,
      department,
      notes,
      latitude,
      longitude,
      administrator_id,
      configuration: null,
      user_id_registration: req.user.id
    };

    const newBranch = await createBranch(branchData);

    res.status(201).json({
      success: true,
      message: 'Sede creada exitosamente',
      data: newBranch
    });
  } catch (error) {
    console.error('Error al crear sede:', error);

    // Manejo específico para constraint violations
    if (error.code === '23505') {
      return res.status(400).json({
        success: false,
        error: 'El código de sede ya existe. Por favor, use uno diferente.',
        message: error.message
      });
    }

    res.status(500).json({
      success: false,
      error: 'Error al crear sede',
      message: error.message
    });
  }
};

const updateExistingBranch = async (req, res) => {
  try {
    const { id } = req.params;

    const {
      branch_name,
      branch_code,
      phone,
      email,
      address,
      city,
      state,
      country,
      postal_code,
      is_main_office,
      mobile,
      manager_name,
      manager_phone,
      opening_hours,
      department,
      notes,
      latitude,
      longitude,
      administrator_id
    } = req.body;

    // Validación de email (si se proporciona)
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({
        success: false,
        error: 'El formato del email no es válido'
      });
    }

    const branchData = {
      branch_name,
      branch_code,
      phone,
      email,
      address,
      city,
      state,
      country,
      postal_code,
      is_main_office,
      mobile,
      manager_name,
      manager_phone,
      opening_hours,
      department,
      notes,
      latitude,
      longitude,
      administrator_id,
      configuration: null,
      user_id_modification: req.user.id
    };

    const updatedBranch = await updateBranch(parseInt(id), branchData);

    if (!updatedBranch) {
      return res.status(404).json({
        success: false,
        error: 'Sede no encontrada'
      });
    }

    res.json({
      success: true,
      message: 'Sede actualizada exitosamente',
      data: updatedBranch
    });
  } catch (error) {
    console.error('Error al actualizar sede:', error);
    res.status(500).json({
      success: false,
      error: 'Error al actualizar sede'
    });
  }
};

const deleteExistingBranch = async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await deleteBranch(parseInt(id), req.user.id);

    if (!deleted) {
      return res.status(404).json({
        success: false,
        error: 'Sede no encontrada'
      });
    }

    res.json({
      success: true,
      message: 'Sede eliminada exitosamente'
    });
  } catch (error) {
    console.error('Error al eliminar sede:', error);
    res.status(500).json({
      success: false,
      error: 'Error al eliminar sede'
    });
  }
};

/**
 * Obtiene solo sedes activas con información pública
 * Endpoint público - NO requiere autenticación
 * Filtro de campos sensibles para proteger información administrativa
 */
const getActiveBranches = async (req, res) => {
  try {
    const filters = {
      status: 'active'
    };

    const branches = await getAllBranches(filters);

    // Filtrar campos sensibles - Solo devolver información pública
    const publicBranches = branches.map(branch => ({
      branch_id: branch.branch_id,
      branch_name: branch.branch_name,
      branch_code: branch.branch_code,
      address: branch.address,
      city: branch.city,
      state: branch.state,
      country: branch.country,
      phone: branch.phone,
      mobile: branch.mobile,
      email: branch.email,
      opening_hours: branch.opening_hours,
      latitude: branch.latitude,
      longitude: branch.longitude,
      department: branch.department,
      postal_code: branch.postal_code
      // NO exponer: administrator_id, configuration, notes, user_id_registration, etc.
    }));

    res.json({
      success: true,
      data: publicBranches
    });
  } catch (error) {
    console.error('Error al obtener sedes activas:', error);
    res.status(500).json({
      success: false,
      error: 'Error al obtener sedes activas'
    });
  }
};

module.exports = {
  getBranches,
  getBranch,
  createNewBranch,
  updateExistingBranch,
  deleteExistingBranch,
  getActiveBranches
};
