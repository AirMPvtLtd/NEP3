const express = require('express');
const router = express.Router();

const { calculateStudentSPI } = require('../controllers/spi.controller');

// ✅ SAME AS admin.routes.js
const { authenticate, authorize } = require('../middleware/auth.middleware');

router.post(
  '/calculate/:studentId',
  authenticate,
  authorize('admin', 'system'),
  calculateStudentSPI
);

module.exports = router;
