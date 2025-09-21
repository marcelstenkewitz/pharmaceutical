/**
 * Utility functions for handling pharmaceutical pricing calculations
 */

/**
 * Parse units from package size string
 * Examples:
 *   "100 tablets" -> { count: 100, unit: "tablets" }
 *   "5 patches" -> { count: 5, unit: "patches" }
 *   "10 mL" -> { count: 10, unit: "mL" }
 * @param {string} packageSize - Package size string from FDA or manual entry
 * @returns {{count: number, unit: string} | null}
 */
export function parsePackageSize(packageSize) {
  if (!packageSize || typeof packageSize !== 'string') {
    return null;
  }

  // Match number followed by unit (handles decimals)
  const match = packageSize.trim().match(/^(\d+(?:\.\d+)?)\s*([a-zA-Zμu]+)(?:\s|$)/i);

  if (!match) {
    return null;
  }

  const [, countStr, unit] = match;
  const count = parseFloat(countStr);

  if (isNaN(count) || count <= 0) {
    return null;
  }

  // Normalize common units
  const normalizedUnit = unit.toLowerCase()
    .replace(/^capsules?$/i, "capsules")
    .replace(/^tablet(s)?$/i, "tablets")
    .replace(/^tab(s)?$/i, "tablets")
    .replace(/^cap(s)?$/i, "capsules")
    .replace(/^patch(es)?$/i, "patches")
    .replace(/^ml$/i, "mL")
    .replace(/^gram(s)?$/i, "grams")
    .replace(/^mg$/i, "mg")
    .replace(/^mcg$/i, "mcg");

  return {
    count,
    unit: normalizedUnit
  };
}

/**
 * Calculate total cost for a line item
 * @param {number} pricePerUnit - Price per individual unit (from NADAC)
 * @param {number} unitsPerPackage - Number of units in each package
 * @param {number} packages - Number of packages ordered
 * @returns {number} Total cost
 */
export function calculateLineTotal(pricePerUnit, unitsPerPackage, packages) {
  if (!pricePerUnit || !unitsPerPackage || !packages) {
    return 0;
  }

  return pricePerUnit * unitsPerPackage * packages;
}

/**
 * Calculate cost per package
 * @param {number} pricePerUnit - Price per individual unit (from NADAC)
 * @param {number} unitsPerPackage - Number of units in each package
 * @returns {number} Cost per package
 */
export function calculatePackagePrice(pricePerUnit, unitsPerPackage) {
  if (!pricePerUnit || !unitsPerPackage) {
    return 0;
  }

  return pricePerUnit * unitsPerPackage;
}

/**
 * Format pricing unit for display
 * @param {string} pricingUnit - Raw pricing unit from NADAC (EA, ML, GM, etc)
 * @returns {string} Formatted unit for display
 */
export function formatPricingUnit(pricingUnit) {
  if (!pricingUnit) return 'unit';

  const unit = pricingUnit.toLowerCase();

  switch (unit) {
    case 'ea':
      return 'each';
    case 'ml':
      return 'mL';
    case 'gm':
    case 'gram':
      return 'gram';
    case 'mg':
      return 'mg';
    case 'mcg':
      return 'mcg';
    default:
      return unit;
  }
}