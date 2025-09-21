const express = require('express');
const router = express.Router();

/**
 * Client route handler
 * @param {Object} clientController - The client controller instance
 * @returns {express.Router} Configured router
 */
function createClientRoutes(clientController) {
  // List all clients
  router.get('/api/clients', (req, res) => {
    const result = clientController.getAllClients();

    if (result.success) {
      res.json({ ok: true, ...result.data });
    } else {
      res.status(result.statusCode || 500).json({
        ok: false,
        error: result.error
      });
    }
  });

  // Get a specific client by ID
  router.get('/api/clients/:id', (req, res) => {
    const { id } = req.params;
    const result = clientController.getClientById(id);

    if (result.success) {
      res.json({ ok: true, ...result.data });
    } else {
      res.status(result.statusCode || 500).json({
        ok: false,
        error: result.error
      });
    }
  });

  // Add a client
  router.post('/api/clients', (req, res) => {
    console.log('POST /api/clients hit!');
    console.log('Received client data:', req.body);

    const result = clientController.createClient(req.body);

    if (result.success) {
      res.status(201).json({ ok: true, ...result.data });
    } else {
      res.status(result.statusCode || 400).json({
        ok: false,
        error: result.error
      });
    }
  });

  // Update a client
  router.put('/api/clients/:id', (req, res) => {
    const { id } = req.params;
    const result = clientController.updateClient(id, req.body);

    if (result.success) {
      res.json({ ok: true, ...result.data });
    } else {
      res.status(result.statusCode || 400).json({
        ok: false,
        error: result.error
      });
    }
  });

  // Delete a client
  router.delete('/api/clients/:id', (req, res) => {
    const { id } = req.params;
    const result = clientController.deleteClient(id);

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

module.exports = createClientRoutes;