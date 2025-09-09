/**
 * Combine FDA-derived line fields + NADAC row into a Form-222-ready line.
 * @param {object} lineDraft - from fdaResult.buildLineDraftFromInput()
 * @param {object|null} nadacRow - your Medicaid row for that NDC-11 (or null if not found)
 * @param {number} lineNo
 * @param {number} packages - how many packages the purchaser is ordering
 * @returns {{
 *   lineNo:number, packages:number, packageSize:string, itemName:string,
 *   ndc11?:string
 * }}
 */
export function createForm222Line(lineDraft, nadacRow, lineNo, packages = 1) {
  return {
    lineNo,
    packages,
    packageSize: lineDraft.packageSize || "UNKNOWN",
    itemName: lineDraft.brandName || lineDraft.itemName || "Unknown item",
    ndc11: lineDraft.ndcNumber || lineDraft.ndc11 || undefined,
    labeler_name: lineDraft.labeler_name || "Unknown Labeler"
  };
}

/**
 * Validate a Form222 line item to ensure all required fields are present
 * @param {object} lineItem - The line item to validate
 * @returns {{isValid: boolean, errors: string[]}}
 */
export function validateForm222Line(lineItem) {
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
  
  if (!lineItem.labeler_name || lineItem.labeler_name.trim() === "" || lineItem.labeler_name === "Unknown Labeler") {
    errors.push("Labeler name is required and cannot be 'Unknown Labeler'");
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
}
