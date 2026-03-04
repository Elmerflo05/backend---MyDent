const pool = require('../config/db');

/**
 * Helper genérico para tablas de catálogo
 * Funciona para tablas simples con estructura estándar
 */
class CatalogModel {
  constructor(tableName, idField, nameField) {
    this.tableName = tableName;
    this.idField = idField;
    this.nameField = nameField;
  }

  async getAll(includeInactive = false) {
    const query = includeInactive
      ? `
        SELECT *
        FROM ${this.tableName}
        ORDER BY ${this.nameField} ASC
      `
      : `
        SELECT *
        FROM ${this.tableName}
        WHERE status = 'active'
        ORDER BY ${this.nameField} ASC
      `;

    const result = await pool.query(query);
    return result.rows;
  }

  async getById(id, includeInactive = false) {
    const query = includeInactive
      ? `
        SELECT *
        FROM ${this.tableName}
        WHERE ${this.idField} = $1
      `
      : `
        SELECT *
        FROM ${this.tableName}
        WHERE ${this.idField} = $1 AND status = 'active'
      `;

    const result = await pool.query(query, [id]);
    return result.rows.length > 0 ? result.rows[0] : null;
  }

  async create(data, userId) {
    const fields = Object.keys(data).filter(key => data[key] !== undefined);
    const values = fields.map(field => data[field]);

    // Agregar el campo de auditoría
    fields.push('user_id_registration');
    values.push(userId);

    const placeholders = fields.map((_, index) => `$${index + 1}`).join(', ');

    const query = `
      INSERT INTO ${this.tableName} (${fields.join(', ')})
      VALUES (${placeholders})
      RETURNING *
    `;

    const result = await pool.query(query, values);
    return result.rows[0];
  }

  async update(id, data, userId) {
    const fields = [];
    const values = [];
    let paramIndex = 1;

    Object.keys(data).forEach((key) => {
      if (data[key] !== undefined && key !== this.idField) {
        fields.push(`${key} = $${paramIndex}`);
        values.push(data[key]);
        paramIndex++;
      }
    });

    if (fields.length === 0) {
      throw new Error('No hay campos para actualizar');
    }

    fields.push(`user_id_modification = $${paramIndex}`);
    values.push(userId);
    paramIndex++;

    fields.push(`date_time_modification = CURRENT_TIMESTAMP`);

    values.push(id);

    const query = `
      UPDATE ${this.tableName} SET ${fields.join(', ')}
      WHERE ${this.idField} = $${paramIndex}
      RETURNING *
    `;

    const result = await pool.query(query, values);
    return result.rows.length > 0 ? result.rows[0] : null;
  }

  async delete(id, userId) {
    const query = `
      UPDATE ${this.tableName} SET
        status = 'inactive',
        user_id_modification = $1,
        date_time_modification = CURRENT_TIMESTAMP
      WHERE ${this.idField} = $2 AND status = 'active'
      RETURNING ${this.idField}
    `;

    const result = await pool.query(query, [userId, id]);
    return result.rowCount > 0;
  }
}

// Crear instancias para cada catálogo
const gendersModel = new CatalogModel('genders', 'gender_id', 'gender_name');
const bloodTypesModel = new CatalogModel('blood_types', 'blood_type_id', 'blood_type_name');
const documentTypesModel = new CatalogModel('document_types', 'document_type_id', 'type_name');
const maritalStatusesModel = new CatalogModel('marital_statuses', 'marital_status_id', 'status_name');
const identificationTypesModel = new CatalogModel('identification_types', 'identification_type_id', 'type_name');
const medicationUnitsModel = new CatalogModel('medication_units', 'medication_unit_id', 'unit_name');
const userStatusesModel = new CatalogModel('user_statuses', 'user_status_id', 'status_name');
const diagnosisOptionsModel = new CatalogModel('diagnosis_options', 'diagnosis_option_id', 'diagnosis_name');
const appointmentStatusesModel = new CatalogModel('appointment_statuses', 'appointment_status_id', 'status_name');
const budgetStatusesModel = new CatalogModel('budget_statuses', 'budget_status_id', 'status_name');
const treatmentStatusesModel = new CatalogModel('treatment_statuses', 'treatment_status_id', 'status_name');
const treatmentPlanStatusesModel = new CatalogModel('treatment_plan_statuses', 'treatment_plan_status_id', 'status_name');
const reminderTypesModel = new CatalogModel('reminder_types', 'reminder_type_id', 'type_name');
const paymentMethodsModel = new CatalogModel('payment_methods', 'payment_method_id', 'method_name');
const specialtiesModel = new CatalogModel('specialties', 'specialty_id', 'specialty_name');
const toothPositionsModel = new CatalogModel('tooth_positions', 'tooth_position_id', 'position_name');
const toothSurfacesModel = new CatalogModel('tooth_surfaces', 'tooth_surface_id', 'surface_name');
const prescriptionFrequenciesModel = new CatalogModel('prescription_frequencies', 'prescription_frequency_id', 'frequency_name');
const prescriptionDurationsModel = new CatalogModel('prescription_durations', 'prescription_duration_id', 'duration_name');

module.exports = {
  gendersModel,
  bloodTypesModel,
  documentTypesModel,
  maritalStatusesModel,
  identificationTypesModel,
  medicationUnitsModel,
  userStatusesModel,
  diagnosisOptionsModel,
  appointmentStatusesModel,
  budgetStatusesModel,
  treatmentStatusesModel,
  treatmentPlanStatusesModel,
  reminderTypesModel,
  paymentMethodsModel,
  specialtiesModel,
  toothPositionsModel,
  toothSurfacesModel,
  prescriptionFrequenciesModel,
  prescriptionDurationsModel
};
