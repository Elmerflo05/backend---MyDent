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
 * Basado en los médicos asignados a esa sede y sus especialidades
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
      INNER JOIN dentist_specialties ds ON s.specialty_id = ds.specialty_id
      INNER JOIN dentists d ON ds.dentist_id = d.dentist_id
      INNER JOIN users u ON d.user_id = u.user_id
      WHERE (u.branch_id = $1 OR u.branch_id IS NULL)
        AND u.role_id = 5
        AND u.status = 'active'
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
