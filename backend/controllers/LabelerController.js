const BaseController = require('./BaseController');

class LabelerController extends BaseController {
  constructor(repositoryService) {
    super(repositoryService);
  }

  /**
   * Get all labelers
   * @returns {Object} Response with all labelers
   */
  getAllLabelers() {
    try {
      const labelers = this.repos.labelers.findAll();

      return this.handleSuccess({ labelers }, 'fetch all labelers');
    } catch (error) {
      return this.handleError(error, 'fetch all labelers');
    }
  }

  /**
   * Create or update a labeler
   * @param {Object} labelerData - The labeler data
   * @param {string} labelerData.labeler_name - The labeler name
   * @param {string} labelerData.return_instructions - The return instructions
   * @returns {Object} Response with created/updated labeler
   */
  createOrUpdateLabeler(labelerData) {
    try {
      // Validate required fields
      const validationError = this.validateRequiredFields(labelerData, ['labeler_name', 'return_instructions']);
      if (validationError) {
        return validationError;
      }

      const { labeler_name, return_instructions } = labelerData;

      const labeler = this.repos.labelers.upsert({ labeler_name, return_instructions });

      return this.handleSuccess(
        { labeler_name, return_instructions },
        'create/update labeler'
      );
    } catch (error) {
      return this.handleError(error, 'create/update labeler');
    }
  }

  /**
   * Get return instructions for a specific labeler
   * @param {string} labelerName - The labeler name
   * @returns {Object} Response with labeler data
   */
  getLabelerByName(labelerName) {
    try {
      if (!labelerName) {
        return {
          success: false,
          error: 'Labeler name is required',
          statusCode: 400
        };
      }

      const labeler = this.repos.labelers.findByName(labelerName);

      const recordError = this.validateRecordExists(labeler, 'Labeler', labelerName);
      if (recordError) {
        return recordError;
      }

      return this.handleSuccess(labeler, 'fetch labeler by name');
    } catch (error) {
      return this.handleError(error, 'fetch labeler by name');
    }
  }

  /**
   * Delete a labeler by name
   * @param {string} labelerName - The labeler name
   * @returns {Object} Response confirming deletion
   */
  deleteLabelerByName(labelerName) {
    try {
      if (!labelerName) {
        return {
          success: false,
          error: 'Labeler name is required',
          statusCode: 400
        };
      }

      // Check if labeler exists before deletion
      const existingLabeler = this.repos.labelers.findByName(labelerName);
      const recordError = this.validateRecordExists(existingLabeler, 'Labeler', labelerName);
      if (recordError) {
        return recordError;
      }

      this.repos.labelers.deleteByName(labelerName);

      return this.handleSuccess(
        { message: 'Labeler deleted', labeler_name: labelerName },
        'delete labeler'
      );
    } catch (error) {
      // Handle specific "not found" errors from repository
      if (error.message && error.message.includes('not found')) {
        return {
          success: false,
          error: 'Labeler not found',
          statusCode: 404
        };
      }

      return this.handleError(error, 'delete labeler');
    }
  }
}

module.exports = LabelerController;