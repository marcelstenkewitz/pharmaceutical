
const express = require('express');
const fs = require('fs');
const path = require('path');
const cors = require('cors');
const { generateForm222PDF, updateForm222Coordinates, getForm222Coordinates } = require('./utils/pdfGenerator');

const PORT = process.env.PORT || 3001;
const HOST = process.env.HOST || '0.0.0.0';
const DATA_FILE = path.join(__dirname, 'reports.json');

const app = express();
app.use(cors({ 
  origin: 'http://localhost:3000'
}));
app.use(express.json({ limit: '2mb' }));

// --- CLIENT CRUD & REPORT ATTACHMENT (clients.json) ---
const CLIENTS_FILE = path.join(__dirname, 'clients.json');
const MANUAL_ENTRIES_FILE = path.join(__dirname, 'manual-entries.json');
const LABELERS_FILE = path.join(__dirname, 'labelers.json');

function readClients() {
  try {
    return JSON.parse(fs.readFileSync(CLIENTS_FILE, 'utf8'));
  } catch {
    return [];
  }
}

function writeClients(clients) {
  fs.writeFileSync(CLIENTS_FILE, JSON.stringify(clients, null, 2), 'utf8');
}

function readManualEntries() {
  try {
    return JSON.parse(fs.readFileSync(MANUAL_ENTRIES_FILE, 'utf8'));
  } catch {
    return {};
  }
}

function writeManualEntries(entries) {
  fs.writeFileSync(MANUAL_ENTRIES_FILE, JSON.stringify(entries, null, 2), 'utf8');
}

function readLabelers() {
  try {
    return JSON.parse(fs.readFileSync(LABELERS_FILE, 'utf8'));
  } catch {
    return [];
  }
}

function writeLabelers(labelers) {
  fs.writeFileSync(LABELERS_FILE, JSON.stringify(labelers, null, 2), 'utf8');
}

// List all clients
app.get('/api/clients', (_req, res) => {
  res.json({ ok: true, clients: readClients() });
});

// Add a client
app.post('/api/clients', (req, res) => {
  console.log('POST /api/clients hit!');
  console.log('Received client data:', req.body);
  const { businessName, deaNumber, streetAddress, city, state, zipCode } = req.body || {};
  if (!businessName || !deaNumber || !streetAddress || !city || !state || !zipCode) {
    console.log('Missing fields:', { businessName: !!businessName, deaNumber: !!deaNumber, streetAddress: !!streetAddress, city: !!city, state: !!state, zipCode: !!zipCode });
    return res.status(400).json({ ok: false, error: 'All fields are required: businessName, deaNumber, streetAddress, city, state, zipCode' });
  }
  const clients = readClients();
  const id = Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  const client = { 
    id, 
    name: businessName, // Use businessName as the display name
    businessName,
    deaNumber,
    streetAddress,
    city,
    state,
    zipCode,
    reports: [] 
  };
  clients.push(client);
  writeClients(clients);
  res.json({ ok: true, client });
});

// Update a client
app.put('/api/clients/:id', (req, res) => {
  const { id } = req.params;
  const { businessName, deaNumber, streetAddress, city, state, zipCode } = req.body || {};
  const clients = readClients();
  const client = clients.find(c => c.id === id);
  if (!client) return res.status(404).json({ ok: false, error: 'client not found' });
  if (businessName !== undefined) {
    client.businessName = businessName;
    client.name = businessName; // Keep name in sync with businessName
  }
  if (deaNumber !== undefined) client.deaNumber = deaNumber;
  if (streetAddress !== undefined) client.streetAddress = streetAddress;
  if (city !== undefined) client.city = city;
  if (state !== undefined) client.state = state;
  if (zipCode !== undefined) client.zipCode = zipCode;
  writeClients(clients);
  res.json({ ok: true, client });
});

// Delete a client
app.delete('/api/clients/:id', (req, res) => {
  const { id } = req.params;
  let clients = readClients();
  const idx = clients.findIndex(c => c.id === id);
  if (idx === -1) return res.status(404).json({ ok: false, error: 'client not found' });
  clients.splice(idx, 1);
  writeClients(clients);
  res.json({ ok: true });
});

// Create a new report for a client
app.post('/api/clients/:id/reports/new', (req, res) => {
  const { id } = req.params;
  console.log('POST /api/clients/:id/reports/new hit!');
  console.log('Creating new report for client ID:', id);
  
  const clients = readClients();
  const client = clients.find(c => c.id === id);
  if (!client) {
    console.log('Client not found for ID:', id);
    return res.status(404).json({ ok: false, error: 'client not found' });
  }
  
  // Initialize reports array if it doesn't exist
  if (!client.reports) {
    client.reports = [];
  }
  
  const newReport = {
    id: Date.now().toString(36) + Math.random().toString(36).slice(2, 8),
    createdAt: new Date().toISOString(),
    lineItems: []
  };
  
  client.reports.push(newReport);
  writeClients(clients);
  console.log('New report created:', newReport.id);
  res.json({ ok: true, report: newReport });
});

// Add a line item to a client's current report (create new report if none exists)
app.post('/api/clients/:id/reports', (req, res) => {
  const { id } = req.params;
  const form222LineItem = req.body;
  console.log('POST /api/clients/:id/reports hit!');
  console.log('Client ID:', id);
  console.log('Received line item data:', JSON.stringify(form222LineItem, null, 2));
  console.log('Line item data type checks:', {
    hasForm222: !!form222LineItem,
    packagesType: typeof form222LineItem?.packages,
    packagesValue: form222LineItem?.packages,
    hasItemName: !!form222LineItem?.itemName,
    itemNameValue: form222LineItem?.itemName
  });
  
  // Enhanced validation for Form222Model line item fields
  const validationErrors = [];
  
  if (!form222LineItem) {
    validationErrors.push("Line item data is required");
  } else {
    if (!form222LineItem.itemName || form222LineItem.itemName.trim() === "" || form222LineItem.itemName === "Unknown item") {
      validationErrors.push("Item name is required and cannot be 'Unknown item'");
    }
    
    if (!form222LineItem.packageSize || form222LineItem.packageSize.trim() === "" || form222LineItem.packageSize === "UNKNOWN") {
      validationErrors.push("Package size is required and cannot be 'UNKNOWN'");
    }
    
    if (!form222LineItem.ndc11 || form222LineItem.ndc11.trim() === "") {
      validationErrors.push("NDC-11 code is required");
    }
    
    if (!form222LineItem.packages || typeof form222LineItem.packages !== 'number' || form222LineItem.packages <= 0) {
      validationErrors.push("Quantity (packages) must be a positive number");
    }
    
    if (!form222LineItem.labeler_name || form222LineItem.labeler_name.trim() === "") {
      validationErrors.push("Labeler name is required");
    }
  }
  
  if (validationErrors.length > 0) {
    console.log('Validation failed with errors:', validationErrors);
    return res.status(400).json({ ok: false, error: 'Validation failed', errors: validationErrors });
  }
  
  const clients = readClients();
  const client = clients.find(c => c.id === id);
  if (!client) {
    console.log('Client not found for ID:', id);
    return res.status(404).json({ ok: false, error: 'client not found' });
  }
  console.log('Found client:', client.businessName || client.name);
  
  // Initialize reports array if it doesn't exist
  if (!client.reports) {
    client.reports = [];
  }
  
  // Find the current active report (most recent) or use the one specified
  let currentReport = null;
  
  // Check if there's a reportId in the request to add to a specific report
  const targetReportId = req.body.reportId;
  
  if (targetReportId) {
    // Add to a specific existing report
    currentReport = client.reports.find(r => r.id === targetReportId);
    if (!currentReport) {
      console.log('Specified report not found:', targetReportId);
      return res.status(404).json({ ok: false, error: 'specified report not found' });
    }
    console.log('Adding to specified report:', currentReport.id);
  } else {
    // This should only happen if a new report was explicitly created first
    console.log('No reportId specified - this should not happen in session-based flow');
    return res.status(400).json({ ok: false, error: 'reportId required for adding line items' });
  }
  
  // Assign lineNo based on current number of line items in this report
  const lineNo = (currentReport.lineItems?.length || 0) + 1;
  console.log('Assigning line number:', lineNo);
  
  const lineItem = {
    ...form222LineItem,
    lineNo, // override any client-supplied lineNo
    id: Date.now().toString(36) + Math.random().toString(36).slice(2, 8),
  };
  
  console.log('Created line item object:', JSON.stringify(lineItem, null, 2));
  currentReport.lineItems.push(lineItem);
  writeClients(clients);
  console.log('Line item successfully added to report');
  res.json({ ok: true, lineItem, report: currentReport });
});

// List all reports for a client
app.get('/api/clients/:id/reports', (req, res) => {
  const { id } = req.params;
  const clients = readClients();
  const client = clients.find(c => c.id === id);
  if (!client) return res.status(404).json({ ok: false, error: 'client not found' });
  res.json({ ok: true, reports: client.reports || [] });
});

// Update a line item in a specific report
app.put('/api/clients/:id/reports/:reportId/items/:itemId', (req, res) => {
  const { id, reportId, itemId } = req.params;
  const updateData = req.body;
  console.log('PUT line item:', { clientId: id, reportId, itemId, updateData });
  
  const clients = readClients();
  const client = clients.find(c => c.id === id);
  if (!client) {
    console.log('Client not found for ID:', id);
    return res.status(404).json({ ok: false, error: 'client not found' });
  }
  
  const report = client.reports?.find(r => r.id === reportId);
  if (!report) {
    console.log('Report not found for ID:', reportId);
    return res.status(404).json({ ok: false, error: 'report not found' });
  }
  
  const itemIndex = report.lineItems?.findIndex(item => item.id === itemId);
  if (itemIndex === -1 || itemIndex === undefined) {
    console.log('Line item not found for ID:', itemId);
    return res.status(404).json({ ok: false, error: 'line item not found' });
  }
  
  // Update the line item with new data, preserving id and lineNo
  const updatedItem = {
    ...report.lineItems[itemIndex],
    ...updateData,
    id: itemId, // Ensure ID doesn't change
    lineNo: report.lineItems[itemIndex].lineNo // Preserve line number
  };
  
  report.lineItems[itemIndex] = updatedItem;
  writeClients(clients);
  console.log('Line item updated successfully');
  res.json(updatedItem);
});

// Delete a line item from a specific report
app.delete('/api/clients/:id/reports/:reportId/items/:itemId', (req, res) => {
  const { id, reportId, itemId } = req.params;
  console.log('DELETE line item:', { clientId: id, reportId, itemId });
  
  const clients = readClients();
  const client = clients.find(c => c.id === id);
  if (!client) {
    console.log('Client not found for ID:', id);
    return res.status(404).json({ ok: false, error: 'client not found' });
  }
  
  const report = client.reports?.find(r => r.id === reportId);
  if (!report) {
    console.log('Report not found for ID:', reportId);
    return res.status(404).json({ ok: false, error: 'report not found' });
  }
  
  const itemIndex = report.lineItems?.findIndex(item => item.id === itemId);
  if (itemIndex === -1 || itemIndex === undefined) {
    console.log('Line item not found for ID:', itemId);
    return res.status(404).json({ ok: false, error: 'line item not found' });
  }
  
  // Remove the line item
  report.lineItems.splice(itemIndex, 1);
  
  // Renumber remaining line items
  report.lineItems.forEach((item, index) => {
    item.lineNo = index + 1;
  });
  
  writeClients(clients);
  console.log('Line item deleted and remaining items renumbered');
  res.json({ ok: true });
});

// Delete a report from a client
app.delete('/api/clients/:id/reports/:reportId', (req, res) => {
  const { id, reportId } = req.params;
  const clients = readClients();
  const client = clients.find(c => c.id === id);
  if (!client) return res.status(404).json({ ok: false, error: 'client not found' });
  const idx = (client.reports || []).findIndex(r => r.id === reportId);
  if (idx === -1) return res.status(404).json({ ok: false, error: 'report not found' });
  client.reports.splice(idx, 1);
  writeClients(clients);
  res.json({ ok: true });
});

// Helper to read/write the JSON DB
function readReports() {
  try {
    return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
  } catch {
    return [];
  }
}

function writeReports(reports) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(reports, null, 2), 'utf8');
}

// Receive a barcode scan (NDC, drug, price, quantity)
app.post('/api/report', (req, res) => {
  const { ndc, drug, price, quantity } = req.body || {};
  if (!ndc || !drug || !price || !quantity) {
    return res.status(400).json({ ok: false, error: 'ndc, drug, price, quantity required' });
  }
  const reports = readReports();
  const entry = {
    id: Date.now().toString(36) + Math.random().toString(36).slice(2, 8),
    ndc,
    drug,
    price,
    quantity,
    createdAt: new Date().toISOString()
  };    
  reports.push(entry);
  writeReports(reports);
  res.json({ ok: true, entry });
});

// Get all report entries
app.get('/api/report', (_req, res) => {
  const reports = readReports();
  res.json({ ok: true, reports });
});

// --- MANUAL ENTRIES CACHE ---

// Get manual entry by barcode/NDC
app.get('/api/manual-entries/:barcode', (req, res) => {
  const { barcode } = req.params;
  const entries = readManualEntries();
  const entry = entries[barcode];
  
  if (entry) {
    // Update last used timestamp
    entry.lastUsed = new Date().toISOString();
    entries[barcode] = entry;
    writeManualEntries(entries);
    
    res.json({ ok: true, entry });
  } else {
    res.status(404).json({ ok: false, error: 'Manual entry not found' });
  }
});

// Save/update manual entry
app.post('/api/manual-entries', (req, res) => {
  const { barcode, formData } = req.body;
  
  if (!barcode || !formData) {
    return res.status(400).json({ ok: false, error: 'barcode and formData required' });
  }
  
  // Validate required fields
  const validationErrors = [];
  if (!formData.itemName || formData.itemName.trim() === '') {
    validationErrors.push('Item name is required');
  }
  if (!formData.ndcNumber || formData.ndcNumber.trim() === '') {
    validationErrors.push('NDC number is required');
  }
  if (!formData.packageSize || formData.packageSize.trim() === '') {
    validationErrors.push('Package size is required');
  }
  if (!formData.labeler_name || formData.labeler_name.trim() === '') {
    validationErrors.push('Labeler name is required');
  }
  
  if (validationErrors.length > 0) {
    return res.status(400).json({ ok: false, error: 'Validation failed', errors: validationErrors });
  }
  
  const entries = readManualEntries();
  const entry = {
    ...formData,
    isManualEntry: true,
    createdAt: entries[barcode]?.createdAt || new Date().toISOString(),
    lastUsed: new Date().toISOString()
  };
  
  entries[barcode] = entry;
  writeManualEntries(entries);
  
  res.json({ ok: true, entry });
});

// Get all manual entries
app.get('/api/manual-entries', (_req, res) => {
  const entries = readManualEntries();
  res.json({ ok: true, entries });
});

// Delete manual entry by barcode
app.delete('/api/manual-entries/:barcode', (req, res) => {
  const { barcode } = req.params;
  const entries = readManualEntries();
  
  if (entries[barcode]) {
    delete entries[barcode];
    writeManualEntries(entries);
    res.json({ ok: true });
  } else {
    res.status(404).json({ ok: false, error: 'Manual entry not found' });
  }
});

// --- LABELERS MANAGEMENT ---

// Get all labelers
app.get('/api/labelers', (_req, res) => {
  const labelers = readLabelers();
  res.json({ ok: true, labelers });
});

// Add or update labeler
app.post('/api/labelers', (req, res) => {
  const { labeler_name, return_instructions } = req.body;
  
  if (!labeler_name || !return_instructions) {
    return res.status(400).json({ ok: false, error: 'labeler_name and return_instructions are required' });
  }
  
  const labelers = readLabelers();
  const existingIndex = labelers.findIndex(l => l.labeler_name === labeler_name);
  
  if (existingIndex >= 0) {
    // Update existing labeler
    labelers[existingIndex].return_instructions = return_instructions;
  } else {
    // Add new labeler
    labelers.push({ labeler_name, return_instructions });
  }
  
  writeLabelers(labelers);
  res.json({ ok: true, labeler: { labeler_name, return_instructions } });
});

// Get return instructions for a specific labeler
app.get('/api/labelers/:labeler_name', (req, res) => {
  const { labeler_name } = req.params;
  const labelers = readLabelers();
  const labeler = labelers.find(l => l.labeler_name === decodeURIComponent(labeler_name));
  
  if (labeler) {
    res.json({ ok: true, labeler });
  } else {
    res.status(404).json({ ok: false, error: 'Labeler not found' });
  }
});

// Delete a labeler
app.delete('/api/labelers/:labeler_name', (req, res) => {
  const { labeler_name } = req.params;
  const decodedLabelerName = decodeURIComponent(labeler_name);
  
  const labelers = readLabelers();
  const existingIndex = labelers.findIndex(l => l.labeler_name === decodedLabelerName);
  
  if (existingIndex >= 0) {
    labelers.splice(existingIndex, 1);
    writeLabelers(labelers);
    res.json({ ok: true, message: `Labeler "${decodedLabelerName}" deleted successfully` });
  } else {
    res.status(404).json({ ok: false, error: 'Labeler not found' });
  }
});

// --- PDF GENERATION ENDPOINTS ---

// Generate Form 222 PDF from report data
app.post('/api/generate-form222/:clientId/:reportId', async (req, res) => {
  try {
    const { clientId, reportId } = req.params;
    const { templatePath } = req.body; // Optional: path to Form 222 template PDF
    
    // Get client data
    const clients = readClients();
    const client = clients.find(c => c.id === clientId);
    if (!client) {
      return res.status(404).json({ error: 'Client not found' });
    }
    
    // Get report data
    const report = client.reports?.find(r => r.id === reportId);
    if (!report) {
      return res.status(404).json({ error: 'Report not found' });
    }
    
    // Validate that the report has line items
    if (!report.lineItems || report.lineItems.length === 0) {
      return res.status(400).json({ 
        error: 'Cannot generate Form 222 PDF for empty report',
        details: 'Form 222 requires at least one line item. Please add items to this report before generating the PDF.'
      });
    }
    
    // Prepare report data with client info
    const reportData = {
      client: client,
      reportId: reportId,
      lineItems: report.lineItems || [],
      metadata: {
        generatedDate: new Date().toISOString(),
        clientId: clientId,
        reportId: reportId
      }
    };
    
    // Generate PDF
    const pdfBuffer = await generateForm222PDF(reportData, templatePath);
    
    // Set response headers for PDF download
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="Form-222-${client.name}-${reportId}.pdf"`);
    res.setHeader('Content-Length', pdfBuffer.length);
    
    // Send the PDF
    res.send(pdfBuffer);
    
  } catch (error) {
    console.error('Error generating Form 222 PDF:', error);
    res.status(500).json({ 
      error: 'Failed to generate PDF', 
      details: error.message 
    });
  }
});

// Update Form 222 coordinate configuration
app.post('/api/form222-coordinates', (req, res) => {
  try {
    const newCoordinates = req.body;
    updateForm222Coordinates(newCoordinates);
    res.json({ 
      ok: true, 
      message: 'Form 222 coordinates updated successfully',
      coordinates: getForm222Coordinates()
    });
  } catch (error) {
    console.error('Error updating coordinates:', error);
    res.status(500).json({ 
      error: 'Failed to update coordinates', 
      details: error.message 
    });
  }
});

// Get current Form 222 coordinate configuration
app.get('/api/form222-coordinates', (req, res) => {
  try {
    res.json({ 
      coordinates: getForm222Coordinates()
    });
  } catch (error) {
    console.error('Error getting coordinates:', error);
    res.status(500).json({ 
      error: 'Failed to get coordinates', 
      details: error.message 
    });
  }
});

app.listen(PORT, HOST, () => {
  console.log(`Simple JSON backend listening at http://${HOST}:${PORT}`);
  console.log(`Data file: ${DATA_FILE}`);
});
