const {
  getAllCompanies,
  getCompanyById,
  createCompany,
  updateCompany,
  deleteCompany,
  countCompanies,
  getCompanyByRuc: getCompanyByRucModel,
  getAllCompanyContracts,
  getCompanyContractById,
  createCompanyContract,
  updateCompanyContract,
  deleteCompanyContract,
  countCompanyContracts
} = require('../models/companiesModel');

// Companies
const getCompanies = async (req, res) => {
  try {
    const { search, city, country, page = 1, limit = 20 } = req.query;

    const filters = {
      search,
      city,
      country,
      limit: parseInt(limit),
      offset: (parseInt(page) - 1) * parseInt(limit)
    };

    const [companies, total] = await Promise.all([
      getAllCompanies(filters),
      countCompanies(filters)
    ]);

    res.json({
      success: true,
      data: companies,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Error al obtener empresas:', error);
    res.status(500).json({
      success: false,
      error: 'Error al obtener empresas'
    });
  }
};

const getCompany = async (req, res) => {
  try {
    const { id } = req.params;
    const company = await getCompanyById(parseInt(id));

    if (!company) {
      return res.status(404).json({
        success: false,
        error: 'Empresa no encontrada'
      });
    }

    res.json({
      success: true,
      data: company
    });
  } catch (error) {
    console.error('Error al obtener empresa:', error);
    res.status(500).json({
      success: false,
      error: 'Error al obtener empresa'
    });
  }
};

const createNewCompany = async (req, res) => {
  try {
    const companyData = {
      ...req.body,
      user_id_registration: req.user.user_id
    };

    if (!companyData.company_name) {
      return res.status(400).json({
        success: false,
        error: 'El nombre de la empresa es requerido'
      });
    }

    const newCompany = await createCompany(companyData);

    res.status(201).json({
      success: true,
      message: 'Empresa creada exitosamente',
      data: newCompany
    });
  } catch (error) {
    console.error('Error al crear empresa:', error);
    res.status(500).json({
      success: false,
      error: 'Error al crear empresa'
    });
  }
};

const updateExistingCompany = async (req, res) => {
  try {
    const { id } = req.params;
    const companyData = {
      ...req.body,
      user_id_modification: req.user.user_id
    };

    const updatedCompany = await updateCompany(parseInt(id), companyData);

    if (!updatedCompany) {
      return res.status(404).json({
        success: false,
        error: 'Empresa no encontrada'
      });
    }

    res.json({
      success: true,
      message: 'Empresa actualizada exitosamente',
      data: updatedCompany
    });
  } catch (error) {
    console.error('Error al actualizar empresa:', error);
    res.status(500).json({
      success: false,
      error: 'Error al actualizar empresa'
    });
  }
};

const deleteExistingCompany = async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await deleteCompany(parseInt(id), req.user.user_id);

    if (!deleted) {
      return res.status(404).json({
        success: false,
        error: 'Empresa no encontrada'
      });
    }

    res.json({
      success: true,
      message: 'Empresa eliminada exitosamente'
    });
  } catch (error) {
    console.error('Error al eliminar empresa:', error);
    res.status(500).json({
      success: false,
      error: 'Error al eliminar empresa'
    });
  }
};

// Company Contracts
const getCompanyContracts = async (req, res) => {
  try {
    const {
      company_id,
      branch_id,
      contract_type,
      is_signed,
      date_from,
      date_to,
      page = 1,
      limit = 20
    } = req.query;

    const filters = {
      company_id: company_id ? parseInt(company_id) : null,
      branch_id: branch_id ? parseInt(branch_id) : null,
      contract_type,
      is_signed: is_signed !== undefined ? is_signed === 'true' : undefined,
      date_from,
      date_to,
      limit: parseInt(limit),
      offset: (parseInt(page) - 1) * parseInt(limit)
    };

    const [contracts, total] = await Promise.all([
      getAllCompanyContracts(filters),
      countCompanyContracts(filters)
    ]);

    res.json({
      success: true,
      data: contracts,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Error al obtener contratos:', error);
    res.status(500).json({
      success: false,
      error: 'Error al obtener contratos'
    });
  }
};

const getCompanyContract = async (req, res) => {
  try {
    const { id } = req.params;
    const contract = await getCompanyContractById(parseInt(id));

    if (!contract) {
      return res.status(404).json({
        success: false,
        error: 'Contrato no encontrado'
      });
    }

    res.json({
      success: true,
      data: contract
    });
  } catch (error) {
    console.error('Error al obtener contrato:', error);
    res.status(500).json({
      success: false,
      error: 'Error al obtener contrato'
    });
  }
};

const createNewCompanyContract = async (req, res) => {
  try {
    const contractData = {
      ...req.body,
      user_id_registration: req.user.user_id
    };

    if (!contractData.company_id || !contractData.branch_id ||
        !contractData.contract_type || !contractData.contract_date ||
        !contractData.start_date) {
      return res.status(400).json({
        success: false,
        error: 'Faltan campos requeridos'
      });
    }

    const newContract = await createCompanyContract(contractData);

    res.status(201).json({
      success: true,
      message: 'Contrato creado exitosamente',
      data: newContract
    });
  } catch (error) {
    console.error('Error al crear contrato:', error);
    res.status(500).json({
      success: false,
      error: 'Error al crear contrato'
    });
  }
};

const updateExistingCompanyContract = async (req, res) => {
  try {
    const { id } = req.params;
    const contractData = {
      ...req.body,
      user_id_modification: req.user.user_id
    };

    const updatedContract = await updateCompanyContract(parseInt(id), contractData);

    if (!updatedContract) {
      return res.status(404).json({
        success: false,
        error: 'Contrato no encontrado'
      });
    }

    res.json({
      success: true,
      message: 'Contrato actualizado exitosamente',
      data: updatedContract
    });
  } catch (error) {
    console.error('Error al actualizar contrato:', error);
    res.status(500).json({
      success: false,
      error: 'Error al actualizar contrato'
    });
  }
};

const deleteExistingCompanyContract = async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await deleteCompanyContract(parseInt(id), req.user.user_id);

    if (!deleted) {
      return res.status(404).json({
        success: false,
        error: 'Contrato no encontrado'
      });
    }

    res.json({
      success: true,
      message: 'Contrato eliminado exitosamente'
    });
  } catch (error) {
    console.error('Error al eliminar contrato:', error);
    res.status(500).json({
      success: false,
      error: 'Error al eliminar contrato'
    });
  }
};

/**
 * GET /api/companies/by-ruc/:ruc
 * Buscar empresa por RUC (ruta publica, sin auth)
 */
const getCompanyByRuc = async (req, res) => {
  try {
    const { ruc } = req.params;

    if (!ruc || ruc.length !== 11 || !/^\d{11}$/.test(ruc)) {
      return res.status(400).json({
        success: false,
        error: 'El RUC debe ser un numero de 11 digitos'
      });
    }

    const company = await getCompanyByRucModel(ruc);

    if (!company) {
      return res.status(404).json({
        success: false,
        error: 'No se encontro empresa con ese RUC'
      });
    }

    res.json({
      success: true,
      data: company
    });
  } catch (error) {
    console.error('Error al buscar empresa por RUC:', error);
    res.status(500).json({
      success: false,
      error: 'Error al buscar empresa por RUC'
    });
  }
};

module.exports = {
  getCompanies,
  getCompany,
  createNewCompany,
  updateExistingCompany,
  deleteExistingCompany,
  getCompanyByRuc,
  getCompanyContracts,
  getCompanyContract,
  createNewCompanyContract,
  updateExistingCompanyContract,
  deleteExistingCompanyContract
};
