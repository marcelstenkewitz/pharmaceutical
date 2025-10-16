const express = require('express');
const router = express.Router();

/**
 * Manufacturer route handler
 * @param {Object} manufacturerController - The manufacturer controller instance
 * @returns {express.Router} Configured router
 */
function createManufacturerRoutes(manufacturerController) {
  // Get all manufacturers
  router.get('/api/manufacturers', (req, res) => {
    const result = manufacturerController.getAllManufacturers();

    if (result.success) {
      res.json({ ok: true, ...result.data });
    } else {
      res.status(result.statusCode || 500).json({
        ok: false,
        error: result.error
      });
    }
  });

  // Add or update manufacturer
  router.post('/api/manufacturers', (req, res) => {
    const result = manufacturerController.createOrUpdateManufacturer(req.body);

    if (result.success) {
      res.status(201).json({ ok: true, ...result.data });
    } else {
      res.status(result.statusCode || 500).json({
        ok: false,
        error: result.error
      });
    }
  });

  // Get a specific manufacturer
  router.get('/api/manufacturers/:name', (req, res) => {
    const { name } = req.params;
    const result = manufacturerController.getManufacturerByName(name);

    if (result.success) {
      res.json({ ok: true, ...result.data });
    } else {
      res.status(result.statusCode || 500).json({
        ok: false,
        error: result.error
      });
    }
  });

  // Delete a manufacturer
  router.delete('/api/manufacturers/:name', (req, res) => {
    const { name } = req.params;
    const result = manufacturerController.deleteManufacturerByName(name);

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

module.exports = createManufacturerRoutes;
