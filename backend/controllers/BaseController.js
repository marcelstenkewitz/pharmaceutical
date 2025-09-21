class BaseController {
  constructor(repositoryService) {
    this.repos = repositoryService;
  }

  /**
   * Standard error handling for all controllers
   * @param {Error} error - The error object
   * @param {string} operation - Description of the operation that failed
   * @returns {Object} Standardized error response
   */
  handleError(error, operation) {
    console.error(`Error in ${operation}:`, error);

    return {
      success: false,
      error: error.message || 'An error occurred',
      statusCode: error.statusCode || 500,
      operation
    };
  }

  /**
   * Standard success response for all controllers
   * @param {*} data - The data to return
   * @param {string} operation - Description of the successful operation
   * @returns {Object} Standardized success response
   */
  handleSuccess(data, operation) {
    return {
      success: true,
      data,
      operation
    };
  }

  /**
   * Validate required fields in request data
   * @param {Object} data - The data to validate
   * @param {Array} requiredFields - Array of required field names
   * @returns {Object|null} Validation error or null if valid
   */
  validateRequiredFields(data, requiredFields) {
    const missingFields = requiredFields.filter(field => !data[field]);

    if (missingFields.length > 0) {
      return {
        success: false,
        error: `Missing required fields: ${missingFields.join(', ')}`,
        statusCode: 400,
        missingFields
      };
    }

    return null;
  }

  /**
   * Validate that a record exists
   * @param {*} record - The record to check
   * @param {string} recordType - Type of record (for error messages)
   * @param {string} identifier - The identifier used to find the record
   * @returns {Object|null} Validation error or null if valid
   */
  validateRecordExists(record, recordType, identifier) {
    if (!record) {
      return {
        success: false,
        error: `${recordType} not found with identifier: ${identifier}`,
        statusCode: 404,
        recordType,
        identifier
      };
    }

    return null;
  }
}

module.exports = BaseController;