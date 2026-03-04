/**
 * Controlador para gestión de precios de servicios de laboratorio
 *
 * Endpoints:
 * - GET /laboratory/pricing - Obtener todos los precios
 * - GET /laboratory/pricing/tomografia3d - Obtener precios de Tomografía 3D
 * - PUT /laboratory/pricing/tomografia3d - Actualizar precios de Tomografía 3D
 * - GET /laboratory/pricing/radiografias - Obtener precios de Radiografías
 * - PUT /laboratory/pricing/radiografias - Actualizar precios de Radiografías
 */

const {
  getTomografia3DPricing,
  updateTomografia3DPricing,
  getRadiografiasPricing,
  updateRadiografiasPricing,
  getAllPricing
} = require('../models/laboratoryPricingModel');

/**
 * GET /laboratory/pricing
 * Obtener todos los precios (Tomografía 3D + Radiografías)
 */
const getAllPrices = async (req, res) => {
  try {
    const pricing = await getAllPricing();

    res.json({
      success: true,
      data: pricing
    });
  } catch (error) {
    console.error('Error al obtener precios de laboratorio:', error);
    res.status(500).json({
      success: false,
      error: 'Error al obtener precios de laboratorio',
      details: error.message
    });
  }
};

/**
 * GET /laboratory/pricing/tomografia3d
 * Obtener precios de Tomografía 3D
 */
const getTomografia3DPrices = async (req, res) => {
  try {
    const pricing = await getTomografia3DPricing();

    res.json({
      success: true,
      data: pricing
    });
  } catch (error) {
    console.error('Error al obtener precios de Tomografía 3D:', error);
    res.status(500).json({
      success: false,
      error: 'Error al obtener precios de Tomografía 3D',
      details: error.message
    });
  }
};

/**
 * PUT /laboratory/pricing/tomografia3d
 * Actualizar precios de Tomografía 3D
 */
const updateTomografia3DPrices = async (req, res) => {
  try {
    const pricingData = req.body;

    // Validación básica: verificar que sea un objeto
    if (!pricingData || typeof pricingData !== 'object') {
      return res.status(400).json({
        success: false,
        error: 'Los datos de precios son requeridos'
      });
    }

    // Validación: todos los valores deben ser números positivos
    for (const [key, value] of Object.entries(pricingData)) {
      if (typeof value !== 'number' || value < 0) {
        return res.status(400).json({
          success: false,
          error: `El campo ${key} debe ser un número positivo`
        });
      }
    }

    const userId = req.user?.user_id || null;
    const updatedPricing = await updateTomografia3DPricing(pricingData, userId);

    res.json({
      success: true,
      message: 'Precios de Tomografía 3D actualizados exitosamente',
      data: updatedPricing.pricing_data
    });
  } catch (error) {
    console.error('Error al actualizar precios de Tomografía 3D:', error);
    res.status(500).json({
      success: false,
      error: 'Error al actualizar precios de Tomografía 3D',
      details: error.message
    });
  }
};

/**
 * GET /laboratory/pricing/radiografias
 * Obtener precios de Radiografías
 */
const getRadiografiasPrices = async (req, res) => {
  try {
    const pricing = await getRadiografiasPricing();

    res.json({
      success: true,
      data: pricing
    });
  } catch (error) {
    console.error('Error al obtener precios de Radiografías:', error);
    res.status(500).json({
      success: false,
      error: 'Error al obtener precios de Radiografías',
      details: error.message
    });
  }
};

/**
 * PUT /laboratory/pricing/radiografias
 * Actualizar precios de Radiografías
 */
const updateRadiografiasPrices = async (req, res) => {
  try {
    const pricingData = req.body;

    // Validación básica: verificar que sea un objeto
    if (!pricingData || typeof pricingData !== 'object') {
      return res.status(400).json({
        success: false,
        error: 'Los datos de precios son requeridos'
      });
    }

    // Validación: todos los valores deben ser números positivos
    for (const [key, value] of Object.entries(pricingData)) {
      if (typeof value !== 'number' || value < 0) {
        return res.status(400).json({
          success: false,
          error: `El campo ${key} debe ser un número positivo`
        });
      }
    }

    const userId = req.user?.user_id || null;
    const updatedPricing = await updateRadiografiasPricing(pricingData, userId);

    res.json({
      success: true,
      message: 'Precios de Radiografías actualizados exitosamente',
      data: updatedPricing.pricing_data
    });
  } catch (error) {
    console.error('Error al actualizar precios de Radiografías:', error);
    res.status(500).json({
      success: false,
      error: 'Error al actualizar precios de Radiografías',
      details: error.message
    });
  }
};

module.exports = {
  getAllPrices,
  getTomografia3DPrices,
  updateTomografia3DPrices,
  getRadiografiasPrices,
  updateRadiografiasPrices
};
