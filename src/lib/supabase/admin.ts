import { createClient } from "@supabase/supabase-js";

/**
 * Cliente com a service role key. Usa RLS bypass — só deve ser usado
 * dentro de Server Actions, DEPOIS de confirmar que existe uma sessão
 * válida do organizador (ver requireOrganizador() em auth.ts).
 * Nunca importar este arquivo em um componente client.
 */
export function createAdminSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );
}
