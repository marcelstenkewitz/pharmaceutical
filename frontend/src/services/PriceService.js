// src/services/PriceService.js
import { isDigits, createCache } from "./Util";
export function createPriceService(options = {}) {
  const fetchFn = options.fetch || (typeof fetch !== "undefined" ? fetch : null);
  if (!fetchFn) throw new Error("No fetch available; pass { fetch } in Node <18.");

  const cache = createCache(options.cacheSize || 200);
  const DATASET_ID = '99315a95-37ac-4eee-946a-3c523b4c481e';

  const getLatestPrice = async (ndc11, { signal } = {}) => {
    if (!isDigits(ndc11, 11)) return { ok: false, reason: "Input must be 11 digits" };

    const key = `price:${ndc11}`;
    const cached = cache.get(key);
    if (cached) return cached;

    // Medicaid API: use conditions and sorts per example
    const url = `https://data.medicaid.gov/api/1/datastore/query/${DATASET_ID}/0?` +
      `conditions[0][property]=ndc&conditions[0][value]=${ndc11}&conditions[0][operator]==` +
      `&sorts[0][property]=effective_date&sorts[0][order]=desc&limit=1`;
    console.log(url);

    try {
      const r = await fetchFn(url, { signal });
      if (!r.ok) throw new Error(`Medicaid API ${r.status} ${r.statusText}`);
      const data = await r.json();

      console.log(data);

      const rows = Array.isArray(data.results) ? data.results : [];
      if (rows.length === 0) {
        const res = { ok: false, reason: "No price data found for this NDC" };
        cache.set(key, res);
        return res;
      }

      const row = rows[0];
      const res = {
        ok: true,
        ndc: row.ndc || row.NDC,
        description: row.ndc_description,
        pricePerUnit: parseFloat(row.nadac_per_unit),
        effectiveDate: row.effective_date,
        pricingUnit: row.pricing_unit || 'EA',
      };
      cache.set(key, res);
      return res;
    } catch (e) {
      return { ok: false, reason: `Fetch error: ${e.message}` };
    }
  };

  return { getLatestPrice };
}
