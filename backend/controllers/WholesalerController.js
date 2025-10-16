const BaseController = require('./BaseController');

class WholesalerController extends BaseController {
  constructor(repositoryService) {
    super(repositoryService);
  }

  /**
   * Get all wholesalers
   * @returns {Object} Response with all wholesalers
   */
  getAllWholesalers() {
    try {
      const wholesalers = this.repos.wholesalers.findAll();

      return this.handleSuccess({ wholesalers }, 'fetch all wholesalers');
    } catch (error) {
      return this.handleError(error, 'fetch all wholesalers');
    }
  }

  /**
   * Create or update a wholesaler
   * @param {Object} wholesalerData - The wholesaler data
   * @param {string} wholesalerData.name - The wholesaler name
   * @returns {Object} Response with created/updated wholesaler
   */
  createOrUpdateWholesaler(wholesalerData) {
    try {
      // Validate required fields
      const validationError = this.validateRequiredFields(wholesalerData, ['name']);
      if (validationError) {
        return validationError;
      }

      const wholesaler = this.repos.wholesalers.upsert(wholesalerData);

      return this.handleSuccess(
        wholesaler,
        'create/update wholesaler'
      );
    } catch (error) {
      return this.handleError(error, 'create/update wholesaler');
    }
  }

  /**
   * Get a specific wholesaler by name
   * @param {string} wholesalerName - The wholesaler name
   * @returns {Object} Response with wholesaler data
   */
  getWholesalerByName(wholesalerName) {
    try {
      if (!wholesalerName) {
        return {
          success: false,
          error: 'Wholesaler name is required',
          statusCode: 400
        };
      }

      const wholesaler = this.repos.wholesalers.findByName(wholesalerName);

      const recordError = this.validateRecordExists(wholesaler, 'Wholesaler', wholesalerName);
      if (recordError) {
        return recordError;
      }

      return this.handleSuccess(wholesaler, 'fetch wholesaler by name');
    } catch (error) {
      return this.handleError(error, 'fetch wholesaler by name');
    }
  }

  /**
   * Delete a wholesaler by name
   * @param {string} wholesalerName - The wholesaler name
   * @returns {Object} Response confirming deletion
   */
  deleteWholesalerByName(wholesalerName) {
    try {
      if (!wholesalerName) {
        return {
          success: false,
          error: 'Wholesaler name is required',
          statusCode: 400
        };
      }

      // Check if wholesaler exists before deletion
      const existingWholesaler = this.repos.wholesalers.findByName(wholesalerName);
      const recordError = this.validateRecordExists(existingWholesaler, 'Wholesaler', wholesalerName);
      if (recordError) {
        return recordError;
      }

      this.repos.wholesalers.deleteByName(wholesalerName);

      return this.handleSuccess(
        { message: 'Wholesaler deleted', name: wholesalerName },
        'delete wholesaler'
      );
    } catch (error) {
      // Handle specific "not found" errors from repository
      if (error.message && error.message.includes('not found')) {
        return {
          success: false,
          error: 'Wholesaler not found',
          statusCode: 404
        };
      }

      return this.handleError(error, 'delete wholesaler');
    }
  }
}

module.exports = WholesalerController;
