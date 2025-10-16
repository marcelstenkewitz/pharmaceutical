const express = require('express');

/**
 * Company Settings route handler
 * @param {Object} companySettingsController - The company settings controller instance
 * @returns {express.Router} Configured router
 */
function createCompanySettingsRoutes(companySettingsController) {
  const router = express.Router();

  // Get company settings
  router.get('/api/company-settings', (req, res) => {
    companySettingsController.getSettings(req, res);
  });

  // Update company settings
  router.put('/api/company-settings', (req, res) => {
    companySettingsController.updateSettings(req, res);
  });

  return router;
}

module.exports = createCompanySettingsRoutes;
