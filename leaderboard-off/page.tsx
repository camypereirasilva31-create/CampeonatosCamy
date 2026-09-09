import { requireOrganizador } from "@/lib/auth";
import { createAdminSupabase } from "@/lib/supabase/admin";
import type { AjusteLeaderboard, Categoria, Dupla, Prova, Resultado } from "@/lib/types";
import LeaderboardOffClient from "./LeaderboardOffClient";

export const dynamic = "force-dynamic";

export default async function LeaderboardOffPage() {
  await requireOrganizador();
  const supabase = createAdminSupabase();
  const [{ data: categorias }, { data: duplas }, { data: provas }, { data: resultados }, { data: ajustes }] = await Promise.all([
    supabase.from("categorias").select("id, nome").order("nome"),
    supabase.from("duplas").select("*").order("nome_dupla"),
    supabase.from("provas").select("*").order("numero"),
    supabase.from("resultados").select("*"),
    supabase.from("leaderboard_ajustes").select("categoria_id, dupla_id, posicao").order("posicao"),
  ]);

  return <main>
    <div className="mb-6"><h1 className="font-display text-2xl font-bold text-navy">Leaderboard Off</h1><p className="mt-1 text-sm text-steel-600">Visão interna do organizador — inclui provas ainda não publicadas.</p></div>
    <LeaderboardOffClient categorias={(categorias ?? []) as Categoria[]} duplas={(duplas ?? []) as Dupla[]} provas={(provas ?? []) as Prova[]} resultados={(resultados ?? []) as Resultado[]} ajustesIniciais={(ajustes ?? []) as AjusteLeaderboard[]} />
  </main>;
}
