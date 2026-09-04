import { createServerSupabase } from "@/lib/supabase/server";
import type { Categoria, Dupla } from "@/lib/types";
import DuplasClient from "./DuplasClient";

export const revalidate = 0;

export default async function DuplasPage() {
  const supabase = createServerSupabase();
  const { data: categorias } = await supabase.from("categorias").select("*").order("nome");
  const { data: duplas } = await supabase.from("duplas").select("*").order("nome_dupla");

  return (
    <DuplasClient
      categorias={(categorias ?? []) as Categoria[]}
      duplasIniciais={(duplas ?? []) as Dupla[]}
    />
  );
}
