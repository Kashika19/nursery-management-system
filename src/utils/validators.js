// src/utils/validators.js

/* ---------------- Email ---------------- */
const EMAIL_RX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/i;
export const isEmail = (s) =>
  typeof s === "string" && EMAIL_RX.test(s.trim());

/* ---------------- Phone ---------------- */
/** Returns only the digits of a phone-ish string. */
const PHONE_DIGITS_RX = /\d/g;
export const phoneDigits = (s) =>
  (String(s || "").match(PHONE_DIGITS_RX) || []).join("");

/** True if the number of digits is between 10–13 (UK-tolerant). */
export const isPhone = (s) => {
  const len = phoneDigits(s).length;
  return len >= 10 && len <= 13;
};

/* ---------------- Dates & Times ---------------- */
/** True for ISO date (YYYY-MM-DD) that parses to a real date. */
export const isIsoDate = (s) =>
  typeof s === "string" &&
  /^\d{4}-\d{2}-\d{2}$/.test(s) &&
  !Number.isNaN(new Date(s).valueOf());

/** Today as ISO date (YYYY-MM-DD). */
export const todayISO = () => new Date().toISOString().slice(0, 10);

/** Current month as ISO month (YYYY-MM). */
export const isoMonth = (d = new Date()) => d.toISOString().slice(0, 7);

/** True if isoDate is today or in the future. */
export const notPast = (isoDate) => isIsoDate(isoDate) && isoDate >= todayISO();

/** True if a <= b (both ISO dates). */
export const isOnOrBefore = (a, b) => isIsoDate(a) && isIsoDate(b) && a <= b;

/** True for 24h time HH:MM with valid ranges. */
export const isTimeHHMM = (s) => {
  if (typeof s !== "string" || !/^\d{2}:\d{2}$/.test(s)) return false;
  const [hh, mm] = s.split(":").map((n) => Number(n));
  return Number.isInteger(hh) && Number.isInteger(mm) && hh >= 0 && hh <= 23 && mm >= 0 && mm <= 59;
};

/* ---------------- Numbers & Ranges ---------------- */
export const clamp = (n, min, max) => Math.max(min, Math.min(max, n));

/** True if value is a number in [min,max]. */
export const withinRange = (v, min, max) =>
  typeof v === "number" && Number.isFinite(v) && v >= min && v <= max;

/** True if value is a number in [0,100]. */
export const isPercentage = (v) => withinRange(Number(v), 0, 100);

/** Parse currency/amount-like input safely. Returns a finite number, else 0. */
export const parseAmount = (v) => {
  const n = typeof v === "number" ? v : Number(String(v).replace(/[, ]+/g, ""));
  return Number.isFinite(n) ? n : 0;
};

/** Format number as GBP (no currency math; UI-only). */
export const fmtGBP = (n) =>
  new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP", maximumFractionDigits: 2 }).format(Number(n) || 0);

/* ---------------- Text ---------------- */
export const hasText = (s) => typeof s === "string" && s.trim().length > 0;
export const sanitizeText = (s) => String(s ?? "").trim();

/* ---------------- IDs / Compliance ---------------- */
/** DBS: allow up to 12 digits (some DBS refs shorter); non-digits ignored. */
export const isDBS = (s) => {
  const digits = phoneDigits(s);
  return digits.length > 0 && digits.length <= 12;
};
