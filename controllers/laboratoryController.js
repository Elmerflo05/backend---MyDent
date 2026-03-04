const {
  getAllLaboratoryRequests,
  getLaboratoryRequestById,
  createLaboratoryRequest,
  updateLaboratoryRequest,
  deleteLaboratoryRequest,
  countLaboratoryRequests,
  getAllLaboratoryServices,
  getLaboratoryServiceById,
  createLaboratoryService,
  updateLaboratoryService,
  deleteLaboratoryService,
  countLaboratoryServices
} = require('../models/laboratoryModel');
const pool = require('../config/db');

// Laboratory Requests
const getLaboratoryRequests = async (req, res) => {
  try {
    const {
      patient_id,
      dentist_id,
      branch_id,
      consultation_id,
      request_status,
      urgency,
      date_from,
      date_to,
      page = 1,
      limit = 20
    } = req.query;

    const filters = {
      patient_id: patient_id ? parseInt(patient_id) : null,
      dentist_id: dentist_id ? parseInt(dentist_id) : null,
      branch_id: branch_id ? parseInt(branch_id) : null,
      consultation_id: consultation_id ? parseInt(consultation_id) : null,
      request_status,
      urgency,
      date_from,
      date_to,
      limit: parseInt(limit),
      offset: (parseInt(page) - 1) * parseInt(limit)
    };

    const [requests, total] = await Promise.all([
      getAllLaboratoryRequests(filters),
      countLaboratoryRequests(filters)
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
    console.error('Error al obtener solicitudes de laboratorio:', error);
    res.status(500).json({
      success: false,
      error: 'Error al obtener solicitudes de laboratorio'
    });
  }
};

const getLaboratoryRequest = async (req, res) => {
  try {
    const { id } = req.params;
    const request = await getLaboratoryRequestById(parseInt(id));

    if (!request) {
      return res.status(404).json({
        success: false,
        error: 'Solicitud de laboratorio no encontrada'
      });
    }

    res.json({
      success: true,
      data: request
    });
  } catch (error) {
    console.error('Error al obtener solicitud de laboratorio:', error);
    res.status(500).json({
      success: false,
      error: 'Error al obtener solicitud de laboratorio'
    });
  }
};

const createNewLaboratoryRequest = async (req, res) => {
  try {
    const requestData = {
      ...req.body,
      user_id_registration: req.user.user_id
    };

    if (!requestData.patient_id || !requestData.dentist_id ||
        !requestData.branch_id || !requestData.request_date ||
        !requestData.request_type) {
      return res.status(400).json({
        success: false,
        error: 'Faltan campos requeridos'
      });
    }

    const newRequest = await createLaboratoryRequest(requestData);

    res.status(201).json({
      success: true,
      message: 'Solicitud de laboratorio creada exitosamente',
      data: newRequest
    });
  } catch (error) {
    console.error('Error al crear solicitud de laboratorio:', error);
    res.status(500).json({
      success: false,
      error: 'Error al crear solicitud de laboratorio'
    });
  }
};

const updateExistingLaboratoryRequest = async (req, res) => {
  try {
    const { id } = req.params;
    const requestData = {
      ...req.body,
      user_id_modification: req.user.user_id
    };

    const updatedRequest = await updateLaboratoryRequest(parseInt(id), requestData);

    if (!updatedRequest) {
      return res.status(404).json({
        success: false,
        error: 'Solicitud de laboratorio no encontrada'
      });
    }

    res.json({
      success: true,
      message: 'Solicitud de laboratorio actualizada exitosamente',
      data: updatedRequest
    });
  } catch (error) {
    console.error('Error al actualizar solicitud de laboratorio:', error);
    res.status(500).json({
      success: false,
      error: 'Error al actualizar solicitud de laboratorio'
    });
  }
};

const deleteExistingLaboratoryRequest = async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await deleteLaboratoryRequest(parseInt(id), req.user.user_id);

    if (!deleted) {
      return res.status(404).json({
        success: false,
        error: 'Solicitud de laboratorio no encontrada'
      });
    }

    res.json({
      success: true,
      message: 'Solicitud de laboratorio eliminada exitosamente'
    });
  } catch (error) {
    console.error('Error al eliminar solicitud de laboratorio:', error);
    res.status(500).json({
      success: false,
      error: 'Error al eliminar solicitud de laboratorio'
    });
  }
};

// Laboratory Services
const getLaboratoryServices = async (req, res) => {
  try {
    const { service_category, search, page = 1, limit = 50 } = req.query;

    const filters = {
      service_category,
      search,
      limit: parseInt(limit),
      offset: (parseInt(page) - 1) * parseInt(limit)
    };

    const [services, total] = await Promise.all([
      getAllLaboratoryServices(filters),
      countLaboratoryServices(filters)
    ]);

    res.json({
      success: true,
      data: services,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Error al obtener servicios de laboratorio:', error);
    res.status(500).json({
      success: false,
      error: 'Error al obtener servicios de laboratorio'
    });
  }
};

const getLaboratoryService = async (req, res) => {
  try {
    const { id } = req.params;
    const service = await getLaboratoryServiceById(parseInt(id));

    if (!service) {
      return res.status(404).json({
        success: false,
        error: 'Servicio de laboratorio no encontrado'
      });
    }

    res.json({
      success: true,
      data: service
    });
  } catch (error) {
    console.error('Error al obtener servicio de laboratorio:', error);
    res.status(500).json({
      success: false,
      error: 'Error al obtener servicio de laboratorio'
    });
  }
};

const createNewLaboratoryService = async (req, res) => {
  try {
    const serviceData = req.body;

    if (!serviceData.service_name) {
      return res.status(400).json({
        success: false,
        error: 'El nombre del servicio es requerido'
      });
    }

    const newService = await createLaboratoryService(serviceData, req.user.user_id);

    res.status(201).json({
      success: true,
      message: 'Servicio de laboratorio creado exitosamente',
      data: newService
    });
  } catch (error) {
    console.error('Error al crear servicio de laboratorio:', error);
    res.status(500).json({
      success: false,
      error: 'Error al crear servicio de laboratorio'
    });
  }
};

const updateExistingLaboratoryService = async (req, res) => {
  try {
    const { id } = req.params;
    const serviceData = req.body;

    const updatedService = await updateLaboratoryService(parseInt(id), serviceData, req.user.user_id);

    if (!updatedService) {
      return res.status(404).json({
        success: false,
        error: 'Servicio de laboratorio no encontrado'
      });
    }

    res.json({
      success: true,
      message: 'Servicio de laboratorio actualizado exitosamente',
      data: updatedService
    });
  } catch (error) {
    console.error('Error al actualizar servicio de laboratorio:', error);
    res.status(500).json({
      success: false,
      error: 'Error al actualizar servicio de laboratorio'
    });
  }
};

const deleteExistingLaboratoryService = async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await deleteLaboratoryService(parseInt(id), req.user.user_id);

    if (!deleted) {
      return res.status(404).json({
        success: false,
        error: 'Servicio de laboratorio no encontrado'
      });
    }

    res.json({
      success: true,
      message: 'Servicio de laboratorio eliminado exitosamente'
    });
  } catch (error) {
    console.error('Error al eliminar servicio de laboratorio:', error);
    res.status(500).json({
      success: false,
      error: 'Error al eliminar servicio de laboratorio'
    });
  }
};

/**
 * Obtener solicitudes INTERNAS de laboratorio
 * Incluye: radiography_requests + laboratory_requests sin laboratory_name
 * GET /api/laboratory/requests/internal
 */
const getInternalRequests = async (req, res) => {
  console.log('=== [getInternalRequests] INICIO ===');
  console.log('[getInternalRequests] Query params:', req.query);
  try {
    const { branch_id, request_status, date_from, date_to, page = 1, limit = 50 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    console.log('[getInternalRequests] Filtros:', { branch_id, request_status, date_from, date_to, page, limit, offset });

    let params = [];
    let paramIndex = 1;
    let whereConditions = [];

    // Filtros comunes
    if (branch_id) {
      whereConditions.push(`branch_id = $${paramIndex}`);
      params.push(parseInt(branch_id));
      paramIndex++;
    }
    if (date_from) {
      whereConditions.push(`request_date >= $${paramIndex}`);
      params.push(date_from);
      paramIndex++;
    }
    if (date_to) {
      whereConditions.push(`request_date <= $${paramIndex}`);
      params.push(date_to);
      paramIndex++;
    }

    const whereClause = whereConditions.length > 0 ? `AND ${whereConditions.join(' AND ')}` : '';

    // Status filter para radiography
    let radioStatusFilter = '';
    let labStatusFilter = '';
    if (request_status && request_status !== 'all') {
      radioStatusFilter = `AND rr.request_status = '${request_status}'`;
      labStatusFilter = `AND lr.request_status = '${request_status}'`;
    }

    // Query SOLO para radiography_requests
    // Usa LEFT JOIN para incluir solicitudes con patient_id NULL (solicitudes de clientes externos PanoCef)
    const query = `
      SELECT
        'radiography' as source_type,
        rr.radiography_request_id as request_id,
        rr.patient_id,
        rr.dentist_id,
        rr.branch_id,
        rr.consultation_id,
        rr.request_date,
        rr.radiography_type as request_type,
        COALESCE(rr.area_of_interest, rr.clinical_indication) as description,
        COALESCE(rr.urgency, 'normal') as urgency,
        rr.request_status,
        NULL as laboratory_name,
        rr.performed_date as expected_delivery_date,
        rr.performed_date as actual_delivery_date,
        (rr.pricing_data->>'finalPrice')::numeric as cost,
        rr.notes,
        rr.status,
        rr.date_time_registration,
        COALESCE(
          p.first_name || ' ' || p.last_name,
          rr.request_data->'patient'->>'nombre',
          rr.request_data->'patientData'->>'nombre',
          CONCAT(rr.request_data->'patient'->>'nombres', ' ', rr.request_data->'patient'->>'apellidos'),
          'Paciente externo'
        ) as patient_name,
        COALESCE(
          p.identification_number,
          rr.request_data->'patient'->>'dni',
          rr.request_data->'patientData'->>'dni',
          'N/A'
        ) as patient_dni,
        COALESCE(
          u.first_name || ' ' || u.last_name,
          rr.request_data->'doctor'->>'nombre',
          rr.request_data->'doctorData'->>'doctor',
          'Doctor externo'
        ) as dentist_name,
        COALESCE(b.branch_name, 'Sin sede') as branch_name
      FROM radiography_requests rr
      LEFT JOIN patients p ON rr.patient_id = p.patient_id
      LEFT JOIN dentists d ON rr.dentist_id = d.dentist_id
      LEFT JOIN users u ON d.user_id = u.user_id
      LEFT JOIN branches b ON rr.branch_id = b.branch_id
      WHERE rr.status = 'active' ${radioStatusFilter} ${whereClause}
      ORDER BY rr.request_date DESC, rr.date_time_registration DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;

    params.push(parseInt(limit), offset);

    // Query para contar total (SOLO radiography_requests)
    const countQuery = `
      SELECT COUNT(*) as total
      FROM radiography_requests rr
      WHERE rr.status = 'active' ${radioStatusFilter} ${whereClause}
    `;

    console.log('[getInternalRequests] Ejecutando queries...');
    console.log('[getInternalRequests] Params:', params);

    const [dataResult, countResult] = await Promise.all([
      pool.query(query, params),
      pool.query(countQuery, params.slice(0, -2)) // Sin limit y offset
    ]);

    const total = parseInt(countResult.rows[0]?.total || 0);

    console.log('[getInternalRequests] Resultados:', {
      dataRows: dataResult.rows.length,
      total: total,
      firstRow: dataResult.rows[0] ? JSON.stringify(dataResult.rows[0]).substring(0, 200) : 'N/A'
    });
    console.log('=== [getInternalRequests] FIN - Enviando', dataResult.rows.length, 'registros ===');

    res.json({
      success: true,
      data: dataResult.rows,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(total / parseInt(limit))
      }
    });

  } catch (error) {
    console.error('=== [getInternalRequests] ERROR ===');
    console.error('[getInternalRequests] Error:', error.message);
    console.error('[getInternalRequests] Stack:', error.stack);
    res.status(500).json({
      success: false,
      error: 'Error al obtener solicitudes internas',
      details: error.message
    });
  }
};

/**
 * Obtener solicitudes EXTERNAS de laboratorio
 * Incluye: prosthesis_orders + laboratory_requests con laboratory_name
 * GET /api/laboratory/requests/external
 */
const getExternalRequests = async (req, res) => {
  try {
    const { branch_id, request_status, date_from, date_to, page = 1, limit = 50 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    let params = [];
    let paramIndex = 1;
    let whereConditions = [];

    // Filtros comunes
    if (branch_id) {
      whereConditions.push(`branch_id = $${paramIndex}`);
      params.push(parseInt(branch_id));
      paramIndex++;
    }
    if (date_from) {
      whereConditions.push(`request_date >= $${paramIndex}`);
      params.push(date_from);
      paramIndex++;
    }
    if (date_to) {
      whereConditions.push(`request_date <= $${paramIndex}`);
      params.push(date_to);
      paramIndex++;
    }

    const whereClause = whereConditions.length > 0 ? `AND ${whereConditions.join(' AND ')}` : '';

    // Status filter
    let prosthesisStatusFilter = '';
    let labStatusFilter = '';
    if (request_status && request_status !== 'all') {
      prosthesisStatusFilter = `AND po.order_status = '${request_status}'`;
      labStatusFilter = `AND lr.request_status = '${request_status}'`;
    }

    // Query unificada para solicitudes externas
    const query = `
      WITH external_requests AS (
        -- Órdenes de prótesis (siempre externas)
        SELECT
          'prosthesis' as source_type,
          po.prosthesis_order_id as request_id,
          po.patient_id,
          po.dentist_id,
          po.branch_id,
          po.consultation_id,
          po.order_date as request_date,
          po.prosthesis_type as request_type,
          po.description,
          'normal' as urgency,
          po.order_status as request_status,
          po.laboratory_name,
          po.expected_date as expected_delivery_date,
          po.received_date as actual_delivery_date,
          po.cost,
          po.notes,
          po.status,
          po.date_time_registration,
          p.first_name || ' ' || p.last_name as patient_name,
          p.identification_number as patient_dni,
          u.first_name || ' ' || u.last_name as dentist_name,
          b.branch_name,
          po.tooth_positions,
          po.material,
          po.color_shade
        FROM prosthesis_orders po
        INNER JOIN patients p ON po.patient_id = p.patient_id
        INNER JOIN dentists d ON po.dentist_id = d.dentist_id
        INNER JOIN users u ON d.user_id = u.user_id
        INNER JOIN branches b ON po.branch_id = b.branch_id
        WHERE po.status = 'active' ${prosthesisStatusFilter}

        UNION ALL

        -- Laboratory requests con laboratory_name (externas)
        SELECT
          'laboratory' as source_type,
          lr.laboratory_request_id as request_id,
          lr.patient_id,
          lr.dentist_id,
          lr.branch_id,
          lr.consultation_id,
          lr.request_date,
          lr.request_type,
          lr.description,
          lr.urgency,
          lr.request_status,
          lr.laboratory_name,
          lr.expected_delivery_date,
          lr.actual_delivery_date,
          lr.cost,
          lr.notes,
          lr.status,
          lr.date_time_registration,
          p.first_name || ' ' || p.last_name as patient_name,
          p.identification_number as patient_dni,
          u.first_name || ' ' || u.last_name as dentist_name,
          b.branch_name,
          NULL as tooth_positions,
          NULL as material,
          NULL as color_shade
        FROM laboratory_requests lr
        INNER JOIN patients p ON lr.patient_id = p.patient_id
        INNER JOIN dentists d ON lr.dentist_id = d.dentist_id
        INNER JOIN users u ON d.user_id = u.user_id
        INNER JOIN branches b ON lr.branch_id = b.branch_id
        WHERE lr.status = 'active'
          AND lr.laboratory_name IS NOT NULL
          AND lr.laboratory_name != '' ${labStatusFilter}
      )
      SELECT * FROM external_requests
      WHERE 1=1 ${whereClause}
      ORDER BY request_date DESC, date_time_registration DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;

    params.push(parseInt(limit), offset);

    // Query para contar total
    const countQuery = `
      WITH external_requests AS (
        SELECT po.prosthesis_order_id as id, po.branch_id, po.order_date as request_date
        FROM prosthesis_orders po
        WHERE po.status = 'active' ${prosthesisStatusFilter}

        UNION ALL

        SELECT lr.laboratory_request_id as id, lr.branch_id, lr.request_date
        FROM laboratory_requests lr
        WHERE lr.status = 'active'
          AND lr.laboratory_name IS NOT NULL
          AND lr.laboratory_name != '' ${labStatusFilter}
      )
      SELECT COUNT(*) as total FROM external_requests
      WHERE 1=1 ${whereClause}
    `;

    const [dataResult, countResult] = await Promise.all([
      pool.query(query, params),
      pool.query(countQuery, params.slice(0, -2)) // Sin limit y offset
    ]);

    const total = parseInt(countResult.rows[0]?.total || 0);

    res.json({
      success: true,
      data: dataResult.rows,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(total / parseInt(limit))
      }
    });

  } catch (error) {
    console.error('Error al obtener solicitudes externas:', error);
    res.status(500).json({
      success: false,
      error: 'Error al obtener solicitudes externas',
      details: error.message
    });
  }
};

/**
 * Obtener estadísticas de solicitudes internas y externas
 * GET /api/laboratory/requests/stats
 */
const getRequestsStats = async (req, res) => {
  console.log('=== [getRequestsStats] INICIO ===');
  console.log('[getRequestsStats] Query params:', req.query);
  try {
    const { branch_id } = req.query;

    let branchFilter = '';
    let params = [];

    if (branch_id) {
      branchFilter = 'AND branch_id = $1';
      params.push(parseInt(branch_id));
    }
    console.log('[getRequestsStats] branchFilter:', branchFilter, 'params:', params);

    // Query SOLO para radiography_requests
    // Todas las solicitudes de radiografía se muestran como "internas"
    const query = `
      SELECT
        'internal' as type,
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE request_status = 'pending') as pending,
        COUNT(*) FILTER (WHERE request_status = 'in_progress') as in_progress,
        COUNT(*) FILTER (WHERE request_status IN ('completed', 'delivered')) as completed,
        COUNT(*) FILTER (WHERE request_status = 'cancelled') as cancelled
      FROM radiography_requests
      WHERE status = 'active' ${branchFilter}
    `;

    console.log('[getRequestsStats] Ejecutando query...');
    const result = await pool.query(query, params);
    console.log('[getRequestsStats] Query result rows:', result.rows);

    const stats = {
      internal: { total: 0, pending: 0, in_progress: 0, completed: 0, cancelled: 0 },
      external: { total: 0, pending: 0, in_progress: 0, completed: 0, cancelled: 0 }
    };

    result.rows.forEach(row => {
      if (row.type === 'internal' || row.type === 'external') {
        stats[row.type] = {
          total: parseInt(row.total) || 0,
          pending: parseInt(row.pending) || 0,
          in_progress: parseInt(row.in_progress) || 0,
          completed: parseInt(row.completed) || 0,
          cancelled: parseInt(row.cancelled) || 0
        };
      }
    });

    console.log('[getRequestsStats] Stats calculados:', stats);
    console.log('=== [getRequestsStats] FIN ===');

    res.json({
      success: true,
      data: stats
    });

  } catch (error) {
    console.error('=== [getRequestsStats] ERROR ===');
    console.error('[getRequestsStats] Error:', error.message);
    console.error('[getRequestsStats] Stack:', error.stack);
    res.status(500).json({
      success: false,
      error: 'Error al obtener estadísticas',
      details: error.message
    });
  }
};

module.exports = {
  getLaboratoryRequests,
  getLaboratoryRequest,
  createNewLaboratoryRequest,
  updateExistingLaboratoryRequest,
  deleteExistingLaboratoryRequest,
  getLaboratoryServices,
  getLaboratoryService,
  createNewLaboratoryService,
  updateExistingLaboratoryService,
  deleteExistingLaboratoryService,
  // Nuevos endpoints para tabs
  getInternalRequests,
  getExternalRequests,
  getRequestsStats
};
