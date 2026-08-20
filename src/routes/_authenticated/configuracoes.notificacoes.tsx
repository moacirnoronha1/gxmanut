import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import {
  BellRing, BellOff, Smartphone, ShieldCheck, ShieldAlert, Send, Trash2, Download, Stethoscope, RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import {
  ativarNotificacoesNesteDispositivo, assinaturaAtual, nomeDispositivoPadrao, permissaoAtual, pushSuportado,
} from "@/lib/push-client";
import {
  enviarNotificacaoTeste, removerDispositivo, salvarPreferencias, salvarConfigEscalonamento, diagnosticoNotificacoes,
} from "@/lib/push.functions";
import {
  meusDispositivosQuery, minhasPreferenciasQuery, configNotificacaoQuery, todosDispositivosQuery, TIPOS_NOTIFICACAO,
} from "@/lib/notificacoes";
import { myProfileQuery } from "@/lib/queries";
import { formatDateTime } from "@/lib/db-types";

export const Route = createFileRoute("/_authenticated/configuracoes/notificacoes")({
  head: () => ({
    meta: [
      { title: "Notificações do meu dispositivo — Manutenção Xica da Silva" },
      { name: "description", content: "Ative, teste e diagnostique as notificações push do seu celular no sistema de manutenção." },
      { property: "og:title", content: "Notificações do meu dispositivo" },
      { property: "og:description", content: "Ative, teste e diagnostique as notificações push do seu celular." },
    ],
  }),
  component: NotificacoesConfig,
});

type Estado =
  | "sem_suporte"
  | "bloqueada"
  | "sem_registro"
  | "ativa_nao_testada"
  | "ativa_testada"
  | "erro_envio";

function NotificacoesConfig() {
  const qc = useQueryClient();
  const { data: perfil } = useQuery(myProfileQuery());
  const { data: devices = [] } = useQuery(meusDispositivosQuery());
  const { data: prefs } = useQuery(minhasPreferenciasQuery());
  const { data: config } = useQuery(configNotificacaoQuery());
  const mestre = !!perfil?.is_master;
  const { data: todos = [] } = useQuery({ ...todosDispositivosQuery(), enabled: mestre });

  const testar = useServerFn(enviarNotificacaoTeste);
  const remover = useServerFn(removerDispositivo);
  const salvarPrefs = useServerFn(salvarPreferencias);
  const salvarCfg = useServerFn(salvarConfigEscalonamento);
  const diagnosticar = useServerFn(diagnosticoNotificacoes);

  const [permissao, setPermissao] = useState<string>("indisponivel");
  const [endpointLocal, setEndpointLocal] = useState<string | null>(null);
  const [nome, setNome] = useState("");
  const [ocupado, setOcupado] = useState(false);
  const [instalavel, setInstalavel] = useState<any>(null);
  const [diag, setDiag] = useState<any>(null);

  useEffect(() => {
    setPermissao(permissaoAtual());
    setNome(nomeDispositivoPadrao());
    assinaturaAtual().then((s) => setEndpointLocal(s?.endpoint ?? null)).catch(() => setEndpointLocal(null));
    const handler = (e: Event) => {
      e.preventDefault();
      setInstalavel(e);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const deviceAtual = devices.find((d) => d.endpoint === endpointLocal) ?? null;

  const estado: Estado = !pushSuportado()
    ? "sem_suporte"
    : permissao === "denied"
      ? "bloqueada"
      : !deviceAtual
        ? "sem_registro"
        : deviceAtual.ultimo_erro
          ? "erro_envio"
          : deviceAtual.ultimo_teste_em
            ? "ativa_testada"
            : "ativa_nao_testada";

  const rotulos: Record<Estado, { texto: string; cor: string; icone: React.ReactNode }> = {
    sem_suporte: { texto: "Dispositivo sem suporte a push", cor: "bg-muted text-muted-foreground", icone: <BellOff className="size-4" /> },
    bloqueada: { texto: "Permissão bloqueada", cor: "bg-destructive text-destructive-foreground", icone: <ShieldAlert className="size-4" /> },
    sem_registro: { texto: "Dispositivo sem registro", cor: "bg-amber-500 text-white", icone: <Smartphone className="size-4" /> },
    ativa_nao_testada: { texto: "Ativada, mas não testada", cor: "bg-amber-500 text-white", icone: <BellRing className="size-4" /> },
    ativa_testada: { texto: "Ativada e testada", cor: "bg-emerald-600 text-white", icone: <ShieldCheck className="size-4" /> },
    erro_envio: { texto: "Erro de envio", cor: "bg-destructive text-destructive-foreground", icone: <ShieldAlert className="size-4" /> },
  };

  async function ativar() {
    setOcupado(true);
    try {
      await ativarNotificacoesNesteDispositivo(nome);
      const sub = await assinaturaAtual();
      setEndpointLocal(sub?.endpoint ?? null);
      setPermissao(permissaoAtual());
      await qc.invalidateQueries({ queryKey: ["push_devices"] });
      toast.success("Celular registrado! Envie a notificação de teste para confirmar.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha ao ativar notificações.");
    } finally {
      setOcupado(false);
    }
  }

  async function enviarTeste() {
    setOcupado(true);
    try {
      const r = await testar({ data: {} });
      await qc.invalidateQueries({ queryKey: ["push_devices"] });
      await qc.invalidateQueries({ queryKey: ["notificacoes"] });
      if (r.enviados > 0) toast.success(`Notificação de teste enviada para ${r.enviados} dispositivo(s).`);
      else if (r.dispositivos === 0) toast.error("Nenhum dispositivo registrado. Ative as notificações primeiro.");
      else toast.error(`Falha no envio: ${r.erros[0] ?? "erro desconhecido"}`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha ao enviar teste.");
    } finally {
      setOcupado(false);
    }
  }

  async function rodarDiagnostico() {
    try {
      const r = await diagnosticar({ data: {} });
      setDiag(r);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha no diagnóstico.");
    }
  }

  async function instalarApp() {
    if (!instalavel) {
      toast.info("No iPhone: toque em Compartilhar → Adicionar à Tela de Início.");
      return;
    }
    instalavel.prompt();
    const escolha = await instalavel.userChoice;
    if (escolha.outcome === "accepted") toast.success("Aplicativo instalado no celular.");
    setInstalavel(null);
  }

  const tipos = (prefs?.tipos ?? {}) as Record<string, boolean>;
  async function alternarTipo(key: string, valor: boolean) {
    const novo = { ...tipos, [key]: valor };
    await salvarPrefs({
      data: {
        tipos: novo,
        silencio_ativo: prefs?.silencio_ativo ?? false,
        silencio_inicio: prefs?.silencio_inicio ?? "22:00",
        silencio_fim: prefs?.silencio_fim ?? "07:00",
        som_urgente: prefs?.som_urgente ?? true,
      },
    });
    qc.invalidateQueries({ queryKey: ["notificacao_preferencias"] });
  }

  async function salvarSilencio(campos: Partial<{ silencio_ativo: boolean; silencio_inicio: string; silencio_fim: string; som_urgente: boolean }>) {
    await salvarPrefs({
      data: {
        tipos,
        silencio_ativo: prefs?.silencio_ativo ?? false,
        silencio_inicio: prefs?.silencio_inicio ?? "22:00",
        silencio_fim: prefs?.silencio_fim ?? "07:00",
        som_urgente: prefs?.som_urgente ?? true,
        ...campos,
      },
    });
    qc.invalidateQueries({ queryKey: ["notificacao_preferencias"] });
    toast.success("Preferências salvas.");
  }

  return (
    <div className="space-y-4 max-w-4xl">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl font-bold">Notificações do meu dispositivo</h1>
          <p className="text-sm text-muted-foreground">Ative, teste e acompanhe os alertas deste celular.</p>
        </div>
        <Button variant="outline" size="sm" asChild>
          <Link to="/configuracoes">Voltar às configurações</Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <CardTitle>Status deste aparelho</CardTitle>
            <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${rotulos[estado].cor}`}>
              {rotulos[estado].icone} {rotulos[estado].texto}
            </span>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <dl className="grid gap-3 sm:grid-cols-2 text-sm">
            <Info rotulo="Notificações" valor={deviceAtual?.ativo ? "Ativadas" : "Desativadas"} />
            <Info rotulo="Permissão do aparelho" valor={permissao === "granted" ? "Concedida" : permissao === "denied" ? "Bloqueada" : "Não solicitada"} />
            <Info rotulo="Dispositivo cadastrado" valor={deviceAtual?.nome ?? "Nenhum"} />
            <Info rotulo="Data do último registro" valor={formatDateTime(deviceAtual?.created_at)} />
            <Info rotulo="Última notificação enviada" valor={formatDateTime(deviceAtual?.ultimo_envio_em)} />
            <Info rotulo="Última notificação confirmada" valor={formatDateTime(deviceAtual?.ultima_confirmacao_em)} />
            <Info rotulo="Último teste" valor={formatDateTime(deviceAtual?.ultimo_teste_em)} />
            <Info rotulo="Último erro" valor={deviceAtual?.ultimo_erro ?? "—"} />
          </dl>

          {estado === "bloqueada" && (
            <p className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm">
              As notificações estão bloqueadas no aparelho. Abra as configurações do navegador (ícone do cadeado ao lado do endereço) e
              autorize as notificações para este site, depois toque em ativar novamente.
            </p>
          )}

          <div className="grid gap-2 sm:grid-cols-[1fr_auto] sm:items-end">
            <div>
              <Label htmlFor="nome-dispositivo">Nome do dispositivo</Label>
              <Input id="nome-dispositivo" value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Celular da manutenção" />
            </div>
            <Button onClick={ativar} disabled={ocupado || estado === "sem_suporte"} className="w-full sm:w-auto">
              <BellRing className="size-4" /> ATIVAR NOTIFICAÇÕES NESTE CELULAR
            </Button>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" onClick={enviarTeste} disabled={ocupado}>
              <Send className="size-4" /> ENVIAR NOTIFICAÇÃO DE TESTE
            </Button>
            <Button variant="outline" onClick={instalarApp}>
              <Download className="size-4" /> INSTALAR MANUTENÇÃO XICA NO CELULAR
            </Button>
            <Button variant="ghost" onClick={rodarDiagnostico}>
              <Stethoscope className="size-4" /> Diagnóstico de notificações
            </Button>
          </div>
        </CardContent>
      </Card>

      {diag && (
        <Card>
          <CardHeader>
            <CardTitle>Diagnóstico de notificações</CardTitle>
            <CardDescription>
              {permissao === "denied"
                ? "Notificações bloqueadas — autorize as notificações nas configurações do aparelho."
                : diag.servicoPush && deviceAtual && deviceAtual.ultimo_teste_em && !deviceAtual.ultimo_erro
                  ? "Tudo funcionando — celular preparado para receber notificações."
                  : "Atenção — existe alguma configuração pendente."}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <Check ok={permissao === "granted"} label="Permissão do navegador" />
            <Check ok={!!deviceAtual} label="Dispositivo registrado" />
            <Check ok={!!deviceAtual && !deviceAtual.ultimo_erro} label="Token válido" />
            <Check ok={!!diag.servicoPush} label="Serviço de push disponível" />
            <Check ok={!!deviceAtual?.ultimo_envio_em} label={`Último envio: ${formatDateTime(deviceAtual?.ultimo_envio_em)}`} />
            <Check ok={!!deviceAtual?.ultimo_teste_em} label={`Último teste: ${formatDateTime(deviceAtual?.ultimo_teste_em)}`} />
            <Separator className="my-2" />
            <div className="space-y-1">
              {(diag.envios ?? []).slice(0, 8).map((e: any) => (
                <div key={e.id} className="flex flex-wrap items-center justify-between gap-2 rounded border px-2 py-1">
                  <span className="text-xs">{formatDateTime(e.created_at)} · {e.tipo}</span>
                  <Badge variant={e.status === "enviado" ? "secondary" : "destructive"}>{e.status}</Badge>
                  {e.erro && <span className="text-xs text-destructive w-full break-all">{e.erro}</span>}
                </div>
              ))}
              {!(diag.envios ?? []).length && <p className="text-muted-foreground text-xs">Nenhum envio registrado ainda.</p>}
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Meus dispositivos</CardTitle>
          <CardDescription>Você pode registrar vários aparelhos (celular pessoal, celular da manutenção, tablet, computador).</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {devices.map((d) => (
            <div key={d.id} className="flex flex-wrap items-center justify-between gap-2 rounded-md border p-3 text-sm">
              <div>
                <div className="font-medium flex items-center gap-2">
                  <Smartphone className="size-4" /> {d.nome}
                  {d.endpoint === endpointLocal && <Badge variant="outline">este aparelho</Badge>}
                  {!d.ativo && <Badge variant="destructive">inativo</Badge>}
                </div>
                <div className="text-xs text-muted-foreground">
                  Cadastrado em {formatDateTime(d.created_at)} · Último acesso {formatDateTime(d.ultimo_acesso)}
                </div>
              </div>
              <Button
                size="sm"
                variant="ghost"
                onClick={async () => {
                  await remover({ data: { id: d.id } });
                  qc.invalidateQueries({ queryKey: ["push_devices"] });
                  toast.success("Dispositivo removido.");
                }}
              >
                <Trash2 className="size-4" /> Remover
              </Button>
            </div>
          ))}
          {!devices.length && <p className="text-sm text-muted-foreground">Nenhum dispositivo registrado.</p>}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Quais notificações quero receber</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {TIPOS_NOTIFICACAO.map((t) => (
            <div key={t.key} className="flex items-center justify-between gap-3">
              <Label htmlFor={`tipo-${t.key}`} className="font-normal">
                {t.label}
                {t.bloqueado && <span className="ml-2 text-xs text-muted-foreground">(obrigatória)</span>}
              </Label>
              <Switch
                id={`tipo-${t.key}`}
                checked={t.bloqueado ? true : tipos[t.key] !== false}
                disabled={t.bloqueado}
                onCheckedChange={(v) => alternarTipo(t.key, v)}
              />
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Horário silencioso</CardTitle>
          <CardDescription>
            Lembretes comuns aguardam nesse período. OS urgentes e extremamente urgentes são sempre enviadas na hora.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between">
            <Label htmlFor="silencio" className="font-normal">Ativar horário silencioso</Label>
            <Switch
              id="silencio"
              checked={prefs?.silencio_ativo ?? false}
              onCheckedChange={(v) => salvarSilencio({ silencio_ativo: v })}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="ini">Início</Label>
              <Input id="ini" type="time" defaultValue={(prefs?.silencio_inicio ?? "22:00").slice(0, 5)}
                onBlur={(e) => salvarSilencio({ silencio_inicio: e.target.value })} />
            </div>
            <div>
              <Label htmlFor="fim">Fim</Label>
              <Input id="fim" type="time" defaultValue={(prefs?.silencio_fim ?? "07:00").slice(0, 5)}
                onBlur={(e) => salvarSilencio({ silencio_fim: e.target.value })} />
            </div>
          </div>
          <div className="flex items-center justify-between">
            <Label htmlFor="som" className="font-normal">Alerta sonoro em OS urgentes</Label>
            <Switch id="som" checked={prefs?.som_urgente ?? true} onCheckedChange={(v) => salvarSilencio({ som_urgente: v })} />
          </div>
        </CardContent>
      </Card>

      {mestre && (
        <>
          <Card>
            <CardHeader>
              <CardTitle>Escalonamento automático (somente MOACIR)</CardTitle>
              <CardDescription>Tempos usados quando ninguém confirma o recebimento da OS.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3 sm:grid-cols-2">
              <ConfigNum id="a" label="Urgente: reforçar técnico e substituto após (min)" valor={config?.urgente_reforco_min ?? 10}
                onSave={(v) => salvarCfg({ data: { ...(config as any), urgente_reforco_min: v } }).then(() => qc.invalidateQueries({ queryKey: ["notificacao_config"] }))} />
              <ConfigNum id="b" label="Urgente: avisar MOACIR após (min)" valor={config?.urgente_mestre_min ?? 20}
                onSave={(v) => salvarCfg({ data: { ...(config as any), urgente_mestre_min: v } }).then(() => qc.invalidateQueries({ queryKey: ["notificacao_config"] }))} />
              <ConfigNum id="c" label="Extrema: repetir alerta a cada (min)" valor={config?.extrema_repeticao_min ?? 5}
                onSave={(v) => salvarCfg({ data: { ...(config as any), extrema_repeticao_min: v } }).then(() => qc.invalidateQueries({ queryKey: ["notificacao_config"] }))} />
              <ConfigNum id="d" label="Manutenção atrasada: repetir a cada (dias)" valor={config?.mp_atraso_repetir_dias ?? 1}
                onSave={(v) => salvarCfg({ data: { ...(config as any), mp_atraso_repetir_dias: v } }).then(() => qc.invalidateQueries({ queryKey: ["notificacao_config"] }))} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Dispositivos de todos os usuários</CardTitle>
              <CardDescription>Consulte e revogue aparelhos cadastrados.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {todos.map((d: any) => (
                <div key={d.id} className="flex flex-wrap items-center justify-between gap-2 rounded-md border p-2 text-sm">
                  <div>
                    <div className="font-medium">{d.profiles?.nome_completo ?? d.profiles?.nome ?? "Usuário"} — {d.nome}</div>
                    <div className="text-xs text-muted-foreground">
                      Cadastro {formatDateTime(d.created_at)} · Último envio {formatDateTime(d.ultimo_envio_em)} · {d.ativo ? "ativo" : "inativo"}
                    </div>
                  </div>
                  <Button size="sm" variant="ghost" onClick={async () => {
                    await remover({ data: { id: d.id } });
                    qc.invalidateQueries({ queryKey: ["push_devices"] });
                    toast.success("Dispositivo revogado.");
                  }}>
                    <Trash2 className="size-4" /> Revogar
                  </Button>
                </div>
              ))}
              {!todos.length && <p className="text-sm text-muted-foreground">Nenhum dispositivo cadastrado.</p>}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

function Info({ rotulo, valor }: { rotulo: string; valor: string }) {
  return (
    <div className="rounded-md border p-2">
      <dt className="text-xs text-muted-foreground">{rotulo}</dt>
      <dd className="font-medium break-words">{valor}</dd>
    </div>
  );
}

function Check({ ok, label }: { ok: boolean; label: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className={`size-2.5 rounded-full ${ok ? "bg-emerald-600" : "bg-amber-500"}`} />
      <span>{label}</span>
    </div>
  );
}

function ConfigNum({ id, label, valor, onSave }: { id: string; label: string; valor: number; onSave: (v: number) => void }) {
  const [v, setV] = useState(String(valor));
  useEffect(() => setV(String(valor)), [valor]);
  return (
    <div>
      <Label htmlFor={id}>{label}</Label>
      <div className="flex gap-2">
        <Input id={id} type="number" min={1} value={v} onChange={(e) => setV(e.target.value)} />
        <Button variant="outline" size="icon" onClick={() => onSave(Number(v))} aria-label="Salvar">
          <RefreshCw className="size-4" />
        </Button>
      </div>
    </div>
  );
}
