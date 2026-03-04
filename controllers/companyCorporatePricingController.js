/**
 * Company Corporate Pricing Controller
 * Controlador para gestionar precios corporativos por empresa
 */

const {
  getCompanyProcedurePrices,
  upsertCompanyProcedurePrice,
  deleteCompanyProcedurePrice,
  bulkUpsertPrices,
  getAllProceduresWithCorporatePrices,
  countCompanyPrices,
  getCompanyValidityHistory,
  createValidityHistoryEntry
} = require('../models/companyCorporatePricingModel');
const { getCompanyById } = require('../models/companiesModel');
const { generatePricingTemplate, parseImportedExcel } = require('../utils/excelPricingHelper');

// ============================================================================
// PRECIOS CORPORATIVOS
// ============================================================================

/**
 * GET /api/company-pricing/:companyId/prices
 * Listar precios corporativos de una empresa
 */
const getPrices = async (req, res) => {
  try {
    const { companyId } = req.params;
    const { procedure_type, search } = req.query;

    const company = await getCompanyById(parseInt(companyId));
    if (!company) {
      return res.status(404).json({
        success: false,
        error: 'Empresa no encontrada'
      });
    }

    const filters = { procedure_type, search };
    const [prices, total] = await Promise.all([
      getCompanyProcedurePrices(parseInt(companyId), filters),
      countCompanyPrices(parseInt(companyId))
    ]);

    res.json({
      success: true,
      data: prices,
      company: {
        company_id: company.company_id,
        company_name: company.company_name,
        ruc: company.ruc,
        vigencia_inicio: company.vigencia_inicio,
        vigencia_fin: company.vigencia_fin
      },
      total_prices: total
    });
  } catch (error) {
    console.error('Error al obtener precios corporativos:', error);
    res.status(500).json({
      success: false,
      error: 'Error al obtener precios corporativos'
    });
  }
};

/**
 * POST /api/company-pricing/:companyId/prices
 * Crear o actualizar un precio corporativo individual
 */
const upsertPrice = async (req, res) => {
  try {
    const { companyId } = req.params;
    const { procedure_type, procedure_id, corporate_price } = req.body;

    if (!procedure_type || !procedure_id || corporate_price === undefined || corporate_price === null) {
      return res.status(400).json({
        success: false,
        error: 'Se requieren procedure_type, procedure_id y corporate_price'
      });
    }

    if (!['sub_procedure', 'condition_procedure'].includes(procedure_type)) {
      return res.status(400).json({
        success: false,
        error: 'procedure_type debe ser sub_procedure o condition_procedure'
      });
    }

    if (parseFloat(corporate_price) < 0) {
      return res.status(400).json({
        success: false,
        error: 'El precio corporativo no puede ser negativo'
      });
    }

    const company = await getCompanyById(parseInt(companyId));
    if (!company) {
      return res.status(404).json({
        success: false,
        error: 'Empresa no encontrada'
      });
    }

    const result = await upsertCompanyProcedurePrice(
      parseInt(companyId),
      procedure_type,
      parseInt(procedure_id),
      parseFloat(corporate_price),
      req.user.user_id
    );

    res.status(201).json({
      success: true,
      message: 'Precio corporativo guardado exitosamente',
      data: result
    });
  } catch (error) {
    console.error('Error al guardar precio corporativo:', error);
    res.status(500).json({
      success: false,
      error: 'Error al guardar precio corporativo'
    });
  }
};

/**
 * POST /api/company-pricing/:companyId/prices/bulk
 * Crear o actualizar multiples precios corporativos
 */
const bulkUpsert = async (req, res) => {
  try {
    const { companyId } = req.params;
    const { prices } = req.body;

    if (!Array.isArray(prices) || prices.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Se requiere un array de precios no vacio'
      });
    }

    const company = await getCompanyById(parseInt(companyId));
    if (!company) {
      return res.status(404).json({
        success: false,
        error: 'Empresa no encontrada'
      });
    }

    // Validar cada precio
    for (const price of prices) {
      if (!price.procedure_type || !price.procedure_id || price.corporate_price === undefined) {
        return res.status(400).json({
          success: false,
          error: 'Cada precio debe tener procedure_type, procedure_id y corporate_price'
        });
      }
      if (!['sub_procedure', 'condition_procedure'].includes(price.procedure_type)) {
        return res.status(400).json({
          success: false,
          error: `procedure_type invalido: ${price.procedure_type}`
        });
      }
      if (parseFloat(price.corporate_price) < 0) {
        return res.status(400).json({
          success: false,
          error: 'Los precios corporativos no pueden ser negativos'
        });
      }
    }

    const result = await bulkUpsertPrices(parseInt(companyId), prices, req.user.user_id);

    res.json({
      success: true,
      message: `Precios actualizados: ${result.created} creados, ${result.updated} actualizados`,
      data: result
    });
  } catch (error) {
    console.error('Error al actualizar precios masivamente:', error);
    res.status(500).json({
      success: false,
      error: 'Error al actualizar precios masivamente'
    });
  }
};

/**
 * DELETE /api/company-pricing/:companyId/prices/:priceId
 * Eliminar un precio corporativo (soft delete)
 */
const deletePrice = async (req, res) => {
  try {
    const { priceId } = req.params;

    const deleted = await deleteCompanyProcedurePrice(parseInt(priceId), req.user.user_id);

    if (!deleted) {
      return res.status(404).json({
        success: false,
        error: 'Precio corporativo no encontrado'
      });
    }

    res.json({
      success: true,
      message: 'Precio corporativo eliminado exitosamente'
    });
  } catch (error) {
    console.error('Error al eliminar precio corporativo:', error);
    res.status(500).json({
      success: false,
      error: 'Error al eliminar precio corporativo'
    });
  }
};

// ============================================================================
// PLANTILLA EXCEL
// ============================================================================

/**
 * GET /api/company-pricing/:companyId/template
 * Descargar plantilla Excel con todos los procedimientos
 */
const downloadTemplate = async (req, res) => {
  try {
    const { companyId } = req.params;

    const company = await getCompanyById(parseInt(companyId));
    if (!company) {
      return res.status(404).json({
        success: false,
        error: 'Empresa no encontrada'
      });
    }

    const allProcedures = await getAllProceduresWithCorporatePrices(parseInt(companyId));

    const buffer = await generatePricingTemplate(company, allProcedures);

    const filename = `precios_corporativos_${company.ruc || company.company_id}_${Date.now()}.xlsx`;

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(buffer);
  } catch (error) {
    console.error('Error al generar plantilla Excel:', error);
    res.status(500).json({
      success: false,
      error: 'Error al generar plantilla Excel'
    });
  }
};

/**
 * POST /api/company-pricing/:companyId/import
 * Importar precios desde archivo Excel
 */
const importFromExcel = async (req, res) => {
  try {
    const { companyId } = req.params;

    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'No se recibio ningun archivo'
      });
    }

    const company = await getCompanyById(parseInt(companyId));
    if (!company) {
      return res.status(404).json({
        success: false,
        error: 'Empresa no encontrada'
      });
    }

    const parsedPrices = await parseImportedExcel(req.file.buffer);

    if (parsedPrices.length === 0) {
      return res.json({
        success: true,
        message: 'No se encontraron precios corporativos para importar',
        data: { created: 0, updated: 0, skipped: 0, errors: [] }
      });
    }

    const result = await bulkUpsertPrices(parseInt(companyId), parsedPrices, req.user.user_id);

    res.json({
      success: true,
      message: `Importacion completada: ${result.created} creados, ${result.updated} actualizados${result.errors.length > 0 ? `, ${result.errors.length} errores` : ''}`,
      data: result
    });
  } catch (error) {
    console.error('Error al importar precios desde Excel:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Error al importar precios desde Excel'
    });
  }
};

// ============================================================================
// VIGENCIA
// ============================================================================

/**
 * POST /api/company-pricing/:companyId/extend-validity
 * Extender vigencia de una empresa (solo super_admin role_id=1)
 */
const extendValidity = async (req, res) => {
  try {
    const { companyId } = req.params;
    const { new_vigencia_fin, extension_reason } = req.body;

    if (req.user.role_id !== 1) {
      return res.status(403).json({
        success: false,
        error: 'Solo el super administrador puede extender la vigencia'
      });
    }

    if (!new_vigencia_fin || !extension_reason) {
      return res.status(400).json({
        success: false,
        error: 'Se requieren new_vigencia_fin y extension_reason'
      });
    }

    if (extension_reason.length < 10) {
      return res.status(400).json({
        success: false,
        error: 'La razon de extension debe tener al menos 10 caracteres'
      });
    }

    const company = await getCompanyById(parseInt(companyId));
    if (!company) {
      return res.status(404).json({
        success: false,
        error: 'Empresa no encontrada'
      });
    }

    if (!company.vigencia_fin) {
      return res.status(400).json({
        success: false,
        error: 'La empresa no tiene vigencia definida para extender'
      });
    }

    const newDate = new Date(new_vigencia_fin);
    const currentDate = new Date(company.vigencia_fin);
    if (newDate <= currentDate) {
      return res.status(400).json({
        success: false,
        error: 'La nueva fecha de vigencia debe ser posterior a la actual'
      });
    }

    const updatedCompany = await createValidityHistoryEntry(
      parseInt(companyId),
      company.vigencia_fin,
      new_vigencia_fin,
      extension_reason,
      req.user.user_id
    );

    res.json({
      success: true,
      message: 'Vigencia extendida exitosamente',
      data: updatedCompany
    });
  } catch (error) {
    console.error('Error al extender vigencia:', error);
    res.status(500).json({
      success: false,
      error: 'Error al extender vigencia'
    });
  }
};

/**
 * GET /api/company-pricing/:companyId/validity-history
 * Obtener historial de extensiones de vigencia
 */
const getValidityHistory = async (req, res) => {
  try {
    const { companyId } = req.params;

    const company = await getCompanyById(parseInt(companyId));
    if (!company) {
      return res.status(404).json({
        success: false,
        error: 'Empresa no encontrada'
      });
    }

    const history = await getCompanyValidityHistory(parseInt(companyId));

    res.json({
      success: true,
      data: history,
      company: {
        company_id: company.company_id,
        company_name: company.company_name,
        vigencia_inicio: company.vigencia_inicio,
        vigencia_fin: company.vigencia_fin
      }
    });
  } catch (error) {
    console.error('Error al obtener historial de vigencia:', error);
    res.status(500).json({
      success: false,
      error: 'Error al obtener historial de vigencia'
    });
  }
};

module.exports = {
  getPrices,
  upsertPrice,
  bulkUpsert,
  deletePrice,
  downloadTemplate,
  importFromExcel,
  extendValidity,
  getValidityHistory
};
