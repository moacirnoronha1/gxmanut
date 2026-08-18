import { useMemo, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { showDbError } from "@/lib/db-error";
import { formatBRL, formatDate } from "@/lib/db-types";
import {
  COMPROVACAO_COR, COMPROVACAO_LABEL, COMPROVACAO_OPTIONS, EVIDENCIA_TIPOS, FORMAS_PAGAMENTO,
  GRUPO_LABEL, ORIGEM_LABEL, UNIDADES, grupoDoCusto, horasEntre, resumirCustos,
  type CustoCategoria, type CustoComprovacao, type CustoEvidencia, type CustoLancamento, type CustoGrupo,
} from "@/lib/custos";
import { custoCategoriasQuery, custoEvidenciasQuery, fornecedoresQuery, profilesQuery } from "@/lib/queries";
import { Paperclip, Trash2, Upload, FileText } from "lucide-react";

const num = (v: string) => {
  const n = Number(String(v).replace(",", "."));
  return Number.isFinite(n) ? n : 0;
};

export function IndicadorFinanceiroOS({
  custos, categorias, onVerDetalhes,
}: {
  custos: CustoLancamento[];
  categorias: CustoCategoria[];
  onVerDetalhes?: () => void;
}) {
  const r = useMemo(() => resumirCustos(custos, categorias), [custos, categorias]);
  const linhas = (Object.keys(GRUPO_LABEL) as CustoGrupo[])
    .filter((g) => r.porGrupo[g] > 0)
    .map((g) => ({ label: GRUPO_LABEL[g], valor: r.porGrupo[g] }));

  return (
    <Card className="border-primary/40">
      <CardContent className="p-4 space-y-4">
        <button type="button" onClick={onVerDetalhes} className="w-full text-left group">
          <div className="text-xs uppercase tracking-wide text-muted-foreground">Custo total da manutenção</div>
          <div className="text-4xl font-extrabold group-hover:underline">{formatBRL(r.total)}</div>
          <div className="text-xs text-muted-foreground">
            {r.lancamentos} lançamento(s) · clique para ver a composição
          </div>
        </button>

        <div className="grid gap-2 grid-cols-2 md:grid-cols-3 xl:grid-cols-5">
          <Kpi label="Desembolso" value={r.desembolso} hint="Dinheiro pago" />
          <Kpi label="Custo interno" value={r.interno} hint="Recursos da empresa" />
          <Kpi label="Materiais / peças" value={r.materiaisPecas} />
          <Kpi label="Mão de obra" value={r.maoObra} />
          <Kpi label="Serviços externos" value={r.servicosExternos} />
        </div>

        {linhas.length > 0 && (
          <>
            <Separator />
            <div className="grid gap-x-6 gap-y-1 sm:grid-cols-2 text-sm">
              {linhas.map((l) => (
                <div key={l.label} className="flex justify-between">
                  <span className="text-muted-foreground">{l.label}</span>
                  <span className="font-medium">{formatBRL(l.valor)}</span>
                </div>
              ))}
            </div>
          </>
        )}

        <Separator />
        <div className="grid gap-x-6 gap-y-1 sm:grid-cols-2 text-sm">
          <Row label="Total efetivamente desembolsado" value={r.desembolso} />
          <Row label="Materiais consumidos do estoque" value={r.estoque} />
          <Row label="Custo de mão de obra interna" value={r.maoObraInterna} />
          <Row label="Custo total econômico" value={r.total} strong />
          <Row label="Custo comprovado" value={r.comprovado} />
          <Row label="Custo sem comprovante" value={r.semComprovante} />
          <Row label="Custo previsto (não somado)" value={r.previsto} muted />
        </div>
      </CardContent>
    </Card>
  );
}

function Kpi({ label, value, hint }: { label: string; value: number; hint?: string }) {
  return (
    <div className="rounded-md border p-2">
      <div className="text-[11px] uppercase text-muted-foreground truncate">{label}</div>
      <div className="text-lg font-bold">{formatBRL(value)}</div>
      {hint && <div className="text-[11px] text-muted-foreground truncate">{hint}</div>}
    </div>
  );
}

function Row({ label, value, strong, muted }: { label: string; value: number; strong?: boolean; muted?: boolean }) {
  return (
    <div className={`flex justify-between ${muted ? "text-muted-foreground" : ""}`}>
      <span className={strong ? "font-semibold" : "text-muted-foreground"}>{label}</span>
      <span className={strong ? "font-extrabold" : "font-medium"}>{formatBRL(value)}</span>
    </div>
  );
}

type Modo = "compra" | "estoque" | "mao_obra" | "servico";

const VAZIO = {
  categoria_id: "",
  descricao: "",
  quantidade: "1",
  unidade: "un",
  valor_unitario: "0",
  data_compra: new Date().toISOString().slice(0, 10),
  fornecedor_id: "none",
  prestador: "",
  comprador_id: "none",
  tecnico_id: "none",
  hora_inicio: "",
  hora_fim: "",
  forma_pagamento: "none",
  nota_numero: "",
  comprovacao: "sem_comprovante" as CustoComprovacao,
  observacao: "",
  previsto: false,
};

export function CustosOSPanel({
  osId, equipamentoId, custos,
}: {
  osId: string;
  equipamentoId: string | null;
  custos: CustoLancamento[];
}) {
  const qc = useQueryClient();
  const { data: categorias = [] } = useQuery(custoCategoriasQuery());
  const { data: fornecedores = [] } = useQuery(fornecedoresQuery());
  const { data: profiles = [] } = useQuery(profilesQuery());
  const { data: evidencias = [] } = useQuery(custoEvidenciasQuery(osId));

  const [modo, setModo] = useState<Modo>("compra");
  const [f, setF] = useState({ ...VAZIO });
  const [saving, setSaving] = useState(false);
  const [evidenciaDe, setEvidenciaDe] = useState<CustoLancamento | null>(null);

  const set = (patch: Partial<typeof VAZIO>) => setF((p) => ({ ...p, ...patch }));

  const catsDoModo = categorias.filter((c) => {
    if (!c.ativo) return false;
    if (modo === "mao_obra") return c.grupo === "mao_obra_interna";
    if (modo === "servico") return ["servico_terceiro", "mao_obra_externa", "locacao", "transporte", "taxa", "outro"].includes(c.grupo);
    if (modo === "estoque") return ["peca", "material", "ferramenta"].includes(c.grupo);
    return true;
  });

  const horas = modo === "mao_obra" && f.hora_inicio && f.hora_fim ? horasEntre(f.hora_inicio, f.hora_fim) : num(f.quantidade);
  const totalPreview = (modo === "mao_obra" ? horas : num(f.quantidade)) * num(f.valor_unitario);

  async function add() {
    if (!f.categoria_id) return toast.error("Escolha a categoria do custo.");
    if (!f.descricao.trim()) return toast.error("Descreva o que foi gasto.");
    const cat = categorias.find((c) => c.id === f.categoria_id);
    const natureza = modo === "estoque" || modo === "mao_obra" ? "interno" : "desembolso";
    const origem = modo === "estoque" ? "estoque" : modo === "mao_obra" ? "mao_obra_interna" : modo === "servico" ? "servico_externo" : "compra";
    const quantidade = modo === "mao_obra" ? horas : num(f.quantidade);
    if (quantidade <= 0) return toast.error("Informe a quantidade (ou as horas trabalhadas).");

    setSaving(true);
    const { data: u } = await supabase.auth.getUser();
    const { error } = await supabase.from("os_custos").insert({
      os_id: osId,
      equipamento_id: equipamentoId,
      categoria_id: f.categoria_id,
      tipo: cat?.grupo ?? "outro",
      descricao: f.descricao.trim(),
      quantidade,
      unidade: modo === "mao_obra" ? "h" : f.unidade,
      valor_unitario: num(f.valor_unitario),
      natureza,
      origem,
      comprovacao: natureza === "interno" ? "sem_comprovante" : f.comprovacao,
      previsto: f.previsto,
      prestador: f.prestador.trim() || null,
      tecnico_id: f.tecnico_id === "none" ? null : f.tecnico_id,
      comprador_id: f.comprador_id === "none" ? null : f.comprador_id,
      hora_inicio: f.hora_inicio || null,
      hora_fim: f.hora_fim || null,
      fornecedor_id: f.fornecedor_id === "none" ? null : f.fornecedor_id,
      data_compra: f.data_compra || null,
      forma_pagamento: f.forma_pagamento === "none" ? null : f.forma_pagamento,
      nota_numero: f.nota_numero.trim() || null,
      observacao: f.observacao.trim() || null,
      registrado_por: u.user?.id ?? null,
    });
    setSaving(false);
    if (error) return showDbError(error);
    setF({ ...VAZIO });
    await qc.invalidateQueries({ queryKey: ["os_custos", osId] });
    await qc.invalidateQueries({ queryKey: ["custos_equipamento"] });
    toast.success("Custo lançado.");
  }

  async function remover(id: string) {
    const { error } = await supabase.from("os_custos").delete().eq("id", id);
    if (error) return showDbError(error);
    await qc.invalidateQueries({ queryKey: ["os_custos", osId] });
    await qc.invalidateQueries({ queryKey: ["custo_evidencias", osId] });
  }

  async function mudarComprovacao(id: string, v: CustoComprovacao) {
    const { error } = await supabase.from("os_custos").update({ comprovacao: v }).eq("id", id);
    if (error) return showDbError(error);
    await qc.invalidateQueries({ queryKey: ["os_custos", osId] });
  }

  const realizados = custos.filter((c) => !c.previsto);
  const previstos = custos.filter((c) => c.previsto);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="py-3"><CardTitle className="text-base">Novo lançamento de custo</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <Tabs value={modo} onValueChange={(v) => { setModo(v as Modo); set({ categoria_id: "" }); }}>
            <TabsList className="grid grid-cols-2 sm:grid-cols-4 w-full h-auto">
              <TabsTrigger value="compra">Compra / material</TabsTrigger>
              <TabsTrigger value="estoque">Estoque</TabsTrigger>
              <TabsTrigger value="mao_obra">Mão de obra interna</TabsTrigger>
              <TabsTrigger value="servico">Serviço externo</TabsTrigger>
            </TabsList>
            <TabsContent value={modo} forceMount>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 pt-3">
                <div>
                  <Label>Categoria *</Label>
                  <Select value={f.categoria_id} onValueChange={(v) => set({ categoria_id: v })}>
                    <SelectTrigger><SelectValue placeholder="Selecionar" /></SelectTrigger>
                    <SelectContent>
                      {catsDoModo.map((c) => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="lg:col-span-2">
                  <Label>{modo === "servico" ? "Serviço executado *" : "O que foi gasto *"}</Label>
                  <Input value={f.descricao} onChange={(e) => set({ descricao: e.target.value })} />
                </div>

                {modo === "mao_obra" ? (
                  <>
                    <div>
                      <Label>Técnico</Label>
                      <Select value={f.tecnico_id} onValueChange={(v) => set({ tecnico_id: v })}>
                        <SelectTrigger><SelectValue placeholder="Selecionar" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">Não informado</SelectItem>
                          {profiles.map((p) => <SelectItem key={p.id} value={p.id}>{p.nome}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div><Label>Início</Label><Input type="time" value={f.hora_inicio} onChange={(e) => set({ hora_inicio: e.target.value })} /></div>
                      <div><Label>Término</Label><Input type="time" value={f.hora_fim} onChange={(e) => set({ hora_fim: e.target.value })} /></div>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <Label>Horas</Label>
                        <Input value={f.hora_inicio && f.hora_fim ? String(horas) : f.quantidade}
                          onChange={(e) => set({ quantidade: e.target.value })}
                          disabled={!!(f.hora_inicio && f.hora_fim)} />
                      </div>
                      <div><Label>Valor/hora</Label><Input inputMode="decimal" value={f.valor_unitario} onChange={(e) => set({ valor_unitario: e.target.value })} /></div>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="grid grid-cols-3 gap-2">
                      <div><Label>Qtd</Label><Input inputMode="decimal" value={f.quantidade} onChange={(e) => set({ quantidade: e.target.value })} /></div>
                      <div>
                        <Label>Unid.</Label>
                        <Select value={f.unidade} onValueChange={(v) => set({ unidade: v })}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>{UNIDADES.map((u) => <SelectItem key={u} value={u}>{u}</SelectItem>)}</SelectContent>
                        </Select>
                      </div>
                      <div><Label>Valor un.</Label><Input inputMode="decimal" value={f.valor_unitario} onChange={(e) => set({ valor_unitario: e.target.value })} /></div>
                    </div>
                    <div><Label>Data</Label><Input type="date" value={f.data_compra} onChange={(e) => set({ data_compra: e.target.value })} /></div>
                  </>
                )}

                {modo !== "mao_obra" && modo !== "estoque" && (
                  <>
                    <div>
                      <Label>Fornecedor / prestador</Label>
                      <Select value={f.fornecedor_id} onValueChange={(v) => set({ fornecedor_id: v })}>
                        <SelectTrigger><SelectValue placeholder="Selecionar" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">Não cadastrado</SelectItem>
                          {fornecedores.map((x) => <SelectItem key={x.id} value={x.id}>{x.nome}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div><Label>Prestador (texto livre)</Label><Input value={f.prestador} onChange={(e) => set({ prestador: e.target.value })} /></div>
                    <div>
                      <Label>Quem realizou a compra</Label>
                      <Select value={f.comprador_id} onValueChange={(v) => set({ comprador_id: v })}>
                        <SelectTrigger><SelectValue placeholder="Selecionar" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">Não informado</SelectItem>
                          {profiles.map((p) => <SelectItem key={p.id} value={p.id}>{p.nome}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Forma de pagamento</Label>
                      <Select value={f.forma_pagamento} onValueChange={(v) => set({ forma_pagamento: v })}>
                        <SelectTrigger><SelectValue placeholder="Selecionar" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">Não informado</SelectItem>
                          {FORMAS_PAGAMENTO.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div><Label>Nº nota / documento</Label><Input value={f.nota_numero} onChange={(e) => set({ nota_numero: e.target.value })} /></div>
                    <div>
                      <Label>Situação da comprovação</Label>
                      <Select value={f.comprovacao} onValueChange={(v) => set({ comprovacao: v as CustoComprovacao })}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>{COMPROVACAO_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                  </>
                )}

                <div className="sm:col-span-2 lg:col-span-3">
                  <Label>Observação</Label>
                  <Textarea rows={2} value={f.observacao} onChange={(e) => set({ observacao: e.target.value })} />
                </div>
              </div>
            </TabsContent>
          </Tabs>

          <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
            <div className="flex items-center gap-2 text-sm">
              <Switch checked={f.previsto} onCheckedChange={(v) => set({ previsto: v })} id="previsto" />
              <Label htmlFor="previsto" className="cursor-pointer">Custo previsto (orçamento — não entra no realizado)</Label>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-sm">Total: <span className="font-bold">{formatBRL(totalPreview)}</span></div>
              <Button onClick={add} disabled={saving}>Lançar custo</Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <ListaCustos
        titulo="Custos realizados"
        custos={realizados}
        categorias={categorias}
        fornecedores={fornecedores}
        profiles={profiles}
        evidencias={evidencias}
        onRemover={remover}
        onComprovacao={mudarComprovacao}
        onEvidencia={setEvidenciaDe}
      />
      {previstos.length > 0 && (
        <ListaCustos
          titulo="Custos previstos (orçamento)"
          custos={previstos}
          categorias={categorias}
          fornecedores={fornecedores}
          profiles={profiles}
          evidencias={evidencias}
          onRemover={remover}
          onComprovacao={mudarComprovacao}
          onEvidencia={setEvidenciaDe}
        />
      )}

      <EvidenciasDialog
        osId={osId}
        custo={evidenciaDe}
        evidencias={evidencias.filter((e) => e.custo_id === evidenciaDe?.id)}
        onClose={() => setEvidenciaDe(null)}
      />
    </div>
  );
}

function ListaCustos({
  titulo, custos, categorias, fornecedores, profiles, evidencias, onRemover, onComprovacao, onEvidencia,
}: {
  titulo: string;
  custos: CustoLancamento[];
  categorias: CustoCategoria[];
  fornecedores: Array<{ id: string; nome: string }>;
  profiles: Array<{ id: string; nome: string }>;
  evidencias: CustoEvidencia[];
  onRemover: (id: string) => void;
  onComprovacao: (id: string, v: CustoComprovacao) => void;
  onEvidencia: (c: CustoLancamento) => void;
}) {
  const total = custos.reduce((s, c) => s + Number(c.valor_total ?? 0), 0);
  return (
    <Card>
      <CardHeader className="py-3 flex-row items-center justify-between">
        <CardTitle className="text-base">{titulo}</CardTitle>
        <div className="text-sm font-bold">{formatBRL(total)}</div>
      </CardHeader>
      <CardContent className="p-0 divide-y">
        {custos.length === 0 && <div className="p-4 text-sm text-muted-foreground">Nenhum lançamento.</div>}
        {custos.map((c) => {
          const cat = categorias.find((k) => k.id === c.categoria_id);
          const forn = fornecedores.find((x) => x.id === c.fornecedor_id);
          const comprador = profiles.find((p) => p.id === c.comprador_id);
          const tecnico = profiles.find((p) => p.id === c.tecnico_id);
          const nEvid = evidencias.filter((e) => e.custo_id === c.id).length;
          return (
            <div key={c.id} className="p-3 space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="outline">{cat?.nome ?? GRUPO_LABEL[grupoDoCusto(c, categorias)]}</Badge>
                <Badge variant={c.natureza === "interno" ? "secondary" : "default"}>
                  {c.natureza === "interno" ? "Custo interno" : "Desembolso"}
                </Badge>
                <span className="text-xs text-muted-foreground">{ORIGEM_LABEL[c.origem]}</span>
                <span className="ml-auto font-bold">{formatBRL(c.valor_total)}</span>
              </div>
              <div className="font-medium">{c.descricao}</div>
              <div className="text-xs text-muted-foreground">
                {Number(c.quantidade)} {c.unidade ?? ""} × {formatBRL(c.valor_unitario)}
                {c.data_compra && ` · ${formatDate(c.data_compra)}`}
                {(forn || c.prestador) && ` · ${forn?.nome ?? c.prestador}`}
                {comprador && ` · comprado por ${comprador.nome}`}
                {tecnico && ` · técnico ${tecnico.nome}`}
                {c.hora_inicio && c.hora_fim && ` · ${c.hora_inicio.slice(0, 5)}–${c.hora_fim.slice(0, 5)}`}
                {c.forma_pagamento && ` · ${c.forma_pagamento}`}
                {c.nota_numero && ` · doc ${c.nota_numero}`}
              </div>
              {c.observacao && <div className="text-xs italic text-muted-foreground">{c.observacao}</div>}
              <div className="flex flex-wrap items-center gap-2 pt-1">
                <Badge variant="outline" className={COMPROVACAO_COR[c.comprovacao]}>{COMPROVACAO_LABEL[c.comprovacao]}</Badge>
                <Select value={c.comprovacao} onValueChange={(v) => onComprovacao(c.id, v as CustoComprovacao)}>
                  <SelectTrigger className="h-8 w-[190px] text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>{COMPROVACAO_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
                </Select>
                <Button size="sm" variant="outline" onClick={() => onEvidencia(c)}>
                  <Paperclip className="size-3.5 mr-1" /> Evidências{nEvid ? ` (${nEvid})` : ""}
                </Button>
                <Button size="sm" variant="ghost" onClick={() => onRemover(c.id)}><Trash2 className="size-4" /></Button>
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}

function EvidenciasDialog({
  osId, custo, evidencias, onClose,
}: {
  osId: string;
  custo: CustoLancamento | null;
  evidencias: CustoEvidencia[];
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const inputRef = useRef<HTMLInputElement>(null);
  const [tipo, setTipo] = useState(EVIDENCIA_TIPOS[0]);
  const [obs, setObs] = useState("");
  const [busy, setBusy] = useState(false);

  async function upload(file: File) {
    if (!custo) return;
    setBusy(true);
    const { data: u } = await supabase.auth.getUser();
    const path = `${osId}/${custo.id}/${Date.now()}-${file.name.replace(/[^\w.\-]/g, "_")}`;
    const up = await supabase.storage.from("comprovantes").upload(path, file);
    if (up.error) { setBusy(false); return showDbError(up.error); }
    const { error } = await supabase.from("os_custo_evidencias").insert({
      custo_id: custo.id, tipo, nome: file.name, url: path,
      observacao: obs.trim() || null, autor_id: u.user?.id ?? null,
    });
    if (!error && custo.natureza === "desembolso" && custo.comprovacao === "sem_comprovante") {
      await supabase.from("os_custos").update({ comprovacao: "com_comprovante" }).eq("id", custo.id);
    }
    setBusy(false);
    if (error) return showDbError(error);
    setObs("");
    await qc.invalidateQueries({ queryKey: ["custo_evidencias", osId] });
    await qc.invalidateQueries({ queryKey: ["os_custos", osId] });
    toast.success("Evidência anexada.");
  }

  async function abrir(e: CustoEvidencia) {
    const { data, error } = await supabase.storage.from("comprovantes").createSignedUrl(e.url, 60);
    if (error || !data) return toast.error("Não foi possível abrir o arquivo.");
    window.open(data.signedUrl, "_blank", "noopener");
  }

  async function apagar(e: CustoEvidencia) {
    const { error } = await supabase.from("os_custo_evidencias").delete().eq("id", e.id);
    if (error) return showDbError(error);
    await supabase.storage.from("comprovantes").remove([e.url]);
    await qc.invalidateQueries({ queryKey: ["custo_evidencias", osId] });
  }

  return (
    <Dialog open={!!custo} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader><DialogTitle>Evidências do custo</DialogTitle></DialogHeader>
        {custo && (
          <div className="space-y-3">
            <div className="text-sm text-muted-foreground">{custo.descricao} — {formatBRL(custo.valor_total)}</div>
            <div>
              <Label>Tipo de evidência</Label>
              <Select value={tipo} onValueChange={setTipo}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{EVIDENCIA_TIPOS.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Observação</Label><Input value={obs} onChange={(e) => setObs(e.target.value)} /></div>
            <input ref={inputRef} type="file" className="hidden"
              onChange={(e) => { const file = e.target.files?.[0]; if (file) void upload(file); e.target.value = ""; }} />
            <Button variant="outline" className="w-full" disabled={busy} onClick={() => inputRef.current?.click()}>
              <Upload className="size-4 mr-2" /> {busy ? "Enviando…" : "Anexar arquivo"}
            </Button>
            <Separator />
            <div className="space-y-2">
              {evidencias.length === 0 && <div className="text-sm text-muted-foreground">Nenhuma evidência anexada.</div>}
              {evidencias.map((e) => (
                <div key={e.id} className="flex items-center gap-2 text-sm border rounded-md p-2">
                  <FileText className="size-4 shrink-0" />
                  <button className="min-w-0 truncate text-left hover:underline" onClick={() => abrir(e)}>
                    {e.tipo} — {e.nome}
                  </button>
                  <Button size="icon" variant="ghost" className="ml-auto" onClick={() => apagar(e)}><Trash2 className="size-4" /></Button>
                </div>
              ))}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
