import { CheckCircle, Clock, Coffee, XCircle } from "lucide-react";

export const ESTADO_CONFIG = {
  "Equipo Operativo": { color: "#16a34a", bg: "#dcfce7", border: "#86efac", icon: CheckCircle, label: "Operativo" },
  "Disponible":       { color: "#2563eb", bg: "#dbeafe", border: "#93c5fd", icon: Clock,       label: "Disponible" },
  "En Colacion":      { color: "#d97706", bg: "#fef3c7", border: "#fcd34d", icon: Coffee,      label: "Colación" },
  "Detenido por Falla": { color: "#c21a25", bg: "#fee2e2", border: "#fca5a5", icon: XCircle,   label: "Falla" },
};
