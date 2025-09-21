const BaseController = require('./BaseController');

class ManualEntryController extends BaseController {
  constructor(repositoryService) {
    super(repositoryService);
  }

  /**
   * Map backend fields to frontend expected format
   * @param {Object} backendEntry - Backend entry data
   * @returns {Object} Frontend-formatted entry
   */
  mapBackendToFrontend(backendEntry) {
    return {
      itemName: backendEntry.generic_name,
      ndcNumber: backendEntry.product_ndc,
      packageSize: backendEntry.package_size,
      pricePerEA: parseFloat(backendEntry.price_per_ea) || 0,
      labeler_name: backendEntry.labeler_name,
      created: backendEntry.created_at || backendEntry.createdAt,
      lastUsed: backendEntry.last_used || backendEntry.updatedAt,
      source: backendEntry.source
    };
  }

  /**
   * Map frontend fields to backend expected format
   * @param {Object} frontendData - Frontend entry data
   * @returns {Object} Backend-formatted entry
   */
  mapFrontendToBackend(frontendData) {
    return {
      product_ndc: frontendData.ndcNumber || frontendData.product_ndc,
      generic_name: frontendData.itemName || frontendData.generic_name,
      labeler_name: frontendData.labeler_name,
      package_size: frontendData.packageSize || frontendData.package_size,
      price_per_ea: parseFloat(frontendData.pricePerEA || frontendData.price_per_ea) || 0,
      last_used: new Date().toISOString(),
      source: 'manual'
    };
  }

  /**
   * Get manual entry by barcode
   * @param {string} barcode - The barcode to search for
   * @returns {Object} Response with manual entry data
   */
  getByBarcode(barcode) {
    try {
      if (!barcode) {
        return {
          success: false,
          error: 'Barcode is required',
          statusCode: 400
        };
      }

      const backendEntry = this.repos.manualEntries.findByBarcode(barcode);

      if (!backendEntry) {
        return {
          success: false,
          error: 'Manual entry not found for this barcode',
          statusCode: 404
        };
      }

      // Update last_used timestamp
      this.repos.manualEntries.update(barcode, { last_used: new Date().toISOString() });

      // Map backend fields to frontend expected format
      const mappedEntry = this.mapBackendToFrontend(backendEntry);

      return this.handleSuccess(
        { entry: mappedEntry, barcode },
        'fetch manual entry by barcode'
      );
    } catch (error) {
      return this.handleError(error, 'fetch manual entry by barcode');
    }
  }

  /**
   * Create or update manual entry
   * @param {Object} requestData - The request data
   * @param {string} requestData.barcode - The barcode
   * @param {Object} requestData.formData - The form data (or use request data directly)
   * @returns {Object} Response with created/updated entry
   */
  createOrUpdate(requestData) {
    try {
      const { barcode, formData } = requestData;

      if (!barcode) {
        return {
          success: false,
          error: 'Barcode is required',
          statusCode: 400
        };
      }

      // Extract and map the fields from the frontend formData structure
      const entryData = formData || requestData;

      // Map frontend field names to backend expectations
      const mappedEntry = this.mapFrontendToBackend(entryData);

      // Validate required fields for manual entry
      const validationError = this.validateRequiredFields(mappedEntry, [
        'product_ndc',
        'generic_name',
        'labeler_name'
      ]);

      if (validationError) {
        // Customize error message to use frontend field names
        return {
          success: false,
          error: 'product_ndc (ndcNumber), generic_name (itemName), and labeler_name are required',
          statusCode: 400
        };
      }

      const entry = this.repos.manualEntries.upsert(barcode, mappedEntry);

      return this.handleSuccess(
        { entry, barcode, message: 'Manual entry saved successfully' },
        'create/update manual entry'
      );
    } catch (error) {
      return this.handleError(error, 'create/update manual entry');
    }
  }

  /**
   * Get all manual entries
   * @returns {Object} Response with all manual entries
   */
  getAll() {
    try {
      const entries = this.repos.manualEntries.findAll();

      // Map all entries to frontend expected format
      const mappedEntries = {};
      for (const [barcode, entry] of Object.entries(entries)) {
        mappedEntries[barcode] = this.mapBackendToFrontend(entry);
      }

      return this.handleSuccess({ entries: mappedEntries }, 'fetch all manual entries');
    } catch (error) {
      return this.handleError(error, 'fetch all manual entries');
    }
  }

  /**
   * Delete manual entry by barcode
   * @param {string} barcode - The barcode
   * @returns {Object} Response confirming deletion
   */
  deleteByBarcode(barcode) {
    try {
      if (!barcode) {
        return {
          success: false,
          error: 'Barcode is required',
          statusCode: 400
        };
      }

      this.repos.manualEntries.delete(barcode);

      return this.handleSuccess(
        { message: 'Manual entry deleted', barcode },
        'delete manual entry'
      );
    } catch (error) {
      // Handle specific "not found" errors from repository
      if (error.message && error.message.includes('not found')) {
        return {
          success: false,
          error: 'Manual entry not found',
          statusCode: 404
        };
      }

      return this.handleError(error, 'delete manual entry');
    }
  }
}

module.exports = ManualEntryController;