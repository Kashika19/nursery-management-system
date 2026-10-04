// src/App.js
import React, { Suspense, lazy, useEffect } from "react";
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  useLocation,
} from "react-router-dom";
import TopNav from "./components/TopNav";
import "./App.css";
import { AuthProvider, ProtectedRoute } from "./AuthContext";

/** ---- Code-split pages ---- */
const Dashboard  = lazy(() => import("./pages/Dashboard"));
const Children   = lazy(() => import("./pages/Children"));
const Staff      = lazy(() => import("./pages/Staff"));
const Facilities = lazy(() => import("./pages/Facilities"));
const Finance    = lazy(() => import("./pages/Finance"));
const Viewings   = lazy(() => import("./pages/Viewings"));
const Ofsted     = lazy(() => import("./pages/Ofsted"));
const Occupancy  = lazy(() => import("./pages/Occupancy"));
const Admin      = lazy(() => import("./pages/Admin"));
const Login      = lazy(() => import("./pages/Login"));

/** ---- Scroll to top on route change ---- */
function ScrollToTop() {
  const { pathname } = useLocation();

  useEffect(() => {
    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;

    window.scrollTo({
      top: 0,
      left: 0,
      behavior: prefersReducedMotion ? "auto" : "smooth",
    });
  }, [pathname]);

  return null;
}

/** ---- Simple 404 ---- */
function NotFound() {
  return (
    <main style={{ maxWidth: 800, margin: "40px auto", padding: 16 }}>
      <h1 style={{ fontSize: 24, fontWeight: 800, marginBottom: 16 }}>
        Page not found
      </h1>
      <p style={{ marginBottom: 8 }}>
        The page you’re looking for doesn’t exist.
      </p>
      <a href="/" style={{ color: "#2563eb", fontWeight: 600 }}>
        Go back to dashboard
      </a>
    </main>
  );
}

export default function App() {
  return (
    <BrowserRouter basename={process.env.PUBLIC_URL || "/"}>
      <AuthProvider>
        <ScrollToTop />
        <TopNav />
        <main style={{ background: "#f3f4f6", minHeight: "100vh" }}>
          <Suspense
            fallback={
              <div style={{ maxWidth: 800, margin: "40px auto", padding: 16 }}>
                <div
                  style={{
                    background: "#fff",
                    borderRadius: 16,
                    border: "1px solid #e5e7eb",
                    padding: 24,
                  }}
                >
                  <p>Loading…</p>
                </div>
              </div>
            }
          >
            <Routes>
              {/* Public */}
              <Route path="/login" element={<Login />} />

              {/* Dashboard – all roles */}
              <Route
                path="/"
                element={
                  <ProtectedRoute
                    allowedRoles={["manager", "roomLeader", "practitioner"]}
                  >
                    <Dashboard />
                  </ProtectedRoute>
                }
              />

              {/* Children – all roles */}
              <Route
                path="/children"
                element={
                  <ProtectedRoute
                    allowedRoles={["manager", "roomLeader", "practitioner"]}
                  >
                    <Children />
                  </ProtectedRoute>
                }
              />

              {/* Staff – all roles, details restricted inside Staff.jsx */}
              <Route
                path="/staff"
                element={
                  <ProtectedRoute
                    allowedRoles={["manager", "roomLeader", "practitioner"]}
                  >
                    <Staff />
                  </ProtectedRoute>
                }
              />

              {/* Facilities – all roles */}
              <Route
                path="/facilities"
                element={
                  <ProtectedRoute
                    allowedRoles={["manager", "roomLeader", "practitioner"]}
                  >
                    <Facilities />
                  </ProtectedRoute>
                }
              />

              {/* Finance – MANAGER only */}
              <Route
                path="/finance"
                element={
                  <ProtectedRoute allowedRoles={["manager"]}>
                    <Finance />
                  </ProtectedRoute>
                }
              />

              {/* Viewings – Manager + Room Leader */}
              <Route
                path="/viewings"
                element={
                  <ProtectedRoute allowedRoles={["manager", "roomLeader"]}>
                    <Viewings />
                  </ProtectedRoute>
                }
              />

              {/* Ofsted – Manager + Room Leader */}
              <Route
                path="/ofsted"
                element={
                  <ProtectedRoute allowedRoles={["manager", "roomLeader"]}>
                    <Ofsted />
                  </ProtectedRoute>
                }
              />

              {/* Occupancy – Manager + Room Leader */}
              <Route
                path="/occupancy"
                element={
                  <ProtectedRoute allowedRoles={["manager", "roomLeader"]}>
                    <Occupancy />
                  </ProtectedRoute>
                }
              />

              {/* Admin – MANAGER only */}
              <Route
                path="/admin"
                element={
                  <ProtectedRoute allowedRoles={["manager"]}>
                    <Admin />
                  </ProtectedRoute>
                }
              />

              {/* Legacy paths / back-compat */}
              <Route
                path="/team/*"
                element={<Navigate to="/staff" replace />}
              />
              <Route
                path="/bookings"
                element={<Navigate to="/viewings" replace />}
              />

              {/* 404 */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
        </main>
      </AuthProvider>
    </BrowserRouter>
  );
}
