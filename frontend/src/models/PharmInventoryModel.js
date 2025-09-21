import { parsePackageSize, calculateLineTotal, calculatePackagePrice } from '../services/PricingUtils';

/**
 * Create an inventory line item with proper pricing calculations
 * @param {object} lineDraft - from fdaResult.buildLineDraftFromInput()
 * @param {object|null} nadacRow - NADAC pricing data (or null if not found)
 * @param {number} lineNo - Line number (1-10 for Form 222)
 * @param {number} packages - Number of packages being ordered
 * @returns {object} Complete inventory line item with pricing
 */
export function createInventoryLine(lineDraft, nadacRow, lineNo, packages = 1) {
  const packageSize = lineDraft.packageSize || "UNKNOWN";
  const parsedPackage = parsePackageSize(packageSize);

  const pricePerUnit = nadacRow?.pricePerUnit || 0;
  const pricingUnit = nadacRow?.pricingUnit || 'EA';
  const unitsPerPackage = parsedPackage?.count || 1;
  const packageUnit = parsedPackage?.unit || 'units';

  return {
    lineNo,
    packages,
    packageSize,
    itemName: lineDraft.brandName || lineDraft.itemName || "Unknown item",
    ndc11: lineDraft.ndcNumber || lineDraft.ndc11 || undefined,
    labeler_name: lineDraft.labeler_name || "Default Labeler",

    // New pricing fields
    pricePerUnit,           // Price per individual unit (from NADAC)
    pricingUnit,           // Unit type for pricing (EA, ML, GM, etc)
    unitsPerPackage,       // Number of units in each package
    packageUnit,           // Unit type for package (tablets, patches, etc)
    pricePerPackage: calculatePackagePrice(pricePerUnit, unitsPerPackage),
    totalPrice: calculateLineTotal(pricePerUnit, unitsPerPackage, packages),

    dea_schedule: lineDraft.dea_schedule || undefined
  };
}

// Backward compatibility alias for Form 222 usage
export const createForm222Line = createInventoryLine;

/**
 * Validate an inventory line item to ensure all required fields are present
 * @param {object} lineItem - The line item to validate
 * @returns {{isValid: boolean, errors: string[]}}
 */
export function validateInventoryLine(lineItem) {
  const errors = [];

  if (!lineItem) {
    errors.push("Line item is required");
    return { isValid: false, errors };
  }

  // Check required fields
  if (!lineItem.itemName || lineItem.itemName.trim() === "" || lineItem.itemName === "Unknown item") {
    errors.push("Item name is required and cannot be 'Unknown item'");
  }

  if (!lineItem.packageSize || lineItem.packageSize.trim() === "" || lineItem.packageSize === "UNKNOWN") {
    errors.push("Package size is required and cannot be 'UNKNOWN'");
  }

  if (!lineItem.ndc11 || lineItem.ndc11.trim() === "") {
    errors.push("NDC-11 code is required");
  }

  if (!lineItem.packages || typeof lineItem.packages !== 'number' || lineItem.packages <= 0) {
    errors.push("Quantity (packages) must be a positive number");
  }

  if (!lineItem.labeler_name || lineItem.labeler_name.trim() === "") {
    errors.push("Labeler name is required");
  }

  // Validate pricing fields
  if (lineItem.pricePerUnit !== undefined && lineItem.pricePerUnit !== null) {
    if (typeof lineItem.pricePerUnit !== 'number' || lineItem.pricePerUnit < 0) {
      errors.push("Price per unit must be a non-negative number");
    }
  }

  if (lineItem.unitsPerPackage !== undefined && lineItem.unitsPerPackage !== null) {
    if (typeof lineItem.unitsPerPackage !== 'number' || lineItem.unitsPerPackage <= 0) {
      errors.push("Units per package must be a positive number");
    }
  }

  // Validate line number if present
  if (lineItem.lineNo !== undefined && lineItem.lineNo !== null) {
    if (typeof lineItem.lineNo !== 'number' || lineItem.lineNo < 1 || lineItem.lineNo > 10) {
      errors.push("Line number must be between 1 and 10");
    }
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

// Backward compatibility alias for Form 222 usage
export const validateForm222Line = validateInventoryLine;