import { createFileRoute, Link } from "@tanstack/react-router";
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
import { equipamentosQuery, setoresQuery, categoriasQuery, fornecedoresQuery, profilesQuery, myProfileQuery } from "@/lib/queries";
import { periodicidadesQuery, manutencoesQuery } from "@/lib/mp-queries";
import {
  DIAS_SEMANA, REGRAS_MENSAIS, PRIORIDADES, SITUACOES, GERACAO_OS, CANAIS_ALERTA, DESTINATARIOS, ANTECEDENCIAS,
  diffDias, grupoPeriodicidade, hojeISO, statusManutencao, toISODate,
  type ManutencaoPeriodica,
} from "@/lib/mp-types";
import { formatDate } from "@/lib/db-types";

export const Route = createFileRoute("/_authenticated/manutencoes/")({
  head: () => ({
    meta: [
      { title: "Manutenções Periódicas — Manutenção Xica da Silva" },
      { name: "description", content: "Cadastre, acompanhe e receba lembretes das manutenções preventivas periódicas." },
      { property: "og:title", content: "Manutenções Periódicas" },
      { property: "og:description", content: "Planejamento e acompanhamento das manutenções preventivas." },
    ],
  }),
  component: ManutencoesPage,
});

const GRUPOS_ORDEM = ["Diárias", "Semanais", "Quinzenais", "Mensais", "Bimestrais", "Trimestrais", "Semestrais", "Anuais", "Personalizadas"];

type Lembrete = { dias_antes: number; canais: string[]; destinatarios: string[] };

const FORM_INICIAL = {
  nome: "", equipamento_id: "none", setor_id: "none", localizacao: "", categoria_id: "none",
  descricao: "", procedimento: "", periodicidade_id: "", intervalo_custom: "",
  dias_semana: [] as number[], regra_mensal: "none", dia_mes: "", mes_ano: "",
  data_inicio: hojeISO(), primeira_execucao: hojeISO(), horario_preferencial: "",
  responsavel_id: "none", tecnico_id: "none", tecnico_substituto_id: "none",
  tempo_estimado_min: "", prioridade: "normal", checklist: "", materiais: "", ferramentas: "",
  fornecedor_id: "none", observacoes: "", situacao: "ativa", geracao_os: "lembrete",
};

function ManutencoesPage() {
  const qc = useQueryClient();
  const { data: manutencoes = [] } = useQuery(manutencoesQuery());
  const { data: periodicidades = [] } = useQuery(periodicidadesQuery());
  const { data: equipamentos = [] } = useQuery(equipamentosQuery());
  const { data: setores = [] } = useQuery(setoresQuery());
  const { data: categorias = [] } = useQuery(categoriasQuery());
  const { data: fornecedores = [] } = useQuery(fornecedoresQuery());
  const { data: profiles = [] } = useQuery(profilesQuery());
  const { data: me } = useQuery(myProfileQuery());

  const perMap = useMemo(() => new Map(periodicidades.map((p) => [p.id, p])), [periodicidades]);
  const equipMap = useMemo(() => new Map(equipamentos.map((e) => [e.id, e])), [equipamentos]);
  const setorMap = useMemo(() => new Map(setores.map((s) => [s.id, s])), [setores]);
  const profMap = useMemo(() => new Map(profiles.map((p) => [p.id, p])), [profiles]);

  // filtros
  const [busca, setBusca] = useState("");
  const [fPeriod, setFPeriod] = useState("todas");
  const [fEquip, setFEquip] = useState("todos");
  const [fSetor, setFSetor] = useState("todos");
  const [fTecnico, setFTecnico] = useState("todos");
  const [fSituacao, setFSituacao] = useState("todas");
  const [fPrioridade, setFPrioridade] = useState("todas");
  const [fGrupo, setFGrupo] = useState("todos");

  const filtradas = manutencoes.filter((m) => {
    if (busca && !`${m.nome} ${m.localizacao ?? ""}`.toLowerCase().includes(busca.toLowerCase())) return false;
    if (fPeriod !== "todas" && m.periodicidade_id !== fPeriod) return false;
    if (fEquip !== "todos" && m.equipamento_id !== fEquip) return false;
    if (fSetor !== "todos" && m.setor_id !== fSetor) return false;
    if (fTecnico !== "todos" && m.tecnico_id !== fTecnico) return false;
    if (fSituacao !== "todas" && m.situacao !== fSituacao) return false;
    if (fPrioridade !== "todas" && m.prioridade !== fPrioridade) return false;
    if (fGrupo !== "todos") {
      const st = statusManutencao(m);
      if (fGrupo === "semana") {
        if (!m.proxima_execucao) return false;
        const d = diffDias(m.proxima_execucao, hojeISO());
        if (d < 0 || d > 7) return false;
      } else if (fGrupo === "mes") {
        if (!m.proxima_execucao) return false;
        const d = diffDias(m.proxima_execucao, hojeISO());
        if (d < 0 || d > 31) return false;
      } else if (st !== fGrupo) return false;
    }
    return true;
  });

  const ordenadas = [...filtradas].sort((a, b) => {
    const sa = statusManutencao(a) === "atrasada" ? 0 : 1;
    const sb = statusManutencao(b) === "atrasada" ? 0 : 1;
    if (sa !== sb) return sa - sb;
    return (a.proxima_execucao ?? "9999").localeCompare(b.proxima_execucao ?? "9999");
  });

  const cont = (f: (m: ManutencaoPeriodica) => boolean) => manutencoes.filter(f).length;
  const kpis = [
    { label: "Hoje", value: cont((m) => statusManutencao(m) === "hoje"), grupo: "hoje", cls: "text-primary" },
    { label: "Atrasadas", value: cont((m) => statusManutencao(m) === "atrasada"), grupo: "atrasada", cls: "text-red-600" },
    { label: "Próximas", value: cont((m) => statusManutencao(m) === "proxima"), grupo: "proxima", cls: "text-amber-600" },
    { label: "Aguardando execução", value: cont((m) => m.situacao === "ativa" && !!m.proxima_execucao), grupo: "todos", cls: "text-muted-foreground" },
    { label: "Suspensas", value: cont((m) => m.situacao === "pausada"), grupo: "suspensa", cls: "text-muted-foreground" },
    { label: "Concluídas/encerradas", value: cont((m) => m.situacao === "encerrada"), grupo: "encerrada", cls: "text-emerald-600" },
  ];

  // cadastro
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(FORM_INICIAL);
  const [lembretes, setLembretes] = useState<Lembrete[]>([{ dias_antes: 1, canais: ["painel"], destinatarios: ["tecnico"] }]);
  const perSel = perMap.get(form.periodicidade_id);

  function nn(v: string) { return v.trim() === "" ? null : v.trim(); }
  function sel(v: string) { return v === "none" ? null : v; }

  async function salvar() {
    if (!form.nome.trim()) return toast.error("Informe o nome da manutenção.");
    if (!form.periodicidade_id) return toast.error("Escolha a periodicidade.");
    const checklist = form.checklist.split("\n").map((s) => s.trim()).filter(Boolean);
    const payload = {
      nome: form.nome.trim(),
      equipamento_id: sel(form.equipamento_id),
      setor_id: sel(form.setor_id),
      localizacao: nn(form.localizacao),
      categoria_id: sel(form.categoria_id),
      descricao: nn(form.descricao),
      procedimento: nn(form.procedimento),
      periodicidade_id: form.periodicidade_id,
      intervalo_custom: form.intervalo_custom ? Number(form.intervalo_custom) : null,
      dias_semana: form.dias_semana.length ? form.dias_semana : null,
      regra_mensal: sel(form.regra_mensal),
      dia_mes: form.dia_mes ? Number(form.dia_mes) : null,
      mes_ano: form.mes_ano ? Number(form.mes_ano) : null,
      data_inicio: form.data_inicio || null,
      primeira_execucao: form.primeira_execucao || null,
      proxima_execucao: form.primeira_execucao || form.data_inicio || null,
      horario_preferencial: nn(form.horario_preferencial),
      responsavel_id: sel(form.responsavel_id),
      tecnico_id: sel(form.tecnico_id),
      tecnico_substituto_id: sel(form.tecnico_substituto_id),
      tempo_estimado_min: form.tempo_estimado_min ? Number(form.tempo_estimado_min) : null,
      prioridade: form.prioridade,
      checklist,
      materiais: nn(form.materiais),
      ferramentas: nn(form.ferramentas),
      fornecedor_id: sel(form.fornecedor_id),
      observacoes: nn(form.observacoes),
      situacao: form.situacao,
      geracao_os: form.geracao_os,
      criado_por: me?.id ?? null,
    };
    const { data, error } = await supabase.from("manutencoes_periodicas").insert(payload).select("id").single();
    if (error) return showDbError(error, "manutencao");
    if (lembretes.length) {
      const { error: e2 } = await supabase.from("mp_lembretes").insert(
        lembretes.map((l) => ({ manutencao_id: data.id, dias_antes: l.dias_antes, canais: l.canais, destinatarios: l.destinatarios })),
      );
      if (e2) showDbError(e2, "lembretes");
    }
    setOpen(false);
    setForm(FORM_INICIAL);
    setLembretes([{ dias_antes: 1, canais: ["painel"], destinatarios: ["tecnico"] }]);
    await qc.invalidateQueries({ queryKey: ["manutencoes_periodicas"] });
    toast.success("Manutenção periódica cadastrada.");
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Manutenções Periódicas</h1>
          <p className="text-sm text-muted-foreground">{manutencoes.length} planos cadastrados</p>
        </div>
        <div className="flex gap-2">
          {me?.is_master && <NovaPeriodicidade />}
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild><Button>+ Nova manutenção</Button></DialogTrigger>
            <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
              <DialogHeader><DialogTitle>Nova manutenção periódica</DialogTitle></DialogHeader>
              <div className="grid gap-4">
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="sm:col-span-2"><Label>Nome da manutenção *</Label><Input value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} /></div>
                  <Campo label="Equipamento">
                    <Select value={form.equipamento_id} onValueChange={(v) => setForm({ ...form, equipamento_id: v })}>
                      <SelectTrigger><SelectValue placeholder="Selecionar" /></SelectTrigger>
                      <SelectContent><SelectItem value="none">Nenhum</SelectItem>{equipamentos.map((e) => <SelectItem key={e.id} value={e.id}>{e.nome}</SelectItem>)}</SelectContent>
                    </Select>
                  </Campo>
                  <Campo label="Setor">
                    <Select value={form.setor_id} onValueChange={(v) => setForm({ ...form, setor_id: v })}>
                      <SelectTrigger><SelectValue placeholder="Selecionar" /></SelectTrigger>
                      <SelectContent><SelectItem value="none">Nenhum</SelectItem>{setores.map((s) => <SelectItem key={s.id} value={s.id}>{s.nome}</SelectItem>)}</SelectContent>
                    </Select>
                  </Campo>
                  <Campo label="Localização"><Input value={form.localizacao} onChange={(e) => setForm({ ...form, localizacao: e.target.value })} /></Campo>
                  <Campo label="Categoria">
                    <Select value={form.categoria_id} onValueChange={(v) => setForm({ ...form, categoria_id: v })}>
                      <SelectTrigger><SelectValue placeholder="Selecionar" /></SelectTrigger>
                      <SelectContent><SelectItem value="none">Nenhuma</SelectItem>{categorias.map((c) => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}</SelectContent>
                    </Select>
                  </Campo>
                  <div className="sm:col-span-2"><Label>Descrição do serviço</Label><Textarea value={form.descricao} onChange={(e) => setForm({ ...form, descricao: e.target.value })} /></div>
                  <div className="sm:col-span-2"><Label>Procedimento a ser realizado</Label><Textarea value={form.procedimento} onChange={(e) => setForm({ ...form, procedimento: e.target.value })} /></div>
                </div>

                <div className="rounded-md border p-3 grid gap-3">
                  <div className="text-sm font-semibold">Periodicidade</div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <Campo label="Periodicidade *">
                      <Select value={form.periodicidade_id} onValueChange={(v) => setForm({ ...form, periodicidade_id: v })}>
                        <SelectTrigger><SelectValue placeholder="Selecionar" /></SelectTrigger>
                        <SelectContent>{periodicidades.map((p) => <SelectItem key={p.id} value={p.id}>{p.nome}</SelectItem>)}</SelectContent>
                      </Select>
                    </Campo>
                    {perSel && perSel.intervalo == null && ["dias", "semanas", "meses", "horas_funcionamento", "utilizacoes"].includes(perSel.tipo) && (
                      <Campo label={`Quantidade (${perSel.unidade ?? ""})`}>
                        <Input type="number" min={1} value={form.intervalo_custom} onChange={(e) => setForm({ ...form, intervalo_custom: e.target.value })} />
                      </Campo>
                    )}
                  </div>
                  <div>
                    <Label className="text-xs">Dias da semana (para manutenções semanais)</Label>
                    <div className="flex flex-wrap gap-2 mt-1">
                      {DIAS_SEMANA.map((d) => (
                        <label key={d.value} className="flex items-center gap-1 text-sm border rounded px-2 py-1">
                          <Checkbox checked={form.dias_semana.includes(d.value)} onCheckedChange={(c) => setForm({ ...form, dias_semana: c ? [...form.dias_semana, d.value] : form.dias_semana.filter((x) => x !== d.value) })} />
                          {d.label}
                        </label>
                      ))}
                    </div>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-3">
                    <Campo label="Regra mensal">
                      <Select value={form.regra_mensal} onValueChange={(v) => setForm({ ...form, regra_mensal: v })}>
                        <SelectTrigger><SelectValue placeholder="Nenhuma" /></SelectTrigger>
                        <SelectContent><SelectItem value="none">Nenhuma</SelectItem>{REGRAS_MENSAIS.map((r) => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}</SelectContent>
                      </Select>
                    </Campo>
                    <Campo label="Dia do mês"><Input type="number" min={1} max={31} value={form.dia_mes} onChange={(e) => setForm({ ...form, dia_mes: e.target.value })} /></Campo>
                    <Campo label="Mês (anual)"><Input type="number" min={1} max={12} value={form.mes_ano} onChange={(e) => setForm({ ...form, mes_ano: e.target.value })} /></Campo>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-3">
                    <Campo label="Data de início"><Input type="date" value={form.data_inicio} onChange={(e) => setForm({ ...form, data_inicio: e.target.value })} /></Campo>
                    <Campo label="Primeira execução"><Input type="date" value={form.primeira_execucao} onChange={(e) => setForm({ ...form, primeira_execucao: e.target.value })} /></Campo>
                    <Campo label="Horário preferencial"><Input type="time" value={form.horario_preferencial} onChange={(e) => setForm({ ...form, horario_preferencial: e.target.value })} /></Campo>
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <Campo label="Responsável pelo acompanhamento">
                    <Select value={form.responsavel_id} onValueChange={(v) => setForm({ ...form, responsavel_id: v })}>
                      <SelectTrigger><SelectValue placeholder="Selecionar" /></SelectTrigger>
                      <SelectContent><SelectItem value="none">Nenhum</SelectItem>{profiles.map((p) => <SelectItem key={p.id} value={p.id}>{p.nome}</SelectItem>)}</SelectContent>
                    </Select>
                  </Campo>
                  <Campo label="Técnico responsável">
                    <Select value={form.tecnico_id} onValueChange={(v) => setForm({ ...form, tecnico_id: v })}>
                      <SelectTrigger><SelectValue placeholder="Selecionar" /></SelectTrigger>
                      <SelectContent><SelectItem value="none">Nenhum</SelectItem>{profiles.map((p) => <SelectItem key={p.id} value={p.id}>{p.nome}</SelectItem>)}</SelectContent>
                    </Select>
                  </Campo>
                  <Campo label="Técnico substituto">
                    <Select value={form.tecnico_substituto_id} onValueChange={(v) => setForm({ ...form, tecnico_substituto_id: v })}>
                      <SelectTrigger><SelectValue placeholder="Selecionar" /></SelectTrigger>
                      <SelectContent><SelectItem value="none">Nenhum</SelectItem>{profiles.map((p) => <SelectItem key={p.id} value={p.id}>{p.nome}</SelectItem>)}</SelectContent>
                    </Select>
                  </Campo>
                  <Campo label="Tempo estimado (min)"><Input type="number" value={form.tempo_estimado_min} onChange={(e) => setForm({ ...form, tempo_estimado_min: e.target.value })} /></Campo>
                  <Campo label="Prioridade">
                    <Select value={form.prioridade} onValueChange={(v) => setForm({ ...form, prioridade: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>{PRIORIDADES.map((p) => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}</SelectContent>
                    </Select>
                  </Campo>
                  <Campo label="Fornecedor relacionado">
                    <Select value={form.fornecedor_id} onValueChange={(v) => setForm({ ...form, fornecedor_id: v })}>
                      <SelectTrigger><SelectValue placeholder="Selecionar" /></SelectTrigger>
                      <SelectContent><SelectItem value="none">Nenhum</SelectItem>{fornecedores.map((f) => <SelectItem key={f.id} value={f.id}>{f.nome}</SelectItem>)}</SelectContent>
                    </Select>
                  </Campo>
                  <div className="sm:col-span-2"><Label>Checklist (um item por linha)</Label><Textarea rows={4} value={form.checklist} onChange={(e) => setForm({ ...form, checklist: e.target.value })} /></div>
                  <Campo label="Materiais necessários"><Textarea value={form.materiais} onChange={(e) => setForm({ ...form, materiais: e.target.value })} /></Campo>
                  <Campo label="Ferramentas necessárias"><Textarea value={form.ferramentas} onChange={(e) => setForm({ ...form, ferramentas: e.target.value })} /></Campo>
                  <div className="sm:col-span-2"><Label>Observações</Label><Textarea value={form.observacoes} onChange={(e) => setForm({ ...form, observacoes: e.target.value })} /></div>
                  <Campo label="Situação">
                    <Select value={form.situacao} onValueChange={(v) => setForm({ ...form, situacao: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>{SITUACOES.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}</SelectContent>
                    </Select>
                  </Campo>
                  <Campo label="Geração de OS">
                    <Select value={form.geracao_os} onValueChange={(v) => setForm({ ...form, geracao_os: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>{GERACAO_OS.map((g) => <SelectItem key={g.value} value={g.value}>{g.label}</SelectItem>)}</SelectContent>
                    </Select>
                  </Campo>
                </div>

                <div className="rounded-md border p-3 grid gap-3">
                  <div className="flex items-center justify-between">
                    <div className="text-sm font-semibold">Lembretes antecipados</div>
                    <Button type="button" size="sm" variant="outline" onClick={() => setLembretes([...lembretes, { dias_antes: 0, canais: ["painel"], destinatarios: ["tecnico"] }])}>+ Lembrete</Button>
                  </div>
                  {lembretes.map((l, i) => (
                    <div key={i} className="rounded border p-2 grid gap-2">
                      <div className="flex items-center gap-2">
                        <Select value={String(l.dias_antes)} onValueChange={(v) => setLembretes(lembretes.map((x, j) => (j === i ? { ...x, dias_antes: Number(v) } : x)))}>
                          <SelectTrigger className="w-56"><SelectValue /></SelectTrigger>
                          <SelectContent>{ANTECEDENCIAS.map((d) => <SelectItem key={d} value={String(d)}>{d === 0 ? "No mesmo dia" : `${d} dia(s) antes`}</SelectItem>)}</SelectContent>
                        </Select>
                        <Input type="number" className="w-28" placeholder="Outro" onChange={(e) => setLembretes(lembretes.map((x, j) => (j === i ? { ...x, dias_antes: Number(e.target.value || 0) } : x)))} />
                        <Button type="button" size="sm" variant="ghost" onClick={() => setLembretes(lembretes.filter((_, j) => j !== i))}>Remover</Button>
                      </div>
                      <MultiCheck opcoes={CANAIS_ALERTA} valores={l.canais} onChange={(v) => setLembretes(lembretes.map((x, j) => (j === i ? { ...x, canais: v } : x)))} />
                      <MultiCheck opcoes={DESTINATARIOS} valores={l.destinatarios} onChange={(v) => setLembretes(lembretes.map((x, j) => (j === i ? { ...x, destinatarios: v } : x)))} />
                    </div>
                  ))}
                </div>

                <div className="flex justify-end"><Button onClick={salvar}>Salvar manutenção</Button></div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="grid gap-3 grid-cols-2 lg:grid-cols-6">
        {kpis.map((k) => (
          <button key={k.label} onClick={() => setFGrupo(k.grupo)} className="text-left">
            <Card className={fGrupo === k.grupo ? "border-primary" : ""}>
              <CardContent className="p-3">
                <div className={`text-2xl font-bold ${k.cls}`}>{k.value}</div>
                <div className="text-xs text-muted-foreground">{k.label}</div>
              </CardContent>
            </Card>
          </button>
        ))}
      </div>

      <Card>
        <CardContent className="p-3 grid gap-2 sm:grid-cols-3 lg:grid-cols-4">
          <Input placeholder="Buscar…" value={busca} onChange={(e) => setBusca(e.target.value)} />
          <FiltroSelect value={fGrupo} onChange={setFGrupo} placeholder="Período" opcoes={[
            { value: "todos", label: "Todos os períodos" }, { value: "hoje", label: "Hoje" }, { value: "atrasada", label: "Atrasadas" },
            { value: "semana", label: "Esta semana" }, { value: "mes", label: "Este mês" }, { value: "suspensa", label: "Suspensas" }, { value: "encerrada", label: "Encerradas" },
          ]} />
          <FiltroSelect value={fPeriod} onChange={setFPeriod} placeholder="Periodicidade" opcoes={[{ value: "todas", label: "Todas periodicidades" }, ...periodicidades.map((p) => ({ value: p.id, label: p.nome }))]} />
          <FiltroSelect value={fEquip} onChange={setFEquip} placeholder="Equipamento" opcoes={[{ value: "todos", label: "Todos equipamentos" }, ...equipamentos.map((e) => ({ value: e.id, label: e.nome }))]} />
          <FiltroSelect value={fSetor} onChange={setFSetor} placeholder="Setor" opcoes={[{ value: "todos", label: "Todos setores" }, ...setores.map((s) => ({ value: s.id, label: s.nome }))]} />
          <FiltroSelect value={fTecnico} onChange={setFTecnico} placeholder="Técnico" opcoes={[{ value: "todos", label: "Todos técnicos" }, ...profiles.map((p) => ({ value: p.id, label: p.nome }))]} />
          <FiltroSelect value={fSituacao} onChange={setFSituacao} placeholder="Situação" opcoes={[{ value: "todas", label: "Todas situações" }, ...SITUACOES]} />
          <FiltroSelect value={fPrioridade} onChange={setFPrioridade} placeholder="Prioridade" opcoes={[{ value: "todas", label: "Todas prioridades" }, ...PRIORIDADES]} />
        </CardContent>
      </Card>

      <Tabs defaultValue="lista">
        <TabsList className="flex-wrap h-auto">
          <TabsTrigger value="lista">Lista</TabsTrigger>
          <TabsTrigger value="mes">Calendário mensal</TabsTrigger>
          <TabsTrigger value="semana">Calendário semanal</TabsTrigger>
          <TabsTrigger value="timeline">Linha do tempo</TabsTrigger>
          <TabsTrigger value="quadro">Quadro por status</TabsTrigger>
        </TabsList>

        <TabsContent value="lista" className="space-y-4 mt-4">
          {GRUPOS_ORDEM.map((g) => {
            const itens = ordenadas.filter((m) => grupoPeriodicidade(perMap.get(m.periodicidade_id ?? "")) === g);
            if (!itens.length) return null;
            return (
              <Card key={g}>
                <CardHeader className="py-3"><CardTitle className="text-base">{g} <span className="text-muted-foreground font-normal">({itens.length})</span></CardTitle></CardHeader>
                <CardContent className="p-0 divide-y">
                  {itens.map((m) => <LinhaMP key={m.id} m={m} equip={equipMap.get(m.equipamento_id ?? "")?.nome} setor={setorMap.get(m.setor_id ?? "")?.nome} tecnico={profMap.get(m.tecnico_id ?? "")?.nome} />)}
                </CardContent>
              </Card>
            );
          })}
          {ordenadas.length === 0 && <Card><CardContent className="p-8 text-center text-sm text-muted-foreground">Nenhuma manutenção encontrada.</CardContent></Card>}
        </TabsContent>

        <TabsContent value="mes" className="mt-4"><CalendarioMensal itens={ordenadas} /></TabsContent>
        <TabsContent value="semana" className="mt-4"><CalendarioSemanal itens={ordenadas} /></TabsContent>

        <TabsContent value="timeline" className="mt-4">
          <Card><CardContent className="p-4 space-y-3">
            {ordenadas.filter((m) => m.proxima_execucao).map((m) => (
              <div key={m.id} className="flex gap-3 items-start">
                <div className="w-24 shrink-0 text-xs text-muted-foreground pt-1">{formatDate(m.proxima_execucao)}</div>
                <div className="w-px bg-border self-stretch" />
                <Link to="/manutencoes/$id" params={{ id: m.id }} className="flex-1 hover:underline">
                  <div className="font-medium">{m.nome}</div>
                  <div className="text-xs text-muted-foreground">{equipMap.get(m.equipamento_id ?? "")?.nome ?? "—"}</div>
                </Link>
                <StatusBadge m={m} />
              </div>
            ))}
            {ordenadas.length === 0 && <div className="text-sm text-muted-foreground text-center py-6">Sem manutenções.</div>}
          </CardContent></Card>
        </TabsContent>

        <TabsContent value="quadro" className="mt-4">
          <div className="grid gap-3 md:grid-cols-4">
            {[
              { k: "atrasada", t: "Atrasadas" }, { k: "hoje", t: "Hoje" }, { k: "proxima", t: "Próximas" }, { k: "suspensa", t: "Suspensas" },
            ].map((col) => (
              <Card key={col.k}>
                <CardHeader className="py-3"><CardTitle className="text-sm">{col.t}</CardTitle></CardHeader>
                <CardContent className="p-2 space-y-2">
                  {ordenadas.filter((m) => statusManutencao(m) === col.k).map((m) => (
                    <Link key={m.id} to="/manutencoes/$id" params={{ id: m.id }} className="block rounded border p-2 hover:bg-muted/50">
                      <div className="text-sm font-medium truncate">{m.nome}</div>
                      <div className="text-xs text-muted-foreground">{formatDate(m.proxima_execucao)}</div>
                    </Link>
                  ))}
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function Campo({ label, children }: { label: string; children: React.ReactNode }) {
  return <div><Label>{label}</Label>{children}</div>;
}

function FiltroSelect({ value, onChange, placeholder, opcoes }: { value: string; onChange: (v: string) => void; placeholder: string; opcoes: { value: string; label: string }[] }) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger><SelectValue placeholder={placeholder} /></SelectTrigger>
      <SelectContent>{opcoes.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
    </Select>
  );
}

function MultiCheck({ opcoes, valores, onChange }: { opcoes: { value: string; label: string }[]; valores: string[]; onChange: (v: string[]) => void }) {
  return (
    <div className="flex flex-wrap gap-2">
      {opcoes.map((o) => (
        <label key={o.value} className="flex items-center gap-1 text-xs border rounded px-2 py-1">
          <Checkbox checked={valores.includes(o.value)} onCheckedChange={(c) => onChange(c ? [...valores, o.value] : valores.filter((v) => v !== o.value))} />
          {o.label}
        </label>
      ))}
    </div>
  );
}

function StatusBadge({ m }: { m: ManutencaoPeriodica }) {
  const st = statusManutencao(m);
  if (st === "atrasada") {
    const dias = Math.abs(diffDias(m.proxima_execucao!, hojeISO()));
    return <Badge className="bg-red-600 text-white">Atrasada · {dias} dia(s)</Badge>;
  }
  if (st === "hoje") return <Badge className="bg-primary text-primary-foreground">Hoje</Badge>;
  if (st === "suspensa") return <Badge variant="outline">Suspensa</Badge>;
  if (st === "encerrada") return <Badge variant="outline">Encerrada</Badge>;
  if (st === "sem_data") return <Badge variant="outline">Sem data</Badge>;
  return <Badge variant="secondary">Próxima</Badge>;
}

function LinhaMP({ m, equip, setor, tecnico }: { m: ManutencaoPeriodica; equip?: string; setor?: string; tecnico?: string }) {
  const atrasada = statusManutencao(m) === "atrasada";
  return (
    <Link to="/manutencoes/$id" params={{ id: m.id }} className={`grid grid-cols-[minmax(0,1fr)_auto] gap-3 p-3 items-center hover:bg-muted/50 ${atrasada ? "bg-red-50 dark:bg-red-950/20" : ""}`}>
      <div className="min-w-0">
        <div className={`font-medium truncate ${atrasada ? "text-red-600" : ""}`}>{m.nome}</div>
        <div className="text-xs text-muted-foreground truncate">
          {[equip, setor, m.localizacao, tecnico].filter(Boolean).join(" · ") || "—"} · Próxima: {formatDate(m.proxima_execucao)}
        </div>
      </div>
      <StatusBadge m={m} />
    </Link>
  );
}

function CalendarioMensal({ itens }: { itens: ManutencaoPeriodica[] }) {
  const [ref, setRef] = useState(() => { const d = new Date(); return new Date(d.getFullYear(), d.getMonth(), 1); });
  const primeiro = new Date(ref.getFullYear(), ref.getMonth(), 1);
  const inicio = new Date(primeiro); inicio.setDate(1 - primeiro.getDay());
  const dias = Array.from({ length: 42 }, (_, i) => { const d = new Date(inicio); d.setDate(inicio.getDate() + i); return d; });
  const porDia = new Map<string, ManutencaoPeriodica[]>();
  itens.forEach((m) => { if (m.proxima_execucao) porDia.set(m.proxima_execucao, [...(porDia.get(m.proxima_execucao) ?? []), m]); });

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between py-3">
        <CardTitle className="text-base">{ref.toLocaleDateString("pt-BR", { month: "long", year: "numeric" })}</CardTitle>
        <div className="flex gap-1">
          <Button size="sm" variant="outline" onClick={() => setRef(new Date(ref.getFullYear(), ref.getMonth() - 1, 1))}>‹</Button>
          <Button size="sm" variant="outline" onClick={() => setRef(new Date(ref.getFullYear(), ref.getMonth() + 1, 1))}>›</Button>
        </div>
      </CardHeader>
      <CardContent className="p-2">
        <div className="grid grid-cols-7 gap-1 text-center text-xs text-muted-foreground mb-1">
          {DIAS_SEMANA.map((d) => <div key={d.value}>{d.label}</div>)}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {dias.map((d) => {
            const iso = toISODate(d);
            const list = porDia.get(iso) ?? [];
            const outro = d.getMonth() !== ref.getMonth();
            return (
              <div key={iso} className={`min-h-16 rounded border p-1 text-xs ${outro ? "opacity-40" : ""} ${iso === hojeISO() ? "border-primary" : ""}`}>
                <div className="text-[10px] text-muted-foreground">{d.getDate()}</div>
                {list.slice(0, 3).map((m) => (
                  <Link key={m.id} to="/manutencoes/$id" params={{ id: m.id }} className={`block truncate rounded px-1 ${statusManutencao(m) === "atrasada" ? "bg-red-600 text-white" : "bg-muted"}`}>{m.nome}</Link>
                ))}
                {list.length > 3 && <div className="text-[10px] text-muted-foreground">+{list.length - 3}</div>}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

function CalendarioSemanal({ itens }: { itens: ManutencaoPeriodica[] }) {
  const [offset, setOffset] = useState(0);
  const hoje = new Date();
  const inicio = new Date(hoje); inicio.setDate(hoje.getDate() - hoje.getDay() + offset * 7);
  const dias = Array.from({ length: 7 }, (_, i) => { const d = new Date(inicio); d.setDate(inicio.getDate() + i); return d; });
  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between py-3">
        <CardTitle className="text-base">Semana de {formatDate(toISODate(dias[0]!))}</CardTitle>
        <div className="flex gap-1">
          <Button size="sm" variant="outline" onClick={() => setOffset(offset - 1)}>‹</Button>
          <Button size="sm" variant="outline" onClick={() => setOffset(0)}>Hoje</Button>
          <Button size="sm" variant="outline" onClick={() => setOffset(offset + 1)}>›</Button>
        </div>
      </CardHeader>
      <CardContent className="grid gap-2 md:grid-cols-7 p-3">
        {dias.map((d) => {
          const iso = toISODate(d);
          const list = itens.filter((m) => m.proxima_execucao === iso);
          return (
            <div key={iso} className={`rounded border p-2 min-h-24 ${iso === hojeISO() ? "border-primary" : ""}`}>
              <div className="text-xs font-medium mb-1">{d.toLocaleDateString("pt-BR", { weekday: "short", day: "2-digit" })}</div>
              {list.map((m) => (
                <Link key={m.id} to="/manutencoes/$id" params={{ id: m.id }} className="block text-xs truncate rounded bg-muted px-1 mb-1">{m.nome}</Link>
              ))}
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}

function NovaPeriodicidade() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [nome, setNome] = useState("");
  const [tipo, setTipo] = useState("dias");
  const [intervalo, setIntervalo] = useState("");

  async function salvar() {
    if (!nome.trim()) return toast.error("Informe o nome.");
    const { error } = await supabase.from("periodicidades").insert({
      nome: nome.trim(), tipo, intervalo: intervalo ? Number(intervalo) : null, unidade: tipo, ordem: 99,
    });
    if (error) return showDbError(error, "periodicidade");
    setOpen(false); setNome(""); setIntervalo("");
    await qc.invalidateQueries({ queryKey: ["periodicidades"] });
    toast.success("Periodicidade criada.");
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild><Button variant="outline">Periodicidades</Button></DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Nova periodicidade</DialogTitle></DialogHeader>
        <div className="grid gap-3">
          <Campo label="Nome"><Input value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Ex.: A cada 45 dias" /></Campo>
          <Campo label="Base de cálculo">
            <Select value={tipo} onValueChange={setTipo}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="dias">Dias</SelectItem>
                <SelectItem value="semanas">Semanas</SelectItem>
                <SelectItem value="meses">Meses</SelectItem>
                <SelectItem value="data_personalizada">Data personalizada</SelectItem>
                <SelectItem value="horas_funcionamento">Horas de funcionamento</SelectItem>
                <SelectItem value="utilizacoes">Utilizações</SelectItem>
              </SelectContent>
            </Select>
          </Campo>
          <Campo label="Intervalo (deixe vazio para perguntar em cada manutenção)"><Input type="number" value={intervalo} onChange={(e) => setIntervalo(e.target.value)} /></Campo>
          <div className="flex justify-end"><Button onClick={salvar}>Salvar</Button></div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

