import { createServerSupabase } from "./supabase/server";

/**
 * Confirma que existe uma sessão do organizador logado.
 * Lança erro se não houver — toda Server Action de escrita deve
 * chamar isto antes de usar o cliente admin (service role).
 */
export async function requireOrganizador() {
  const supabase = createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Não autenticado. Faça login como organizador.");
  }
  return user;
}
