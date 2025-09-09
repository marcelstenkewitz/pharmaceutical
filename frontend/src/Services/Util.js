// src/Services/utils.js
// Shared utilities for services

export const isDigits = (s, n) => typeof s === "string" && s.length === n && /^[0-9]+$/.test(s);

export const createCache = (max = 200) => {
  const m = new Map();
  return {
    get: (k) => m.get(k),
    set: (k, v) => { if (m.has(k)) m.delete(k); m.set(k, v); if (m.size > max) m.delete(m.keys().next().value); }
  };
};