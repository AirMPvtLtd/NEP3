/**
 * SEO CONTROLLER
 *
 * Serves sitemap.xml dynamically so new pages are added in one place.
 * robots.txt is served as a static file from frontend/robots.txt.
 */

'use strict';

const DOMAIN = 'https://tryspyral.com';

// ── Sitemap entries ────────────────────────────────────────────────────────────
// priority: 0.0–1.0  |  changefreq: always, hourly, daily, weekly, monthly, yearly, never

const STATIC_PAGES = [
  {
    loc:        '/',
    changefreq: 'weekly',
    priority:   '1.0',
    // Home — most important page
  },
  {
    loc:        '/workbench',
    changefreq: 'weekly',
    priority:   '0.9',
  },
  {
    loc:        '/spyral',
    changefreq: 'monthly',
    priority:   '0.8',
    // Technology deep-dive — high-value long-form content
  },
  {
    loc:        '/nep',
    changefreq: 'monthly',
    priority:   '0.7',
    // Educational content about NEP 2020
  },
  {
    loc:        '/contact',
    changefreq: 'monthly',
    priority:   '0.5',
  },
  {
    loc:        '/developer',
    changefreq: 'monthly',
    priority:   '0.6',
    // Research API developer documentation
  },
];

// ── Helpers ───────────────────────────────────────────────────────────────────

function escapeXml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function buildSitemapXml(pages) {
  const now = new Date().toISOString().slice(0, 10); // YYYY-MM-DD

  const urlNodes = pages.map(p => `
  <url>
    <loc>${escapeXml(DOMAIN + p.loc)}</loc>
    <lastmod>${now}</lastmod>
    <changefreq>${escapeXml(p.changefreq)}</changefreq>
    <priority>${escapeXml(p.priority)}</priority>
  </url>`).join('');

  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urlNodes}\n</urlset>`;
}

// ── Controllers ───────────────────────────────────────────────────────────────

/**
 * GET /sitemap.xml
 * Returns the XML sitemap for all public indexable pages.
 */
exports.getSitemap = (req, res) => {
  const xml = buildSitemapXml(STATIC_PAGES);
  res.setHeader('Content-Type', 'application/xml; charset=utf-8');
  res.setHeader('Cache-Control', 'public, max-age=86400'); // cache 24h
  res.send(xml);
};

/**
 * GET /sitemap-index.xml
 * Sitemap index — ready for when you have multiple sitemaps (blog posts, schools, etc.)
 * Currently wraps the single sitemap.
 */
exports.getSitemapIndex = (req, res) => {
  const now = new Date().toISOString().slice(0, 10);
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <sitemap>
    <loc>${DOMAIN}/sitemap.xml</loc>
    <lastmod>${now}</lastmod>
  </sitemap>
</sitemapindex>`;

  res.setHeader('Content-Type', 'application/xml; charset=utf-8');
  res.setHeader('Cache-Control', 'public, max-age=86400');
  res.send(xml);
};
