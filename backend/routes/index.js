// Import all route creators
const createHealthRoutes = require('./healthRoutes');
const createClientRoutes = require('./clientRoutes');
const createReportRoutes = require('./reportRoutes');
const createManualEntryRoutes = require('./manualEntryRoutes');
const createLabelerRoutes = require('./labelerRoutes');
const createWholesalerRoutes = require('./wholesalerRoutes');
const createCompanySettingsRoutes = require('./companySettingsRoutes');
const createPDFRoutes = require('./pdfRoutes');

/**
 * Register all routes with the Express app
 * @param {Object} app - Express application instance
 * @param {Object} controllers - Object containing all controller instances
 */
function registerRoutes(app, controllers) {
  const {
    healthController,
    clientController,
    reportController,
    manualEntryController,
    labelerController,
    wholesalerController,
    companySettingsController,
    pdfController
  } = controllers;

  // Register all routes
  app.use(createHealthRoutes(healthController));
  app.use(createClientRoutes(clientController));
  app.use(createReportRoutes(reportController));
  app.use(createManualEntryRoutes(manualEntryController));
  app.use(createLabelerRoutes(labelerController));
  app.use(createWholesalerRoutes(wholesalerController));
  app.use(createCompanySettingsRoutes(companySettingsController));
  app.use(createPDFRoutes(pdfController));

  console.log('✅ All routes registered successfully');
}

module.exports = { registerRoutes };