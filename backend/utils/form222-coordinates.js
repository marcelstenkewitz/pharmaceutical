/**
 * DEA Form 222 Coordinate Mappings
 * 
 * These coordinates are for placing text on a blank PDF that will be printed
 * on pre-printed DEA Form 222 paper. All coordinates are in PDF points (72 points = 1 inch).
 * 
 * Form 222 is in landscape orientation: 11" x 8.5" (792 x 612 points)
 * Coordinates origin is bottom-left corner (PDF standard)
 */

const FORM_222_COORDINATES = {
  // Page dimensions (landscape)
  pageWidth: 792,
  pageHeight: 612,
  
  // Header Information
  deaNumber: { 
    x: 630, 
    y: 518,
    size: 10,
    characterSpacing: 16.2  // Spacing between individual characters
  },
  orderDate: { x: 276, y: 369 },
  
  // Business/Supplier Information - using base coordinates with spacing adjustments
  business: {
    baseX: 485,           // Base X position for all business fields
    baseY: 490,           // Base Y position starting with name
    lineSpacing: 16,      // Vertical spacing between lines
    size: 8,              // Font size for all business fields
    
    // Individual field offsets from base position
    name: { yOffset: 0 },                    // At baseY
    streetAddress: { yOffset: -18 },         // One line down
    city: { yOffset: -38 },                  // Two lines down
    state: { xOffset: 110, yOffset: -38 },   // Same line as city, but offset to the right
    zipCode: { xOffset: 210, yOffset: -38 }, // Same line as city/state, further right
  },
  
  // Line Items Configuration
  lineItems: {
    startY: 314,        // Y position of first line item
    lineHeight: 14,     // Spacing between lines
    maxItemsPerPage: 20,  // Form 222 has 10 lines
    
    // Column X positions
    columns: {
      lineNumber: { x: 60, size: 8 },
      quantity: { x: 91.5,
         size: 8 },
      packageSize: { x: 131.25, size: 8 },
      itemName: { x: 200, size: 8, maxWidth: 200 },
      ndc: {
        x: 479.25,
        size: 8,
        digitSpacing: 20  // For individual NDC digit placement if needed
      },
    }
  },
  
  // Signature/Footer Section
  footer: {
    totalLineItems: { x: 16, y: 20, size: 10 },
  },
  
  // Development mode settings
  development: {
    jpgOpacity: 0.3,      // Transparency for background image
    gridSpacing: 50,      // Grid line spacing for coordinate finding
    gridColor: { r: 1, g: 0, b: 0 }, // Red grid lines
    gridOpacity: 0.2,
    showCoordinates: true, // Show coordinate labels
    coordinateFontSize: 6,
  }
};

/**
 * Get coordinates for a specific line item row
 * @param {number} lineIndex - Zero-based index of the line (0-9)
 * @returns {object} Y coordinate for the line
 */
function getLineItemY(lineIndex) {
  if (lineIndex < 0 || lineIndex >= FORM_222_COORDINATES.lineItems.maxItemsPerPage) {
    throw new Error(`Line index must be between 0 and ${FORM_222_COORDINATES.lineItems.maxItemsPerPage - 1}`);
  }
  return FORM_222_COORDINATES.lineItems.startY - (lineIndex * FORM_222_COORDINATES.lineItems.lineHeight);
}

/**
 * Format NDC number for display (adds hyphens if needed)
 * @param {string} ndc - NDC number (11 digits)
 * @returns {string} Formatted NDC (e.g., "12345-678-90")
 */
function formatNDC(ndc) {
  if (!ndc || ndc.length !== 11) return ndc;
  return `${ndc.slice(0, 5)}-${ndc.slice(5, 9)}-${ndc.slice(9)}`;
}

/**
 * Validate that all required Form 222 fields are present
 * @param {object} formData - The form data to validate
 * @returns {object} Validation result with isValid flag and errors array
 */
function validateForm222Data(formData) {
  const errors = [];
  
  // Required header fields
  if (!formData.deaNumber) errors.push('DEA Number is required');
  if (!formData.businessName) errors.push('Business Name is required');
  if (!formData.streetAddress) errors.push('Street Address is required');
  if (!formData.city) errors.push('City is required');
  if (!formData.state) errors.push('State is required');
  if (!formData.zipCode) errors.push('ZIP Code is required');
  
  // Validate line items
  if (!formData.lineItems || formData.lineItems.length === 0) {
    errors.push('At least one line item is required');
  } else if (formData.lineItems.length > FORM_222_COORDINATES.lineItems.maxItemsPerPage) {
    errors.push(`Maximum ${FORM_222_COORDINATES.lineItems.maxItemsPerPage} line items per form`);
  } else {
    formData.lineItems.forEach((item, index) => {
      if (!item.packages) errors.push(`Line ${index + 1}: Quantity is required`);
      if (!item.packageSize) errors.push(`Line ${index + 1}: Package Size is required`);
      if (!item.itemName) errors.push(`Line ${index + 1}: Item Name is required`);
      if (!item.ndc11) errors.push(`Line ${index + 1}: NDC is required`);
    });
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
}

module.exports = {
  FORM_222_COORDINATES,
  getLineItemY,
  formatNDC,
  validateForm222Data
};