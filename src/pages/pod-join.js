import React, { useState, useEffect } from "react";
import Head from "next/head";
import { useRouter } from "next/router";
import { CheckCircle, Loader2, Users, Calendar } from "lucide-react";

const COLOR_FALLBACK = [
  "#3b82f6", "#10b981", "#f59e0b", "#ef4444",
  "#8b5cf6", "#ec4899", "#06b6d4", "#f97316",
];

export default function PodJoin() {
  const router = useRouter();
  const { fecha, proyecto_id } = router.query;

  const [personal, setPersonal] = useState([]);
  const [proyecto, setProyecto] = useState(null);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(null);
  const [joined, setJoined] = useState(null); // { nombre_completo, especialidad }
  const [error, setError] = useState(null);
  const [search, setSearch] = useState("");

  // Cargar personal del proyecto
  useEffect(() => {
    if (!proyecto_id || !fecha) return;
    const load = async () => {
      setLoading(true);
      try {
        const [rPersonal, rProyecto] = await Promise.all([
          fetch(`/api/personal`),
          fetch(`/api/proyectos`),
        ]);
        const jPersonal = await rPersonal.json();
        const jProyecto = await rProyecto.json();

        // Filtrar supervisores del proyecto
        const supervisores = (jPersonal.data || []).filter(p =>
          (p.rol === "Supervisor" || p.rol === "Jefe de Area") &&
          p.proyecto_actual_id === proyecto_id
        );
        setPersonal(supervisores);

        const proy = (jProyecto.data || []).find(p => p.id === proyecto_id);
        setProyecto(proy);
      } catch (e) {
        setError("Error al cargar datos. Intenta de nuevo.");
      }
      setLoading(false);
    };
    load();
  }, [proyecto_id, fecha]);

  const handleJoin = async (persona) => {
    setJoining(persona.id);
    try {
      const r = await fetch("/api/pod/sesion", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fecha, proyecto_id, personal_id: persona.id }),
      });
      const json = await r.json();
      if (json.success) {
        setJoined({
          nombre_completo: persona.nombre_completo,
          rol: persona.rol,
          especialidad: persona.especialidades?.nombre_oficial || null,
          color: persona.especialidades?.color || "#10b981",
        });
      } else {
        setError(json.error || "Error al unirse a la sesión.");
      }
    } catch (e) {
      setError("Error de conexión. Intenta de nuevo.");
    }
    setJoining(null);
  };

  // Formatear fecha
  const formatFecha = (str) => {
    if (!str) return "";
    const [y, m, d] = str.split("-");
    const dias = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
    const meses = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
      "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
    const date = new Date(Number(y), Number(m) - 1, Number(d));
    return `${dias[date.getDay()]} ${d} de ${meses[Number(m) - 1]} ${y}`;
  };

  const filtrados = personal.filter(p =>
    p.nombre_completo.toLowerCase().includes(search.toLowerCase())
  );

  // ────── Pantalla de éxito ──────
  if (joined) {
    return (
      <>
        <Head>
          <title>¡Unido al POD! — LukeEquipos</title>
          <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
          <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800&display=swap" rel="stylesheet" />
        </Head>
        <div style={{
          minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center",
          background: "radial-gradient(circle at center, #0d1f0f, #061009)",
          fontFamily: "'Inter', sans-serif", color: "white", padding: "24px",
          textAlign: "center",
        }}>
          <div>
            {/* Ícono animado */}
            <div style={{
              width: "80px", height: "80px", borderRadius: "50%",
              background: "rgba(16,185,129,0.15)", border: "2px solid #10b981",
              display: "flex", alignItems: "center", justifyContent: "center",
              margin: "0 auto 24px", boxShadow: "0 0 40px rgba(16,185,129,0.3)",
            }}>
              <CheckCircle size={40} color="#10b981" />
            </div>

            <h1 style={{ fontSize: "28px", fontWeight: 800, marginBottom: "8px" }}>
              ¡Estás en la POD!
            </h1>
            <div style={{
              display: "inline-block",
              background: `${joined.color}22`,
              border: `1px solid ${joined.color}66`,
              borderRadius: "20px", padding: "6px 18px", marginBottom: "16px",
            }}>
              <span style={{ color: joined.color, fontSize: "14px", fontWeight: 700 }}>
                {joined.nombre_completo}
              </span>
              {joined.especialidad && (
                <span style={{ color: "#94a3b8", fontSize: "13px", marginLeft: "8px" }}>
                  · {joined.especialidad}
                </span>
              )}
            </div>

            <p style={{ color: "#94a3b8", fontSize: "14px", marginBottom: "8px" }}>
              El Jefe de Área puede verte en su pantalla.
            </p>
            <p style={{ color: "#64748b", fontSize: "13px" }}>
              {proyecto?.codigo_cc && `${proyecto.codigo_cc} · `}{formatFecha(fecha)}
            </p>

            <div style={{
              marginTop: "32px", background: "rgba(16,185,129,0.08)",
              border: "1px solid rgba(16,185,129,0.2)", borderRadius: "12px",
              padding: "16px 20px",
            }}>
              <p style={{ color: "#10b981", fontSize: "13px", fontWeight: 600, margin: 0 }}>
                Puedes cerrar esta ventana.<br />
                El Jefe de Área te asignará equipos en la sala.
              </p>
            </div>
          </div>
        </div>
      </>
    );
  }

  // ────── Pantalla de unión ──────
  return (
    <>
      <Head>
        <title>Unirse al POD — LukeEquipos</title>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800&display=swap" rel="stylesheet" />
      </Head>
      <div style={{
        minHeight: "100vh",
        background: "radial-gradient(circle at top, #0f1f2e, #060d14)",
        fontFamily: "'Inter', sans-serif", color: "white",
        display: "flex", flexDirection: "column",
      }}>
        {/* Header */}
        <div style={{
          background: "rgba(15,31,46,0.9)", backdropFilter: "blur(10px)",
          borderBottom: "1px solid rgba(255,255,255,0.06)",
          padding: "16px 20px",
          display: "flex", alignItems: "center", gap: "12px",
        }}>
          <img
            src="https://www.eimontajes.com/wp-content/uploads/2025/09/logo-eimisa.svg"
            alt="EIMISA"
            style={{ height: "28px", filter: "brightness(0) invert(1)" }}
          />
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: "11px", color: "#10b981", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.5px" }}>
              Sala POD
            </div>
            <div style={{ fontSize: "13px", fontWeight: 700 }}>
              {proyecto ? `${proyecto.codigo_cc} — ${proyecto.nombre_proyecto}` : "Cargando..."}
            </div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "6px", color: "#64748b", fontSize: "12px" }}>
              <Calendar size={12} />
              <span>{formatFecha(fecha)}</span>
            </div>
          </div>
        </div>

        {/* Body */}
        <div style={{ flex: 1, padding: "24px 20px", maxWidth: "480px", width: "100%", margin: "0 auto" }}>
          {loading ? (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "200px", gap: "12px", color: "#64748b" }}>
              <Loader2 size={24} style={{ animation: "spin 1s linear infinite" }} />
              <span>Cargando sesión...</span>
            </div>
          ) : error ? (
            <div style={{
              background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)",
              borderRadius: "10px", padding: "16px", color: "#ef4444", textAlign: "center",
            }}>
              ⚠️ {error}
            </div>
          ) : (
            <>
              <div style={{ marginBottom: "20px", textAlign: "center" }}>
                <div style={{
                  width: "48px", height: "48px", borderRadius: "50%",
                  background: "rgba(16,185,129,0.12)", border: "1px solid rgba(16,185,129,0.3)",
                  display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 12px",
                }}>
                  <Users size={22} color="#10b981" />
                </div>
                <h2 style={{ fontSize: "20px", fontWeight: 800, margin: "0 0 6px" }}>
                  ¿Quién eres?
                </h2>
                <p style={{ color: "#94a3b8", fontSize: "13px", margin: 0 }}>
                  Toca tu nombre para unirte a la sesión
                </p>
              </div>

              {/* Buscador */}
              {personal.length > 4 && (
                <input
                  type="text"
                  placeholder="Buscar..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  style={{
                    width: "100%", background: "rgba(255,255,255,0.05)",
                    border: "1px solid rgba(255,255,255,0.1)", borderRadius: "10px",
                    color: "white", padding: "12px 16px", fontSize: "14px",
                    outline: "none", boxSizing: "border-box", marginBottom: "16px",
                  }}
                />
              )}

              {/* Lista de supervisores */}
              <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                {filtrados.length === 0 ? (
                  <div style={{ color: "#64748b", textAlign: "center", padding: "32px", fontSize: "14px" }}>
                    No hay supervisores asignados a este proyecto.
                  </div>
                ) : filtrados.map(persona => {
                  const color = persona.especialidades?.color || COLOR_FALLBACK[0];
                  const isJoining = joining === persona.id;
                  return (
                    <button
                      key={persona.id}
                      onClick={() => handleJoin(persona)}
                      disabled={isJoining}
                      style={{
                        display: "flex", alignItems: "center", gap: "14px",
                        background: `${color}12`, border: `1px solid ${color}40`,
                        borderRadius: "14px", padding: "16px 18px",
                        cursor: isJoining ? "not-allowed" : "pointer",
                        color: "white", textAlign: "left", width: "100%",
                        transition: "all 0.15s", opacity: isJoining ? 0.7 : 1,
                      }}
                      onTouchStart={e => { e.currentTarget.style.transform = "scale(0.98)"; e.currentTarget.style.background = `${color}22`; }}
                      onTouchEnd={e => { e.currentTarget.style.transform = "scale(1)"; e.currentTarget.style.background = `${color}12`; }}
                    >
                      {/* Avatar */}
                      <div style={{
                        width: "44px", height: "44px", borderRadius: "50%",
                        background: `${color}30`, border: `2px solid ${color}60`,
                        display: "flex", alignItems: "center", justifyContent: "center",
                        fontSize: "16px", fontWeight: 800, color, flexShrink: 0,
                      }}>
                        {persona.nombre_completo.split(" ").map(n => n[0]).slice(0, 2).join("")}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: "15px", fontWeight: 700, lineHeight: 1.3 }}>
                          {persona.nombre_completo}
                        </div>
                        <div style={{ fontSize: "12px", color: "#94a3b8", marginTop: "2px" }}>
                          {persona.rol}
                          {persona.especialidades && (
                            <span style={{ color, marginLeft: "6px" }}>· {persona.especialidades.nombre_oficial}</span>
                          )}
                        </div>
                      </div>
                      {isJoining ? (
                        <Loader2 size={18} color={color} style={{ animation: "spin 1s linear infinite", flexShrink: 0 }} />
                      ) : (
                        <div style={{
                          fontSize: "11px", fontWeight: 700, color,
                          background: `${color}20`, borderRadius: "8px", padding: "4px 10px", flexShrink: 0,
                        }}>
                          UNIRSE
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </>
          )}
        </div>

        {/* Spinner animation */}
        <style>{`
          @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        `}</style>
      </div>
    </>
  );
}
