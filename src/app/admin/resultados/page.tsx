import { createServerSupabase } from "@/lib/supabase/server";
import type { Categoria, Prova } from "@/lib/types";
import ResultadosClient from "./ResultadosClient";

export const revalidate = 0;

export default async function ResultadosPage() {
  const supabase = createServerSupabase();
  const { data: categorias } = await supabase.from("categorias").select("*").order("nome");
  const { data: provas } = await supabase.from("provas").select("*").order("numero");

  return (
    <ResultadosClient
      categorias={(categorias ?? []) as Categoria[]}
      provas={(provas ?? []) as Prova[]}
    />
  );
}
