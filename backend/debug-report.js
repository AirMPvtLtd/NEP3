// test-isolated.js
console.log('=== TESTING IN ISOLATION ===\n');

// Test 1: Import controller directly
console.log('1. Importing controller directly...');
try {
  const controller = require('./controllers/report.controller');
  console.log('✓ Controller imported');
  console.log('   generateNEPReport type:', typeof controller.generateNEPReport);
  console.log('   Is function?', typeof controller.generateNEPReport === 'function');
} catch (error) {
  console.log('✗ Controller import failed:', error.message);
}

// Test 2: Import routes with simplified controller
console.log('\n2. Creating simplified controller...');
const simpleController = {
  generateNEPReport: (req, res) => res.json({ test: 'simple' }),
  verifyNEPReport: (req, res) => res.json({ test: 'verify' })
};

// Save it temporarily
require('fs').writeFileSync(
  './controllers/test-simple-controller.js',
  'module.exports = ' + JSON.stringify(simpleController, null, 2).replace(/"\(/g, '(').replace(/\)"/g, ')')
    .replace(/"generateNEPReport": "\(/g, '"generateNEPReport": (')
    .replace(/\)"/g, ')')
    .replace(/"verifyNEPReport": "\(/g, '"verifyNEPReport": (')
);

// Test 3: Create simplified routes
console.log('\n3. Creating simplified routes...');
const simpleRoutes = `
const express = require('express');
const router = express.Router();
const controller = require('../controllers/test-simple-controller');

router.post('/test', controller.generateNEPReport);
router.get('/test/:id', controller.verifyNEPReport);

module.exports = router;
`;

require('fs').writeFileSync('./routes/test-simple-routes.js', simpleRoutes);

// Test 4: Try to import simplified routes
console.log('\n4. Importing simplified routes...');
try {
  const routes = require('./routes/test-simple-routes');
  console.log('✓ Simplified routes imported');
  console.log('   Type:', typeof routes);
} catch (error) {
  console.log('✗ Simplified routes failed:', error.message);
  console.log('   Stack:', error.stack.split('\n')[0]);
}

// Cleanup
require('fs').unlinkSync('./controllers/test-simple-controller.js');
require('fs').unlinkSync('./routes/test-simple-routes.js');