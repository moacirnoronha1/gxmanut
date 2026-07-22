import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { profilesQuery, setoresQuery, myProfileQuery, userRolesQuery } from "@/lib/queries";
import type { AppRole, Profile } from "@/lib/db-types";
import { formatDateTime } from "@/lib/db-types";
import { toast } from "sonner";
import {
  createUserAccount,
  resetUserPassword,
  setUserBlocked,
  setUserActive,
  updateUsername,
  deleteUserAccount,
} from "@/lib/users.functions";

export const Route = createFileRoute("/_authenticated/usuarios/")({
  head: () => ({ meta: [{ title: "Usuários e permissões — Manutenção Xica da Silva" }] }),
  component: UsuariosPage,
});

type RoleMap = Record<string, AppRole[]>;

function UsuariosPage() {
  const qc = useQueryClient();
  const { data: me } = useQuery(myProfileQuery());
  const { data: myRoles = [] } = useQuery(userRolesQuery());
  const { data: profiles = [] } = useQuery(profilesQuery());
  const { data: setores = [] } = useQuery(setoresQuery());
  const { data: rolesMap = {} } = useQuery({
    queryKey: ["user_roles", "all"],
    queryFn: async (): Promise<RoleMap> => {
      const { data, error } = await supabase.from("user_roles").select("user_id, role");
      if (error) throw new Error(error.message);
      const map: RoleMap = {};
      (data ?? []).forEach((r) => {
        (map[r.user_id] ??= []).push(r.role as AppRole);
      });
      return map;
    },
  });

  const isMestre = myRoles.includes("mestre") || me?.is_master === true;

  function refresh() {
    qc.invalidateQueries({ queryKey: ["profiles"] });
    qc.invalidateQueries({ queryKey: ["user_roles"] });
  }

  if (!isMestre) {
    return (
      <Card><CardContent className="p-6 text-sm text-muted-foreground">
        Somente o Usuário Mestre pode acessar esta área.
      </CardContent></Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold">Usuários e permissões</h1>
          <p className="text-sm text-muted-foreground">{profiles.length} usuários cadastrados</p>
        </div>
        <NewUserDialog setores={setores} onDone={refresh} />
      </div>

      <Card>
        <CardContent className="p-0 divide-y">
          {profiles.length === 0 && (
            <div className="p-6 text-center text-sm text-muted-foreground">Nenhum usuário.</div>
          )}
          {profiles.map((p) => (
            <UserRow
              key={p.id}
              profile={p}
              roles={rolesMap[p.id] ?? []}
              onDone={refresh}
              selfId={me?.id ?? ""}
            />
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

function UserRow({ profile, roles, onDone, selfId }: { profile: Profile & { username?: string | null; nome_completo?: string | null; funcao?: string | null; is_master?: boolean; bloqueado?: boolean; ultimo_acesso?: string | null; must_change_password?: boolean }; roles: AppRole[]; onDone: () => void; selfId: string }) {
  const resetPwd = useServerFn(resetUserPassword);
  const setBlocked = useServerFn(setUserBlocked);
  const setActive = useServerFn(setUserActive);
  const rename = useServerFn(updateUsername);
  const del = useServerFn(deleteUserAccount);
  const [busy, setBusy] = useState(false);

  const isMaster = profile.is_master === true;
  const canManage = !isMaster || profile.id === selfId;

  async function run(fn: () => Promise<unknown>, msg = "Feito.") {
    setBusy(true);
    try { await fn(); toast.success(msg); onDone(); }
    catch (e) { toast.error(e instanceof Error ? e.message : "Falha"); }
    finally { setBusy(false); }
  }

  return (
    <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 p-3">
      <div className="min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-medium truncate">{profile.nome_completo ?? profile.nome}</span>
          <span className="text-xs text-muted-foreground">@{profile.username ?? "—"}</span>
          {isMaster && <Badge className="bg-primary">Usuário Mestre</Badge>}
          {profile.funcao && <span className="text-xs text-muted-foreground">· {profile.funcao}</span>}
        </div>
        <div className="flex items-center gap-2 mt-1 flex-wrap">
          {roles.map((r) => <Badge key={r} variant="outline">{r}</Badge>)}
          {!profile.ativo && <Badge variant="destructive">inativo</Badge>}
          {profile.bloqueado && <Badge variant="destructive">bloqueado</Badge>}
          {profile.must_change_password && <Badge variant="secondary">trocar senha</Badge>}
          <span className="text-xs text-muted-foreground">Último acesso: {formatDateTime(profile.ultimo_acesso ?? null)}</span>
        </div>
      </div>
      <div className="flex gap-1 flex-wrap justify-end">
        <ResetPasswordDialog
          disabled={busy || !canManage}
          isSelf={profile.id === selfId}
          onSubmit={(pwd, mustChange) => run(() => resetPwd({ data: { user_id: profile.id, new_password: pwd, must_change_password: mustChange } }), "Senha redefinida.")}
        />
        {!isMaster && (
          <>
            <RenameDialog disabled={busy} current={profile.username ?? ""} onSubmit={(u) => run(() => rename({ data: { user_id: profile.id, username: u } }), "Usuário renomeado.")} />
            <Button size="sm" variant="outline" disabled={busy} onClick={() => run(() => setBlocked({ data: { user_id: profile.id, bloqueado: !profile.bloqueado } }), profile.bloqueado ? "Desbloqueado." : "Bloqueado.")}>
              {profile.bloqueado ? "Desbloquear" : "Bloquear"}
            </Button>
            <Button size="sm" variant="outline" disabled={busy} onClick={() => run(() => setActive({ data: { user_id: profile.id, ativo: !profile.ativo } }), profile.ativo ? "Desativado." : "Ativado.")}>
              {profile.ativo ? "Desativar" : "Ativar"}
            </Button>
            <Button size="sm" variant="destructive" disabled={busy} onClick={() => { if (confirm("Excluir logicamente este usuário?")) run(() => del({ data: { user_id: profile.id } }), "Usuário excluído."); }}>
              Excluir
            </Button>
          </>
        )}
      </div>
    </div>
  );
}

function ResetPasswordDialog({ disabled, isSelf, onSubmit }: { disabled: boolean; isSelf: boolean; onSubmit: (pwd: string, mustChange: boolean) => void }) {
  const [open, setOpen] = useState(false);
  const [pwd, setPwd] = useState("");
  const [mustChange, setMustChange] = useState(true);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild><Button size="sm" variant="outline" disabled={disabled}>Redefinir senha</Button></DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Redefinir senha</DialogTitle><DialogDescription>A nova senha será definida imediatamente.</DialogDescription></DialogHeader>
        <div className="space-y-3">
          <div><Label>Nova senha</Label><Input type="text" value={pwd} onChange={(e) => setPwd(e.target.value)} minLength={4} /></div>
          {!isSelf && (
            <div className="flex items-center gap-2">
              <Switch checked={mustChange} onCheckedChange={setMustChange} id="mc" />
              <Label htmlFor="mc">Obrigar troca no próximo acesso</Label>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button onClick={() => { if (pwd.length < 4) return; onSubmit(pwd, mustChange); setPwd(""); setOpen(false); }}>Salvar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function RenameDialog({ disabled, current, onSubmit }: { disabled: boolean; current: string; onSubmit: (u: string) => void }) {
  const [open, setOpen] = useState(false);
  const [u, setU] = useState(current);
  return (
    <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (o) setU(current); }}>
      <DialogTrigger asChild><Button size="sm" variant="outline" disabled={disabled}>Renomear</Button></DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Alterar nome de usuário</DialogTitle></DialogHeader>
        <div><Label>Nome de usuário</Label><Input value={u} onChange={(e) => setU(e.target.value)} /></div>
        <DialogFooter>
          <Button onClick={() => { onSubmit(u); setOpen(false); }}>Salvar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function NewUserDialog({ setores, onDone }: { setores: { id: string; nome: string }[]; onDone: () => void }) {
  const create = useServerFn(createUserAccount);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({
    username: "", password: "", nome_completo: "", funcao: "", setor_id: "", role: "responsavel" as AppRole, must_change_password: true,
  });
  function up<K extends keyof typeof form>(k: K, v: (typeof form)[K]) { setForm((f) => ({ ...f, [k]: v })); }

  async function submit() {
    setBusy(true);
    try {
      await create({ data: {
        username: form.username,
        password: form.password,
        nome_completo: form.nome_completo,
        funcao: form.funcao || null,
        setor_id: form.setor_id || null,
        role: form.role as "admin" | "gestor" | "responsavel" | "tecnico",
        must_change_password: form.must_change_password,
      }});
      toast.success("Usuário criado.");
      setOpen(false);
      setForm({ username: "", password: "", nome_completo: "", funcao: "", setor_id: "", role: "responsavel", must_change_password: true });
      onDone();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha");
    } finally { setBusy(false); }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild><Button>Novo usuário</Button></DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>Cadastrar usuário</DialogTitle></DialogHeader>
        <div className="grid grid-cols-2 gap-3">
          <div><Label>Nome de usuário</Label><Input value={form.username} onChange={(e) => up("username", e.target.value)} /></div>
          <div><Label>Senha inicial</Label><Input value={form.password} onChange={(e) => up("password", e.target.value)} /></div>
          <div className="col-span-2"><Label>Nome completo</Label><Input value={form.nome_completo} onChange={(e) => up("nome_completo", e.target.value)} /></div>
          <div><Label>Função</Label><Input value={form.funcao} onChange={(e) => up("funcao", e.target.value)} /></div>
          <div>
            <Label>Setor</Label>
            <Select value={form.setor_id} onValueChange={(v) => up("setor_id", v)}>
              <SelectTrigger><SelectValue placeholder="Selecionar" /></SelectTrigger>
              <SelectContent>
                {setores.map((s) => <SelectItem key={s.id} value={s.id}>{s.nome}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="col-span-2">
            <Label>Perfil de acesso</Label>
            <Select value={form.role} onValueChange={(v) => up("role", v as AppRole)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="admin">Administrador</SelectItem>
                <SelectItem value="gestor">Gestor / Financeiro</SelectItem>
                <SelectItem value="responsavel">Responsável pelo setor</SelectItem>
                <SelectItem value="tecnico">Técnico de manutenção</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="col-span-2 flex items-center gap-2">
            <Switch id="mcp" checked={form.must_change_password} onCheckedChange={(v) => up("must_change_password", v)} />
            <Label htmlFor="mcp">Obrigar troca de senha no primeiro acesso</Label>
          </div>
        </div>
        <DialogFooter>
          <Button onClick={submit} disabled={busy || !form.username || !form.password || !form.nome_completo}>Criar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}