"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { criarDupla, editarDupla } from "../actions";
import type { Categoria, Dupla } from "@/lib/types";

const vazio = { categoria_id: "", nome_dupla: "", atleta_1: "", atleta_2: "" };

export default function DuplasClient({
  categorias,
  duplasIniciais,
}: {
  categorias: Categoria[];
  duplasIniciais: Dupla[];
}) {
  const router = useRouter();
  // a lista vem direto das props: router.refresh() busca dados novos no
  // servidor e os repassa aqui, então não há necessidade (nem correção) de
  // duplicar em state local.
  const duplas = duplasIniciais;
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [form, setForm] = useState(vazio);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const nomeCategoria = (id: string) => categorias.find((c) => c.id === id)?.nome ?? "—";

  function iniciarEdicao(dupla: Dupla) {
    setEditandoId(dupla.id);
    setForm({
      categoria_id: dupla.categoria_id,
      nome_dupla: dupla.nome_dupla,
      atleta_1: dupla.atleta_1,
      atleta_2: dupla.atleta_2,
    });
  }

  function cancelar() {
    setEditandoId(null);
    setForm(vazio);
    setErro(null);
  }

  async function salvar(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);
    if (!form.categoria_id || !form.nome_dupla || !form.atleta_1 || !form.atleta_2) {
      setErro("Preencha todos os campos.");
      return;
    }
    setSalvando(true);
    try {
      const resultado = editandoId
        ? await editarDupla(editandoId, form)
        : await criarDupla(form);

      if (!resultado.ok) {
        setErro(resultado.message);
        return;
      }
      cancelar();
      router.refresh();
    } catch (e: any) {
      setErro(e.message ?? "Erro ao salvar.");
    } finally {
      setSalvando(false);
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[380px_1fr]">
      <form
        onSubmit={salvar}
        className="bg-white rounded-xl border border-steel-100 p-5 h-fit"
      >
        <h2 className="font-display font-semibold text-navy mb-4">
          {editandoId ? "Editar dupla" : "Cadastrar dupla"}
        </h2>

        <label className="block text-xs text-steel-600 mb-1">Categoria</label>
        <select
          value={form.categoria_id}
          onChange={(e) => setForm({ ...form, categoria_id: e.target.value })}
          className="w-full rounded-lg border border-steel-200 px-3 py-2 mb-3 text-sm"
        >
          <option value="">Selecione…</option>
          {categorias.map((c) => (
            <option key={c.id} value={c.id}>
              {c.nome}
            </option>
          ))}
        </select>

        <label className="block text-xs text-steel-600 mb-1">Nome da dupla</label>
        <input
          value={form.nome_dupla}
          onChange={(e) => setForm({ ...form, nome_dupla: e.target.value })}
          className="w-full rounded-lg border border-steel-200 px-3 py-2 mb-3 text-sm"
        />

        <label className="block text-xs text-steel-600 mb-1">Atleta 1</label>
        <input
          value={form.atleta_1}
          onChange={(e) => setForm({ ...form, atleta_1: e.target.value })}
          className="w-full rounded-lg border border-steel-200 px-3 py-2 mb-3 text-sm"
        />

        <label className="block text-xs text-steel-600 mb-1">Atleta 2</label>
        <input
          value={form.atleta_2}
          onChange={(e) => setForm({ ...form, atleta_2: e.target.value })}
          className="w-full rounded-lg border border-steel-200 px-3 py-2 mb-4 text-sm"
        />

        {erro && <p className="text-sm text-red-600 mb-3">{erro}</p>}

        <div className="flex gap-2">
          <button
            type="submit"
            disabled={salvando}
            className="flex-1 rounded-lg bg-royal hover:bg-royal-dark text-white font-medium py-2 text-sm disabled:opacity-60"
          >
            {salvando ? "Salvando…" : editandoId ? "Salvar alterações" : "Cadastrar"}
          </button>
          {editandoId && (
            <button
              type="button"
              onClick={cancelar}
              className="rounded-lg border border-steel-200 px-4 py-2 text-sm text-steel-600"
            >
              Cancelar
            </button>
          )}
        </div>
      </form>

      <div className="bg-white rounded-xl border border-steel-100 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-steel-50 border-b border-steel-100">
              <th className="px-3 py-2 text-left font-medium text-steel-600">Dupla</th>
              <th className="px-3 py-2 text-left font-medium text-steel-600">Categoria</th>
              <th className="px-3 py-2 text-left font-medium text-steel-600">Atletas</th>
              <th className="px-3 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {duplas.map((d) => (
              <tr key={d.id} className="border-b border-steel-100 last:border-0">
                <td className="px-3 py-2 font-medium text-navy">{d.nome_dupla}</td>
                <td className="px-3 py-2 text-steel-600">{nomeCategoria(d.categoria_id)}</td>
                <td className="px-3 py-2 text-steel-600">
                  {d.atleta_1} & {d.atleta_2}
                </td>
                <td className="px-3 py-2 text-right">
                  <button
                    onClick={() => iniciarEdicao(d)}
                    className="text-royal text-sm font-medium"
                  >
                    Editar
                  </button>
                </td>
              </tr>
            ))}
            {!duplas.length && (
              <tr>
                <td colSpan={4} className="px-3 py-8 text-center text-steel-400">
                  Nenhuma dupla cadastrada ainda.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
