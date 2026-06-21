import { useState, useEffect } from "react";
import Head from "next/head";
import Link from "next/link";
import { ArrowLeft, RefreshCw, CheckCircle, WifiOff, Loader2, MessageSquare } from "lucide-react";
import AdminAuthWrapper from "../components/admin/Shared/AdminAuthWrapper";

export default function QrPuente() {
  const [status, setStatus] = useState("disconnected");
  const [qr, setQr] = useState(null);
  const [loading, setLoading] = useState(true);
  const [countdown, setCountdown] = useState(8);
  const [errorMsg, setErrorMsg] = useState(null);

  const fetchStatus = async () => {
    try {
      const res = await fetch("/api/qr-status");
      const data = await res.json();
      setStatus(data.status || "disconnected");
      setQr(data.qr || null);
      if (!data.success && data.message) {
        setErrorMsg(data.message);
      } else {
        setErrorMsg(null);
      }
    } catch (e) {
      console.error(e);
      setErrorMsg("Error de red al conectar con el backend.");
      setStatus("disconnected");
      setQr(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
  }, []);

  // Polling y cuenta regresiva
  useEffect(() => {
    if (status === "connected") return;

    const interval = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          fetchStatus();
          return 8; // Reset countdown
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [status]);

  const handleManualRefresh = () => {
    setLoading(true);
    fetchStatus();
    setCountdown(8);
  };

  // Determinar colores y estados para la UI
  const getBadgeStyle = () => {
    switch (status) {
      case "connected":
        return {
          bg: "rgba(16, 185, 129, 0.15)",
          color: "#10b981",
          border: "rgba(16, 185, 129, 0.3)",
          label: "Conectado"
        };
      case "connecting":
        return {
          bg: "rgba(245, 158, 11, 0.15)",
          color: "#f59e0b",
          border: "rgba(245, 158, 11, 0.3)",
          label: "Conectando..."
        };
      default:
        return {
          bg: "rgba(239, 68, 68, 0.15)",
          color: "#ef4444",
          border: "rgba(239, 68, 68, 0.3)",
          label: "Desconectado"
        };
    }
  };

  const badge = getBadgeStyle();

  return (
    <AdminAuthWrapper>
      <Head>
        <title>Vincular WhatsApp — LukeEquipos</title>
        <meta name="description" content="Vinculación de WhatsApp para el sistema de control de maquinaria" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800&display=swap" rel="stylesheet" />
      </Head>

      <div className="main-container">
        {/* Decoraciones de fondo */}
        <div className="bg-gradient-orb top-left"></div>
        <div className="bg-gradient-orb bottom-right"></div>

        <div className="content-card">
          {/* Header con botón para volver */}
          <div className="card-header">
            <Link href="/admin-maquinaria" className="back-link">
              <ArrowLeft size={16} />
              <span>Volver a Consola</span>
            </Link>
            <div className="app-brand">
              <div className="brand-logo">
                <MessageSquare size={18} color="white" />
              </div>
              <span className="brand-name">LukeEquipos Puente</span>
            </div>
          </div>

          {/* Estado del puente */}
          <div className="status-section">
            <div
              className="status-badge"
              style={{
                background: badge.bg,
                color: badge.color,
                borderColor: badge.border,
              }}
            >
              <span className="status-dot" style={{ background: badge.color }}></span>
              {badge.label}
            </div>
          </div>

          {/* Contenido Principal */}
          {loading ? (
            <div className="loading-container">
              <Loader2 className="spinner" size={40} />
              <p>Consultando estado del puente...</p>
            </div>
          ) : status === "connected" ? (
            <div className="success-container animate-fade-in">
              <div className="check-wrapper">
                <CheckCircle size={60} color="#10b981" />
              </div>
              <h2>¡WhatsApp Vinculado!</h2>
              <p className="success-desc">
                El puente de WhatsApp Web está activo y transmitiendo en el puerto 3025. El bot ya puede recibir comandos de voz e imágenes de faena de forma normal.
              </p>
              <div className="details-box">
                <div>Servicio: <span className="highlight">luke-montaje-wa-bridge</span></div>
                <div>Estado: <span className="highlight verde">Operacional</span></div>
              </div>
              <Link href="/admin-maquinaria" className="primary-btn mt-6">
                Ir a la Consola
              </Link>
            </div>
          ) : errorMsg ? (
            <div className="error-container animate-fade-in">
              <div className="error-icon-wrapper">
                <WifiOff size={48} color="#ef4444" />
              </div>
              <h2>Puente Desconectado</h2>
              <p className="error-desc">
                No se pudo establecer conexión con el microservicio de WhatsApp en local.
              </p>
              <div className="error-details">
                <strong>Detalle técnico:</strong> {errorMsg}
              </div>
              <button onClick={handleManualRefresh} className="primary-btn red-btn">
                <RefreshCw size={14} className="mr-2" /> Reintentar Conexión
              </button>
              <p className="auto-refresh-text">
                Reintentando automáticamente en <span className="timer-num">{countdown}</span> segundos...
              </p>
            </div>
          ) : qr ? (
            <div className="qr-container animate-fade-in">
              <h2>Vincular WhatsApp</h2>
              <p className="qr-desc">
                Escanea el código QR desde tu aplicación de WhatsApp en tu teléfono celular (Dispositivos vinculados &gt; Vincular un dispositivo).
              </p>

              <div className="qr-box-wrapper">
                <img
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=280x280&data=${encodeURIComponent(qr)}&margin=10`}
                  alt="Código QR de WhatsApp"
                  className="qr-image"
                />
              </div>

              <div className="warning-note">
                <span>⚠️</span> El código QR expira y cambia periódicamente por seguridad.
              </div>

              <p className="auto-refresh-text">
                El QR se actualizará en <span className="timer-num">{countdown}</span> segundos...
              </p>

              <button onClick={handleManualRefresh} className="secondary-btn">
                <RefreshCw size={12} className="mr-2" /> Generar nuevo QR
              </button>
            </div>
          ) : (
            <div className="waiting-container animate-fade-in">
              <Loader2 className="spinner" size={32} />
              <h2>Inicializando sesión...</h2>
              <p className="waiting-desc">
                Esperando a que el puente genere un nuevo código QR para vincular. Si la sesión tarda en iniciar, asegúrate de que el puente de WhatsApp esté activo en PM2.
              </p>
              <button onClick={handleManualRefresh} className="secondary-btn">
                <RefreshCw size={12} className="mr-2" /> Actualizar Estado
              </button>
            </div>
          )}
        </div>
      </div>

      <style jsx global>{`
        * {
          box-sizing: border-box;
          margin: 0;
          padding: 0;
        }

        body {
          font-family: 'Outfit', sans-serif;
          background: #0a1120;
          color: #f8fafc;
          min-height: 100vh;
          overflow-x: hidden;
        }

        .main-container {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 24px;
          position: relative;
          background: radial-gradient(circle at top, #101c33, #0a1120);
        }

        /* Orbes degradados en background */
        .bg-gradient-orb {
          position: absolute;
          width: 400px;
          height: 400px;
          border-radius: 50%;
          filter: blur(100px);
          opacity: 0.15;
          pointer-events: none;
          z-index: 0;
        }
        .bg-gradient-orb.top-left {
          top: -50px;
          left: -50px;
          background: #6366f1;
        }
        .bg-gradient-orb.bottom-right {
          bottom: -50px;
          right: -50px;
          background: #34d399;
        }

        /* Tarjeta principal Glassmorphism */
        .content-card {
          position: relative;
          z-index: 10;
          max-width: 480px;
          width: 100%;
          background: rgba(30, 41, 59, 0.7);
          backdrop-filter: blur(16px);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 24px;
          padding: 32px;
          box-shadow: 0 20px 40px rgba(0, 0, 0, 0.4);
          text-align: center;
        }

        /* Header de tarjeta */
        .card-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 28px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.06);
          padding-bottom: 16px;
        }

        .back-link {
          display: flex;
          align-items: center;
          gap: 6px;
          color: #94a3b8;
          text-decoration: none;
          font-size: 13px;
          font-weight: 500;
          transition: color 0.2s;
        }
        .back-link:hover {
          color: #f8fafc;
        }

        .app-brand {
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .brand-logo {
          width: 28px;
          height: 28px;
          border-radius: 6px;
          background: linear-gradient(135deg, #ff303e, #c21a25);
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .brand-name {
          font-size: 13px;
          font-weight: 700;
          color: #cbd5e1;
        }

        /* Status Section */
        .status-section {
          display: flex;
          justify-content: center;
          margin-bottom: 24px;
        }

        .status-badge {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 6px 16px;
          border-radius: 100px;
          font-size: 12px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          border: 1px solid;
        }

        .status-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          display: inline-block;
          box-shadow: 0 0 8px currentColor;
        }

        /* Contenedores de estados */
        h2 {
          font-size: 22px;
          font-weight: 700;
          color: #f8fafc;
          margin-bottom: 12px;
          letter-spacing: -0.5px;
        }

        p {
          font-size: 14px;
          line-height: 1.6;
          color: #94a3b8;
        }

        /* Estado: Éxito */
        .success-container {
          padding: 10px 0;
        }

        .check-wrapper {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 80px;
          height: 80px;
          border-radius: 50%;
          background: rgba(16, 185, 129, 0.08);
          margin: 0 auto 20px auto;
          box-shadow: 0 0 20px rgba(16, 185, 129, 0.15);
        }

        .success-desc {
          margin-bottom: 24px;
        }

        .details-box {
          background: rgba(15, 23, 42, 0.5);
          border: 1px solid rgba(255, 255, 255, 0.05);
          border-radius: 12px;
          padding: 16px;
          font-size: 13px;
          text-align: left;
          color: #cbd5e1;
          display: flex;
          flex-direction: column;
          gap: 6px;
        }
        .details-box .highlight {
          font-weight: 600;
          color: #f8fafc;
          float: right;
        }
        .details-box .verde {
          color: #10b981;
        }

        /* Estado: Error */
        .error-icon-wrapper {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 70px;
          height: 70px;
          border-radius: 50%;
          background: rgba(239, 68, 68, 0.08);
          margin: 0 auto 20px auto;
        }

        .error-desc {
          margin-bottom: 16px;
        }

        .error-details {
          background: rgba(239, 68, 68, 0.05);
          border: 1px dashed rgba(239, 68, 68, 0.2);
          border-radius: 12px;
          padding: 14px;
          font-size: 13px;
          color: #fca5a5;
          margin-bottom: 24px;
          text-align: left;
          word-break: break-word;
        }

        /* Estado: QR */
        .qr-desc {
          margin-bottom: 20px;
        }

        .qr-box-wrapper {
          width: 250px;
          height: 250px;
          margin: 0 auto 20px auto;
          background: white;
          padding: 10px;
          border-radius: 16px;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 10px 25px rgba(0, 0, 0, 0.3);
        }
        .qr-image {
          width: 100%;
          height: 100%;
          object-fit: contain;
        }

        .warning-note {
          background: rgba(245, 158, 11, 0.08);
          border: 1px solid rgba(245, 158, 11, 0.15);
          color: #fcd34d;
          font-size: 12px;
          font-weight: 500;
          border-radius: 8px;
          padding: 8px 12px;
          display: inline-flex;
          align-items: center;
          gap: 6px;
          margin-bottom: 16px;
        }

        /* Estado: Espera */
        .waiting-desc {
          margin-bottom: 24px;
        }

        /* Botones */
        .primary-btn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          background: linear-gradient(135deg, #6366f1, #4f46e5);
          color: white;
          border: none;
          padding: 12px 24px;
          font-size: 14px;
          font-weight: 600;
          border-radius: 12px;
          cursor: pointer;
          transition: all 0.2s;
          text-decoration: none;
          width: 100%;
        }
        .primary-btn:hover {
          transform: translateY(-1px);
          box-shadow: 0 4px 15px rgba(99, 102, 241, 0.4);
        }

        .red-btn {
          background: linear-gradient(135deg, #ef4444, #c21a25);
        }
        .red-btn:hover {
          box-shadow: 0 4px 15px rgba(239, 68, 68, 0.4);
        }

        .secondary-btn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.08);
          color: #cbd5e1;
          padding: 10px 20px;
          font-size: 13px;
          font-weight: 600;
          border-radius: 12px;
          cursor: pointer;
          transition: all 0.2s;
        }
        .secondary-btn:hover {
          background: rgba(255, 255, 255, 0.1);
          color: white;
        }

        /* Utilidades */
        .mt-6 { margin-top: 24px; }
        .mr-2 { margin-right: 8px; }
        .auto-refresh-text {
          font-size: 12px;
          color: #64748b;
          margin-bottom: 16px;
        }
        .timer-num {
          font-weight: 700;
          color: #f59e0b;
        }

        /* Animaciones */
        .spinner {
          animation: spin 1.2s linear infinite;
          color: #6366f1;
        }
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }

        .loading-container {
          padding: 40px 0;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 16px;
        }

        .animate-fade-in {
          animation: fadeIn 0.4s ease-out forwards;
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </AdminAuthWrapper>
  );
}
