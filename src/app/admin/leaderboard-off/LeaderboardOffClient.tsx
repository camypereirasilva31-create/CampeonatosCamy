"use client";

import { useMemo, useState } from "react";
import { calcularRankingGeral, formatTempo } from "@/lib/scoring";
import type { Categoria, Dupla, Prova, Resultado } from "@/lib/types";

function formatResultadoInterno(prova: Prova, resultado: Resultado | undefined): string | null {
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
        return resultado.repeticoes_faltantes != null
          ? `CAP + ${resultado.repeticoes_faltantes}`
          : "CAP";
      }
      return resultado.tempo_seconds != null ? formatTempo(resultado.tempo_seconds) : null;
    default:
      return null;
  }
}

export default function LeaderboardOffClient({
  categorias,
  duplas,
  provas,
  resultados,
}: {
  categorias: Categoria[];
  duplas: Dupla[];
  provas: Prova[];
  resultados: Resultado[];
}) {
  const [categoriaId, setCategoriaId] = useState(categorias[0]?.id ?? "");

  const categoria = categorias.find((c) => String(c.id) === String(categoriaId));
  const duplasCategoria = useMemo(
    () => duplas.filter((d) => String(d.categoria_id) === String(categoriaId)),
    [duplas, categoriaId]
  );

  const provasOrdenadas = useMemo(
    () => [...provas].sort((a, b) => a.numero - b.numero),
    [provas]
  );

  const ranking = useMemo(
    () => calcularRankingGeral(duplasCategoria, provasOrdenadas, resultados),
    [duplasCategoria, provasOrdenadas, resultados]
  );

  const resultadoPorChave = useMemo(() => {
    const mapa = new Map<string, Resultado>();
    for (const resultado of resultados) {
      mapa.set(`${resultado.prova_id}:${resultado.dupla_id}`, resultado);
    }
    return mapa;
  }, [resultados]);

  return (
    <div>
      <div className="rounded-xl bg-white shadow-sm border border-steel-100 p-4 mb-5">
        <label className="block text-xs font-medium text-steel-600 mb-1">Categoria</label>
        <select
          value={categoriaId}
          onChange={(e) => setCategoriaId(e.target.value)}
          className="w-full rounded-lg border border-steel-200 bg-white px-3 py-2.5 text-sm text-navy outline-none focus:border-royal"
        >
          {categorias.map((item) => (
            <option key={item.id} value={item.id}>
              {item.nome}
            </option>
          ))}
        </select>
      </div>

      <div className="flex items-center justify-between gap-3 mb-4">
        <div>
          <h2 className="font-display text-xl font-bold text-navy">{categoria?.nome ?? "Leaderboard"}</h2>
          <p className="text-xs text-steel-600 mt-1">
            Todas as provas estão visíveis para conferência interna.
          </p>
        </div>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="shrink-0 rounded-lg border border-steel-200 bg-white px-3 py-2 text-sm font-medium text-navy hover:bg-steel-50"
        >
          Atualizar
        </button>
      </div>

      <div className="overflow-x-auto rounded-xl bg-white shadow-sm border border-steel-100">
        <table className="w-full min-w-[760px] text-sm">
          <thead>
            <tr className="bg-navy text-white">
              <th className="px-3 py-3 text-left font-display font-semibold w-12">Pos.</th>
              <th className="px-3 py-3 text-left font-display font-semibold">Dupla</th>
              {provasOrdenadas.map((prova) => (
                <th key={prova.id} className="px-3 py-3 text-center font-display font-semibold whitespace-nowrap">
                  <div>P{prova.numero}</div>
                  {!prova.publicado && (
                    <div className="text-[10px] font-normal text-royal-light mt-0.5">OFF</div>
                  )}
                </th>
              ))}
              <th className="px-3 py-3 text-center font-display font-semibold">Total</th>
            </tr>
          </thead>
          <tbody>
            {ranking.map((linha, idx) => {
              const posicao = idx + 1;
              const destaque = posicao <= 3 ? "bg-royal/10" : "bg-white";

              return (
                <tr key={linha.dupla_id} className={`border-b border-steel-100 last:border-0 ${destaque}`}>
                  <td className="px-3 py-3 font-display font-bold text-navy">{posicao}</td>
                  <td className="px-3 py-3 font-medium text-navy whitespace-nowrap">{linha.nome_dupla}</td>

                  {provasOrdenadas.map((prova) => {
                    const resultado = resultadoPorChave.get(`${prova.id}:${linha.dupla_id}`);
                    const textoResultado = formatResultadoInterno(prova, resultado);
                    const pontos = resultado?.pontos ?? 0;

                    return (
                      <td key={prova.id} className="px-3 py-3 text-center whitespace-nowrap">
                        {textoResultado ? (
                          <div>
                            <span className="font-bold text-navy">{textoResultado}</span>
                            <span className="ml-1 text-xs font-normal text-steel-600">({pontos} pts)</span>
                          </div>
                        ) : (
                          <span className="text-steel-400">—</span>
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
                <td colSpan={provasOrdenadas.length + 3} className="px-3 py-8 text-center text-steel-400">
                  Nenhuma dupla cadastrada nesta categoria ainda.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <p className="mt-3 text-xs text-steel-400">
        “OFF” indica uma prova que ainda não foi publicada para o público.
      </p>
    </div>
  );
}
