import React, { useState, useEffect } from "react";
import axios from "axios";
import { useAuth } from "../App";
import {
  Trophy,
  Calendar,
  Save,
  Lock,
  CheckCircle,
  RefreshCw,
  HelpCircle,
  AlertCircle,
  Star,
  Award,
  ShieldAlert,
  FileText,
} from "lucide-react";

export default function PlayerDashboard() {
  const { user } = useAuth();

  // Dashboard Sub-tabs
  const [activeSubTab, setActiveSubTab] = useState("forecast");

  // Championships
  const [championships, setChampionships] = useState([]);
  const [selectedCampId, setSelectedCampId] = useState("");

  // Championship details
  const [campInfo, setCampInfo] = useState(null);
  const [matches, setMatches] = useState([]);
  const [matchesLoading, setMatchesLoading] = useState(false);

  // Player forecast
  const [forecast, setForecast] = useState({ matches: [], isConfirmed: false });
  const [forecastLoading, setForecastLoading] = useState(false);

  // Working draft forecast state (local)
  const [localPredictions, setLocalPredictions] = useState({}); // { matchId: selection }

  // Rankings state
  const [rankings, setRankings] = useState([]);
  const [rankingsLoading, setRankingsLoading] = useState(false);

  // Confirm lock Modal state
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  // Alert message
  const [alert, setAlert] = useState({ type: "", text: "" });
  const [actionLoading, setActionLoading] = useState(false);

  const showAlert = (type, text) => {
    setAlert({ type, text });
    setTimeout(() => setAlert({ type: "", text: "" }), 5000);
  };

  // Fetch championships list
  const fetchChampionships = async () => {
    try {
      const res = await axios.get("/api/fixtures/championships/list");
      setChampionships(res.data);
      if (res.data.length > 0 && !selectedCampId) {
        const userChampionshipId = user?.championshipId;
        const userChampionship = res.data.find(
          (c) => c._id === userChampionshipId,
        );
        const active =
          userChampionship || res.data.find((c) => c.isActive) || res.data[0];
        setSelectedCampId(active?._id || "");
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Fetch matches of chosen championship
  const fetchChampionshipDetails = async (campId) => {
    if (!campId) return;
    setMatchesLoading(true);
    try {
      const res = await axios.get(`/api/fixtures/${campId}`);
      setCampInfo(res.data.championship);
      setMatches(res.data.matches);
    } catch (err) {
      showAlert("error", "Error al cargar los partidos del campeonato.");
    } finally {
      setMatchesLoading(false);
    }
  };

  // Fetch player's current forecasts for the chosen championship
  const fetchPlayerForecast = async (campId) => {
    if (!campId) return;
    setForecastLoading(true);
    try {
      const res = await axios.get(
        `/api/pronosticos/mi-pronostico?championshipId=${campId}`,
      );
      setForecast(res.data);

      // Load into local draft predictions
      const localPreds = {};
      if (res.data && res.data.matches) {
        res.data.matches.forEach((m) => {
          localPreds[m.matchId] = m.selection;
        });
      }
      setLocalPredictions(localPreds);
    } catch (err) {
      console.error(err);
    } finally {
      setForecastLoading(false);
    }
  };

  // Fetch leaderboards
  const fetchRankings = async (campId) => {
    if (!campId) return;
    setRankingsLoading(true);
    try {
      const res = await axios.get(`/api/rankings/${campId}`);
      setRankings(res.data.rankings);
    } catch (err) {
      showAlert("error", "Error al cargar la tabla de posiciones.");
    } finally {
      setRankingsLoading(false);
    }
  };

  // Run on startup
  useEffect(() => {
    fetchChampionships();
  }, []);

  // Update when championship selection changes
  useEffect(() => {
    if (selectedCampId) {
      fetchChampionshipDetails(selectedCampId);
      fetchPlayerForecast(selectedCampId);
      if (activeSubTab === "rankings") {
        fetchRankings(selectedCampId);
      }
    }
  }, [selectedCampId]);

  // Update rankings tab on click
  useEffect(() => {
    if (activeSubTab === "rankings" && selectedCampId) {
      fetchRankings(selectedCampId);
    }
  }, [activeSubTab]);

  // Handle player selection of results (L, E, V)
  const handleSelection = (matchId, selection) => {
    if (forecast.isConfirmed || campInfo?.isFinished) return; // Locked

    setLocalPredictions((prev) => {
      const updated = { ...prev };
      if (updated[matchId] === selection) {
        delete updated[matchId]; // Toggle off if clicked again
      } else {
        updated[matchId] = selection;
      }
      return updated;
    });
  };

  // Save prediction draft (partial allowed)
  const handleSaveDraft = async () => {
    setActionLoading(true);
    try {
      const matchesToSubmit = Object.keys(localPredictions).map((matchId) => ({
        matchId,
        selection: localPredictions[matchId],
      }));

      const res = await axios.post("/api/pronosticos/submit", {
        championshipId: selectedCampId,
        matches: matchesToSubmit,
        isConfirmed: false,
      });

      showAlert("success", res.data.message);
      fetchPlayerForecast(selectedCampId);
    } catch (err) {
      showAlert(
        "error",
        err.response?.data?.message || "Error al guardar el borrador.",
      );
    } finally {
      setActionLoading(false);
    }
  };

  // Submit and lock predictions permanently
  const handleConfirmForecast = async () => {
    setShowConfirmModal(false);
    setActionLoading(true);
    try {
      const matchesToSubmit = Object.keys(localPredictions).map((matchId) => ({
        matchId,
        selection: localPredictions[matchId],
      }));

      const res = await axios.post("/api/pronosticos/submit", {
        championshipId: selectedCampId,
        matches: matchesToSubmit,
        isConfirmed: true,
      });

      showAlert("success", res.data.message);
      fetchPlayerForecast(selectedCampId);
    } catch (err) {
      showAlert(
        "error",
        err.response?.data?.message || "Error al confirmar el pronóstico.",
      );
    } finally {
      setActionLoading(false);
    }
  };

  // Check if all matches have been predicted locally
  const totalMatchesCount = matches.length;
  const predictedCount = Object.keys(localPredictions).length;
  const completionPercentage =
    totalMatchesCount > 0
      ? Math.round((predictedCount / totalMatchesCount) * 100)
      : 0;

  // Render pending approval page if user is not approved
  if (user.status !== "approved") {
    return (
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          minHeight: "70vh",
          padding: "16px",
        }}
      >
        <div
          className="glass-panel-static"
          style={{
            width: "100%",
            maxWidth: "500px",
            padding: "40px",
            textAlign: "center",
          }}
        >
          {user.status === "pending" ? (
            <>
              <div
                style={{
                  background: "rgba(245, 158, 11, 0.1)",
                  border: "1px solid rgba(245, 158, 11, 0.3)",
                  borderRadius: "50%",
                  padding: "20px",
                  width: "80px",
                  height: "80px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  margin: "0 auto 24px",
                  color: "var(--accent-gold)",
                }}
              >
                <RefreshCw size={40} className="spinner" />
              </div>
              <h2
                style={{
                  fontSize: "1.6rem",
                  fontWeight: 800,
                  marginBottom: "12px",
                }}
              >
                Cuenta en{" "}
                <span className="gradient-text-gold">Espera de Aprobación</span>
              </h2>
              <p
                style={{
                  color: "var(--text-secondary)",
                  fontSize: "0.95rem",
                  lineHeight: "1.6",
                  marginBottom: "24px",
                }}
              >
                ¡Gracias por registrarte, <strong>@{user.username}</strong>! Tu
                cuenta ha sido registrada con éxito. Un administrador revisará y
                habilitará tu cuenta pronto para que puedas empezar a cargar tus
                pronósticos.
              </p>
              <div style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>
                Por favor, recarga la página o vuelve a ingresar más tarde.
              </div>
            </>
          ) : (
            <>
              <div
                style={{
                  background: "rgba(239, 68, 68, 0.1)",
                  border: "1px solid rgba(239, 68, 68, 0.3)",
                  borderRadius: "50%",
                  padding: "20px",
                  width: "80px",
                  height: "80px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  margin: "0 auto 24px",
                  color: "var(--color-error)",
                }}
              >
                <ShieldAlert size={40} />
              </div>
              <h2
                style={{
                  fontSize: "1.6rem",
                  fontWeight: 800,
                  marginBottom: "12px",
                  color: "#f87171",
                }}
              >
                Registro Rechazado
              </h2>
              <p
                style={{
                  color: "var(--text-secondary)",
                  fontSize: "0.95rem",
                  lineHeight: "1.6",
                }}
              >
                Lamentamos informarte que tu registro ha sido rechazado por el
                administrador y no tienes permitido participar en los
                campeonatos activos.
              </p>
            </>
          )}
        </div>
      </div>
    );
  }

  // Group matches by phase (Jornada) for visual organization
  const matchesByPhase = {};
  matches.forEach((m) => {
    if (!matchesByPhase[m.phase]) {
      matchesByPhase[m.phase] = [];
    }
    matchesByPhase[m.phase].push(m);
  });

  return (
    <div>
      {/* Alert Notices */}
      {alert.text && (
        <div
          style={{
            background:
              alert.type === "success"
                ? "rgba(16, 185, 129, 0.1)"
                : "rgba(239, 68, 68, 0.1)",
            border: `1px solid ${alert.type === "success" ? "rgba(16, 185, 129, 0.3)" : "rgba(239, 68, 68, 0.3)"}`,
            color: alert.type === "success" ? "#34d399" : "#f87171",
            padding: "16px",
            borderRadius: "12px",
            fontSize: "0.9rem",
            marginBottom: "24px",
            display: "flex",
            alignItems: "center",
            gap: "8px",
            position: "sticky",
            top: "20px",
            zIndex: 10,
          }}
        >
          {alert.type === "success" ? (
            <CheckCircle size={18} />
          ) : (
            <AlertCircle size={18} />
          )}
          <span>{alert.text}</span>
        </div>
      )}

      {/* Welcome & Championship Selector */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "28px",
          flexWrap: "wrap",
          gap: "20px",
        }}
      >
        <div>
          <h1 style={{ fontSize: "2rem", fontWeight: 800 }}>
            Hola, <span className="gradient-text-teal">@{user.username}</span>{" "}
            👋
          </h1>
          <p
            style={{
              color: "var(--text-secondary)",
              fontSize: "0.92rem",
              marginTop: "4px",
            }}
          >
            Completa tu fixture y sigue el ranking en vivo
          </p>
        </div>

        <div className="flex-row" style={{ alignItems: "center", gap: "10px" }}>
          <label
            style={{
              fontSize: "0.88rem",
              fontWeight: 600,
              color: "var(--text-secondary)",
            }}
          >
            Campeonato registrado:
          </label>
          <div
            style={{
              minWidth: "220px",
              padding: "10px 14px",
              borderRadius: "10px",
              background: "rgba(255,255,255,0.04)",
              border: "1px solid var(--border-color)",
              color: "var(--text-primary)",
            }}
          >
            {championships.find((c) => c._id === selectedCampId)?.name ||
              "Cargando campeonato..."}
          </div>
        </div>
      </div>

      {/* Main Tab Links */}
      <div
        style={{
          display: "flex",
          borderBottom: "1px solid var(--border-color)",
          marginBottom: "32px",
          gap: "24px",
        }}
      >
        <button
          onClick={() => setActiveSubTab("forecast")}
          style={{
            background: "transparent",
            border: "none",
            borderBottom:
              activeSubTab === "forecast"
                ? "3px solid var(--accent-teal)"
                : "3px solid transparent",
            color:
              activeSubTab === "forecast"
                ? "var(--text-primary)"
                : "var(--text-secondary)",
            padding: "12px 6px",
            fontSize: "1rem",
            fontWeight: 600,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: "8px",
            transition: "all 0.2s ease",
          }}
        >
          <Calendar size={18} />
          Mi Pronóstico
        </button>

        <button
          onClick={() => setActiveSubTab("rankings")}
          style={{
            background: "transparent",
            border: "none",
            borderBottom:
              activeSubTab === "rankings"
                ? "3px solid var(--accent-teal)"
                : "3px solid transparent",
            color:
              activeSubTab === "rankings"
                ? "var(--text-primary)"
                : "var(--text-secondary)",
            padding: "12px 6px",
            fontSize: "1rem",
            fontWeight: 600,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: "8px",
            transition: "all 0.2s ease",
          }}
        >
          <Trophy size={18} />
          Tabla de Posiciones
        </button>
      </div>

      {/* 1. Tab: Forecasts */}
      {activeSubTab === "forecast" && (
        <div>
          {/* Header completion card */}
          <div
            className="glass-panel-static"
            style={{ padding: "24px 32px", marginBottom: "32px" }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                flexWrap: "wrap",
                gap: "16px",
              }}
            >
              <div>
                <h3
                  style={{
                    fontSize: "1.25rem",
                    fontWeight: 800,
                    marginBottom: "6px",
                  }}
                >
                  {forecast.isConfirmed
                    ? "Pronóstico Confirmado 🔒"
                    : "Completa tu Fixture"}
                </h3>
                <p
                  style={{
                    color: "var(--text-secondary)",
                    fontSize: "0.85rem",
                  }}
                >
                  {forecast.isConfirmed
                    ? "Tus apuestas han sido enviadas y bloqueadas. ¡Mucha suerte en los partidos!"
                    : "Debes pronosticar el 100% de los partidos del campeonato para confirmar tu participación."}
                </p>
              </div>

              {!forecast.isConfirmed && totalMatchesCount > 0 && (
                <div style={{ display: "flex", gap: "12px" }}>
                  <button
                    onClick={handleSaveDraft}
                    className="btn-secondary"
                    style={{
                      gap: "6px",
                      padding: "10px 20px",
                      borderRadius: "8px",
                      fontSize: "0.88rem",
                    }}
                    disabled={actionLoading || campInfo?.isFinished}
                  >
                    <Save size={16} /> Guardar Borrador
                  </button>
                  <button
                    onClick={() => setShowConfirmModal(true)}
                    className="btn-primary"
                    style={{
                      gap: "6px",
                      padding: "10px 20px",
                      borderRadius: "8px",
                      fontSize: "0.88rem",
                    }}
                    disabled={
                      completionPercentage < 100 ||
                      actionLoading ||
                      campInfo?.isFinished
                    }
                  >
                    <Lock size={16} /> Confirmar y Bloquear
                  </button>
                </div>
              )}
            </div>

            {/* Progress bar */}
            {!forecast.isConfirmed && totalMatchesCount > 0 && (
              <div style={{ marginTop: "20px" }}>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    fontSize: "0.82rem",
                    fontWeight: 600,
                  }}
                >
                  <span style={{ color: "var(--text-secondary)" }}>
                    Progreso del Fixture:
                  </span>
                  <span className="gradient-text-teal">
                    {predictedCount} / {totalMatchesCount} partidos (
                    {completionPercentage}%)
                  </span>
                </div>
                <div className="progress-bar-container">
                  <div
                    className="progress-bar-fill"
                    style={{ width: `${completionPercentage}%` }}
                  ></div>
                </div>
                {completionPercentage < 100 && (
                  <p
                    style={{
                      color: "var(--text-muted)",
                      fontSize: "0.75rem",
                      marginTop: "6px",
                      display: "flex",
                      alignItems: "center",
                      gap: "4px",
                    }}
                  >
                    <HelpCircle size={12} /> Recuerda que no podrás confirmar
                    hasta completar todos los casilleros.
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Fixture details listing */}
          {matchesLoading || forecastLoading ? (
            <div
              style={{
                display: "flex",
                justifyContent: "center",
                padding: "60px",
              }}
            >
              <span className="spinner"></span>
            </div>
          ) : matches.length === 0 ? (
            <p
              style={{
                color: "var(--text-secondary)",
                textAlign: "center",
                padding: "40px",
              }}
            >
              No hay partidos cargados para este campeonato en este momento.
            </p>
          ) : (
            <div
              style={{ display: "flex", flexDirection: "column", gap: "32px" }}
            >
              {Object.keys(matchesByPhase).map((phase) => (
                <div
                  key={phase}
                  className="glass-panel-static"
                  style={{ padding: "24px" }}
                >
                  <h3
                    style={{
                      fontSize: "1.15rem",
                      fontWeight: 700,
                      marginBottom: "18px",
                      borderBottom: "1px solid var(--border-color)",
                      paddingBottom: "8px",
                      color: "var(--text-primary)",
                    }}
                  >
                    {phase}
                  </h3>

                  <div className="matches-grid">
                    {matchesByPhase[phase].map((match) => {
                      const selection = localPredictions[match._id];
                      const hasResult = match.realResult !== null;
                      const isCorrect = selection === match.realResult;

                      // Decide card styling based on outcome comparisons if confirmed
                      let cardClass = "prediction-card";
                      let scoreTag = null;

                      if (forecast.isConfirmed && hasResult) {
                        cardClass += isCorrect
                          ? " comparison-success"
                          : " comparison-failed";
                        scoreTag = isCorrect ? (
                          <span
                            style={{
                              color: "var(--color-success)",
                              fontSize: "0.72rem",
                              fontWeight: 700,
                              display: "flex",
                              alignItems: "center",
                              gap: "2px",
                              background: "rgba(16, 185, 129, 0.08)",
                              padding: "2px 6px",
                              borderRadius: "4px",
                            }}
                          >
                            <Star size={10} fill="var(--color-success)" /> +1
                            PTO
                          </span>
                        ) : (
                          <span
                            style={{
                              color: "var(--color-error)",
                              fontSize: "0.72rem",
                              fontWeight: 700,
                              background: "rgba(239, 68, 68, 0.08)",
                              padding: "2px 6px",
                              borderRadius: "4px",
                            }}
                          >
                            0 PTO
                          </span>
                        );
                      }

                      return (
                        <div
                          key={match._id}
                          className={cardClass}
                          style={{
                            display: "flex",
                            flexDirection: "column",
                            gap: "12px",
                            background: "rgba(5,7,15,0.4)",
                            padding: "16px 20px",
                            borderRadius: "12px",
                          }}
                        >
                          {/* Match Header Details */}
                          <div
                            style={{
                              display: "flex",
                              justifyContent: "space-between",
                              width: "100%",
                              fontSize: "0.75rem",
                              color: "var(--text-muted)",
                            }}
                          >
                            <span>
                              {match.date} - {match.time}
                            </span>
                            {scoreTag}
                          </div>

                          {/* Teams display */}
                          <div
                            style={{
                              display: "flex",
                              justifyContent: "space-between",
                              alignItems: "center",
                              width: "100%",
                            }}
                          >
                            <div
                              style={{
                                flex: 1,
                                textAlign: "right",
                                fontWeight: 600,
                                fontSize: "0.9rem",
                              }}
                            >
                              {match.localTeam}
                            </div>

                            {/* Option buttons */}
                            <div
                              className="prediction-options"
                              style={{ margin: "0 12px" }}
                            >
                              <button
                                onClick={() => handleSelection(match._id, "L")}
                                className={`prediction-btn ${selection === "L" ? "active-L" : ""}`}
                                disabled={
                                  forecast.isConfirmed || campInfo?.isFinished
                                }
                              >
                                L
                              </button>
                              <button
                                onClick={() => handleSelection(match._id, "E")}
                                className={`prediction-btn ${selection === "E" ? "active-E" : ""}`}
                                disabled={
                                  forecast.isConfirmed || campInfo?.isFinished
                                }
                              >
                                E
                              </button>
                              <button
                                onClick={() => handleSelection(match._id, "V")}
                                className={`prediction-btn ${selection === "V" ? "active-V" : ""}`}
                                disabled={
                                  forecast.isConfirmed || campInfo?.isFinished
                                }
                              >
                                V
                              </button>
                            </div>

                            <div
                              style={{
                                flex: 1,
                                textAlign: "left",
                                fontWeight: 600,
                                fontSize: "0.9rem",
                              }}
                            >
                              {match.visitorTeam}
                            </div>
                          </div>

                          {/* Official outcome display */}
                          {hasResult && (
                            <div
                              style={{
                                display: "flex",
                                justifyContent: "center",
                                alignItems: "center",
                                gap: "8px",
                                background: "rgba(255,255,255,0.03)",
                                padding: "6px",
                                borderRadius: "6px",
                                fontSize: "0.78rem",
                                width: "100%",
                              }}
                            >
                              <span style={{ color: "var(--text-muted)" }}>
                                Resultado Oficial:
                              </span>
                              <strong style={{ color: "var(--text-primary)" }}>
                                {match.localTeam} {match.scoreLocal} -{" "}
                                {match.scoreVisitor} {match.visitorTeam}
                              </strong>
                              <span
                                className={`badge badge-${match.realResult === "L" ? "approved" : match.realResult === "E" ? "pending" : "rejected"}`}
                                style={{
                                  padding: "2px 6px",
                                  fontSize: "0.65rem",
                                }}
                              >
                                {match.realResult === "L"
                                  ? "Local"
                                  : match.realResult === "E"
                                    ? "Empate"
                                    : "Vis."}
                              </span>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 2. Tab: Rankings */}
      {activeSubTab === "rankings" && (
        <div className="glass-panel-static" style={{ padding: "32px" }}>
          <h3
            style={{
              fontSize: "1.4rem",
              fontWeight: 800,
              marginBottom: "20px",
              display: "flex",
              alignItems: "center",
              gap: "8px",
            }}
          >
            <Award className="gradient-text-teal" size={24} />
            Tabla General de Posiciones
          </h3>

          {rankingsLoading ? (
            <div
              style={{
                display: "flex",
                justifyContent: "center",
                padding: "60px",
              }}
            >
              <span className="spinner"></span>
            </div>
          ) : rankings.length === 0 ? (
            <p
              style={{
                color: "var(--text-secondary)",
                textAlign: "center",
                padding: "32px",
              }}
            >
              No hay puntajes registrados en este campeonato todavía.
            </p>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table className="leaderboard-table">
                <thead>
                  <tr>
                    <th style={{ width: "80px", paddingLeft: "16px" }}>
                      Puesto
                    </th>
                    <th>Jugador</th>
                    <th>Estado Prode</th>
                    <th style={{ textAlign: "right", paddingRight: "16px" }}>
                      Puntos
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {rankings.map((item) => {
                    const isSelf = item.username === user.username;

                    // Render special medals for top three positions
                    let rankDisplay = item.rank;
                    if (item.rank === 1) rankDisplay = "🥇 1";
                    else if (item.rank === 2) rankDisplay = "🥈 2";
                    else if (item.rank === 3) rankDisplay = "🥉 3";

                    return (
                      <tr
                        key={item.userId}
                        className={isSelf ? "leaderboard-row-highlight" : ""}
                        style={{ fontWeight: isSelf ? 700 : 400 }}
                      >
                        <td
                          style={{
                            paddingLeft: "16px",
                            color:
                              item.rank <= 3
                                ? "var(--text-primary)"
                                : "var(--text-muted)",
                          }}
                        >
                          {rankDisplay}
                        </td>
                        <td>
                          <span
                            style={{
                              color: isSelf
                                ? "var(--accent-teal)"
                                : "var(--text-primary)",
                            }}
                          >
                            @{item.username} {isSelf ? "(Tú)" : ""}
                          </span>
                        </td>
                        <td>
                          {item.isConfirmed ? (
                            <span
                              style={{
                                fontSize: "0.8rem",
                                color: "var(--color-success)",
                                display: "inline-flex",
                                alignItems: "center",
                                gap: "4px",
                              }}
                            >
                              <Lock size={12} /> Confirmado
                            </span>
                          ) : (
                            <span
                              style={{
                                fontSize: "0.8rem",
                                color: "var(--text-muted)",
                                display: "inline-flex",
                                alignItems: "center",
                                gap: "4px",
                              }}
                            >
                              <FileText size={12} /> Borrador
                            </span>
                          )}
                        </td>
                        <td
                          style={{
                            textAlign: "right",
                            paddingRight: "16px",
                            fontWeight: 800,
                            color: isSelf
                              ? "var(--accent-teal)"
                              : "var(--text-primary)",
                            fontSize: "1.05rem",
                          }}
                        >
                          {item.points} pts
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Confirmation warning modal for lock */}
      {showConfirmModal && (
        <div
          style={{
            position: "fixed",
            left: 0,
            top: 0,
            width: "100vw",
            height: "100vh",
            background: "rgba(5, 7, 15, 0.85)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 100,
            backdropFilter: "blur(8px)",
          }}
        >
          <div
            className="glass-panel-static"
            style={{
              width: "100%",
              maxWidth: "440px",
              padding: "32px",
              textAlign: "center",
            }}
          >
            <Lock
              size={48}
              style={{
                color: "var(--accent-teal)",
                marginBottom: "16px",
                filter: "drop-shadow(0 0 8px rgba(0, 242, 254, 0.4))",
              }}
            />
            <h3
              style={{
                fontSize: "1.4rem",
                fontWeight: 800,
                marginBottom: "12px",
              }}
            >
              ¿Confirmar y Bloquear Prode?
            </h3>
            <p
              style={{
                color: "var(--text-secondary)",
                fontSize: "0.9rem",
                lineHeight: "1.5",
                marginBottom: "24px",
              }}
            >
              Estás por confirmar de forma definitiva tus pronósticos para{" "}
              <strong>{campInfo?.name}</strong>. Una vez confirmados,{" "}
              <strong style={{ color: "var(--text-primary)" }}>
                quedarán bloqueados y no podrás realizar ningún tipo de cambio
              </strong>
              , incluso si no comenzó el campeonato.
            </p>
            <div
              style={{ display: "flex", gap: "12px", justifyContent: "center" }}
            >
              <button
                onClick={() => setShowConfirmModal(false)}
                className="btn-secondary"
                style={{ padding: "10px 20px", borderRadius: "8px" }}
              >
                Volver
              </button>
              <button
                onClick={handleConfirmForecast}
                className="btn-primary"
                style={{ padding: "10px 20px", borderRadius: "8px" }}
              >
                Confirmar Definitivamente
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
