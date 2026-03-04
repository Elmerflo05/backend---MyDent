const express = require('express');
const router = express.Router();
const verificarToken = require('../middleware/authMiddleware');
const {
  getPublicForms,
  getPublicForm,
  createNewPublicForm,
  updateExistingPublicForm,
  deleteExistingPublicForm,
  getFormSubmissions,
  getFormSubmission,
  createNewFormSubmission,
  updateExistingFormSubmission,
  deleteExistingFormSubmission
} = require('../controllers/publicFormsController');

const verificarRolesPermitidos = (req, res, next) => {
  const rol = req.user?.role_id;
  if (![1, 2, 3, 4, 5, 6].includes(rol)) {
    return res.status(403).json({ mensaje: 'Acceso denegado: Rol no autorizado' });
  }
  next();
};

// Forms (require auth)
router.get('/forms', verificarToken, verificarRolesPermitidos, getPublicForms);
router.get('/forms/:id', verificarToken, verificarRolesPermitidos, getPublicForm);
router.post('/forms', verificarToken, verificarRolesPermitidos, createNewPublicForm);
router.put('/forms/:id', verificarToken, verificarRolesPermitidos, updateExistingPublicForm);
router.delete('/forms/:id', verificarToken, verificarRolesPermitidos, deleteExistingPublicForm);

// Submissions (public endpoint for submissions, auth for viewing)
router.post('/submissions', createNewFormSubmission); // Public - no auth
router.get('/submissions', verificarToken, verificarRolesPermitidos, getFormSubmissions);
router.get('/submissions/:id', verificarToken, verificarRolesPermitidos, getFormSubmission);
router.put('/submissions/:id', verificarToken, verificarRolesPermitidos, updateExistingFormSubmission);
router.delete('/submissions/:id', verificarToken, verificarRolesPermitidos, deleteExistingFormSubmission);

module.exports = router;
