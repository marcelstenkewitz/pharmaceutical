// src/services/NdcService.js
import { FDAResult } from "../models/FdaResultModel";
import { isDigits, createCache } from "./Util";

// The gs1-barcode-parser library uses an IIFE pattern, so we need to handle it differently
let parseBarcode;
try {
  // Try to import as a module
  const parser = require("gs1-barcode-parser");
  // The library exports parseBarcode directly as an IIFE
  parseBarcode = parser || window.parseBarcode;
} catch (e) {
  // Fallback to undefined, will use our bare parser
  parseBarcode = undefined;
}

/* ------------------ date helpers ------------------ */
const lastDayOfMonth = (y, m) => new Date(y, m, 0).getDate();

const parseYYMMDDtoISO = (yymmdd) => {
  if (!isDigits(yymmdd, 6)) return null;
  const yy = +yymmdd.slice(0, 2),
    mm = +yymmdd.slice(2, 4);
  let dd = +yymmdd.slice(4, 6);
  if (mm < 1 || mm > 12) return null;
  const year = yy >= 80 ? 1900 + yy : 2000 + yy;
  if (dd === 0) dd = lastDayOfMonth(year, mm); // GS1: DD=00 → last day of month
  return new Date(Date.UTC(year, mm - 1, dd)).toISOString().slice(0, 10);
};

/* ------------------ Enhanced GS1 Barcode Parser ------------------ */

/**
 * Enhanced GS1 barcode parser with support for more AI codes
 * Handles pharmaceutical-specific AIs and better error recovery
 * @param {string} s - Raw barcode string
 * @returns {object|null} Parsed AI data or null if invalid
 */
const parseBareGs1 = (s) => {
  if (!s || typeof s !== "string") return null;
  
  const result = {};
  let str = s;

  // Remove all FNC1 separators (both \x1D and ]C1 symbology)
  // eslint-disable-next-line no-control-regex
  str = str.replace(/\x1D/g, "").replace(/\]C1/gi, "");

  // Extended AI patterns for pharmaceuticals
  // AI (01): GTIN-14
  // AI (17): Expiration date (YYMMDD)
  // AI (10): Batch/Lot number (variable length, up to 20)
  // AI (21): Serial number (variable length, up to 20)
  // AI (11): Production date (YYMMDD)
  // AI (30): Variable count (up to 8 digits)
  // AI (310n): Net weight in kg with n decimals
  // AI (320n): Net weight in pounds with n decimals
  const aiPatterns = [
    { ai: "01", pattern: /01(\d{14})/, fixed: true, length: 14 },
    { ai: "17", pattern: /17(\d{6})/, fixed: true, length: 6 },
    { ai: "10", pattern: /10([0-9A-Za-z]{1,20})/, fixed: false, maxLength: 20 },
    { ai: "21", pattern: /21([0-9A-Za-z]{1,20})/, fixed: false, maxLength: 20 },
    { ai: "11", pattern: /11(\d{6})/, fixed: true, length: 6 },
    { ai: "30", pattern: /30(\d{1,8})/, fixed: false, maxLength: 8 },
    { ai: "310", pattern: /310(\d)(\d{6})/, fixed: true, length: 7 },
    { ai: "320", pattern: /320(\d)(\d{6})/, fixed: true, length: 7 }
  ];

  // Try to extract each AI pattern
  for (const { ai, pattern } of aiPatterns) {
    const match = str.match(pattern);
    if (match) {
      result[ai] = match[1];
      // Remove matched portion to avoid re-matching
      str = str.replace(match[0], "");
    }
  }

  // Must have at least GTIN (01) to be valid pharmaceutical GS1
  return result["01"] ? result : null;
};

/**
 * Parse GS1-128 or GS1 DataMatrix barcode with full AI support
 * @param {string} barcode - Raw barcode string
 * @returns {object} Parsed data with all recognized AIs
 */
const parseGS1Full = (barcode) => {
  if (!barcode) return null;
  
  // Try the gs1-barcode-parser library first
  try {
    const parsed = typeof parseBarcode === 'function' ? parseBarcode(barcode) : null;
    if (parsed && parsed.parsedCodeItems && parsed.parsedCodeItems.length > 0) {
      const result = {};
      
      // Map common AI codes
      if (parsed.ai01) result["01"] = parsed.ai01;
      if (parsed.ai17) result["17"] = parsed.ai17;
      if (parsed.ai10) result["10"] = parsed.ai10;
      if (parsed.ai21) result["21"] = parsed.ai21;
      if (parsed.ai11) result["11"] = parsed.ai11;
      if (parsed.ai30) result["30"] = parsed.ai30;
      
      // Also include raw parsed items for debugging
      result._raw = parsed;
      
      return result;
    }
  } catch (e) {
    // Fall back to bare parser if library fails
    console.debug("GS1 library parse failed, using bare parser:", e.message);
  }
  
  // Fall back to our enhanced bare parser
  return parseBareGs1(barcode);
};

/* ------------------ Enhanced Check Digit Validation ------------------ */

/**
 * Calculate GTIN-14 check digit using Modulo-10 algorithm
 * @param {string} body13 - First 13 digits of GTIN-14
 * @returns {number} Check digit (0-9), or -1 if invalid input
 */
const gtin14CheckDigit = (body13) => {
  if (!isDigits(body13, 13)) return -1;
  
  let sum = 0;
  for (let i = 0; i < 13; i++) {
    const n = body13.charCodeAt(12 - i) - 48;
    sum += n * (i % 2 === 0 ? 3 : 1);
  }
  const mod = sum % 10;
  return mod === 0 ? 0 : 10 - mod;
};

/**
 * Validate a complete GTIN-14 including check digit
 * @param {string} gtin14 - Complete 14-digit GTIN
 * @returns {boolean} True if valid GTIN-14 with correct check digit
 */
const validateGtin14 = (gtin14) => {
  if (!isDigits(gtin14, 14)) return false;
  
  // Validate indicator digit (0-8 for standard items, 9 for variable measure)
  const indicator = parseInt(gtin14[0]);
  if (indicator > 9) return false;
  
  // For pharmaceuticals, check for "003" prefix after indicator
  // GTIN-14 for NDC should be: [indicator][003][10-digit NDC][check]
  
  const calculated = gtin14CheckDigit(gtin14.slice(0, 13));
  const provided = parseInt(gtin14[13]);
  
  return calculated === provided;
};

/**
 * Calculate UPC-A check digit using standard algorithm
 * @param {string} body11 - First 11 digits of UPC-A
 * @returns {number} Check digit (0-9), or -1 if invalid input
 */
const upcACheckDigit = (body11) => {
  if (!isDigits(body11, 11)) return -1;
  
  let odd = 0, even = 0;
  for (let i = 0; i < 11; i++) {
    const n = body11.charCodeAt(i) - 48;
    if ((i + 1) % 2) odd += n; else even += n;
  }
  const mod = (3 * odd + even) % 10;
  return (10 - mod) % 10;
};

/**
 * Validate a complete UPC-A including check digit
 * @param {string} upc12 - Complete 12-digit UPC-A
 * @returns {boolean} True if valid UPC-A with correct check digit
 */
const validateUpcA = (upc12) => {
  if (!isDigits(upc12, 12)) return false;
  
  // For pharmaceuticals, first digit should be "3"
  // Some OTC products may use "0"
  if (upc12[0] !== "3" && upc12[0] !== "0") return false;
  
  const calculated = upcACheckDigit(upc12.slice(0, 11));
  const provided = parseInt(upc12[11]);
  
  return calculated === provided;
};

/**
 * Detect barcode type from a string of digits
 * @param {string} digits - String of digits
 * @returns {string|null} "gtin14", "upca", "ndc11", "ndc10", or null
 */
const detectBarcodeType = (digits) => {
  const cleaned = digits.replace(/\D/g, "");
  
  if (isDigits(cleaned, 14) && validateGtin14(cleaned)) {
    return "gtin14";
  }
  if (isDigits(cleaned, 12) && validateUpcA(cleaned)) {
    return "upca";
  }
  if (isDigits(cleaned, 11)) {
    return "ndc11";
  }
  if (isDigits(cleaned, 10)) {
    return "ndc10";
  }
  
  return null;
};

/**
 * Expand a 10-digit NDC to all possible 11-digit NDCs (FDA rules)
 * Handles all standard NDC formats: 4-4-2, 5-3-2, 5-4-1, and future 6-3-2, 6-4-1
 * @param {string} ndc10 - 10-digit NDC
 * @returns {string[]} Array of possible 11-digit NDC expansions
 */
const expandNdc10To11All = (ndc10) => {
  if (!isDigits(ndc10, 10)) return [];
  
  const cands = new Set();
  
  // Standard expansions for current formats
  // 4-4-2 → 5-4-2: pad labeler to 5 (leading 0)
  cands.add("0" + ndc10);
  
  // 5-3-2 → 5-4-2: pad product to 4 (insert 0 after 5th digit)
  cands.add(ndc10.slice(0, 5) + "0" + ndc10.slice(5));
  
  // 5-4-1 → 5-4-2: pad package to 2 (insert 0 before last digit)
  cands.add(ndc10.slice(0, 9) + "0" + ndc10.slice(9));
  
  // Additional patterns for edge cases
  // 6-3-1 → 6-4-1: pad product (for future 12-digit NDCs)
  if (ndc10[0] !== "0") {
    cands.add(ndc10.slice(0, 6) + "0" + ndc10.slice(6));
  }
  
  return [...cands].filter(x => isDigits(x, 11));
};

/**
 * Validate NDC format structure
 * @param {string} ndc - NDC with dashes
 * @returns {boolean} True if valid NDC format
 */
const validateNdcFormat = (ndc) => {
  if (!ndc || typeof ndc !== "string") return false;
  
  const parts = ndc.split("-");
  if (parts.length !== 3 && parts.length !== 2) return false;
  
  // Product-level NDC (2 segments)
  if (parts.length === 2) {
    const [labeler, product] = parts;
    return (
      (labeler.length === 4 || labeler.length === 5 || labeler.length === 6) &&
      (product.length === 3 || product.length === 4) &&
      isDigits(labeler, labeler.length) &&
      isDigits(product, product.length)
    );
  }
  
  // Package-level NDC (3 segments)
  const [labeler, product, pkg] = parts;
  const validFormat = (
    // 4-4-2
    (labeler.length === 4 && product.length === 4 && pkg.length === 2) ||
    // 5-3-2
    (labeler.length === 5 && product.length === 3 && pkg.length === 2) ||
    // 5-4-1
    (labeler.length === 5 && product.length === 4 && pkg.length === 1) ||
    // 6-3-2 (future)
    (labeler.length === 6 && product.length === 3 && pkg.length === 2) ||
    // 6-4-1 (future)
    (labeler.length === 6 && product.length === 4 && pkg.length === 1)
  );
  
  return (
    validFormat &&
    isDigits(labeler, labeler.length) &&
    isDigits(product, product.length) &&
    isDigits(pkg, pkg.length)
  );
};

/**
 * Extract NDC from GTIN-14 with enhanced validation
 * @param {string} gtin14 - 14-digit GTIN
 * @returns {string[]} Array of possible 11-digit NDCs, or empty if invalid
 */
const ndc11sFromGtin14 = (gtin14) => {
  if (!isDigits(gtin14, 14)) return [];
  
  // Validate GTIN-14 structure
  if (!validateGtin14(gtin14)) return [];
  
  // Check for pharmaceutical prefix (x03 where x is indicator)
  // GTIN-14 for NDC: [indicator][03][10-digit NDC][check]
  if (gtin14.slice(1, 3) !== "03") {
    // Not a pharmaceutical GTIN-14
    return [];
  }
  
  // Extract the 10-digit NDC (positions 3-12)
  const ndc10 = gtin14.slice(3, 13);
  
  // Expand to all possible 11-digit formats
  return expandNdc10To11All(ndc10);
};

/**
 * Build GTIN-14 from NDC with specified indicator
 * 
 * This function is essential for multiple use cases beyond scanning:
 * 1. Manual Entry Support - When users manually enter NDC numbers without barcodes
 * 2. Format Normalization - Converting various NDC formats to standard GTIN-14
 * 3. FDA API Integration - OpenFDA returns NDCs that need GTIN-14 conversion
 * 4. Validation - Reconstructing expected GTIN-14 to verify scanned barcodes
 * 5. Future Capabilities - Enabling barcode label generation and printing
 * 
 * The pharmaceutical industry uses multiple barcode formats (NDC-10, NDC-11, UPC-A, GTIN-14)
 * and this function ensures consistency across all data sources and entry methods.
 * 
 * @param {string} ndc - NDC in any format (10/11 digits, with/without dashes)
 * @param {number} indicator - Packaging level indicator (0-8)
 * @returns {string|null} 14-digit GTIN or null if invalid
 */
const ndcToGtin14 = (ndc, indicator = 0) => {
  if (indicator < 0 || indicator > 8) return null;
  
  // Remove dashes and normalize to 10 digits
  const digits = ndc.replace(/\D/g, "");
  let ndc10;
  
  if (digits.length === 11) {
    // Convert 11-digit to 10-digit by removing padding
    // Try each possible padding position
    const candidates = [
      digits.slice(1),        // Remove leading 0 (4-4-2 → 5-4-2)
      digits.slice(0, 5) + digits.slice(6),  // Remove 6th digit (5-3-2 → 5-4-2)
      digits.slice(0, 9) + digits.slice(10)  // Remove 10th digit (5-4-1 → 5-4-2)
    ];
    
    // Use the first valid 10-digit result
    ndc10 = candidates.find(c => isDigits(c, 10));
  } else if (digits.length === 10) {
    ndc10 = digits;
  } else {
    return null;
  }
  
  if (!ndc10) return null;
  
  // Build GTIN-14: [indicator][03][ndc10]
  const body13 = String(indicator) + "03" + ndc10;
  const checkDigit = gtin14CheckDigit(body13);
  
  if (checkDigit === -1) return null;
  
  return body13 + checkDigit;
};

/**
 * Extract NDC from UPC-A with enhanced pharmaceutical validation
 * @param {string} upc12 - 12-digit UPC-A
 * @returns {string[]} Array of possible 11-digit NDCs, or empty if invalid
 */
const ndc11sFromUpcA = (upc12) => {
  if (!isDigits(upc12, 12)) return [];
  
  // Validate UPC-A structure and check digit
  if (!validateUpcA(upc12)) return [];
  
  // Pharmaceutical UPC-A codes MUST start with "3"
  // OTC products may use "0" but are less common
  if (upc12[0] !== "3" && upc12[0] !== "0") return [];
  
  // Extract the 10-digit NDC (positions 1-10)
  const ndc10 = upc12.slice(1, 11);
  
  // Expand to all possible 11-digit formats
  return expandNdc10To11All(ndc10);
};

/**
 * Build UPC-A from NDC
 * 
 * This conversion function supports:
 * 1. Manual NDC Entry - Converting user-entered NDCs to scannable UPC-A format
 * 2. Barcode Generation - Creating UPC-A barcodes for products entered manually
 * 3. Cross-System Compatibility - Some systems require UPC-A format instead of GTIN-14
 * 4. Validation - Verifying NDC entries by reconstructing their UPC-A representation
 * 
 * UPC-A is commonly used in retail pharmacy settings, while GTIN-14 is used
 * for case-level packaging and distribution.
 * 
 * @param {string} ndc - NDC in any format
 * @param {boolean} usePharmPrefix - Use "3" prefix (true) or "0" prefix (false)
 * @returns {string|null} 12-digit UPC-A or null if invalid
 */
const ndcToUpcA = (ndc, usePharmPrefix = true) => {
  // Remove dashes and normalize to 10 digits
  const digits = ndc.replace(/\D/g, "");
  let ndc10;
  
  if (digits.length === 11) {
    // Convert 11-digit to 10-digit by removing padding
    const candidates = [
      digits.slice(1),        // Remove leading 0
      digits.slice(0, 5) + digits.slice(6),  // Remove 6th digit
      digits.slice(0, 9) + digits.slice(10)  // Remove 10th digit
    ];
    
    ndc10 = candidates.find(c => isDigits(c, 10));
  } else if (digits.length === 10) {
    ndc10 = digits;
  } else {
    return null;
  }
  
  if (!ndc10) return null;
  
  // Build UPC-A: [3 or 0][ndc10][check]
  const prefix = usePharmPrefix ? "3" : "0";
  const body11 = prefix + ndc10;
  const checkDigit = upcACheckDigit(body11);
  
  if (checkDigit === -1) return null;
  
  return body11 + checkDigit;
};

/* ---------- EXPANDERS (FIXED to include 5-4-1 “shifted” case) ---------- */

// Expand NDC-11 to all possible package-level NDC-10 (dashed) candidates
const expandNdc11ToPackageCandidates = (ndc11) => {
  if (!isDigits(ndc11, 11)) return [];
  const L5 = ndc11.slice(0, 5);   // A..E
  const L4 = ndc11.slice(1, 5);   // B..E
  const P4 = ndc11.slice(5, 9);   // F..I  (may be zero-padded if source was 5-3-2)
  const P3_raw = ndc11.slice(5, 8);   // F..H  (naive)
  const K2 = ndc11.slice(9, 11);      // J..K
  const K1 = ndc11.slice(10, 11);     // K
  const K2_533 = ndc11.slice(8, 10);  // I..J (for 5-3-3)

  // If the source was 5-3-2, NDC-11 has a pad '0' at ndc11[5]; use P4.slice(1) → real 3-digit product
  const P3 = ndc11[5] === "0" ? P4.slice(1) : P3_raw;

  const out = new Set();

  // Standard forms
  out.add(`${L5}-${P4}-${K2}`);  // 5-4-2  (e.g., 67457-0217-20)
  out.add(`${L4}-${P4}-${K2}`);  // 4-4-2  (e.g., 7457-0217-20)
  out.add(`${L5}-${P3}-${K2}`);  // 5-3-2  (now 67457-217-20 ✅)
  out.add(`${L5}-${P4}-${K1}`);  // 5-4-1
  // 5-3-3 variant (product 3, package 2 drawn from I..J)
  out.add(`${L5}-${P3}-${K2_533}`); // e.g., 67457-217-72

  // SPECIAL: shifted 5-4-1 when ndc11 starts with '0'
  if (ndc11[0] === "0") {
    const L5s = ndc11.slice(1, 6);
    const P4s = ndc11.slice(6, 10);
    const K1s = ndc11.slice(10, 11);
    out.add(`${L5s}-${P4s}-${K1s}`);
  }

  return [...out];
};

// Expand NDC-11 to all possible product-level NDC-10 (dashed) candidates
const expandNdc11ToProductCandidates = (ndc11) => {
  if (!isDigits(ndc11, 11)) return [];
  const L5 = ndc11.slice(0, 5);
  const L4 = ndc11.slice(1, 5);
  const P4 = ndc11.slice(5, 9);
  const P3_raw = ndc11.slice(5, 8);

  // Same padding rule for product-level expansions
  const P3 = ndc11[5] === "0" ? P4.slice(1) : P3_raw;

  const out = new Set([
    `${L5}-${P4}`, // 5-4
    `${L4}-${P4}`, // 4-4
    `${L5}-${P3}`, // 5-3  (now 67457-217 ✅)
  ]);

  // SPECIAL: shifted 5-4-1 → 5-4 product
  if (ndc11[0] === "0") {
    const L5s = ndc11.slice(1, 6);
    const P4s = ndc11.slice(6, 10);
    out.add(`${L5s}-${P4s}`);
  }

  return [...out];
};

// Export for backward compatibility (used by other components)
export const ndc11ToNdc10Candidates = expandNdc11ToPackageCandidates;

/* ------------------ OpenFDA lookup ------------------ */
const fetchJson = async (url, fetchFn, signal) => {
  const r = await fetchFn(url, { signal });
  if (!r.ok) throw new Error(`OpenFDA ${r.status} ${r.statusText}`);
  return r.json();
};

const verifyWithOpenFda = async (ndc11, fetchFn, signal) => {
  const timestamp = new Date().toISOString();
  console.debug(`[NDC Service ${timestamp}] 🚀 verifyWithOpenFda() called for NDC-11: "${ndc11}"`);
  
  if (!isDigits(ndc11, 11))
    return { ok: false, reason: "Input must be 11 digits", ndc11 };

  const packageCandidates = expandNdc11ToPackageCandidates(ndc11);
  const productCandidates = expandNdc11ToProductCandidates(ndc11);

  console.debug(`[NDC Service ${timestamp}] 📦 Package candidates: ${packageCandidates.join(', ')}`);
  console.debug(`[NDC Service ${timestamp}] 🏭 Product candidates: ${productCandidates.join(', ')}`);

  // 1) exact package first (try all package candidates)
  for (const pkg of packageCandidates) {
    const url = `https://api.fda.gov/drug/ndc.json?search=packaging.package_ndc:"${encodeURIComponent(pkg)}"&limit=1`;
    console.debug(`[NDC Service ${timestamp}] 🔎 Trying package lookup: ${pkg} -> ${url}`);
    
    try {
      const data = await fetchJson(url, fetchFn, signal);
      
      const hit = data?.results?.[0];
      if (hit) {
        console.debug(`[NDC Service ${timestamp}] ✅ Found package match for ${pkg}: ${hit.brand_name || hit.generic_name}`);
        const pkgHit = (hit.packaging || []).find((p) => p.package_ndc === pkg) || null;
        const fdaResult = new FDAResult(hit);
        const result = {
          ok: true,
          confidence: "package-exact",
          ndc11,
          ndc10: pkg,
          product_ndc: fdaResult.product_ndc,
          brand_name: fdaResult.brand_name,
          generic_name: fdaResult.generic_name,
          labeler_name: fdaResult.labeler_name,
          dosage_form: fdaResult.dosage_form,
          route: fdaResult.route,
          dea_schedule: fdaResult.dea_schedule, // NEW: Include DEA schedule
          package: pkgHit,
          raw: fdaResult,
        };
        console.debug(`[NDC Service ${timestamp}] 🎯 Returning package-exact result:`, {
          ndc11: result.ndc11,
          ndc10: result.ndc10,
          brand_name: result.brand_name
        });
        return result;
      } else {
        console.debug(`[NDC Service ${timestamp}] ❌ No package match for ${pkg}`);
      }
    } catch (e) {
      console.warn(`[NDC Service ${timestamp}] ⚠️ OpenFDA package-exact error for ${pkg}:`, e.message);
      // Continue to next candidate instead of stopping
    }
  }

  // 2) product-level fallback (try all product candidates)
  for (const prod of productCandidates) {
    const url = `https://api.fda.gov/drug/ndc.json?search=product_ndc:"${encodeURIComponent(prod)}"&limit=1`;
    console.debug(`[NDC Service] Trying product lookup: ${prod}`);
    
    try {
      const data = await fetchJson(url, fetchFn, signal);
      if (data?.results?.length) {
        console.debug(`[NDC Service] ✓ Found product match for ${prod}: ${data.results[0].brand_name || data.results[0].generic_name}`);
        return {
          ok: true,
          confidence: "product-level",
          ndc11,
          ndc10_candidates: packageCandidates,
          product_ndc: prod,
          matches: data.results.map((r) => new FDAResult(r)),
        };
      } else {
        console.debug(`[NDC Service] ✗ No product match for ${prod}`);
      }
    } catch (e) {
      console.warn(`[NDC Service] OpenFDA product-level error for ${prod}:`, e.message);
      // Continue to next candidate
    }
  }

  console.debug(`[NDC Service] No FDA matches found for NDC-11: ${ndc11}`);
  return {
    ok: false,
    reason: "No OpenFDA match found after trying all candidates",
    ndc11,
    ndc10_candidates: packageCandidates,
    product_candidates_tried: productCandidates,
  };
};

/* ------------------ Enhanced Normalization with Error Recovery ------------------ */

/**
 * Strip symbology identifiers and control characters
 * @param {string} s - Raw barcode string
 * @returns {string} Cleaned barcode string
 */
const stripSymbologyAndLeadingFNC1 = (s) =>
  String(s)
    .replace(/\]C1|\]d2|\]e0|\]E0/gi, "")  // Remove common symbology identifiers
    // eslint-disable-next-line no-control-regex
    .replace(/[\x1D]/g, "")                   // Remove FNC1 separators
    // eslint-disable-next-line no-control-regex
    .replace(/^[\x00-\x1F]+/, "")            // Remove leading control characters
    .trim();                                  // Remove whitespace

/**
 * Enhanced barcode normalization with multiple parsing strategies
 * @param {string} raw - Raw barcode scan
 * @returns {object} Normalized result with NDC and metadata
 */
const normalizeScan = (raw) => {
  const startTime = new Date().toISOString();
  console.debug(`[NDC Service ${startTime}] ========== NORMALIZE SCAN START ==========`);
  console.debug(`[NDC Service ${startTime}] Raw input: "${raw}"`);
  
  if (raw == null || raw === "") {
    console.debug(`[NDC Service ${startTime}] Empty input, returning failure`);
    return { ok: false, reason: "Empty scan" };
  }
  
  const text = stripSymbologyAndLeadingFNC1(raw);
  console.debug(`[NDC Service ${startTime}] After stripping symbology: "${text}"`);
  
  // Check for NDC format with dashes BEFORE extracting digits to avoid GTIN-14 misclassification
  if (validateNdcFormat(text)) {
    console.debug(`[NDC Service ${startTime}] → Detected NDC format with dashes: "${text}"`);
    const digits = text.replace(/\D/g, "");
    console.debug(`[NDC Service ${startTime}] NDC digits extracted: "${digits}" (length: ${digits.length})`);
    
    if (isDigits(digits, 10)) {
      console.debug(`[NDC Service ${startTime}] → Processing as 10-digit NDC from dashed format`);
      const candidates = expandNdc10To11All(digits);
      console.debug(`[NDC Service ${startTime}] 10-digit expansion candidates: ${candidates.join(', ')}`);
      if (candidates.length) {
        console.debug(`[NDC Service ${startTime}] ✅ SUCCESS: 10-digit NDC from dashed format processed`);
        return {
          ok: true,
          source: "ndc10-dashed",
          barcodeType: "ndc10",
          ndc11: candidates[0],
          ndc11_candidates: candidates,
          ndc10: digits,
          lot: null,
          expiry: null,
          serial: null,
          note: "10-digit NDC with dashes expanded to 11-digit candidates"
        };
      }
    } else if (isDigits(digits, 11)) {
      console.debug(`[NDC Service ${startTime}] → Processing as 11-digit NDC from dashed format`);
      console.debug(`[NDC Service ${startTime}] ✅ SUCCESS: 11-digit NDC from dashed format processed`);
      return {
        ok: true,
        source: "ndc11-dashed", 
        barcodeType: "ndc11",
        ndc11: digits,
        ndc11_candidates: [digits],
        lot: null,
        expiry: null,
        serial: null,
        note: "11-digit NDC with dashes processed directly"
      };
    }
  }
  
  const digits = text.replace(/\D/g, "");
  console.debug(`[NDC Service ${startTime}] Extracted digits: "${digits}" (length: ${digits.length})`);
  
  // Detect barcode type for better error messages and routing
  const detectedType = detectBarcodeType(digits);
  console.debug(`[NDC Service ${startTime}] Detected barcode type: ${detectedType} for digits: ${digits}`);
  
  // Strategy 1: Check for direct NDC formats FIRST (avoid GTIN-14 misclassification)
  if (isDigits(digits, 10)) {
    console.debug(`[NDC Service ${startTime}] → Taking Strategy 1: 10-digit NDC processing`);
    // 10-digit NDC - expand to all possible 11-digit formats
    const candidates = expandNdc10To11All(digits);
    console.debug(`[NDC Service ${startTime}] 10-digit expansion candidates: ${candidates.join(', ')}`);
    if (candidates.length) {
      console.debug(`[NDC Service ${startTime}] ✅ Strategy 1 SUCCESS: 10-digit NDC processed`);
      const result = {
        ok: true,
        source: "ndc10-expanded",
        barcodeType: "ndc10",
        ndc11: candidates[0],
        ndc11_candidates: candidates,
        ndc10: digits,
        lot: null,
        expiry: null,
        serial: null,
        note: "10-digit NDC expanded to 11-digit candidates"
      };
      console.debug(`[NDC Service ${startTime}] ========== NORMALIZE SCAN END (Strategy 1) ==========`);
      return result;
    }
  }
  
  if (isDigits(digits, 11) && !digits.startsWith("3")) {
    console.debug(`[NDC Service ${startTime}] → Taking Strategy 1b: 11-digit NDC direct processing`);
    // Direct 11-digit NDC (not UPC-A format which starts with 3)
    console.debug(`[NDC Service ${startTime}] ✅ Strategy 1b SUCCESS: 11-digit NDC processed`);
    const result = {
      ok: true,
      source: "ndc11-direct",
      barcodeType: "ndc11",
      ndc11: digits,
      ndc11_candidates: [digits],
      lot: null,
      expiry: null,
      serial: null
    };
    console.debug(`[NDC Service ${startTime}] ========== NORMALIZE SCAN END (Strategy 1b) ==========`);
    return result;
  }
  
  // Strategy 2: Check if it's a direct GTIN-14 (14 digits)
  if (isDigits(digits, 14)) {
    console.debug(`[NDC Service] Processing as GTIN-14: ${digits}`);
    if (validateGtin14(digits)) {
      const ndc11s = ndc11sFromGtin14(digits);
      
      if (ndc11s.length) {
        return {
          ok: true,
          source: "gs1-gtin14",
          barcodeType: "gtin14",
          ndc11: ndc11s[0],
          ndc11_candidates: ndc11s,
          gtin14: digits,
          lot: null,
          expiry: null,
          serial: null
        };
      } else {
        return { 
          ok: false, 
          reason: "GTIN-14 detected but not pharmaceutical (missing 003 prefix)",
          detectedType: "gtin14",
          gtin14: digits,
          suggestion: "This appears to be a non-pharmaceutical GTIN-14. Try manual entry or scan a pharmaceutical barcode."
        };
      }
    } else {
      return {
        ok: false,
        reason: "Invalid GTIN-14 check digit",
        detectedType: "gtin14",
        raw: digits,
        suggestion: "Check digit validation failed. Verify the complete barcode was scanned."
      };
    }
  }

  // Strategy 3: Try GS1 parsing (GTIN-14 with additional data)
  let ai = null;
  try {
    ai = parseGS1Full(text);
  } catch (e) {
    console.debug("GS1 parsing failed:", e.message);
  }

  if (ai && ai["01"]) {
    const gtin14 = ai["01"];
    
    // Validate GTIN-14 before processing
    if (validateGtin14(gtin14)) {
      const ndc11s = ndc11sFromGtin14(gtin14);
      
      if (ndc11s.length) {
        return {
          ok: true,
          source: "gs1-gtin14",
          barcodeType: "gtin14",
          ndc11: ndc11s[0],
          ndc11_candidates: ndc11s,
          gtin14,
          lot: ai["10"] || null,
          expiry: ai["17"] ? parseYYMMDDtoISO(ai["17"]) : null,
          serial: ai["21"] || null,
          productionDate: ai["11"] ? parseYYMMDDtoISO(ai["11"]) : null,
          metadata: ai
        };
      } else {
        return { 
          ok: false, 
          reason: "GTIN-14 detected but not pharmaceutical (missing 003 prefix)",
          detectedType: "gtin14",
          gtin14
        };
      }
    } else {
      // GTIN-14 format but invalid check digit
      return {
        ok: false,
        reason: "Invalid GTIN-14 check digit",
        detectedType: "gtin14",
        raw: gtin14
      };
    }
  }

  // Strategy 4: Try UPC-A parsing (12 digits with pharmaceutical prefix)
  if (digits.length === 12 || digits.length === 11) {
    console.debug(`[NDC Service ${startTime}] → Taking Strategy 4: UPC-A processing (${digits.length} digits)`);
    let upc12 = digits;
    
    // Auto-complete UPC-A if 11 digits
    if (digits.length === 11 && (digits[0] === "3" || digits[0] === "0")) {
      const checkDigit = upcACheckDigit(digits);
      if (checkDigit !== -1) {
        upc12 = digits + checkDigit;
      }
    }
    
    console.debug(`[NDC Service ${startTime}] UPC-A validation for: ${upc12}`);
    if (validateUpcA(upc12)) {
      console.debug(`[NDC Service ${startTime}] UPC-A validation passed, extracting NDCs`);
      const ndc11s = ndc11sFromUpcA(upc12);
      console.debug(`[NDC Service ${startTime}] UPC-A NDC candidates: ${ndc11s.join(', ')}`);
      
      if (ndc11s.length) {
        console.debug(`[NDC Service ${startTime}] ✅ Strategy 4 SUCCESS: UPC-A processed`);
        const result = {
          ok: true,
          source: "upc-a",
          barcodeType: "upca",
          ndc11: ndc11s[0],
          ndc11_candidates: ndc11s,
          upc12,
          lot: null,
          expiry: null,
          serial: null
        };
        console.debug(`[NDC Service ${startTime}] ========== NORMALIZE SCAN END (Strategy 4) ==========`);
        return result;
      }
    } else {
      console.debug(`[NDC Service ${startTime}] UPC-A validation failed for: ${upc12}`);
    }
    
    if (digits.length === 12) {
      // UPC-A format but invalid
      const expectedCheck = upcACheckDigit(digits.slice(0, 11));
      return {
        ok: false,
        reason: `Invalid UPC-A check digit (expected ${expectedCheck}, got ${digits[11]})`,
        detectedType: "upca",
        raw: digits
      };
    }
  }

  // Strategy 5: Try to parse dashed NDC format
  if (text.includes("-") && validateNdcFormat(text)) {
    // Convert dashed NDC to 11-digit format
    const parts = text.split("-");
    if (parts.length === 3) {
      // Normalize to 11-digit
      const ndc11 = parts[0].padStart(5, "0") + 
                    parts[1].padStart(4, "0") + 
                    parts[2].padStart(2, "0");
      
      if (isDigits(ndc11, 11)) {
        return {
          ok: true,
          source: "ndc-dashed",
          barcodeType: "ndc-dashed",
          ndc11,
          ndc11_candidates: [ndc11],
          ndcFormatted: text,
          lot: null,
          expiry: null,
          serial: null
        };
      }
    }
  }

  // Enhanced error message with suggestions
  let errorReason = "Unrecognized barcode format";
  let suggestions = [];
  
  if (digits.length === 13) {
    errorReason = "13-digit code detected (possibly EAN-13, not supported for pharmaceuticals)";
    suggestions.push("Use UPC-A (12 digits) or GTIN-14 (14 digits) for pharmaceutical products");
  } else if (digits.length === 8) {
    errorReason = "8-digit code detected (possibly EAN-8 or truncated)";
    suggestions.push("Ensure complete barcode is scanned");
  } else if (digits.length > 0 && digits.length < 10) {
    // Check if there were non-numeric characters
    if (text.match(/[a-zA-Z]/)) {
      errorReason = "Unrecognized barcode format";
      suggestions.push("Pharmaceutical barcodes should contain only numeric digits");
    } else {
      errorReason = `Incomplete code (${digits.length} digits)`;
      suggestions.push("NDC codes should be 10 or 11 digits");
    }
  } else if (digits.length > 14) {
    errorReason = "Code too long for standard pharmaceutical barcodes";
    suggestions.push("Check if multiple barcodes were scanned together");
  }
  
  return { 
    ok: false, 
    reason: errorReason,
    suggestions,
    detectedLength: digits.length,
    raw: text
  };
};

/* ------------------ Public API with Enhanced Features ------------------ */

/**
 * Create an enhanced NDC service with improved barcode handling
 * @param {object} options - Configuration options
 * @returns {object} NDC service instance
 */
export function createNdcService(options = {}) {
  const fetchFn = options.fetch || (typeof fetch !== "undefined" ? fetch : null);
  if (!fetchFn) throw new Error("No fetch available; pass { fetch } in Node <18.");

  const cache = createCache(options.cacheSize || 200);
  const debug = options.debug || false;
  
  // Debug cache contents for troubleshooting
  console.debug(`[NDC Service] 🗃️ Cache initialized. Cache size: ${cache.size}`);
  if (cache.size > 0) {
    const allKeys = Array.from(cache.keys());
    console.debug(`[NDC Service] 🗃️ Current cache keys:`, allKeys.slice(0, 10));
    console.debug(`[NDC Service] 🗃️ Sample cache entries:`, allKeys.slice(0, 5).map(key => ({
      key,
      value: {
        ok: cache.get(key)?.ok,
        brand_name: cache.get(key)?.brand_name,
        ndc11: cache.get(key)?.ndc11
      }
    })));
  }

  // Enhanced verification with better error recovery
  const verify = async (ndc11, { signal, requestId } = {}) => {
    const timestamp = new Date().toISOString();
    const reqId = requestId ? `[${requestId}]` : '';
    console.debug(`[NDC Service ${timestamp}] ${reqId} 🔍 verify() called for NDC: "${ndc11}"`);
    
    const key = `openfda:${ndc11}`;
    console.debug(`[NDC Service ${timestamp}] ${reqId} 🗝️ Cache key: "${key}"`);
    
    const cached = cache.get(key);
    if (cached) {
      // COLLISION DETECTION: Check if cached result matches requested NDC
      const expectedNdc = cached.ndc11 || cached.ndc10;
      const isCorrectCache = expectedNdc === ndc11 || 
                            cached.ndc11_candidates?.includes(ndc11) ||
                            cached.ndc10_candidates?.includes(ndc11);
      
      console.debug(`[NDC Service ${timestamp}] ${reqId} 💾 Cache hit for key "${key}":`, {
        requestedNdc: ndc11,
        cachedNdc11: cached.ndc11,
        cachedNdc10: cached.ndc10,
        cachedBrandName: cached.brand_name,
        isCorrectCache,
        ok: cached.ok,
        reason: cached.reason
      });
      
      if (!isCorrectCache && cached.ok) {
        console.error(`[NDC Service ${timestamp}] ${reqId} ❌ CACHE COLLISION DETECTED!`, {
          requestedNdc: ndc11,
          cacheKey: key,
          cachedResult: {
            ndc11: cached.ndc11,
            ndc10: cached.ndc10,
            brand_name: cached.brand_name,
            ndc11_candidates: cached.ndc11_candidates,
            ndc10_candidates: cached.ndc10_candidates
          }
        });
      }
      
      return cached;
    }
    
    console.debug(`[NDC Service ${timestamp}] ${reqId} 🌐 Cache miss - making FDA API call for ${ndc11}`);
    try {
      const res = await verifyWithOpenFda(ndc11, fetchFn, signal);
      console.debug(`[NDC Service ${timestamp}] ${reqId} ✅ FDA API response for ${ndc11}:`, {
        ok: res.ok,
        brand_name: res.brand_name,
        ndc11: res.ndc11,
        ndc10: res.ndc10 || 'undefined',
        reason: res.reason,
        confidence: res.confidence
      });
      
      console.debug(`[NDC Service ${timestamp}] ${reqId} 💾 Caching result with key "${key}"`);
      cache.set(key, res);
      return res;
    } catch (error) {
      console.debug(`[NDC Service ${timestamp}] ${reqId} ❌ FDA API error for ${ndc11}:`, error.message);
      const errorResult = {
        ok: false,
        reason: `OpenFDA verification failed: ${error.message}`,
        ndc11,
        error
      };
      // Don't cache errors
      return errorResult;
    }
  };

  // Enhanced scan and verify with multiple strategies
  const scanAndVerify = async (raw, { signal } = {}) => {
    // Generate unique request ID for race condition tracking
    const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const timestamp = new Date().toISOString();
    
    console.debug(`[NDC Service ${timestamp}] 🚀 scanAndVerify [${requestId}] called with: "${raw}"`);
    const norm = normalizeScan(raw);
    
    if (debug) {
      console.log(`[NDC Service ${timestamp}] [${requestId}] Normalized scan result:`, norm);
    }
    
    if (!norm.ok) {
      console.debug(`[NDC Service ${timestamp}] [${requestId}] Normalization failed: ${norm.reason}`);
      // If normalization failed but we have suggestions, include them
      return {
        ok: false,
        ...norm,
        allowManualEntry: true,
        requestId
      };
    }
    
    if (!norm.ndc11) {
      console.debug(`[NDC Service ${timestamp}] [${requestId}] No NDC11 extracted from normalized result`);
      return { 
        ok: false, 
        reason: "No NDC could be extracted",
        ...norm,
        requestId
      };
    }

    const candidates = norm.ndc11_candidates || [norm.ndc11];
    console.debug(`[NDC Service ${timestamp}] [${requestId}] Will verify ${candidates.length} NDC-11 candidate(s): ${candidates.join(', ')}`);
    const verificationResults = [];
    let bestResult = null;
    
    // Try all candidates
    for (const ndc11 of candidates) {
      console.debug(`[NDC Service ${timestamp}] [${requestId}] Verifying candidate: ${ndc11}`);
      const v = await verify(ndc11, { signal, requestId });
      console.debug(`[NDC Service ${timestamp}] [${requestId}] Verification result for ${ndc11}:`, {
        ok: v.ok,
        brand_name: v.brand_name,
        ndc11: v.ndc11,
        ndc10: v.ndc10
      });
      verificationResults.push({ ndc11, result: v });
      
      if (v.ok) {
        if (v.confidence === "package-exact") {
          // Found exact package match - this is best
          bestResult = {
            ok: true,
            source: norm.source,
            barcodeType: norm.barcodeType,
            ndc11,
            ndc10: v.ndc10,
            product_ndc: v.product_ndc,
            brand_name: v.brand_name,
            generic_name: v.generic_name,
            labeler_name: v.labeler_name,
            dosage_form: v.dosage_form,
            route: v.route,
            dea_schedule: v.dea_schedule, // NEW: Include DEA schedule
            package: v.package,
            lot: norm.lot,
            expiry: norm.expiry,
            serial: norm.serial,
            productionDate: norm.productionDate,
            confidence: "high"
          };
          break; // Best possible match found
        } else if (v.confidence === "product-level" && !bestResult) {
          // Product match but no package - acceptable
          bestResult = {
            ok: true,
            source: norm.source,
            barcodeType: norm.barcodeType,
            ndc11,
            ndc10_candidates: v.ndc10_candidates || expandNdc11ToPackageCandidates(ndc11),
            product_ndc: v.product_ndc,
            matches: v.matches,
            lot: norm.lot,
            expiry: norm.expiry,
            serial: norm.serial,
            productionDate: norm.productionDate,
            note: "Product found; package ambiguous.",
            confidence: "medium"
          };
        }
      }
    }
    
    if (bestResult) {
      console.debug(`[NDC Service ${timestamp}] [${requestId}] ✅ Returning best result:`, {
        ok: bestResult.ok,
        confidence: bestResult.confidence,
        brand_name: bestResult.brand_name,
        ndc11: bestResult.ndc11,
        ndc10: bestResult.ndc10
      });
      return { ...bestResult, requestId };
    }
    
    // No match found - return detailed failure info
    console.debug(`[NDC Service ${timestamp}] [${requestId}] ❌ No match found for any candidate`);
    return {
      ok: false,
      source: norm.source,
      barcodeType: norm.barcodeType,
      ndc11: norm.ndc11,
      ndc11_candidates: candidates,
      ndc10_candidates: expandNdc11ToPackageCandidates(norm.ndc11),
      lot: norm.lot,
      expiry: norm.expiry,
      serial: norm.serial,
      reason: "No OpenFDA match found",
      verificationAttempts: verificationResults,
      allowManualEntry: true,
      requestId
    };
  };

  // Central validation functions for NDC and manual codes
  const isCustomCode = (code) => {
    if (!code) return false;
    // Custom codes: non-numeric, short codes, or not 10-11 digits
    const digits = code.replace(/\D/g, '');
    return !/^\d{10,11}$/.test(digits) || (code.includes('-') === false && digits.length < 10);
  };

  const validateStandardNDC = (ndc) => {
    if (!ndc || ndc.trim() === "") {
      return { isValid: false, message: "NDC number is required" };
    }

    const norm = normalizeScan(ndc.trim());
    return {
      isValid: norm.ok,
      message: norm.ok ? '' : (norm.reason || 'Invalid NDC format')
    };
  };

  const validateManualCode = (code) => {
    if (!code || code.trim().length === 0) {
      return { isValid: false, message: 'Code is required' };
    }

    const trimmed = code.trim();

    // Allow any alphanumeric code with reasonable length
    if (trimmed.length < 1) {
      return { isValid: false, message: 'Code too short' };
    }

    // Check for reasonable characters (alphanumeric, hyphens, dots)
    if (!/^[a-zA-Z0-9\-.]+$/.test(trimmed)) {
      return { isValid: false, message: 'Code contains invalid characters' };
    }

    return { isValid: true, message: '' };
  };

  // Utility functions exposed in the API
  const utils = {
    validateGtin14,
    validateUpcA,
    validateNdcFormat,
    detectBarcodeType,
    ndcToGtin14,
    ndcToUpcA,
    expandNdc10To11All,
    expandNdc11ToPackageCandidates,
    expandNdc11ToProductCandidates,
    isCustomCode,
    validateStandardNDC,
    validateManualCode
  };

  // Debug function to clear cache
  const clearCache = () => {
    const clearedCount = cache.size;
    cache.clear();
    console.debug(`[NDC Service] 🗑️ Cache cleared. Removed ${clearedCount} entries.`);
    return clearedCount;
  };

  // Debug function to inspect cache
  const inspectCache = () => {
    const allKeys = Array.from(cache.keys());
    console.debug(`[NDC Service] 🔍 Cache inspection - ${cache.size} entries:`, 
      allKeys.slice(0, 10).map(key => ({
        key,
        ok: cache.get(key)?.ok,
        brand_name: cache.get(key)?.brand_name,
        ndc11: cache.get(key)?.ndc11
      }))
    );
    return { size: cache.size, keys: allKeys };
  };

  return { 
    normalizeScan, 
    ndc11ToNdc10Candidates: expandNdc11ToPackageCandidates,  // Keep for backward compatibility
    verify, 
    scanAndVerify,
    utils,  // Expose utility functions
    // Additional exports for enhanced functionality
    parseGS1: parseGS1Full,
    stripSymbology: stripSymbologyAndLeadingFNC1,
    // Debug functions
    clearCache,
    inspectCache
  };
}
