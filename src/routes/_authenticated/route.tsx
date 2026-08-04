import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/app-shell";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    try {
      // Sessão local primeiro: evita quebrar a tela quando a rede oscila.
      const { data: s } = await supabase.auth.getSession();
      if (s.session?.user) return { user: s.session.user };

      const { data, error } = await supabase.auth.getUser();
      if (error || !data.user) throw redirect({ to: "/auth" });
      return { user: data.user };
    } catch (err) {
      // Qualquer falha (token expirado, refresh inválido, rede) volta ao login
      // em vez de derrubar a aplicação na tela de erro.
      if (err && typeof err === "object" && "isRedirect" in err) throw err;
      throw redirect({ to: "/auth" });
    }
  },
  component: () => (
    <AppShell>
      <Outlet />
    </AppShell>
  ),
});