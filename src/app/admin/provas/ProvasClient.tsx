"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { criarProva, definirPublicacaoProva } from "../actions";
import type { Prova, TipoProva } from "@/lib/types";

const rotuloTipo: Record<TipoProva, string> = {
  PESO: "Peso (lb)",
  REPETICOES: "Repetições",
  FOR_TIME: "For Time",
  FOR_TIME_CAP: "For Time + CAP",
};

const vazio = {
  numero: "",
  nome: "",
  tipo: "FOR_TIME" as TipoProva,
  cap_min: "",
};

export default function ProvasClient({ provasIniciais }: { provasIniciais: Prova[] }) {
  const router = useRouter();
  const provas = provasIniciais;
  const [form, setForm] = useState(vazio);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const ultimaProva = [...provas].sort((a, b) => b.numero - a.numero)[0];

  async function salvar(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);
    if (!form.numero || !form.tipo) {
      setErro("Preencha número e tipo da prova.");
      return;
    }
    if (form.tipo === "FOR_TIME_CAP" && !form.cap_min) {
      setErro("Informe o CAP em minutos.");
      return;
    }
    setSalvando(true);
    try {
      await criarProva({
        numero: Number(form.numero),
        nome: form.nome || null,
        tipo: form.tipo,
        time_cap_seconds: form.tipo === "FOR_TIME_CAP" ? Number(form.cap_min) * 60 : null,
      });
      setForm(vazio);
      router.refresh();
    } catch (e: any) {
      setErro(e.message ?? "Erro ao salvar.");
    } finally {
      setSalvando(false);
    }
  }

  async function alternarPublicacao(prova: Prova) {
    await definirPublicacaoProva(prova.id, !prova.publicado);
    router.refresh();
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[380px_1fr]">
      <form onSubmit={salvar} className="bg-white rounded-xl border border-steel-100 p-5 h-fit">
        <h2 className="font-display font-semibold text-navy mb-4">Cadastrar prova</h2>

        <label className="block text-xs text-steel-600 mb-1">Número</label>
        <input
          type="number"
          min={1}
          value={form.numero}
          onChange={(e) => setForm({ ...form, numero: e.target.value })}
          className="w-full rounded-lg border border-steel-200 px-3 py-2 mb-3 text-sm"
        />

        <label className="block text-xs text-steel-600 mb-1">Nome (opcional)</label>
        <input
          value={form.nome}
          onChange={(e) => setForm({ ...form, nome: e.target.value })}
          placeholder="Ex.: Deadlift"
          className="w-full rounded-lg border border-steel-200 px-3 py-2 mb-3 text-sm"
        />

        <label className="block text-xs text-steel-600 mb-1">Tipo de resultado</label>
        <select
          value={form.tipo}
          onChange={(e) => setForm({ ...form, tipo: e.target.value as TipoProva })}
          className="w-full rounded-lg border border-steel-200 px-3 py-2 mb-3 text-sm"
        >
          {Object.entries(rotuloTipo).map(([valor, rotulo]) => (
            <option key={valor} value={valor}>
              {rotulo}
            </option>
          ))}
        </select>

        {form.tipo === "FOR_TIME_CAP" && (
          <>
            <label className="block text-xs text-steel-600 mb-1">CAP (minutos)</label>
            <input
              type="number"
              min={1}
              value={form.cap_min}
              onChange={(e) => setForm({ ...form, cap_min: e.target.value })}
              className="w-full rounded-lg border border-steel-200 px-3 py-2 mb-3 text-sm"
            />
          </>
        )}

        {erro && <p className="text-sm text-red-600 mb-3">{erro}</p>}

        <button
          type="submit"
          disabled={salvando}
          className="w-full rounded-lg bg-royal hover:bg-royal-dark text-white font-medium py-2 text-sm disabled:opacity-60"
        >
          {salvando ? "Salvando…" : "Cadastrar prova"}
        </button>
      </form>

      <div className="bg-white rounded-xl border border-steel-100 overflow-hidden h-fit">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-steel-50 border-b border-steel-100">
              <th className="px-3 py-2 text-left font-medium text-steel-600">Prova</th>
              <th className="px-3 py-2 text-left font-medium text-steel-600">Tipo</th>
              <th className="px-3 py-2 text-left font-medium text-steel-600">Status</th>
              <th className="px-3 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {[...provas]
              .sort((a, b) => a.numero - b.numero)
              .map((p) => (
                <tr key={p.id} className="border-b border-steel-100 last:border-0">
                  <td className="px-3 py-2 font-medium text-navy">
                    P{p.numero}
                    {p.nome ? ` — ${p.nome}` : ""}
                  </td>
                  <td className="px-3 py-2 text-steel-600">{rotuloTipo[p.tipo]}</td>
                  <td className="px-3 py-2">
                    <span
                      className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                        p.publicado
                          ? "bg-royal/10 text-royal"
                          : "bg-steel-100 text-steel-600"
                      }`}
                    >
                      {p.publicado ? "Publicado" : "Não publicado"}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-right">
                    <button
                      onClick={() => alternarPublicacao(p)}
                      className="text-sm font-medium text-royal"
                    >
                      {p.publicado ? "Despublicar" : "Publicar"}
                    </button>
                  </td>
                </tr>
              ))}
            {!provas.length && (
              <tr>
                <td colSpan={4} className="px-3 py-8 text-center text-steel-400">
                  Nenhuma prova cadastrada ainda.
                </td>
              </tr>
            )}
          </tbody>
        </table>

        {ultimaProva && !ultimaProva.publicado && (
          <div className="p-4 bg-steel-50 border-t border-steel-100">
            <p className="text-xs text-steel-600 mb-2">
              P{ultimaProva.numero} é a última prova cadastrada. Você pode lançar os
              resultados dela em <b>Resultados</b> sem publicar ainda — o organizador vê,
              o público não. Quando estiver pronto:
            </p>
            <button
              onClick={() => alternarPublicacao(ultimaProva)}
              className="w-full rounded-lg bg-navy hover:bg-navy-dark text-white font-display font-semibold py-2.5 text-sm"
            >
              PUBLICAR RESULTADO FINAL
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
