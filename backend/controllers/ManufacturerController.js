const BaseController = require('./BaseController');

class ManufacturerController extends BaseController {
  constructor(repositoryService) {
    super(repositoryService);
  }

  /**
   * Get all manufacturers
   * @returns {Object} Response with all manufacturers
   */
  getAllManufacturers() {
    try {
      const manufacturers = this.repos.manufacturers.findAll();

      return this.handleSuccess({ manufacturers }, 'fetch all manufacturers');
    } catch (error) {
      return this.handleError(error, 'fetch all manufacturers');
    }
  }

  /**
   * Create or update a manufacturer
   * @param {Object} manufacturerData - The manufacturer data
   * @param {string} manufacturerData.name - The manufacturer name
   * @returns {Object} Response with created/updated manufacturer
   */
  createOrUpdateManufacturer(manufacturerData) {
    try {
      // Validate required fields
      const validationError = this.validateRequiredFields(manufacturerData, ['name']);
      if (validationError) {
        return validationError;
      }

      const manufacturer = this.repos.manufacturers.upsert(manufacturerData);

      return this.handleSuccess(
        manufacturer,
        'create/update manufacturer'
      );
    } catch (error) {
      return this.handleError(error, 'create/update manufacturer');
    }
  }

  /**
   * Get a specific manufacturer by name
   * @param {string} manufacturerName - The manufacturer name
   * @returns {Object} Response with manufacturer data
   */
  getManufacturerByName(manufacturerName) {
    try {
      if (!manufacturerName) {
        return {
          success: false,
          error: 'Manufacturer name is required',
          statusCode: 400
        };
      }

      const manufacturer = this.repos.manufacturers.findByName(manufacturerName);

      const recordError = this.validateRecordExists(manufacturer, 'Manufacturer', manufacturerName);
      if (recordError) {
        return recordError;
      }

      return this.handleSuccess(manufacturer, 'fetch manufacturer by name');
    } catch (error) {
      return this.handleError(error, 'fetch manufacturer by name');
    }
  }

  /**
   * Delete a manufacturer by name
   * @param {string} manufacturerName - The manufacturer name
   * @returns {Object} Response confirming deletion
   */
  deleteManufacturerByName(manufacturerName) {
    try {
      if (!manufacturerName) {
        return {
          success: false,
          error: 'Manufacturer name is required',
          statusCode: 400
        };
      }

      // Check if manufacturer exists before deletion
      const existingManufacturer = this.repos.manufacturers.findByName(manufacturerName);
      const recordError = this.validateRecordExists(existingManufacturer, 'Manufacturer', manufacturerName);
      if (recordError) {
        return recordError;
      }

      this.repos.manufacturers.deleteByName(manufacturerName);

      return this.handleSuccess(
        { message: 'Manufacturer deleted', name: manufacturerName },
        'delete manufacturer'
      );
    } catch (error) {
      // Handle specific "not found" errors from repository
      if (error.message && error.message.includes('not found')) {
        return {
          success: false,
          error: 'Manufacturer not found',
          statusCode: 404
        };
      }

      return this.handleError(error, 'delete manufacturer');
    }
  }
}

module.exports = ManufacturerController;
