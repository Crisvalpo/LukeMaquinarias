# 🚜 LukeEquipos (LukeMaquinarias)

Sistema de control de maquinaria, personal y turnos en faena, con bot de WhatsApp conversacional **"jAIme"** (Gemini) que entiende voz, imagen y ubicación.

## Arquitectura

- **Next.js** (pages router) — panel web de administración. Puerto **3020**.
- **wa-bridge** (`wa-bridge/index.js`) — microservicio Baileys independiente que conecta WhatsApp vía WebSockets. Puerto **3025**. Sesión en `auth_info_baileys/`, QR en `GET /qr`.
- **Gemini** (`src/lib/gemini.js`) — cerebro del bot: transcripción de audio, extracción de JSON estructurado, respuestas conversacionales y TTS (PCM → OGG Opus vía ffmpeg en el server).
- **Supabase** — datos (migraciones en `supabase/migrations`, verificación con `supabase/verify.sh`).

## Estructura

- `src/pages` — rutas y API (incl. `/api/whatsapp-incoming`, webhook del bridge protegido con `x-wa-bridge-secret`)
- `src/components/admin` — EquiposTab, PersonalTab, PlanificacionPodTab, etc.
- `src/lib` — gemini.js y lógica de negocio
- `wa-bridge/` — puente WhatsApp (deploy propio en PM2)
- `Resumen_Procedimientos_Maquinaria_LukeAPP.md` — procedimientos de negocio

## Desarrollo

```bash
npm install
npm run dev        # levanta en http://localhost:3020
```

Variables en `.env.local` (no versionado): Supabase, `GEMINI_API_KEY`, `WA_BRIDGE_SECRET`.

## Deploy (lukeserver)

Push-to-Deploy automático: `git push origin main` → webhook (puerto 9000) → pull + build + `pm2 restart luke-equipos-prod`.

Procesos PM2 en el server: `luke-equipos-prod` (:3020) y `luke-equipos-wa-bridge` (:3025). Detalles de operación en `C:\Github\Skill\luke-equipos\SKILL.md` y `C:\Github\Skill\luke-server\Skill.md`.

## Notas

- ⚠️ El login del panel admin (clave `LukeAPP`) es solo cosmético (localStorage); no confiar en él como seguridad de servidor.
- Cada app del ecosistema tiene su propia instancia de wa-bridge (número, puerto y sesión distintos).
