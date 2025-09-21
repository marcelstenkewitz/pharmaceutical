import apiService from './ApiService';

/**
 * Shared service for manual entry operations
 */
export class ManualEntryService {
  /**
   * Prepare barcode with proper manual_ prefixing
   * @param {string} userInput - User entered barcode/identifier
   * @returns {string} Properly formatted barcode
   */
  static prepareManualEntryBarcode(userInput) {
    const trimmed = userInput?.trim();

    if (!trimmed) {
      // Generate timestamp-based ID if empty
      return `manual_${Date.now()}`;
    }

    // Don't double-prefix if already has manual_
    if (trimmed.startsWith('manual_')) {
      return trimmed;
    }

    // Add prefix to user input
    return `manual_${trimmed}`;
  }

  /**
   * Check if an entry with the given barcode already exists
   * @param {string} barcode - Barcode to check
   * @returns {Promise<boolean>} True if entry exists
   */
  static async checkDuplicateEntry(barcode) {
    try {
      const existingEntry = await apiService.getManualEntry(barcode);
      return !!existingEntry;
    } catch (error) {
      console.warn('Error checking for duplicate entry:', error);
      return false;
    }
  }

  /**
   * Map form data to API expected format
   * @param {object} formData - Form data from ManualEntryModal
   * @returns {object} API formatted data
   */
  static mapFormDataToApi(formData) {
    return {
      ndcNumber: formData.ndc11 || formData.ndcNumber,
      itemName: formData.itemName,
      packageSize: formData.packageSize,
      pricePerEA: formData.pricePerUnit || formData.pricePerEA || 0,
      labeler_name: formData.labeler_name
    };
  }

  /**
   * Save manual entry with proper validation and duplicate checking
   * @param {object} formData - Form data from ManualEntryModal
   * @returns {Promise<object>} Save result
   */
  static async saveManualEntry(formData) {
    console.log('[ManualEntryService] Saving entry with formData:', formData);

    // Prepare barcode with proper prefixing
    const barcode = this.prepareManualEntryBarcode(formData.barcode);

    // Check for duplicates (optional - could prompt user)
    const isDuplicate = await this.checkDuplicateEntry(barcode);
    if (isDuplicate) {
      console.log(`[ManualEntryService] Entry with barcode "${barcode}" already exists, will update`);
    }

    // Map form data to API format
    const apiFormData = this.mapFormDataToApi(formData);

    console.log('[ManualEntryService] Mapped API data:', { barcode, apiFormData });

    // Save via API
    const result = await apiService.saveManualEntry(barcode, apiFormData);

    console.log('[ManualEntryService] Entry saved successfully');
    return { ...result, barcode, isDuplicate };
  }
}

// Export default instance for convenience
export default ManualEntryService;