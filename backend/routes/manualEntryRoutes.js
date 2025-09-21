const express = require('express');
const router = express.Router();

/**
 * Manual Entry route handler
 * @param {Object} manualEntryController - The manual entry controller instance
 * @returns {express.Router} Configured router
 */
function createManualEntryRoutes(manualEntryController) {
  // Get manual entry by barcode
  router.get('/api/manual-entries/:barcode', (req, res) => {
    const { barcode } = req.params;
    const result = manualEntryController.getByBarcode(barcode);

    if (result.success) {
      res.json({ ok: true, ...result.data });
    } else {
      res.status(result.statusCode || 500).json({
        ok: false,
        error: result.error
      });
    }
  });

  // Create or update manual entry
  router.post('/api/manual-entries', (req, res) => {
    const result = manualEntryController.createOrUpdate(req.body);

    if (result.success) {
      res.json({ ok: true, ...result.data });
    } else {
      res.status(result.statusCode || 500).json({
        ok: false,
        error: result.error
      });
    }
  });

  // Get all manual entries
  router.get('/api/manual-entries', (req, res) => {
    const result = manualEntryController.getAll();

    if (result.success) {
      res.json({ ok: true, ...result.data });
    } else {
      res.status(result.statusCode || 500).json({
        ok: false,
        error: result.error
      });
    }
  });

  // Delete manual entry by barcode
  router.delete('/api/manual-entries/:barcode', (req, res) => {
    const { barcode } = req.params;
    const result = manualEntryController.deleteByBarcode(barcode);

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

module.exports = createManualEntryRoutes;