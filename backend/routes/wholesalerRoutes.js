const express = require('express');
const router = express.Router();

/**
 * Wholesaler route handler
 * @param {Object} wholesalerController - The wholesaler controller instance
 * @returns {express.Router} Configured router
 */
function createWholesalerRoutes(wholesalerController) {
  // Get all wholesalers
  router.get('/api/wholesalers', (req, res) => {
    const result = wholesalerController.getAllWholesalers();

    if (result.success) {
      res.json({ ok: true, ...result.data });
    } else {
      res.status(result.statusCode || 500).json({
        ok: false,
        error: result.error
      });
    }
  });

  // Add or update wholesaler
  router.post('/api/wholesalers', (req, res) => {
    const result = wholesalerController.createOrUpdateWholesaler(req.body);

    if (result.success) {
      res.status(201).json({ ok: true, ...result.data });
    } else {
      res.status(result.statusCode || 500).json({
        ok: false,
        error: result.error
      });
    }
  });

  // Get a specific wholesaler
  router.get('/api/wholesalers/:name', (req, res) => {
    const { name } = req.params;
    const result = wholesalerController.getWholesalerByName(name);

    if (result.success) {
      res.json({ ok: true, ...result.data });
    } else {
      res.status(result.statusCode || 500).json({
        ok: false,
        error: result.error
      });
    }
  });

  // Delete a wholesaler
  router.delete('/api/wholesalers/:name', (req, res) => {
    const { name } = req.params;
    const result = wholesalerController.deleteWholesalerByName(name);

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

module.exports = createWholesalerRoutes;
