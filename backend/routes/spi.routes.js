// routes/spi.routes.js
const express = require('express');
const router = express.Router();
const { calculateStudentSPI } = require('../controllers/spi.controller');
const authenticate = require('../middleware/auth.middleware');
const authorize = require('../middleware/role.middleware');

router.post(
  '/calculate/:studentId',
  authenticate,
  authorize(['admin', 'system']),
  calculateStudentSPI
);

module.exports = router;
