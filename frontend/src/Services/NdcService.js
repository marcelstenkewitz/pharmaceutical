// src/Services/NdcService.js
import { parseBarcode } from "gs1-barcode-parser";
import { FDAResult } from "../Models/FdaResultModel";
import { isDigits, createCache } from "./Util";

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

/* ------------------ bare-AI parser ------------------ */
// More flexible: handles 01, 17, 10, 21 in any order, with optional FNC1
const parseBareGs1 = (s) => {
  const result = {};
  let str = s;

  // remove all FNC1 separators
  str = str.replace(/\x1D/g, "");

  // scan for known AIs
  const re = /(01\d{14}|17\d{6}|10[0-9A-Za-z]{1,20}|21[0-9A-Za-z]{1,20})/g;
  let m;
  while ((m = re.exec(str)) !== null) {
    const seg = m[0];
    if (seg.startsWith("01")) result["01"] = seg.slice(2);
    else if (seg.startsWith("17")) result["17"] = seg.slice(2);
    else if (seg.startsWith("10")) result["10"] = seg.slice(2);
    else if (seg.startsWith("21")) result["21"] = seg.slice(2);
  }

  return result["01"] ? result : null;
};

/* ------------------ check digits & mapping ------------------ */
const gtin14CheckDigit = (body13) => {
  let sum = 0;
  for (let i = 0; i < 13; i++) {
    const n = body13.charCodeAt(12 - i) - 48;
    sum += n * (i % 2 === 0 ? 3 : 1);
  }
  const mod = sum % 10;
  return mod === 0 ? 0 : 10 - mod;
};

const upcACheckDigit = (body11) => {
  let odd = 0, even = 0;
  for (let i = 0; i < 11; i++) {
    const n = body11.charCodeAt(i) - 48;
    if ((i + 1) % 2) odd += n; else even += n;
  }
  const mod = (3 * odd + even) % 10;
  return (10 - mod) % 10;
};

// Expand a 10-digit NDC to all possible 11-digit NDCs (FDA rules)
const expandNdc10To11All = (ndc10) => {
  if (!isDigits(ndc10, 10)) return [];
  const cands = [];
  // 4-4-2 → pad labeler to 5 (leading 0)
  cands.push(ndc10.padStart(11, "0"));
  // 5-3-2 → pad product to 4 (insert 0 before package)
  cands.push(ndc10.slice(0, 5) + "0" + ndc10.slice(5));
  // 5-4-1 → pad package to 2 (insert 0 before last digit)
  cands.push(ndc10.slice(0, 9) + "0" + ndc10.slice(9));
  return [...new Set(cands.filter((x) => isDigits(x, 11)))];
};

const ndc11sFromGtin14 = (gtin14) => {
  if (!isDigits(gtin14, 14)) return [];
  if (gtin14.slice(1, 3) !== "03") return [];
  const chk = gtin14CheckDigit(gtin14.slice(0, 13));
  if (chk !== gtin14.charCodeAt(13) - 48) return [];
  const ndc10 = gtin14.slice(3, 13); // 003 + NDC10 + check
  return expandNdc10To11All(ndc10);
};

const ndc11sFromUpcA = (upc12) => {
  if (!isDigits(upc12, 12) || (upc12[0] !== "3" && upc12[0] !== "0")) return [];
  const chk = upcACheckDigit(upc12.slice(0, 11));
  if (chk !== upc12.charCodeAt(11) - 48) return [];
  const ndc10 = upc12.slice(1, 11);
  return expandNdc10To11All(ndc10);
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

// For backward compatibility
const ndc11ToNdc10Candidates = expandNdc11ToPackageCandidates;

/* ------------------ OpenFDA lookup ------------------ */
const fetchJson = async (url, fetchFn, signal) => {
  const r = await fetchFn(url, { signal });
  if (!r.ok) throw new Error(`OpenFDA ${r.status} ${r.statusText}`);
  return r.json();
};

const verifyWithOpenFda = async (ndc11, fetchFn, signal) => {
  if (!isDigits(ndc11, 11))
    return { ok: false, reason: "Input must be 11 digits", ndc11 };

  const packageCandidates = expandNdc11ToPackageCandidates(ndc11);
  const productCandidates = expandNdc11ToProductCandidates(ndc11);

  // 1) exact package first (try all package candidates)
  for (const pkg of packageCandidates) {
    const url = `https://api.fda.gov/drug/ndc.json?search=packaging.package_ndc:"${encodeURIComponent(pkg)}"&limit=1`;
    try {
      const data = await fetchJson(url, fetchFn, signal);
            console.log(data)

      const hit = data?.results?.[0];
      if (hit) {
        const pkgHit = (hit.packaging || []).find((p) => p.package_ndc === pkg) || null;
        const fdaResult = new FDAResult(hit);
        return {
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
          package: pkgHit,
          raw: fdaResult,
        };
      }
    } catch (e) {
      console.log("OpenFDA package-exact error for", pkg, e);
    }
  }

  // 2) product-level fallback (try all product candidates)
  for (const prod of productCandidates) {
    const url = `https://api.fda.gov/drug/ndc.json?search=product_ndc:"${encodeURIComponent(prod)}"&limit=1`;
    try {
      const data = await fetchJson(url, fetchFn, signal);
      if (data?.results?.length) {
        return {
          ok: true,
          confidence: "product-level",
          ndc11,
          ndc10_candidates: packageCandidates,
          product_ndc: prod,
          matches: data.results.map((r) => new FDAResult(r)),
        };
      }
    } catch (e) {
      console.log("OpenFDA product-level error for", prod, e);
    }
  }

  return {
    ok: false,
    reason: "No OpenFDA match",
    ndc11,
    ndc10_candidates: packageCandidates,
  };
};

/* ------------------ normalization ------------------ */
const stripSymbologyAndLeadingFNC1 = (s) =>
  String(s)
    .replace(/\]C1|\]d2/gi, "")
    .replace(/[\x1D]/g, "")
    .replace(/^[\x00-\x1F]+/, "");

const normalizeScan = (raw) => {
  if (raw == null || raw === "") return { ok: false, reason: "Empty scan" };
  const text = stripSymbologyAndLeadingFNC1(raw);

  // 1) GS1 via package
  let ai = null;
  try {
    ai = parseBarcode(text);
  } catch {
    ai = parseBareGs1(text);
  }

  if (ai) {
    const gtin14 = ai.ai01 || ai["01"];
    if (gtin14) {
      const ndc11s = ndc11sFromGtin14(gtin14);
      if (ndc11s.length) {
        return {
          ok: true,
          source: "gs1",
          ndc11: ndc11s[0],
          ndc11_candidates: ndc11s,
          gtin14,
          lot: ai.ai10 || ai["10"] || null,
          expiry: ai.ai17
            ? parseYYMMDDtoISO(ai.ai17)
            : ai["17"]
            ? parseYYMMDDtoISO(ai["17"])
            : null,
          serial: ai.ai21 || ai["21"] || null,
        };
      } else {
        return { ok: false, reason: "GTIN present but not NDC-encoded (expect 003 prefix / valid check)" };
      }
    }
  }

  // 2) UPC-A
  const digits = text.replace(/\D/g, "");
  let ndc11s = ndc11sFromUpcA(digits);
  if (!ndc11s.length && isDigits(digits, 11) && (digits.startsWith("3") || digits.startsWith("0"))) {
    const chk = upcACheckDigit(digits);
    ndc11s = ndc11sFromUpcA(digits + String(chk));
  }
  if (ndc11s.length) {
    return {
      ok: true,
      source: "upc",
      ndc11: ndc11s[0],
      ndc11_candidates: ndc11s,
      upc12: isDigits(digits, 12) ? digits : digits + String(upcACheckDigit(digits)),
      lot: null,
      expiry: null,
      serial: null,
    };
  }

  // 3) already NDC-11
  if (isDigits(digits, 11) && !digits.startsWith("3")) {
    return {
      ok: true,
      source: "typed-ndc11",
      ndc11: digits,
      ndc11_candidates: [digits],
      lot: null,
      expiry: null,
      serial: null,
    };
  }

  return { ok: false, reason: "Unrecognized or incomplete NDC format." };
};

/* ------------------ public API ------------------ */
export function createNdcService(options = {}) {
  const fetchFn = options.fetch || (typeof fetch !== "undefined" ? fetch : null);
  if (!fetchFn) throw new Error("No fetch available; pass { fetch } in Node <18.");

  const cache = createCache(options.cacheSize || 200);

  // Try all NDC-11 candidates for OpenFDA verification
  const verify = async (ndc11, { signal } = {}) => {
    const key = `openfda:${ndc11}`;
    const cached = cache.get(key);
    if (cached) return cached;
    const res = await verifyWithOpenFda(ndc11, fetchFn, signal);
    cache.set(key, res);
    return res;
  };

  const scanAndVerify = async (raw, { signal } = {}) => {
    const norm = normalizeScan(raw);
    if (!norm.ok || !norm.ndc11) return { ok: false, ...norm };

    const candidates = norm.ndc11_candidates || [norm.ndc11];
    let lastResult = null;
    for (const ndc11 of candidates) {
      const v = await verify(ndc11, { signal });
      lastResult = v;
      if (v.ok && v.confidence === "package-exact") {
        return {
          ok: true,
          source: norm.source,
          ndc11,
          ndc10: v.ndc10,
          product_ndc: v.product_ndc,
          brand_name: v.brand_name,
          generic_name: v.generic_name,
          labeler_name: v.labeler_name,
          dosage_form: v.dosage_form,
          route: v.route,
          package: v.package,
          lot: norm.lot,
          expiry: norm.expiry,
          serial: norm.serial,
        };
      }
      if (v.ok && v.confidence === "product-level") {
        return {
          ok: true,
          source: norm.source,
          ndc11,
          ndc10_candidates: v.ndc10_candidates || ndc11ToNdc10Candidates(ndc11),
          product_ndc: v.product_ndc,
          matches: v.matches,
          lot: norm.lot,
          expiry: norm.expiry,
          serial: norm.serial,
          note: "Product found; package ambiguous.",
        };
      }
    }
    return {
      ok: false,
      source: norm.source,
      ndc11: norm.ndc11,
      ndc10_candidates: ndc11ToNdc10Candidates(norm.ndc11),
      lot: norm.lot,
      expiry: norm.expiry,
      serial: norm.serial,
      reason: lastResult?.reason || "OpenFDA: no match",
    };
  };

  return { normalizeScan, ndc11ToNdc10Candidates, verify, scanAndVerify };
}
