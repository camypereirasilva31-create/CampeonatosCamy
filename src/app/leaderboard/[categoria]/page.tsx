import { createServerSupabase } from "@/lib/supabase/server";
import type { Dupla, Prova, Resultado } from "@/lib/types";
import { notFound } from "next/navigation";
import Link from "next/link";
import LeaderboardClient from "./LeaderboardClient";

export const revalidate = 0;

export default async function LeaderboardPage({
  params,
}: {
  params: { categoria: string };
}) {
  const supabase = createServerSupabase();

  // categorias.id é bigint — nunca repassa o segmento da URL ao Postgres
  // sem confirmar que é um inteiro (evita 22P02 para valores como "admin").
  if (!/^\d+$/.test(params.categoria)) {
    notFound();
  }

  const { data: categoria } = await supabase
    .from("categorias")
    .select("id, nome")
    .eq("id", params.categoria)
    .single();

  if (!categoria) notFound();

  const { data: duplas } = await supabase
    .from("duplas")
    .select("*")
    .eq("categoria_id", categoria.id)
    .order("nome_dupla");

  const { data: provas } = await supabase
    .from("provas")
    .select("*")
    .order("numero");

  const provaIds = (provas ?? []).map((p) => p.id);

  const { data: resultados } = provaIds.length
    ? await supabase.from("resultados").select("*").in("prova_id", provaIds)
    : { data: [] as Resultado[] };

  return (
    <main className="min-h-screen bg-steel-50">
      <header className="bg-navy text-white px-4 py-5 sm:px-6">
        <Link href="/" className="text-royal-light text-sm">
          ← TCBrave 2026
        </Link>
        <h1 className="font-display text-2xl font-bold mt-1">{categoria.nome}</h1>
      </header>

      <LeaderboardClient
        categoriaId={categoria.id}
        duplasIniciais={(duplas ?? []) as Dupla[]}
        provasIniciais={(provas ?? []) as Prova[]}
        resultadosIniciais={(resultados ?? []) as Resultado[]}
      />
    </main>
  );
}
