"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { aplicarAjusteLeaderboard, calcularRankingGeral, formatResultado } from "@/lib/scoring";
import type { AjusteLeaderboard, Dupla, Prova, Resultado } from "@/lib/types";

export default function LeaderboardClient({ categoriaId, duplasIniciais, provasIniciais, resultadosIniciais, ajustesIniciais }: {
  categoriaId: string; duplasIniciais: Dupla[]; provasIniciais: Prova[]; resultadosIniciais: Resultado[]; ajustesIniciais: AjusteLeaderboard[];
}) {
  const [duplas, setDuplas] = useState(duplasIniciais);
  const [provas, setProvas] = useState(provasIniciais);
  const [resultados, setResultados] = useState(resultadosIniciais);
  const [ajustes, setAjustes] = useState(ajustesIniciais);

  const recarregar = useCallback(async () => {
    const supabase = createClient();
    const [duplasRes, provasRes, ajustesRes] = await Promise.all([
      supabase.from("duplas").select("*").eq("categoria_id", categoriaId).order("nome_dupla"),
      supabase.from("provas").select("*").order("numero"),
      supabase.from("leaderboard_ajustes").select("categoria_id, dupla_id, posicao").eq("categoria_id", categoriaId).order("posicao"),
    ]);
    const provasAtuais = (provasRes.data ?? []) as Prova[];
    const provaIds = provasAtuais.filter((p) => p.publicado).map((p) => p.id);
    const resultadosRes = provaIds.length ? await supabase.from("resultados").select("*").in("prova_id", provaIds) : { data: [] };
    setDuplas((duplasRes.data ?? []) as Dupla[]);
    setProvas(provasAtuais);
    setResultados((resultadosRes.data ?? []) as Resultado[]);
    setAjustes((ajustesRes.data ?? []) as AjusteLeaderboard[]);
  }, [categoriaId]);

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase.channel("leaderboard-publico")
      .on("postgres_changes", { event: "*", schema: "public", table: "resultados" }, recarregar)
      .on("postgres_changes", { event: "*", schema: "public", table: "provas" }, recarregar)
      .on("postgres_changes", { event: "*", schema: "public", table: "leaderboard_ajustes" }, recarregar)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [recarregar]);

  const provasPublicadas = useMemo(() => provas.filter((p) => p.publicado).sort((a, b) => a.numero - b.numero), [provas]);
  const rankingBase = useMemo(() => calcularRankingGeral(duplas, provasPublicadas, resultados), [duplas, provasPublicadas, resultados]);
  const ranking = useMemo(() => aplicarAjusteLeaderboard(rankingBase, ajustes.filter((a) => String(a.categoria_id) === String(categoriaId))), [rankingBase, ajustes, categoriaId]);
  const resultadoPorChave = useMemo(() => new Map(resultados.map((r) => [`${r.prova_id}:${r.dupla_id}`, r])), [resultados]);

  return (
    <div className="px-2 py-4 sm:px-6 sm:py-8">
      <div className="overflow-x-auto rounded-xl bg-white shadow-sm border border-steel-100">
        <table className="w-full min-w-[760px] text-sm">
          <thead><tr className="bg-navy text-white">
            <th className="px-3 py-3 text-left font-display font-semibold w-12">Pos.</th>
            <th className="px-3 py-3 text-left font-display font-semibold">Dupla</th>
            {provasPublicadas.map((prova) => <th key={prova.id} className="px-3 py-3 text-center font-display font-semibold whitespace-nowrap">P{prova.numero}</th>)}
            <th className="px-3 py-3 text-center font-display font-semibold">Total</th>
          </tr></thead>
          <tbody>{ranking.map((linha, idx) => {
            const posicao = idx + 1;
            const destaque = posicao <= 3 ? "bg-royal/10" : "bg-white";
            return <tr key={linha.dupla_id} className={`border-b border-steel-100 last:border-0 ${destaque}`}>
              <td className="px-3 py-3 font-display font-bold text-navy">{posicao}</td>
              <td className="px-3 py-3"><Link href={`/dupla/${linha.dupla_id}`} className="font-medium text-navy hover:text-royal">{linha.nome_dupla}</Link></td>
              {provasPublicadas.map((prova) => {
                const resultado = resultadoPorChave.get(`${prova.id}:${linha.dupla_id}`);
                const texto = formatResultado(prova, resultado);
                const pontos = resultado?.pontos ?? 0;
                return <td key={prova.id} className="px-3 py-3 text-center whitespace-nowrap">{texto ? <><span className="font-bold text-navy">{texto}</span><span className="ml-1 text-xs font-normal text-steel-500">({pontos} pts)</span></> : <span className="text-steel-400">—</span>}</td>;
              })}
              <td className="px-3 py-3 text-center font-display font-bold text-royal">{linha.totalPontos}</td>
            </tr>;
          })}</tbody>
        </table>
      </div>
      {!provasPublicadas.length && <p className="mt-4 text-center text-steel-400 text-sm">Nenhum resultado publicado ainda. Volte em breve.</p>}
    </div>
  );
}
