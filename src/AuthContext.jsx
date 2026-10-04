// src/AuthContext.jsx
import React from "react";
import { Navigate, useLocation } from "react-router-dom";

const AuthContext = React.createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = React.useState(() => {
    try {
      const raw = window.localStorage.getItem("eh_user");
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  });

  React.useEffect(() => {
    try {
      if (user) {
        window.localStorage.setItem("eh_user", JSON.stringify(user));
      } else {
        window.localStorage.removeItem("eh_user");
      }
    } catch {
      // ignore storage errors
    }
  }, [user]);

  const login = (payload) => setUser(payload);
  const logout = () => setUser(null);

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return React.useContext(AuthContext);
}

/**
 * Wrap a route element in <ProtectedRoute> to require login & role.
 *
 * <ProtectedRoute allowedRoles={['manager', 'roomLeader']}>
 *   <Dashboard />
 * </ProtectedRoute>
 */
export function ProtectedRoute({ children, allowedRoles }) {
  const { user } = useAuth();
  const location = useLocation();

  if (!user) {
    // Not logged in → send to /login and remember where they came from
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    // Logged in but role not allowed
    return (
      <main style={{ maxWidth: 800, margin: "40px auto", padding: 16 }}>
        <h1 style={{ fontSize: 24, fontWeight: 800, marginBottom: 16 }}>
          Not authorised
        </h1>
        <p style={{ marginBottom: 8 }}>
          Your role (<strong>{user.role}</strong>) does not have access to this
          area.
        </p>
      </main>
    );
  }

  return children;
}
