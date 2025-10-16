const express = require('express');

/**
 * PDF Generation route handler
 * @param {Object} pdfController - The PDF controller instance
 * @returns {express.Router} Configured router
 */
function createPDFRoutes(pdfController) {
  const router = express.Router();
  // Generate Form 222 PDF (GET endpoint for backwards compatibility)
  router.get('/api/generate-form222/:clientId/:reportId', async (req, res) => {
    const { clientId, reportId } = req.params;
    const result = await pdfController.generateForm222(clientId, reportId);

    if (result.success) {
      res.set({
        'Content-Type': result.data.contentType,
        'Content-Disposition': result.data.disposition
      });
      res.send(result.data.pdfBuffer);
    } else {
      res.status(result.statusCode || 500).json({
        ok: false,
        error: result.error
      });
    }
  });

  // Generate Form 222 PDF
  router.post('/api/generate-form222/:clientId/:reportId', async (req, res) => {
    const { clientId, reportId } = req.params;
    const templatePath = req.body?.templatePath || null;
    const result = await pdfController.generateForm222(clientId, reportId, templatePath);

    if (result.success) {
      res.set({
        'Content-Type': result.data.contentType,
        'Content-Disposition': result.data.disposition
      });
      res.send(result.data.pdfBuffer);
    } else {
      res.status(result.statusCode || 500).json({
        ok: false,
        error: result.error
      });
    }
  });

  // Generate Inventory PDF (GET endpoint for backwards compatibility)
  router.get('/api/generate-inventory/:clientId/:reportId', async (req, res) => {
    const { clientId, reportId } = req.params;
    const result = await pdfController.generateInventory(clientId, reportId);

    if (result.success) {
      res.set({
        'Content-Type': result.data.contentType,
        'Content-Disposition': result.data.disposition
      });
      res.send(result.data.pdfBuffer);
    } else {
      res.status(result.statusCode || 500).json({
        ok: false,
        error: result.error
      });
    }
  });

  // Generate Inventory PDF
  router.post('/api/generate-inventory/:clientId/:reportId', async (req, res) => {
    const { clientId, reportId } = req.params;
    const templatePath = req.body?.templatePath || null;
    const result = await pdfController.generateInventory(clientId, reportId, templatePath);

    if (result.success) {
      res.set({
        'Content-Type': result.data.contentType,
        'Content-Disposition': result.data.disposition
      });
      res.send(result.data.pdfBuffer);
    } else {
      res.status(result.statusCode || 500).json({
        ok: false,
        error: result.error
      });
    }
  });

  // Generate Invoice PDF (GET endpoint for backwards compatibility)
  router.get('/api/generate-invoice/:clientId/:reportId', async (req, res) => {
    const { clientId, reportId } = req.params;
    const result = await pdfController.generateInvoice(clientId, reportId);

    if (result.success) {
      res.set({
        'Content-Type': result.data.contentType,
        'Content-Disposition': result.data.disposition
      });
      res.send(result.data.pdfBuffer);
    } else {
      res.status(result.statusCode || 500).json({
        ok: false,
        error: result.error
      });
    }
  });

  // Generate Invoice PDF
  router.post('/api/generate-invoice/:clientId/:reportId', async (req, res) => {
    const { clientId, reportId } = req.params;
    const templatePath = req.body?.templatePath || null;
    const result = await pdfController.generateInvoice(clientId, reportId, templatePath);

    if (result.success) {
      res.set({
        'Content-Type': result.data.contentType,
        'Content-Disposition': result.data.disposition
      });
      res.send(result.data.pdfBuffer);
    } else {
      res.status(result.statusCode || 500).json({
        ok: false,
        error: result.error
      });
    }
  });

  // POST /api/form222-coordinates - Update Form 222 coordinates
  router.post('/api/form222-coordinates', (req, res) => {
    const result = pdfController.updateCoordinates(req.body);

    if (result.success) {
      res.json({ ok: true, ...result.data });
    } else {
      res.status(result.statusCode || 500).json({
        ok: false,
        error: result.error
      });
    }
  });

  // GET /api/form222-coordinates - Get current Form 222 coordinates
  router.get('/api/form222-coordinates', (req, res) => {
    const result = pdfController.getCoordinates();

    if (result.success) {
      res.json({ ok: true, ...result.data });
    } else {
      res.status(result.statusCode || 500).json({
        ok: false,
        error: result.error
      });
    }
  });

  // Generate coordinate finder PDF (Development tool)
  router.get('/api/form222/coordinate-finder', async (req, res) => {
    const result = await pdfController.generateCoordinateFinderPDF();

    if (result.success) {
      res.set({
        'Content-Type': result.data.contentType,
        'Content-Disposition': result.data.disposition
      });
      res.send(result.data.pdfBuffer);
    } else {
      res.status(result.statusCode || 500).json({
        ok: false,
        error: result.error
      });
    }
  });

  return router;
}

module.exports = createPDFRoutes;