const BaseRepository = require('./base/BaseRepository');

class ClientRepository extends BaseRepository {
  constructor(dataDir, reportRepository) {
    super('clients.json', dataDir);
    this.reportRepository = reportRepository;
  }

  getDefaultData() {
    return [];
  }

  validateData(data) {
    if (!Array.isArray(data)) return false;

    return data.every(client =>
      client &&
      typeof client === 'object' &&
      typeof client.id === 'string' &&
      typeof client.businessName === 'string' &&
      typeof client.deaNumber === 'string'
    );
  }

  validateDEANumber(deaNumber) {
    if (!deaNumber) {
      return { isValid: false, error: 'DEA number is required' };
    }

    const dea = deaNumber.toString().trim();

    if (dea.length !== 9) {
      return { isValid: false, error: 'DEA number must be exactly 9 characters' };
    }

    return { isValid: true, error: null };
  }

  create(clientData) {
    const deaValidation = this.validateDEANumber(clientData.deaNumber);
    if (!deaValidation.isValid) {
      throw new Error(deaValidation.error);
    }

    const clients = this.readData();

    const existingClient = clients.find(c => c.deaNumber === clientData.deaNumber);
    if (existingClient) {
      throw new Error(`Client with DEA number ${clientData.deaNumber} already exists`);
    }

    const newClient = {
      ...clientData,
      id: clientData.id || this.generateId(),
      name: clientData.businessName,
      reports: clientData.reports || [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    clients.push(newClient);
    this.writeData(clients);
    return newClient;
  }

  update(id, updates) {
    if (updates.deaNumber) {
      const deaValidation = this.validateDEANumber(updates.deaNumber);
      if (!deaValidation.isValid) {
        throw new Error(deaValidation.error);
      }

      const clients = this.readData();
      const existingClient = clients.find(c => c.deaNumber === updates.deaNumber && c.id !== id);
      if (existingClient) {
        throw new Error(`Another client with DEA number ${updates.deaNumber} already exists`);
      }
    }

    if (updates.businessName) {
      updates.name = updates.businessName;
    }

    return super.update(id, updates);
  }

  findByDEANumber(deaNumber) {
    const clients = this.readData();
    return clients.find(client => client.deaNumber === deaNumber) || null;
  }

  addReport(clientId, reportData) {
    const clients = this.readData();
    const client = clients.find(c => c.id === clientId);

    if (!client) {
      throw new Error(`Client with id ${clientId} not found`);
    }

    if (!client.reports) {
      client.reports = [];
    }

    // Create report with clientId reference
    const reportToCreate = {
      ...reportData,
      clientId: clientId,
      id: reportData.id || this.generateId(),
      createdAt: reportData.createdAt || new Date().toISOString(),
      timestamp: reportData.timestamp || new Date().toISOString(),
      lineItems: reportData.lineItems || reportData.items || [],
      items: reportData.items || reportData.lineItems || [],
      itemsCount: (reportData.lineItems || reportData.items || []).length
    };

    // Create report in ReportRepository
    const newReport = this.reportRepository.create(reportToCreate);

    // Add report ID to client's reports array
    client.reports.push(newReport.id);
    client.updatedAt = new Date().toISOString();

    this.writeData(clients);
    return newReport;
  }

  getReport(clientId, reportId) {
    const client = this.findById(clientId);
    if (!client) {
      throw new Error(`Client with id ${clientId} not found`);
    }

    // Check if reportId exists in client's reports array
    if (!client.reports || !client.reports.includes(reportId)) {
      throw new Error(`Report with id ${reportId} not found for client ${clientId}`);
    }

    // Get report from ReportRepository
    const report = this.reportRepository.findById(reportId);
    if (!report) {
      throw new Error(`Report with id ${reportId} not found for client ${clientId}`);
    }

    return report;
  }

  updateReport(clientId, reportId, updates) {
    const clients = this.readData();
    const client = clients.find(c => c.id === clientId);

    if (!client) {
      throw new Error(`Client with id ${clientId} not found`);
    }

    const reportIndex = client.reports?.findIndex(r => r.id === reportId);
    if (reportIndex === -1 || reportIndex === undefined) {
      throw new Error(`Report with id ${reportId} not found for client ${clientId}`);
    }

    client.reports[reportIndex] = {
      ...client.reports[reportIndex],
      ...updates,
      id: reportId,
      updatedAt: new Date().toISOString()
    };

    client.updatedAt = new Date().toISOString();
    this.writeData(clients);

    return client.reports[reportIndex];
  }

  deleteReport(clientId, reportId) {
    const clients = this.readData();
    const client = clients.find(c => c.id === clientId);

    if (!client) {
      throw new Error(`Client with id ${clientId} not found`);
    }

    const reportIndex = client.reports?.findIndex(r => r === reportId);
    if (reportIndex === -1 || reportIndex === undefined) {
      throw new Error(`Report with id ${reportId} not found for client ${clientId}`);
    }

    const deletedReport = client.reports.splice(reportIndex, 1)[0];
    client.updatedAt = new Date().toISOString();

    // Delete the report from ReportRepository as well
    try {
      this.reportRepository.delete(reportId);
      console.log(`Deleted report ${reportId} from ReportRepository`);
    } catch (error) {
      console.warn(`Failed to delete report ${reportId} from ReportRepository:`, error.message);
    }

    this.writeData(clients);
    return deletedReport;
  }

  addLineItemToReport(clientId, reportId, lineItemData) {
    const clients = this.readData();
    const client = clients.find(c => c.id === clientId);

    if (!client) {
      throw new Error(`Client with id ${clientId} not found`);
    }

    // Check if reportId exists in client's reports array
    if (!client.reports || !client.reports.includes(reportId)) {
      throw new Error(`Report with id ${reportId} not found for client ${clientId}`);
    }

    // Use ReportRepository to add line item
    const newLineItem = this.reportRepository.addLineItem(reportId, lineItemData);
    return newLineItem;
  }

  updateLineItemInReport(clientId, reportId, itemId, updates) {
    const clients = this.readData();
    const client = clients.find(c => c.id === clientId);

    if (!client) {
      throw new Error(`Client with id ${clientId} not found`);
    }

    // Check if report ID exists in client's reports array
    if (!client.reports || !client.reports.includes(reportId)) {
      throw new Error(`Report with id ${reportId} not found for client ${clientId}`);
    }

    // Use ReportRepository to update the line item
    const updatedItem = this.reportRepository.updateLineItem(reportId, itemId, updates);

    // Update client's timestamp
    client.updatedAt = new Date().toISOString();
    this.writeData(clients);

    return updatedItem;
  }

  deleteLineItemFromReport(clientId, reportId, itemId) {
    const clients = this.readData();
    const client = clients.find(c => c.id === clientId);

    if (!client) {
      throw new Error(`Client with id ${clientId} not found`);
    }

    // Check if report ID exists in client's reports array
    if (!client.reports || !client.reports.includes(reportId)) {
      throw new Error(`Report with id ${reportId} not found for client ${clientId}`);
    }

    // Use ReportRepository to delete the line item
    const deletedItem = this.reportRepository.deleteLineItem(reportId, itemId);

    // Update client's timestamp
    client.updatedAt = new Date().toISOString();
    this.writeData(clients);

    return deletedItem;
  }

  getClientReports(clientId) {
    const client = this.findById(clientId);
    if (!client) {
      throw new Error(`Client with id ${clientId} not found`);
    }

    // Get report objects from ReportRepository based on client's report IDs
    const reportIds = client.reports || [];
    const reports = [];

    for (const reportId of reportIds) {
      const report = this.reportRepository.findById(reportId);
      if (report) {
        reports.push(report);
      }
    }

    return reports;
  }

  search(query) {
    const clients = this.readData();
    const searchTerm = query.toLowerCase();

    return clients.filter(client =>
      client.businessName?.toLowerCase().includes(searchTerm) ||
      client.name?.toLowerCase().includes(searchTerm) ||
      client.deaNumber?.toLowerCase().includes(searchTerm) ||
      client.city?.toLowerCase().includes(searchTerm) ||
      client.contactName?.toLowerCase().includes(searchTerm)
    );
  }

  delete(id) {
    const client = this.findById(id);
    if (!client) {
      throw new Error(`Client with id ${id} not found`);
    }

    // Delete all associated reports from ReportRepository
    if (client.reports && Array.isArray(client.reports)) {
      client.reports.forEach(reportId => {
        try {
          this.reportRepository.delete(reportId);
          console.log(`Deleted report ${reportId} for client ${id}`);
        } catch (error) {
          console.warn(`Failed to delete report ${reportId} for client ${id}:`, error.message);
        }
      });
    }

    // Delete the client using the parent delete method
    const deletedClient = super.delete(id);
    console.log(`Deleted client ${id} with ${client.reports?.length || 0} associated reports`);

    return deletedClient;
  }
}

module.exports = ClientRepository;