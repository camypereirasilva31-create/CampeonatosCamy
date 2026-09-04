"use client";

import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function LogoutButton() {
  const router = useRouter();

  async function sair() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.refresh();
    router.push("/admin/login");
  }

  return (
    <button
      onClick={sair}
      className="text-steel-200 hover:text-white text-sm border border-white/10 rounded-lg px-3 py-1.5"
    >
      Sair
    </button>
  );
}
