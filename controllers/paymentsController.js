const {
  getAllPayments,
  getPaymentById,
  createPayment,
  updatePayment,
  deletePayment,
  countPayments,
  addPaymentVoucher,
  deletePaymentVoucher
} = require('../models/paymentsModel');
const { createPaymentItems, getPaymentItems } = require('../models/paymentItemsModel');

const getPayments = async (req, res) => {
  try {
    const {
      patient_id,
      branch_id,
      payment_method_id,
      date_from,
      date_to,
      page = 1,
      limit = 20
    } = req.query;

    const filters = {
      patient_id: patient_id ? parseInt(patient_id) : null,
      branch_id: branch_id ? parseInt(branch_id) : null,
      payment_method_id: payment_method_id ? parseInt(payment_method_id) : null,
      date_from: date_from || null,
      date_to: date_to || null,
      limit: parseInt(limit),
      offset: (parseInt(page) - 1) * parseInt(limit)
    };

    const [payments, total] = await Promise.all([
      getAllPayments(filters),
      countPayments(filters)
    ]);

    res.json({
      success: true,
      data: payments,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Error al obtener pagos:', error);
    res.status(500).json({
      success: false,
      error: 'Error al obtener pagos'
    });
  }
};

const getPayment = async (req, res) => {
  try {
    const { id } = req.params;
    const paymentId = parseInt(id);
    const [payment, items] = await Promise.all([
      getPaymentById(paymentId),
      getPaymentItems(paymentId)
    ]);

    if (!payment) {
      return res.status(404).json({
        success: false,
        error: 'Pago no encontrado'
      });
    }

    res.json({
      success: true,
      data: { ...payment, items }
    });
  } catch (error) {
    console.error('Error al obtener pago:', error);
    res.status(500).json({
      success: false,
      error: 'Error al obtener pago'
    });
  }
};

const createNewPayment = async (req, res) => {
  try {
    const { items, ...rest } = req.body;
    const paymentData = {
      ...rest,
      user_id_registration: req.user.user_id
    };

    // Si vienen items, calcular el monto automáticamente
    if (items && items.length > 0) {
      const calculatedAmount = items.reduce((sum, item) => {
        return sum + (parseFloat(item.unit_price) || 0) * (parseInt(item.quantity) || 1);
      }, 0);
      paymentData.amount = calculatedAmount;
    }

    if (!paymentData.patient_id || !paymentData.branch_id ||
        !paymentData.payment_method_id || !paymentData.payment_date ||
        !paymentData.amount) {
      return res.status(400).json({
        success: false,
        error: 'Faltan campos requeridos'
      });
    }

    const newPayment = await createPayment(paymentData);

    // Crear items del pago si vienen
    let paymentItems = [];
    if (items && items.length > 0) {
      paymentItems = await createPaymentItems(
        newPayment.payment_id,
        items,
        req.user.user_id
      );
    }

    res.status(201).json({
      success: true,
      message: 'Pago registrado exitosamente',
      data: { ...newPayment, items: paymentItems }
    });
  } catch (error) {
    console.error('Error al crear pago:', error);
    res.status(500).json({
      success: false,
      error: 'Error al crear pago'
    });
  }
};

const updateExistingPayment = async (req, res) => {
  try {
    const { id } = req.params;
    const paymentData = {
      ...req.body,
      user_id_modification: req.user.user_id
    };

    const updatedPayment = await updatePayment(parseInt(id), paymentData);

    if (!updatedPayment) {
      return res.status(404).json({
        success: false,
        error: 'Pago no encontrado'
      });
    }

    res.json({
      success: true,
      message: 'Pago actualizado exitosamente',
      data: updatedPayment
    });
  } catch (error) {
    console.error('Error al actualizar pago:', error);
    res.status(500).json({
      success: false,
      error: 'Error al actualizar pago'
    });
  }
};

const deleteExistingPayment = async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await deletePayment(parseInt(id), req.user.user_id);

    if (!deleted) {
      return res.status(404).json({
        success: false,
        error: 'Pago no encontrado'
      });
    }

    res.json({
      success: true,
      message: 'Pago eliminado exitosamente'
    });
  } catch (error) {
    console.error('Error al eliminar pago:', error);
    res.status(500).json({
      success: false,
      error: 'Error al eliminar pago'
    });
  }
};

const addVoucherToPayment = async (req, res) => {
  try {
    const { id } = req.params;
    const voucherData = {
      ...req.body,
      payment_id: parseInt(id)
    };

    if (!voucherData.voucher_date) {
      return res.status(400).json({
        success: false,
        error: 'La fecha del comprobante es requerida'
      });
    }

    const newVoucher = await addPaymentVoucher(voucherData, req.user.user_id);

    res.status(201).json({
      success: true,
      message: 'Comprobante agregado exitosamente',
      data: newVoucher
    });
  } catch (error) {
    console.error('Error al agregar comprobante:', error);
    res.status(500).json({
      success: false,
      error: 'Error al agregar comprobante'
    });
  }
};

const removeVoucherFromPayment = async (req, res) => {
  try {
    const { voucherId } = req.params;
    const deleted = await deletePaymentVoucher(parseInt(voucherId), req.user.user_id);

    if (!deleted) {
      return res.status(404).json({
        success: false,
        error: 'Comprobante no encontrado'
      });
    }

    res.json({
      success: true,
      message: 'Comprobante eliminado exitosamente'
    });
  } catch (error) {
    console.error('Error al eliminar comprobante:', error);
    res.status(500).json({
      success: false,
      error: 'Error al eliminar comprobante'
    });
  }
};

module.exports = {
  getPayments,
  getPayment,
  createNewPayment,
  updateExistingPayment,
  deleteExistingPayment,
  addVoucherToPayment,
  removeVoucherFromPayment
};
