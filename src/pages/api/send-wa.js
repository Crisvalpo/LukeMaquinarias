/**
 * Proxy hacia el WA-Bridge de LukeMontaje (puerto 3025)
 * Usado por el panel admin para enviar mensajes manuales
 */
export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    return res.status(405).json({ success: false });
  }

  const bridgeUrl = process.env.WA_BRIDGE_URL || "http://localhost:3025";

  try {
    const response = await fetch(`${bridgeUrl}/send`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(req.body),
    });

    const data = await response.json();
    return res.status(response.status).json(data);
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
}
