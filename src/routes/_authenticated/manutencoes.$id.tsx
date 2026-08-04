import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { showDbError } from "@/lib/db-error";
import { equipamentosQuery, setoresQuery, profilesQuery, myProfileQuery, statusOsQuery } from "@/lib/queries";
import { manutencaoQuery, mpExecucoesQuery, mpLembretesQuery, mpReagendamentosQuery, periodicidadesQuery } from "@/lib/mp-queries";
import {
  ANTECEDENCIAS, CANAIS_ALERTA, DESTINATARIOS, SITUACOES, GERACAO_OS,
  calcularProximaData, diffDias, formatarSituacao, hojeISO, statusManutencao,
  type MPExecucao,
} from "@/lib/mp-types";
import { formatDate, formatDateTime, formatBRL } from "@/lib/db-types";

export const Route = createFileRoute("/_authenticated/manutencoes/$id")({
  head: () => ({ meta: [{ title: "Manutenção periódica — Manutenção Xica da Silva" }] }),
  component: DetalheManutencao,
});

function DetalheManutencao() {
  const { id } = Route.useParams();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const { data: mp } = useQuery(manutencaoQuery(id));
  const { data: execucoes = [] } = useQuery(mpExecucoesQuery(id));
  const { data: lembretes = [] } = useQuery(mpLembretesQuery(id));
  const { data: reags = [] } = useQuery(mpReagendamentosQuery(id));
  const { data: periodicidades = [] } = useQuery(periodicidadesQuery());
  const { data: equipamentos = [] } = useQuery(equipamentosQuery());
  const { data: setores = [] } = useQuery(setoresQuery());
  const { data: profiles = [] } = useQuery(profilesQuery());
  const { data: status = [] } = useQuery(statusOsQuery());
  const { data: me } = useQuery(myProfileQuery());

  const per = useMemo(() => periodicidades.find((p) => p.id === mp?.periodicidade_id), [periodicidades, mp]);
  const prof = (pid: string | null) => profiles.find((p) => p.id === pid)?.nome ?? "—";

  const emAberto = execucoes.find((e) => e.status !== "concluida" && e.status !== "cancelada");
  const refresh = async () => {
    await Promise.all([
      qc.invalidateQueries({ queryKey: ["manutencao", id] }),
      qc.invalidateQueries({ queryKey: ["mp_execucoes"] }),
      qc.invalidateQueries({ queryKey: ["mp_reag", id] }),
      qc.invalidateQueries({ queryKey: ["manutencoes_periodicas"] }),
    ]);
  };

  if (!mp) return <div className="text-sm text-muted-foreground">Carregando…</div>;

  const atrasada = statusManutencao(mp) === "atrasada";
  const diasAtraso = atrasada ? Math.abs(diffDias(mp.proxima_execucao!, hojeISO())) : 0;

  async function iniciar() {
    if (!mp) return;
    const { error } = await supabase.from("mp_execucoes").insert({
      manutencao_id: mp.id,
      data_programada: mp.proxima_execucao ?? hojeISO(),
      status: "em_andamento",
      iniciada_em: new Date().toISOString(),
      tecnico_id: me?.id ?? null,
      checklist_respostas: (mp.checklist ?? []).map((item) => ({ item, ok: false })),
    });
    if (error) return showDbError(error, "iniciar");
    await refresh();
    toast.success("Execução iniciada.");
  }

  async function gerarOS(execucaoId?: string) {
    if (!mp) return;
    if (!me?.id) return toast.error("Sessão inválida.");
    const statusInicial = status[0]?.id ?? null;
    const equip = equipamentos.find((e) => e.id === mp.equipamento_id);
    const { data, error } = await supabase.from("ordens_servico").insert({
      tipo: "preventiva",
      titulo: `[Manutenção periódica] ${mp.nome}`,
      descricao: [mp.descricao, mp.procedimento, mp.checklist?.length ? `Checklist:\n- ${mp.checklist.join("\n- ")}` : null, mp.materiais ? `Materiais previstos: ${mp.materiais}` : null]
        .filter(Boolean).join("\n\n") || mp.nome,
      categoria_id: mp.categoria_id,
      setor_id: mp.setor_id,
      local: mp.localizacao ?? equip?.localizacao ?? null,
      equipamento_id: mp.equipamento_id,
      solicitante_id: me.id,
      tecnico_id: mp.tecnico_id,
      status_id: statusInicial,
      data_desejada: mp.proxima_execucao,
      equipamento_parado: false,
      manutencao_periodica_id: mp.id,
      mp_execucao_id: execucaoId ?? null,
    }).select("id").single();
    if (error) return showDbError(error, "gerar OS");
    if (execucaoId) await supabase.from("mp_execucoes").update({ os_id: data.id }).eq("id", execucaoId);
    await refresh();
    toast.success("OS preventiva gerada.");
    navigate({ to: "/ordens/$id", params: { id: data.id } });
  }

  async function alterarSituacao(situacao: string) {
    const { error } = await supabase.from("manutencoes_periodicas").update({ situacao }).eq("id", id);
    if (error) return showDbError(error, "situacao");
    await refresh();
    toast.success("Situação atualizada.");
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Link to="/manutencoes" className="text-xs text-muted-foreground hover:underline">← Manutenções Periódicas</Link>
          <h1 className="text-2xl font-bold tracking-tight">{mp.nome}</h1>
          <div className="flex flex-wrap items-center gap-2 mt-1 text-sm text-muted-foreground">
            <Badge variant="outline">{per?.nome ?? "Sem periodicidade"}</Badge>
            <Badge variant="outline">{formatarSituacao(mp.situacao)}</Badge>
            <Badge variant="outline">Prioridade: {mp.prioridade}</Badge>
            {atrasada && <Badge className="bg-red-600 text-white">Atrasada há {diasAtraso} dia(s)</Badge>}
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {!emAberto && mp.situacao === "ativa" && <Button onClick={iniciar}>Iniciar manutenção</Button>}
          <Reagendar mpId={id} atual={mp.proxima_execucao} usuarioId={me?.id ?? null} onDone={refresh} />
          <Button variant="outline" onClick={() => void gerarOS(emAberto?.id)}>Gerar OS</Button>
          <Select value={mp.situacao} onValueChange={(v) => void alterarSituacao(v)}>
            <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
            <SelectContent>{SITUACOES.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}</SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-4">
        <Info titulo="Próxima execução" valor={formatDate(mp.proxima_execucao)} destaque={atrasada} />
        <Info titulo="Última execução" valor={formatDate(mp.ultima_execucao)} />
        <Info titulo="Equipamento" valor={equipamentos.find((e) => e.id === mp.equipamento_id)?.nome ?? "—"} />
        <Info titulo="Setor / local" valor={[setores.find((s) => s.id === mp.setor_id)?.nome, mp.localizacao].filter(Boolean).join(" · ") || "—"} />
        <Info titulo="Técnico responsável" valor={prof(mp.tecnico_id)} />
        <Info titulo="Técnico substituto" valor={prof(mp.tecnico_substituto_id)} />
        <Info titulo="Responsável" valor={prof(mp.responsavel_id)} />
        <Info titulo="Geração de OS" valor={GERACAO_OS.find((g) => g.value === mp.geracao_os)?.label ?? mp.geracao_os} />
      </div>

      <Tabs defaultValue="execucao">
        <TabsList className="flex-wrap h-auto">
          <TabsTrigger value="execucao">Execução</TabsTrigger>
          <TabsTrigger value="plano">Plano</TabsTrigger>
          <TabsTrigger value="lembretes">Lembretes</TabsTrigger>
          <TabsTrigger value="historico">Histórico</TabsTrigger>
        </TabsList>

        <TabsContent value="execucao" className="mt-4">
          {emAberto ? (
            <ExecucaoForm
              exec={emAberto}
              onSaved={refresh}
              onConcluir={async (payload) => {
                const proxima = payload.proxima_data ?? calcularProximaData(hojeISO(), per, mp) ?? null;
                const { error } = await supabase.from("mp_execucoes").update({ ...payload, proxima_data: proxima, status: "concluida", concluida_em: new Date().toISOString() }).eq("id", emAberto.id);
                if (error) return showDbError(error, "concluir");
                const { error: e2 } = await supabase.from("manutencoes_periodicas").update({ ultima_execucao: hojeISO(), proxima_execucao: proxima }).eq("id", id);
                if (e2) showDbError(e2, "proxima data");
                await refresh();
                toast.success(proxima ? `Concluída. Próxima em ${formatDate(proxima)}.` : "Manutenção concluída.");
              }}
            />
          ) : (
            <Card><CardContent className="p-8 text-center text-sm text-muted-foreground">
              Nenhuma execução em andamento. {mp.situacao === "ativa" ? "Clique em “Iniciar manutenção” para começar." : "Manutenção não está ativa."}
            </CardContent></Card>
          )}
        </TabsContent>

        <TabsContent value="plano" className="mt-4 grid gap-3 md:grid-cols-2">
          <Bloco titulo="Descrição do serviço" texto={mp.descricao} />
          <Bloco titulo="Procedimento" texto={mp.procedimento} />
          <Bloco titulo="Materiais necessários" texto={mp.materiais} />
          <Bloco titulo="Ferramentas necessárias" texto={mp.ferramentas} />
          <Bloco titulo="Observações" texto={mp.observacoes} />
          <Card><CardHeader className="py-3"><CardTitle className="text-sm">Checklist</CardTitle></CardHeader>
            <CardContent className="text-sm space-y-1">
              {(mp.checklist ?? []).length === 0 && <span className="text-muted-foreground">Sem itens.</span>}
              {(mp.checklist ?? []).map((c, i) => <div key={i}>• {c}</div>)}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="lembretes" className="mt-4">
          <Lembretes mpId={id} lembretes={lembretes} usuarioId={me?.id ?? null} />
        </TabsContent>

        <TabsContent value="historico" className="mt-4 space-y-4">
          <Card>
            <CardHeader className="py-3"><CardTitle className="text-base">Execuções</CardTitle></CardHeader>
            <CardContent className="p-0 divide-y">
              {execucoes.length === 0 && <div className="p-6 text-center text-sm text-muted-foreground">Nenhuma execução registrada.</div>}
              {execucoes.map((e) => (
                <div key={e.id} className="p-3 text-sm">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant={e.status === "concluida" ? "default" : "secondary"}>{e.status}</Badge>
                    <span>Programada: {formatDate(e.data_programada)}</span>
                    {e.concluida_em && <span className="text-muted-foreground">· Concluída em {formatDateTime(e.concluida_em)}</span>}
                    {e.custo_total > 0 && <span className="text-muted-foreground">· {formatBRL(e.custo_total)}</span>}
                    {e.os_id && <Link to="/ordens/$id" params={{ id: e.os_id }} className="text-primary underline">Ver OS</Link>}
                  </div>
                  {e.servico_realizado && <div className="text-muted-foreground mt-1">{e.servico_realizado}</div>}
                  {e.irregularidades && <div className="text-red-600 mt-1">Irregularidade: {e.irregularidades}</div>}
                </div>
              ))}
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="py-3"><CardTitle className="text-base">Reagendamentos</CardTitle></CardHeader>
            <CardContent className="p-0 divide-y">
              {reags.length === 0 && <div className="p-6 text-center text-sm text-muted-foreground">Nenhum reagendamento.</div>}
              {reags.map((r) => (
                <div key={r.id} className="p-3 text-sm">
                  <div>{formatDate(r.data_original)} → <strong>{formatDate(r.nova_data)}</strong></div>
                  <div className="text-xs text-muted-foreground">Motivo: {r.motivo} · {prof(r.usuario_id)} · {formatDateTime(r.created_at)}</div>
                  {r.observacao && <div className="text-xs text-muted-foreground">{r.observacao}</div>}
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function Info({ titulo, valor, destaque }: { titulo: string; valor: string; destaque?: boolean }) {
  return (
    <Card><CardContent className="p-3">
      <div className="text-xs text-muted-foreground">{titulo}</div>
      <div className={`font-medium ${destaque ? "text-red-600" : ""}`}>{valor}</div>
    </CardContent></Card>
  );
}

function Bloco({ titulo, texto }: { titulo: string; texto: string | null }) {
  return (
    <Card><CardHeader className="py-3"><CardTitle className="text-sm">{titulo}</CardTitle></CardHeader>
      <CardContent className="text-sm whitespace-pre-wrap">{texto || <span className="text-muted-foreground">—</span>}</CardContent>
    </Card>
  );
}

type ConcluirPayload = {
  checklist_respostas: { item: string; ok: boolean }[];
  diagnostico: string | null; irregularidades: string | null; materiais_utilizados: string | null;
  correcao: string | null; recomendacoes: string | null; servico_realizado: string;
  executada_completa: boolean; encontrou_irregularidade: boolean; gerou_corretiva: boolean;
  custo_total: number; proxima_data: string | null;
};

function ExecucaoForm({ exec, onSaved, onConcluir }: { exec: MPExecucao; onSaved: () => Promise<void>; onConcluir: (p: ConcluirPayload) => Promise<unknown> }) {
  const [itens, setItens] = useState(exec.checklist_respostas ?? []);
  const [f, setF] = useState({
    diagnostico: exec.diagnostico ?? "", irregularidades: exec.irregularidades ?? "",
    materiais_utilizados: exec.materiais_utilizados ?? "", correcao: exec.correcao ?? "",
    recomendacoes: exec.recomendacoes ?? "", servico_realizado: exec.servico_realizado ?? "",
    custo_total: String(exec.custo_total ?? 0),
  });
  const [completa, setCompleta] = useState<string>("");
  const [irregular, setIrregular] = useState<string>("");
  const [corretiva, setCorretiva] = useState<string>("");
  const [proxima, setProxima] = useState("");

  async function salvarRascunho() {
    const { error } = await supabase.from("mp_execucoes").update({
      checklist_respostas: itens, diagnostico: f.diagnostico || null, irregularidades: f.irregularidades || null,
      materiais_utilizados: f.materiais_utilizados || null, correcao: f.correcao || null,
      recomendacoes: f.recomendacoes || null, servico_realizado: f.servico_realizado || null,
      custo_total: Number(f.custo_total || 0),
    }).eq("id", exec.id);
    if (error) return showDbError(error, "salvar execução");
    await onSaved();
    toast.success("Progresso salvo.");
  }

  async function concluir() {
    if (!completa || !irregular || !corretiva) return toast.error("Responda as perguntas obrigatórias da conclusão.");
    if (!f.servico_realizado.trim()) return toast.error("Informe qual serviço foi realizado.");
    await onConcluir({
      checklist_respostas: itens,
      diagnostico: f.diagnostico || null, irregularidades: f.irregularidades || null,
      materiais_utilizados: f.materiais_utilizados || null, correcao: f.correcao || null,
      recomendacoes: f.recomendacoes || null, servico_realizado: f.servico_realizado.trim(),
      executada_completa: completa === "sim", encontrou_irregularidade: irregular === "sim",
      gerou_corretiva: corretiva === "sim", custo_total: Number(f.custo_total || 0),
      proxima_data: proxima || null,
    });
  }

  return (
    <Card>
      <CardHeader className="py-3"><CardTitle className="text-base">Execução iniciada em {formatDateTime(exec.iniciada_em)}</CardTitle></CardHeader>
      <CardContent className="grid gap-4">
        <div>
          <Label>Checklist</Label>
          <div className="grid gap-1 mt-1">
            {itens.length === 0 && <span className="text-sm text-muted-foreground">Sem checklist cadastrado.</span>}
            {itens.map((it, i) => (
              <label key={i} className="flex items-center gap-2 text-sm border rounded px-2 py-1">
                <Checkbox checked={it.ok} onCheckedChange={(c) => setItens(itens.map((x, j) => (j === i ? { ...x, ok: !!c } : x)))} />
                {it.item}
              </label>
            ))}
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div><Label>Diagnóstico</Label><Textarea value={f.diagnostico} onChange={(e) => setF({ ...f, diagnostico: e.target.value })} /></div>
          <div><Label>Irregularidades encontradas</Label><Textarea value={f.irregularidades} onChange={(e) => setF({ ...f, irregularidades: e.target.value })} /></div>
          <div><Label>Materiais utilizados</Label><Textarea value={f.materiais_utilizados} onChange={(e) => setF({ ...f, materiais_utilizados: e.target.value })} /></div>
          <div><Label>Correção realizada</Label><Textarea value={f.correcao} onChange={(e) => setF({ ...f, correcao: e.target.value })} /></div>
          <div><Label>Recomendações</Label><Textarea value={f.recomendacoes} onChange={(e) => setF({ ...f, recomendacoes: e.target.value })} /></div>
          <div><Label>Custo total (R$)</Label><Input type="number" step="0.01" value={f.custo_total} onChange={(e) => setF({ ...f, custo_total: e.target.value })} /></div>
        </div>

        <div className="rounded-md border p-3 grid gap-3">
          <div className="text-sm font-semibold">Conclusão (obrigatório)</div>
          <div><Label>Qual serviço foi realizado? *</Label><Textarea value={f.servico_realizado} onChange={(e) => setF({ ...f, servico_realizado: e.target.value })} /></div>
          <div className="grid gap-3 sm:grid-cols-3">
            <SimNao label="Executada por completo? *" value={completa} onChange={setCompleta} />
            <SimNao label="Encontrou irregularidade? *" value={irregular} onChange={setIrregular} />
            <SimNao label="Precisa de corretiva? *" value={corretiva} onChange={setCorretiva} />
          </div>
          <div><Label>Próxima manutenção (deixe vazio para calcular automaticamente)</Label><Input type="date" value={proxima} onChange={(e) => setProxima(e.target.value)} /></div>
        </div>

        <div className="flex flex-wrap justify-end gap-2">
          <Button variant="outline" onClick={salvarRascunho}>Salvar progresso</Button>
          <Button onClick={concluir}>Concluir manutenção</Button>
        </div>
      </CardContent>
    </Card>
  );
}

function SimNao({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <Label>{label}</Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger><SelectValue placeholder="Selecionar" /></SelectTrigger>
        <SelectContent><SelectItem value="sim">Sim</SelectItem><SelectItem value="nao">Não</SelectItem></SelectContent>
      </Select>
    </div>
  );
}

function Reagendar({ mpId, atual, usuarioId, onDone }: { mpId: string; atual: string | null; usuarioId: string | null; onDone: () => Promise<void> }) {
  const [open, setOpen] = useState(false);
  const [nova, setNova] = useState("");
  const [motivo, setMotivo] = useState("");
  const [obs, setObs] = useState("");

  async function salvar() {
    if (!nova) return toast.error("Informe a nova data.");
    if (!motivo.trim()) return toast.error("Informe o motivo do reagendamento.");
    const { error } = await supabase.from("mp_reagendamentos").insert({
      manutencao_id: mpId, data_original: atual, nova_data: nova, motivo: motivo.trim(), observacao: obs || null, usuario_id: usuarioId,
    });
    if (error) return showDbError(error, "reagendar");
    const { error: e2 } = await supabase.from("manutencoes_periodicas").update({ proxima_execucao: nova }).eq("id", mpId);
    if (e2) return showDbError(e2, "reagendar");
    setOpen(false); setNova(""); setMotivo(""); setObs("");
    await onDone();
    toast.success("Manutenção reagendada.");
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild><Button variant="outline">Reagendar</Button></DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Reagendar manutenção</DialogTitle></DialogHeader>
        <div className="grid gap-3">
          <div><Label>Data atual</Label><Input value={formatDate(atual)} readOnly /></div>
          <div><Label>Nova data *</Label><Input type="date" value={nova} onChange={(e) => setNova(e.target.value)} /></div>
          <div><Label>Motivo *</Label><Input value={motivo} onChange={(e) => setMotivo(e.target.value)} /></div>
          <div><Label>Observação</Label><Textarea value={obs} onChange={(e) => setObs(e.target.value)} /></div>
          <div className="flex justify-end"><Button onClick={salvar}>Salvar reagendamento</Button></div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Lembretes({ mpId, lembretes, usuarioId }: { mpId: string; lembretes: { id: string; dias_antes: number; canais: string[]; destinatarios: string[] }[]; usuarioId: string | null }) {
  const qc = useQueryClient();
  const [dias, setDias] = useState("1");
  const [canais, setCanais] = useState<string[]>(["painel"]);
  const [dest, setDest] = useState<string[]>(["tecnico"]);

  async function add() {
    const { error } = await supabase.from("mp_lembretes").insert({ manutencao_id: mpId, dias_antes: Number(dias), canais, destinatarios: dest });
    if (error) return showDbError(error, "lembrete");
    await qc.invalidateQueries({ queryKey: ["mp_lembretes", mpId] });
    toast.success("Lembrete adicionado.");
  }

  async function remover(id: string) {
    const { error } = await supabase.from("mp_lembretes").delete().eq("id", id);
    if (error) return showDbError(error, "lembrete");
    await qc.invalidateQueries({ queryKey: ["mp_lembretes", mpId] });
  }

  async function confirmar(lembreteId: string) {
    if (!usuarioId) return;
    const { error } = await supabase.from("mp_lembrete_eventos").insert([
      { manutencao_id: mpId, lembrete_id: lembreteId, usuario_id: usuarioId, tipo: "visualizado", data_referencia: hojeISO() },
      { manutencao_id: mpId, lembrete_id: lembreteId, usuario_id: usuarioId, tipo: "confirmado", data_referencia: hojeISO() },
    ]);
    if (error) return showDbError(error, "confirmar lembrete");
    toast.success("Recebimento confirmado.");
  }

  return (
    <div className="grid gap-3">
      <Card>
        <CardHeader className="py-3"><CardTitle className="text-base">Lembretes configurados</CardTitle></CardHeader>
        <CardContent className="p-0 divide-y">
          {lembretes.length === 0 && <div className="p-6 text-center text-sm text-muted-foreground">Nenhum lembrete.</div>}
          {lembretes.map((l) => (
            <div key={l.id} className="p-3 flex flex-wrap items-center gap-2 text-sm">
              <Badge variant="secondary">{l.dias_antes === 0 ? "No mesmo dia" : `${l.dias_antes} dia(s) antes`}</Badge>
              <span className="text-muted-foreground">{l.canais.map((c) => CANAIS_ALERTA.find((x) => x.value === c)?.label ?? c).join(", ")}</span>
              <span className="text-muted-foreground">→ {l.destinatarios.map((d) => DESTINATARIOS.find((x) => x.value === d)?.label ?? d).join(", ")}</span>
              <div className="ml-auto flex gap-2">
                <Button size="sm" variant="outline" onClick={() => void confirmar(l.id)}>Confirmar visualização</Button>
                <Button size="sm" variant="ghost" onClick={() => void remover(l.id)}>Remover</Button>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="py-3"><CardTitle className="text-base">Novo lembrete</CardTitle></CardHeader>
        <CardContent className="grid gap-3">
          <div className="flex gap-2 items-end">
            <div className="w-56"><Label>Antecedência</Label>
              <Select value={dias} onValueChange={setDias}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{ANTECEDENCIAS.map((d) => <SelectItem key={d} value={String(d)}>{d === 0 ? "No mesmo dia" : `${d} dia(s) antes`}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="w-32"><Label>Personalizado</Label><Input type="number" onChange={(e) => setDias(e.target.value || "0")} /></div>
            <Button onClick={add}>Adicionar</Button>
          </div>
          <div>
            <Label className="text-xs">Tipos de alerta</Label>
            <div className="flex flex-wrap gap-2 mt-1">
              {CANAIS_ALERTA.map((c) => (
                <label key={c.value} className="flex items-center gap-1 text-xs border rounded px-2 py-1">
                  <Checkbox checked={canais.includes(c.value)} onCheckedChange={(v) => setCanais(v ? [...canais, c.value] : canais.filter((x) => x !== c.value))} />{c.label}
                </label>
              ))}
            </div>
          </div>
          <div>
            <Label className="text-xs">Destinatários</Label>
            <div className="flex flex-wrap gap-2 mt-1">
              {DESTINATARIOS.map((c) => (
                <label key={c.value} className="flex items-center gap-1 text-xs border rounded px-2 py-1">
                  <Checkbox checked={dest.includes(c.value)} onCheckedChange={(v) => setDest(v ? [...dest, c.value] : dest.filter((x) => x !== c.value))} />{c.label}
                </label>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
