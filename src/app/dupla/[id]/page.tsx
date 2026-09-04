import { createServerSupabase } from "@/lib/supabase/server";
import { formatResultado } from "@/lib/scoring";
import type { Prova, Resultado } from "@/lib/types";
import { notFound } from "next/navigation";
import Link from "next/link";

export const revalidate = 0;

export default async function DuplaPage({ params }: { params: { id: string } }) {
  const supabase = createServerSupabase();

  const { data: dupla } = await supabase
    .from("duplas")
    .select("*, categorias(nome)")
    .eq("id", params.id)
    .single();

  if (!dupla) notFound();

  const { data: provas } = await supabase
    .from("provas")
    .select("*")
    .order("numero");

  const provasPublicadas = ((provas ?? []) as Prova[]).filter((p) => p.publicado);
  const provaIds = provasPublicadas.map((p) => p.id);

  const { data: resultados } = provaIds.length
    ? await supabase.from("resultados").select("*").in("prova_id", provaIds).eq("dupla_id", params.id)
    : { data: [] as Resultado[] };

  const resultadoPorProva = new Map((resultados ?? []).map((r) => [r.prova_id, r as Resultado]));
  const total = (resultados ?? []).reduce((soma, r) => soma + (r.pontos ?? 0), 0);

  return (
    <main className="min-h-screen bg-steel-50">
      <header className="bg-navy text-white px-4 py-5 sm:px-6">
        <Link href={`/leaderboard/${dupla.categoria_id}`} className="text-royal-light text-sm">
          ← {(dupla as any).categorias?.nome}
        </Link>
        <h1 className="font-display text-2xl font-bold mt-1">{dupla.nome_dupla}</h1>
        <p className="text-steel-200 text-sm mt-1">
          {dupla.atleta_1} & {dupla.atleta_2}
        </p>
      </header>

      <div className="px-4 py-6 sm:px-6">
        <div className="overflow-hidden rounded-xl bg-white shadow-sm border border-steel-100">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-navy-light text-white">
                <th className="px-3 py-3 text-left font-display font-semibold">Prova</th>
                <th className="px-3 py-3 text-center font-display font-semibold">Resultado</th>
                <th className="px-3 py-3 text-center font-display font-semibold">Colocação</th>
                <th className="px-3 py-3 text-center font-display font-semibold">Pontos</th>
              </tr>
            </thead>
            <tbody>
              {provasPublicadas.map((prova) => {
                const resultado = resultadoPorProva.get(prova.id);
                return (
                  <tr key={prova.id} className="border-b border-steel-100 last:border-0">
                    <td className="px-3 py-3 font-medium text-navy">
                      P{prova.numero}
                      {prova.nome ? ` — ${prova.nome}` : ""}
                    </td>
                    <td className="px-3 py-3 text-center text-steel-600">
                      {formatResultado(prova, resultado) ?? "Não participou"}
                    </td>
                    <td className="px-3 py-3 text-center text-steel-600">
                      {resultado?.colocacao ? `${resultado.colocacao}º` : "—"}
                    </td>
                    <td className="px-3 py-3 text-center font-semibold text-royal">
                      {resultado?.pontos ?? 0}
                    </td>
                  </tr>
                );
              })}
              {!provasPublicadas.length && (
                <tr>
                  <td colSpan={4} className="px-3 py-8 text-center text-steel-400">
                    Nenhum resultado publicado ainda.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <p className="mt-4 text-right font-display text-xl font-bold text-navy">
          Total: <span className="text-royal">{total} pontos</span>
        </p>
      </div>
    </main>
  );
}
