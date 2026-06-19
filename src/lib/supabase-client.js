import { createClient } from "@supabase/supabase-js";

/**
 * Cliente Supabase para uso en el BROWSER (React components).
 * Solo para lecturas que no requieran RLS bypass.
 */
let browserClient = null;

export function createBrowserClient() {
  if (browserClient) return browserClient;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    throw new Error("[LukeMontaje] Supabase browser env vars missing");
  }

  browserClient = createClient(url, key, {
    db: { schema: "maquinaria" },
  });

  return browserClient;
}
