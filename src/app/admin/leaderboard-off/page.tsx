import { createServerSupabase } from "@/lib/supabase/server";
import type { AjusteLeaderboard, Categoria, Dupla, Prova, Resultado } from "@/lib/types";
import LeaderboardOffClient from "./LeaderboardOffClient";

export const revalidate = 0;

export default async function LeaderboardOffPage() {
  const supabase = createServerSupabase();
  const { data: categorias } = await supabase.from("categorias").select("*").order("nome");
  const { data: duplas } = await supabase.from("duplas").select("*").order("nome_dupla");
  const { data: provas } = await supabase.from("provas").select("*").order("numero");
  const { data: resultados } = await supabase.from("resultados").select("*");
  const { data: ajustes } = await supabase.from("leaderboard_ajustes").select("categoria_id, dupla_id, posicao").order("posicao");

  return (
    <LeaderboardOffClient
      categorias={(categorias ?? []) as Categoria[]}
      duplas={(duplas ?? []) as Dupla[]}
      provas={(provas ?? []) as Prova[]}
      resultados={(resultados ?? []) as Resultado[]}
      ajustesIniciais={(ajustes ?? []) as AjusteLeaderboard[]}
    />
  );
}
