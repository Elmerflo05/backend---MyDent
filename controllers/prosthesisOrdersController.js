const {
  getAllProsthesisOrders,
  getProsthesisOrderById,
  createProsthesisOrder,
  updateProsthesisOrder,
  deleteProsthesisOrder,
  countProsthesisOrders
} = require('../models/prosthesisOrdersModel');
const pool = require('../config/db');

/**
 * Obtiene el dentist_id a partir de un user_id
 * Si el ID proporcionado ya es un dentist_id válido, lo devuelve
 * Si es un user_id, busca el dentist_id correspondiente
 */
const getDentistIdFromUserId = async (providedId) => {
  // Primero verificar si ya existe como dentist_id
  const checkDentist = await pool.query(
    'SELECT dentist_id FROM dentists WHERE dentist_id = $1',
    [providedId]
  );
  if (checkDentist.rows.length > 0) {
    return providedId; // Ya es un dentist_id válido
  }

  // Si no, buscar por user_id
  const result = await pool.query(
    'SELECT dentist_id FROM dentists WHERE user_id = $1',
    [providedId]
  );
  if (result.rows.length > 0) {
    return result.rows[0].dentist_id;
  }

  return null; // No encontrado
};

const getProsthesisOrders = async (req, res) => {
  try {
    const { patient_id, dentist_id, branch_id, prosthesis_type, order_status, page = 1, limit = 20 } = req.query;
    const filters = {
      patient_id: patient_id ? parseInt(patient_id) : null,
      dentist_id: dentist_id ? parseInt(dentist_id) : null,
      branch_id: branch_id ? parseInt(branch_id) : null,
      prosthesis_type,
      order_status,
      limit: parseInt(limit),
      offset: (parseInt(page) - 1) * parseInt(limit)
    };
    const [orders, total] = await Promise.all([getAllProsthesisOrders(filters), countProsthesisOrders(filters)]);
    res.json({ success: true, data: orders, pagination: { total, page: parseInt(page), limit: parseInt(limit), totalPages: Math.ceil(total / parseInt(limit)) } });
  } catch (error) {
    console.error('Error al obtener órdenes:', error);
    res.status(500).json({ success: false, error: 'Error al obtener órdenes' });
  }
};

const getProsthesisOrder = async (req, res) => {
  try {
    const order = await getProsthesisOrderById(parseInt(req.params.id));
    if (!order) return res.status(404).json({ success: false, error: 'Orden no encontrada' });
    res.json({ success: true, data: order });
  } catch (error) {
    console.error('Error al obtener orden:', error);
    res.status(500).json({ success: false, error: 'Error al obtener orden' });
  }
};

const createNewProsthesisOrder = async (req, res) => {
  try {
    if (!req.body.patient_id || !req.body.dentist_id || !req.body.branch_id || !req.body.prosthesis_type) {
      return res.status(400).json({ success: false, error: 'Faltan campos requeridos' });
    }

    // Traducir user_id a dentist_id si es necesario
    const realDentistId = await getDentistIdFromUserId(req.body.dentist_id);
    if (!realDentistId) {
      return res.status(400).json({
        success: false,
        error: 'El usuario especificado no es un dentista registrado'
      });
    }

    // Usar el dentist_id correcto
    const orderData = { ...req.body, dentist_id: realDentistId };
    const newOrder = await createProsthesisOrder(orderData, req.user.user_id);
    res.status(201).json({ success: true, message: 'Orden creada exitosamente', data: newOrder });
  } catch (error) {
    console.error('Error al crear orden:', error);
    res.status(500).json({ success: false, error: 'Error al crear orden' });
  }
};

const updateExistingProsthesisOrder = async (req, res) => {
  try {
    const updated = await updateProsthesisOrder(parseInt(req.params.id), req.body, req.user.user_id);
    if (!updated) return res.status(404).json({ success: false, error: 'Orden no encontrada' });
    res.json({ success: true, message: 'Orden actualizada exitosamente', data: updated });
  } catch (error) {
    console.error('Error al actualizar orden:', error);
    res.status(500).json({ success: false, error: 'Error al actualizar orden' });
  }
};

const deleteExistingProsthesisOrder = async (req, res) => {
  try {
    const deleted = await deleteProsthesisOrder(parseInt(req.params.id), req.user.user_id);
    if (!deleted) return res.status(404).json({ success: false, error: 'Orden no encontrada' });
    res.json({ success: true, message: 'Orden eliminada exitosamente' });
  } catch (error) {
    console.error('Error al eliminar orden:', error);
    res.status(500).json({ success: false, error: 'Error al eliminar orden' });
  }
};

module.exports = {
  getProsthesisOrders,
  getProsthesisOrder,
  createNewProsthesisOrder,
  updateExistingProsthesisOrder,
  deleteExistingProsthesisOrder
};
