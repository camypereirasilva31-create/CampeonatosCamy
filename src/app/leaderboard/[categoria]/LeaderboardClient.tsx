"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { calcularRankingGeral } from "@/lib/scoring";
import type { Dupla, Prova, Resultado } from "@/lib/types";

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
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-navy text-white">
              <th className="px-3 py-3 text-left font-display font-semibold w-12">Pos.</th>
              <th className="px-3 py-3 text-left font-display font-semibold">Dupla</th>
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
              const destaque =
                posicao === 1
                  ? "bg-royal/10 border-l-4 border-royal"
                  : posicao === 2
                  ? "bg-steel-100 border-l-4 border-steel-400"
                  : posicao === 3
                  ? "bg-steel-50 border-l-4 border-steel-200"
                  : "";
              return (
                <tr
                  key={linha.dupla_id}
                  className={`border-b border-steel-100 last:border-0 ${destaque}`}
                >
                  <td className="px-3 py-3 font-display font-bold text-navy">{posicao}</td>
                  <td className="px-3 py-3">
                    <Link
                      href={`/dupla/${linha.dupla_id}`}
                      className="font-medium text-navy hover:text-royal"
                    >
                      {linha.nome_dupla}
                    </Link>
                  </td>
                  {provasPublicadas.map((prova) => (
                    <td key={prova.id} className="px-3 py-3 text-center text-steel-600">
                      {linha.pontosPorProva[prova.id] ?? "—"}
                    </td>
                  ))}
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
