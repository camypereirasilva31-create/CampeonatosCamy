"use client";

import { useMemo, useState } from "react";
import { aplicarAjusteLeaderboard, calcularRankingGeral, formatTempo } from "@/lib/scoring";
import type { AjusteLeaderboard, Categoria, Dupla, Prova, Resultado } from "@/lib/types";
import { salvarAjusteLeaderboard } from "../actions";

function formatResultadoInterno(prova: Prova, resultado: Resultado | undefined): string | null {
  if (!resultado) return null;
  switch (prova.tipo) {
    case "PESO": return resultado.peso_lb != null ? `${resultado.peso_lb} lb` : null;
    case "REPETICOES": return resultado.repeticoes != null ? `${resultado.repeticoes}` : null;
    case "FOR_TIME": return resultado.tempo_seconds != null ? formatTempo(resultado.tempo_seconds) : null;
    case "FOR_TIME_CAP":
      if (resultado.tomou_cap) return resultado.repeticoes_faltantes != null ? `CAP + ${resultado.repeticoes_faltantes}` : "CAP";
      return resultado.tempo_seconds != null ? formatTempo(resultado.tempo_seconds) : null;
    default: return null;
  }
}

export default function LeaderboardOffClient({ categorias, duplas, provas, resultados, ajustesIniciais }: {
  categorias: Categoria[]; duplas: Dupla[]; provas: Prova[]; resultados: Resultado[]; ajustesIniciais: AjusteLeaderboard[];
}) {
  const [categoriaId, setCategoriaId] = useState(categorias[0]?.id ?? "");
  const [ajustes, setAjustes] = useState(ajustesIniciais);
  const [modalAberto, setModalAberto] = useState(false);
  const [ordemEdicao, setOrdemEdicao] = useState<string[]>([]);
  const [arrastando, setArrastando] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);
  const [mensagem, setMensagem] = useState("");

  const categoria = categorias.find((c) => String(c.id) === String(categoriaId));
  const duplasCategoria = useMemo(() => duplas.filter((d) => String(d.categoria_id) === String(categoriaId)), [duplas, categoriaId]);
  const provasOrdenadas = useMemo(() => [...provas].sort((a, b) => a.numero - b.numero), [provas]);
  const rankingBase = useMemo(() => calcularRankingGeral(duplasCategoria, provasOrdenadas, resultados), [duplasCategoria, provasOrdenadas, resultados]);
  const ajustesCategoria = useMemo(() => ajustes.filter((a) => String(a.categoria_id) === String(categoriaId)), [ajustes, categoriaId]);
  const ranking = useMemo(() => aplicarAjusteLeaderboard(rankingBase, ajustesCategoria), [rankingBase, ajustesCategoria]);

  const resultadoPorChave = useMemo(() => {
    const mapa = new Map<string, Resultado>();
    for (const resultado of resultados) mapa.set(`${resultado.prova_id}:${resultado.dupla_id}`, resultado);
    return mapa;
  }, [resultados]);

  function abrirAjuste() {
    setOrdemEdicao(ranking.map((linha) => linha.dupla_id));
    setMensagem("");
    setModalAberto(true);
  }

  function moverArrastando(destinoId: string) {
    if (!arrastando || arrastando === destinoId) return;
    setOrdemEdicao((atual) => {
      const nova = [...atual];
      const origem = nova.indexOf(arrastando);
      const destino = nova.indexOf(destinoId);
      if (origem < 0 || destino < 0) return atual;
      nova.splice(origem, 1);
      nova.splice(destino, 0, arrastando);
      return nova;
    });
  }

  async function salvar() {
    setSalvando(true);
    const resposta = await salvarAjusteLeaderboard(categoriaId, ordemEdicao);
    if (resposta.ok) {
      setAjustes(ordemEdicao.map((dupla_id, index) => ({ categoria_id: categoriaId, dupla_id, posicao: index + 1 })));
      setModalAberto(false);
      setMensagem("Classificação salva.");
    } else {
      setMensagem(resposta.message);
    }
    setSalvando(false);
  }

  return (
    <div>
      <div className="rounded-xl bg-white shadow-sm border border-steel-100 p-4 mb-5">
        <label className="block text-xs font-medium text-steel-600 mb-1">Categoria</label>
        <select value={categoriaId} onChange={(e) => setCategoriaId(e.target.value)} className="w-full rounded-lg border border-steel-200 bg-white px-3 py-2.5 text-sm text-navy outline-none focus:border-royal">
          {categorias.map((item) => <option key={item.id} value={item.id}>{item.nome}</option>)}
        </select>
      </div>

      <div className="flex items-center justify-between gap-3 mb-4">
        <div>
          <h2 className="font-display text-xl font-bold text-navy">{categoria?.nome ?? "Leaderboard"}</h2>
          <p className="text-xs text-steel-600 mt-1">Todas as provas estão visíveis para conferência interna.</p>
        </div>
        <div className="flex gap-2">
          <button type="button" onClick={abrirAjuste} disabled={ranking.length < 2} className="shrink-0 rounded-lg bg-royal px-3 py-2 text-sm font-medium text-white hover:bg-royal/90 disabled:opacity-50">Ajustar empate</button>
          <button type="button" onClick={() => window.location.reload()} className="shrink-0 rounded-lg border border-steel-200 bg-white px-3 py-2 text-sm font-medium text-navy hover:bg-steel-50">Atualizar</button>
        </div>
      </div>
      {mensagem && <p className="mb-3 text-sm text-royal">{mensagem}</p>}

      <div className="overflow-x-auto rounded-xl bg-white shadow-sm border border-steel-100">
        <table className="w-full min-w-[760px] text-sm">
          <thead><tr className="bg-navy text-white">
            <th className="px-3 py-3 text-left font-display font-semibold w-12">Pos.</th>
            <th className="px-3 py-3 text-left font-display font-semibold">Dupla</th>
            {provasOrdenadas.map((prova) => <th key={prova.id} className="px-3 py-3 text-center font-display font-semibold whitespace-nowrap"><div>P{prova.numero}</div>{!prova.publicado && <div className="text-[10px] font-normal text-royal-light mt-0.5">OFF</div>}</th>)}
            <th className="px-3 py-3 text-center font-display font-semibold">Total</th>
          </tr></thead>
          <tbody>{ranking.map((linha, idx) => {
            const posicao = idx + 1;
            const destaque = posicao <= 3 ? "bg-royal/10" : "bg-white";
            return <tr key={linha.dupla_id} className={`border-b border-steel-100 last:border-0 ${destaque}`}>
              <td className="px-3 py-3 font-display font-bold text-navy">{posicao}</td>
              <td className="px-3 py-3 font-medium text-navy whitespace-nowrap">{linha.nome_dupla}</td>
              {provasOrdenadas.map((prova) => {
                const resultado = resultadoPorChave.get(`${prova.id}:${linha.dupla_id}`);
                const textoResultado = formatResultadoInterno(prova, resultado);
                const pontos = resultado?.pontos ?? 0;
                return <td key={prova.id} className="px-3 py-3 text-center whitespace-nowrap">{textoResultado ? <div><span className="font-bold text-navy">{textoResultado}</span><span className="ml-1 text-xs font-normal text-steel-600">({pontos} pts)</span></div> : <span className="text-steel-400">—</span>}</td>;
              })}
              <td className="px-3 py-3 text-center font-display font-bold text-royal">{linha.totalPontos}</td>
            </tr>;
          })}</tbody>
        </table>
      </div>

      {modalAberto && <div className="fixed inset-0 z-50 flex items-center justify-center bg-navy/60 p-4">
        <div className="w-full max-w-lg rounded-2xl bg-white shadow-xl">
          <div className="flex items-center justify-between border-b border-steel-100 px-5 py-4">
            <div><h3 className="font-display text-lg font-bold text-navy">Ajustar classificação</h3><p className="text-xs text-steel-600 mt-1">Arraste as duplas para definir a ordem final.</p></div>
            <button type="button" onClick={() => setModalAberto(false)} className="text-xl text-steel-500 hover:text-navy">×</button>
          </div>
          <div className="max-h-[60vh] overflow-y-auto p-4">
            {ordemEdicao.map((id, index) => {
              const dupla = duplasCategoria.find((d) => d.id === id);
              if (!dupla) return null;
              return <div key={id} draggable onDragStart={() => setArrastando(id)} onDragOver={(e) => e.preventDefault()} onDrop={() => { moverArrastando(id); setArrastando(null); }} className="mb-2 flex cursor-grab items-center gap-3 rounded-lg border border-steel-200 bg-steel-50 px-3 py-3 active:cursor-grabbing">
                <span className="w-7 font-display font-bold text-navy">{index + 1}º</span><span className="flex-1 font-medium text-navy">{dupla.nome_dupla}</span><span className="text-steel-400">☷</span>
              </div>;
            })}
          </div>
          <div className="flex justify-end gap-2 border-t border-steel-100 px-5 py-4">
            <button type="button" onClick={() => setModalAberto(false)} className="rounded-lg border border-steel-200 px-4 py-2 text-sm font-medium text-navy">Cancelar</button>
            <button type="button" onClick={salvar} disabled={salvando} className="rounded-lg bg-royal px-4 py-2 text-sm font-medium text-white disabled:opacity-50">{salvando ? "Salvando..." : "Salvar classificação"}</button>
          </div>
        </div>
      </div>}
    </div>
  );
}
