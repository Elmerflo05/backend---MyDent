/**
 * Controlador: Laboratory Service Prices
 *
 * Endpoints para gestión de precios de servicios de laboratorio.
 * Mantiene compatibilidad con el formato legacy del frontend.
 */

const {
  getAllServicePrices,
  getServicePricesByCategory,
  getServicePriceByCode,
  getServicePricesGroupedBySubcategory,
  countServicesByCategory,
  getTomografia3DPricingLegacy,
  getRadiografiasPricingLegacy,
  getAllPricingLegacy,
  updateServicePrice,
  updatePriceByCode,
  updateTomografia3DPricingBulk,
  updateRadiografiasPricingBulk
} = require('../models/laboratoryServicePricesModel');

/**
 * GET /api/laboratory/service-prices
 * Obtiene todos los precios de servicios
 */
const getAllPrices = async (req, res) => {
  try {
    const { category, subcategory, grouped } = req.query;

    // Si se solicita agrupado por subcategoría
    if (grouped === 'true' && category) {
      const groupedServices = await getServicePricesGroupedBySubcategory(category);
      return res.json({
        success: true,
        data: groupedServices
      });
    }

    // Consulta normal con filtros
    const services = await getAllServicePrices({
      category: category || null,
      subcategory: subcategory || null,
      isActive: true
    });

    res.json({
      success: true,
      data: services,
      count: services.length
    });
  } catch (error) {
    console.error('Error al obtener precios de servicios:', error);
    res.status(500).json({
      success: false,
      error: 'Error al obtener precios de servicios'
    });
  }
};

/**
 * GET /api/laboratory/service-prices/tomografia3d
 * Obtiene precios de Tomografía 3D (formato legacy para compatibilidad)
 */
const getTomografia3DPrices = async (req, res) => {
  try {
    const { format } = req.query;

    // Si se solicita formato estructurado
    if (format === 'structured') {
      const services = await getServicePricesByCategory('tomografia3d');
      return res.json({
        success: true,
        data: services
      });
    }

    // Formato legacy por defecto (compatible con frontend actual)
    const pricing = await getTomografia3DPricingLegacy();

    res.json({
      success: true,
      data: pricing
    });
  } catch (error) {
    console.error('Error al obtener precios de Tomografía 3D:', error);
    res.status(500).json({
      success: false,
      error: 'Error al obtener precios de Tomografía 3D'
    });
  }
};

/**
 * GET /api/laboratory/service-prices/radiografias
 * Obtiene precios de Radiografías (formato legacy para compatibilidad)
 */
const getRadiografiasPrices = async (req, res) => {
  try {
    const { format } = req.query;

    // Si se solicita formato estructurado
    if (format === 'structured') {
      const services = await getServicePricesByCategory('radiografias');
      return res.json({
        success: true,
        data: services
      });
    }

    // Formato legacy por defecto (compatible con frontend actual)
    const pricing = await getRadiografiasPricingLegacy();

    res.json({
      success: true,
      data: pricing
    });
  } catch (error) {
    console.error('Error al obtener precios de Radiografías:', error);
    res.status(500).json({
      success: false,
      error: 'Error al obtener precios de Radiografías'
    });
  }
};

/**
 * GET /api/laboratory/service-prices/all
 * Obtiene todos los precios en formato legacy (ambas categorías)
 */
const getAllPricingCombined = async (req, res) => {
  try {
    const pricing = await getAllPricingLegacy();

    res.json({
      success: true,
      data: pricing
    });
  } catch (error) {
    console.error('Error al obtener todos los precios:', error);
    res.status(500).json({
      success: false,
      error: 'Error al obtener precios'
    });
  }
};

/**
 * GET /api/laboratory/service-prices/code/:serviceCode
 * Obtiene un servicio por su código
 */
const getPriceByCode = async (req, res) => {
  try {
    const { serviceCode } = req.params;

    const service = await getServicePriceByCode(serviceCode);

    if (!service) {
      return res.status(404).json({
        success: false,
        error: 'Servicio no encontrado'
      });
    }

    res.json({
      success: true,
      data: service
    });
  } catch (error) {
    console.error('Error al obtener servicio por código:', error);
    res.status(500).json({
      success: false,
      error: 'Error al obtener servicio'
    });
  }
};

/**
 * GET /api/laboratory/service-prices/stats
 * Obtiene estadísticas de servicios
 */
const getServiceStats = async (req, res) => {
  try {
    const counts = await countServicesByCategory();

    res.json({
      success: true,
      data: counts
    });
  } catch (error) {
    console.error('Error al obtener estadísticas:', error);
    res.status(500).json({
      success: false,
      error: 'Error al obtener estadísticas'
    });
  }
};

/**
 * PUT /api/laboratory/service-prices/:id
 * Actualiza un precio de servicio específico
 */
const updatePrice = async (req, res) => {
  try {
    const { id } = req.params;
    const { base_price, description, help_text, is_active, options_config } = req.body;

    // Validar precio si se proporciona
    if (base_price !== undefined && (typeof base_price !== 'number' || base_price < 0)) {
      return res.status(400).json({
        success: false,
        error: 'El precio debe ser un número positivo'
      });
    }

    const updated = await updateServicePrice(
      parseInt(id),
      { base_price, description, help_text, is_active, options_config },
      req.user.user_id
    );

    if (!updated) {
      return res.status(404).json({
        success: false,
        error: 'Servicio no encontrado'
      });
    }

    res.json({
      success: true,
      message: 'Precio actualizado exitosamente',
      data: updated
    });
  } catch (error) {
    console.error('Error al actualizar precio:', error);
    res.status(500).json({
      success: false,
      error: 'Error al actualizar precio'
    });
  }
};

/**
 * PUT /api/laboratory/service-prices/code/:serviceCode
 * Actualiza un precio por código de servicio
 */
const updatePriceByServiceCode = async (req, res) => {
  try {
    const { serviceCode } = req.params;
    const { base_price } = req.body;

    // Validar precio
    if (typeof base_price !== 'number' || base_price < 0) {
      return res.status(400).json({
        success: false,
        error: 'El precio debe ser un número positivo'
      });
    }

    const updated = await updatePriceByCode(serviceCode, base_price, req.user.user_id);

    if (!updated) {
      return res.status(404).json({
        success: false,
        error: 'Servicio no encontrado'
      });
    }

    res.json({
      success: true,
      message: 'Precio actualizado exitosamente',
      data: updated
    });
  } catch (error) {
    console.error('Error al actualizar precio por código:', error);
    res.status(500).json({
      success: false,
      error: 'Error al actualizar precio'
    });
  }
};

/**
 * PUT /api/laboratory/service-prices/tomografia3d
 * Actualiza múltiples precios de Tomografía 3D (formato legacy)
 * Solo accesible por super_admin
 */
const updateTomografia3DPrices = async (req, res) => {
  try {
    const pricingData = req.body;

    // Validar que sea un objeto
    if (!pricingData || typeof pricingData !== 'object') {
      return res.status(400).json({
        success: false,
        error: 'Datos de precios inválidos'
      });
    }

    // Validar que todos los valores sean números positivos
    for (const [key, value] of Object.entries(pricingData)) {
      if (typeof value !== 'number' || value < 0) {
        return res.status(400).json({
          success: false,
          error: `El precio de ${key} debe ser un número positivo`
        });
      }
    }

    const updated = await updateTomografia3DPricingBulk(pricingData, req.user.user_id);

    res.json({
      success: true,
      message: 'Precios de Tomografía 3D actualizados exitosamente',
      data: updated
    });
  } catch (error) {
    console.error('Error al actualizar precios de Tomografía 3D:', error);
    res.status(500).json({
      success: false,
      error: 'Error al actualizar precios de Tomografía 3D'
    });
  }
};

/**
 * PUT /api/laboratory/service-prices/radiografias
 * Actualiza múltiples precios de Radiografías (formato legacy)
 * Solo accesible por super_admin
 */
const updateRadiografiasPrices = async (req, res) => {
  try {
    const pricingData = req.body;

    // Validar que sea un objeto
    if (!pricingData || typeof pricingData !== 'object') {
      return res.status(400).json({
        success: false,
        error: 'Datos de precios inválidos'
      });
    }

    // Validar que todos los valores sean números positivos
    for (const [key, value] of Object.entries(pricingData)) {
      if (typeof value !== 'number' || value < 0) {
        return res.status(400).json({
          success: false,
          error: `El precio de ${key} debe ser un número positivo`
        });
      }
    }

    const updated = await updateRadiografiasPricingBulk(pricingData, req.user.user_id);

    res.json({
      success: true,
      message: 'Precios de Radiografías actualizados exitosamente',
      data: updated
    });
  } catch (error) {
    console.error('Error al actualizar precios de Radiografías:', error);
    res.status(500).json({
      success: false,
      error: 'Error al actualizar precios de Radiografías'
    });
  }
};

module.exports = {
  getAllPrices,
  getTomografia3DPrices,
  getRadiografiasPrices,
  getAllPricingCombined,
  getPriceByCode,
  getServiceStats,
  updatePrice,
  updatePriceByServiceCode,
  updateTomografia3DPrices,
  updateRadiografiasPrices
};
