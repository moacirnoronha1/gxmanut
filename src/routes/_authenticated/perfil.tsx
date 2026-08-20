import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Crown, KeyRound, ShieldCheck, History, UserRound, Smartphone, Bell } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { changeMyPassword } from "@/lib/users.functions";
import { meusDispositivosQuery } from "@/lib/notificacoes";
import { minhaAuditoriaQuery, useSessaoUsuario, ROLE_LABEL } from "@/lib/sessao";
import { formatDateTime } from "@/lib/db-types";

type Aba = "perfil" | "senha" | "permissoes" | "historico";

export const Route = createFileRoute("/_authenticated/perfil")({
  validateSearch: (search: Record<string, unknown>): { aba: Aba } => {
    const aba = search.aba;
    const validas: Aba[] = ["perfil", "senha", "permissoes", "historico"];
    return { aba: validas.includes(aba as Aba) ? (aba as Aba) : "perfil" };
  },
  head: () => ({
    meta: [
      { title: "Meu perfil — Manutenção Xica da Silva" },
      { name: "description", content: "Veja seus dados de acesso, altere sua senha, confira suas permissões e o histórico das suas ações no sistema de manutenção." },
      { property: "og:title", content: "Meu perfil — Manutenção Xica da Silva" },
      { property: "og:description", content: "Dados do usuário conectado, senha, permissões e histórico de acessos." },
    ],
  }),
  component: MeuPerfil,
});

const ACOES: Record<string, string> = {
  login: "Entrou no sistema",
  usuario_criado: "Usuário criado",
  senha_redefinida: "Senha redefinida",
  senha_alterada: "Senha alterada",
  bloqueado: "Usuário bloqueado",
  desbloqueado: "Usuário desbloqueado",
  ativado: "Usuário ativado",
  desativado: "Usuário desativado",
  usuario_renomeado: "Usuário renomeado",
  usuario_excluido: "Usuário excluído",
};

function MeuPerfil() {
  const { aba } = Route.useSearch();
  const navigate = useNavigate();
  const { perfil, roles, mestre, perfilLabel, setor, username, nomeCompleto, iniciais } = useSessaoUsuario();
  const { data: dispositivos = [] } = useQuery(meusDispositivosQuery());
  const { data: auditoria = [] } = useQuery(minhaAuditoriaQuery());

  const alterarSenha = useServerFn(changeMyPassword);
  const [nova, setNova] = useState("");
  const [conf, setConf] = useState("");
  const [salvando, setSalvando] = useState(false);

  async function submitSenha(e: React.FormEvent) {
    e.preventDefault();
    if (nova.length < 4) return toast.error("A senha deve ter pelo menos 4 caracteres.");
    if (nova !== conf) return toast.error("As senhas não conferem.");
    setSalvando(true);
    try {
      await alterarSenha({ data: { new_password: nova } });
      setNova("");
      setConf("");
      toast.success("Senha alterada com sucesso.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Não foi possível alterar a senha.");
    } finally {
      setSalvando(false);
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="flex flex-wrap items-center gap-4 pt-6">
          <Avatar className="size-16">
            {perfil?.avatar_url ? <AvatarImage src={perfil.avatar_url} alt={nomeCompleto} /> : null}
            <AvatarFallback className="text-lg font-semibold">{iniciais || "?"}</AvatarFallback>
          </Avatar>
          <div className="min-w-0 space-y-1">
            <h1 className="flex items-center gap-2 text-xl font-bold leading-tight">
              {nomeCompleto}
              {mestre && <Crown className="size-4 text-primary" />}
            </h1>
            <p className="text-sm text-muted-foreground">{username}</p>
            <div className="flex flex-wrap gap-1 pt-1">
              <Badge variant={mestre ? "default" : "secondary"}>{perfilLabel}</Badge>
              {setor && <Badge variant="outline">{setor.nome}</Badge>}
              {perfil?.funcao && <Badge variant="outline">{perfil.funcao}</Badge>}
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs value={aba} onValueChange={(v) => navigate({ to: "/perfil", search: { aba: v as Aba } })}>
        <TabsList className="flex-wrap">
          <TabsTrigger value="perfil"><UserRound className="mr-1 size-4" />Meu perfil</TabsTrigger>
          <TabsTrigger value="senha"><KeyRound className="mr-1 size-4" />Senha</TabsTrigger>
          <TabsTrigger value="permissoes"><ShieldCheck className="mr-1 size-4" />Permissões</TabsTrigger>
          <TabsTrigger value="historico"><History className="mr-1 size-4" />Meus acessos</TabsTrigger>
        </TabsList>

        <TabsContent value="perfil" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Dados da conta</CardTitle>
              <CardDescription>Informações do usuário conectado nesta sessão.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3 sm:grid-cols-2">
              <Info rotulo="Nome completo" valor={nomeCompleto} />
              <Info rotulo="Nome de usuário" valor={username || "—"} />
              <Info rotulo="Perfil de acesso" valor={perfilLabel} />
              <Info rotulo="Setor" valor={setor?.nome ?? "Não aplicável"} />
              <Info rotulo="Função" valor={perfil?.funcao || "—"} />
              <Info rotulo="Telefone" valor={perfil?.telefone || "—"} />
              <Info rotulo="Último acesso" valor={formatDateTime(perfil?.ultimo_acesso)} />
              <Info rotulo="Situação" valor={perfil?.bloqueado ? "Bloqueado" : perfil?.ativo ? "Ativo" : "Inativo"} />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Meus dispositivos</CardTitle>
              <CardDescription>Aparelhos com notificações ativadas nesta conta.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {dispositivos.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nenhum dispositivo com notificações ativas.</p>
              ) : (
                dispositivos.map((d) => (
                  <div key={d.id} className="flex items-center gap-2 rounded-md border p-2 text-sm">
                    <Smartphone className="size-4 text-muted-foreground" />
                    <span className="font-medium">{d.nome}</span>
                    <span className="ml-auto text-xs text-muted-foreground">{formatDateTime(d.ultimo_acesso)}</span>
                  </div>
                ))
              )}
              <div className="flex flex-wrap gap-2 pt-1">
                <Button asChild size="sm" variant="outline">
                  <Link to="/configuracoes/notificacoes"><Smartphone className="size-4" /> Gerenciar dispositivos</Link>
                </Button>
                <Button asChild size="sm" variant="outline">
                  <Link to="/notificacoes"><Bell className="size-4" /> Minhas notificações</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="senha">
          <Card>
            <CardHeader>
              <CardTitle>Alterar minha senha</CardTitle>
              <CardDescription>A alteração é registrada na auditoria com seu usuário e horário.</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={submitSenha} className="max-w-sm space-y-3">
                <div className="space-y-1">
                  <Label htmlFor="nova">Nova senha</Label>
                  <Input id="nova" type="password" value={nova} onChange={(e) => setNova(e.target.value)} autoComplete="new-password" />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="conf">Confirmar nova senha</Label>
                  <Input id="conf" type="password" value={conf} onChange={(e) => setConf(e.target.value)} autoComplete="new-password" />
                </div>
                <Button type="submit" disabled={salvando}>{salvando ? "Salvando…" : "Alterar senha"}</Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="permissoes">
          <Card>
            <CardHeader>
              <CardTitle>Minhas permissões</CardTitle>
              <CardDescription>Perfis de acesso atribuídos a esta conta.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {mestre && (
                <div className="rounded-md border border-primary/40 bg-primary/5 p-3 text-sm">
                  <span className="flex items-center gap-2 font-semibold"><Crown className="size-4 text-primary" /> Usuário Mestre</span>
                  <p className="mt-1 text-muted-foreground">Acesso administrativo total: usuários, permissões, configurações e todos os registros.</p>
                </div>
              )}
              {roles.length === 0 && !mestre ? (
                <p className="text-sm text-muted-foreground">Nenhum perfil atribuído. Fale com o Usuário Mestre.</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {roles.map((r) => (
                    <Badge key={r} variant="secondary">{ROLE_LABEL[r] ?? r}</Badge>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="historico">
          <Card>
            <CardHeader>
              <CardTitle>Histórico dos meus acessos e ações</CardTitle>
              <CardDescription>Registros vinculados ao seu ID de usuário, com data e hora.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {auditoria.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nenhum registro encontrado.</p>
              ) : (
                auditoria.map((a) => (
                  <div key={a.id} className="flex flex-wrap items-center gap-2 rounded-md border p-2 text-sm">
                    <span className="font-medium">{ACOES[a.acao] ?? a.acao}</span>
                    {a.ator_id === perfil?.id ? (
                      <Badge variant="outline" className="text-[10px]">Feito por mim</Badge>
                    ) : (
                      <Badge variant="outline" className="text-[10px]">Na minha conta</Badge>
                    )}
                    <span className="ml-auto text-xs text-muted-foreground">{formatDateTime(a.created_at)}</span>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function Info({ rotulo, valor }: { rotulo: string; valor: string }) {
  return (
    <div className="rounded-md border p-2">
      <div className="text-[11px] uppercase tracking-wide text-muted-foreground">{rotulo}</div>
      <div className="text-sm font-medium">{valor}</div>
    </div>
  );
}
