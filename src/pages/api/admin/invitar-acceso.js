import { createAdminClient } from "../../../lib/supabase-server";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    return res.status(405).json({ success: false, message: "Método no permitido" });
  }

  const { personal_id, email, redirectTo } = req.body;

  if (!personal_id || !email || !email.trim()) {
    return res.status(400).json({ success: false, message: "Falta personal_id o email" });
  }

  const cleanEmail = email.trim().toLowerCase();
  const supabase = createAdminClient();

  try {
    const { error: errInvite } = await supabase.auth.admin.inviteUserByEmail(cleanEmail, {
      redirectTo: redirectTo || undefined
    });

    if (errInvite) {
      return res.status(400).json({ success: false, error: errInvite.message });
    }

    const { error: errUpdate } = await supabase
      .from("personal")
      .update({ email: cleanEmail })
      .eq("id", personal_id);

    if (errUpdate) {
      return res.status(500).json({
        success: false,
        error: `La invitación se envió, pero no se pudo guardar el email en personal: ${errUpdate.message}`
      });
    }

    return res.status(200).json({ success: true, message: "Invitación de acceso web enviada" });
  } catch (e) {
    console.error("[api/admin/invitar-acceso] Error:", e.message);
    return res.status(500).json({ success: false, error: e.message });
  }
}
