const express = require('express');
const router = express.Router();
const { login, registerPatient, registerExternalClient, changeOwnPassword, changeExpiredPassword } = require('../controllers/authController');
const verificarToken = require('../middleware/authMiddleware');

// POST /api/auth/login
router.post('/login', login);

// POST /api/auth/register-patient
router.post('/register-patient', registerPatient);

// POST /api/auth/register-external-client
router.post('/register-external-client', registerExternalClient);

// POST /api/auth/change-password (requiere autenticación)
router.post('/change-password', verificarToken, changeOwnPassword);

// POST /api/auth/change-expired-password (no requiere autenticación - para contraseñas expiradas)
router.post('/change-expired-password', changeExpiredPassword);

module.exports = router;
