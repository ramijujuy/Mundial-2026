import React, { useState, useEffect } from "react";
import axios from "axios";
import {
  Users,
  Trophy,
  Calendar,
  Upload,
  Save,
  CheckCircle,
  XCircle,
  Settings,
  RefreshCw,
  AlertCircle,
  AlertTriangle,
} from "lucide-react";

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState("users");

  // States for player management
  const [users, setUsers] = useState([]);
  const [usersLoading, setUsersLoading] = useState(false);

  // States for creating championship
  const [campName, setCampName] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [excelFile, setExcelFile] = useState(null);
  const [createLoading, setCreateLoading] = useState(false);

  // States for loading results
  const [championships, setChampionships] = useState([]);
  const [selectedCampId, setSelectedCampId] = useState("");
  const [matches, setMatches] = useState([]);
  const [matchesLoading, setMatchesLoading] = useState(false);
  const [scores, setScores] = useState({}); // { matchId: { scoreLocal, scoreVisitor } }
  const [resultsLoading, setResultsLoading] = useState(false);
  const [exportChampionshipId, setExportChampionshipId] = useState("");

  // General alert messages
  const [message, setMessage] = useState({ type: "", text: "" });

  // Fetch users for review
  const fetchUsers = async () => {
    setUsersLoading(true);
    try {
      const query = exportChampionshipId
        ? `?championshipId=${exportChampionshipId}`
        : "";
      const res = await axios.get(`/api/admin/users${query}`);
      setUsers(res.data);
    } catch (err) {
      showMsg("error", "Error al cargar los usuarios.");
    } finally {
      setUsersLoading(false);
    }
  };

  // Fetch championships list (for selector)
  const fetchChampionships = async () => {
    try {
      const res = await axios.get("/api/fixtures/championships/list");
      setChampionships(res.data);
      if (res.data.length > 0 && !selectedCampId) {
        // Set first active championship by default if available
        const active = res.data.find((c) => c.isActive) || res.data[0];
        setSelectedCampId(active._id);
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Fetch matches for selected championship (for results submission)
  const fetchMatchesForAdmin = async (campId) => {
    if (!campId) return;
    setMatchesLoading(true);
    try {
      const res = await axios.get(`/api/fixtures/${campId}`);
      setMatches(res.data.matches);

      // Initialize scores state from DB
      const initialScores = {};
      res.data.matches.forEach((m) => {
        initialScores[m._id] = {
          scoreLocal: m.scoreLocal !== null ? m.scoreLocal : "",
          scoreVisitor: m.scoreVisitor !== null ? m.scoreVisitor : "",
        };
      });
      setScores(initialScores);
    } catch (err) {
      showMsg("error", "Error al cargar los partidos del campeonato.");
    } finally {
      setMatchesLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === "users") {
      fetchUsers();
    } else if (activeTab === "results") {
      fetchChampionships();
    }
  }, [activeTab]);

  useEffect(() => {
    if (activeTab === "users") {
      fetchUsers();
    }
  }, [exportChampionshipId]);

  useEffect(() => {
    fetchChampionships();
  }, []);

  useEffect(() => {
    if (selectedCampId) {
      fetchMatchesForAdmin(selectedCampId);
    }
  }, [selectedCampId]);

  const showMsg = (type, text) => {
    setMessage({ type, text });
    setTimeout(() => setMessage({ type: "", text: "" }), 5000);
  };

  // Player action: Approve
  const handleApproveUser = async (userId) => {
    try {
      const res = await axios.post("/api/admin/approve-user", { userId });
      showMsg("success", res.data.message);
      fetchUsers();
    } catch (err) {
      showMsg(
        "error",
        err.response?.data?.message || "Error al aprobar usuario.",
      );
    }
  };

  // Player action: Reject
  const handleRejectUser = async (userId) => {
    try {
      const res = await axios.post("/api/admin/reject-user", { userId });
      showMsg("success", res.data.message);
      fetchUsers();
    } catch (err) {
      showMsg(
        "error",
        err.response?.data?.message || "Error al rechazar usuario.",
      );
    }
  };

  // Player action: Promote to admin
  const handlePromoteUser = async (userId) => {
    try {
      const res = await axios.post("/api/admin/promote-user", { userId });
      showMsg("success", res.data.message);
      fetchUsers();
    } catch (err) {
      showMsg(
        "error",
        err.response?.data?.message ||
          "Error al promover usuario a administrador.",
      );
    }
  };

  const handleDownloadParticipants = async () => {
    try {
      const query = exportChampionshipId
        ? `?championshipId=${exportChampionshipId}`
        : "";
      const response = await axios.get(
        `/api/admin/export-participants${query}`,
        {
          responseType: "blob",
        },
      );
      const blob = new Blob([response.data], {
        type: "text/csv;charset=utf-8",
      });
      const url = window.URL.createObjectURL(blob);
      const contentDisposition = response.headers["content-disposition"] || "";
      const matches = contentDisposition.match(/filename="(.+)"/);
      const filename = matches ? matches[1] : "participantes.csv";
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      showMsg("error", "Error al descargar participantes.");
    }
  };

  // Create Championship with Excel Upload
  const handleCreateChampionship = async (e) => {
    e.preventDefault();
    if (!campName || !startDate || !endDate || !excelFile) {
      showMsg("error", "Todos los campos y el archivo Excel son obligatorios.");
      return;
    }

    setCreateLoading(true);
    const formData = new FormData();
    formData.append("name", campName);
    formData.append("startDate", startDate);
    formData.append("endDate", endDate);
    formData.append("fixture", excelFile);

    try {
      const res = await axios.post("/api/admin/create-campeonato", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      showMsg("success", res.data.message);
      // Reset form
      setCampName("");
      setStartDate("");
      setEndDate("");
      setExcelFile(null);
      // Clear file input manually
      document.getElementById("excelFileInput").value = "";
    } catch (err) {
      showMsg(
        "error",
        err.response?.data?.message || "Error al procesar el archivo Excel.",
      );
    } finally {
      setCreateLoading(false);
    }
  };

  // Handle score typing
  const handleScoreChange = (matchId, team, val) => {
    setScores((prev) => ({
      ...prev,
      [matchId]: {
        ...prev[matchId],
        [team]: val === "" ? "" : Number(val),
      },
    }));
  };

  // Save Real Match Results
  const handleSaveResults = async () => {
    setResultsLoading(true);
    try {
      // Map scores object into array of results for DB submission
      const resultsToSubmit = [];
      Object.keys(scores).forEach((matchId) => {
        const matchScores = scores[matchId];
        if (matchScores.scoreLocal !== "" && matchScores.scoreVisitor !== "") {
          resultsToSubmit.push({
            matchId,
            scoreLocal: Number(matchScores.scoreLocal),
            scoreVisitor: Number(matchScores.scoreVisitor),
          });
        }
      });

      if (resultsToSubmit.length === 0) {
        showMsg(
          "error",
          "Por favor, ingresa al menos un resultado completo (Local y Visitante).",
        );
        setResultsLoading(false);
        return;
      }

      await axios.post("/api/admin/upload-results", {
        championshipId: selectedCampId,
        results: resultsToSubmit,
      });

      showMsg(
        "success",
        "Resultados cargados y puntajes de jugadores actualizados de inmediato.",
      );
      fetchMatchesForAdmin(selectedCampId);
    } catch (err) {
      showMsg(
        "error",
        err.response?.data?.message || "Error al subir los resultados.",
      );
    } finally {
      setResultsLoading(false);
    }
  };

  // Close Registration Action
  const handleCloseRegistration = async (campId) => {
    if (
      !window.confirm(
        "¿Estás seguro de cerrar las inscripciones? Los nuevos usuarios registrados no podrán participar de este campeonato.",
      )
    )
      return;
    try {
      await axios.post("/api/admin/close-registration", {
        championshipId: campId,
      });
      showMsg("success", "Inscripciones cerradas para este campeonato.");
      fetchChampionships();
    } catch (err) {
      showMsg("error", "Error al cerrar inscripciones.");
    }
  };

  // Finish Championship Action
  const handleFinishChampionship = async (campId) => {
    if (
      !window.confirm(
        "¿Estás seguro de finalizar el campeonato? Esto bloqueará definitivamente la carga de resultados y cerrará el fixture.",
      )
    )
      return;
    try {
      await axios.post("/api/admin/finish-campeonato", {
        championshipId: campId,
      });
      showMsg("success", "El campeonato ha finalizado con éxito.");
      fetchChampionships();
    } catch (err) {
      showMsg("error", "Error al finalizar campeonato.");
    }
  };

  const pendingUsers = users.filter((u) => u.status === "pending");
  const processedUsers = users.filter((u) => u.status !== "pending");

  return (
    <div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "28px",
        }}
      >
        <div>
          <h1
            style={{ fontSize: "2.2rem", fontWeight: 800, marginBottom: "6px" }}
          >
            Panel de <span className="gradient-text-teal">Control Admin</span>
          </h1>
          <p style={{ color: "var(--text-secondary)", fontSize: "0.95rem" }}>
            Gestiona jugadores, campeonatos y carga los resultados oficiales
          </p>
        </div>
      </div>

      {/* Global alert messages */}
      {message.text && (
        <div
          style={{
            background:
              message.type === "success"
                ? "rgba(16, 185, 129, 0.1)"
                : "rgba(239, 68, 68, 0.1)",
            border: `1px solid ${message.type === "success" ? "rgba(16, 185, 129, 0.3)" : "rgba(239, 68, 68, 0.3)"}`,
            color: message.type === "success" ? "#34d399" : "#f87171",
            padding: "16px",
            borderRadius: "12px",
            fontSize: "0.9rem",
            marginBottom: "24px",
            display: "flex",
            alignItems: "center",
            gap: "8px",
          }}
        >
          {message.type === "success" ? (
            <CheckCircle size={18} />
          ) : (
            <AlertCircle size={18} />
          )}
          <span>{message.text}</span>
        </div>
      )}

      {/* Tabs */}
      <div
        style={{
          display: "flex",
          borderBottom: "1px solid var(--border-color)",
          marginBottom: "32px",
          gap: "24px",
          overflowX: "auto",
        }}
      >
        <button
          onClick={() => setActiveTab("users")}
          style={{
            background: "transparent",
            border: "none",
            borderBottom:
              activeTab === "users"
                ? "3px solid var(--accent-teal)"
                : "3px solid transparent",
            color:
              activeTab === "users"
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
            whiteSpace: "nowrap",
          }}
        >
          <Users size={18} />
          Aprobar Jugadores
          {pendingUsers.length > 0 && (
            <span
              style={{
                background: "var(--color-error)",
                color: "white",
                fontSize: "0.7rem",
                fontWeight: 700,
                padding: "2px 6px",
                borderRadius: "9999px",
                marginLeft: "4px",
              }}
            >
              {pendingUsers.length}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab("create")}
          style={{
            background: "transparent",
            border: "none",
            borderBottom:
              activeTab === "create"
                ? "3px solid var(--accent-teal)"
                : "3px solid transparent",
            color:
              activeTab === "create"
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
            whiteSpace: "nowrap",
          }}
        >
          <Trophy size={18} />
          Nuevo Campeonato
        </button>

        <button
          onClick={() => setActiveTab("results")}
          style={{
            background: "transparent",
            border: "none",
            borderBottom:
              activeTab === "results"
                ? "3px solid var(--accent-teal)"
                : "3px solid transparent",
            color:
              activeTab === "results"
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
            whiteSpace: "nowrap",
          }}
        >
          <Save size={18} />
          Cargar Resultados Oficiales
        </button>
      </div>

      {/* Tab Contents: 1. User Approvals */}
      {activeTab === "users" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "32px" }}>
          {/* Pending Queue */}
          <div className="glass-panel-static" style={{ padding: "28px" }}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "20px",
                flexWrap: "wrap",
                gap: "12px",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "12px",
                  flexWrap: "wrap",
                }}
              >
                <h3
                  style={{
                    fontSize: "1.25rem",
                    fontWeight: 700,
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                  }}
                >
                  <Users size={20} className="gradient-text-teal" />
                  Pendientes de Aprobación
                </h3>
                <div
                  style={{ display: "flex", alignItems: "center", gap: "10px" }}
                >
                  <select
                    value={exportChampionshipId}
                    onChange={(e) => setExportChampionshipId(e.target.value)}
                    className="form-input"
                    style={{ minWidth: "220px", padding: "8px 12px" }}
                  >
                    <option value="">Todos los campeonatos</option>
                    {championships.map((c) => (
                      <option key={c._id} value={c._id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                  <button
                    onClick={handleDownloadParticipants}
                    className="btn-secondary"
                    style={{ padding: "8px 14px", fontSize: "0.85rem" }}
                  >
                    Descargar respaldo CSV
                  </button>
                </div>
              </div>
              <button
                onClick={fetchUsers}
                className="btn-secondary"
                style={{
                  padding: "6px 12px",
                  fontSize: "0.8rem",
                  borderRadius: "6px",
                  gap: "6px",
                }}
                disabled={usersLoading}
              >
                <RefreshCw
                  size={12}
                  className={usersLoading ? "spinner" : ""}
                />{" "}
                Refrescar
              </button>
            </div>

            {usersLoading ? (
              <div
                style={{
                  display: "flex",
                  justifyContent: "center",
                  padding: "40px",
                }}
              >
                <span className="spinner"></span>
              </div>
            ) : pendingUsers.length === 0 ? (
              <p
                style={{
                  color: "var(--text-secondary)",
                  textAlign: "center",
                  padding: "32px",
                  fontSize: "0.95rem",
                }}
              >
                No hay jugadores pendientes de aprobación en este momento. 🙌
              </p>
            ) : (
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "12px",
                }}
              >
                {pendingUsers.map((user) => (
                  <div
                    key={user._id}
                    className="glass-panel"
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      padding: "16px 20px",
                      background: "rgba(255,255,255,0.02)",
                    }}
                  >
                    <div>
                      <span
                        style={{
                          fontWeight: 700,
                          fontSize: "1.05rem",
                          color: "var(--text-primary)",
                        }}
                      >
                        @{user.username}
                      </span>
                      <div
                        style={{
                          fontSize: "0.8rem",
                          color: "var(--text-muted)",
                          marginTop: "4px",
                        }}
                      >
                        Registrado el{" "}
                        {new Date(user.createdAt).toLocaleDateString()}
                      </div>
                    </div>
                    <div style={{ display: "flex", gap: "10px" }}>
                      <button
                        onClick={() => handleApproveUser(user._id)}
                        className="btn-primary"
                        style={{
                          padding: "8px 16px",
                          borderRadius: "8px",
                          fontSize: "0.85rem",
                          gap: "4px",
                          background:
                            "linear-gradient(135deg, #10b981, #059669)",
                          boxShadow: "0 4px 10px rgba(16, 185, 129, 0.2)",
                        }}
                      >
                        <CheckCircle size={14} /> Aprobar
                      </button>
                      <button
                        onClick={() => handleRejectUser(user._id)}
                        className="btn-danger"
                        style={{
                          padding: "8px 16px",
                          borderRadius: "8px",
                          fontSize: "0.85rem",
                          gap: "4px",
                        }}
                      >
                        <XCircle size={14} /> Rechazar
                      </button>
                      <button
                        onClick={() => handlePromoteUser(user._id)}
                        className="btn-secondary"
                        style={{
                          padding: "8px 16px",
                          borderRadius: "8px",
                          fontSize: "0.85rem",
                          gap: "4px",
                        }}
                      >
                        <Settings size={14} /> Hacer Admin
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Processed Queue */}
          <div className="glass-panel-static" style={{ padding: "28px" }}>
            <h3
              style={{
                fontSize: "1.25rem",
                fontWeight: 700,
                marginBottom: "20px",
                color: "var(--text-secondary)",
              }}
            >
              Jugadores Procesados
            </h3>

            {processedUsers.length === 0 ? (
              <p
                style={{
                  color: "var(--text-muted)",
                  textAlign: "center",
                  padding: "24px",
                  fontSize: "0.9rem",
                }}
              >
                Ningún jugador procesado todavía.
              </p>
            ) : (
              <div style={{ overflowX: "auto" }}>
                <table className="leaderboard-table" style={{ marginTop: "0" }}>
                  <thead>
                    <tr>
                      <th style={{ paddingLeft: "8px" }}>Usuario</th>
                      <th>Fecha de Registro</th>
                      <th>Estado</th>
                      <th style={{ textAlign: "right", paddingRight: "8px" }}>
                        Acción
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {processedUsers.map((user) => (
                      <tr key={user._id}>
                        <td style={{ fontWeight: 600, paddingLeft: "8px" }}>
                          @{user.username}
                        </td>
                        <td style={{ color: "var(--text-secondary)" }}>
                          {new Date(user.createdAt).toLocaleDateString()}
                        </td>
                        <td>
                          <span className={`badge badge-${user.status}`}>
                            {user.status}
                          </span>
                        </td>
                        <td style={{ textAlign: "right", paddingRight: "8px" }}>
                          {user.status === "approved" ? (
                            <div
                              style={{
                                display: "flex",
                                gap: "8px",
                                justifyContent: "flex-end",
                              }}
                            >
                              <button
                                onClick={() => handleRejectUser(user._id)}
                                className="btn-danger"
                                style={{
                                  padding: "6px 12px",
                                  fontSize: "0.75rem",
                                  borderRadius: "6px",
                                }}
                              >
                                Rechazar
                              </button>
                              <button
                                onClick={() => handlePromoteUser(user._id)}
                                className="btn-secondary"
                                style={{
                                  padding: "6px 12px",
                                  fontSize: "0.75rem",
                                  borderRadius: "6px",
                                }}
                              >
                                Hacer Admin
                              </button>
                            </div>
                          ) : (
                            <div
                              style={{
                                display: "flex",
                                gap: "8px",
                                justifyContent: "flex-end",
                              }}
                            >
                              <button
                                onClick={() => handleApproveUser(user._id)}
                                className="btn-primary"
                                style={{
                                  padding: "6px 12px",
                                  fontSize: "0.75rem",
                                  borderRadius: "6px",
                                  background: "#10b981",
                                  boxShadow: "none",
                                }}
                              >
                                Aprobar
                              </button>
                              <button
                                onClick={() => handlePromoteUser(user._id)}
                                className="btn-secondary"
                                style={{
                                  padding: "6px 12px",
                                  fontSize: "0.75rem",
                                  borderRadius: "6px",
                                }}
                              >
                                Hacer Admin
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab Contents: 2. Create Championship & Upload Excel */}
      {activeTab === "create" && (
        <div className="grid-cols-2">
          {/* Main creation form */}
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
              <Trophy className="gradient-text-teal" size={24} />
              Configurar Campeonato
            </h3>

            <form
              onSubmit={handleCreateChampionship}
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
                  Nombre del Campeonato
                </label>
                <input
                  type="text"
                  value={campName}
                  onChange={(e) => setCampName(e.target.value)}
                  placeholder="ej: Mundial FIFA 2026"
                  className="form-input"
                  disabled={createLoading}
                />
              </div>

              <div className="grid-cols-2" style={{ gap: "16px", margin: 0 }}>
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
                    Fecha Inicio
                  </label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="form-input"
                    disabled={createLoading}
                  />
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
                    Fecha Fin
                  </label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="form-input"
                    disabled={createLoading}
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
                  Subir Fixture de Partidos (Excel)
                </label>
                <div
                  style={{
                    border: "2px dashed var(--border-color)",
                    borderRadius: "10px",
                    padding: "24px",
                    textAlign: "center",
                    background: "rgba(10, 15, 30, 0.4)",
                    cursor: "pointer",
                    position: "relative",
                  }}
                >
                  <Upload
                    size={32}
                    style={{ color: "var(--text-muted)", marginBottom: "12px" }}
                  />
                  <p
                    style={{
                      fontSize: "0.88rem",
                      fontWeight: 500,
                      marginBottom: "4px",
                    }}
                  >
                    {excelFile
                      ? excelFile.name
                      : "Selecciona o arrastra el archivo de Excel"}
                  </p>
                  <p
                    style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}
                  >
                    Formatos soportados: .xlsx, .xls
                  </p>
                  <input
                    id="excelFileInput"
                    type="file"
                    accept=".xlsx, .xls"
                    onChange={(e) => setExcelFile(e.target.files[0])}
                    style={{
                      position: "absolute",
                      left: 0,
                      top: 0,
                      width: 100 + "%",
                      height: 100 + "%",
                      opacity: 0,
                      cursor: "pointer",
                    }}
                    disabled={createLoading}
                  />
                </div>
              </div>

              <button
                type="submit"
                className="btn-primary"
                style={{
                  width: "100%",
                  justifyContent: "center",
                  marginTop: "8px",
                }}
                disabled={createLoading}
              >
                {createLoading ? (
                  <span
                    className="spinner"
                    style={{
                      width: "18px",
                      height: "18px",
                      borderWidth: "2px",
                    }}
                  ></span>
                ) : (
                  <>
                    <Upload size={18} />
                    Crear y Cargar Fixture
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Form instructions and excel guide */}
          <div
            className="glass-panel-static"
            style={{
              padding: "32px",
              display: "flex",
              flexDirection: "column",
              gap: "20px",
            }}
          >
            <h3 style={{ fontSize: "1.25rem", fontWeight: 700 }}>
              Instrucciones del Archivo Excel
            </h3>

            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "16px",
                fontSize: "0.9rem",
                color: "var(--text-secondary)",
                lineHeight: "1.5",
              }}
            >
              <p>
                El sistema cuenta con un parser avanzado que detecta y carga el
                fixture del Excel automáticamente.
              </p>

              <div
                style={{
                  background: "rgba(255, 255, 255, 0.02)",
                  border: "1px solid var(--border-color)",
                  borderRadius: "8px",
                  padding: "16px",
                }}
              >
                <span
                  style={{
                    fontWeight: 600,
                    color: "var(--accent-teal)",
                    display: "block",
                    marginBottom: "8px",
                  }}
                >
                  Estructura Soportada (Mundial 2026):
                </span>
                <ul
                  style={{
                    paddingLeft: "20px",
                    display: "flex",
                    flexDirection: "column",
                    gap: "6px",
                  }}
                >
                  <li>Formato side-by-side de grupos de partidos.</li>
                  <li>
                    Fila de cabecera con columnas:{" "}
                    <code style={{ color: "var(--text-primary)" }}>
                      Fecha, Hora, Jor.
                    </code>
                  </li>
                  <li>Columnas con el nombre de los equipos.</li>
                  <li>
                    Soporte dinámico para leer fechas como cadenas (
                    <code style={{ color: "var(--text-primary)" }}>
                      DD/MM/YY
                    </code>
                    ) u objetos nativos de Excel.
                  </li>
                </ul>
              </div>

              <div
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: "10px",
                  background: "rgba(245, 158, 11, 0.05)",
                  border: "1px solid rgba(245, 158, 11, 0.2)",
                  padding: "16px",
                  borderRadius: "8px",
                }}
              >
                <AlertTriangle
                  size={18}
                  style={{
                    color: "var(--accent-gold)",
                    flexShrink: 0,
                    marginTop: "2px",
                  }}
                />
                <p style={{ fontSize: "0.82rem", color: "#fcd34d" }}>
                  <strong>IMPORTANTE:</strong> Al activar este nuevo campeonato,
                  los campeonatos anteriores serán desactivados para el registro
                  y carga por defecto de los jugadores.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab Contents: 3. Load official match scores */}
      {activeTab === "results" && (
        <div className="glass-panel-static" style={{ padding: "32px" }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "24px",
              flexWrap: "wrap",
              gap: "16px",
            }}
          >
            <div>
              <h3
                style={{
                  fontSize: "1.4rem",
                  fontWeight: 800,
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                }}
              >
                <Save className="gradient-text-teal" size={24} />
                Cargar Resultados del Fixture
              </h3>
              <p
                style={{
                  color: "var(--text-secondary)",
                  fontSize: "0.85rem",
                  marginTop: "4px",
                }}
              >
                Ingresa los goles reales de los partidos para recalcular las
                tablas de posiciones.
              </p>
            </div>

            <div className="flex-row">
              <label
                style={{
                  fontSize: "0.88rem",
                  fontWeight: 600,
                  color: "var(--text-secondary)",
                }}
              >
                Campeonato:
              </label>
              <select
                value={selectedCampId}
                onChange={(e) => setSelectedCampId(e.target.value)}
                className="form-input"
                style={{ width: "220px", padding: "8px 12px" }}
              >
                <option value="">Seleccione...</option>
                {championships.map((c) => (
                  <option key={c._id} value={c._id}>
                    {c.name} {c.isActive ? "(Activo)" : ""}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {selectedCampId && championships.length > 0 && (
            <div
              style={{
                display: "flex",
                background: "rgba(255, 255, 255, 0.02)",
                border: "1px solid var(--border-color)",
                padding: "16px 20px",
                borderRadius: "12px",
                marginBottom: "24px",
                justifyContent: "space-between",
                alignItems: "center",
                flexWrap: "wrap",
                gap: "16px",
              }}
            >
              <div>
                <span
                  style={{ fontSize: "0.9rem", color: "var(--text-secondary)" }}
                >
                  Configuraciones del Campeonato:
                </span>
                <span style={{ fontWeight: 700, marginLeft: "6px" }}>
                  {championships.find((c) => c._id === selectedCampId)?.name}
                </span>
              </div>
              <div style={{ display: "flex", gap: "12px" }}>
                <button
                  onClick={() => handleCloseRegistration(selectedCampId)}
                  className="btn-secondary"
                  style={{ padding: "8px 14px", fontSize: "0.82rem" }}
                  disabled={
                    championships.find((c) => c._id === selectedCampId)
                      ?.isClosedForRegistration
                  }
                >
                  {championships.find((c) => c._id === selectedCampId)
                    ?.isClosedForRegistration
                    ? "Inscripciones Cerradas"
                    : "Cerrar Inscripciones"}
                </button>
                <button
                  onClick={() => handleFinishChampionship(selectedCampId)}
                  className="btn-danger"
                  style={{ padding: "8px 14px", fontSize: "0.82rem" }}
                  disabled={
                    championships.find((c) => c._id === selectedCampId)
                      ?.isFinished
                  }
                >
                  {championships.find((c) => c._id === selectedCampId)
                    ?.isFinished
                    ? "Campeonato Finalizado"
                    : "Finalizar Campeonato"}
                </button>
              </div>
            </div>
          )}

          {matchesLoading ? (
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
              Selecciona un campeonato para visualizar su fixture.
            </p>
          ) : (
            <div>
              {/* Fixture inputs grid */}
              <div className="matches-grid" style={{ marginBottom: "32px" }}>
                {matches.map((match) => (
                  <div
                    key={match._id}
                    className="glass-panel"
                    style={{
                      padding: "20px",
                      display: "flex",
                      flexDirection: "column",
                      justifyContent: "space-between",
                      gap: "12px",
                      background: "rgba(5, 7, 15, 0.4)",
                    }}
                  >
                    {/* Header info */}
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        fontSize: "0.78rem",
                        color: "var(--text-muted)",
                        borderBottom: "1px solid rgba(255,255,255,0.03)",
                        paddingBottom: "6px",
                      }}
                    >
                      <span>{match.phase}</span>
                      <span>
                        {match.date} - {match.time}
                      </span>
                    </div>

                    {/* Team versus with inputs */}
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        gap: "8px",
                      }}
                    >
                      <div
                        style={{
                          flex: 1,
                          textAlign: "right",
                          fontWeight: 600,
                          fontSize: "0.92rem",
                        }}
                      >
                        {match.localTeam}
                      </div>

                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "6px",
                        }}
                      >
                        <input
                          type="number"
                          min="0"
                          value={scores[match._id]?.scoreLocal ?? ""}
                          onChange={(e) =>
                            handleScoreChange(
                              match._id,
                              "scoreLocal",
                              e.target.value,
                            )
                          }
                          style={{
                            width: "44px",
                            height: "38px",
                            textAlign: "center",
                            fontSize: "1rem",
                            fontWeight: 700,
                            borderRadius: "8px",
                            background: "rgba(5, 7, 15, 0.8)",
                            border: "1px solid var(--border-color)",
                            color: "var(--text-primary)",
                          }}
                        />
                        <span
                          style={{
                            color: "var(--text-muted)",
                            fontWeight: 600,
                          }}
                        >
                          :
                        </span>
                        <input
                          type="number"
                          min="0"
                          value={scores[match._id]?.scoreVisitor ?? ""}
                          onChange={(e) =>
                            handleScoreChange(
                              match._id,
                              "scoreVisitor",
                              e.target.value,
                            )
                          }
                          style={{
                            width: "44px",
                            height: "38px",
                            textAlign: "center",
                            fontSize: "1rem",
                            fontWeight: 700,
                            borderRadius: "8px",
                            background: "rgba(5, 7, 15, 0.8)",
                            border: "1px solid var(--border-color)",
                            color: "var(--text-primary)",
                          }}
                        />
                      </div>

                      <div
                        style={{
                          flex: 1,
                          textAlign: "left",
                          fontWeight: 600,
                          fontSize: "0.92rem",
                        }}
                      >
                        {match.visitorTeam}
                      </div>
                    </div>

                    {/* Outcome preview */}
                    {match.realResult && (
                      <div
                        style={{
                          textAlign: "center",
                          fontSize: "0.75rem",
                          color: "var(--color-success)",
                          fontWeight: 600,
                          background: "rgba(16, 185, 129, 0.08)",
                          padding: "4px",
                          borderRadius: "6px",
                          border: "1px solid rgba(16, 185, 129, 0.2)",
                        }}
                      >
                        Registrado:{" "}
                        {match.realResult === "L"
                          ? "Gana Local"
                          : match.realResult === "E"
                            ? "Empate"
                            : "Gana Visitante"}
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Action Floating Save Button */}
              <div
                style={{
                  display: "flex",
                  justifyContent: "flex-end",
                  borderTop: "1px solid var(--border-color)",
                  paddingTop: "24px",
                }}
              >
                <button
                  onClick={handleSaveResults}
                  className="btn-primary"
                  style={{ gap: "8px", padding: "14px 28px" }}
                  disabled={resultsLoading}
                >
                  {resultsLoading ? (
                    <span
                      className="spinner"
                      style={{
                        width: "18px",
                        height: "18px",
                        borderWidth: "2px",
                      }}
                    ></span>
                  ) : (
                    <>
                      <Save size={18} />
                      Guardar Resultados y Computar Puntos
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
