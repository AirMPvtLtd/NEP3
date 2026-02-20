/**
 * middleware/seo.middleware.js
 *
 * SEO HTTP headers applied at the Express layer:
 *
 *   1. X-Robots-Tag: noindex  — on all /api/* responses (JSON not meant to be indexed)
 *   2. Link: rel=canonical    — on HTML page responses so the canonical URL is in headers
 *      (backup for pages where JS or CDN might strip <link rel="canonical"> from <head>)
 *
 * Applied in app.js BEFORE routes.
 */

'use strict';

const DOMAIN = 'https://tryspyral.com';

// Pages that have canonical URLs (must match pages.routes.js)
const CANONICAL_MAP = {
  '/':            `${DOMAIN}/`,
  '/workbench':   `${DOMAIN}/workbench`,
  '/nep':         `${DOMAIN}/nep`,
  '/spyral':      `${DOMAIN}/spyral`,
  '/contact':     `${DOMAIN}/contact`,
  '/developer':   `${DOMAIN}/developer`,
};

/**
 * seoHeaders()
 * - Adds X-Robots-Tag: noindex on /api/* (prevents API JSON from appearing in search)
 * - Adds Link: <canonical>; rel="canonical" header for known public pages
 */
function seoHeaders(req, res, next) {
  const path = req.path;

  // API responses should never be indexed
  if (path.startsWith('/api/')) {
    res.setHeader('X-Robots-Tag', 'noindex, nofollow');
    return next();
  }

  // Dashboard, auth, and tool pages should not be indexed
  const privatePatterns = [
    /^\/dashboard\//,
    /^\/admin(\/|$)/,
    /^\/teacher(\/|$)/,
    /^\/student(\/|$)/,
    /^\/parent(\/|$)/,
    /^\/login(\/|$)/,
    /^\/reset-password(\/|$)/,
    /^\/challenge(\/|$)/,
    /^\/sim\//,
    /^\/math-lab(\/|$)/,
    /^\/evaluation(\/|$)/,
    /^\/inquiry-lab(\/|$)/,
    /^\/practice(\/|$)/,
    /^\/projects(\/|$)/,
    /^\/journal(\/|$)/,
    /^\/vocational(\/|$)/,
  ];

  if (privatePatterns.some(rx => rx.test(path))) {
    res.setHeader('X-Robots-Tag', 'noindex, nofollow');
    return next();
  }

  // Add canonical Link header for known public pages
  // Normalise path (strip trailing slash except root)
  const normalised = path === '/' ? '/' : path.replace(/\/$/, '');
  const canonical  = CANONICAL_MAP[normalised];
  if (canonical) {
    res.setHeader('Link', `<${canonical}>; rel="canonical"`);
  }

  next();
}

module.exports = { seoHeaders };
