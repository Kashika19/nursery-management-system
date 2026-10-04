// src/components/TopNav.jsx
import React from "react";
import { NavLink, Link, useNavigate } from "react-router-dom";
import { useAuth } from "../AuthContext";

const Wrap = ({ children }) => (
  <div
    style={{
      maxWidth: 1100,
      margin: "0 auto",
      padding: "0 16px",
      width: "100%",
    }}
  >
    {children}
  </div>
);

const S = {
  bar: {
    position: "sticky",
    top: 0,
    zIndex: 1000,
    background: "#ffffffcc",
    backdropFilter: "saturate(120%) blur(6px)",
    borderBottom: "1px solid #e5e7eb",
  },
  inner: {
    display: "flex",
    alignItems: "center",
    height: 56,
    gap: 16,
  },
  brand: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    fontWeight: 800,
    fontSize: 18,
    textDecoration: "none",
    color: "#111827",
  },
  brandMark: {
    height: 28,
    width: 28,
    borderRadius: 8,
    display: "grid",
    placeItems: "center",
    background: "#2563eb",
    color: "#ffffff",
    fontSize: 12,
    fontWeight: 900,
    letterSpacing: "0.02em",
  },
  tabs: {
    display: "flex",
    alignItems: "center",
    gap: 4,
    marginLeft: 16,
    flexWrap: "wrap",
  },
  tab: (active) => ({
    padding: "6px 10px",
    borderRadius: 999,
    border: "1px solid transparent",
    fontSize: 13,
    fontWeight: 600,
    cursor: "pointer",
    textDecoration: "none",
    color: active ? "#ffffff" : "#4b5563",
    background: active ? "#2563eb" : "transparent",
    borderColor: active ? "#2563eb" : "transparent",
  }),
  right: {
    marginLeft: "auto",
    display: "flex",
    alignItems: "center",
    gap: 8,
    fontSize: 12,
  },
};

const NAV_ITEMS = [
  { label: "Dashboard", to: "/", roles: ["manager", "roomLeader", "practitioner"] },
  { label: "Children", to: "/children", roles: ["manager", "roomLeader", "practitioner"] },
  { label: "Staff", to: "/staff", roles: ["manager", "roomLeader", "practitioner"] },
  { label: "Facilities", to: "/facilities", roles: ["manager", "roomLeader", "practitioner"] },
  { label: "Finance", to: "/finance", roles: ["manager"] },
  { label: "Viewings", to: "/viewings", roles: ["manager", "roomLeader"] },
  { label: "Ofsted", to: "/ofsted", roles: ["manager", "roomLeader"] },
  { label: "Occupancy", to: "/occupancy", roles: ["manager", "roomLeader"] },
  { label: "Admin", to: "/admin", roles: ["manager"] },
];

export default function TopNav() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const allowedNav = React.useMemo(() => {
    if (!user) return [];
    return NAV_ITEMS.filter((item) => item.roles.includes(user.role));
  }, [user]);

  return (
    <header style={S.bar}>
      <Wrap>
        <div style={S.inner}>
          <Link to={user ? "/" : "/login"} style={S.brand}>
            <span aria-hidden="true" style={S.brandMark}>NM</span>
            <span>Nursery Manager</span>
          </Link>

          {user && (
            <nav style={S.tabs}>
              {allowedNav.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.to === "/"}
                  style={({ isActive }) => S.tab(isActive)}
                >
                  {item.label}
                </NavLink>
              ))}
            </nav>
          )}

          <div style={S.right}>
            {user ? (
              <>
                <span style={{ color: "#6b7280" }}>
                  {user.name} ·{" "}
                  <span style={{ textTransform: "capitalize" }}>
                    {user.role}
                  </span>
                </span>
                <button
                  type="button"
                  onClick={handleLogout}
                  style={{
                    padding: "4px 8px",
                    borderRadius: 999,
                    border: "1px solid #d1d5db",
                    background: "#f9fafb",
                    cursor: "pointer",
                    fontWeight: 600,
                  }}
                >
                  Log out
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={() => navigate("/login")}
                style={{
                  padding: "4px 10px",
                  borderRadius: 999,
                  border: "1px solid #2563eb",
                  background: "#2563eb",
                  color: "#fff",
                  cursor: "pointer",
                  fontWeight: 600,
                  fontSize: 12,
                }}
              >
                Log in
              </button>
            )}
          </div>
        </div>
      </Wrap>
    </header>
  );
}
