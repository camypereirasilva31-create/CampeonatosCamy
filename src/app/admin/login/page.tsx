"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);
    setCarregando(true);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password: senha });
    setCarregando(false);
    if (error) {
      setErro("E-mail ou senha incorretos.");
      return;
    }
    router.refresh();
    router.push("/admin/duplas");
  }

  return (
    <main className="min-h-screen bg-navy flex items-center justify-center px-6">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm bg-navy-light rounded-xl p-6 border border-white/10"
      >
        <h1 className="font-display text-2xl font-bold text-white mb-1">TCBrave 2026</h1>
        <p className="text-steel-400 text-sm mb-6">Área do organizador</p>

        <label className="block text-sm text-steel-200 mb-1">E-mail</label>
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full rounded-lg bg-navy border border-white/10 px-3 py-2 text-white mb-4 focus:outline-none focus:ring-2 focus:ring-royal"
        />

        <label className="block text-sm text-steel-200 mb-1">Senha</label>
        <input
          type="password"
          required
          value={senha}
          onChange={(e) => setSenha(e.target.value)}
          className="w-full rounded-lg bg-navy border border-white/10 px-3 py-2 text-white mb-4 focus:outline-none focus:ring-2 focus:ring-royal"
        />

        {erro && <p className="text-sm text-red-400 mb-4">{erro}</p>}

        <button
          type="submit"
          disabled={carregando}
          className="w-full rounded-lg bg-royal hover:bg-royal-dark transition-colors text-white font-display font-semibold py-2.5 disabled:opacity-60"
        >
          {carregando ? "Entrando…" : "Entrar"}
        </button>
      </form>
    </main>
  );
}
