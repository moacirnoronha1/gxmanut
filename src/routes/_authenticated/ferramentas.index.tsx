import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { showDbError } from "@/lib/db-error";
import { formatBRL, formatDate, formatDateTime } from "@/lib/db-types";
import { setoresQuery, fornecedoresQuery, profilesQuery, ordensQuery } from "@/lib/queries";
import {
  FERRAMENTA_STATUS_COR, FERRAMENTA_STATUS_LABEL, ferramentaEmprestimosQuery, ferramentasQuery,
  type Ferramenta, type FerramentaStatus,
} from "@/lib/estoque";
import { Hammer, Plus } from "lucide-react";

export const Route = createFileRoute("/_authenticated/ferramentas/")({
  head: () => ({
    meta: [
      { title: "Ferramentas — Manutenção Xica da Silva" },
      { name: "description", content: "Controle de ferramentas permanentes: estados, empréstimos, devoluções e responsáveis." },
      { property: "og:title", content: "Ferramentas — Manutenção Xica da Silva" },
      { property: "og:description", content: "Ferramentas permanentes, empréstimos e devoluções com histórico." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Ferramentas,
});

const nn = (v: string) => (v.trim() === "" ? null : v.trim());
const num = (v: string) => {
  const n = Number(String(v).replace(",", "."));
  return Number.isFinite(n) ? n : 0;
};

const VAZIO = {
  nome: "", codigo: "", categoria: "", marca: "", modelo: "", numero_serie: "",
  localizacao: "", setor_id: "", fornecedor_id: "", valor_aquisicao: "", data_aquisicao: "",
  status: "disponivel" as FerramentaStatus, foto_url: "", observacoes: "",
};

function Ferramentas() {
  const qc = useQueryClient();
  const { data: ferramentas = [] } = useQuery(ferramentasQuery());
  const { data: emprestimos = [] } = useQuery(ferramentaEmprestimosQuery());
  const { data: setores = [] } = useQuery(setoresQuery());
  const { data: fornecedores = [] } = useQuery(fornecedoresQuery());
  const { data: pessoas = [] } = useQuery(profilesQuery());
  const { data: ordens = [] } = useQuery(ordensQuery());

  const [busca, setBusca] = useState("");
  const [form, setForm] = useState<typeof VAZIO | null>(null);
  const [editId, setEditId] = useState<string | null>(null);
  const [emprestar, setEmprestar] = useState<Ferramenta | null>(null);
  const [saving, setSaving] = useState(false);

  const ativas = ferramentas.filter((f) => f.ativo);
  const filtradas = useMemo(() => {
    const t = busca.trim().toLowerCase();
    if (!t) return ativas;
    return ativas.filter((f) =>
      f.nome.toLowerCase().includes(t) ||
      (f.codigo ?? "").toLowerCase().includes(t) ||
      (f.localizacao ?? "").toLowerCase().includes(t));
  }, [ativas, busca]);

  const emprestadas = emprestimos.filter((e) => !e.devolvido_em);
  const nomePessoa = (id: string | null) => (id ? (pessoas.find((p) => p.id === id)?.nome ?? "—") : "—");
  const nomeFerr = (id: string) => ferramentas.find((f) => f.id === id)?.nome ?? "—";

  function novo() { setEditId(null); setForm({ ...VAZIO }); }
  function editar(f: Ferramenta) {
    setEditId(f.id);
    setForm({
      nome: f.nome, codigo: f.codigo ?? "", categoria: f.categoria ?? "", marca: f.marca ?? "",
      modelo: f.modelo ?? "", numero_serie: f.numero_serie ?? "", localizacao: f.localizacao ?? "",
      setor_id: f.setor_id ?? "", fornecedor_id: f.fornecedor_id ?? "",
      valor_aquisicao: f.valor_aquisicao != null ? String(f.valor_aquisicao) : "",
      data_aquisicao: f.data_aquisicao ?? "", status: f.status,
      foto_url: f.foto_url ?? "", observacoes: f.observacoes ?? "",
    });
  }

  async function salvar() {
    if (!form) return;
    if (!form.nome.trim()) return toast.error("Informe o nome da ferramenta.");
    setSaving(true);
    const payload = {
      nome: form.nome.trim(), codigo: nn(form.codigo), categoria: nn(form.categoria),
      marca: nn(form.marca), modelo: nn(form.modelo), numero_serie: nn(form.numero_serie),
      localizacao: nn(form.localizacao), setor_id: nn(form.setor_id), fornecedor_id: nn(form.fornecedor_id),
      valor_aquisicao: form.valor_aquisicao.trim() === "" ? null : num(form.valor_aquisicao),
      data_aquisicao: nn(form.data_aquisicao), status: form.status,
      foto_url: nn(form.foto_url), observacoes: nn(form.observacoes),
    };
    const { error } = editId
      ? await supabase.from("ferramentas").update(payload as never).eq("id", editId)
      : await supabase.from("ferramentas").insert(payload as never);
    setSaving(false);
    if (error) return showDbError(error);
    setForm(null);
    await qc.invalidateQueries({ queryKey: ["ferramentas"] });
    toast.success(editId ? "Ferramenta atualizada." : "Ferramenta cadastrada.");
  }

  async function mudarStatus(f: Ferramenta, status: FerramentaStatus) {
    const { error } = await supabase.from("ferramentas").update({ status }).eq("id", f.id);
    if (error) return showDbError(error);
    await qc.invalidateQueries({ queryKey: ["ferramentas"] });
    toast.success("Estado atualizado.");
  }

  async function devolver(id: string, ferramentaId: string, estado: string) {
    const { error } = await supabase
      .from("ferramenta_emprestimos")
      .update({ devolvido_em: new Date().toISOString(), estado_devolucao: estado })
      .eq("id", id);
    if (error) return showDbError(error);
    await supabase.from("ferramentas").update({ status: estado === "danificada" ? "danificada" : "disponivel" }).eq("id", ferramentaId);
    await qc.invalidateQueries({ queryKey: ["ferramenta_emprestimos"] });
    await qc.invalidateQueries({ queryKey: ["ferramentas"] });
    toast.success("Devolução registrada.");
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><Hammer className="h-6 w-6" /> Ferramentas</h1>
          <p className="text-sm text-muted-foreground">Ferramentas permanentes, estados e controle de empréstimos.</p>
        </div>
        <Button onClick={novo}><Plus className="mr-2 h-4 w-4" /> Nova ferramenta</Button>
      </div>

      <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
        <Kpi label="Cadastradas" value={String(ativas.length)} />
        <Kpi label="Disponíveis" value={String(ativas.filter((f) => f.status === "disponivel").length)} />
        <Kpi label="Emprestadas" value={String(emprestadas.length)} />
        <Kpi label="Danificadas / perdidas" value={String(ativas.filter((f) => f.status === "danificada" || f.status === "perdida").length)} />
      </div>

      <Input className="max-w-xs" placeholder="Buscar ferramenta…" value={busca} onChange={(e) => setBusca(e.target.value)} />

      <Tabs defaultValue="lista">
        <TabsList>
          <TabsTrigger value="lista">Ferramentas</TabsTrigger>
          <TabsTrigger value="emprestadas">Em uso / emprestadas</TabsTrigger>
          <TabsTrigger value="hist">Histórico</TabsTrigger>
        </TabsList>

        <TabsContent value="lista">
          {filtradas.length === 0 ? (
            <Card><CardContent className="p-6 text-sm text-muted-foreground">Nenhuma ferramenta cadastrada.</CardContent></Card>
          ) : (
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {filtradas.map((f) => (
                <Card key={f.id}>
                  <CardContent className="p-4 space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="font-semibold truncate">{f.nome}</div>
                        <div className="text-xs text-muted-foreground truncate">
                          {[f.codigo, f.marca, f.modelo, f.localizacao].filter(Boolean).join(" · ") || "Sem detalhes"}
                        </div>
                      </div>
                      <Badge variant="outline" className={FERRAMENTA_STATUS_COR[f.status]}>{FERRAMENTA_STATUS_LABEL[f.status]}</Badge>
                    </div>
                    {f.valor_aquisicao != null && (
                      <div className="text-xs text-muted-foreground">
                        Aquisição: {formatBRL(Number(f.valor_aquisicao))}{f.data_aquisicao ? ` · ${formatDate(f.data_aquisicao)}` : ""}
                      </div>
                    )}
                    <div className="flex flex-wrap gap-2 pt-1">
                      <Button size="sm" variant="outline" onClick={() => setEmprestar(f)} disabled={f.status !== "disponivel"}>Emprestar</Button>
                      <Select value={f.status} onValueChange={(v) => mudarStatus(f, v as FerramentaStatus)}>
                        <SelectTrigger className="h-8 w-40 text-xs"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {(Object.keys(FERRAMENTA_STATUS_LABEL) as FerramentaStatus[]).map((s) => (
                            <SelectItem key={s} value={s}>{FERRAMENTA_STATUS_LABEL[s]}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Button size="sm" variant="ghost" onClick={() => editar(f)}>Editar</Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="emprestadas">
          <Card><CardContent className="p-4 space-y-2 text-sm">
            {emprestadas.length === 0 && <div className="text-muted-foreground">Nenhuma ferramenta emprestada.</div>}
            {emprestadas.map((e) => {
              const o = e.os_id ? ordens.find((x) => x.id === e.os_id) : null;
              const atrasada = e.previsao_devolucao && new Date(e.previsao_devolucao) < new Date();
              return (
                <div key={e.id} className="flex flex-wrap items-center justify-between gap-2 border-b pb-2 last:border-0">
                  <div>
                    <div className="font-medium">{nomeFerr(e.ferramenta_id)}</div>
                    <div className="text-xs text-muted-foreground">
                      Com {nomePessoa(e.usuario_id)} desde {formatDateTime(e.retirada_em)}
                      {e.previsao_devolucao ? ` · devolver até ${formatDate(e.previsao_devolucao)}` : ""}
                      {o ? ` · OS #${o.numero}` : ""}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {atrasada && <Badge variant="destructive">Atrasada</Badge>}
                    <Button size="sm" variant="outline" onClick={() => devolver(e.id, e.ferramenta_id, "boa")}>Devolver</Button>
                    <Button size="sm" variant="ghost" onClick={() => devolver(e.id, e.ferramenta_id, "danificada")}>Devolver danificada</Button>
                  </div>
                </div>
              );
            })}
          </CardContent></Card>
        </TabsContent>

        <TabsContent value="hist">
          <Card><CardContent className="p-4 space-y-2 text-sm">
            {emprestimos.length === 0 && <div className="text-muted-foreground">Sem registros.</div>}
            {emprestimos.map((e) => (
              <div key={e.id} className="flex flex-wrap items-center justify-between gap-2 border-b pb-2 last:border-0">
                <div>
                  <div className="font-medium">{nomeFerr(e.ferramenta_id)}</div>
                  <div className="text-xs text-muted-foreground">
                    {nomePessoa(e.usuario_id)} · retirada {formatDateTime(e.retirada_em)}
                    {e.devolvido_em ? ` · devolvida ${formatDateTime(e.devolvido_em)}` : " · em aberto"}
                    {e.estado_devolucao ? ` · estado: ${e.estado_devolucao}` : ""}
                  </div>
                </div>
              </div>
            ))}
          </CardContent></Card>
        </TabsContent>
      </Tabs>

      <Dialog open={!!form} onOpenChange={(v) => !v && setForm(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader><DialogTitle>{editId ? "Editar ferramenta" : "Nova ferramenta"}</DialogTitle></DialogHeader>
          {form && (
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="sm:col-span-2"><Label>Nome *</Label><Input value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} /></div>
              <div><Label>Código</Label><Input value={form.codigo} onChange={(e) => setForm({ ...form, codigo: e.target.value })} /></div>
              <div><Label>Categoria</Label><Input value={form.categoria} onChange={(e) => setForm({ ...form, categoria: e.target.value })} /></div>
              <div><Label>Marca</Label><Input value={form.marca} onChange={(e) => setForm({ ...form, marca: e.target.value })} /></div>
              <div><Label>Modelo</Label><Input value={form.modelo} onChange={(e) => setForm({ ...form, modelo: e.target.value })} /></div>
              <div><Label>Número de série</Label><Input value={form.numero_serie} onChange={(e) => setForm({ ...form, numero_serie: e.target.value })} /></div>
              <div><Label>Localização</Label><Input value={form.localizacao} onChange={(e) => setForm({ ...form, localizacao: e.target.value })} /></div>
              <div>
                <Label>Setor</Label>
                <Select value={form.setor_id} onValueChange={(v) => setForm({ ...form, setor_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>{setores.map((s) => <SelectItem key={s.id} value={s.id}>{s.nome}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label>Fornecedor</Label>
                <Select value={form.fornecedor_id} onValueChange={(v) => setForm({ ...form, fornecedor_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>{fornecedores.map((x) => <SelectItem key={x.id} value={x.id}>{x.nome}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Valor de aquisição (R$)</Label><Input value={form.valor_aquisicao} onChange={(e) => setForm({ ...form, valor_aquisicao: e.target.value })} /></div>
              <div><Label>Data de aquisição</Label><Input type="date" value={form.data_aquisicao} onChange={(e) => setForm({ ...form, data_aquisicao: e.target.value })} /></div>
              <div>
                <Label>Estado</Label>
                <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v as FerramentaStatus })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {(Object.keys(FERRAMENTA_STATUS_LABEL) as FerramentaStatus[]).map((s) => (
                      <SelectItem key={s} value={s}>{FERRAMENTA_STATUS_LABEL[s]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="sm:col-span-2"><Label>Observações</Label><Textarea value={form.observacoes} onChange={(e) => setForm({ ...form, observacoes: e.target.value })} /></div>
              <div className="sm:col-span-2 flex justify-end"><Button onClick={salvar} disabled={saving}>Salvar</Button></div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <EmprestarDialog ferramenta={emprestar} onClose={() => setEmprestar(null)} />
    </div>
  );
}

function EmprestarDialog({ ferramenta, onClose }: { ferramenta: Ferramenta | null; onClose: () => void }) {
  const qc = useQueryClient();
  const { data: pessoas = [] } = useQuery(profilesQuery());
  const { data: ordens = [] } = useQuery(ordensQuery());
  const [usuarioId, setUsuarioId] = useState("");
  const [osId, setOsId] = useState("");
  const [previsao, setPrevisao] = useState("");
  const [obs, setObs] = useState("");
  const [saving, setSaving] = useState(false);

  async function confirmar() {
    if (!ferramenta) return;
    if (!usuarioId) return toast.error("Selecione o responsável pela retirada.");
    setSaving(true);
    const { data: u } = await supabase.auth.getUser();
    const { error } = await supabase.from("ferramenta_emprestimos").insert({
      ferramenta_id: ferramenta.id,
      usuario_id: usuarioId,
      registrado_por: u.user?.id ?? null,
      os_id: osId || null,
      previsao_devolucao: previsao || null,
      observacao: obs.trim() || null,
    } as never);
    if (error) { setSaving(false); return showDbError(error); }
    await supabase.from("ferramentas").update({ status: "emprestada" }).eq("id", ferramenta.id);
    setSaving(false);
    setUsuarioId(""); setOsId(""); setPrevisao(""); setObs("");
    onClose();
    await qc.invalidateQueries({ queryKey: ["ferramenta_emprestimos"] });
    await qc.invalidateQueries({ queryKey: ["ferramentas"] });
    toast.success("Empréstimo registrado.");
  }

  return (
    <Dialog open={!!ferramenta} onOpenChange={(v) => !v && onClose()}>
      <DialogContent>
        <DialogHeader><DialogTitle>Emprestar — {ferramenta?.nome}</DialogTitle></DialogHeader>
        <div className="grid gap-3">
          <div>
            <Label>Responsável pela retirada *</Label>
            <Select value={usuarioId} onValueChange={setUsuarioId}>
              <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
              <SelectContent>{pessoas.map((p) => <SelectItem key={p.id} value={p.id}>{p.nome}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div>
            <Label>Ordem de Serviço</Label>
            <Select value={osId} onValueChange={setOsId}>
              <SelectTrigger><SelectValue placeholder="Nenhuma" /></SelectTrigger>
              <SelectContent>{ordens.slice(0, 100).map((o) => <SelectItem key={o.id} value={o.id}>#{o.numero} — {o.titulo}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div><Label>Previsão de devolução</Label><Input type="date" value={previsao} onChange={(e) => setPrevisao(e.target.value)} /></div>
          <div><Label>Observação</Label><Textarea value={obs} onChange={(e) => setObs(e.target.value)} /></div>
          <div className="flex justify-end"><Button onClick={confirmar} disabled={saving}>Confirmar</Button></div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Kpi({ label, value }: { label: string; value: string }) {
  return (
    <Card><CardContent className="p-4">
      <div className="text-xs uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="text-xl font-bold">{value}</div>
    </CardContent></Card>
  );
}
