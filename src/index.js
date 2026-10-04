// src/index.js
import React from "react";
import ReactDOM from "react-dom/client";
import "./index.css";
import App from "./App";
import reportWebVitals from "./reportWebVitals";

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// In development, just log metrics to the console.
// Swap to sendToAnalytics when you’re ready to ship.
const logVitals = (metric) => {
  // Example output: { name: 'LCP', value: 2140, id: 'v3-...' }
  // Only log a few key ones to keep noise down:
  if (["LCP", "CLS", "FID", "FCP", "TTFB"].includes(metric.name)) {
    // Round numbers for readability
    const rounded =
      typeof metric.value === "number" ? Math.round(metric.value * 100) / 100 : metric.value;
    // eslint-disable-next-line no-console
    console.log(`[WebVitals] ${metric.name}:`, rounded, metric);
  }
};

reportWebVitals(
  process.env.NODE_ENV === "development" ? logVitals : sendToAnalytics
);

// Replace this with your analytics pipeline when ready
function sendToAnalytics(metric) {
  // Example: post to your backend or analytics service
  // Adjust endpoint and payload as needed.
  try {
    navigator.sendBeacon?.(
      "/analytics/vitals",
      JSON.stringify({
        name: metric.name,
        value: metric.value,
        id: metric.id,
        label: metric.label, // 'web-vital' or 'custom'
        path: window.location.pathname,
        ua: navigator.userAgent,
        ts: Date.now(),
      })
    );
  } catch {
    // Fallback if sendBeacon not available
    fetch("/analytics/vitals", {
      method: "POST",
      keepalive: true,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: metric.name,
        value: metric.value,
        id: metric.id,
        label: metric.label,
        path: window.location.pathname,
        ua: navigator.userAgent,
        ts: Date.now(),
      }),
    }).catch(() => {});
  }
}
