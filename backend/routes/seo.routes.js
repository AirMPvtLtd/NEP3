/**
 * SEO ROUTES
 *
 * Public, no authentication required.
 * Mounted directly on app (not under /api prefix) so search engines
 * can find these at the root of the domain.
 *
 * Mounted in app.js (before the main /api router):
 *   app.use(require('./routes/seo.routes'));
 */

'use strict';

const express    = require('express');
const router     = express.Router();
const seoCtrl    = require('../controllers/seo.controller');

/**
 * @route GET /sitemap.xml
 * @desc  XML sitemap for all public indexable pages
 * @cache 24h
 */
router.get('/sitemap.xml', seoCtrl.getSitemap);

/**
 * @route GET /sitemap-index.xml
 * @desc  Sitemap index (ready for multi-sitemap expansion)
 */
router.get('/sitemap-index.xml', seoCtrl.getSitemapIndex);

module.exports = router;
