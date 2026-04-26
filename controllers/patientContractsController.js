const {
  getAllPatientContracts,
  getPatientContractById,
  createPatientContract,
  updatePatientContract,
  deletePatientContract,
  countPatientContracts,
  assignContractFromTemplate,
  getContractsByPatientId,
  signContract,
  countContractsByPatientId
} = require('../models/patientContractsModel');

const PATIENT_ROLE_ID = 6;

const getPatientContracts = async (req, res) => {
  try {
    const { patient_id, branch_id, contract_type, is_signed, page = 1, limit = 20 } = req.query;
    const isPatient = req.user?.role_id === PATIENT_ROLE_ID;
    const effectivePatientId = isPatient ? req.user?.patient_id : (patient_id ? parseInt(patient_id) : null);
    const filters = {
      patient_id: effectivePatientId,
      branch_id: branch_id ? parseInt(branch_id) : null,
      contract_type,
      is_signed: is_signed !== undefined ? is_signed === 'true' : undefined,
      limit: parseInt(limit),
      offset: (parseInt(page) - 1) * parseInt(limit)
    };
    const [contracts, total] = await Promise.all([getAllPatientContracts(filters), countPatientContracts(filters)]);
    res.json({ success: true, data: contracts, pagination: { total, page: parseInt(page), limit: parseInt(limit), totalPages: Math.ceil(total / parseInt(limit)) } });
  } catch (error) {
    console.error('Error al obtener contratos:', error);
    res.status(500).json({ success: false, error: 'Error al obtener contratos' });
  }
};

const getPatientContract = async (req, res) => {
  try {
    const contract = await getPatientContractById(parseInt(req.params.id));
    if (!contract) return res.status(404).json({ success: false, error: 'Contrato no encontrado' });
    if (req.user?.role_id === PATIENT_ROLE_ID && contract.patient_id !== req.user?.patient_id) {
      return res.status(403).json({ success: false, error: 'Acceso denegado al contrato' });
    }
    res.json({ success: true, data: contract });
  } catch (error) {
    console.error('Error al obtener contrato:', error);
    res.status(500).json({ success: false, error: 'Error al obtener contrato' });
  }
};

const createNewPatientContract = async (req, res) => {
  try {
    if (!req.body.patient_id || !req.body.branch_id || !req.body.start_date) {
      return res.status(400).json({ success: false, error: 'Faltan campos requeridos' });
    }

    // Si se subió un archivo, agregar la URL al body
    const contractData = { ...req.body };
    if (req.file) {
      contractData.contract_file_url = `/uploads/clients_contracts/${req.file.filename}`;
    }

    const newContract = await createPatientContract(contractData, req.user.user_id);
    res.status(201).json({ success: true, message: 'Contrato creado exitosamente', data: newContract });
  } catch (error) {
    console.error('Error al crear contrato:', error);
    res.status(500).json({ success: false, error: 'Error al crear contrato' });
  }
};

const updateExistingPatientContract = async (req, res) => {
  try {
    const updated = await updatePatientContract(parseInt(req.params.id), req.body, req.user.user_id);
    if (!updated) return res.status(404).json({ success: false, error: 'Contrato no encontrado' });
    res.json({ success: true, message: 'Contrato actualizado exitosamente', data: updated });
  } catch (error) {
    console.error('Error al actualizar contrato:', error);
    res.status(500).json({ success: false, error: 'Error al actualizar contrato' });
  }
};

const deleteExistingPatientContract = async (req, res) => {
  try {
    const contractId = parseInt(req.params.id);
    const existing = await getPatientContractById(contractId);
    const deleted = await deletePatientContract(contractId, req.user.user_id);
    if (!deleted) return res.status(404).json({ success: false, error: 'Contrato no encontrado' });

    if (global.io && existing?.patient_id) {
      global.io.to(`patient-${existing.patient_id}`).emit('contract-deleted', {
        patient_contract_id: contractId,
        patient_id: existing.patient_id,
        timestamp: new Date().toISOString()
      });
    }

    res.json({ success: true, message: 'Contrato eliminado exitosamente' });
  } catch (error) {
    console.error('Error al eliminar contrato:', error);
    res.status(500).json({ success: false, error: 'Error al eliminar contrato' });
  }
};

// Asignar contrato a paciente desde una plantilla (con firma inmediata)
const assignContract = async (req, res) => {
  try {
    const {
      patient_id,
      template_id,
      branch_id,
      notes,
      patient_address,
      representative_name,
      representative_dni,
      representative_address,
      signature_data
    } = req.body;

    if (!patient_id || !template_id || !branch_id) {
      return res.status(400).json({
        success: false,
        error: 'Faltan campos requeridos: patient_id, template_id, branch_id'
      });
    }

    if (!patient_address) {
      return res.status(400).json({
        success: false,
        error: 'El domicilio del paciente es requerido para firmar el contrato'
      });
    }

    if (!signature_data) {
      return res.status(400).json({
        success: false,
        error: 'La firma digital es requerida'
      });
    }

    // Procesar archivo subido si existe
    let contractFileUrl = null;
    if (req.file) {
      contractFileUrl = `/uploads/contracts/${req.file.filename}`;
    }

    const newContract = await assignContractFromTemplate(
      {
        patient_id,
        template_id,
        branch_id,
        notes,
        patient_address,
        representative_name,
        representative_dni,
        representative_address,
        signature_data,
        contract_file_url: contractFileUrl
      },
      req.user.user_id
    );

    res.status(201).json({
      success: true,
      message: 'Contrato firmado y asignado exitosamente al paciente',
      data: newContract
    });
  } catch (error) {
    console.error('Error al asignar contrato:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Error al asignar contrato'
    });
  }
};

// Obtener contratos de un paciente específico (para portal de paciente)
const getMyContracts = async (req, res) => {
  try {
    // El paciente solo puede ver sus propios contratos
    const patientId = req.user.patient_id;

    if (!patientId) {
      return res.status(400).json({
        success: false,
        error: 'Usuario no tiene un paciente asociado'
      });
    }

    const { contract_type, page = 1, limit = 20 } = req.query;
    const filters = {
      contract_type,
      limit: parseInt(limit),
      offset: (parseInt(page) - 1) * parseInt(limit)
    };

    const [contracts, total] = await Promise.all([
      getContractsByPatientId(patientId, filters),
      countContractsByPatientId(patientId, filters)
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
    console.error('Error al obtener mis contratos:', error);
    res.status(500).json({ success: false, error: 'Error al obtener contratos' });
  }
};

// Firmar un contrato (para pacientes)
const signMyContract = async (req, res) => {
  try {
    const patientId = req.user.patient_id;
    const contractId = parseInt(req.params.id);

    if (!patientId) {
      return res.status(400).json({
        success: false,
        error: 'Usuario no tiene un paciente asociado'
      });
    }

    const { patient_address, representative_name, representative_dni, representative_address, observations } = req.body;

    if (!patient_address) {
      return res.status(400).json({
        success: false,
        error: 'El domicilio del paciente es requerido'
      });
    }

    const signedContract = await signContract(contractId, patientId, {
      patient_address,
      representative_name,
      representative_dni,
      representative_address,
      observations
    });

    res.json({
      success: true,
      message: 'Contrato firmado exitosamente',
      data: signedContract
    });
  } catch (error) {
    console.error('Error al firmar contrato:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Error al firmar el contrato'
    });
  }
};

module.exports = {
  getPatientContracts,
  getPatientContract,
  createNewPatientContract,
  updateExistingPatientContract,
  deleteExistingPatientContract,
  assignContract,
  getMyContracts,
  signMyContract
};
