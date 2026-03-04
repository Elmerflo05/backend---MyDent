/**
 * Health Plan Dependents Controller
 * Controlador para dependientes del Plan Familiar
 */

const {
  getDependentsBySubscription,
  getDependentById,
  addDependent,
  updateDependent,
  removeDependent,
  countDependents,
  getPatientCoverage,
  getCoveredPatients
} = require('../models/healthPlanDependentsModel');

// ============================================================================
// CRUD BASICO
// ============================================================================

/**
 * Obtener todos los dependientes de una suscripcion
 */
const getDependents = async (req, res) => {
  try {
    const { subscriptionId } = req.params;

    const dependents = await getDependentsBySubscription(parseInt(subscriptionId));
    const count = await countDependents(parseInt(subscriptionId));

    res.json({
      success: true,
      data: dependents,
      total: count
    });
  } catch (error) {
    console.error('Error al obtener dependientes:', error);
    res.status(500).json({
      success: false,
      error: 'Error al obtener dependientes'
    });
  }
};

/**
 * Obtener dependiente por ID
 */
const getDependent = async (req, res) => {
  try {
    const { id } = req.params;

    const dependent = await getDependentById(parseInt(id));

    if (!dependent) {
      return res.status(404).json({
        success: false,
        error: 'Dependiente no encontrado'
      });
    }

    res.json({
      success: true,
      data: dependent
    });
  } catch (error) {
    console.error('Error al obtener dependiente:', error);
    res.status(500).json({
      success: false,
      error: 'Error al obtener dependiente'
    });
  }
};

/**
 * Agregar dependiente a una suscripcion
 */
const createDependent = async (req, res) => {
  try {
    const { subscriptionId } = req.params;
    const data = {
      ...req.body,
      subscription_id: parseInt(subscriptionId),
      user_id_registration: req.user.user_id
    };

    if (!data.patient_id || !data.relationship) {
      return res.status(400).json({
        success: false,
        error: 'Paciente y relacion son requeridos'
      });
    }

    const validRelationships = ['conyuge', 'hijo', 'hija', 'padre', 'madre', 'otro'];
    if (!validRelationships.includes(data.relationship)) {
      return res.status(400).json({
        success: false,
        error: `Relacion invalida. Valores permitidos: ${validRelationships.join(', ')}`
      });
    }

    const newDependent = await addDependent(data);

    res.status(201).json({
      success: true,
      message: 'Dependiente agregado exitosamente',
      data: newDependent
    });
  } catch (error) {
    console.error('Error al agregar dependiente:', error);

    if (error.message.includes('Solo el Plan Familiar')) {
      return res.status(400).json({
        success: false,
        error: error.message
      });
    }

    if (error.message.includes('titular') || error.message.includes('ya es dependiente')) {
      return res.status(400).json({
        success: false,
        error: error.message
      });
    }

    res.status(500).json({
      success: false,
      error: 'Error al agregar dependiente'
    });
  }
};

/**
 * Actualizar dependiente
 */
const modifyDependent = async (req, res) => {
  try {
    const { id } = req.params;
    const data = {
      ...req.body,
      user_id_modification: req.user.user_id
    };

    const updatedDependent = await updateDependent(parseInt(id), data);

    if (!updatedDependent) {
      return res.status(404).json({
        success: false,
        error: 'Dependiente no encontrado'
      });
    }

    res.json({
      success: true,
      message: 'Dependiente actualizado exitosamente',
      data: updatedDependent
    });
  } catch (error) {
    console.error('Error al actualizar dependiente:', error);
    res.status(500).json({
      success: false,
      error: 'Error al actualizar dependiente'
    });
  }
};

/**
 * Eliminar dependiente
 */
const deleteDependent = async (req, res) => {
  try {
    const { id } = req.params;

    const deleted = await removeDependent(parseInt(id), req.user.user_id);

    if (!deleted) {
      return res.status(404).json({
        success: false,
        error: 'Dependiente no encontrado'
      });
    }

    res.json({
      success: true,
      message: 'Dependiente eliminado exitosamente'
    });
  } catch (error) {
    console.error('Error al eliminar dependiente:', error);
    res.status(500).json({
      success: false,
      error: 'Error al eliminar dependiente'
    });
  }
};

// ============================================================================
// VERIFICACION DE COBERTURA
// ============================================================================

/**
 * Verificar cobertura de un paciente
 * Retorna si tiene plan activo (como titular o dependiente)
 */
const checkPatientCoverage = async (req, res) => {
  try {
    const { patientId } = req.params;

    const coverage = await getPatientCoverage(parseInt(patientId));

    if (!coverage) {
      return res.json({
        success: true,
        has_coverage: false,
        data: null,
        message: 'El paciente no tiene cobertura de plan de salud activa'
      });
    }

    res.json({
      success: true,
      has_coverage: true,
      data: coverage,
      message: `Paciente cubierto como ${coverage.coverage_type} del ${coverage.plan_name}`
    });
  } catch (error) {
    console.error('Error al verificar cobertura:', error);
    res.status(500).json({
      success: false,
      error: 'Error al verificar cobertura'
    });
  }
};

/**
 * Obtener todos los pacientes cubiertos por una suscripcion
 */
const getCoveredPatientsList = async (req, res) => {
  try {
    const { subscriptionId } = req.params;

    const patients = await getCoveredPatients(parseInt(subscriptionId));

    res.json({
      success: true,
      data: patients,
      total: patients.length
    });
  } catch (error) {
    console.error('Error al obtener pacientes cubiertos:', error);
    res.status(500).json({
      success: false,
      error: 'Error al obtener pacientes cubiertos'
    });
  }
};

module.exports = {
  getDependents,
  getDependent,
  createDependent,
  modifyDependent,
  deleteDependent,
  checkPatientCoverage,
  getCoveredPatientsList
};
