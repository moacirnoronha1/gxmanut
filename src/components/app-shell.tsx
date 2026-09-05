import { type ReactNode, useEffect, useState } from "react";
import { Link, useRouter, useRouterState } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  LayoutDashboard,
  ClipboardList,
  ClipboardCheck,
  Wrench,
  CalendarClock,
  Building2,
  Users,
  Truck,
  Settings,
  LogOut,
  Crown,
  Moon,
  Sun,
  Plus,
  Bell,
  Boxes,
  Hammer,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { supabase } from "@/integrations/supabase/client";
import { minhasNotificacoesQuery } from "@/lib/notificacoes";
import { AlertaUrgente } from "@/components/alerta-urgente";
import { UserMenu } from "@/components/user-menu";
import { useSessaoUsuario } from "@/lib/sessao";

const items = [
  { to: "/", label: "Painel", icon: LayoutDashboard },
  { to: "/ordens", label: "Ordens de Serviço", icon: ClipboardList },
  { to: "/manutencoes", label: "Manutenções Periódicas", icon: CalendarClock },
  { to: "/equipamentos", label: "Equipamentos", icon: Wrench },
  { to: "/checklists", label: "Checklists", icon: ClipboardCheck },
  { to: "/estoque", label: "Estoque de Manutenção", icon: Boxes },
  { to: "/ferramentas", label: "Ferramentas", icon: Hammer },
  { to: "/notificacoes", label: "Notificações", icon: Bell },
  { to: "/setores", label: "Setores", icon: Building2 },
  { to: "/fornecedores", label: "Fornecedores", icon: Truck },
  { to: "/usuarios", label: "Usuários", icon: Users },
  { to: "/configuracoes", label: "Configurações", icon: Settings },
];

function useDark() {
  const [dark, setDark] = useState(false);
  useEffect(() => {
    const saved = localStorage.getItem("theme") === "dark";
    setDark(saved);
    document.documentElement.classList.toggle("dark", saved);
  }, []);
  const toggle = () => {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle("dark", next);
    localStorage.setItem("theme", next ? "dark" : "light");
  };
  return { dark, toggle };
}

export function AppShell({ children }: { children: ReactNode }) {
  const router = useRouter();
  const qc = useQueryClient();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { dark, toggle } = useDark();
  const { data: notifs = [] } = useQuery(minhasNotificacoesQuery());
  const naoLidas = notifs.filter((n) => !n.lida_em).length;
  const { nomeCompleto, username, perfilLabel, setor, mestre } = useSessaoUsuario();

  const isActive = (to: string) => (to === "/" ? pathname === "/" : pathname.startsWith(to));

  async function handleSignOut() {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    router.navigate({ to: "/auth", replace: true });
  }

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <Sidebar collapsible="icon">
          <SidebarHeader>
            <div className="px-2 py-3">
              <div className="text-sm font-bold leading-tight">Manutenção</div>
              <div className="text-xs text-muted-foreground">Xica da Silva</div>
            </div>
          </SidebarHeader>
          <SidebarContent>
            <SidebarGroup>
              <SidebarGroupLabel>Menu</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {items.map((it) => (
                    <SidebarMenuItem key={it.to}>
                      <SidebarMenuButton asChild isActive={isActive(it.to)} tooltip={it.label}>
                        <Link to={it.to}>
                          <it.icon />
                          <span>{it.label}</span>
                          {it.to === "/notificacoes" && naoLidas > 0 && (
                            <span className="ml-auto rounded-full bg-destructive px-1.5 text-[10px] font-bold text-destructive-foreground">
                              {naoLidas}
                            </span>
                          )}
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                  {mestre && (
                    <SidebarMenuItem>
                      <SidebarMenuButton
                        asChild
                        isActive={isActive("/exclusoes")}
                        tooltip="Solicitações de Exclusão"
                      >
                        <Link to="/exclusoes">
                          <Trash2 />
                          <span>Solicitações de Exclusão</span>
                          {exclusoesPendentes > 0 && (
                            <span className="ml-auto rounded-full bg-destructive px-1.5 text-[10px] font-bold text-destructive-foreground">
                              {exclusoesPendentes}
                            </span>
                          )}
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  )}

                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </SidebarContent>
          <SidebarFooter>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild tooltip={`${username || nomeCompleto} — ${perfilLabel}`}>
                  <Link to="/perfil" search={{ aba: "perfil" }}>
                    {mestre ? <Crown /> : <Users />}
                    <span className="truncate">{username || nomeCompleto}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton onClick={handleSignOut} tooltip="Sair">
                  <LogOut />
                  <span>Sair</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarFooter>
        </Sidebar>

        <div className="flex-1 flex flex-col min-w-0">
          <header className="h-14 border-b flex items-center gap-2 px-3 sticky top-0 bg-background z-10">
            <SidebarTrigger />
            <div className="hidden min-w-0 text-xs leading-tight md:block">
              <span className="font-semibold">
                {nomeCompleto}
                {mestre ? " — USUÁRIO MESTRE" : ""}
              </span>
              <span className="block text-muted-foreground">
                {username}
                {setor ? ` · ${setor.nome}` : ""}
              </span>
            </div>
            <div className="flex-1" />
            <Button variant="ghost" size="icon" asChild aria-label="Notificações" className="relative">
              <Link to="/notificacoes">
                <Bell className="size-4" />
                {naoLidas > 0 && (
                  <span className="absolute -right-0.5 -top-0.5 rounded-full bg-destructive px-1 text-[10px] font-bold text-destructive-foreground">
                    {naoLidas}
                  </span>
                )}
              </Link>
            </Button>
            <Button asChild size="sm">
              <Link to="/ordens/nova">
                <Plus className="size-4" /> Nova OS
              </Link>
            </Button>
            <Button variant="ghost" size="icon" onClick={toggle} aria-label="Alternar tema">
              {dark ? <Sun className="size-4" /> : <Moon className="size-4" />}
            </Button>
            <UserMenu />
          </header>
          <main className="flex-1 p-4 md:p-6 overflow-x-hidden">
            <AlertaUrgente notificacoes={notifs} />
            {children}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}