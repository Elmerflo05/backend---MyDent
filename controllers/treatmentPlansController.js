const {
  getAllTreatmentPlans,
  getTreatmentPlanById,
  createTreatmentPlan,
  updateTreatmentPlan,
  approveTreatmentPlan,
  deleteTreatmentPlan,
  countTreatmentPlans,
  addProcedure,
  updateProcedure,
  deleteProcedure
} = require('../models/treatmentPlansModel');

const getTreatmentPlans = async (req, res) => {
  try {
    const {
      patient_id,
      dentist_id,
      branch_id,
      treatment_plan_status_id,
      approved_by_patient,
      page = 1,
      limit = 20
    } = req.query;

    const filters = {
      patient_id: patient_id ? parseInt(patient_id) : null,
      dentist_id: dentist_id ? parseInt(dentist_id) : null,
      branch_id: branch_id ? parseInt(branch_id) : null,
      treatment_plan_status_id: treatment_plan_status_id ? parseInt(treatment_plan_status_id) : null,
      approved_by_patient: approved_by_patient !== undefined ? approved_by_patient === 'true' : undefined,
      limit: parseInt(limit),
      offset: (parseInt(page) - 1) * parseInt(limit)
    };

    const [plans, total] = await Promise.all([
      getAllTreatmentPlans(filters),
      countTreatmentPlans(filters)
    ]);

    res.json({
      success: true,
      data: plans,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Error al obtener planes de tratamiento:', error);
    res.status(500).json({
      success: false,
      error: 'Error al obtener planes de tratamiento'
    });
  }
};

const getTreatmentPlan = async (req, res) => {
  try {
    const { id } = req.params;
    const plan = await getTreatmentPlanById(parseInt(id));

    if (!plan) {
      return res.status(404).json({
        success: false,
        error: 'Plan de tratamiento no encontrado'
      });
    }

    res.json({
      success: true,
      data: plan
    });
  } catch (error) {
    console.error('Error al obtener plan de tratamiento:', error);
    res.status(500).json({
      success: false,
      error: 'Error al obtener plan de tratamiento'
    });
  }
};

const createNewTreatmentPlan = async (req, res) => {
  try {
    const { procedures, ...planData } = req.body;

    planData.user_id_registration = req.user.user_id;

    if (!planData.patient_id || !planData.dentist_id ||
        !planData.branch_id || !planData.treatment_plan_status_id ||
        !planData.plan_name || !planData.plan_date) {
      return res.status(400).json({
        success: false,
        error: 'Faltan campos requeridos'
      });
    }

    const newPlan = await createTreatmentPlan(planData, procedures || []);

    res.status(201).json({
      success: true,
      message: 'Plan de tratamiento creado exitosamente',
      data: newPlan
    });
  } catch (error) {
    console.error('Error al crear plan de tratamiento:', error);
    res.status(500).json({
      success: false,
      error: 'Error al crear plan de tratamiento'
    });
  }
};

const updateExistingTreatmentPlan = async (req, res) => {
  try {
    const { id } = req.params;
    const planData = {
      ...req.body,
      user_id_modification: req.user.user_id
    };

    delete planData.procedures;

    const updatedPlan = await updateTreatmentPlan(parseInt(id), planData);

    if (!updatedPlan) {
      return res.status(404).json({
        success: false,
        error: 'Plan de tratamiento no encontrado'
      });
    }

    res.json({
      success: true,
      message: 'Plan de tratamiento actualizado exitosamente',
      data: updatedPlan
    });
  } catch (error) {
    console.error('Error al actualizar plan de tratamiento:', error);
    res.status(500).json({
      success: false,
      error: 'Error al actualizar plan de tratamiento'
    });
  }
};

const approveExistingTreatmentPlan = async (req, res) => {
  try {
    const { id } = req.params;
    const approvedPlan = await approveTreatmentPlan(parseInt(id), req.user.user_id);

    if (!approvedPlan) {
      return res.status(404).json({
        success: false,
        error: 'Plan de tratamiento no encontrado'
      });
    }

    res.json({
      success: true,
      message: 'Plan de tratamiento aprobado exitosamente',
      data: approvedPlan
    });
  } catch (error) {
    console.error('Error al aprobar plan de tratamiento:', error);
    res.status(500).json({
      success: false,
      error: 'Error al aprobar plan de tratamiento'
    });
  }
};

const deleteExistingTreatmentPlan = async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await deleteTreatmentPlan(parseInt(id), req.user.user_id);

    if (!deleted) {
      return res.status(404).json({
        success: false,
        error: 'Plan de tratamiento no encontrado'
      });
    }

    res.json({
      success: true,
      message: 'Plan de tratamiento eliminado exitosamente'
    });
  } catch (error) {
    console.error('Error al eliminar plan de tratamiento:', error);
    res.status(500).json({
      success: false,
      error: 'Error al eliminar plan de tratamiento'
    });
  }
};

// Procedimientos del plan
const addProcedureToPlan = async (req, res) => {
  try {
    const { id } = req.params;
    const procedureData = {
      ...req.body,
      treatment_plan_id: parseInt(id)
    };

    if (!procedureData.dental_procedure_id) {
      return res.status(400).json({
        success: false,
        error: 'El procedimiento dental es requerido'
      });
    }

    const newProcedure = await addProcedure(procedureData, req.user.user_id);

    res.status(201).json({
      success: true,
      message: 'Procedimiento agregado exitosamente',
      data: newProcedure
    });
  } catch (error) {
    console.error('Error al agregar procedimiento:', error);
    res.status(500).json({
      success: false,
      error: 'Error al agregar procedimiento'
    });
  }
};

const updatePlanProcedure = async (req, res) => {
  try {
    const { procedureId } = req.params;
    const updatedProcedure = await updateProcedure(parseInt(procedureId), req.body, req.user.user_id);

    if (!updatedProcedure) {
      return res.status(404).json({
        success: false,
        error: 'Procedimiento no encontrado'
      });
    }

    res.json({
      success: true,
      message: 'Procedimiento actualizado exitosamente',
      data: updatedProcedure
    });
  } catch (error) {
    console.error('Error al actualizar procedimiento:', error);
    res.status(500).json({
      success: false,
      error: 'Error al actualizar procedimiento'
    });
  }
};

const removeProcedureFromPlan = async (req, res) => {
  try {
    const { procedureId } = req.params;
    const deleted = await deleteProcedure(parseInt(procedureId), req.user.user_id);

    if (!deleted) {
      return res.status(404).json({
        success: false,
        error: 'Procedimiento no encontrado'
      });
    }

    res.json({
      success: true,
      message: 'Procedimiento eliminado exitosamente'
    });
  } catch (error) {
    console.error('Error al eliminar procedimiento:', error);
    res.status(500).json({
      success: false,
      error: 'Error al eliminar procedimiento'
    });
  }
};

module.exports = {
  getTreatmentPlans,
  getTreatmentPlan,
  createNewTreatmentPlan,
  updateExistingTreatmentPlan,
  approveExistingTreatmentPlan,
  deleteExistingTreatmentPlan,
  addProcedureToPlan,
  updatePlanProcedure,
  removeProcedureFromPlan
};
