import { createClient } from "@supabase/supabase-js";

/**
 * Cliente Supabase para uso en el SERVIDOR (API Routes).
 * Usa service_role key para bypass de RLS.
 * Singleton para proteger RAM — mismo patrón que LukeDelivery.
 *
 * NOTA: db.schema='maquinaria' aplica solo a queries PostgREST.
 * Las operaciones de Storage (supabase.storage.*) funcionan
 * independientemente del schema configurado aquí.
 */
let serverClient = null;

export function createAdminClient() {
  if (serverClient) return serverClient;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error(
      "[LukeMontaje] Supabase server env vars missing (NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY)"
    );
  }

  serverClient = createClient(url, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
    db: {
      schema: "maquinaria", // Solo afecta queries PostgREST — Storage es independiente
    },
  });

  return serverClient;
}
