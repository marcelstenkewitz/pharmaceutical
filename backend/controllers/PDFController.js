const BaseController = require('./BaseController');
const {
  generateForm222PDF,
  generateInventoryPDF,
  generateCoordinateFinder,
  updateForm222Coordinates,
  getForm222Coordinates
} = require('../utils/pdfGenerator');
const { getCIIItemsForForm222 } = require('../models/Form222Model');

class PDFController extends BaseController {
  constructor(repositoryService) {
    super(repositoryService);
  }

  /**
   * Find client and report for PDF generation
   * @param {string} clientId - The client ID
   * @param {string} reportId - The report ID
   * @returns {Object} Object containing client and report or error
   */
  findClientAndReport(clientId, reportId) {
    const clients = this.repos.clients.findAll();
    const client = clients.find(c => c.id === clientId);

    if (!client) {
      return {
        error: {
          success: false,
          error: 'Client not found',
          statusCode: 404
        }
      };
    }

    // Try finding report in client's reports first
    let report = client.reports?.find(r => r.id === reportId);

    // If not found in client reports, check the reports collection
    if (!report) {
      const allReports = this.repos.reports.findAll();
      report = allReports.find(r => r.id === reportId && r.clientId === clientId);
    }

    if (!report) {
      return {
        error: {
          success: false,
          error: 'Report not found',
          statusCode: 404
        }
      };
    }

    return { client, report };
  }

  /**
   * Generate Form 222 PDF
   * @param {string} clientId - The client ID
   * @param {string} reportId - The report ID
   * @param {string} [templatePath] - Optional template path
   * @returns {Object} Response with PDF buffer or error
   */
  async generateForm222(clientId, reportId, templatePath = null) {
    try {
      if (!clientId || !reportId) {
        return {
          success: false,
          error: 'Client ID and Report ID are required',
          statusCode: 400
        };
      }

      const { client, report, error } = this.findClientAndReport(clientId, reportId);
      if (error) return error;

      const reportData = {
        client,
        lineItems: getCIIItemsForForm222(report.lineItems)
      };

      const pdfBuffer = await generateForm222PDF(reportData, templatePath);
      const filename = `form222_${client.businessName}_${new Date().toISOString().split('T')[0]}.pdf`;

      return this.handleSuccess({
        pdfBuffer,
        filename,
        contentType: 'application/pdf',
        disposition: `attachment; filename="${filename}"`
      }, 'generate Form 222 PDF');
    } catch (error) {
      return this.handleError(error, 'generate Form 222 PDF');
    }
  }

  /**
   * Generate Inventory PDF
   * @param {string} clientId - The client ID
   * @param {string} reportId - The report ID
   * @param {string} [templatePath] - Optional template path
   * @returns {Object} Response with PDF buffer or error
   */
  async generateInventory(clientId, reportId, templatePath = null) {
    try {
      if (!clientId || !reportId) {
        return {
          success: false,
          error: 'Client ID and Report ID are required',
          statusCode: 400
        };
      }

      const { client, report, error } = this.findClientAndReport(clientId, reportId);
      if (error) return error;

      const reportData = {
        client,
        lineItems: (report.lineItems || []).map(item => ({
          itemName: item.itemName || item.name,
          ndc11: item.ndc11 || item.ndc,
          packageSize: item.packageSize,
          packages: item.packages,
          pricePerUnit: item.pricePerUnit || 0,
          pricePerPackage: item.pricePerPackage || 0,
          totalPrice: item.totalPrice || 0,
          labeler_name: item.labeler_name || ''
        }))
      };

      const pdfBuffer = await generateInventoryPDF(reportData, templatePath);
      const filename = `inventory_${client.businessName}_${new Date().toISOString().split('T')[0]}.pdf`;

      return this.handleSuccess({
        pdfBuffer,
        filename,
        contentType: 'application/pdf',
        disposition: `attachment; filename="${filename}"`
      }, 'generate Inventory PDF');
    } catch (error) {
      return this.handleError(error, 'generate Inventory PDF');
    }
  }

  /**
   * Update Form 222 coordinates
   * @param {Object} coordinates - The coordinate data
   * @returns {Object} Response confirming update
   */
  updateCoordinates(coordinates) {
    try {
      // Validate that the required structure exists
      if (!coordinates || typeof coordinates !== 'object') {
        return {
          success: false,
          error: 'Invalid coordinates format',
          statusCode: 400
        };
      }

      updateForm222Coordinates(coordinates);

      return this.handleSuccess(
        { message: 'Form 222 coordinates updated successfully' },
        'update Form 222 coordinates'
      );
    } catch (error) {
      return this.handleError(error, 'update Form 222 coordinates');
    }
  }

  /**
   * Get current Form 222 coordinates
   * @returns {Object} Response with coordinates
   */
  getCoordinates() {
    try {
      const coordinates = getForm222Coordinates();

      return this.handleSuccess({ coordinates }, 'get Form 222 coordinates');
    } catch (error) {
      return this.handleError(error, 'get Form 222 coordinates');
    }
  }

  /**
   * Generate coordinate finder PDF (Development tool)
   * @returns {Object} Response with PDF buffer or error
   */
  async generateCoordinateFinderPDF() {
    try {
      // Only allow in development mode
      if (process.env.NODE_ENV === 'production' && process.env.FORM_222_DEV_MODE !== 'true') {
        return {
          success: false,
          error: 'Coordinate finder is only available in development mode',
          statusCode: 403
        };
      }

      const pdfBuffer = await generateCoordinateFinder();
      const filename = `form222_coordinate_finder_${new Date().toISOString().split('T')[0]}.pdf`;

      return this.handleSuccess({
        pdfBuffer,
        filename,
        contentType: 'application/pdf',
        disposition: `attachment; filename="${filename}"`
      }, 'generate coordinate finder PDF');
    } catch (error) {
      return this.handleError(error, 'generate coordinate finder PDF');
    }
  }
}

module.exports = PDFController;