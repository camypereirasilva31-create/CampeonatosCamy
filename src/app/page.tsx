import { createServerSupabase } from "@/lib/supabase/server";
import type { Categoria } from "@/lib/types";
import Link from "next/link";

export const revalidate = 0;

export default async function HomePage() {
  const supabase = createServerSupabase();
  const { data: categorias } = await supabase
    .from("categorias")
    .select("id, nome")
    .order("nome");

  return (
    <main className="min-h-screen bg-navy text-white flex flex-col">
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-16 text-center">
        <h1 className="font-display text-5xl sm:text-6xl font-bold tracking-tight">
          TCBrave <span className="text-royal-light">2026</span>
        </h1>
        <p className="mt-2 font-display text-xl text-steel-200 tracking-wide">
          Leaderboard
        </p>

        <div className="mt-12 w-full max-w-sm flex flex-col gap-3">
          {(categorias as Categoria[] | null)?.map((categoria) => (
            <Link
              key={categoria.id}
              href={`/leaderboard/${categoria.id}`}
              className="group flex items-center justify-between rounded-xl bg-navy-light border border-white/10 px-5 py-4 text-left transition-colors hover:bg-royal hover:border-royal"
            >
              <span className="font-display text-lg font-semibold">{categoria.nome}</span>
              <span className="text-royal-light group-hover:text-white text-xl">→</span>
            </Link>
          ))}
          {!categorias?.length && (
            <p className="text-steel-400 text-sm">
              Nenhuma categoria cadastrada ainda.
            </p>
          )}
        </div>
      </div>

      <footer className="text-center pb-6 text-steel-400 text-xs">
        TCBrave 2026
      </footer>
    </main>
  );
}
