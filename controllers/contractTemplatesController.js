const {
  getAllContractTemplates,
  getContractTemplateById,
  createContractTemplate,
  updateContractTemplate,
  deleteContractTemplate,
  countContractTemplates
} = require('../models/contractTemplatesModel');

// Obtener todas las plantillas
const getContractTemplates = async (req, res) => {
  try {
    const { template_category, template_type, is_active, search, page = 1, limit = 20 } = req.query;
    const filters = {
      template_category,
      template_type,
      is_active: is_active === 'true' ? true : is_active === 'false' ? false : undefined,
      search,
      limit: parseInt(limit),
      offset: (parseInt(page) - 1) * parseInt(limit)
    };

    const [templates, total] = await Promise.all([
      getAllContractTemplates(filters),
      countContractTemplates(filters)
    ]);

    res.json({
      success: true,
      data: templates,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Error al obtener plantillas de contratos:', error);
    res.status(500).json({ success: false, error: 'Error al obtener plantillas de contratos' });
  }
};

// Obtener una plantilla por ID
const getContractTemplate = async (req, res) => {
  try {
    const template = await getContractTemplateById(parseInt(req.params.id));
    if (!template) {
      return res.status(404).json({ success: false, error: 'Plantilla no encontrada' });
    }
    res.json({ success: true, data: template });
  } catch (error) {
    console.error('Error al obtener plantilla:', error);
    res.status(500).json({ success: false, error: 'Error al obtener plantilla' });
  }
};

// Crear nueva plantilla
const createNewContractTemplate = async (req, res) => {
  try {
    const { template_name, template_type, template_content } = req.body;

    if (!template_name || !template_type || !template_content) {
      return res.status(400).json({
        success: false,
        error: 'Faltan campos requeridos: template_name, template_type, template_content'
      });
    }

    const newTemplate = await createContractTemplate(req.body, req.user.user_id);
    res.status(201).json({
      success: true,
      message: 'Plantilla de contrato creada exitosamente',
      data: newTemplate
    });
  } catch (error) {
    console.error('Error al crear plantilla:', error);
    res.status(500).json({ success: false, error: 'Error al crear plantilla de contrato' });
  }
};

// Actualizar plantilla
const updateExistingContractTemplate = async (req, res) => {
  try {
    const updated = await updateContractTemplate(
      parseInt(req.params.id),
      req.body,
      req.user.user_id
    );

    if (!updated) {
      return res.status(404).json({ success: false, error: 'Plantilla no encontrada' });
    }

    res.json({
      success: true,
      message: 'Plantilla de contrato actualizada exitosamente',
      data: updated
    });
  } catch (error) {
    console.error('Error al actualizar plantilla:', error);
    res.status(500).json({ success: false, error: 'Error al actualizar plantilla' });
  }
};

// Eliminar plantilla (soft delete)
const deleteExistingContractTemplate = async (req, res) => {
  try {
    const deleted = await deleteContractTemplate(parseInt(req.params.id), req.user.user_id);

    if (!deleted) {
      return res.status(404).json({ success: false, error: 'Plantilla no encontrada' });
    }

    res.json({
      success: true,
      message: 'Plantilla de contrato eliminada exitosamente'
    });
  } catch (error) {
    console.error('Error al eliminar plantilla:', error);
    res.status(500).json({ success: false, error: 'Error al eliminar plantilla' });
  }
};

module.exports = {
  getContractTemplates,
  getContractTemplate,
  createNewContractTemplate,
  updateExistingContractTemplate,
  deleteExistingContractTemplate
};
