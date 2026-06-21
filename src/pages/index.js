import React, { useState } from "react";
import Head from "next/head";
import Link from "next/link";
import { 
  Building2, 
  MessageSquare, 
  Settings, 
  ArrowRight, 
  ShieldCheck, 
  Truck, 
  Wrench, 
  Clock,
  ExternalLink
} from "lucide-react";
import { createAdminClient } from "../lib/supabase-server";

export async function getServerSideProps() {
  try {
    const supabase = createAdminClient();
    const { data: equipos, error } = await supabase
      .from("equipos")
      .select("*")
      .in("clasificacion_comercial", ["DISPONIBLE PARA ARRIENDO", "VENTA"])
      .order("codigo_interno");

    if (error) {
      console.error("Error fetching public equipments:", error);
      return { props: { equipos: [] } };
    }

    return { props: { equipos: equipos || [] } };
  } catch (err) {
    console.error("Crash fetching public equipments:", err);
    return { props: { equipos: [] } };
  }
}

export default function Home({ equipos }) {
  const [activeTab, setActiveTab] = useState("ARRIENDO"); // "ARRIENDO" o "VENTA"
  
  // Filtrar equipos comercializables en patio (los arrendados no se muestran al público o se muestran como no disponibles)
  const equiposFiltrados = equipos.filter(eq => {
    if (activeTab === "ARRIENDO") {
      // Mostrar solo equipos "DISPONIBLE PARA ARRIENDO" que NO estén arrendados actualmente
      const esArriendo = eq.clasificacion_comercial === "DISPONIBLE PARA ARRIENDO";
      const estaLibre = !eq.arriendo_cliente || eq.arriendo_cliente.trim() === "";
      return esArriendo && estaLibre;
    } else {
      return eq.clasificacion_comercial === "VENTA";
    }
  });

  const getWhatsAppLink = (eq) => {
    const isArriendo = eq.clasificacion_comercial === "DISPONIBLE PARA ARRIENDO";
    const tipoMsg = isArriendo ? "arriendo" : "compra";
    const baseText = `Hola EMISA, estoy interesado en cotizar el ${tipoMsg} de la maquinaria:\n\n*Código:* ${eq.codigo_interno}\n*Descripción:* ${eq.descripcion_equipo}\n*Marca/Modelo:* ${eq.marca || "—"} / ${eq.modelo || "—"}\n\nQuedo atento a su respuesta.`;
    // Número por defecto de contacto comercial de EMISA (puedes cambiarlo si lo deseas)
    const phone = "56930811566"; 
    return `https://wa.me/${phone}?text=${encodeURIComponent(baseText)}`;
  };

  return (
    <>
      <Head>
        <title>EMISA — Gestión & Comercialización de Maquinaria Pesada</title>
        <meta name="description" content="Servicios industriales de primer nivel, arriendo y venta de excavadoras, camiones, grúas y equipos especializados en faena." />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800&family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&display=swap" rel="stylesheet" />
      </Head>

      <div style={{
        background: "#0a1120",
        color: "#f8fafc",
        fontFamily: "'Plus Jakarta Sans', sans-serif",
        minHeight: "100vh",
        position: "relative",
        overflowX: "hidden"
      }}>
        {/* Elementos Decorativos de Fondo */}
        <div style={{
          position: "absolute", top: "-10%", left: "-10%", width: "50%", height: "50%",
          background: "radial-gradient(circle, rgba(255, 48, 62, 0.08) 0%, transparent 70%)",
          zIndex: 0, pointerEvents: "none"
        }} />
        <div style={{
          position: "absolute", bottom: "10%", right: "-10%", width: "60%", height: "60%",
          background: "radial-gradient(circle, rgba(37, 99, 235, 0.08) 0%, transparent 70%)",
          zIndex: 0, pointerEvents: "none"
        }} />

        {/* HEADER / NAVIGATION */}
        <header style={{
          position: "sticky", top: 0, zIndex: 100,
          background: "rgba(10, 17, 32, 0.75)",
          backdropFilter: "blur(12px)",
          borderBottom: "1px solid rgba(255, 255, 255, 0.05)",
          padding: "16px 24px"
        }}>
          <div style={{
            maxWidth: "1200px", margin: "0 auto",
            display: "flex", justifyContent: "space-between", alignItems: "center"
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <img
                src="https://www.eimontajes.com/wp-content/uploads/2025/09/logo-eimisa.svg"
                alt="EMISA Logo"
                style={{ height: "36px", width: "auto" }}
              />
              <span style={{
                color: "#64748b", fontSize: "12px", fontWeight: 700,
                letterSpacing: "1px", textTransform: "uppercase",
                fontFamily: "monospace", borderLeft: "1px solid rgba(255, 255, 255, 0.15)",
                paddingLeft: "12px", display: "none", sm: "inline"
              }}>
                Equipos
              </span>
            </div>

            <nav style={{ display: "flex", gap: "24px", alignItems: "center" }}>
              <a href="#inicio" style={{ color: "#cbd5e1", textDecoration: "none", fontSize: "14px", fontWeight: 500, transition: "color 0.2s" }} onMouseEnter={e => e.target.style.color = "white"} onMouseLeave={e => e.target.style.color = "#cbd5e1"}>Inicio</a>
              <a href="#servicios" style={{ color: "#cbd5e1", textDecoration: "none", fontSize: "14px", fontWeight: 500, transition: "color 0.2s" }} onMouseEnter={e => e.target.style.color = "white"} onMouseLeave={e => e.target.style.color = "#cbd5e1"}>Servicios</a>
              <a href="#catalogo" style={{ color: "#cbd5e1", textDecoration: "none", fontSize: "14px", fontWeight: 500, transition: "color 0.2s" }} onMouseEnter={e => e.target.style.color = "white"} onMouseLeave={e => e.target.style.color = "#cbd5e1"}>Catálogo</a>
              
              <Link href="/admin-maquinaria" style={{ textDecoration: "none" }}>
                <button style={{
                  background: "linear-gradient(135deg, #ff303e, #c21a25)",
                  color: "white", border: "none", borderRadius: "8px",
                  padding: "8px 18px", fontSize: "13px", fontWeight: 700,
                  cursor: "pointer", display: "flex", alignItems: "center", gap: "6px",
                  boxShadow: "0 4px 12px rgba(255, 48, 62, 0.25)",
                  transition: "all 0.2s"
                }}
                onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-1px)"; e.currentTarget.style.boxShadow = "0 6px 16px rgba(255, 48, 62, 0.4)"; }}
                onMouseLeave={e => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "0 4px 12px rgba(255, 48, 62, 0.25)"; }}
                >
                  <Settings size={13} />
                  <span>Área de Gestión</span>
                </button>
              </Link>
            </nav>
          </div>
        </header>

        {/* HERO SECTION */}
        <section id="inicio" style={{
          position: "relative", zIndex: 10,
          padding: "80px 24px 60px",
          maxWidth: "1200px", margin: "0 auto",
          textAlign: "center"
        }}>
          <div style={{
            display: "inline-flex", alignItems: "center", gap: "8px",
            background: "rgba(255, 48, 62, 0.08)",
            border: "1px solid rgba(255, 48, 62, 0.2)",
            borderRadius: "100px", padding: "6px 16px",
            color: "#ff303e", fontSize: "12px", fontWeight: 700,
            textTransform: "uppercase", letterSpacing: "1px",
            marginBottom: "24px"
          }}>
            <Building2 size={13} /> Logística y Montajes Industriales
          </div>
          
          <h1 style={{
            fontSize: "48px", fontWeight: 800, lineHeight: 1.15,
            letterSpacing: "-1px", maxWidth: "800px", margin: "0 auto 20px",
            background: "linear-gradient(to right, #ffffff 60%, #94a3b8)",
            WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent"
          }}>
            Gestión Inteligente de Maquinaria Pesada
          </h1>
          
          <p style={{
            color: "#94a3b8", fontSize: "16px", lineHeight: 1.6,
            maxWidth: "600px", margin: "0 auto 36px"
          }}>
            En EMISA suministramos soluciones de transporte, izaje y movimiento de tierra para proyectos de gran envergadura. Contamos con una flota moderna operada bajo los más altos estándares de seguridad faenaria.
          </p>

          <div style={{ display: "flex", justifyContent: "center", gap: "16px", flexWrap: "wrap" }}>
            <a href="#catalogo" style={{ textDecoration: "none" }}>
              <button style={{
                background: "linear-gradient(135deg, #2563eb, #1d4ed8)",
                color: "white", border: "none", borderRadius: "10px",
                padding: "14px 28px", fontSize: "14px", fontWeight: 700,
                cursor: "pointer", display: "flex", alignItems: "center", gap: "8px",
                boxShadow: "0 4px 14px rgba(37, 99, 235, 0.3)",
                transition: "all 0.2s"
              }}
              onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-1px)"; e.currentTarget.style.boxShadow = "0 6px 20px rgba(37, 99, 235, 0.45)"; }}
              onMouseLeave={e => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "0 4px 14px rgba(37, 99, 235, 0.3)"; }}
              >
                <span>Ver Flota en Patio</span>
                <ArrowRight size={16} />
              </button>
            </a>
            
            <a href="#contacto" style={{ textDecoration: "none" }}>
              <button style={{
                background: "rgba(255,255,255,0.03)",
                color: "#cbd5e1", border: "1px solid rgba(255,255,255,0.08)",
                borderRadius: "10px", padding: "14px 28px", fontSize: "14px",
                fontWeight: 600, cursor: "pointer", transition: "all 0.2s"
              }}
              onMouseEnter={e => { e.currentTarget.style.background = "rgba(255,255,255,0.06)"; e.currentTarget.style.color = "white"; }}
              onMouseLeave={e => { e.currentTarget.style.background = "rgba(255,255,255,0.03)"; e.currentTarget.style.color = "#cbd5e1"; }}
              >
                Contacto Comercial
              </button>
            </a>
          </div>
        </section>

        {/* METRICS & FEATURES SECTION */}
        <section id="servicios" style={{
          position: "relative", zIndex: 10,
          background: "#090f1d",
          borderTop: "1px solid rgba(255, 255, 255, 0.03)",
          borderBottom: "1px solid rgba(255, 255, 255, 0.03)",
          padding: "60px 24px"
        }}>
          <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
            <div style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
              gap: "24px"
            }}>
              {/* Feature 1 */}
              <div style={{
                background: "#101827", border: "1px solid rgba(255,255,255,0.03)",
                borderRadius: "16px", padding: "28px",
                boxShadow: "inset 0 1px 1px rgba(255,255,255,0.03)"
              }}>
                <div style={{
                  width: "42px", height: "42px", borderRadius: "10px",
                  background: "rgba(255, 48, 62, 0.08)", border: "1px solid rgba(255, 48, 62, 0.15)",
                  display: "flex", alignItems: "center", justifyContext: "center",
                  color: "#ff303e", marginBottom: "20px", paddingLeft: "12px"
                }}>
                  <Truck size={18} />
                </div>
                <h3 style={{ fontSize: "16px", fontWeight: 700, marginBottom: "8px" }}>Arriendo Operativo</h3>
                <p style={{ color: "#64748b", fontSize: "13px", lineHeight: 1.5 }}>
                  Equipos disponibles para arriendos mensuales o por faena, con o sin operador calificado.
                </p>
              </div>

              {/* Feature 2 */}
              <div style={{
                background: "#101827", border: "1px solid rgba(255,255,255,0.03)",
                borderRadius: "16px", padding: "28px",
                boxShadow: "inset 0 1px 1px rgba(255,255,255,0.03)"
              }}>
                <div style={{
                  width: "42px", height: "42px", borderRadius: "10px",
                  background: "rgba(37, 99, 235, 0.08)", border: "1px solid rgba(37, 99, 235, 0.15)",
                  display: "flex", alignItems: "center", justifyContext: "center",
                  color: "#2563eb", marginBottom: "20px", paddingLeft: "12px"
                }}>
                  <ShieldCheck size={18} />
                </div>
                <h3 style={{ fontSize: "16px", fontWeight: 700, marginBottom: "8px" }}>Seguridad y Control</h3>
                <p style={{ color: "#64748b", fontSize: "13px", lineHeight: 1.5 }}>
                  Monitoreo de horas de trabajo y pautas operativas diarias para mitigar fallas mecánicas en obra.
                </p>
              </div>

              {/* Feature 3 */}
              <div style={{
                background: "#101827", border: "1px solid rgba(255,255,255,0.03)",
                borderRadius: "16px", padding: "28px",
                boxShadow: "inset 0 1px 1px rgba(255,255,255,0.03)"
              }}>
                <div style={{
                  width: "42px", height: "42px", borderRadius: "10px",
                  background: "rgba(16, 185, 129, 0.08)", border: "1px solid rgba(16, 185, 129, 0.15)",
                  display: "flex", alignItems: "center", justifyContext: "center",
                  color: "#10b981", marginBottom: "20px", paddingLeft: "12px"
                }}>
                  <Wrench size={18} />
                </div>
                <h3 style={{ fontSize: "16px", fontWeight: 700, marginBottom: "8px" }}>Mantención Preventiva</h3>
                <p style={{ color: "#64748b", fontSize: "13px", lineHeight: 1.5 }}>
                  Taller centralizado y cuadrillas móviles para asegurar la máxima operatividad mecánica en terreno.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* CATALOG / INVENTORY SECTION */}
        <section id="catalogo" style={{
          position: "relative", zIndex: 10,
          padding: "80px 24px",
          maxWidth: "1200px", margin: "0 auto"
        }}>
          <div style={{ textAlign: "center", marginBottom: "40px" }}>
            <h2 style={{ fontSize: "32px", fontWeight: 800, marginBottom: "12px" }}>Catálogo de Flota Comercial</h2>
            <p style={{ color: "#94a3b8", fontSize: "15px", maxWidth: "600px", margin: "0 auto 30px" }}>
              Explore nuestra maquinaria disponible actualmente para arriendo inmediato en patio o para venta directa.
            </p>
            
            {/* TABS SELECTOR */}
            <div style={{
              display: "inline-flex", background: "#101c33", padding: "4px",
              borderRadius: "10px", border: "1px solid rgba(255,255,255,0.04)"
            }}>
              <button
                onClick={() => setActiveTab("ARRIENDO")}
                style={{
                  background: activeTab === "ARRIENDO" ? "linear-gradient(135deg, #ff303e, #c21a25)" : "transparent",
                  color: "white", border: "none", borderRadius: "8px",
                  padding: "10px 20px", fontSize: "13px", fontWeight: 700,
                  cursor: "pointer", transition: "all 0.2s"
                }}
              >
                🔑 Disponible para Arriendo
              </button>
              <button
                onClick={() => setActiveTab("VENTA")}
                style={{
                  background: activeTab === "VENTA" ? "linear-gradient(135deg, #ff303e, #c21a25)" : "transparent",
                  color: "white", border: "none", borderRadius: "8px",
                  padding: "10px 20px", fontSize: "13px", fontWeight: 700,
                  cursor: "pointer", transition: "all 0.2s"
                }}
              >
                💲 Disponible para Venta
              </button>
            </div>
          </div>

          {/* EQUIPOS GRID */}
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))",
            gap: "24px"
          }}>
            {equiposFiltrados.map(eq => {
              const hasImage = eq.imagen_url && eq.imagen_url.trim() !== "";
              const cardBg = hasImage
                ? `linear-gradient(rgba(10, 17, 32, 0.85), rgba(10, 17, 32, 0.96)), url(${eq.imagen_url})`
                : "#101c33";

              return (
                <div
                  key={eq.id}
                  style={{
                    background: cardBg,
                    backgroundSize: hasImage ? "cover" : "auto",
                    backgroundPosition: hasImage ? "center" : "auto",
                    border: "1px solid rgba(255,255,255,0.05)",
                    borderRadius: "16px", padding: "24px",
                    display: "flex", flexDirection: "column",
                    justifyContent: "space-between", minHeight: "260px",
                    boxShadow: "0 10px 25px rgba(0,0,0,0.3)",
                    transition: "all 0.3s ease"
                  }}
                  className="equip-card"
                >
                  <div>
                    {/* Header card */}
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "16px" }}>
                      <div>
                        <div style={{ color: "#64748b", fontSize: "10px", fontWeight: 800, letterSpacing: "1px", textTransform: "uppercase" }}>
                          {eq.codigo_interno}
                        </div>
                        <h4 style={{ color: "white", fontSize: "15px", fontWeight: 700, marginTop: "4px", lineHeight: 1.3 }}>
                          {eq.descripcion_equipo}
                        </h4>
                      </div>
                      <span style={{
                        background: activeTab === "ARRIENDO" ? "rgba(16, 185, 129, 0.12)" : "rgba(37, 99, 235, 0.12)",
                        color: activeTab === "ARRIENDO" ? "#10b981" : "#60a5fa",
                        border: `1px solid ${activeTab === "ARRIENDO" ? "rgba(16, 185, 129, 0.25)" : "rgba(37, 99, 235, 0.25)"}`,
                        borderRadius: "100px", padding: "3px 10px", fontSize: "10px", fontWeight: 700,
                        textTransform: "uppercase"
                      }}>
                        {activeTab === "ARRIENDO" ? "Arriendo" : "Venta"}
                      </span>
                    </div>

                    {/* Metadata */}
                    <div style={{ display: "flex", flexWrap: "wrap", gap: "10px", marginBottom: "20px" }}>
                      {eq.marca && (
                        <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: "6px", padding: "4px 8px", fontSize: "11px", color: "#94a3b8" }}>
                          Marca: <span style={{ color: "#cbd5e1", fontWeight: 600 }}>{eq.marca}</span>
                        </div>
                      )}
                      {eq.modelo && (
                        <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: "6px", padding: "4px 8px", fontSize: "11px", color: "#94a3b8" }}>
                          Modelo: <span style={{ color: "#cbd5e1", fontWeight: 600 }}>{eq.modelo}</span>
                        </div>
                      )}
                      {eq.anio_fabricacion && (
                        <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: "6px", padding: "4px 8px", fontSize: "11px", color: "#94a3b8" }}>
                          Año: <span style={{ color: "#cbd5e1", fontWeight: 600 }}>{eq.anio_fabricacion}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Acciones */}
                  <a
                    href={getWhatsAppLink(eq)}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ textDecoration: "none" }}
                  >
                    <button style={{
                      width: "100%", background: "rgba(255, 255, 255, 0.04)",
                      border: "1px solid rgba(255, 255, 255, 0.08)", borderRadius: "8px",
                      color: "white", padding: "10px 16px", fontSize: "12px",
                      fontWeight: 700, cursor: "pointer", display: "flex",
                      alignItems: "center", justifyContent: "center", gap: "6px",
                      transition: "all 0.2s"
                    }}
                    onMouseEnter={e => { e.currentTarget.style.background = "#10b981"; e.currentTarget.style.borderColor = "#10b981"; }}
                    onMouseLeave={e => { e.currentTarget.style.background = "rgba(255, 255, 255, 0.04)"; e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.08)"; }}
                    >
                      <MessageSquare size={13} />
                      <span>Cotizar por WhatsApp</span>
                    </button>
                  </a>
                </div>
              );
            })}

            {equiposFiltrados.length === 0 && (
              <div style={{
                gridColumn: "1 / -1", textAlign: "center", padding: "40px",
                background: "#101c33", border: "1px solid rgba(255,255,255,0.04)",
                borderRadius: "16px", color: "#64748b"
              }}>
                No hay maquinaria disponible para {activeTab.toLowerCase()} en este momento.
              </div>
            )}
          </div>
        </section>

        {/* FOOTER SECTION */}
        <footer id="contacto" style={{
          background: "#060a13",
          borderTop: "1px solid rgba(255,255,255,0.04)",
          padding: "48px 24px",
          color: "#64748b",
          fontSize: "13px"
        }}>
          <div style={{
            maxWidth: "1200px", margin: "0 auto",
            display: "flex", flexDirection: "column", md: "row",
            justifyContent: "space-between", alignItems: "center", gap: "24px",
            textAlign: "center"
          }}>
            <div>
              <img
                src="https://www.eimontajes.com/wp-content/uploads/2025/09/logo-eimisa.svg"
                alt="EMISA"
                style={{ height: "28px", width: "auto", marginBottom: "12px", opacity: 0.6 }}
              />
              <p style={{ margin: 0 }}>© {new Date().getFullYear()} EIMISA Montajes Industriales. Todos los derechos reservados.</p>
            </div>
            
            <div style={{ display: "flex", gap: "16px", flexWrap: "wrap", justifyContent: "center" }}>
              <a href="https://www.eimontajes.com" target="_blank" rel="noopener noreferrer" style={{ color: "#475569", textDecoration: "none", display: "inline-flex", alignItems: "center", gap: "4px" }}>
                <span>Sitio Web Corporativo</span>
                <ExternalLink size={12} />
              </a>
            </div>
          </div>
        </footer>
      </div>

      <style jsx global>{`
        .equip-card:hover {
          transform: translateY(-4px);
          border-color: rgba(255, 48, 62, 0.2) !important;
          box-shadow: 0 15px 35px rgba(255, 48, 62, 0.12) !important;
        }
      `}</style>
    </>
  );
}
