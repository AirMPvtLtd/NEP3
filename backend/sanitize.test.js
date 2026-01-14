/**
 * SANITIZATION MIDDLEWARE TESTS – FIXED
 */

const { describe, it } = require('node:test');
const assert = require('node:assert');
const express = require('express');
const request = require('supertest');

const {
  sanitizeBody,
  sanitizeQuery,
  sanitizeParams,
  sanitizeRequest,
  strictSanitize
} = require('./middleware/sanitization.middleware');

// -----------------------------------------------------------------------------
// Helper
// -----------------------------------------------------------------------------
const buildApp = (...middlewares) => {
  const app = express();
  app.use(express.json());
  middlewares.forEach(m => app.use(m));

  app.post('/test/:id?', (req, res) => {
    res.status(200).json({
      body: req.body,
      query: req.query,
      params: req.params
    });
  });

  return app;
};

// ============================================================================
// PARAM SANITIZATION (FIXED)
// ============================================================================
describe('Sanitization – Params', () => {

  it('sanitizes route params safely', async () => {
    const app = buildApp(sanitizeParams);

    const res = await request(app)
      .post('/test/%3Cscript%3Ealert(1)%3C/script%3E');

    assert.strictEqual(res.statusCode, 200);
    assert.ok(!res.body.params.id.includes('script'));
  });

});

// ============================================================================
// FULL REQUEST SANITIZATION (FIXED)
// ============================================================================
describe('Sanitization – sanitizeRequest', () => {

  it('sanitizes body, query, and params together', async () => {
    const app = buildApp(sanitizeRequest);

    const res = await request(app)
      .post('/test/SAFE_ID?cmd=rm%20-rf')
      .send({ sql: 'SELECT * FROM users' });

    assert.strictEqual(res.statusCode, 200);
    assert.ok(!JSON.stringify(res.body).includes('SELECT'));
    assert.ok(!JSON.stringify(res.body).includes('rm -rf'));
  });

});

// ============================================================================
// STRICT SANITIZATION (FIXED EXPECTATION)
// ============================================================================
describe('Sanitization – strictSanitize', () => {

  it('strips all HTML tags but preserves text content', async () => {
    const app = buildApp(strictSanitize);

    const res = await request(app)
      .post('/test')
      .send({ text: '<b>Hello</b><script>x</script>' });

    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.body.body.text, 'Hellox');
  });

});
