const express = require('express');
const router = express.Router();

/**
 * Labeler route handler
 * @param {Object} labelerController - The labeler controller instance
 * @returns {express.Router} Configured router
 */
function createLabelerRoutes(labelerController) {
  // Get all labelers
  router.get('/api/labelers', (req, res) => {
    const result = labelerController.getAllLabelers();

    if (result.success) {
      res.json({ ok: true, ...result.data });
    } else {
      res.status(result.statusCode || 500).json({
        ok: false,
        error: result.error
      });
    }
  });

  // Add or update labeler
  router.post('/api/labelers', (req, res) => {
    const result = labelerController.createOrUpdateLabeler(req.body);

    if (result.success) {
      res.status(201).json({ ok: true, ...result.data });
    } else {
      res.status(result.statusCode || 500).json({
        ok: false,
        error: result.error
      });
    }
  });

  // Get return instructions for a specific labeler
  router.get('/api/labelers/:labeler_name', (req, res) => {
    const { labeler_name } = req.params;
    const result = labelerController.getLabelerByName(labeler_name);

    if (result.success) {
      res.json({ ok: true, ...result.data });
    } else {
      res.status(result.statusCode || 500).json({
        ok: false,
        error: result.error
      });
    }
  });

  // Delete a labeler
  router.delete('/api/labelers/:labeler_name', (req, res) => {
    const { labeler_name } = req.params;
    const result = labelerController.deleteLabelerByName(labeler_name);

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

module.exports = createLabelerRoutes;