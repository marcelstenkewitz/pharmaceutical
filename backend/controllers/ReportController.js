const BaseController = require('./BaseController');

class ReportController extends BaseController {
  constructor(repositoryService) {
    super(repositoryService);
  }

  /**
   * Generate a unique report ID
   * @returns {string} Unique report ID
   */
  generateReportId() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  }

  /**
   * Create a new report for a client
   * @param {string} clientId - The client ID
   * @param {Object} reportData - The report data
   * @param {string} [reportData.name] - The report name
   * @param {Array} [reportData.items] - Initial items for the report
   * @returns {Object} Response with created report
   */
  createNewReport(clientId, reportData = {}) {
    try {
      if (!clientId) {
        return {
          success: false,
          error: 'Client ID is required',
          statusCode: 400
        };
      }

      // Verify client exists
      const clients = this.repos.clients.findAll();
      const client = clients.find(c => c.id === clientId);

      const clientError = this.validateRecordExists(client, 'Client', clientId);
      if (clientError) {
        return clientError;
      }

      const { name = `Report ${new Date().toISOString()}`, items = [] } = reportData;

      const reportId = this.generateReportId();
      const report = {
        id: reportId,
        name,
        createdAt: new Date().toISOString(),
        timestamp: new Date().toISOString(), // Keep for backwards compatibility
        lineItems: items || [], // Use lineItems to match frontend expectations
        items: items || [], // Keep for backwards compatibility
        itemsCount: (items || []).length
      };

      // Add report to client
      if (!client.reports) client.reports = [];
      client.reports.push(report);

      // Save updated client
      this.repos.clients.update(clientId, { reports: client.reports });

      return this.handleSuccess({ report }, 'create new report');
    } catch (error) {
      return this.handleError(error, 'create new report');
    }
  }

  /**
   * Add line item to existing report
   * @param {string} clientId - The client ID
   * @param {string} reportId - The report ID
   * @param {Object} lineItem - The line item data
   * @returns {Object} Response with updated report
   */
  addLineItemToReport(clientId, reportId, lineItem) {
    try {
      if (!clientId || !reportId) {
        return {
          success: false,
          error: 'Client ID and Report ID are required',
          statusCode: 400
        };
      }

      if (!lineItem) {
        return {
          success: false,
          error: 'Line item data is required',
          statusCode: 400
        };
      }

      // Use repository method for adding line items
      const newItem = this.repos.clients.addLineItemToReport(clientId, reportId, lineItem);
      const report = this.repos.clients.getReport(clientId, reportId);

      return this.handleSuccess({
        lineItem: newItem,
        report: {
          id: report.id,
          name: report.name,
          timestamp: report.timestamp,
          lineItems: report.lineItems,
          itemsCount: report.itemsCount
        }
      }, 'add line item to report');
    } catch (error) {
      if (error.message.includes('Client') && error.message.includes('not found')) {
        return {
          success: false,
          error: 'Client not found',
          statusCode: 404
        };
      } else if (error.message.includes('Report') && error.message.includes('not found')) {
        return {
          success: false,
          error: 'Report not found',
          statusCode: 404
        };
      }

      return this.handleError(error, 'add line item to report');
    }
  }

  /**
   * Update line item in report
   * @param {string} clientId - The client ID
   * @param {string} reportId - The report ID
   * @param {string} itemId - The item ID
   * @param {Object} updateData - The updated item data
   * @returns {Object} Response with updated item
   */
  updateLineItem(clientId, reportId, itemId, updateData) {
    try {
      if (!clientId || !reportId || !itemId) {
        return {
          success: false,
          error: 'Client ID, Report ID, and Item ID are required',
          statusCode: 400
        };
      }

      const item = this.repos.clients.updateLineItemInReport(clientId, reportId, itemId, updateData);

      return this.handleSuccess({ item }, 'update line item');
    } catch (error) {
      if (error.message.includes('Client') && error.message.includes('not found')) {
        return {
          success: false,
          error: 'Client not found',
          statusCode: 404
        };
      } else if (error.message.includes('Report') && error.message.includes('not found')) {
        return {
          success: false,
          error: 'Report not found',
          statusCode: 404
        };
      } else if (error.message.includes('Line item') && error.message.includes('not found')) {
        return {
          success: false,
          error: 'Item not found',
          statusCode: 404
        };
      }

      return this.handleError(error, 'update line item');
    }
  }

  /**
   * Delete line item from report
   * @param {string} clientId - The client ID
   * @param {string} reportId - The report ID
   * @param {string} itemId - The item ID
   * @returns {Object} Response confirming deletion
   */
  deleteLineItem(clientId, reportId, itemId) {
    try {
      if (!clientId || !reportId || !itemId) {
        return {
          success: false,
          error: 'Client ID, Report ID, and Item ID are required',
          statusCode: 400
        };
      }

      this.repos.clients.deleteLineItemFromReport(clientId, reportId, itemId);

      return this.handleSuccess(
        { message: 'Line item deleted successfully' },
        'delete line item'
      );
    } catch (error) {
      if (error.message.includes('Client') && error.message.includes('not found')) {
        return {
          success: false,
          error: 'Client not found',
          statusCode: 404
        };
      } else if (error.message.includes('Report') && error.message.includes('not found')) {
        return {
          success: false,
          error: 'Report not found',
          statusCode: 404
        };
      } else if (error.message.includes('Line item') && error.message.includes('not found')) {
        return {
          success: false,
          error: 'Item not found',
          statusCode: 404
        };
      }

      return this.handleError(error, 'delete line item');
    }
  }

  /**
   * Delete entire report
   * @param {string} clientId - The client ID
   * @param {string} reportId - The report ID
   * @returns {Object} Response confirming deletion
   */
  deleteReport(clientId, reportId) {
    try {
      if (!clientId || !reportId) {
        return {
          success: false,
          error: 'Client ID and Report ID are required',
          statusCode: 400
        };
      }

      this.repos.clients.deleteReport(clientId, reportId);

      return this.handleSuccess(
        { message: 'Report deleted successfully' },
        'delete report'
      );
    } catch (error) {
      if (error.message.includes('Client') && error.message.includes('not found')) {
        return {
          success: false,
          error: 'Client not found',
          statusCode: 404
        };
      } else if (error.message.includes('Report') && error.message.includes('not found')) {
        return {
          success: false,
          error: 'Report not found',
          statusCode: 404
        };
      }

      return this.handleError(error, 'delete report');
    }
  }

  /**
   * Get all reports for a client
   * @param {string} clientId - The client ID
   * @returns {Object} Response with client reports
   */
  getClientReports(clientId) {
    try {
      if (!clientId) {
        return {
          success: false,
          error: 'Client ID is required',
          statusCode: 400
        };
      }

      // Verify client exists
      const clients = this.repos.clients.findAll();
      const client = clients.find(c => c.id === clientId);

      const clientError = this.validateRecordExists(client, 'Client', clientId);
      if (clientError) {
        return clientError;
      }

      // Read all reports and filter by clientId
      const allReports = this.repos.reports.findAll();
      const clientReports = allReports.filter(report => report.clientId === clientId);

      return this.handleSuccess({ reports: clientReports }, 'fetch client reports');
    } catch (error) {
      return this.handleError(error, 'fetch client reports');
    }
  }

  /**
   * Legacy method: Add line item with reportId in body
   * @param {string} clientId - The client ID
   * @param {Object} requestData - Request data containing reportId and line item
   * @returns {Object} Response with updated report or error
   */
  addLineItemLegacy(clientId, requestData) {
    try {
      if (!clientId) {
        return {
          success: false,
          error: 'Client ID is required',
          statusCode: 400
        };
      }

      const { reportId, ...lineItem } = requestData;

      // Verify client exists
      const clients = this.repos.clients.findAll();
      const client = clients.find(c => c.id === clientId);

      const clientError = this.validateRecordExists(client, 'Client', clientId);
      if (clientError) {
        return clientError;
      }

      // If reportId is provided, add line item to existing report
      if (reportId) {
        const report = client.reports?.find(r => r.id === reportId);
        if (!report) {
          return {
            success: false,
            error: 'Report not found',
            statusCode: 404
          };
        }

        // Generate ID for the new line item
        const newItem = {
          ...lineItem,
          id: this.generateReportId(),
          lineNumber: (report.lineItems?.length || 0) + 1,
          timestamp: new Date().toISOString()
        };

        // Add item to report
        if (!report.lineItems) report.lineItems = [];
        if (!report.items) report.items = [];

        report.lineItems.push(newItem);
        report.items.push(newItem); // Keep for backwards compatibility
        report.itemsCount = report.lineItems.length;

        // Update client with modified report
        this.repos.clients.update(clientId, { reports: client.reports });

        return this.handleSuccess({
          lineItem: newItem,
          report: {
            id: report.id,
            name: report.name,
            timestamp: report.timestamp,
            lineItems: report.lineItems,
            itemsCount: report.itemsCount
          }
        }, 'add line item to existing report');
      }

      // If no reportId provided, return error
      return {
        success: false,
        error: 'Missing reportId. Use /api/clients/:id/reports/new to create a new report first.',
        statusCode: 400
      };
    } catch (error) {
      return this.handleError(error, 'add line item (legacy)');
    }
  }
}

module.exports = ReportController;