const express = require('express');
const router = express.Router();

/**
 * Health route handler
 * @param {Object} healthController - The health controller instance
 * @returns {express.Router} Configured router
 */
function createHealthRoutes(healthController) {
  // Health check endpoint
  router.get('/api/health', (req, res) => {
    const result = healthController.getHealth();

    if (result.success) {
      res.json({ ok: true, ...result.data });
    } else {
      res.status(result.statusCode || 500).json({
        ok: false,
        error: result.error
      });
    }
  });

  return router;
}

module.exports = createHealthRoutes;