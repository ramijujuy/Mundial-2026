import React, { createContext, useContext, useState, useEffect } from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
  useNavigate,
} from "react-router-dom";
import axios from "axios";
import { LogOut, Trophy, UserCheck, Shield } from "lucide-react";
import Login from "./pages/Login";
import PlayerDashboard from "./pages/PlayerDashboard";
import AdminDashboard from "./pages/AdminDashboard";

// Set up default axios base URL for backend connection
axios.defaults.baseURL =
  process.env.REACT_APP_API_URL || "http://localhost:5000";

// Global Authentication Context
const AuthContext = createContext(null);

export const useAuth = () => useContext(AuthContext);

// Protected Route for Players
const PlayerRoute = ({ children }) => {
  const { user, token } = useAuth();

  if (!token || !user) {
    return <Navigate to="/login" replace />;
  }

  if (user.isAdmin) {
    return <Navigate to="/admin" replace />;
  }

  return children;
};

// Protected Route for Admins
const AdminRoute = ({ children }) => {
  const { user, token } = useAuth();

  if (!token || !user) {
    return <Navigate to="/login" replace />;
  }

  if (!user.isAdmin) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
};

function Navigation() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  if (!user) return null;

  return (
    <nav className="app-navbar glass-panel-static">
      <div
        className="flex-row"
        style={{ cursor: "pointer" }}
        onClick={() => navigate(user.isAdmin ? "/admin" : "/dashboard")}
      >
        <Trophy
          size={28}
          className="gradient-text-teal"
          style={{ filter: "drop-shadow(0 0 8px rgba(0, 242, 254, 0.4))" }}
        />
        <span
          style={{
            fontFamily: "var(--font-display)",
            fontWeight: 800,
            fontSize: "1.4rem",
            letterSpacing: "-0.03em",
          }}
        >
          PRODE <span className="gradient-text-teal">MUNDIAL '26</span>
        </span>
      </div>

      <div className="flex-row" style={{ gap: "20px" }}>
        <div className="flex-row">
          {user.isAdmin ? (
            <span className="badge badge-approved" style={{ gap: "6px" }}>
              <Shield size={12} /> Admin
            </span>
          ) : (
            <span
              className={`badge badge-${user.status}`}
              style={{ gap: "6px" }}
            >
              <UserCheck size={12} />{" "}
              {user.status === "approved"
                ? "Aprobado"
                : user.status === "pending"
                  ? "Pendiente"
                  : "Rechazado"}
            </span>
          )}
          <span style={{ fontWeight: 600, fontSize: "0.95rem", opacity: 0.9 }}>
            @{user.username}
          </span>
        </div>

        <button
          onClick={logout}
          className="btn-secondary"
          style={{
            padding: "8px 14px",
            borderRadius: "8px",
            fontSize: "0.85rem",
            gap: "6px",
          }}
        >
          <LogOut size={15} />
          Salir
        </button>
      </div>
    </nav>
  );
}

export default function App() {
  const [token, setToken] = useState(localStorage.getItem("token") || null);
  const [user, setUser] = useState(() => {
    const savedUser = localStorage.getItem("user");
    return savedUser ? JSON.parse(savedUser) : null;
  });

  // Inject Authorization Header automatically if token changes
  useEffect(() => {
    if (token) {
      axios.defaults.headers.common["Authorization"] = `Bearer ${token}`;
      localStorage.setItem("token", token);
    } else {
      delete axios.defaults.headers.common["Authorization"];
      localStorage.removeItem("token");
    }
  }, [token]);

  const login = (newToken, newUser) => {
    setToken(newToken);
    setUser(newUser);
    localStorage.setItem("user", JSON.stringify(newUser));
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem("user");
  };

  return (
    <AuthContext.Provider value={{ token, user, login, logout, setUser }}>
      <Router>
        <div className="app-container">
          <Navigation />
          <Routes>
            <Route
              path="/login"
              element={
                token ? (
                  user?.isAdmin ? (
                    <Navigate to="/admin" replace />
                  ) : (
                    <Navigate to="/dashboard" replace />
                  )
                ) : (
                  <Login />
                )
              }
            />

            <Route
              path="/dashboard"
              element={
                <PlayerRoute>
                  <PlayerDashboard />
                </PlayerRoute>
              }
            />

            <Route
              path="/admin"
              element={
                <AdminRoute>
                  <AdminDashboard />
                </AdminRoute>
              }
            />

            {/* Catch-all route */}
            <Route
              path="*"
              element={
                token ? (
                  user?.isAdmin ? (
                    <Navigate to="/admin" replace />
                  ) : (
                    <Navigate to="/dashboard" replace />
                  )
                ) : (
                  <Navigate to="/login" replace />
                )
              }
            />
          </Routes>
        </div>
      </Router>
    </AuthContext.Provider>
  );
}
