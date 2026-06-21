import React, { useEffect, useRef } from "react";
import { RefreshCw } from "lucide-react";

export default function MapTab({ hookProps }) {
  const { equiposCompleto } = hookProps;

  // Referencias para el mapa Leaflet
  const mapContainerRef = useRef(null);
  const mapInstance = useRef(null);
  const markersLayer = useRef(null);

  // Inicializar mapa de geolocalización
  useEffect(() => {
    if (typeof window === "undefined" || equiposCompleto.loading) return;

    // Cargar CSS de Leaflet de forma dinámica
    if (!document.getElementById("leaflet-css")) {
      const linkEl = document.createElement("link");
      linkEl.id = "leaflet-css";
      linkEl.rel = "stylesheet";
      linkEl.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
      document.head.appendChild(linkEl);
    }

    let isMounted = true;

    const initMap = async () => {
      if (mapInstance.current) {
        renderMarkers();
        return;
      }

      const L = (await import("leaflet")).default;
      if (!isMounted || !mapContainerRef.current) return;

      // Ubicación por defecto (Taller de Equipos Echeverria Izquierdo)
      const centerCoord = [-33.6129369, -70.7164499];

      const map = L.map(mapContainerRef.current, {
        center: centerCoord,
        zoom: 14,
        zoomControl: false,
      });

      L.tileLayer(
        "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
        {
          attribution: '&copy; <a href="https://carto.com/">CARTO</a>',
          maxZoom: 19,
        }
      ).addTo(map);

      L.control.zoom({ position: "bottomright" }).addTo(map);

      markersLayer.current = L.layerGroup().addTo(map);
      mapInstance.current = map;

      renderMarkers();
    };

    const renderMarkers = async () => {
      if (!markersLayer.current) return;
      const L = (await import("leaflet")).default;
      markersLayer.current.clearLayers();

      const equiposConCoordenadas = equiposCompleto.data.filter(e => e.latitud_actual && e.longitud_actual);

      equiposConCoordenadas.forEach(e => {
        // Mapeo de colores de estado
        const estadoColores = {
          "Equipo Operativo": "#16a34a",
          "Disponible": "#2563eb",
          "En Colacion": "#d97706",
          "Detenido por Falla": "#c21a25",
        };
        const color = estadoColores[e.estado_actual] || "#2563eb";

        const icon = L.divIcon({
          className: "",
          html: `
            <div style="
              width: 32px; height: 32px;
              background: ${color};
              border: 2px solid white;
              border-radius: 50% 50% 50% 0;
              transform: rotate(-45deg);
              box-shadow: 0 4px 12px ${color}88;
              display: flex;
              align-items: center;
              justify-content: center;
            ">
              <div style="
                transform: rotate(45deg);
                color: white;
                font-size: 8px;
                font-weight: 800;
                font-family: sans-serif;
              ">${e.codigo_interno.slice(-4)}</div>
            </div>
          `,
          iconSize: [32, 32],
          iconAnchor: [16, 32],
          popupAnchor: [0, -34]
        });

        const popupContent = `
          <div style="min-width: 180px; color: #f8fafc; font-family: sans-serif; padding: 2px;">
            <div style="font-size: 10px; font-weight: 700; color: #ff303e; text-transform: uppercase;">
              ${e.codigo_interno}
            </div>
            <div style="font-size: 13px; font-weight: 700; margin-top: 2px; margin-bottom: 6px; color: white;">
              ${e.descripcion_equipo}
            </div>
            <div style="display: flex; justify-content: space-between; font-size: 11px; margin-bottom: 4px;">
              <span style="color: #64748b;">Estado:</span>
              <span style="font-weight: 700; color: ${color};">${e.estado_actual}</span>
            </div>
            <div style="display: flex; justify-content: space-between; font-size: 11px; margin-bottom: 4px;">
              <span style="color: #64748b;">Proyecto:</span>
              <span style="color: #cbd5e1; font-weight: 600;">${e.proyectos?.nombre_proyecto || "Sin proyecto"}</span>
            </div>
            ${e.ultima_ubicacion_fecha ? `
              <div style="border-top: 1px solid #1c2e52; margin-top: 6px; padding-top: 6px; font-size: 9px; color: #94a3b8;">
                📍 Act: ${new Date(e.ultima_ubicacion_fecha).toLocaleTimeString("es-CL")} - ${new Date(e.ultima_ubicacion_fecha).toLocaleDateString("es-CL")}
              </div>
            ` : ""}
          </div>
        `;

        L.marker([e.latitud_actual, e.longitud_actual], { icon })
          .addTo(markersLayer.current)
          .bindPopup(popupContent);
      });

      if (equiposConCoordenadas.length > 0 && mapInstance.current) {
        const bounds = L.latLngBounds(equiposConCoordenadas.map(e => [e.latitud_actual, e.longitud_actual]));
        mapInstance.current.fitBounds(bounds, { padding: [40, 40] });
      }
    };

    initMap();

    return () => {
      isMounted = false;
      if (mapInstance.current) {
        mapInstance.current.remove();
        mapInstance.current = null;
        markersLayer.current = null;
      }
    };
  }, [equiposCompleto.data, equiposCompleto.loading]);

  return (
    <>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
        <div>
          <h1 style={{ margin: 0, fontSize: "22px", fontWeight: 800 }}>Mapa de Geolocalización de Equipos</h1>
          <p style={{ margin: "4px 0 0", color: "#64748b", fontSize: "13px" }}>
            Ubicación en caliente basada en la última transmisión GPS compartida por el operador.
          </p>
        </div>
        <button
          onClick={() => equiposCompleto.refresh(true)}
          style={{
            background: "#121e36", border: "1px solid #1c2e52",
            borderRadius: "8px", padding: "8px 14px", color: "#94a3b8",
            cursor: "pointer", display: "flex", alignItems: "center", gap: "6px", fontSize: "12px",
          }}
        >
          <RefreshCw size={13} /> Actualizar Posiciones
        </button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "3fr 1fr", gap: "16px" }}>
        {/* Contenedor del mapa */}
        <div style={{ position: "relative", height: "calc(100vh - 200px)", borderRadius: "16px", overflow: "hidden", border: "1px solid #1c2e52" }}>
          <div ref={mapContainerRef} style={{ width: "100%", height: "100%" }}></div>
        </div>

        {/* Barra lateral con lista de equipos */}
        <div style={{ background: "#121e36", border: "1px solid #1c2e52", borderRadius: "16px", padding: "16px", overflowY: "auto", height: "calc(100vh - 200px)" }}>
          <h3 style={{ fontSize: "13px", fontWeight: 700, color: "#94a3b8", marginBottom: "12px", textTransform: "uppercase", letterSpacing: "0.5px" }}>
            Equipos en Faena
          </h3>
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            {equiposCompleto.data.map(e => {
              const tieneGPS = e.latitud_actual && e.longitud_actual;
              return (
                <div
                  key={e.id}
                  style={{
                    background: "#0f172a", borderRadius: "10px", padding: "12px",
                    border: `1px solid ${tieneGPS ? "rgba(99, 102, 241, 0.2)" : "#1c2e52"}`,
                    cursor: tieneGPS ? "pointer" : "default",
                    transition: "all 0.2s"
                  }}
                  onClick={() => {
                    if (tieneGPS && mapInstance.current) {
                      mapInstance.current.setView([e.latitud_actual, e.longitud_actual], 16);
                    }
                  }}
                  onMouseEnter={el => { if (tieneGPS) el.currentTarget.style.borderColor = "#6366f1"; }}
                  onMouseLeave={el => { if (tieneGPS) el.currentTarget.style.borderColor = "rgba(99, 102, 241, 0.2)"; }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "4px" }}>
                    <span style={{ color: "#ff303e", fontWeight: 700, fontSize: "11px" }}>{e.codigo_interno}</span>
                    <span style={{
                      background: tieneGPS ? "rgba(16, 185, 129, 0.15)" : "rgba(100, 116, 139, 0.15)",
                      color: tieneGPS ? "#10b981" : "#94a3b8",
                      borderRadius: "10px", padding: "1px 6px", fontSize: "9px", fontWeight: 700
                    }}>
                      {tieneGPS ? "📡 GPS OK" : "🚫 SIN GPS"}
                    </span>
                  </div>
                  <div style={{ color: "white", fontSize: "13px", fontWeight: 600 }}>{e.descripcion_equipo}</div>
                  <div style={{ color: "#64748b", fontSize: "11px", marginTop: "4px" }}>Proyecto: {e.proyectos?.nombre_proyecto || "Sin proyecto"}</div>
                  
                  {tieneGPS && e.ultima_ubicacion_fecha && (
                    <div style={{ color: "#6366f1", fontSize: "10px", marginTop: "6px" }}>
                      Última act: {new Date(e.ultima_ubicacion_fecha).toLocaleTimeString("es-CL")}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </>
  );
}
