// src/pages/Login.jsx
import React from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../AuthContext";

const roles = [
  { value: "manager", label: "Manager" },
  { value: "roomLeader", label: "Room Leader" },
  { value: "practitioner", label: "Practitioner" },
];

export default function Login() {
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from?.pathname || "/";

  const [name, setName] = React.useState(user?.name || "");
  const [role, setRole] = React.useState(user?.role || "manager");
  const [staffId, setStaffId] = React.useState(user?.staffId || "");
  const [error, setError] = React.useState("");

  const handleSubmit = (e) => {
    e.preventDefault();
    setError("");

    if (!name.trim()) {
      setError("Please enter your name.");
      return;
    }

    if (!role) {
      setError("Please choose a role.");
      return;
    }

    // For practitioners, we need staffId so we can limit them to their own record
    if (role === "practitioner" && !staffId.trim()) {
      setError("Please enter your Staff ID (e.g. S101).");
      return;
    }

    login({
      name: name.trim(),
      role,
      staffId: role === "practitioner" ? staffId.trim() : null,
    });

    navigate(from, { replace: true });
  };

  const quickLogin = (quickRole) => {
    login({
      name: quickRole === "manager" ? "Manager" :
            quickRole === "roomLeader" ? "Room Leader" :
            "Practitioner",
      role: quickRole,
      staffId: null,
    });
    navigate("/", { replace: true });
  };

  return (
    <main style={{ minHeight: "100vh", background: "#f3f4f6" }}>
      <div style={{ maxWidth: 420, margin: "80px auto", padding: 16 }}>
        <div
          style={{
            background: "#fff",
            borderRadius: 16,
            border: "1px solid #e5e7eb",
            padding: 24,
            boxShadow: "0 10px 40px rgba(15, 23, 42, 0.12)",
          }}
        >
          <h1 style={{ fontSize: 24, fontWeight: 800, marginBottom: 4 }}>
            Sign in
          </h1>
          <p style={{ marginBottom: 16, color: "#6b7280" }}>
            Choose your role to see the appropriate nursery dashboards.
          </p>

          {error && (
            <div
              style={{
                background: "#fee2e2",
                border: "1px solid #fecaca",
                color: "#b91c1c",
                padding: "8px 10px",
                borderRadius: 12,
                marginBottom: 12,
                fontSize: 13,
              }}
            >
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ display: "grid", gap: 12 }}>
            <label style={{ fontSize: 13, fontWeight: 600 }}>
              Name
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                style={{
                  width: "100%",
                  marginTop: 4,
                  padding: "8px 10px",
                  borderRadius: 10,
                  border: "1px solid #d1d5db",
                  fontSize: 14,
                }}
                placeholder="e.g. Morgan Example"
              />
            </label>

            <label style={{ fontSize: 13, fontWeight: 600 }}>
              Role
              <select
                value={role}
                onChange={(e) => setRole(e.target.value)}
                style={{
                  width: "100%",
                  marginTop: 4,
                  padding: "8px 10px",
                  borderRadius: 10,
                  border: "1px solid #d1d5db",
                  fontSize: 14,
                }}
              >
                {roles.map((r) => (
                  <option key={r.value} value={r.value}>
                    {r.label}
                  </option>
                ))}
              </select>
            </label>

            {role === "practitioner" && (
              <label style={{ fontSize: 13, fontWeight: 600 }}>
                Staff ID
                <input
                  type="text"
                  value={staffId}
                  onChange={(e) => setStaffId(e.target.value)}
                  style={{
                    width: "100%",
                    marginTop: 4,
                    padding: "8px 10px",
                    borderRadius: 10,
                    border: "1px solid #d1d5db",
                    fontSize: 14,
                  }}
                  placeholder="e.g. S101"
                />
                <span style={{ fontSize: 11, color: "#6b7280" }}>
                  Practitioners only see their own staff record using this ID.
                </span>
              </label>
            )}

            <button
              type="submit"
              style={{
                marginTop: 4,
                padding: "9px 12px",
                borderRadius: 999,
                border: "none",
                background: "#2563eb",
                color: "#fff",
                fontWeight: 700,
                fontSize: 14,
                cursor: "pointer",
              }}
            >
              Continue
            </button>
          </form>

          <hr style={{ margin: "16px 0", borderColor: "#e5e7eb" }} />

          <p style={{ fontSize: 12, color: "#6b7280", marginBottom: 8 }}>
            Quick log in (for testing the frontend):
          </p>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button
              type="button"
              onClick={() => quickLogin("manager")}
              style={pillStyle}
            >
              Manager
            </button>
            <button
              type="button"
              onClick={() => quickLogin("roomLeader")}
              style={pillStyle}
            >
              Room Leader
            </button>
            <button
              type="button"
              onClick={() => quickLogin("practitioner")}
              style={pillStyle}
            >
              Practitioner
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}

const pillStyle = {
  padding: "6px 10px",
  borderRadius: 999,
  border: "1px solid #d1d5db",
  background: "#f9fafb",
  fontSize: 12,
  cursor: "pointer",
  fontWeight: 600,
};
