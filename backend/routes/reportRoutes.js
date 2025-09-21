const express = require('express');
const router = express.Router();

/**
 * Report route handler
 * @param {Object} reportController - The report controller instance
 * @returns {express.Router} Configured router
 */
function createReportRoutes(reportController) {
  // Create a new report for a client
  router.post('/api/clients/:id/reports/new', (req, res) => {
    const { id } = req.params;
    console.log(`Creating new report for client: ${id}`);

    const result = reportController.createNewReport(id, req.body);

    if (result.success) {
      res.status(201).json({ ok: true, ...result.data });
    } else {
      res.status(result.statusCode || 500).json({
        ok: false,
        error: result.error
      });
    }
  });

  // Add report to client OR add line item to existing report
  router.post('/api/clients/:id/reports', (req, res) => {
    const { id } = req.params;
    console.log(`Adding line item to client: ${id}, reportId: ${req.body.reportId}`);

    const result = reportController.addLineItemLegacy(id, req.body);

    if (result.success) {
      res.status(201).json({ ok: true, ...result.data });
    } else {
      res.status(result.statusCode || 400).json({
        ok: false,
        error: result.error
      });
    }
  });

  // Get reports for a client
  router.get('/api/clients/:id/reports', (req, res) => {
    const { id } = req.params;
    const result = reportController.getClientReports(id);

    if (result.success) {
      res.json({ ok: true, ...result.data });
    } else {
      res.status(result.statusCode || 500).json({
        ok: false,
        error: result.error
      });
    }
  });

  // Add an item to a report
  router.post('/api/clients/:id/reports/:reportId/items', (req, res) => {
    const { id, reportId } = req.params;
    const result = reportController.addLineItemToReport(id, reportId, req.body);

    if (result.success) {
      res.status(201).json({ ok: true, ...result.data });
    } else {
      res.status(result.statusCode || 500).json({
        ok: false,
        error: result.error
      });
    }
  });

  // Update an item in a report
  router.put('/api/clients/:id/reports/:reportId/items/:itemId', (req, res) => {
    const { id, reportId, itemId } = req.params;
    const result = reportController.updateLineItem(id, reportId, itemId, req.body);

    if (result.success) {
      res.json({ ok: true, ...result.data });
    } else {
      res.status(result.statusCode || 500).json({
        ok: false,
        error: result.error
      });
    }
  });

  // Delete an item from a report
  router.delete('/api/clients/:id/reports/:reportId/items/:itemId', (req, res) => {
    const { id, reportId, itemId } = req.params;
    const result = reportController.deleteLineItem(id, reportId, itemId);

    if (result.success) {
      res.json({ ok: true });
    } else {
      res.status(result.statusCode || 500).json({
        ok: false,
        error: result.error
      });
    }
  });

  // Delete a report from a client
  router.delete('/api/clients/:id/reports/:reportId', (req, res) => {
    const { id, reportId } = req.params;
    const result = reportController.deleteReport(id, reportId);

    if (result.success) {
      res.json({ ok: true });
    } else {
      res.status(result.statusCode || 500).json({
        ok: false,
        error: result.error
      });
    }
  });

  return router;
}

module.exports = createReportRoutes;