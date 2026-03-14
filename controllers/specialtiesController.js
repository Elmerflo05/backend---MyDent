const pool = require('../config/db');

/**
 * Obtiene todas las especialidades activas
 */
const getAllSpecialties = async (req, res) => {
  try {
    const query = `
      SELECT
        specialty_id,
        specialty_name,
        specialty_description as description,
        status
      FROM specialties
      WHERE status = 'active'
      ORDER BY specialty_name;
    `;

    const result = await pool.query(query);

    res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    console.error('Error al obtener especialidades:', error);
    res.status(500).json({
      success: false,
      error: 'Error al obtener especialidades'
    });
  }
};

/**
 * Obtiene especialidades disponibles por sede
 * Basado en doctores que tienen HORARIOS ACTIVOS configurados en esa sede
 * (no solo acceso, sino schedules reales)
 */
const getSpecialtiesByBranch = async (req, res) => {
  try {
    const { branchId } = req.params;

    const query = `
      SELECT DISTINCT
        s.specialty_id,
        s.specialty_name,
        s.specialty_description as description
      FROM specialties s
      INNER JOIN dentist_specialties dsp ON s.specialty_id = dsp.specialty_id
      INNER JOIN dentists d ON dsp.dentist_id = d.dentist_id
      INNER JOIN users u ON d.user_id = u.user_id
      INNER JOIN dentist_schedules dsch ON d.dentist_id = dsch.dentist_id
      WHERE dsch.branch_id = $1
        AND dsch.is_available = true
        AND (dsch.status = 'active' OR dsch.status IS NULL)
        AND dsp.status = 'active'
        AND d.status = 'active'
        AND u.status = 'active'
        AND u.role_id IN (3, 5)
        AND s.status = 'active'
      ORDER BY s.specialty_name;
    `;

    const result = await pool.query(query, [branchId]);

    res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    console.error('Error al obtener especialidades por sede:', error);
    res.status(500).json({
      success: false,
      error: 'Error al obtener especialidades por sede'
    });
  }
};

module.exports = {
  getAllSpecialties,
  getSpecialtiesByBranch
};
