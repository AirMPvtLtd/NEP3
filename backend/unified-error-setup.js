
// unified-error-setup.js
// Add this to your main app file (app.js, server.js, or index.js)

const { initializeErrorHandlers } = require('./middleware/errorHandler.middleware');

// Initialize global error handlers
initializeErrorHandlers();

console.log('✅ Error handlers initialized');
