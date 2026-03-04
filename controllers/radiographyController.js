const { formatDateYMD } = require('../utils/dateUtils');
const {
  getAllRadiographyRequests,
  getRadiographyRequestById,
  createRadiographyRequest,
  updateRadiographyRequest,
  deleteRadiographyRequest,
  countRadiographyRequests,
  upsertRadiographyRequest
} = require('../models/radiographyModel');

const {
  createMultipleRadiographyResults,
  getResultsByRadiographyRequestId,
  countResultsByType
} = require('../models/radiographyResultModel');

const { createProcedureIncome } = require('../models/procedureIncomeModel');
const {
  createExternalPayment,
  getPaymentByRadiographyRequestId,
  registerPayment: registerExternalPayment,
  updatePrice: updateExternalPrice,
  getAllPayments: getAllExternalPayments
} = require('../models/laboratoryExternalPaymentModel');

const pool = require('../config/db');
const path = require('path');

/**
 * Middleware para determinar el source de una solicitud de radiografía
 * Consulta la BD para verificar si el creador es external_client (role_id=8)
 * Establece req.uploadSource = 'external' o 'internal'
 */
const determineUploadSource = async (req, res, next) => {
  try {
    const { id } = req.params;
    const requestId = parseInt(id);

    if (!requestId || isNaN(requestId)) {
      return res.status(400).json({
        success: false,
        error: 'ID de solicitud inválido'
      });
    }

    // Consultar la BD para obtener el role_id del creador de la solicitud
    const query = `
      SELECT rr.radiography_request_id, u.role_id as creator_role_id
      FROM radiography_requests rr
      LEFT JOIN users u ON rr.user_id_registration = u.user_id
      WHERE rr.radiography_request_id = $1 AND rr.status = 'active'
    `;

    const result = await pool.query(query, [requestId]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Solicitud de radiografía no encontrada'
      });
    }

    // Determinar el source basado en el role_id del creador
    // role_id = 7 es external_client (Cliente Externo)
    const creatorRoleId = result.rows[0].creator_role_id;
    req.uploadSource = creatorRoleId === 7 ? 'external' : 'internal';

    console.log(`[Upload] Solicitud #${requestId} - Source: ${req.uploadSource} (creador role_id: ${creatorRoleId})`);

    next();
  } catch (error) {
    console.error('Error al determinar source de upload:', error);
    return res.status(500).json({
      success: false,
      error: 'Error al procesar la solicitud'
    });
  }
};

const getRadiographyRequests = async (req, res) => {
  try {
    const {
      patient_id,
      dentist_id,
      branch_id,
      consultation_id,
      radiography_type,
      request_status,
      urgency,
      date_from,
      date_to,
      source, // 'internal' | 'external' - Filtrar por origen de la solicitud
      page = 1,
      limit = 20
    } = req.query;

    // FILTRO AUTOMÁTICO: external_client solo ve sus propias solicitudes
    let effectiveDentistId = dentist_id ? parseInt(dentist_id) : null;

    if (req.user.role_id === 7) { // external_client
      // Forzar filtro por su propio dentist_id
      effectiveDentistId = req.user.dentist_id;

      if (!effectiveDentistId) {
        return res.status(403).json({
          success: false,
          error: 'Usuario external_client sin dentist_id asignado. Contacte al administrador.'
        });
      }
    }

    const filters = {
      patient_id: patient_id ? parseInt(patient_id) : null,
      dentist_id: effectiveDentistId,
      branch_id: branch_id ? parseInt(branch_id) : null,
      consultation_id: consultation_id ? parseInt(consultation_id) : null,
      radiography_type,
      request_status,
      urgency,
      date_from,
      date_to,
      source, // Pasar filtro de origen al modelo
      limit: parseInt(limit),
      offset: (parseInt(page) - 1) * parseInt(limit)
    };

    const [requests, total] = await Promise.all([
      getAllRadiographyRequests(filters),
      countRadiographyRequests(filters)
    ]);

    res.json({
      success: true,
      data: requests,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Error al obtener solicitudes de radiografía:', error);
    res.status(500).json({
      success: false,
      error: 'Error al obtener solicitudes de radiografía'
    });
  }
};

const getRadiographyRequest = async (req, res) => {
  try {
    const { id } = req.params;
    const request = await getRadiographyRequestById(parseInt(id));

    if (!request) {
      return res.status(404).json({
        success: false,
        error: 'Solicitud de radiografía no encontrada'
      });
    }

    res.json({
      success: true,
      data: request
    });
  } catch (error) {
    console.error('Error al obtener solicitud de radiografía:', error);
    res.status(500).json({
      success: false,
      error: 'Error al obtener solicitud de radiografía'
    });
  }
};

const createNewRadiographyRequest = async (req, res) => {
  try {
    const requestData = {
      ...req.body,
      user_id_registration: req.user.user_id
    };

    // Si tiene request_data (solicitud PanoCef), los IDs son opcionales
    const hasPanoCefData = requestData.request_data !== undefined;

    if (!hasPanoCefData) {
      // Validación tradicional: requiere IDs
      if (!requestData.patient_id || !requestData.dentist_id ||
          !requestData.branch_id || !requestData.request_date ||
          !requestData.radiography_type) {
        return res.status(400).json({
          success: false,
          error: 'Faltan campos requeridos'
        });
      }
    } else {
      // Validación PanoCef: solo requiere request_date y radiography_type
      if (!requestData.request_date || !requestData.radiography_type) {
        return res.status(400).json({
          success: false,
          error: 'Faltan campos requeridos (request_date, radiography_type)'
        });
      }
      // Usar valores por defecto para IDs si no se proporcionan
      // El user que hace la solicitud será el dentist por defecto
      if (!requestData.dentist_id) {
        requestData.dentist_id = req.user.dentist_id || null;
      }
      if (!requestData.branch_id) {
        // Clientes externos (role_id=8) no tienen sede asignada inicialmente
        // Se asignará cuando el técnico establezca el precio
        if (req.user.role_id === 7) {
          requestData.branch_id = null;
        } else {
          requestData.branch_id = req.user.branch_id || 1; // Sede del usuario o principal
        }
      }
      if (!requestData.patient_id) {
        requestData.patient_id = null; // Paciente se identificará por DNI en request_data
      }
    }

    const newRequest = await createRadiographyRequest(requestData);

    res.status(201).json({
      success: true,
      message: 'Solicitud de radiografía creada exitosamente',
      data: newRequest
    });
  } catch (error) {
    console.error('Error al crear solicitud de radiografía:', error);
    res.status(500).json({
      success: false,
      error: 'Error al crear solicitud de radiografía'
    });
  }
};

const updateExistingRadiographyRequest = async (req, res) => {
  try {
    const { id } = req.params;
    const requestData = {
      ...req.body,
      user_id_modification: req.user.user_id
    };

    const updatedRequest = await updateRadiographyRequest(parseInt(id), requestData);

    if (!updatedRequest) {
      return res.status(404).json({
        success: false,
        error: 'Solicitud de radiografía no encontrada'
      });
    }

    res.json({
      success: true,
      message: 'Solicitud de radiografía actualizada exitosamente',
      data: updatedRequest
    });
  } catch (error) {
    console.error('Error al actualizar solicitud de radiografía:', error);
    res.status(500).json({
      success: false,
      error: 'Error al actualizar solicitud de radiografía'
    });
  }
};

const deleteExistingRadiographyRequest = async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await deleteRadiographyRequest(parseInt(id), req.user.user_id);

    if (!deleted) {
      return res.status(404).json({
        success: false,
        error: 'Solicitud de radiografía no encontrada'
      });
    }

    res.json({
      success: true,
      message: 'Solicitud de radiografía eliminada exitosamente'
    });
  } catch (error) {
    console.error('Error al eliminar solicitud de radiografía:', error);
    res.status(500).json({
      success: false,
      error: 'Error al eliminar solicitud de radiografía'
    });
  }
};

/**
 * Notifica a los técnicos de laboratorio sobre una nueva solicitud
 */
const notifyLaboratoryTechnicians = async (requestId, branchId, creatorUserId) => {
  try {
    // Buscar técnicos de imagen (role_id = 5: imaging_technician)
    const techniciansQuery = `
      SELECT u.user_id, u.first_name, u.last_name
      FROM users u
      WHERE u.role_id = 5
        AND u.status = 'active'
        AND (u.branch_id = $1 OR u.branch_id IS NULL)
    `;

    const technicians = await pool.query(techniciansQuery, [branchId]);

    if (technicians.rows.length === 0) {
      console.log('No hay técnicos de laboratorio para notificar');
      return;
    }

    // Crear notificación para cada técnico
    for (const tech of technicians.rows) {
      const notificationQuery = `
        INSERT INTO notifications (
          user_id,
          notification_type,
          title,
          message,
          related_id,
          related_type,
          status,
          priority,
          user_id_registration
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      `;

      await pool.query(notificationQuery, [
        tech.user_id,
        'new_radiography_request',
        'Nueva solicitud de exámenes',
        'Se ha recibido una nueva solicitud de radiografías/tomografías',
        requestId,
        'radiography_request',
        'unread',
        'normal',
        creatorUserId
      ]);
    }

    console.log(`Notificaciones enviadas a ${technicians.rows.length} técnico(s)`);
  } catch (error) {
    console.error('Error al notificar técnicos:', error);
    // No lanzar error para no afectar la solicitud principal
  }
};

/**
 * Upsert de solicitud de radiografía
 * Si existe una con el mismo consultation_id, la actualiza.
 * Si no existe, crea una nueva y notifica a los técnicos.
 */
const upsertRadiographyRequestHandler = async (req, res) => {
  try {
    console.log('[upsertRadiographyRequest] Recibiendo solicitud de radiografía...');
    console.log('[upsertRadiographyRequest] Usuario:', req.user?.user_id, 'Rol:', req.user?.role_id);

    const requestData = {
      ...req.body,
      user_id_registration: req.user.user_id
    };

    // Validación mínima
    if (!requestData.radiography_type) {
      requestData.radiography_type = 'diagnostic_plan';
    }

    if (!requestData.request_date) {
      requestData.request_date = formatDateYMD();
    }

    // Usar dentist_id del usuario actual si no se proporciona
    if (!requestData.dentist_id) {
      requestData.dentist_id = req.user.dentist_id || null;
    }

    // Usar branch_id del usuario actual si no se proporciona
    if (!requestData.branch_id) {
      // Clientes externos (role_id=8) no tienen sede asignada inicialmente
      // Se asignará cuando el técnico establezca el precio
      if (req.user.role_id === 7) {
        requestData.branch_id = null;
      } else {
        requestData.branch_id = req.user.branch_id || 1;
      }
    }

    console.log('[upsertRadiographyRequest] Ejecutando upsert con datos:', {
      patient_id: requestData.patient_id,
      dentist_id: requestData.dentist_id,
      consultation_id: requestData.consultation_id,
      appointment_id: requestData.appointment_id,
      radiography_type: requestData.radiography_type
    });

    const result = await upsertRadiographyRequest(requestData);

    console.log('[upsertRadiographyRequest] Resultado:', {
      id: result.radiography_request_id,
      wasUpdated: result.wasUpdated
    });

    // Si es nueva solicitud, notificar a técnicos
    if (!result.wasUpdated) {
      await notifyLaboratoryTechnicians(
        result.radiography_request_id,
        result.branch_id,
        req.user.user_id
      );
    }

    const statusCode = result.wasUpdated ? 200 : 201;
    const message = result.wasUpdated
      ? 'Solicitud de exámenes actualizada exitosamente'
      : 'Solicitud de exámenes creada exitosamente';

    res.status(statusCode).json({
      success: true,
      message,
      data: result,
      wasUpdated: result.wasUpdated
    });
  } catch (error) {
    console.error('Error en upsert de solicitud de radiografía:', error);
    res.status(500).json({
      success: false,
      error: 'Error al procesar solicitud de exámenes'
    });
  }
};

/**
 * Aprobar cotización de precio (para external_client)
 */
const approvePricingHandler = async (req, res) => {
  try {
    const { id } = req.params;
    const requestId = parseInt(id);

    // Obtener la solicitud
    const request = await getRadiographyRequestById(requestId);

    if (!request) {
      return res.status(404).json({
        success: false,
        error: 'Solicitud de radiografía no encontrada'
      });
    }

    // Verificar permisos: external_client solo puede aprobar sus propias solicitudes
    if (req.user.role_id === 7) {
      if (request.dentist_id !== req.user.dentist_id) {
        return res.status(403).json({
          success: false,
          error: 'No tiene permiso para aprobar esta cotización'
        });
      }
    }

    // Verificar que existe pricing_data y está en estado correcto
    const pricingData = request.pricing_data || {};
    if (pricingData.status !== 'sent_to_client') {
      return res.status(400).json({
        success: false,
        error: 'Esta cotización no está pendiente de aprobación'
      });
    }

    // Actualizar pricing_data
    const updatedPricingData = {
      ...pricingData,
      status: 'approved',
      approvedBy: req.user.user_id,
      approvedAt: new Date().toISOString()
    };

    const updated = await updateRadiographyRequest(requestId, {
      pricing_data: updatedPricingData,
      user_id_modification: req.user.user_id
    });

    res.json({
      success: true,
      message: 'Cotización aprobada exitosamente',
      data: updated
    });
  } catch (error) {
    console.error('Error al aprobar cotización:', error);
    res.status(500).json({
      success: false,
      error: 'Error al aprobar cotización'
    });
  }
};

/**
 * Rechazar cotización de precio (para external_client)
 */
const rejectPricingHandler = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    const requestId = parseInt(id);

    // Obtener la solicitud
    const request = await getRadiographyRequestById(requestId);

    if (!request) {
      return res.status(404).json({
        success: false,
        error: 'Solicitud de radiografía no encontrada'
      });
    }

    // Verificar permisos: external_client solo puede rechazar sus propias solicitudes
    if (req.user.role_id === 7) {
      if (request.dentist_id !== req.user.dentist_id) {
        return res.status(403).json({
          success: false,
          error: 'No tiene permiso para rechazar esta cotización'
        });
      }
    }

    // Verificar que existe pricing_data y está en estado correcto
    const pricingData = request.pricing_data || {};
    if (pricingData.status !== 'sent_to_client') {
      return res.status(400).json({
        success: false,
        error: 'Esta cotización no está pendiente de aprobación'
      });
    }

    // Actualizar pricing_data
    const updatedPricingData = {
      ...pricingData,
      status: 'rejected',
      rejectedBy: req.user.user_id,
      rejectedAt: new Date().toISOString(),
      rejectionReason: reason || 'No especificado'
    };

    const updated = await updateRadiographyRequest(requestId, {
      pricing_data: updatedPricingData,
      user_id_modification: req.user.user_id
    });

    res.json({
      success: true,
      message: 'Cotización rechazada',
      data: updated
    });
  } catch (error) {
    console.error('Error al rechazar cotización:', error);
    res.status(500).json({
      success: false,
      error: 'Error al rechazar cotización'
    });
  }
};

/**
 * Registrar contraoferta de precio (para imaging_technician)
 * POST /api/radiography/:id/counter-offer
 * Solo se permite una contraoferta por solicitud
 */
const counterOfferHandler = async (req, res) => {
  try {
    const { id } = req.params;
    const { counterOfferPrice } = req.body;
    const requestId = parseInt(id);

    // Validar precio
    if (!counterOfferPrice || counterOfferPrice <= 0) {
      return res.status(400).json({
        success: false,
        error: 'El precio de contraoferta debe ser mayor a 0'
      });
    }

    // Verificar que el usuario es técnico de imagen (role_id = 5)
    if (req.user.role_id !== 5 && req.user.role_id !== 1) {
      return res.status(403).json({
        success: false,
        error: 'Solo el técnico de imagen puede enviar contraoferta'
      });
    }

    // Obtener la solicitud
    const request = await getRadiographyRequestById(requestId);

    if (!request) {
      return res.status(404).json({
        success: false,
        error: 'Solicitud de radiografía no encontrada'
      });
    }

    // Verificar que no exista ya una contraoferta
    const pricingData = request.pricing_data || {};
    if (pricingData.counterOffer) {
      return res.status(400).json({
        success: false,
        error: 'Ya existe una contraoferta para esta solicitud. No se puede modificar.'
      });
    }

    // Obtener nombre del técnico
    const technicianQuery = `
      SELECT first_name, last_name FROM users WHERE user_id = $1
    `;
    const techResult = await pool.query(technicianQuery, [req.user.user_id]);
    const technicianName = techResult.rows.length > 0
      ? `${techResult.rows[0].first_name} ${techResult.rows[0].last_name}`
      : 'Técnico';

    // Crear la contraoferta
    const finalPrice = parseFloat(counterOfferPrice);
    const updatedPricingData = {
      ...pricingData,
      originalPrice: pricingData.suggestedPrice || pricingData.finalPrice || 0,
      counterOffer: {
        price: finalPrice,
        userId: req.user.user_id,
        userName: technicianName,
        createdAt: new Date().toISOString()
      },
      finalPrice: finalPrice, // El precio de contraoferta es el final
      status: 'counter_offer_applied'
    };

    const updated = await updateRadiographyRequest(requestId, {
      pricing_data: updatedPricingData,
      user_id_modification: req.user.user_id
    });

    // ============================================================================
    // REGISTRAR INGRESO CON PRECIO DE CONTRAOFERTA
    // Este precio es el definitivo que se cobra al cliente
    // ============================================================================
    try {
      // Obtener datos necesarios para el ingreso
      const requestData = request.request_data || {};
      const patientData = requestData.patientData || requestData.patient || {};

      // Construir nombre del servicio basado en el tipo de radiografía
      const radiographyType = request.radiography_type || 'Estudio de Imágenes';
      const itemName = `Servicio de Laboratorio: ${radiographyType}`;

      // Descripción con detalles del desglose si existe
      let itemDescription = `Contraoferta aplicada por ${technicianName}`;
      if (pricingData.breakdown && pricingData.breakdown.length > 0) {
        const services = pricingData.breakdown.map(item =>
          item.itemName || item.service || 'Item'
        ).join(', ');
        itemDescription += `. Servicios incluidos: ${services}`;
      }

      // Obtener dentist_id para performed_by_dentist_id
      // Si no hay dentist_id en la solicitud, usar el del técnico que crea contraoferta
      let performedByDentistId = request.dentist_id;

      // Si no hay dentist asociado, buscar si el usuario actual tiene dentist_id
      if (!performedByDentistId) {
        const dentistQuery = `SELECT dentist_id FROM dentists WHERE user_id = $1`;
        const dentistResult = await pool.query(dentistQuery, [req.user.user_id]);
        if (dentistResult.rows.length > 0) {
          performedByDentistId = dentistResult.rows[0].dentist_id;
        }
      }

      // Solo crear ingreso si tenemos los datos mínimos necesarios
      if (request.patient_id && performedByDentistId) {
        // Determinar branch_id (del técnico logueado o de la solicitud)
        const branchId = req.user.branch_id || request.branch_id || 1;

        const incomeData = {
          patient_id: request.patient_id,
          branch_id: branchId,
          income_type: 'laboratory_service',
          item_name: itemName,
          item_description: itemDescription,
          amount: finalPrice,
          discount_amount: 0,
          performed_by_dentist_id: performedByDentistId,
          performed_date: formatDateYMD(),
          performed_time: new Date().toTimeString().split(' ')[0],
          clinical_notes: `Solicitud de radiografía #${requestId}. Precio de contraoferta registrado.`,
          income_status: 'pending', // Pendiente de pago
          user_id_registration: req.user.user_id
        };

        const incomeRecord = await createProcedureIncome(incomeData);
        console.log(`✅ Ingreso creado con ID ${incomeRecord.income_id} para solicitud de radiografía #${requestId}`);

        // Guardar referencia del ingreso en pricing_data
        updatedPricingData.incomeId = incomeRecord.income_id;

        // Actualizar nuevamente con el income_id
        await updateRadiographyRequest(requestId, {
          pricing_data: updatedPricingData
        });
      } else {
        console.warn(`⚠️ No se pudo crear ingreso para solicitud #${requestId}: faltan datos (patient_id: ${request.patient_id}, dentist_id: ${performedByDentistId})`);
      }
    } catch (incomeError) {
      // No fallar la contraoferta si el ingreso falla, solo loguear
      console.error('Error al crear ingreso para contraoferta:', incomeError);
    }

    res.json({
      success: true,
      message: 'Contraoferta registrada exitosamente',
      data: {
        ...updated,
        pricing_data: updatedPricingData
      }
    });
  } catch (error) {
    console.error('Error al registrar contraoferta:', error);
    res.status(500).json({
      success: false,
      error: 'Error al registrar contraoferta'
    });
  }
};

/**
 * Marcar solicitud como entregada (cuando el cliente visualiza los resultados)
 * POST /api/radiography/:id/mark-delivered
 * Transición automática: completed -> delivered
 */
const markDeliveredHandler = async (req, res) => {
  try {
    const { id } = req.params;
    const requestId = parseInt(id);

    // Obtener la solicitud
    const request = await getRadiographyRequestById(requestId);

    if (!request) {
      return res.status(404).json({
        success: false,
        error: 'Solicitud de radiografía no encontrada'
      });
    }

    // Verificar permisos:
    // - external_client (8) solo puede marcar SU propia solicitud
    // - imaging_technician (5) y super_admin (1) pueden marcar cualquiera
    if (req.user.role_id === 7) {
      if (request.dentist_id !== req.user.dentist_id) {
        return res.status(403).json({
          success: false,
          error: 'No tiene permiso para marcar esta solicitud como entregada'
        });
      }
    }

    // Solo se puede marcar como entregada si está en estado 'completed'
    if (request.request_status !== 'completed') {
      return res.status(400).json({
        success: false,
        error: `No se puede marcar como entregada. Estado actual: ${request.request_status}. Debe estar en estado 'completed'.`
      });
    }

    // Actualizar estado a 'delivered'
    const updated = await updateRadiographyRequest(requestId, {
      request_status: 'delivered',
      user_id_modification: req.user.user_id
    });

    // Registrar quién y cuándo visualizó los resultados
    console.log(`[mark-delivered] Solicitud #${requestId} marcada como entregada por usuario #${req.user.user_id} (role: ${req.user.role_id})`);

    res.json({
      success: true,
      message: 'Solicitud marcada como entregada',
      data: updated
    });
  } catch (error) {
    console.error('Error al marcar como entregada:', error);
    res.status(500).json({
      success: false,
      error: 'Error al marcar la solicitud como entregada'
    });
  }
};

/**
 * Subir resultados de radiografía (imágenes, documentos, enlaces externos)
 * POST /api/radiography/:id/upload-results
 */
const uploadResultsHandler = async (req, res) => {
  try {
    const { id } = req.params;
    const requestId = parseInt(id);

    // Verificar que la solicitud existe
    const request = await getRadiographyRequestById(requestId);
    if (!request) {
      return res.status(404).json({
        success: false,
        error: 'Solicitud de radiografía no encontrada'
      });
    }

    // Obtener enlaces externos del body
    let externalLinks = [];
    if (req.body.externalLinks) {
      try {
        externalLinks = JSON.parse(req.body.externalLinks);
        // Validar que sean URLs válidas
        externalLinks = externalLinks.filter(link => {
          try {
            new URL(link);
            return true;
          } catch {
            return false;
          }
        });
      } catch (error) {
        console.error('Error al parsear enlaces externos:', error);
      }
    }

    // Procesar archivos subidos (file.path ya viene del middleware s3Upload)
    const files = req.files || [];
    const resultsToCreate = [];

    // Definir tipos de imagen
    const imageTypes = ['image/jpeg', 'image/jpg', 'image/png', 'application/dicom'];
    const imageExtensions = ['.jpg', '.jpeg', '.png', '.dcm'];

    // Procesar cada archivo
    for (const file of files) {
      const ext = path.extname(file.originalname).toLowerCase();
      const isImage = imageTypes.includes(file.mimetype) || imageExtensions.includes(ext);

      resultsToCreate.push({
        radiography_request_id: requestId,
        result_type: isImage ? 'image' : 'document',
        file_name: file.filename,
        original_name: file.originalname,
        file_path: file.path,
        file_size: file.size,
        mime_type: file.mimetype,
        external_url: null,
        uploaded_by: req.user.user_id
      });
    }

    // Procesar enlaces externos
    for (const link of externalLinks) {
      resultsToCreate.push({
        radiography_request_id: requestId,
        result_type: 'external_link',
        file_name: null,
        original_name: null,
        file_path: null,
        file_size: null,
        mime_type: null,
        external_url: link,
        uploaded_by: req.user.user_id
      });
    }

    // Validar que hay al menos un resultado
    if (resultsToCreate.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Debe proporcionar al menos un archivo o enlace externo'
      });
    }

    // Crear los resultados en la base de datos
    const createdResults = await createMultipleRadiographyResults(resultsToCreate);

    // Actualizar el estado de la solicitud a 'completed'
    await updateRadiographyRequest(requestId, {
      request_status: 'completed',
      performed_date: formatDateYMD(),
      performed_by: req.user.user_id,
      user_id_modification: req.user.user_id
    });

    // ============================================================================
    // AUTO-CREAR PAGO E INGRESO SI NO EXISTE (solicitudes externas con precio)
    // Regla de negocio: subir resultados = servicio completado → generar ingreso
    // Protección anti-duplicados: solo crea si no existe laboratory_external_payments
    // ============================================================================
    let autoPaymentCreated = false;
    try {
      const existingPayment = await getPaymentByRadiographyRequestId(requestId);

      if (!existingPayment) {
        // No existe pago → verificar si hay precio en pricing_data
        const pricingData = request.pricing_data || {};
        const price = parseFloat(pricingData.finalPrice || pricingData.suggestedPrice || 0);

        if (price > 0) {
          // Determinar branch_id
          const effectiveBranchId = req.user.branch_id || request.branch_id;

          // 1. Crear registro en laboratory_external_payments como "paid"
          const paymentData = {
            radiography_request_id: requestId,
            branch_id: effectiveBranchId,
            amount: price,
            final_price: price,
            set_price_by_user_id: req.user.user_id,
            notes: 'Pago automático al completar servicio',
            user_id_registration: req.user.user_id
          };
          const newPayment = await createExternalPayment(paymentData);

          // Marcar como pagado inmediatamente (servicio completado = pagado)
          const markPaidQuery = `
            UPDATE laboratory_external_payments
            SET payment_status = 'paid', paid_at = NOW(), paid_by_user_id = $1,
                user_id_modification = $1, date_time_modification = NOW()
            WHERE payment_id = $2
          `;
          await pool.query(markPaidQuery, [req.user.user_id, newPayment.payment_id]);

          // 2. Crear ingreso en procedure_income
          let incomeId = null;
          const requestData = request.request_data || {};
          const patientData = requestData.patient || requestData.patientData || {};
          const patientName = patientData.nombres
            ? `${patientData.nombres} ${patientData.apellidos || ''}`.trim()
            : patientData.name || 'Cliente Externo';
          const radiographyType = request.radiography_type || 'Estudio de Imágenes';

          let performedByDentistId = request.dentist_id;
          if (!performedByDentistId) {
            const dentistResult = await pool.query(
              'SELECT dentist_id FROM dentists WHERE user_id = $1',
              [request.user_id_registration]
            );
            if (dentistResult.rows.length > 0) {
              performedByDentistId = dentistResult.rows[0].dentist_id;
            }
          }

          const incomeData = {
            patient_id: request.patient_id || null,
            branch_id: effectiveBranchId,
            income_type: 'laboratory_external',
            item_name: `Laboratorio Externo: ${radiographyType}`,
            item_description: `Servicio para ${patientName}. DNI: ${patientData.dni || 'N/A'}`,
            amount: price,
            discount_amount: 0,
            performed_by_dentist_id: performedByDentistId || null,
            performed_date: formatDateYMD(),
            performed_time: new Date().toTimeString().split(' ')[0],
            clinical_notes: `Solicitud de radiografía externa #${requestId}. Pago automático al completar servicio.`,
            income_status: 'confirmed',
            payment_status: 'paid',
            amount_paid: price,
            balance: 0,
            user_id_registration: req.user.user_id
          };
          const incomeRecord = await createProcedureIncome(incomeData);
          incomeId = incomeRecord.income_id;

          // 3. Actualizar pricing_data con referencias al pago e ingreso
          const updatedPricingData = {
            ...pricingData,
            finalPrice: price,
            status: 'paid',
            paymentId: newPayment.payment_id,
            incomeId: incomeId,
            paymentStatus: 'paid',
            paidAt: new Date().toISOString(),
            paidBy: req.user.user_id,
            autoCreated: true
          };
          await updateRadiographyRequest(requestId, {
            branch_id: effectiveBranchId,
            pricing_data: updatedPricingData,
            user_id_modification: req.user.user_id
          });

          autoPaymentCreated = true;
        }
      }
      // Si ya existe pago pendiente (creado por setFinalPrice), marcarlo como pagado
      if (existingPayment && existingPayment.payment_status === 'pending') {
        const markPaidQuery = `
          UPDATE laboratory_external_payments
          SET payment_status = 'paid', paid_at = NOW(), paid_by_user_id = $1,
              user_id_modification = $1, date_time_modification = NOW()
          WHERE payment_id = $2
        `;
        await pool.query(markPaidQuery, [req.user.user_id, existingPayment.payment_id]);

        // Buscar si hay procedure_income asociado para marcarlo también como paid
        const pricingData = request.pricing_data || {};
        const incomeId = pricingData.incomeId;
        if (incomeId) {
          await pool.query(`
            UPDATE procedure_income
            SET payment_status = 'paid', amount_paid = amount, balance = 0,
                user_id_modification = $1, date_time_modification = NOW()
            WHERE income_id = $2
          `, [req.user.user_id, incomeId]);
        } else {
          // No había procedure_income → crear uno nuevo
          const price = parseFloat(existingPayment.final_price || existingPayment.amount || 0);
          if (price > 0) {
            const effectiveBranchId = req.user.branch_id || request.branch_id;
            const requestData = request.request_data || {};
            const patientData = requestData.patient || requestData.patientData || {};
            const patientName = patientData.nombres
              ? `${patientData.nombres} ${patientData.apellidos || ''}`.trim()
              : patientData.name || 'Cliente Externo';
            const radiographyType = request.radiography_type || 'Estudio de Imágenes';

            let performedByDentistId = request.dentist_id;
            if (!performedByDentistId) {
              const dentistResult = await pool.query(
                'SELECT dentist_id FROM dentists WHERE user_id = $1',
                [request.user_id_registration]
              );
              if (dentistResult.rows.length > 0) {
                performedByDentistId = dentistResult.rows[0].dentist_id;
              }
            }

            const incomeData = {
              patient_id: request.patient_id || null,
              branch_id: effectiveBranchId,
              income_type: 'laboratory_external',
              item_name: `Laboratorio Externo: ${radiographyType}`,
              item_description: `Servicio para ${patientName}. DNI: ${patientData.dni || 'N/A'}`,
              amount: price,
              discount_amount: 0,
              performed_by_dentist_id: performedByDentistId || null,
              performed_date: formatDateYMD(),
              performed_time: new Date().toTimeString().split(' ')[0],
              clinical_notes: `Solicitud de radiografía externa #${requestId}. Pago completado al subir resultados.`,
              income_status: 'confirmed',
              payment_status: 'paid',
              amount_paid: price,
              balance: 0,
              user_id_registration: req.user.user_id
            };
            const incomeRecord = await createProcedureIncome(incomeData);

            // Actualizar pricing_data con referencia al income
            const updatedPricingData = {
              ...pricingData,
              status: 'paid',
              incomeId: incomeRecord.income_id,
              paymentStatus: 'paid',
              paidAt: new Date().toISOString(),
              paidBy: req.user.user_id,
              autoCreated: true
            };
            await updateRadiographyRequest(requestId, {
              pricing_data: updatedPricingData,
              user_id_modification: req.user.user_id
            });
          }
        }

        autoPaymentCreated = true;
      }
    } catch (paymentError) {
      // No bloquear la subida de resultados si falla la creación del pago
      console.error('Error al auto-crear pago para solicitud externa:', paymentError);
    }

    // Contar resultados por tipo
    const counts = await countResultsByType(requestId);

    res.json({
      success: true,
      message: autoPaymentCreated
        ? 'Resultados subidos y pago registrado exitosamente'
        : 'Resultados subidos exitosamente',
      data: {
        results: createdResults,
        counts: counts,
        autoPaymentCreated
      }
    });

  } catch (error) {
    console.error('Error al subir resultados de radiografía:', error);
    res.status(500).json({
      success: false,
      error: 'Error al subir resultados de radiografía'
    });
  }
};

/**
 * Obtener resultados de una solicitud de radiografía
 * GET /api/radiography/:id/results
 */
const getResultsHandler = async (req, res) => {
  try {
    const { id } = req.params;
    const requestId = parseInt(id);

    // Verificar que la solicitud existe
    const request = await getRadiographyRequestById(requestId);
    if (!request) {
      return res.status(404).json({
        success: false,
        error: 'Solicitud de radiografía no encontrada'
      });
    }

    // Obtener los resultados
    const results = await getResultsByRadiographyRequestId(requestId);
    const counts = await countResultsByType(requestId);

    res.json({
      success: true,
      data: {
        results: results,
        counts: counts
      }
    });

  } catch (error) {
    console.error('Error al obtener resultados de radiografía:', error);
    res.status(500).json({
      success: false,
      error: 'Error al obtener resultados de radiografía'
    });
  }
};

/**
 * Establecer precio final para solicitud externa
 * POST /api/radiography/:id/set-final-price
 * Solo para imaging_technician (role_id = 5)
 * Crea registro en laboratory_external_payments
 */
const setFinalPriceHandler = async (req, res) => {
  try {
    const { id } = req.params;
    let { finalPrice, notes } = req.body;
    const requestId = parseInt(id);

    // Validar y sanitizar notes
    if (notes) {
      if (notes.length > 500) {
        return res.status(400).json({
          success: false,
          error: 'Las notas no pueden exceder 500 caracteres'
        });
      }
      notes = notes.replace(/[<>]/g, '');
    }

    // Validar precio
    const MIN_PRICE = 0.01;
    const MAX_PRICE = 999999.99;
    const price = parseFloat(finalPrice);

    if (!finalPrice || isNaN(price) || price < MIN_PRICE || price > MAX_PRICE) {
      return res.status(400).json({
        success: false,
        error: `Precio final invalido. Debe estar entre S/ ${MIN_PRICE} y S/ ${MAX_PRICE}`
      });
    }

    // Verificar que sea tecnico de imagen, admin o super admin
    if (req.user.role_id !== 5 && req.user.role_id !== 1 && req.user.role_id !== 2) {
      return res.status(403).json({
        success: false,
        error: 'Solo el tecnico de imagen, admin o super admin pueden establecer precios'
      });
    }

    // Obtener la solicitud
    const request = await getRadiographyRequestById(requestId);
    if (!request) {
      return res.status(404).json({
        success: false,
        error: 'Solicitud de radiografia no encontrada'
      });
    }

    // Determinar branch_id: usar el de la solicitud si el usuario no tiene sede (ej: técnico de imágenes sin sede fija)
    const effectiveBranchId = req.user.branch_id || request.branch_id;

    // Verificar que exista un branch_id válido (excepto super_admin)
    if (req.user.role_id !== 1 && !effectiveBranchId) {
      return res.status(403).json({
        success: false,
        error: 'No se pudo determinar la sede. La solicitud no tiene sede asignada.'
      });
    }

    // Verificar si ya existe un pago para esta solicitud
    const existingPayment = await getPaymentByRadiographyRequestId(requestId);

    if (existingPayment) {
      const pricingData = request.pricing_data || {};
      const wasAutoCreated = pricingData.autoCreated === true;

      // Permitir actualizar si está pendiente O si fue auto-creado (ajuste de precio post-upload)
      if (existingPayment.payment_status === 'pending' || wasAutoCreated) {
        // Actualizar precio en laboratory_external_payments
        const updatePaymentQuery = `
          UPDATE laboratory_external_payments
          SET amount = $1, final_price = $1, set_price_by_user_id = $2,
              set_price_at = NOW(), user_id_modification = $2, date_time_modification = NOW()
          WHERE payment_id = $3 AND status = 'active'
          RETURNING *
        `;
        const updatedPaymentResult = await pool.query(updatePaymentQuery, [price, req.user.user_id, existingPayment.payment_id]);
        const updated = updatedPaymentResult.rows[0];

        // Si fue auto-creado y ya tiene incomeId, actualizar también procedure_income
        if (wasAutoCreated && pricingData.incomeId) {
          await pool.query(`
            UPDATE procedure_income
            SET amount = $1, final_amount = $1,
                amount_paid = CASE WHEN payment_status = 'paid' THEN $1 ELSE amount_paid END,
                balance = CASE WHEN payment_status = 'paid' THEN 0 ELSE $1 - COALESCE(amount_paid, 0) END,
                user_id_modification = $2, date_time_modification = NOW()
            WHERE income_id = $3
          `, [price, req.user.user_id, pricingData.incomeId]);
        }

        const updatedPricingData = {
          ...pricingData,
          finalPrice: price,
          status: wasAutoCreated ? 'paid' : 'price_set',
          setPriceBy: req.user.user_id,
          setPriceAt: new Date().toISOString()
        };

        await updateRadiographyRequest(requestId, {
          pricing_data: updatedPricingData,
          user_id_modification: req.user.user_id
        });

        return res.json({
          success: true,
          message: 'Precio actualizado exitosamente',
          data: {
            payment: updated,
            pricing_data: updatedPricingData
          }
        });
      } else {
        return res.status(400).json({
          success: false,
          error: 'No se puede modificar el precio de una solicitud ya pagada manualmente'
        });
      }
    }

    // Crear nuevo registro de pago
    // El pago se asigna a la sede de la solicitud (o del usuario si tiene sede fija)
    const paymentData = {
      radiography_request_id: requestId,
      branch_id: effectiveBranchId,
      amount: price,
      final_price: price,
      set_price_by_user_id: req.user.user_id,
      notes: notes || null,
      user_id_registration: req.user.user_id
    };

    const newPayment = await createExternalPayment(paymentData);

    // ============================================================================
    // CREAR INGRESO EN procedure_income PARA QUE APAREZCA EN REPORTES DE LA SEDE
    // ============================================================================
    let incomeId = null;
    try {
      // Obtener datos del request para descripción del servicio
      const requestData = request.request_data || {};
      const patientData = requestData.patient || requestData.patientData || {};
      const patientName = patientData.nombres
        ? `${patientData.nombres} ${patientData.apellidos || ''}`.trim()
        : patientData.name || 'Cliente Externo';

      const radiographyType = request.radiography_type || 'Estudio de Imágenes';
      const itemName = `Laboratorio Externo: ${radiographyType}`;
      const itemDescription = `Servicio para ${patientName}. DNI: ${patientData.dni || 'N/A'}`;

      // Obtener dentist_id si existe (para external_client, está en la tabla dentists)
      let performedByDentistId = request.dentist_id;
      if (!performedByDentistId) {
        // Buscar si el creador tiene dentist_id asociado
        const dentistQuery = `SELECT dentist_id FROM dentists WHERE user_id = $1`;
        const dentistResult = await pool.query(dentistQuery, [request.user_id_registration]);
        if (dentistResult.rows.length > 0) {
          performedByDentistId = dentistResult.rows[0].dentist_id;
        }
      }

      // Crear ingreso incluso sin patient_id (es servicio externo)
      const incomeData = {
        patient_id: request.patient_id || null,
        branch_id: effectiveBranchId,
        income_type: 'laboratory_external',
        item_name: itemName,
        item_description: itemDescription,
        amount: price,
        discount_amount: 0,
        performed_by_dentist_id: performedByDentistId || null,
        performed_date: formatDateYMD(),
        performed_time: new Date().toTimeString().split(' ')[0],
        clinical_notes: `Solicitud de radiografía externa #${requestId}. Pago pendiente.`,
        income_status: 'pending',
        user_id_registration: req.user.user_id
      };

      const incomeRecord = await createProcedureIncome(incomeData);
      incomeId = incomeRecord.income_id;
      console.log(`✅ Ingreso externo creado con ID ${incomeId} para solicitud #${requestId}`);
    } catch (incomeError) {
      // No fallar si el ingreso no se puede crear, solo loguear
      console.error('⚠️ Error al crear ingreso para pago externo:', incomeError);
    }

    // Actualizar pricing_data y asignar la solicitud a la sede del técnico
    const pricingData = request.pricing_data || {};
    const updatedPricingData = {
      ...pricingData,
      finalPrice: price,
      status: 'price_set',
      paymentId: newPayment.payment_id,
      incomeId: incomeId, // Vincular con procedure_income
      setPriceBy: req.user.user_id,
      setPriceAt: new Date().toISOString()
    };

    await updateRadiographyRequest(requestId, {
      branch_id: effectiveBranchId, // Asignar solicitud a la sede del caso
      pricing_data: updatedPricingData,
      user_id_modification: req.user.user_id
    });

    res.status(201).json({
      success: true,
      message: 'Precio establecido y registro de pago creado exitosamente',
      data: {
        payment: newPayment,
        pricing_data: updatedPricingData,
        income_id: incomeId
      }
    });

  } catch (error) {
    console.error('Error al establecer precio final:', error);
    res.status(500).json({
      success: false,
      error: 'Error al establecer precio final'
    });
  }
};

/**
 * Registrar pago de solicitud externa
 * POST /api/radiography/:id/register-payment
 * Solo para imaging_technician (role_id = 5)
 */
const registerPaymentHandler = async (req, res) => {
  try {
    const { id } = req.params;
    let { notes } = req.body;
    const requestId = parseInt(id);

    // Validar y sanitizar notes
    if (notes) {
      if (notes.length > 500) {
        return res.status(400).json({
          success: false,
          error: 'Las notas no pueden exceder 500 caracteres'
        });
      }
      // Escapar caracteres HTML para prevenir XSS
      notes = notes.replace(/[<>]/g, '');
    }

    // Verificar que sea super_admin, admin o recepcionista
    if (![1, 2, 4].includes(req.user.role_id)) {
      return res.status(403).json({
        success: false,
        error: 'No tiene permiso para registrar pagos'
      });
    }

    // Obtener el pago existente
    const existingPayment = await getPaymentByRadiographyRequestId(requestId);

    if (!existingPayment) {
      return res.status(404).json({
        success: false,
        error: 'No existe un precio establecido para esta solicitud. Primero establezca el precio.'
      });
    }

    if (existingPayment.payment_status === 'paid') {
      return res.status(400).json({
        success: false,
        error: 'Esta solicitud ya fue pagada'
      });
    }

    // Validar que el usuario pertenezca a la sede del pago (excepto super_admin)
    if (req.user.role_id !== 1 && existingPayment.branch_id !== req.user.branch_id) {
      return res.status(403).json({
        success: false,
        error: 'Solo puede registrar pagos asignados a su sede'
      });
    }

    // Obtener la solicitud para pricing_data
    const request = await getRadiographyRequestById(requestId);
    const pricingData = request.pricing_data || {};

    // Verificar si es solicitud externa (creada por external_client)
    const isExternalRequest = request.user_id_registration && await (async () => {
      const userQuery = `SELECT role_id FROM users WHERE user_id = $1`;
      const userResult = await pool.query(userQuery, [request.user_id_registration]);
      return userResult.rows.length > 0 && userResult.rows[0].role_id === 7;
    })();

    // ============================================================================
    // TRANSACCION: Sincronizar las 3 tablas de forma atómica
    // ============================================================================
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // 1. Registrar el pago en laboratory_external_payments
      const paymentQuery = `
        UPDATE laboratory_external_payments
        SET
          payment_status = 'paid',
          paid_at = NOW(),
          paid_by_user_id = $1,
          notes = COALESCE($2, notes),
          user_id_modification = $1,
          date_time_modification = NOW()
        WHERE payment_id = $3 AND status = 'active'
        RETURNING *
      `;
      const paymentResult = await client.query(paymentQuery, [
        req.user.user_id,
        notes || null,
        existingPayment.payment_id
      ]);
      const updatedPayment = paymentResult.rows[0];

      // 2. Actualizar pricing_data en la solicitud
      const updatedPricingData = {
        ...pricingData,
        paymentStatus: 'paid',
        paidAt: new Date().toISOString(),
        paidBy: req.user.user_id
      };

      await client.query(`
        UPDATE radiography_requests
        SET
          pricing_data = $1,
          request_status = $2,
          user_id_modification = $3,
          date_time_modification = NOW()
        WHERE radiography_request_id = $4
      `, [
        JSON.stringify(updatedPricingData),
        isExternalRequest ? 'completed' : request.request_status,
        req.user.user_id,
        requestId
      ]);

      // 3. Sincronizar procedure_income - MARCAR COMO PAGADO
      const incomeId = pricingData.incomeId;
      if (incomeId) {
        await client.query(`
          UPDATE procedure_income
          SET
            payment_status = 'paid',
            amount_paid = final_amount,
            balance = 0,
            clinical_notes = COALESCE(clinical_notes || E'\\n', '') || $1,
            date_time_modification = NOW(),
            user_id_modification = $2
          WHERE income_id = $3
        `, [
          notes || 'Pago registrado desde laboratorio externo',
          req.user.user_id,
          incomeId
        ]);
      } else {
        // Buscar ingreso por referencia en clinical_notes (para registros antiguos)
        await client.query(`
          UPDATE procedure_income
          SET
            payment_status = 'paid',
            amount_paid = final_amount,
            balance = 0,
            clinical_notes = COALESCE(clinical_notes || E'\\n', '') || $1,
            date_time_modification = NOW(),
            user_id_modification = $2
          WHERE clinical_notes LIKE $3
            AND income_status = 'pending'
        `, [
          notes || 'Pago registrado desde laboratorio externo',
          req.user.user_id,
          `%solicitud de radiografía%#${requestId}%`
        ]);
      }

      await client.query('COMMIT');

      res.json({
        success: true,
        message: 'Pago registrado exitosamente',
        data: {
          payment: updatedPayment,
          pricing_data: updatedPricingData
        }
      });
    } catch (txError) {
      await client.query('ROLLBACK');
      throw txError;
    } finally {
      client.release();
    }

  } catch (error) {
    console.error('Error al registrar pago:', error);
    res.status(500).json({
      success: false,
      error: 'Error al registrar pago'
    });
  }
};

/**
 * Obtener informacion de pago de una solicitud
 * GET /api/radiography/:id/payment
 */
const getPaymentInfoHandler = async (req, res) => {
  try {
    const { id } = req.params;
    const requestId = parseInt(id);

    const payment = await getPaymentByRadiographyRequestId(requestId);

    res.json({
      success: true,
      data: payment || null
    });

  } catch (error) {
    console.error('Error al obtener informacion de pago:', error);
    res.status(500).json({
      success: false,
      error: 'Error al obtener informacion de pago'
    });
  }
};

/**
 * Obtener todos los pagos externos de laboratorio
 * GET /api/radiography/external-payments
 * Para admin/recepcionista para ver y gestionar pagos
 */
const getAllExternalPaymentsHandler = async (req, res) => {
  try {
    const {
      branch_id,
      payment_status,
      date_from,
      date_to,
      limit = 100
    } = req.query;

    // super_admin (1), admin (2), recepcionista (4) pueden ver pagos
    if (![1, 2, 4].includes(req.user.role_id)) {
      return res.status(403).json({
        success: false,
        error: 'No tiene permiso para ver los pagos externos'
      });
    }

    // Para admin y recepcionista, forzar filtro por su sede
    // Super admin puede ver todos o filtrar por sede si lo desea
    let effectiveBranchId = branch_id ? parseInt(branch_id) : null;
    if (req.user.role_id !== 1) {
      // No es super_admin, forzar su propia sede
      effectiveBranchId = req.user.branch_id;
    }

    const filters = {
      branch_id: effectiveBranchId,
      payment_status: payment_status || null,
      date_from: date_from || null,
      date_to: date_to || null,
      limit: parseInt(limit)
    };

    const payments = await getAllExternalPayments(filters);

    res.json({
      success: true,
      data: payments,
      total: payments.length
    });

  } catch (error) {
    console.error('Error al obtener pagos externos:', error);
    res.status(500).json({
      success: false,
      error: 'Error al obtener pagos externos'
    });
  }
};

module.exports = {
  getRadiographyRequests,
  getRadiographyRequest,
  createNewRadiographyRequest,
  updateExistingRadiographyRequest,
  deleteExistingRadiographyRequest,
  upsertRadiographyRequestHandler,
  approvePricingHandler,
  rejectPricingHandler,
  counterOfferHandler,
  markDeliveredHandler,
  uploadResultsHandler,
  getResultsHandler,
  determineUploadSource,
  // Endpoints para pagos externos
  setFinalPriceHandler,
  registerPaymentHandler,
  getPaymentInfoHandler,
  getAllExternalPaymentsHandler
};
