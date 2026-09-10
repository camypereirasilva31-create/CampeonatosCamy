"use server";

import { revalidatePath } from "next/cache";
import { requireOrganizador } from "@/lib/auth";
import { createAdminSupabase } from "@/lib/supabase/admin";
import { salvarAjusteLeaderboard } from "@/app/admin/leaderboard-off/actions";
export type AcaoResultado = { ok: true } | { ok: false; message: string };

export async function salvarAjusteLeaderboard(
  categoria_id: string,
  ordem_duplas: string[]
): Promise<AcaoResultado> {
  await requireOrganizador();
  const supabase = createAdminSupabase();

  const { error: deleteError } = await supabase
    .from("leaderboard_ajustes")
    .delete()
    .eq("categoria_id", categoria_id);

  if (deleteError) return { ok: false, message: deleteError.message };

  if (ordem_duplas.length) {
    const linhas = ordem_duplas.map((dupla_id, index) => ({
      categoria_id,
      dupla_id,
      posicao: index + 1,
    }));

    const { error: insertError } = await supabase
      .from("leaderboard_ajustes")
      .insert(linhas);

    if (insertError) return { ok: false, message: insertError.message };
  }

  revalidatePath("/admin/leaderboard-off");
  revalidatePath("/leaderboard", "layout");
  revalidatePath("/", "layout");
  return { ok: true };
}
