/**
 * Controlador genérico para catálogos
 * Crea funciones CRUD estándar para cualquier modelo de catálogo
 */
const createCatalogController = (model, entityName) => {
  return {
    getAll: async (req, res) => {
      try {
        // Permitir incluir inactivos con query param ?includeInactive=true
        const includeInactive = req.query.includeInactive === 'true';
        const items = await model.getAll(includeInactive);
        res.json({
          success: true,
          data: items
        });
      } catch (error) {
        console.error(`Error al obtener ${entityName}:`, error);
        res.status(500).json({
          success: false,
          error: `Error al obtener ${entityName}`
        });
      }
    },

    getById: async (req, res) => {
      try {
        const { id } = req.params;
        const includeInactive = req.query.includeInactive === 'true';
        const item = await model.getById(parseInt(id), includeInactive);

        if (!item) {
          return res.status(404).json({
            success: false,
            error: `${entityName} no encontrado`
          });
        }

        res.json({
          success: true,
          data: item
        });
      } catch (error) {
        console.error(`Error al obtener ${entityName}:`, error);
        res.status(500).json({
          success: false,
          error: `Error al obtener ${entityName}`
        });
      }
    },

    create: async (req, res) => {
      try {
        const newItem = await model.create(req.body, req.user.user_id);

        res.status(201).json({
          success: true,
          message: `${entityName} creado exitosamente`,
          data: newItem
        });
      } catch (error) {
        console.error(`Error al crear ${entityName}:`, error);

        if (error.code === '23505') {
          return res.status(409).json({
            success: false,
            error: `Ya existe un ${entityName} con esos datos`
          });
        }

        res.status(500).json({
          success: false,
          error: `Error al crear ${entityName}`
        });
      }
    },

    update: async (req, res) => {
      try {
        const { id } = req.params;
        const updatedItem = await model.update(parseInt(id), req.body, req.user.user_id);

        if (!updatedItem) {
          return res.status(404).json({
            success: false,
            error: `${entityName} no encontrado`
          });
        }

        res.json({
          success: true,
          message: `${entityName} actualizado exitosamente`,
          data: updatedItem
        });
      } catch (error) {
        console.error(`Error al actualizar ${entityName}:`, error);

        if (error.code === '23505') {
          return res.status(409).json({
            success: false,
            error: `Ya existe un ${entityName} con esos datos`
          });
        }

        res.status(500).json({
          success: false,
          error: `Error al actualizar ${entityName}`
        });
      }
    },

    delete: async (req, res) => {
      try {
        const { id } = req.params;
        const deleted = await model.delete(parseInt(id), req.user.user_id);

        if (!deleted) {
          return res.status(404).json({
            success: false,
            error: `${entityName} no encontrado`
          });
        }

        res.json({
          success: true,
          message: `${entityName} eliminado exitosamente`
        });
      } catch (error) {
        console.error(`Error al eliminar ${entityName}:`, error);
        res.status(500).json({
          success: false,
          error: `Error al eliminar ${entityName}`
        });
      }
    }
  };
};

module.exports = createCatalogController;
