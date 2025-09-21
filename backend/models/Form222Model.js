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
function createForm222Line(lineDraft, nadacRow, lineNo, packages = 1) {
  return {
    lineNo,
    packages,
    packageSize: lineDraft.packageSize || "UNKNOWN",
    itemName: lineDraft.itemName || "Unknown item",
    ndc11: lineDraft.ndc11 || undefined
  };
}

/**
 * Transform report items into Form 222 line items for PDF generation
 * @param {Array} reportItems - Array of report items
 * @returns {Array} Array of Form 222 line items ready for PDF generation
 */
function transformReportItemsToForm222Lines(reportItems) {
  return reportItems.map((item, index) => ({
    lineNo: index + 1,
    ndc11: item.ndc || item.ndc11,
    itemName: item.name || item.itemName || 'Unknown',
    strength: item.strength || '',
    packageSize: item.packageSize || item.package_size || '',
    packages: item.quantity || item.packages || 1
  }));
}

/**
 * Filter and transform CII/CI items from a report for Form 222 generation
 * @param {Array} reportItems - Array of report items
 * @returns {Array} Array of CII/CI items formatted for Form 222
 */
function getCIIItemsForForm222(reportItems) {
  const ciiItems = (reportItems || []).filter(item => 
    item.dea_schedule === 'CII' || item.dea_schedule === 'CI'
  );
  
  return transformReportItemsToForm222Lines(ciiItems);
}

module.exports = { 
  createForm222Line, 
  transformReportItemsToForm222Lines,
  getCIIItemsForForm222 
};
