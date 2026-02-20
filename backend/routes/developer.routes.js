/**
 * DEVELOPER PORTAL ROUTES
 *
 * Public — no JWT auth required.
 * Mounted at /api/developer in routes/index.js.
 *
 * Endpoints:
 *   POST /api/developer/request-access   Submit API key request form
 */

'use strict';

const express   = require('express');
const router    = express.Router();
const devCtrl   = require('../controllers/developer.controller');

/**
 * @route POST /api/developer/request-access
 * @desc  Accept an external API key request from the developer portal form.
 *        Logs the request and notifies the sales team by email.
 * @access Public (no auth)
 */
router.post('/request-access', devCtrl.requestAccess);

module.exports = router;
