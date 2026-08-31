import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { equipamentosQuery, profilesQuery } from "@/lib/queries";
import {
  checklistsQuery, checklistModelosQuery, checklistModeloItensQuery, execucoesQuery, componentesQuery,
  tiposRespostaQuery,
} from "@/lib/checklist-queries";
import { ChecklistFormDialog } from "@/components/checklist-form";
import { ComponentesEquipamento } from "@/components/equipamento-componentes";
import { PERIODICIDADES, periodicidadeLabel, diasParaVencimento, COMPONENTES_SUGERIDOS, type Checklist } from "@/lib/checklists";
import { formatDate, formatDateTime } from "@/lib/db-types";
import { useSessaoUsuario } from "@/lib/sessao";
import { supabase } from "@/integrations/supabase/client";
import { showDbError } from "@/lib/db-error";
import { toast } from "sonner";
import { ClipboardCheck, Pencil, Trash2, Play, Plus } from "lucide-react";

export const Route = createFileRoute("/_authenticated/checklists/")({
  head: () => ({
    meta: [
      { title: "Checklists de inspeção — Manutenção Xica da Silva" },
      { name: "description", content: "Fichas de inspeção técnica por equipamento: componentes, itens de verificação, não conformidades e OS." },
      { property: "og:title", content: "Checklists de inspeção — Manutenção Xica da Silva" },
      { property: "og:description", content: "Checklists específicos por equipamento, com histórico e conformidade." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ChecklistsPage,
});

function ChecklistsPage() {
  const { mestre, roles } = useSessaoUsuario();
  const podeGerenciar = mestre || roles.includes("admin") || roles.includes("gestor");
  const { data: equipamentos = [] } = useQuery(equipamentosQuery());
  const { data: checklists = [] } = useQuery(checklistsQuery());
  const { data: execucoes = [] } = useQuery(execucoesQuery());
  const { data: pessoas = [] } = useQuery(profilesQuery());

  const [equipSel, setEquipSel] = useState("");
  const [busca, setBusca] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [editando, setEditando] = useState<Checklist | null>(null);

  const equipamento = equipamentos.find((e) => e.id === equipSel) ?? null;
  const doEquipamento = checklists.filter((c) => c.equipamento_id === equipSel);
  const filtrados = equipamentos.filter((e) =>
    !busca.trim() || `${e.nome} ${e.codigo ?? ""} ${e.patrimonio ?? ""}`.toLowerCase().includes(busca.toLowerCase()));

  const pendentes = useMemo(
    () => checklists
      .filter((c) => c.ativo && c.proxima_execucao)
      .map((c) => ({ c, dias: diasParaVencimento(c.proxima_execucao) }))
      .filter((x) => x.dias !== null && x.dias <= 7)
      .sort((a, b) => (a.dias ?? 0) - (b.dias ?? 0)),
    [checklists],
  );

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Checklists</h1>
        <p className="text-sm text-muted-foreground">
          Ficha de inspeção técnica por equipamento: componentes → itens de verificação → resultado → não conformidade → OS
        </p>
      </div>

      {pendentes.length > 0 && (
        <Card className="border-amber-500/50">
          <CardHeader className="py-3"><CardTitle className="text-base text-amber-600">Inspeções previstas</CardTitle></CardHeader>
          <CardContent className="space-y-1 text-sm">
            {pendentes.slice(0, 6).map(({ c, dias }) => (
              <div key={c.id} className="flex flex-wrap items-center justify-between gap-2">
                <span>{c.nome} — {equipamentos.find((e) => e.id === c.equipamento_id)?.nome ?? "equipamento"}</span>
                <span className={dias !== null && dias < 0 ? "font-semibold text-destructive" : "text-muted-foreground"}>
                  {dias !== null && dias < 0 ? `atrasada ${Math.abs(dias)} d` : `em ${dias} d`} · {formatDate(c.proxima_execucao)}
                </span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="executar">
        <TabsList className="flex w-full flex-wrap justify-start h-auto">
          <TabsTrigger value="executar">Executar inspeção</TabsTrigger>
          <TabsTrigger value="modelos">Modelos</TabsTrigger>
          <TabsTrigger value="historico">Histórico</TabsTrigger>
        </TabsList>

        <TabsContent value="executar" className="space-y-3">
          <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
            <Input placeholder="Buscar equipamento…" value={busca} onChange={(e) => setBusca(e.target.value)} />
            <Select value={equipSel} onValueChange={setEquipSel}>
              <SelectTrigger><SelectValue placeholder="Selecione o equipamento" /></SelectTrigger>
              <SelectContent>
                {filtrados.map((e) => (
                  <SelectItem key={e.id} value={e.id}>{e.nome}{e.codigo ? ` (${e.codigo})` : ""}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {!equipamento && (
            <Card><CardContent className="p-6 text-sm text-muted-foreground">
              Selecione um equipamento para ver os checklists cadastrados para ele.
            </CardContent></Card>
          )}

          {equipamento && (
            <>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="text-lg font-semibold">{equipamento.nome}</h2>
                <div className="flex gap-2">
                  <Button asChild variant="outline" size="sm">
                    <Link to="/equipamentos/$id" params={{ id: equipamento.id }}>Abrir ficha</Link>
                  </Button>
                  <Button size="sm" onClick={() => { setEditando(null); setFormOpen(true); }}>
                    <Plus className="mr-1 size-4" />Novo checklist
                  </Button>
                </div>
              </div>

              <Card>
                <CardContent className="divide-y p-0">
                  {doEquipamento.length === 0 && (
                    <div className="p-4 text-sm text-muted-foreground">Nenhum checklist cadastrado para este equipamento.</div>
                  )}
                  {doEquipamento.map((c) => (
                    <ChecklistLinha
                      key={c.id}
                      checklist={c}
                      podeGerenciar={podeGerenciar}
                      onEditar={() => { setEditando(c); setFormOpen(true); }}
                    />
                  ))}
                </CardContent>
              </Card>

              <ComponentesEquipamento equipamentoId={equipamento.id} />

              <ChecklistFormDialog
                equipamentoId={equipamento.id}
                checklist={editando}
                open={formOpen}
                onOpenChange={setFormOpen}
              />
            </>
          )}
        </TabsContent>

        <TabsContent value="modelos">
          <ModelosPanel podeGerenciar={podeGerenciar} />
        </TabsContent>

        <TabsContent value="historico">
          <Card>
            <CardContent className="divide-y p-0">
              {execucoes.length === 0 && <div className="p-4 text-sm text-muted-foreground">Nenhuma inspeção realizada ainda.</div>}
              {execucoes.map((ex) => (
                <Link
                  key={ex.id}
                  to="/checklists/resultado/$id"
                  params={{ id: ex.id }}
                  className="flex flex-wrap items-center gap-3 p-3 hover:bg-muted/50"
                >
                  <ClipboardCheck className="size-4 text-muted-foreground" />
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-medium">
                      {checklists.find((c) => c.id === ex.checklist_id)?.nome ?? "Checklist"} —{" "}
                      {equipamentos.find((e) => e.id === ex.equipamento_id)?.nome ?? "Equipamento"}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {formatDateTime(ex.concluida_em ?? ex.iniciada_em)} · {pessoas.find((p) => p.id === ex.usuario_id)?.nome ?? "—"}
                    </div>
                  </div>
                  <Badge variant={ex.nao_conformes > 0 ? "destructive" : "outline"}>
                    {Number(ex.percentual_conformidade).toFixed(1)}% conforme
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    {ex.total_itens} itens · {ex.nao_conformes} NC
                  </span>
                </Link>
              ))}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function ChecklistLinha({
  checklist, podeGerenciar, onEditar,
}: { checklist: Checklist; podeGerenciar: boolean; onEditar: () => void }) {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const dias = diasParaVencimento(checklist.proxima_execucao);

  async function excluir() {
    if (!confirm(`Excluir o checklist "${checklist.nome}"?`)) return;
    const { error } = await supabase.from("checklists").delete().eq("id", checklist.id);
    if (error) return showDbError(error);
    await qc.invalidateQueries({ queryKey: ["checklists"] });
    toast.success("Checklist excluído.");
  }

  return (
    <div className="flex flex-wrap items-center gap-3 p-3">
      <div className="min-w-0 flex-1">
        <div className="truncate font-medium">{checklist.nome}</div>
        <div className="text-xs text-muted-foreground">
          {periodicidadeLabel(checklist.periodicidade)}
          {checklist.proxima_execucao ? ` · próxima inspeção: ${formatDate(checklist.proxima_execucao)}` : ""}
          {checklist.ultima_execucao ? ` · última: ${formatDate(checklist.ultima_execucao)}` : ""}
        </div>
      </div>
      {dias !== null && dias < 0 && <Badge variant="destructive">Atrasada</Badge>}
      <Button size="sm" onClick={() => navigate({ to: "/checklists/executar/$id", params: { id: checklist.id } })}>
        <Play className="mr-1 size-4" />Iniciar inspeção
      </Button>
      <Button size="icon" variant="ghost" aria-label="Editar" onClick={onEditar}><Pencil className="size-4" /></Button>
      {podeGerenciar && (
        <Button size="icon" variant="ghost" aria-label="Excluir" onClick={excluir}><Trash2 className="size-4 text-destructive" /></Button>
      )}
    </div>
  );
}

function ModelosPanel({ podeGerenciar }: { podeGerenciar: boolean }) {
  const qc = useQueryClient();
  const { data: modelos = [] } = useQuery(checklistModelosQuery());
  const { data: tipos = [] } = useQuery(tiposRespostaQuery());
  const [open, setOpen] = useState(false);
  const [modeloId, setModeloId] = useState<string | null>(null);

  const [nome, setNome] = useState("");
  const [descricao, setDescricao] = useState("");
  const [periodicidade, setPeriodicidade] = useState("mensal");
  const [base, setBase] = useState("none");
  const [itens, setItens] = useState<{ componente: string; pergunta: string; tipo_resposta: string }[]>([]);
  const { data: itensDoModelo = [] } = useQuery(checklistModeloItensQuery(modeloId ?? ""));

  function novo() {
    setModeloId(null); setNome(""); setDescricao(""); setPeriodicidade("mensal"); setBase("none"); setItens([]);
    setOpen(true);
  }

  function editar(id: string) {
    const m = modelos.find((x) => x.id === id);
    if (!m) return;
    setModeloId(id); setNome(m.nome); setDescricao(m.descricao ?? ""); setPeriodicidade(m.periodicidade);
    setBase("none");
    setOpen(true);
  }

  const itensEfetivos = modeloId && itens.length === 0
    ? itensDoModelo.map((i) => ({ componente: i.componente, pergunta: i.pergunta, tipo_resposta: i.tipo_resposta }))
    : itens;

  function aplicarBase(v: string) {
    setBase(v);
    if (v === "none") return;
    const comps = COMPONENTES_SUGERIDOS[v] ?? [];
    setItens([
      ...itensEfetivos,
      ...comps.map((c) => ({ componente: c, pergunta: "Está em boas condições?", tipo_resposta: "conformidade" })),
    ]);
    if (!nome) setNome(v);
  }

  async function salvar() {
    if (!nome.trim()) return toast.error("Informe o nome do modelo.");
    const validos = itensEfetivos.filter((i) => i.componente.trim() && i.pergunta.trim());
    let id = modeloId;
    if (id) {
      const { error } = await supabase.from("checklist_modelos")
        .update({ nome: nome.trim(), descricao: descricao.trim() || null, periodicidade }).eq("id", id);
      if (error) return showDbError(error);
      await supabase.from("checklist_modelo_itens").delete().eq("modelo_id", id);
    } else {
      const { data: u } = await supabase.auth.getUser();
      const { data, error } = await supabase.from("checklist_modelos")
        .insert({ nome: nome.trim(), descricao: descricao.trim() || null, periodicidade, criado_por: u.user?.id ?? null })
        .select("id").single();
      if (error || !data) return showDbError(error ?? { message: "Falha ao salvar" });
      id = data.id;
    }
    if (validos.length) {
      const { error } = await supabase.from("checklist_modelo_itens").insert(
        validos.map((i, idx) => ({ modelo_id: id!, componente: i.componente.trim(), pergunta: i.pergunta.trim(), tipo_resposta: i.tipo_resposta, ordem: idx + 1 })),
      );
      if (error) return showDbError(error);
    }
    await qc.invalidateQueries({ queryKey: ["checklist_modelos"] });
    await qc.invalidateQueries({ queryKey: ["checklist_modelo_itens"] });
    setOpen(false);
    toast.success("Modelo salvo.");
  }

  async function excluir(id: string) {
    if (!confirm("Excluir este modelo?")) return;
    const { error } = await supabase.from("checklist_modelos").delete().eq("id", id);
    if (error) return showDbError(error);
    await qc.invalidateQueries({ queryKey: ["checklist_modelos"] });
    toast.success("Modelo excluído.");
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">
          Modelos reutilizáveis (Câmara Fria, Coifa, Gerador…) aplicáveis a vários equipamentos e personalizáveis depois.
        </p>
        {podeGerenciar && <Button size="sm" onClick={novo}><Plus className="mr-1 size-4" />Novo modelo</Button>}
      </div>

      <Card>
        <CardContent className="divide-y p-0">
          {modelos.length === 0 && <div className="p-4 text-sm text-muted-foreground">Nenhum modelo cadastrado.</div>}
          {modelos.map((m) => (
            <div key={m.id} className="flex flex-wrap items-center gap-3 p-3">
              <div className="min-w-0 flex-1">
                <div className="truncate font-medium">{m.nome}</div>
                <div className="text-xs text-muted-foreground">
                  {periodicidadeLabel(m.periodicidade)}{m.descricao ? ` · ${m.descricao}` : ""}
                </div>
              </div>
              {podeGerenciar && (
                <>
                  <Button size="icon" variant="ghost" aria-label="Editar modelo" onClick={() => editar(m.id)}><Pencil className="size-4" /></Button>
                  <Button size="icon" variant="ghost" aria-label="Excluir modelo" onClick={() => excluir(m.id)}><Trash2 className="size-4 text-destructive" /></Button>
                </>
              )}
            </div>
          ))}
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-3xl max-h-[88vh] overflow-auto">
          <DialogHeader><DialogTitle>{modeloId ? "Editar modelo" : "Novo modelo de checklist"}</DialogTitle></DialogHeader>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="sm:col-span-2"><Label>Nome *</Label><Input value={nome} onChange={(e) => setNome(e.target.value)} /></div>
            <div className="sm:col-span-2"><Label>Descrição</Label><Textarea value={descricao} onChange={(e) => setDescricao(e.target.value)} /></div>
            <div>
              <Label>Periodicidade sugerida</Label>
              <Select value={periodicidade} onValueChange={setPeriodicidade}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{PERIODICIDADES.map((p) => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>Importar componentes de</Label>
              <Select value={base} onValueChange={aplicarBase}>
                <SelectTrigger><SelectValue placeholder="Modelo pronto" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Não importar</SelectItem>
                  {Object.keys(COMPONENTES_SUGERIDOS).map((k) => <SelectItem key={k} value={k}>{k}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex items-center gap-2 pt-2">
            <span className="text-sm font-semibold">Itens ({itensEfetivos.length})</span>
            <div className="flex-1" />
            <Button size="sm" variant="outline" onClick={() => setItens([...itensEfetivos, { componente: "", pergunta: "", tipo_resposta: "conformidade" }])}>
              <Plus className="mr-1 size-4" />Item
            </Button>
          </div>

          <div className="space-y-2">
            {itensEfetivos.map((it, idx) => (
              <div key={idx} className="grid gap-2 rounded-md border p-2 sm:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)_minmax(0,1fr)_auto]">
                <Input placeholder="Componente" value={it.componente}
                  onChange={(e) => setItens(itensEfetivos.map((x, i) => (i === idx ? { ...x, componente: e.target.value } : x)))} />
                <Input placeholder="Pergunta" value={it.pergunta}
                  onChange={(e) => setItens(itensEfetivos.map((x, i) => (i === idx ? { ...x, pergunta: e.target.value } : x)))} />
                <Select value={it.tipo_resposta}
                  onValueChange={(v) => setItens(itensEfetivos.map((x, i) => (i === idx ? { ...x, tipo_resposta: v } : x)))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{tipos.filter((t) => t.ativo).map((t) => <SelectItem key={t.chave} value={t.chave}>{t.nome}</SelectItem>)}</SelectContent>
                </Select>
                <Button variant="ghost" size="icon" aria-label="Remover" onClick={() => setItens(itensEfetivos.filter((_, i) => i !== idx))}>
                  <Trash2 className="size-4 text-destructive" />
                </Button>
              </div>
            ))}
          </div>

          <div className="flex justify-end pt-2"><Button onClick={salvar}>Salvar modelo</Button></div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
