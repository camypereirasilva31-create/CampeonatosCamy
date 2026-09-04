"use server";

import { revalidatePath } from "next/cache";
import { requireOrganizador } from "@/lib/auth";
import { createAdminSupabase } from "@/lib/supabase/admin";
import { calcularColocacoesEPontos } from "@/lib/scoring";
import type { Dupla, Prova, Resultado, TipoProva } from "@/lib/types";

// ---------------------------------------------------------------
// DUPLAS
// ---------------------------------------------------------------
export type AcaoResultado = { ok: true } | { ok: false; message: string };

export async function criarDupla(dados: {
  categoria_id: string;
  nome_dupla: string;
  atleta_1: string;
  atleta_2: string;
}): Promise<AcaoResultado> {
  await requireOrganizador();

  // LOG DE DIAGNÓSTICO — aparece em Vercel > Deployments > Runtime Logs.
  console.error(
    "[criarDupla] payload recebido:",
    JSON.stringify(dados),
    "| typeof categoria_id:",
    typeof dados.categoria_id
  );

  const supabase = createAdminSupabase();
  const { error } = await supabase.from("duplas").insert(dados);
  if (error) {
    console.error("[criarDupla] erro do Postgres:", error.message, error.details, error.hint);
    // Retornar (em vez de "throw") evita que o Next.js mascare a mensagem em
    // produção com "An error occurred in the Server Components render" —
    // assim o texto real do Postgres aparece na tela.
    return { ok: false, message: error.message };
  }
  revalidatePath("/admin/duplas");
  revalidatePath("/");
  return { ok: true };
}

export async function editarDupla(
  id: string,
  dados: Partial<Pick<Dupla, "nome_dupla" | "atleta_1" | "atleta_2" | "categoria_id">>
): Promise<AcaoResultado> {
  await requireOrganizador();

  console.error(
    "[editarDupla] id:",
    id,
    "| payload recebido:",
    JSON.stringify(dados),
    "| typeof categoria_id:",
    typeof dados.categoria_id
  );

  const supabase = createAdminSupabase();
  const { error } = await supabase.from("duplas").update(dados).eq("id", id);
  if (error) {
    console.error("[editarDupla] erro do Postgres:", error.message, error.details, error.hint);
    return { ok: false, message: error.message };
  }
  revalidatePath("/admin/duplas");
  revalidatePath("/");
  return { ok: true };
}

// ---------------------------------------------------------------
// PROVAS
// ---------------------------------------------------------------
export async function criarProva(dados: {
  numero: number;
  nome: string | null;
  tipo: TipoProva;
  time_cap_seconds: number | null;
}) {
  await requireOrganizador();
  const supabase = createAdminSupabase();
  const { error } = await supabase.from("provas").insert({ ...dados, publicado: false });
  if (error) throw new Error(error.message);
  revalidatePath("/admin/provas");
}

export async function editarProva(
  id: string,
  dados: Partial<Pick<Prova, "numero" | "nome" | "tipo" | "time_cap_seconds">>
) {
  await requireOrganizador();
  const supabase = createAdminSupabase();
  const { error } = await supabase.from("provas").update(dados).eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/admin/provas");
}

/** Alterna o campo `publicado`. Usado tanto no dia a dia quanto no botão
 * especial "PUBLICAR RESULTADO FINAL" da última prova (regra 10). */
export async function definirPublicacaoProva(id: string, publicado: boolean) {
  await requireOrganizador();
  const supabase = createAdminSupabase();
  const { error } = await supabase.from("provas").update({ publicado }).eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/admin/provas");
  revalidatePath("/admin/resultados");
  revalidatePath("/");
}

// ---------------------------------------------------------------
// RESULTADOS
// ---------------------------------------------------------------
export type LancamentoResultado = {
  prova_id: string;
  dupla_id: string;
  peso_lb?: number | null;
  repeticoes?: number | null;
  tempo_seconds?: number | null;
  tomou_cap?: boolean;
  repeticoes_faltantes?: number | null;
};

/**
 * Lança/edita o resultado de uma dupla numa prova e recalcula
 * automaticamente colocação e pontos de TODA a categoria naquela prova
 * (regra: qualquer correção recalcula tudo).
 */
export async function lancarResultado(dados: LancamentoResultado) {
  await requireOrganizador();
  const supabase = createAdminSupabase();

  const { data: prova } = await supabase
    .from("provas")
    .select("*")
    .eq("id", dados.prova_id)
    .single();
  if (!prova) throw new Error("Prova não encontrada.");

  const { data: dupla } = await supabase
    .from("duplas")
    .select("*")
    .eq("id", dados.dupla_id)
    .single();
  if (!dupla) throw new Error("Dupla não encontrada.");

  const { error: upsertError } = await supabase
    .from("resultados")
    .upsert(
      {
        prova_id: dados.prova_id,
        dupla_id: dados.dupla_id,
        peso_lb: dados.peso_lb ?? null,
        repeticoes: dados.repeticoes ?? null,
        tempo_seconds: dados.tempo_seconds ?? null,
        tomou_cap: dados.tomou_cap ?? false,
        repeticoes_faltantes: dados.repeticoes_faltantes ?? null,
      },
      { onConflict: "prova_id,dupla_id" }
    );
  if (upsertError) throw new Error(upsertError.message);

  await recalcularProva(dados.prova_id, dupla.categoria_id);

  revalidatePath("/admin/resultados");
  revalidatePath("/");
}

/** Remove um resultado lançado (dupla volta a "não participou") e recalcula. */
export async function removerResultado(prova_id: string, dupla_id: string, categoria_id: string) {
  await requireOrganizador();
  const supabase = createAdminSupabase();
  const { error } = await supabase
    .from("resultados")
    .delete()
    .eq("prova_id", prova_id)
    .eq("dupla_id", dupla_id);
  if (error) throw new Error(error.message);

  await recalcularProva(prova_id, categoria_id);
  revalidatePath("/admin/resultados");
  revalidatePath("/");
}

/**
 * Recalcula colocação e pontos de todas as duplas de uma categoria
 * numa prova específica, a partir dos resultados brutos já salvos.
 */
async function recalcularProva(prova_id: string, categoria_id: string) {
  const supabase = createAdminSupabase();

  const { data: prova } = await supabase.from("provas").select("*").eq("id", prova_id).single();
  const { data: duplas } = await supabase
    .from("duplas")
    .select("*")
    .eq("categoria_id", categoria_id);
  const { data: resultadosProva } = await supabase
    .from("resultados")
    .select("*")
    .eq("prova_id", prova_id)
    .in("dupla_id", (duplas ?? []).map((d) => d.id));

  if (!prova || !duplas) return;

  const calculado = calcularColocacoesEPontos(
    prova as Prova,
    duplas as Dupla[],
    (resultadosProva ?? []) as Resultado[]
  );

  await Promise.all(
    calculado
      .filter((c) => (resultadosProva ?? []).some((r) => r.dupla_id === c.dupla_id))
      .map((c) =>
        supabase
          .from("resultados")
          .update({ colocacao: c.colocacao, pontos: c.pontos })
          .eq("prova_id", prova_id)
          .eq("dupla_id", c.dupla_id)
      )
  );
}
