// src/reportWebVitals.js

/**
 * Measure Core Web Vitals and other performance metrics.
 * Pass a callback to collect results (e.g. send to analytics).
 *
 * Example:
 *   import reportWebVitals from './reportWebVitals';
 *   reportWebVitals(console.log);
 */
const reportWebVitals = (onPerfEntry) => {
  if (typeof onPerfEntry !== "function") return;

  import("web-vitals")
    .then(({ getCLS, getFID, getFCP, getLCP, getTTFB }) => {
      try {
        getCLS(onPerfEntry);
        getFID(onPerfEntry);
        getFCP(onPerfEntry);
        getLCP(onPerfEntry);
        getTTFB(onPerfEntry);
      } catch (err) {
        console.error("[WebVitals] Error while collecting metrics:", err);
      }
    })
    .catch((err) => {
      console.warn("[WebVitals] web-vitals import failed:", err);
    });
};

export default reportWebVitals;
