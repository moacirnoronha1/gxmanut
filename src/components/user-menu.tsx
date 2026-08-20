import { Link, useRouter } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import {
  UserRound, KeyRound, Smartphone, Bell, ShieldCheck, History, LogOut, Crown, ChevronDown,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { supabase } from "@/integrations/supabase/client";
import { useSessaoUsuario } from "@/lib/sessao";

export function UserMenu() {
  const router = useRouter();
  const qc = useQueryClient();
  const { perfil, nomeCompleto, username, perfilLabel, setor, mestre, iniciais } = useSessaoUsuario();

  async function sair() {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    router.navigate({ to: "/auth", replace: true });
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className="h-auto gap-2 px-2 py-1.5"
          aria-label="Menu do usuário conectado"
        >
          <Avatar className="size-8">
            {perfil?.avatar_url ? <AvatarImage src={perfil.avatar_url} alt={nomeCompleto} /> : null}
            <AvatarFallback className="text-xs font-semibold">{iniciais || "?"}</AvatarFallback>
          </Avatar>
          <span className="hidden text-left leading-tight sm:block">
            <span className="flex items-center gap-1 text-xs font-semibold">
              {username || nomeCompleto}
              {mestre && <Crown className="size-3 text-primary" aria-label="Usuário Mestre" />}
            </span>
            <span className="block text-[11px] text-muted-foreground">{perfilLabel}</span>
          </span>
          <ChevronDown className="size-3 text-muted-foreground" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuLabel className="space-y-1">
          <div className="text-sm font-semibold leading-tight">{nomeCompleto}</div>
          {username && <div className="text-xs font-normal text-muted-foreground">{username}</div>}
          <div className="flex flex-wrap items-center gap-1 pt-1">
            <Badge variant={mestre ? "default" : "secondary"} className="text-[10px]">
              {mestre && <Crown className="mr-1 size-3" />}
              {perfilLabel}
            </Badge>
            {setor && (
              <Badge variant="outline" className="text-[10px] font-normal">
                {setor.nome}
              </Badge>
            )}
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link to="/perfil" search={{ aba: "perfil" }}>
            <UserRound className="size-4" /> Meu perfil
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link to="/perfil" search={{ aba: "senha" }}>
            <KeyRound className="size-4" /> Alterar minha senha
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link to="/configuracoes/notificacoes">
            <Smartphone className="size-4" /> Meus dispositivos
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link to="/notificacoes">
            <Bell className="size-4" /> Minhas notificações
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link to="/perfil" search={{ aba: "permissoes" }}>
            <ShieldCheck className="size-4" /> Minhas permissões
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link to="/perfil" search={{ aba: "historico" }}>
            <History className="size-4" /> Histórico dos meus acessos
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={sair} className="text-destructive focus:text-destructive">
          <LogOut className="size-4" /> Sair do sistema
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
