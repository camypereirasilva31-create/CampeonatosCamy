import Link from "next/link";
import { createServerSupabase } from "@/lib/supabase/server";
import LogoutButton from "./LogoutButton";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // /admin/login não deve mostrar a navegação
  if (!user) return <>{children}</>;

  const links = [
    { href: "/admin/duplas", label: "Duplas" },
    { href: "/admin/provas", label: "Provas" },
    { href: "/admin/resultados", label: "Resultados" },
    { href: "/", label: "Leaderboard" },
  ];

  return (
    <div className="min-h-screen bg-steel-50">
      <header className="bg-navy text-white px-4 py-4 sm:px-6 flex items-center justify-between">
        <div>
          <p className="font-display font-bold">TCBrave 2026</p>
          <p className="text-steel-400 text-xs">Painel do organizador</p>
        </div>
        <LogoutButton />
      </header>
      <nav className="bg-navy-light px-4 sm:px-6 flex gap-1 overflow-x-auto">
        {links.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className="text-steel-200 hover:text-white hover:bg-white/5 px-3 py-2.5 text-sm font-medium whitespace-nowrap"
          >
            {link.label}
          </Link>
        ))}
      </nav>
      <div className="px-4 py-6 sm:px-6">{children}</div>
    </div>
  );
}
