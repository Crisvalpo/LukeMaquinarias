import React, { useState, useEffect } from "react";
import Head from "next/head";
import { Lock, Loader2, Key } from "lucide-react";

export default function AdminAuthWrapper({ children }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [checkingAuth, setCheckingAuth] = useState(true);

  useEffect(() => {
    const authStatus = localStorage.getItem("luke_auth");
    if (authStatus === "authorized") {
      setIsAuthenticated(true);
    }
    setCheckingAuth(false);
  }, []);

  const handleLogin = (e) => {
    e.preventDefault();
    if (password === "LukeAPP") {
      localStorage.setItem("luke_auth", "authorized");
      setIsAuthenticated(true);
      setLoginError("");
    } else {
      setLoginError("Contraseña incorrecta. Intente nuevamente.");
    }
  };

  if (checkingAuth) {
    return (
      <div style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#0a1120",
        color: "#64748b",
        fontFamily: "sans-serif"
      }}>
        <Loader2 className="animate-spin" size={32} style={{ color: "#ff303e" }} />
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <>
        <Head>
          <title>Iniciar Sesión — LukeEquipos</title>
          <link rel="preconnect" href="https://fonts.googleapis.com" />
          <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
        </Head>
        <div style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "radial-gradient(circle at center, #121e36, #090f1e)",
          fontFamily: "'Inter', sans-serif",
          color: "white",
          padding: "24px",
        }}>
          {/* Fondo decorativo blur */}
          <div style={{
            position: "absolute",
            width: "350px",
            height: "350px",
            background: "rgba(255, 48, 62, 0.12)",
            borderRadius: "50%",
            filter: "blur(90px)",
            pointerEvents: "none",
            zIndex: 0,
          }}></div>

          <div style={{
            position: "relative",
            zIndex: 10,
            maxWidth: "400px",
            width: "100%",
            background: "rgba(18, 30, 54, 0.85)",
            backdropFilter: "blur(18px)",
            border: "1px solid rgba(255, 255, 255, 0.08)",
            borderRadius: "20px",
            padding: "40px 32px",
            boxShadow: "0 24px 50px rgba(0, 0, 0, 0.6)",
            textAlign: "center",
          }}>
            <div style={{ marginBottom: "28px" }}>
              <img
                src="https://www.eimontajes.com/wp-content/uploads/2025/09/logo-eimisa.svg"
                alt="EIMISA Logo"
                style={{ width: "170px", height: "auto", margin: "0 auto", display: "block" }}
              />
              <div style={{ 
                color: "#ff303e", 
                fontSize: "11px", 
                fontWeight: 800, 
                letterSpacing: "1.5px", 
                textTransform: "uppercase", 
                marginTop: "14px",
                fontFamily: "monospace" 
              }}>
                Gestión de Flota & Faenas
              </div>
            </div>

            <h2 style={{ fontSize: "20px", fontWeight: 800, marginBottom: "8px", color: "white" }}>
              Acceso Restringido
            </h2>
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
                  style={{
                    width: "100%",
                    background: "#090f1d",
                    border: "1px solid #1c2e52",
                    borderRadius: "8px",
                    color: "white",
                    padding: "12px 14px 12px 40px",
                    fontSize: "14px",
                    outline: "none",
                    boxSizing: "border-box",
                    transition: "all 0.2s"
                  }}
                  onFocus={e => {
                    e.target.style.borderColor = "#ff303e";
                    e.target.style.boxShadow = "0 0 0 2px rgba(255, 48, 62, 0.2)";
                  }}
                  onBlur={e => {
                    e.target.style.borderColor = "#1c2e52";
                    e.target.style.boxShadow = "none";
                  }}
                />
                <div style={{ position: "absolute", left: "14px", top: "50%", transform: "translateY(-50%)", color: "#64748b", display: "flex", alignItems: "center" }}>
                  <Lock size={16} />
                </div>
              </div>

              {loginError && (
                <div style={{ 
                  background: "rgba(239, 68, 68, 0.1)",
                  border: "1px solid rgba(239, 68, 68, 0.2)",
                  borderRadius: "6px",
                  padding: "8px 12px",
                  color: "#ef4444", 
                  fontSize: "12px", 
                  fontWeight: 600, 
                  textAlign: "left" 
                }}>
                  ⚠️ {loginError}
                </div>
              )}

              <button
                type="submit"
                style={{
                  background: "linear-gradient(135deg, #ff303e 0%, #c21a25 100%)",
                  border: "none",
                  color: "white",
                  borderRadius: "8px",
                  padding: "12px 20px",
                  fontSize: "14px",
                  fontWeight: 700,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "8px",
                  boxShadow: "0 4px 14px rgba(255, 48, 62, 0.3)",
                  transition: "transform 0.1s, box-shadow 0.2s"
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

  return children;
}
