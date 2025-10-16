const BaseRepository = require('./base/BaseRepository');
const { migrateClients, logMigrationResult } = require('../utils/migrations');
const { validateDEANumberOptional } = require('../utils/deaValidator');

class ClientRepository extends BaseRepository {
  constructor(dataDir, reportRepository) {
    super('clients.json', dataDir);
    this.reportRepository = reportRepository;
    this.migrationRun = false;
  }

  /**
   * Override readData to automatically migrate old data structures
   */
  readData() {
    // Get data from parent class
    const data = super.readData();

    // Only run migration once per server startup
    if (!this.migrationRun && Array.isArray(data) && data.length > 0) {
      this.migrationRun = true;

      // Run migration
      const result = migrateClients(data);

      // If migration was needed, log it and save the migrated data
      if (result.migrated) {
        logMigrationResult('clients', result);
        this.writeData(result.clients);
        return result.clients;
      }
    }

    return data;
  }

  getDefaultData() {
    return [
      {
        id: "5e4uaniuyeq",
        businessName: "Sunrise Medical Center",
        name: "Sunrise Medical Center",
        deaNumber: "AS1234567",
        deaExpirationDate: "2026-12-31",
        stateLicenseNumber: "CA-PHY-12345",
        stateLicenseExpirationDate: "2026-06-30",
        streetAddress: "123 Medical Plaza Dr",
        city: "Los Angeles",
        state: "CA",
        zipCode: "90210",
        phoneNumber: "(555) 123-4567",
        contactName: "Dr. Sarah Johnson",
        wholesaler: "McKesson Corporation",
        wholesalerAccountNumber: "MCK-LA-12345",
        wholesalerAddress: "8741 Landmark Rd, Richmond, VA 23261",
        invoicePercentage: 15,
        reports: [],
        createdAt: "2024-10-13T15:55:06.303Z",
        updatedAt: "2025-10-16T17:00:00.000Z"
      },
      {
        id: "voyyqpzsvf",
        businessName: "Pacific Coast Pharmacy",
        name: "Pacific Coast Pharmacy",
        deaNumber: "BP9876543",
        deaExpirationDate: "2027-03-15",
        stateLicenseNumber: "CA-PHARM-67890",
        stateLicenseExpirationDate: "2026-09-30",
        streetAddress: "456 Harbor Blvd",
        city: "San Francisco",
        state: "CA",
        zipCode: "94102",
        phoneNumber: "(555) 987-6543",
        contactName: "Dr. Michael Chen",
        wholesaler: "Cardinal Health",
        wholesalerAccountNumber: "CAR-SF-67890",
        wholesalerAddress: "7000 Cardinal Pl, Dublin, OH 43017",
        invoicePercentage: 20,
        reports: [],
        createdAt: "2023-10-14T15:55:06.303Z",
        updatedAt: "2025-10-16T17:00:00.000Z"
      },
      {
        id: "v58sdhudji",
        businessName: "Central Valley Hospital",
        name: "Central Valley Hospital",
        deaNumber: "CH5551234",
        deaExpirationDate: "2026-08-20",
        stateLicenseNumber: "CA-HOSP-11111",
        stateLicenseExpirationDate: "2026-12-31",
        streetAddress: "789 Valley Way",
        city: "Fresno",
        state: "CA",
        zipCode: "93720",
        phoneNumber: "(555) 555-5555",
        contactName: "Dr. Emily Rodriguez",
        wholesaler: "AmerisourceBergen",
        wholesalerAccountNumber: "ABC-FR-11111",
        wholesalerAddress: "1 W 1st Ave, Conshohocken, PA 19428",
        invoicePercentage: 25,
        reports: [],
        createdAt: "2025-04-16T15:55:06.303Z",
        updatedAt: "2025-10-16T17:00:00.000Z"
      }
    ];
  }

  validateData(data) {
    if (!Array.isArray(data)) return false;

    return data.every(client =>
      client &&
      typeof client === 'object' &&
      typeof client.id === 'string' &&
      typeof client.businessName === 'string'
    );
  }

  create(clientData) {
    const clients = this.readData();

    // Validate DEA number if provided
    if (clientData.deaNumber) {
      const deaValidation = validateDEANumberOptional(clientData.deaNumber);
      if (!deaValidation.isValid) {
        throw new Error(`Invalid DEA number: ${deaValidation.error}`);
      }
    }

    const newClient = {
      ...clientData,
      id: clientData.id || this.generateId(),
      name: clientData.businessName,
      reports: clientData.reports || [],
      deaNumber: clientData.deaNumber || null,
      deaExpirationDate: clientData.deaExpirationDate || null,
      stateLicenseNumber: clientData.stateLicenseNumber || null,
      stateLicenseExpirationDate: clientData.stateLicenseExpirationDate || null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    clients.push(newClient);
    this.writeData(clients);
    return newClient;
  }

  update(id, updates) {
    if (updates.businessName) {
      updates.name = updates.businessName;
    }

    // Validate DEA number if being updated
    if (updates.deaNumber !== undefined) {
      const deaValidation = validateDEANumberOptional(updates.deaNumber);
      if (!deaValidation.isValid) {
        throw new Error(`Invalid DEA number: ${deaValidation.error}`);
      }
    }

    return super.update(id, updates);
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

    // Reverse to show most recent reports first
    return reports.reverse();
  }

  search(query) {
    const clients = this.readData();
    const searchTerm = query.toLowerCase();

    return clients.filter(client =>
      client.businessName?.toLowerCase().includes(searchTerm) ||
      client.name?.toLowerCase().includes(searchTerm) ||
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