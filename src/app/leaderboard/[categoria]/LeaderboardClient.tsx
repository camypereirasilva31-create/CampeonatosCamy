"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { calcularRankingGeral, formatTempo } from "@/lib/scoring";
import type { Dupla, Prova, Resultado } from "@/lib/types";

/** Formata só o RESULTADO (não os pontos) de uma prova para exibição no
 * leaderboard público. Não usa formatResultado() de lib/scoring.ts de
 * propósito: aquela função escreve "reps" no resultado de Repetições, e
 * aqui isso não deve aparecer — sem tocar na formatação usada na tela de
 * detalhamento da dupla. */
function formatResultadoLeaderboard(prova: Prova, resultado: Resultado | undefined): string | null {
  if (!resultado) return null;
  switch (prova.tipo) {
    case "PESO":
      return resultado.peso_lb != null ? `${resultado.peso_lb} lb` : null;
    case "REPETICOES":
      return resultado.repeticoes != null ? `${resultado.repeticoes}` : null;
    case "FOR_TIME":
      return resultado.tempo_seconds != null ? formatTempo(resultado.tempo_seconds) : null;
    case "FOR_TIME_CAP":
      if (resultado.tomou_cap) {
        return resultado.repeticoes_faltantes != null ? `CAP +${resultado.repeticoes_faltantes}` : null;
      }
      return resultado.tempo_seconds != null ? formatTempo(resultado.tempo_seconds) : null;
    default:
      return null;
  }
}

export default function LeaderboardClient({
  categoriaId,
  duplasIniciais,
  provasIniciais,
  resultadosIniciais,
}: {
  categoriaId: string;
  duplasIniciais: Dupla[];
  provasIniciais: Prova[];
  resultadosIniciais: Resultado[];
}) {
  const [duplas, setDuplas] = useState(duplasIniciais);
  const [provas, setProvas] = useState(provasIniciais);
  const [resultados, setResultados] = useState(resultadosIniciais);

  const recarregar = useCallback(async () => {
    const supabase = createClient();
    const [duplasRes, provasRes] = await Promise.all([
      supabase.from("duplas").select("*").eq("categoria_id", categoriaId).order("nome_dupla"),
      supabase.from("provas").select("*").order("numero"),
    ]);
    const provasAtuais = (provasRes.data ?? []) as Prova[];
    const provaIds = provasAtuais.map((p) => p.id);
    const resultadosRes = provaIds.length
      ? await supabase.from("resultados").select("*").in("prova_id", provaIds)
      : { data: [] };

    setDuplas((duplasRes.data ?? []) as Dupla[]);
    setProvas(provasAtuais);
    setResultados((resultadosRes.data ?? []) as Resultado[]);
  }, [categoriaId]);

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel("leaderboard-publico")
      .on("postgres_changes", { event: "*", schema: "public", table: "resultados" }, recarregar)
      .on("postgres_changes", { event: "*", schema: "public", table: "provas" }, recarregar)
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [recarregar]);

  const provasPublicadas = provas.filter((p) => p.publicado).sort((a, b) => a.numero - b.numero);
  const ranking = calcularRankingGeral(duplas, provasPublicadas, resultados);

  return (
    <div className="px-2 py-4 sm:px-6 sm:py-8">
      <div className="overflow-x-auto rounded-xl bg-white shadow-sm border border-steel-100">
        <table className="sm:w-full text-sm">
          <thead>
            <tr className="bg-navy text-white">
              <th className="px-3 py-3 text-left font-display font-semibold w-12 whitespace-nowrap">
                Pos.
              </th>
              <th className="px-3 py-3 text-left font-display font-semibold whitespace-nowrap">
                Dupla
              </th>
              {provasPublicadas.map((prova) => (
                <th key={prova.id} className="px-3 py-3 text-center font-display font-semibold whitespace-nowrap">
                  P{prova.numero}
                </th>
              ))}
              <th className="px-3 py-3 text-center font-display font-semibold">Total</th>
            </tr>
          </thead>
          <tbody>
            {ranking.map((linha, idx) => {
              const posicao = idx + 1;
              const destaque = posicao <= 3 ? "bg-royal/5 border-l-4 border-royal" : "bg-steel-50";
              return (
                <tr
                  key={linha.dupla_id}
                  className={`border-b border-steel-100 last:border-0 ${destaque}`}
                >
                  <td className="px-3 py-3 font-display font-bold text-navy">{posicao}</td>
                  <td className="px-3 py-3 whitespace-nowrap">
                    <Link
                      href={`/dupla/${linha.dupla_id}`}
                      className="font-medium text-navy hover:text-royal"
                    >
                      {linha.nome_dupla}
                    </Link>
                  </td>
                  {provasPublicadas.map((prova) => {
                    const resultado = resultados.find(
                      (r) => r.dupla_id === linha.dupla_id && r.prova_id === prova.id
                    );
                    const textoResultado = formatResultadoLeaderboard(prova, resultado);
                    const pontos = linha.pontosPorProva[prova.id];
                    return (
                      <td key={prova.id} className="px-3 py-3 text-center whitespace-nowrap">
                        {textoResultado != null ? (
                          <>
                            <span className="font-bold text-navy">{textoResultado}</span>{" "}
                            <span className="text-xs font-normal text-steel-400">
                              ({pontos ?? 0} pts)
                            </span>
                          </>
                        ) : (
                          <span className="text-steel-300">—</span>
                        )}
                      </td>
                    );
                  })}
                  <td className="px-3 py-3 text-center font-display font-bold text-royal">
                    {linha.totalPontos}
                  </td>
                </tr>
              );
            })}
            {!ranking.length && (
              <tr>
                <td colSpan={provasPublicadas.length + 3} className="px-3 py-8 text-center text-steel-400">
                  Nenhuma dupla cadastrada nesta categoria ainda.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      {!provasPublicadas.length && (
        <p className="mt-4 text-center text-steel-400 text-sm">
          Nenhum resultado publicado ainda. Volte em breve.
        </p>
      )}
    </div>
  );
}
