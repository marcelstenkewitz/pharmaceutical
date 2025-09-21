// models/FdaResultModel.js
// (Drop-in update: new helpers + more robust getPrice)

export class FDAActiveIngredient {
  name; strength;
  constructor({ name, strength }) { this.name = name; this.strength = strength; }
}

export class FDAPackaging {
  package_ndc; description; marketing_start_date; sample;
  constructor({ package_ndc, description, marketing_start_date, sample }) {
    this.package_ndc = package_ndc;
    this.description = description;
    this.marketing_start_date = marketing_start_date;
    this.sample = sample;
  }
}

export class FDAOpenFda {
  manufacturer_name; rxcui; spl_set_id; is_original_packager; upc; unii;
  constructor(obj = {}) {
    this.manufacturer_name = obj.manufacturer_name || [];
    this.rxcui = obj.rxcui || [];
    this.spl_set_id = obj.spl_set_id || [];
    this.is_original_packager = obj.is_original_packager || [];
    this.upc = obj.upc || [];
    this.unii = obj.unii || [];
  }
}

export class FDAResult {
  product_ndc; generic_name; labeler_name; brand_name;
  active_ingredients; finished; packaging; listing_expiration_date; openfda;
  marketing_category; dosage_form; spl_id; product_type; route;
  marketing_start_date; product_id; application_number; brand_name_base; pharm_class;
  dea_schedule; // NEW: DEA controlled substance schedule

  constructor(obj = {}) {
    // Handle null or undefined input
    const data = obj || {};
    this.product_ndc = data.product_ndc || '';
    this.generic_name = data.generic_name || '';
    this.labeler_name = data.labeler_name || '';
    this.brand_name = data.brand_name || '';
    this.active_ingredients = (data.active_ingredients || []).map(a => new FDAActiveIngredient(a));
    this.finished = data.finished;
    this.packaging = (data.packaging || []).map(p => new FDAPackaging(p));
    this.listing_expiration_date = data.listing_expiration_date;
    this.openfda = new FDAOpenFda(data.openfda);
    this.marketing_category = data.marketing_category || '';
    this.dosage_form = data.dosage_form || '';
    this.spl_id = data.spl_id || '';
    this.product_type = data.product_type || '';
    this.route = data.route || [];
    this.marketing_start_date = data.marketing_start_date || '';
    this.product_id = data.product_id || '';
    this.application_number = data.application_number || '';
    this.brand_name_base = data.brand_name_base || '';
    this.pharm_class = data.pharm_class || [];
    this.dea_schedule = data.dea_schedule || null; // NEW: Capture DEA schedule (CII, CIII, CIV, CV, or null)
  }

  /** DEA Schedule Helper Methods */
  isControlled() {
    return !!this.dea_schedule;
  }

  isScheduleII() {
    return this.dea_schedule === 'CII';
  }

  requiresForm222() {
    // Form 222 is required for Schedule I and II controlled substances
    return this.dea_schedule === 'CI' || this.dea_schedule === 'CII';
  }

  getScheduleDisplay() {
    if (!this.dea_schedule) return 'Non-Controlled';
    return this.dea_schedule;
  }

  getScheduleBadgeColor() {
    switch (this.dea_schedule) {
      case 'CI':
      case 'CII':
        return 'danger'; // Red for Schedule I & II
      case 'CIII':
        return 'warning'; // Orange for Schedule III
      case 'CIV':
      case 'CV':
        return 'info'; // Blue for Schedule IV & V
      default:
        return 'secondary'; // Gray for non-controlled
    }
  }

  getScheduleDescription() {
    switch (this.dea_schedule) {
      case 'CI':
        return 'Schedule I - No accepted medical use';
      case 'CII':
        return 'Schedule II - High potential for abuse';
      case 'CIII':
        return 'Schedule III - Moderate potential for abuse';
      case 'CIV':
        return 'Schedule IV - Low potential for abuse';
      case 'CV':
        return 'Schedule V - Lowest potential for abuse';
      default:
        return 'Non-controlled substance';
    }
  }

  /** utils */
  static #isDigitsOnly(s, n) { return typeof s === 'string' && s.length === n && /^[0-9]+$/.test(s); }

  /**
   * Normalize any NDC (dashed or undashed, 10/11 digits) to undashed 11-digit string (single best guess).
   * FDA-standard padding for dashed formats; heuristic for undashed 10-digit.
   */
  normalizeNdcTo11(ndc) {
    if (!ndc) return null;
    ndc = String(ndc).replace(/[^0-9-]/g, ''); // Keep digits/dashes only

    if (ndc.includes('-')) {
      const parts = ndc.split('-');
      if (parts.length !== 3 && parts.length !== 2) return null;

      // If it's a 2-part product NDC (e.g., "61958-2002"), we can't directly normalize without package.
      // We'll handle expansion to packages in candidate generation; return null here.
      if (parts.length === 2) return null;

      const lengths = parts.map(p => p.length);
      const ok =
        (lengths[0] === 4 || lengths[0] === 5) &&
        (lengths[1] === 3 || lengths[1] === 4) &&
        (lengths[2] === 1 || lengths[2] === 2);
      if (!ok) return null;

      return parts[0].padStart(5, '0') + parts[1].padStart(4, '0') + parts[2].padStart(2, '0');
    } else {
      if (FDAResult.#isDigitsOnly(ndc, 11)) return ndc;
      if (!FDAResult.#isDigitsOnly(ndc, 10)) return null;

      // Heuristic single guess: prefer padding product (common), but this is only a fallback.
      return ndc[0] === '0' ? ('0' + ndc) : (ndc.slice(0, 5) + '0' + ndc.slice(5));
    }
  }

  /**
   * Expand an undashed 10-digit NDC into all 11-digit possibilities:
   * - 4-4-2  -> pad labeler:  '0' + ndc10
   * - 5-3-2  -> pad product:  ndc10[0..4] + '0' + ndc10[5..9]
   * - 5-4-1  -> pad package:  ndc10[0..8] + '0' + ndc10[9]
   */
  static #expandUndashed10ToAll11(ndc10) {
    if (!FDAResult.#isDigitsOnly(ndc10, 10)) return [];
    return [
      '0' + ndc10,
      ndc10.slice(0, 5) + '0' + ndc10.slice(5),
      ndc10.slice(0, 9) + '0' + ndc10.slice(9),
    ];
  }

  /**
   * Generate a prioritized, de-duplicated list of NDC-11 candidates for pricing.
   * Includes:
   *  1) Exact package match (if input points to a specific package)
   *  2) Direct normalization of the input
   *  3) All expansions from undashed 10-digit input
   *  4) All packages on this product (from FDA data)
   *  5) If input is a product-level dashed NDC (e.g., '61958-2002'), expand using known packages
   */
  #generateNdc11Candidates(ndcRaw) {
    const tried = new Set();
    const push = v => { if (v && FDAResult.#isDigitsOnly(v, 11)) tried.add(v); };

    const raw = (ndcRaw ?? '').toString().trim();
    if (!raw) return [];

    // 1) If raw directly matches a package_ndc, prioritize it
    const pkg = this.findMatchingPackage(raw);
    if (pkg?.package_ndc) {
      const v = this.normalizeNdcTo11(pkg.package_ndc);
      push(v);
    }

    // 2) Direct normalization of raw (single best guess)
    const direct = this.normalizeNdcTo11(raw);
    push(direct);

    // 3) All undashed-10 expansions
    const digitsOnly = raw.replace(/\D+/g, '');
    if (FDAResult.#isDigitsOnly(digitsOnly, 10)) {
      FDAResult.#expandUndashed10ToAll11(digitsOnly).forEach(push);
    }

    // 4) All known package_ndc values in this product
    for (const p of (this.packaging || [])) {
      const v = this.normalizeNdcTo11(p?.package_ndc);
      push(v);
    }

    // 5) If raw is a product-level dashed NDC (two segments), expand via known packages
    if (raw.includes('-') && raw.split('-').length === 2) {
      const [lab, prod] = raw.split('-');
      for (const p of (this.packaging || [])) {
        if (!p?.package_ndc) continue;
        // Only include packages whose product_ndc matches the provided product pair
        // (i.e., starts with `${lab}-${prod}-`)
        if (p.package_ndc.startsWith(`${lab}-${prod}-`)) {
          const v = this.normalizeNdcTo11(p.package_ndc);
          push(v);
        }
      }
    }

    return Array.from(tried);
  }

  /**
   * Find the best-matching package for a given NDC (any format), via exact 11-digit equality.
   */
  findMatchingPackage(ndcRaw) {
    if (!ndcRaw || !Array.isArray(this.packaging)) return null;
    const input11 = this.normalizeNdcTo11(ndcRaw);
    if (!input11) return null;
    for (const p of this.packaging) {
      if (!p?.package_ndc) continue;
      const pkg11 = this.normalizeNdcTo11(p.package_ndc);
      if (pkg11 === input11) return p;
    }
    return null;
  }

  /**
   * Retrieve the latest NADAC price by trying ALL plausible NDC-11 candidates derived from `ndcRaw`
   * and from this product’s known packages. Returns on first success; otherwise includes diagnostics.
   *
   * @param {object} priceService - Instance with getLatestPrice(ndc11, { signal }) returning { ok, ... }
   * @param {string} ndcRaw       - Any NDC format (10/11, dashed/undashed, UPC-like digits)
   * @param {object} [options={}] - e.g., { signal }
   * @returns {Promise<object>}   - On success: { ok:true, ndc11, pricePerUnit, source, tried }
   *                                On failure: { ok:false, reason, tried }
   */
  async getPrice(priceService, ndcRaw, options = {}) {
    const tried = [];
    const candidates = this.#generateNdc11Candidates(ndcRaw);

    for (const ndc11 of candidates) {
      tried.push(ndc11);
      try {
        const res = await priceService.getLatestPrice(ndc11, options);
        if (res && res.ok) {
          return {
            ok: true,
            ndc11,
            ...res,
            source: 'candidate-match',
            tried
          };
        }
      } catch (e) {
        // Swallow individual candidate errors; keep trying others
        // (Optionally log e in your app)
      }
    }

    // If everything failed, return diagnostics
    return {
      ok: false,
      reason: candidates.length
        ? 'No price found for any candidate NDC-11'
        : 'Could not derive any valid NDC-11 candidates from input',
      tried
    };
  }

  /** Try to map an input (any NDC shape) to a known package and return useful line fields. */
  buildLineDraftFromInput(ndcInput) {
    const pkg = this.findMatchingPackage(ndcInput);
    const itemName = deriveItemNameFromFda(this);
    let packageSize = "UNKNOWN";

    if (pkg?.description) {
      packageSize = derivePackageSizeFromDescription(pkg.description);
    } else if (this.packaging?.length) {
      // If no exact package match: use first package to hint size
      packageSize = derivePackageSizeFromDescription(this.packaging[0].description || "");
    }

    // We’ll also surface canonical NDC-11 for the matched package (or the input)
    const ndc11 =
      (pkg?.package_ndc && this.normalizeNdcTo11(pkg.package_ndc)) ||
      this.normalizeNdcTo11(String(ndcInput));

    return {
      ok: !!ndc11,
      ndc11,
      packageSize,
      itemName,
      labeler_name: this.labeler_name || "Unknown Labeler",
      // Useful extras
      package_ndc: pkg?.package_ndc || null,
      package_description: pkg?.description || null,
      labeler: this.labeler_name || null,
      dosage_form: this.dosage_form || null,
      strength: this.active_ingredients?.[0]?.strength || null,
    };
  }
}


// Helper function: Turn FDA packaging description into a normalized size string.
function derivePackageSizeFromDescription(desc = "") {
  // Examples: "100 CAPSULE in 1 BOTTLE (...)", "10 mL in 1 VIAL (...)", "1 PATCH in 1 POUCH"
  // We prefer the first "<count> <unit>" token.
  const mCountUnit = desc.match(/\b(\d+(?:\.\d+)?)\s*([a-zA-Zμu]+)\b/);
  if (!mCountUnit) return "UNKNOWN";
  let [, count, unit] = mCountUnit;
  unit = unit.toLowerCase()
    .replace(/^capsules?$/i, "capsules")
    .replace(/^tablet(s)?$/i, "tablets")
    .replace(/^tab(s)?$/i, "tablets")
    .replace(/^cap(s)?$/i, "capsules")
    .replace(/^ml$/i, "mL")
    .replace(/^mcg$/i, "mcg");
  return `${count} ${unit}`;
}

// Helper function: Build a readable item name from FDA fields (brand/generic + strength + dosage form).
function deriveItemNameFromFda(fda /* FDAResult */) {
  // Try: brand_name_base or brand_name; fallback to generic_name
  const drug =
    fda.brand_name_base?.trim() ||
    fda.brand_name?.trim() ||
    fda.generic_name?.trim() ||
    "Unknown drug";

  // Try to get a clean strength from active_ingredients, else leave off
  const strength = (fda.active_ingredients?.[0]?.strength || "").trim();

  // Dosage form (e.g., "CAPSULE" / "KIT") → to lower sentence-case
  const form = (fda.dosage_form || "").toLowerCase();

  // Compose: "Fluoxetine 20 mg capsules" or just the drug if missing parts
  const parts = [drug];
  if (strength) parts.push(strength);
  if (form) parts.push(form);
  return parts.join(" ").replace(/\s+/g, " ").trim();
}

