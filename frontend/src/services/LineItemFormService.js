import { calculateLineTotal, calculatePackagePrice, parsePackageSize } from './PricingUtils';

/**
 * LineItemFormService - Shared logic for line item forms
 * Provides consistent data structure and operations for both Manual Entry and Edit modals
 */

/**
 * Create an empty line item form with default values
 * @returns {object} Empty form data structure
 */
export function createEmptyLineItemForm() {
  return {
    barcode: "",           // For manual entry cache key
    itemName: "",
    ndc11: "",
    packageCount: 1,
    packageUnit: "units",
    packageSize: "",       // Will be built from count + unit
    packages: 1,           // Quantity (number of packages)
    pricePerUnit: 0,
    unitsPerPackage: 1,
    pricePerPackage: 0,    // Calculated field
    totalPrice: 0,         // Calculated field
    labeler_name: "",
    return_instructions: "",
    hasFDAData: false,
    isManualEntry: false
  };
}

/**
 * Initialize form from existing line item (for editing)
 * @param {object} lineItem - Existing line item data
 * @returns {object} Form data structure
 */
export function initializeFormFromLineItem(lineItem) {
  const parsed = parsePackageSize(lineItem.packageSize || "");
  return {
    ...createEmptyLineItemForm(),
    ...lineItem,
    packageCount: parsed?.count || lineItem.packageCount || 1,
    packageUnit: parsed?.unit || lineItem.packageUnit || 'units',
    barcode: lineItem.barcode || lineItem.ndc11 || "",
    packages: lineItem.packages || 1,
    pricePerUnit: lineItem.pricePerUnit || 0,
    unitsPerPackage: lineItem.unitsPerPackage || 1,
    return_instructions: lineItem.return_instructions || ""
  };
}

/**
 * Calculate pricing fields automatically
 * @param {object} formData - Current form data
 * @returns {object} Form data with updated pricing calculations
 */
export function calculateFormPricing(formData) {
  const pricePerUnit = parseFloat(formData.pricePerUnit) || 0;
  const unitsPerPackage = parseInt(formData.unitsPerPackage) || 1;
  const packages = parseInt(formData.packages) || 1;

  const pricePerPackage = calculatePackagePrice(pricePerUnit, unitsPerPackage);
  const totalPrice = calculateLineTotal(pricePerUnit, unitsPerPackage, packages);

  return {
    ...formData,
    pricePerPackage,
    totalPrice
  };
}

/**
 * Build packageSize string from components
 * @param {number} packageCount - Number of units per package
 * @param {string} packageUnit - Unit type (tablets, mL, etc.)
 * @returns {string} Formatted package size string
 */
export function buildPackageSize(packageCount, packageUnit) {
  const count = packageCount || 1;
  const unit = packageUnit || 'units';
  return `${count} ${unit}`;
}

/**
 * Validate line item form data
 * @param {object} formData - Form data to validate
 * @returns {{isValid: boolean, errors: string[]}} Validation result
 */
export function validateLineItemForm(formData) {
  const errors = [];

  if (!formData.itemName?.trim()) {
    errors.push("Item Name is required");
  }

  if (!formData.ndc11?.trim()) {
    errors.push("NDC-11 is required");
  }

  if (!formData.packageCount || formData.packageCount < 1) {
    errors.push("Package Size count must be at least 1");
  }

  if (!formData.packageUnit?.trim()) {
    errors.push("Package Unit is required");
  }

  if (!formData.packages || formData.packages < 1) {
    errors.push("Quantity must be at least 1");
  }

  if (!formData.labeler_name?.trim()) {
    errors.push("Labeler name is required");
  }

  return { isValid: errors.length === 0, errors };
}

/**
 * Convert form data to inventory line format
 * @param {object} formData - Form data
 * @returns {object} Inventory line item data
 */
export function formDataToInventoryLine(formData) {
  const finalPackageCount = formData.packageCount || 1;
  const finalPackageUnit = formData.packageUnit || 'units';
  const packageSize = buildPackageSize(finalPackageCount, finalPackageUnit);

  return {
    itemName: formData.itemName,
    ndc11: formData.ndc11,
    barcode: formData.barcode,
    packageSize,
    packageCount: finalPackageCount,
    packageUnit: finalPackageUnit,
    packages: formData.packages || 1,
    pricePerUnit: parseFloat(formData.pricePerUnit) || 0,
    unitsPerPackage: parseInt(formData.unitsPerPackage) || 1,
    pricePerPackage: formData.pricePerPackage || 0,
    totalPrice: formData.totalPrice || 0,
    labeler_name: formData.labeler_name,
    return_instructions: formData.return_instructions || "",
    hasFDAData: formData.hasFDAData || false,
    isManualEntry: formData.isManualEntry || false
  };
}

/**
 * Package unit options for dropdown suggestions
 */
export const PACKAGE_UNIT_OPTIONS = [
  'tablets',
  'capsules',
  'patches',
  'mL',
  'grams',
  'mg',
  'mcg',
  'units'
];

/**
 * Default empty form for resetting
 */
export const EMPTY_FORM = createEmptyLineItemForm();