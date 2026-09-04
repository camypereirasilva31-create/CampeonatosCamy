import { createServerSupabase } from "@/lib/supabase/server";
import type { Prova } from "@/lib/types";
import ProvasClient from "./ProvasClient";

export const revalidate = 0;

export default async function ProvasPage() {
  const supabase = createServerSupabase();
  const { data: provas } = await supabase.from("provas").select("*").order("numero");

  return <ProvasClient provasIniciais={(provas ?? []) as Prova[]} />;
}
