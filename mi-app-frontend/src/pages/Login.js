import React, { useState } from "react";
import axios from "axios";
import { useAuth } from "../App";
import { User, Lock, Trophy, LogIn, UserPlus, Info } from "lucide-react";

export default function Login() {
  const { login } = useAuth();
  const [isLoginTab, setIsLoginTab] = useState(true);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [championships, setChampionships] = useState([]);
  const [selectedChampionshipId, setSelectedChampionshipId] = useState("");

  // Loading and feedback states
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  React.useEffect(() => {
    const fetchChampionships = async () => {
      try {
        const res = await axios.get("/api/fixtures/championships/list");
        // Filter to show only championships OPEN for registration (new signups)
        const openChampionships = res.data.filter(
          (c) => !c.isClosedForRegistration,
        );
        setChampionships(openChampionships);
        if (openChampionships.length > 0) {
          const active =
            openChampionships.find((c) => c.isActive) || openChampionships[0];
          setSelectedChampionshipId(active._id);
        }
      } catch (err) {
        console.error("Error fetching championships:", err);
      }
    };
    fetchChampionships();
  }, []);

  const handleTabChange = (isLogin) => {
    setIsLoginTab(isLogin);
    setError("");
    setSuccessMessage("");
    setUsername("");
    setPassword("");
    setConfirmPassword("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccessMessage("");
    setLoading(true);

    if (!username.trim() || !password) {
      setError("Por favor, completa todos los campos.");
      setLoading(false);
      return;
    }

    if (!isLoginTab) {
      // Register validation
      if (password.length < 6) {
        setError("La contraseña debe tener al menos 6 caracteres.");
        setLoading(false);
        return;
      }
      if (password !== confirmPassword) {
        setError("Las contraseñas no coinciden.");
        setLoading(false);
        return;
      }
    }

    try {
      if (isLoginTab) {
        // Login API Call
        const res = await axios.post("/api/auth/login", { username, password });
        login(res.data.token, res.data.user);
      } else {
        // Register API Call
        const res = await axios.post("/api/auth/register", {
          username,
          password,
          championshipId: selectedChampionshipId,
        });
        setSuccessMessage(res.data.message);
        // Switch to login tab after brief delay or wait for user to click
        setUsername("");
        setPassword("");
        setConfirmPassword("");
        setTimeout(() => {
          setIsLoginTab(true);
          setSuccessMessage(res.data.message + " ¡Inicia sesión aquí!");
        }, 3000);
      }
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Ocurrió un error inesperado. Inténtalo de nuevo.",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        minHeight: "80vh",
        padding: "16px",
      }}
    >
      <div
        className="glass-panel-static"
        style={{
          width: "100%",
          maxWidth: "440px",
          padding: "40px",
          position: "relative",
        }}
      >
        {/* Glowing top header logo */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            marginBottom: "32px",
          }}
        >
          <div
            style={{
              background:
                "linear-gradient(135deg, var(--accent-blue), var(--accent-teal))",
              borderRadius: "50%",
              padding: "16px",
              boxShadow: "0 0 25px rgba(0, 242, 254, 0.4)",
              marginBottom: "16px",
            }}
          >
            <Trophy size={40} color="#060913" />
          </div>
          <h2
            style={{
              fontSize: "1.8rem",
              fontWeight: 800,
              marginBottom: "6px",
              textAlign: "center",
            }}
          >
            PRODE <span className="gradient-text-teal">MUNDIAL 2026</span>
          </h2>
          <p
            style={{
              color: "var(--text-secondary)",
              fontSize: "0.88rem",
              textAlign: "center",
            }}
          >
            Pronósticos deportivos y tabla de posiciones
          </p>
        </div>

        {/* Tab Selection */}
        <div
          style={{
            display: "flex",
            background: "rgba(5, 7, 15, 0.5)",
            borderRadius: "10px",
            padding: "4px",
            border: "1px solid var(--border-color)",
            marginBottom: "28px",
          }}
        >
          <button
            onClick={() => handleTabChange(true)}
            style={{
              flex: 1,
              background: isLoginTab
                ? "rgba(255, 255, 255, 0.08)"
                : "transparent",
              border: "none",
              color: isLoginTab
                ? "var(--text-primary)"
                : "var(--text-secondary)",
              borderRadius: "8px",
              padding: "10px",
              cursor: "pointer",
              fontWeight: 600,
              fontSize: "0.9rem",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "6px",
              transition: "all 0.2s ease",
            }}
          >
            <LogIn size={16} />
            Ingresar
          </button>
          <button
            onClick={() => handleTabChange(false)}
            style={{
              flex: 1,
              background: !isLoginTab
                ? "rgba(255, 255, 255, 0.08)"
                : "transparent",
              border: "none",
              color: !isLoginTab
                ? "var(--text-primary)"
                : "var(--text-secondary)",
              borderRadius: "8px",
              padding: "10px",
              cursor: "pointer",
              fontWeight: 600,
              fontSize: "0.9rem",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "6px",
              transition: "all 0.2s ease",
            }}
          >
            <UserPlus size={16} />
            Registrarse
          </button>
        </div>

        {/* Notifications */}
        {error && (
          <div
            style={{
              background: "rgba(239, 68, 68, 0.1)",
              border: "1px solid rgba(239, 68, 68, 0.3)",
              borderRadius: "8px",
              color: "#f87171",
              padding: "12px 16px",
              fontSize: "0.85rem",
              marginBottom: "20px",
            }}
          >
            {error}
          </div>
        )}

        {successMessage && (
          <div
            style={{
              background: "rgba(16, 185, 129, 0.1)",
              border: "1px solid rgba(16, 185, 129, 0.3)",
              borderRadius: "8px",
              color: "#34d399",
              padding: "12px 16px",
              fontSize: "0.85rem",
              marginBottom: "20px",
              display: "flex",
              alignItems: "flex-start",
              gap: "8px",
            }}
          >
            <Info size={16} style={{ flexShrink: 0, marginTop: "2px" }} />
            <span>{successMessage}</span>
          </div>
        )}

        {/* Auth Form */}
        <form
          onSubmit={handleSubmit}
          style={{ display: "flex", flexDirection: "column", gap: "20px" }}
        >
          <div>
            <label
              style={{
                display: "block",
                fontSize: "0.85rem",
                color: "var(--text-secondary)",
                marginBottom: "8px",
                fontWeight: 500,
              }}
            >
              Nombre de Usuario
            </label>
            <div style={{ position: "relative" }}>
              <User
                size={18}
                style={{
                  position: "absolute",
                  left: "16px",
                  top: "50%",
                  transform: "translateY(-50%)",
                  color: "var(--text-muted)",
                }}
              />
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="ej: messi10"
                className="form-input"
                style={{ paddingLeft: "48px" }}
                disabled={loading}
              />
            </div>
          </div>

          <div>
            <label
              style={{
                display: "block",
                fontSize: "0.85rem",
                color: "var(--text-secondary)",
                marginBottom: "8px",
                fontWeight: 500,
              }}
            >
              Contraseña
            </label>
            <div style={{ position: "relative" }}>
              <Lock
                size={18}
                style={{
                  position: "absolute",
                  left: "16px",
                  top: "50%",
                  transform: "translateY(-50%)",
                  color: "var(--text-muted)",
                }}
              />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="form-input"
                style={{ paddingLeft: "48px" }}
                disabled={loading}
              />
            </div>
          </div>

          {!isLoginTab && (
            <div>
              <label
                style={{
                  display: "block",
                  fontSize: "0.85rem",
                  color: "var(--text-secondary)",
                  marginBottom: "8px",
                  fontWeight: 500,
                }}
              >
                Confirmar Contraseña
              </label>
              <div style={{ position: "relative" }}>
                <Lock
                  size={18}
                  style={{
                    position: "absolute",
                    left: "16px",
                    top: "50%",
                    transform: "translateY(-50%)",
                    color: "var(--text-muted)",
                  }}
                />
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  className="form-input"
                  style={{ paddingLeft: "48px" }}
                  disabled={loading}
                />
              </div>
            </div>
          )}

          {!isLoginTab && championships.length > 0 && (
            <div>
              <label
                style={{
                  display: "block",
                  fontSize: "0.85rem",
                  color: "var(--text-secondary)",
                  marginBottom: "8px",
                  fontWeight: 500,
                }}
              >
                Selecciona tu Campeonato
              </label>
              <select
                value={selectedChampionshipId}
                onChange={(e) => setSelectedChampionshipId(e.target.value)}
                className="form-input"
                style={{
                  appearance: "none",
                  backgroundRepeat: "no-repeat",
                  backgroundPosition: "right 16px center",
                }}
                disabled={loading}
              >
                <option value="">-- Elegir un campeonato --</option>
                {championships.map((c) => (
                  <option key={c._id} value={c._id}>
                    {c.name} {c.isActive ? "(Activo)" : ""}
                  </option>
                ))}
              </select>
            </div>
          )}

          <button
            type="submit"
            className="btn-primary"
            style={{
              width: "100%",
              justifyContent: "center",
              marginTop: "10px",
            }}
            disabled={loading}
          >
            {loading ? (
              <span
                className="spinner"
                style={{ width: "18px", height: "18px", borderWidth: "2px" }}
              ></span>
            ) : isLoginTab ? (
              "Ingresar al Prode"
            ) : (
              "Crear mi Cuenta"
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
