const {
  getAllTreatmentNotes,
  getTreatmentNoteById,
  createTreatmentNote,
  updateTreatmentNote,
  deleteTreatmentNote,
  countTreatmentNotes
} = require('../models/treatmentNotesModel');

const getTreatmentNotes = async (req, res) => {
  try {
    const {
      treatment_id,
      patient_id,
      dentist_id,
      branch_id,
      note_type,
      date_from,
      date_to,
      page = 1,
      limit = 20
    } = req.query;

    const filters = {
      treatment_id: treatment_id ? parseInt(treatment_id) : null,
      patient_id: patient_id ? parseInt(patient_id) : null,
      dentist_id: dentist_id ? parseInt(dentist_id) : null,
      branch_id: branch_id ? parseInt(branch_id) : null,
      note_type,
      date_from,
      date_to,
      limit: parseInt(limit),
      offset: (parseInt(page) - 1) * parseInt(limit)
    };

    const [notes, total] = await Promise.all([
      getAllTreatmentNotes(filters),
      countTreatmentNotes(filters)
    ]);

    res.json({
      success: true,
      data: notes,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Error al obtener notas de tratamiento:', error);
    res.status(500).json({
      success: false,
      error: 'Error al obtener notas de tratamiento'
    });
  }
};

const getTreatmentNote = async (req, res) => {
  try {
    const { id } = req.params;
    const note = await getTreatmentNoteById(parseInt(id));

    if (!note) {
      return res.status(404).json({
        success: false,
        error: 'Nota de tratamiento no encontrada'
      });
    }

    res.json({
      success: true,
      data: note
    });
  } catch (error) {
    console.error('Error al obtener nota de tratamiento:', error);
    res.status(500).json({
      success: false,
      error: 'Error al obtener nota de tratamiento'
    });
  }
};

const createNewTreatmentNote = async (req, res) => {
  try {
    const noteData = {
      ...req.body,
      user_id_registration: req.user.user_id
    };

    if (!noteData.treatment_id || !noteData.note_content) {
      return res.status(400).json({
        success: false,
        error: 'Faltan campos requeridos'
      });
    }

    const newNote = await createTreatmentNote(noteData);

    res.status(201).json({
      success: true,
      message: 'Nota de tratamiento creada exitosamente',
      data: newNote
    });
  } catch (error) {
    console.error('Error al crear nota de tratamiento:', error);
    res.status(500).json({
      success: false,
      error: 'Error al crear nota de tratamiento'
    });
  }
};

const updateExistingTreatmentNote = async (req, res) => {
  try {
    const { id } = req.params;
    const noteData = {
      ...req.body,
      user_id_modification: req.user.user_id
    };

    const updatedNote = await updateTreatmentNote(parseInt(id), noteData);

    if (!updatedNote) {
      return res.status(404).json({
        success: false,
        error: 'Nota de tratamiento no encontrada'
      });
    }

    res.json({
      success: true,
      message: 'Nota de tratamiento actualizada exitosamente',
      data: updatedNote
    });
  } catch (error) {
    console.error('Error al actualizar nota de tratamiento:', error);
    res.status(500).json({
      success: false,
      error: 'Error al actualizar nota de tratamiento'
    });
  }
};

const deleteExistingTreatmentNote = async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await deleteTreatmentNote(parseInt(id), req.user.user_id);

    if (!deleted) {
      return res.status(404).json({
        success: false,
        error: 'Nota de tratamiento no encontrada'
      });
    }

    res.json({
      success: true,
      message: 'Nota de tratamiento eliminada exitosamente'
    });
  } catch (error) {
    console.error('Error al eliminar nota de tratamiento:', error);
    res.status(500).json({
      success: false,
      error: 'Error al eliminar nota de tratamiento'
    });
  }
};

module.exports = {
  getTreatmentNotes,
  getTreatmentNote,
  createNewTreatmentNote,
  updateExistingTreatmentNote,
  deleteExistingTreatmentNote
};
