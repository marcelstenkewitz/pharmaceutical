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
    itemName: lineDraft.itemName || "Unknown item",
    ndc11: lineDraft.ndc11 || undefined
  };
}
