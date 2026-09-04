"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { lancarResultado, definirPublicacaoProva } from "@/app/admin/actions";
import type { Categoria, Dupla, Prova, Resultado } from "@/lib/types";

type Props = {
  categorias: Categoria[];
  provas: Prova[];
};

type LinhaEdicao = {
  peso_lb: string;
  repeticoes: string;
  tempo_min: string;
  tempo_seg: string;
  tomou_cap: boolean;
  repeticoes_faltantes: string;
};

const linhaVazia: LinhaEdicao = {
  peso_lb: "",
  repeticoes: "",
  tempo_min: "",
  tempo_seg: "",
  tomou_cap: false,
  repeticoes_faltantes: "",
};

export default function ResultadosClient(props: Props) {
  const categorias = props.categorias;
  const [listaProvas, setListaProvas] = useState<Prova[]>(props.provas);

  const [categoriaSelecionada, setCategoriaSelecionada] = useState<string>("");
  const [provaSelecionada, setProvaSelecionada] = useState<string>("");

  const [listaDuplas, setListaDuplas] = useState<Dupla[]>([]);
  const [listaResultados, setListaResultados] = useState<Resultado[]>([]);
  const [edicoes, setEdicoes] = useState<Record<string, LinhaEdicao>>({});

  const [carregando, setCarregando] = useState(false);
  const [salvandoId, setSalvandoId] = useState<string | null>(null);
  const [publicando, setPublicando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const provaAtual = listaProvas.find(
    (p) => String(p.id) === String(provaSelecionada)
  );
  const provasEmOrdem = [...listaProvas].sort((a, b) => a.numero - b.numero);

  // Busca as duplas da categoria + os resultados já lançados para a prova,
  // sempre que a Categoria ou a Prova selecionada mudar.
  useEffect(() => {
    let ativo = true;

    async function buscar() {
      if (!categoriaSelecionada || !provaSelecionada) {
        setListaDuplas([]);
        setListaResultados([]);
        setEdicoes({});
        return;
      }

      setCarregando(true);
      setErro(null);

      const supabase = createClient();

      const respostaDuplas = await supabase
        .from("duplas")
        .select("*")
        .eq("categoria_id", categoriaSelecionada)
        .order("nome_dupla");

      const respostaResultados = await supabase
        .from("resultados")
        .select("*")
        .eq("prova_id", provaSelecionada);

      if (!ativo) return;

      if (respostaDuplas.error) {
        setErro(`Erro ao buscar duplas: ${respostaDuplas.error.message}`);
        setCarregando(false);
        return;
      }
      if (respostaResultados.error) {
        setErro(`Erro ao buscar resultados: ${respostaResultados.error.message}`);
        setCarregando(false);
        return;
      }

      const duplas = (respostaDuplas.data ?? []) as Dupla[];
      const resultados = (respostaResultados.data ?? []) as Resultado[];

      setListaDuplas(duplas);
      setListaResultados(resultados);

      const proximasEdicoes: Record<string, LinhaEdicao> = {};
      for (const dupla of duplas) {
        const resultadoExistente = resultados.find((r) => r.dupla_id === dupla.id);
        if (!resultadoExistente) {
          proximasEdicoes[dupla.id] = linhaVazia;
          continue;
        }
        const minutos =
          resultadoExistente.tempo_seconds != null
            ? Math.floor(resultadoExistente.tempo_seconds / 60)
            : null;
        const segundos =
          resultadoExistente.tempo_seconds != null
            ? resultadoExistente.tempo_seconds % 60
            : null;
        proximasEdicoes[dupla.id] = {
          peso_lb: resultadoExistente.peso_lb != null ? String(resultadoExistente.peso_lb) : "",
          repeticoes:
            resultadoExistente.repeticoes != null ? String(resultadoExistente.repeticoes) : "",
          tempo_min: minutos != null ? String(minutos) : "",
          tempo_seg: segundos != null ? String(segundos).padStart(2, "0") : "",
          tomou_cap: resultadoExistente.tomou_cap,
          repeticoes_faltantes:
            resultadoExistente.repeticoes_faltantes != null
              ? String(resultadoExistente.repeticoes_faltantes)
              : "",
        };
      }
      setEdicoes(proximasEdicoes);
      setCarregando(false);
    }

    buscar();
    return () => {
      ativo = false;
    };
  }, [categoriaSelecionada, provaSelecionada]);

  function atualizarCampo(duplaId: string, campo: keyof LinhaEdicao, valor: string | boolean) {
    setEdicoes((atual) => ({
      ...atual,
      [duplaId]: { ...(atual[duplaId] ?? linhaVazia), [campo]: valor },
    }));
  }

  async function salvar(dupla: Dupla) {
    if (!provaAtual) return;
    setErro(null);
    setSalvandoId(dupla.id);

    const linha = edicoes[dupla.id] ?? linhaVazia;
    const temTempo = linha.tempo_min !== "" || linha.tempo_seg !== "";
    const tempoEmSegundos = temTempo
      ? Number(linha.tempo_min || 0) * 60 + Number(linha.tempo_seg || 0)
      : null;

    try {
      await lancarResultado({
        prova_id: provaAtual.id,
        dupla_id: dupla.id,
        peso_lb: provaAtual.tipo === "PESO" ? Number(linha.peso_lb) : null,
        repeticoes: provaAtual.tipo === "REPETICOES" ? Number(linha.repeticoes) : null,
        tempo_seconds:
          provaAtual.tipo === "FOR_TIME" ||
          (provaAtual.tipo === "FOR_TIME_CAP" && !linha.tomou_cap)
            ? tempoEmSegundos
            : null,
        tomou_cap: provaAtual.tipo === "FOR_TIME_CAP" ? linha.tomou_cap : false,
        repeticoes_faltantes:
          provaAtual.tipo === "FOR_TIME_CAP" && linha.tomou_cap
            ? Number(linha.repeticoes_faltantes)
            : null,
      });
    } catch (e: any) {
      setErro(e?.message ?? "Erro ao salvar o resultado.");
    } finally {
      setSalvandoId(null);
    }
  }

  async function alternarPublicacao() {
    if (!provaAtual) return;
    setPublicando(true);
    try {
      await definirPublicacaoProva(provaAtual.id, !provaAtual.publicado);
      setListaProvas((atual) =>
        atual.map((p) =>
          String(p.id) === String(provaAtual.id) ? { ...p, publicado: !p.publicado } : p
        )
      );
    } finally {
      setPublicando(false);
    }
  }

  return (
    <div>
      <div className="bg-white rounded-xl border border-steel-100 p-5 mb-6 grid gap-3 sm:grid-cols-2">
        <div>
          <label className="block text-xs text-steel-600 mb-1">Categoria</label>
          <select
            value={categoriaSelecionada}
            onChange={(e) => setCategoriaSelecionada(e.target.value)}
            className="w-full rounded-lg border border-steel-200 px-3 py-2 text-sm"
          >
            <option value="">Selecione…</option>
            {categorias.map((categoria) => (
              <option key={categoria.id} value={categoria.id}>
                {categoria.nome}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs text-steel-600 mb-1">Prova</label>
          <select
            value={provaSelecionada}
            onChange={(e) => setProvaSelecionada(e.target.value)}
            className="w-full rounded-lg border border-steel-200 px-3 py-2 text-sm"
          >
            <option value="">Selecione…</option>
            {provasEmOrdem.map((prova) => (
              <option key={prova.id} value={prova.id}>
                P{prova.numero}
                {prova.nome ? ` — ${prova.nome}` : ""}
              </option>
            ))}
          </select>
        </div>
      </div>

      {erro && <p className="text-sm text-red-600 mb-4">{erro}</p>}

      {provaAtual && (
        <div className="bg-white rounded-xl border border-steel-100 p-4 mb-4 flex items-center justify-between gap-3">
          <div className="text-sm">
            <span className="font-medium text-navy">
              P{provaAtual.numero}
              {provaAtual.nome ? ` — ${provaAtual.nome}` : ""}
            </span>{" "}
            está{" "}
            <span
              className={
                provaAtual.publicado ? "text-green-700 font-medium" : "text-steel-500 font-medium"
              }
            >
              {provaAtual.publicado ? "publicada" : "não publicada"}
            </span>
          </div>
          <button
            onClick={alternarPublicacao}
            disabled={publicando}
            className={`shrink-0 rounded-lg px-4 py-2 text-sm font-medium text-white disabled:opacity-50 ${
              provaAtual.publicado ? "bg-steel-500 hover:bg-steel-600" : "bg-royal hover:bg-royal-dark"
            }`}
          >
            {publicando ? "Salvando…" : provaAtual.publicado ? "Despublicar" : "Publicar"}
          </button>
        </div>
      )}

      {provaAtual && carregando && (
        <p className="text-sm text-steel-400 px-1">Carregando duplas…</p>
      )}

      {provaAtual && !carregando && (
        <div className="bg-white rounded-xl border border-steel-100 overflow-hidden">
          {listaDuplas.length === 0 && (
            <p className="px-4 py-8 text-center text-steel-400 text-sm">
              Nenhuma dupla cadastrada nesta categoria.
            </p>
          )}

          {listaDuplas.map((dupla) => {
            const linha = edicoes[dupla.id] ?? linhaVazia;
            return (
              <div
                key={dupla.id}
                className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 px-4 py-3 border-b border-steel-100 last:border-0"
              >
                <span className="font-medium text-navy sm:w-48 shrink-0">
                  {dupla.nome_dupla}
                </span>

                <div className="flex-1 flex flex-wrap items-center gap-2">
                  {provaAtual.tipo === "PESO" && (
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        step="0.1"
                        placeholder="lb"
                        value={linha.peso_lb}
                        onChange={(e) => atualizarCampo(dupla.id, "peso_lb", e.target.value)}
                        className="w-24 rounded-lg border border-steel-200 px-2 py-1.5 text-sm"
                      />
                      <span className="text-steel-400 text-xs">lb</span>
                    </div>
                  )}

                  {provaAtual.tipo === "REPETICOES" && (
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        placeholder="reps"
                        value={linha.repeticoes}
                        onChange={(e) => atualizarCampo(dupla.id, "repeticoes", e.target.value)}
                        className="w-24 rounded-lg border border-steel-200 px-2 py-1.5 text-sm"
                      />
                      <span className="text-steel-400 text-xs">reps</span>
                    </div>
                  )}

                  {provaAtual.tipo === "FOR_TIME" && (
                    <div className="flex items-center gap-1">
                      <input
                        type="number"
                        placeholder="mm"
                        value={linha.tempo_min}
                        onChange={(e) => atualizarCampo(dupla.id, "tempo_min", e.target.value)}
                        className="w-16 rounded-lg border border-steel-200 px-2 py-1.5 text-sm"
                      />
                      <span className="text-steel-400">:</span>
                      <input
                        type="number"
                        placeholder="ss"
                        value={linha.tempo_seg}
                        onChange={(e) => atualizarCampo(dupla.id, "tempo_seg", e.target.value)}
                        className="w-16 rounded-lg border border-steel-200 px-2 py-1.5 text-sm"
                      />
                    </div>
                  )}

                  {provaAtual.tipo === "FOR_TIME_CAP" && (
                    <div className="flex flex-wrap items-center gap-2">
                      <label className="flex items-center gap-1.5 text-xs text-steel-600">
                        <input
                          type="checkbox"
                          checked={linha.tomou_cap}
                          onChange={(e) => atualizarCampo(dupla.id, "tomou_cap", e.target.checked)}
                        />
                        CAP
                      </label>
                      {!linha.tomou_cap ? (
                        <div className="flex items-center gap-1">
                          <input
                            type="number"
                            placeholder="mm"
                            value={linha.tempo_min}
                            onChange={(e) => atualizarCampo(dupla.id, "tempo_min", e.target.value)}
                            className="w-16 rounded-lg border border-steel-200 px-2 py-1.5 text-sm"
                          />
                          <span className="text-steel-400">:</span>
                          <input
                            type="number"
                            placeholder="ss"
                            value={linha.tempo_seg}
                            onChange={(e) => atualizarCampo(dupla.id, "tempo_seg", e.target.value)}
                            className="w-16 rounded-lg border border-steel-200 px-2 py-1.5 text-sm"
                          />
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-steel-400">CAP +</span>
                          <input
                            type="number"
                            placeholder="reps faltantes"
                            value={linha.repeticoes_faltantes}
                            onChange={(e) =>
                              atualizarCampo(dupla.id, "repeticoes_faltantes", e.target.value)
                            }
                            className="w-28 rounded-lg border border-steel-200 px-2 py-1.5 text-sm"
                          />
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <button
                  onClick={() => salvar(dupla)}
                  disabled={salvandoId === dupla.id}
                  className="shrink-0 text-royal text-sm font-medium disabled:opacity-50"
                >
                  {salvandoId === dupla.id ? "Salvando…" : "Salvar"}
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
