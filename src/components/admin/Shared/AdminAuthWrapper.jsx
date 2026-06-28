import React, { useState, useEffect } from "react";
import Head from "next/head";
import { Lock, Loader2, Key, User, ChevronRight, LogOut } from "lucide-react";

const STORAGE_KEY_USER = "luke_user";

export default function AdminAuthWrapper({ children }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [checkingAuth, setCheckingAuth] = useState(true);

  // Paso 2: selección de identidad
  const [step, setStep] = useState(1); // 1 = contraseña, 2 = identidad
  const [personalList, setPersonalList] = useState([]);
  const [loadingPersonal, setLoadingPersonal] = useState(false);
  const [searchPersonal, setSearchPersonal] = useState("");
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    const authStatus = localStorage.getItem("luke_auth");
    if (authStatus === "authorized") {
      setIsAuthenticated(true);
      // Si ya hay usuario guardado, cargar
      try {
        const raw = localStorage.getItem(STORAGE_KEY_USER);
        if (raw) setCurrentUser(JSON.parse(raw));
      } catch {}
    }
    setCheckingAuth(false);
  }, []);

  const handleLogin = (e) => {
    e.preventDefault();
    if (password === "LukeAPP") {
      localStorage.setItem("luke_auth", "authorized");
      setIsAuthenticated(true);
      setLoginError("");
      // Si no hay usuario guardado, ir al paso 2
      try {
        const raw = localStorage.getItem(STORAGE_KEY_USER);
        if (!raw) {
          setStep(2);
          loadPersonal();
        }
      } catch {
        setStep(2);
        loadPersonal();
      }
    } else {
      setLoginError("Contraseña incorrecta. Intente nuevamente.");
    }
  };

  const loadPersonal = async () => {
    setLoadingPersonal(true);
    try {
      const r = await fetch("/api/personal");
      const json = await r.json();
      if (json.success) setPersonalList(json.data || []);
    } catch {}
    setLoadingPersonal(false);
  };

  const handleSelectUser = (persona) => {
    const user = {
      id: persona.id,
      nombre_completo: persona.nombre_completo,
      rol: persona.rol,
      proyecto_actual_id: persona.proyecto_actual_id || null,
      proyecto: persona.proyectos || null,
    };
    setCurrentUser(user);
    localStorage.setItem(STORAGE_KEY_USER, JSON.stringify(user));
    setStep(1); // resetear para próxima vez
  };

  const handleSkipIdentity = () => {
    setStep(1);
  };

  const handleChangeUser = () => {
    localStorage.removeItem(STORAGE_KEY_USER);
    setCurrentUser(null);
    setStep(2);
    loadPersonal();
  };

  // ──── Estilos compartidos ────
  const cardStyle = {
    position: "relative", zIndex: 10,
    maxWidth: "420px", width: "100%",
    background: "rgba(18, 30, 54, 0.90)",
    backdropFilter: "blur(18px)",
    border: "1px solid rgba(255, 255, 255, 0.08)",
    borderRadius: "20px",
    padding: "40px 32px",
    boxShadow: "0 24px 50px rgba(0, 0, 0, 0.6)",
    textAlign: "center",
  };

  const inputSt = {
    width: "100%", background: "#090f1d",
    border: "1px solid #1c2e52", borderRadius: "8px",
    color: "white", padding: "12px 14px 12px 40px",
    fontSize: "14px", outline: "none",
    boxSizing: "border-box", transition: "all 0.2s",
  };

  if (checkingAuth) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#0a1120", color: "#64748b", fontFamily: "sans-serif" }}>
        <Loader2 className="animate-spin" size={32} style={{ color: "#ff303e" }} />
      </div>
    );
  }

  // ──── Paso 2: Selector de identidad ────
  if (isAuthenticated && step === 2) {
    const filtrados = personalList.filter(p =>
      p.nombre_completo.toLowerCase().includes(searchPersonal.toLowerCase()) ||
      (p.proyectos?.codigo_cc || "").toLowerCase().includes(searchPersonal.toLowerCase())
    );

    return (
      <>
        <Head>
          <title>¿Quién eres? — LukeEquipos</title>
          <link rel="preconnect" href="https://fonts.googleapis.com" />
          <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
        </Head>
        <div style={{
          minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center",
          background: "radial-gradient(circle at center, #121e36, #090f1e)",
          fontFamily: "'Inter', sans-serif", color: "white", padding: "24px",
        }}>
          <div style={{ position: "absolute", width: "350px", height: "350px", background: "rgba(16, 185, 129, 0.1)", borderRadius: "50%", filter: "blur(90px)", pointerEvents: "none", zIndex: 0 }} />

          <div style={{ ...cardStyle, maxWidth: "500px" }}>
            {/* Logo */}
            <div style={{ marginBottom: "20px" }}>
              <img src="https://www.eimontajes.com/wp-content/uploads/2025/09/logo-eimisa.svg" alt="EIMISA" style={{ width: "140px", height: "auto", margin: "0 auto", display: "block" }} />
              <div style={{ color: "#10b981", fontSize: "11px", fontWeight: 800, letterSpacing: "1.5px", textTransform: "uppercase", marginTop: "10px", fontFamily: "monospace" }}>
                ¿Quién eres hoy?
              </div>
            </div>

            <h2 style={{ fontSize: "18px", fontWeight: 800, marginBottom: "6px", color: "white" }}>Selecciona tu identidad</h2>
            <p style={{ fontSize: "13px", color: "#94a3b8", marginBottom: "20px", lineHeight: 1.5 }}>
              El sistema filtrará el POD según tu proyecto asignado.
            </p>

            {/* Buscador */}
            <div style={{ position: "relative", marginBottom: "16px" }}>
              <User size={16} style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", color: "#64748b" }} />
              <input
                type="text"
                placeholder="Buscar por nombre o proyecto..."
                value={searchPersonal}
                onChange={e => setSearchPersonal(e.target.value)}
                style={{ ...inputSt, padding: "11px 14px 11px 38px" }}
                onFocus={e => { e.target.style.borderColor = "#10b981"; e.target.style.boxShadow = "0 0 0 2px rgba(16,185,129,0.2)"; }}
                onBlur={e => { e.target.style.borderColor = "#1c2e52"; e.target.style.boxShadow = "none"; }}
              />
            </div>

            {/* Lista de personal */}
            <div style={{ maxHeight: "280px", overflowY: "auto", display: "flex", flexDirection: "column", gap: "8px", marginBottom: "16px" }}>
              {loadingPersonal ? (
                <div style={{ padding: "20px", color: "#64748b", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px" }}>
                  <Loader2 size={16} style={{ animation: "spin 1s linear infinite" }} /> Cargando personal...
                </div>
              ) : filtrados.length === 0 ? (
                <div style={{ padding: "20px", color: "#64748b", fontSize: "13px" }}>Sin resultados</div>
              ) : filtrados.map(persona => (
                <button
                  key={persona.id}
                  onClick={() => handleSelectUser(persona)}
                  style={{
                    display: "flex", alignItems: "center", justifyContent: "space-between",
                    background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)",
                    borderRadius: "10px", padding: "12px 14px", cursor: "pointer", color: "white",
                    textAlign: "left", transition: "all 0.15s", width: "100%",
                  }}
                  onMouseEnter={e => { e.currentTarget.style.background = "rgba(16,185,129,0.12)"; e.currentTarget.style.borderColor = "rgba(16,185,129,0.4)"; }}
                  onMouseLeave={e => { e.currentTarget.style.background = "rgba(255,255,255,0.04)"; e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)"; }}
                >
                  <div>
                    <div style={{ fontSize: "14px", fontWeight: 700 }}>{persona.nombre_completo}</div>
                    <div style={{ fontSize: "12px", color: "#94a3b8", marginTop: "2px" }}>
                      {persona.rol}
                      {persona.proyectos ? ` · ${persona.proyectos.codigo_cc} — ${persona.proyectos.nombre_proyecto}` : " · Sin proyecto asignado"}
                    </div>
                  </div>
                  <ChevronRight size={16} style={{ color: "#64748b", flexShrink: 0 }} />
                </button>
              ))}
            </div>

            {/* Omitir */}
            <button
              onClick={handleSkipIdentity}
              style={{
                width: "100%", background: "transparent", border: "1px solid #1c2e52",
                color: "#64748b", borderRadius: "8px", padding: "10px",
                fontSize: "13px", cursor: "pointer", transition: "all 0.2s",
              }}
              onMouseEnter={e => e.currentTarget.style.color = "#94a3b8"}
              onMouseLeave={e => e.currentTarget.style.color = "#64748b"}
            >
              Continuar sin seleccionar (ver todos los proyectos)
            </button>
          </div>
        </div>
      </>
    );
  }

  // ──── Paso 1: Login ────
  if (!isAuthenticated) {
    return (
      <>
        <Head>
          <title>Iniciar Sesión — LukeEquipos</title>
          <link rel="preconnect" href="https://fonts.googleapis.com" />
          <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
        </Head>
        <div style={{
          minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center",
          background: "radial-gradient(circle at center, #121e36, #090f1e)",
          fontFamily: "'Inter', sans-serif", color: "white", padding: "24px",
        }}>
          <div style={{ position: "absolute", width: "350px", height: "350px", background: "rgba(255, 48, 62, 0.12)", borderRadius: "50%", filter: "blur(90px)", pointerEvents: "none", zIndex: 0 }} />

          <div style={cardStyle}>
            <div style={{ marginBottom: "28px" }}>
              <img src="https://www.eimontajes.com/wp-content/uploads/2025/09/logo-eimisa.svg" alt="EIMISA Logo" style={{ width: "170px", height: "auto", margin: "0 auto", display: "block" }} />
              <div style={{ color: "#ff303e", fontSize: "11px", fontWeight: 800, letterSpacing: "1.5px", textTransform: "uppercase", marginTop: "14px", fontFamily: "monospace" }}>
                Gestión de Flota & Faenas
              </div>
            </div>

            <h2 style={{ fontSize: "20px", fontWeight: 800, marginBottom: "8px", color: "white" }}>Acceso Restringido</h2>
            <p style={{ fontSize: "13px", color: "#94a3b8", marginBottom: "26px", lineHeight: 1.5 }}>
              Ingrese la contraseña de seguridad master para acceder a las funciones de administración.
            </p>

            <form onSubmit={handleLogin} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              <div style={{ position: "relative", textAlign: "left" }}>
                <input
                  type="password"
                  placeholder="Contraseña master"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  style={inputSt}
                  onFocus={e => { e.target.style.borderColor = "#ff303e"; e.target.style.boxShadow = "0 0 0 2px rgba(255, 48, 62, 0.2)"; }}
                  onBlur={e => { e.target.style.borderColor = "#1c2e52"; e.target.style.boxShadow = "none"; }}
                />
                <div style={{ position: "absolute", left: "14px", top: "50%", transform: "translateY(-50%)", color: "#64748b", display: "flex", alignItems: "center" }}>
                  <Lock size={16} />
                </div>
              </div>

              {loginError && (
                <div style={{ background: "rgba(239, 68, 68, 0.1)", border: "1px solid rgba(239, 68, 68, 0.2)", borderRadius: "6px", padding: "8px 12px", color: "#ef4444", fontSize: "12px", fontWeight: 600, textAlign: "left" }}>
                  ⚠️ {loginError}
                </div>
              )}

              <button
                type="submit"
                style={{
                  background: "linear-gradient(135deg, #ff303e 0%, #c21a25 100%)", border: "none",
                  color: "white", borderRadius: "8px", padding: "12px 20px",
                  fontSize: "14px", fontWeight: 700, cursor: "pointer",
                  display: "flex", alignItems: "center", justifyContent: "center", gap: "8px",
                  boxShadow: "0 4px 14px rgba(255, 48, 62, 0.3)", transition: "transform 0.1s, box-shadow 0.2s",
                }}
                onMouseEnter={e => e.currentTarget.style.boxShadow = "0 6px 18px rgba(255, 48, 62, 0.45)"}
                onMouseLeave={e => e.currentTarget.style.boxShadow = "0 4px 14px rgba(255, 48, 62, 0.3)"}
              >
                <Key size={14} />
                <span>Ingresar</span>
              </button>
            </form>
          </div>
        </div>
      </>
    );
  }

  // ──── Autenticado: pasar currentUser como prop a los children ────
  return (
    <>
      {React.Children.map(children, child =>
        React.isValidElement(child)
          ? React.cloneElement(child, { currentUser, onChangeUser: handleChangeUser })
          : child
      )}
    </>
  );
}
