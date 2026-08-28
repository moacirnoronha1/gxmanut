import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { showDbError } from "@/lib/db-error";
import { formatBRL, formatDate, formatDateTime } from "@/lib/db-types";
import { fornecedoresQuery, profilesQuery, ordensQuery } from "@/lib/queries";
import { useSessaoUsuario } from "@/lib/sessao";
import { ItemFormDialog, MovimentarDialog } from "@/components/estoque-dialogs";
import {
  METODO_LABEL, MOV_LABEL, disponivel, estoqueBaixo, estoqueCategoriasQuery, estoqueConfigQuery,
  estoqueItensQuery, estoqueMovimentacoesQuery, estoqueReservasQuery, sugestaoCompra,
  type EstoqueItem, type MetodoValoracao, type MovTipo,
} from "@/lib/estoque";
import { Boxes, Plus, Settings2, ArrowDownToLine, ArrowUpFromLine } from "lucide-react";

export const Route = createFileRoute("/_authenticated/estoque/")({
  head: () => ({
    meta: [
      { title: "Estoque de Manutenção — Xica da Silva" },
      { name: "description", content: "Controle de peças e materiais: saldos, entradas, saídas, reservas, estoque mínimo e histórico de movimentações." },
      { property: "og:title", content: "Estoque de Manutenção — Xica da Silva" },
      { property: "og:description", content: "Peças, materiais, reservas e integração automática com o custo das ordens de serviço." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Estoque,
});

function Estoque() {
  const qc = useQueryClient();
  const { mestre } = useSessaoUsuario();
  const { data: itens = [] } = useQuery(estoqueItensQuery());
  const { data: categorias = [] } = useQuery(estoqueCategoriasQuery());
  const { data: movs = [] } = useQuery(estoqueMovimentacoesQuery());
  const { data: reservas = [] } = useQuery(estoqueReservasQuery());
  const { data: config } = useQuery(estoqueConfigQuery());
  const { data: fornecedores = [] } = useQuery(fornecedoresQuery());
  const { data: pessoas = [] } = useQuery(profilesQuery());
  const { data: ordens = [] } = useQuery(ordensQuery());

  const [busca, setBusca] = useState("");
  const [catFiltro, setCatFiltro] = useState("todas");
  const [formOpen, setFormOpen] = useState(false);
  const [editando, setEditando] = useState<EstoqueItem | null>(null);
  const [movItem, setMovItem] = useState<EstoqueItem | null>(null);
  const [movTipo, setMovTipo] = useState<MovTipo>("entrada");
  const [configOpen, setConfigOpen] = useState(false);

  const nomeItem = (id: string) => itens.find((i) => i.id === id)?.nome ?? "Item removido";
  const nomePessoa = (id: string | null) => (id ? (pessoas.find((p) => p.id === id)?.nome ?? "—") : "—");
  const numeroOS = (id: string | null) => {
    const o = id ? ordens.find((x) => x.id === id) : null;
    return o ? `#${o.numero}` : null;
  };

  const ativos = itens.filter((i) => i.ativo);
  const filtrados = useMemo(() => {
    const t = busca.trim().toLowerCase();
    return ativos.filter((i) => {
      const okCat = catFiltro === "todas" || i.categoria_id === catFiltro;
      const okBusca =
        !t ||
        i.nome.toLowerCase().includes(t) ||
        (i.codigo ?? "").toLowerCase().includes(t) ||
        (i.localizacao ?? "").toLowerCase().includes(t);
      return okCat && okBusca;
    });
  }, [ativos, busca, catFiltro]);

  const baixos = ativos.filter(estoqueBaixo);
  const comprar = baixos.filter((i) => sugestaoCompra(i) > 0);
  const reservados = ativos.filter((i) => Number(i.quantidade_reservada) > 0);
  const valorTotal = ativos.reduce(
    (s, i) => s + Number(i.quantidade) * (Number(i.custo_medio) || Number(i.custo_unitario) || 0),
    0,
  );
  const entradas = movs.filter((m) => m.tipo === "entrada" || m.tipo === "devolucao");
  const saidas = movs.filter((m) => m.tipo === "saida");
  const gastoSaidas = saidas.reduce((s, m) => s + Number(m.valor_total ?? 0), 0);

  function abrirMov(item: EstoqueItem, tipo: MovTipo) {
    setMovItem(item);
    setMovTipo(tipo);
  }

  async function salvarMetodo(metodo: MetodoValoracao) {
    const { error } = await supabase.from("estoque_config").update({ metodo_valoracao: metodo }).eq("id", true);
    if (error) return showDbError(error);
    await qc.invalidateQueries({ queryKey: ["estoque_config"] });
    toast.success("Método de valoração atualizado.");
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><Boxes className="h-6 w-6" /> Estoque de Manutenção</h1>
          <p className="text-sm text-muted-foreground">Peças e materiais, movimentações e integração automática com o custo das OS.</p>
        </div>
        <div className="flex gap-2">
          {mestre && (
            <Button variant="outline" onClick={() => setConfigOpen(true)}>
              <Settings2 className="mr-2 h-4 w-4" /> Configurações
            </Button>
          )}
          <Button onClick={() => { setEditando(null); setFormOpen(true); }}>
            <Plus className="mr-2 h-4 w-4" /> Novo item
          </Button>
        </div>
      </div>

      <div className="grid gap-3 grid-cols-2 lg:grid-cols-5">
        <Kpi label="Itens ativos" value={String(ativos.length)} />
        <Kpi label="Valor em estoque" value={formatBRL(valorTotal)} />
        <Kpi label="Estoque baixo" value={String(baixos.length)} destaque={baixos.length > 0} />
        <Kpi label="Itens reservados" value={String(reservados.length)} />
        <Kpi label="Consumo lançado" value={formatBRL(gastoSaidas)} />
      </div>

      <div className="flex flex-wrap gap-2">
        <Input className="max-w-xs" placeholder="Buscar por nome, código ou local…" value={busca} onChange={(e) => setBusca(e.target.value)} />
        <Select value={catFiltro} onValueChange={setCatFiltro}>
          <SelectTrigger className="w-56"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todas">Todas as categorias</SelectItem>
            {categorias.filter((c) => c.ativo).map((c) => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <Tabs defaultValue="atual">
        <TabsList className="flex-wrap h-auto">
          <TabsTrigger value="atual">Estoque atual</TabsTrigger>
          <TabsTrigger value="entradas">Entradas</TabsTrigger>
          <TabsTrigger value="saidas">Saídas</TabsTrigger>
          <TabsTrigger value="reservados">Reservados</TabsTrigger>
          <TabsTrigger value="baixo">Estoque baixo</TabsTrigger>
          <TabsTrigger value="comprar">Itens para comprar</TabsTrigger>
          <TabsTrigger value="hist">Histórico</TabsTrigger>
        </TabsList>

        <TabsContent value="atual">
          <ListaItens itens={filtrados} categorias={categorias} onEditar={(i) => { setEditando(i); setFormOpen(true); }} onMov={abrirMov} />
        </TabsContent>

        <TabsContent value="entradas">
          <TabelaMovs movs={entradas} nomeItem={nomeItem} nomePessoa={nomePessoa} numeroOS={numeroOS} vazio="Nenhuma entrada registrada." />
        </TabsContent>

        <TabsContent value="saidas">
          <TabelaMovs movs={saidas} nomeItem={nomeItem} nomePessoa={nomePessoa} numeroOS={numeroOS} vazio="Nenhuma saída registrada." />
        </TabsContent>

        <TabsContent value="reservados">
          <Card><CardContent className="p-4 space-y-2 text-sm">
            {reservas.filter((r) => r.status === "ativa").length === 0 && (
              <div className="text-muted-foreground">Nenhuma reserva ativa.</div>
            )}
            {reservas.filter((r) => r.status === "ativa").map((r) => (
              <div key={r.id} className="flex flex-wrap items-center justify-between gap-2 border-b pb-2 last:border-0">
                <div>
                  <div className="font-medium">{nomeItem(r.item_id)}</div>
                  <div className="text-xs text-muted-foreground">
                    {r.quantidade} un · {numeroOS(r.os_id) ?? "sem OS"} · {formatDate(r.created_at)} · {nomePessoa(r.usuario_id)}
                  </div>
                </div>
                <Badge variant="outline">Reservado</Badge>
              </div>
            ))}
            {reservados.length > 0 && (
              <div className="pt-2 text-xs text-muted-foreground">
                Saldos reservados por item: {reservados.map((i) => `${i.nome} (${i.quantidade_reservada})`).join(" · ")}
              </div>
            )}
          </CardContent></Card>
        </TabsContent>

        <TabsContent value="baixo">
          <ListaItens itens={baixos} categorias={categorias} onEditar={(i) => { setEditando(i); setFormOpen(true); }} onMov={abrirMov} vazio="Nenhum item abaixo do mínimo." />
        </TabsContent>

        <TabsContent value="comprar">
          <Card><CardContent className="p-4 space-y-2 text-sm">
            {comprar.length === 0 && <div className="text-muted-foreground">Nada a comprar no momento.</div>}
            {comprar.map((i) => {
              const forn = fornecedores.find((f) => f.id === i.fornecedor_id);
              const sug = sugestaoCompra(i);
              const custo = Number(i.ultimo_custo ?? i.custo_unitario ?? 0);
              return (
                <div key={i.id} className="flex flex-wrap items-center justify-between gap-2 border-b pb-2 last:border-0">
                  <div>
                    <div className="font-medium">{i.nome}</div>
                    <div className="text-xs text-muted-foreground">
                      Saldo {i.quantidade} · mínimo {i.estoque_minimo} · sugestão de compra <b>{sug} {i.unidade}</b>
                      {forn ? ` · ${forn.nome}` : ""}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold">{formatBRL(sug * custo)}</div>
                    <Button size="sm" variant="outline" className="mt-1" onClick={() => abrirMov(i, "entrada")}>Registrar entrada</Button>
                  </div>
                </div>
              );
            })}
          </CardContent></Card>
        </TabsContent>

        <TabsContent value="hist">
          <TabelaMovs movs={movs} nomeItem={nomeItem} nomePessoa={nomePessoa} numeroOS={numeroOS} vazio="Sem movimentações." />
        </TabsContent>
      </Tabs>

      <ItemFormDialog open={formOpen} onOpenChange={setFormOpen} item={editando} />
      <MovimentarDialog open={!!movItem} onOpenChange={(v) => !v && setMovItem(null)} item={movItem} tipoInicial={movTipo} />

      <Dialog open={configOpen} onOpenChange={setConfigOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Configurações do estoque</DialogTitle></DialogHeader>
          <div className="grid gap-4">
            <div>
              <Label>Método de valoração das saídas</Label>
              <Select value={config?.metodo_valoracao ?? "ultimo"} onValueChange={(v) => salvarMetodo(v as MetodoValoracao)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(Object.keys(METODO_LABEL) as MetodoValoracao[]).map((m) => (
                    <SelectItem key={m} value={m}>{METODO_LABEL[m]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <CategoriasEstoque />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function CategoriasEstoque() {
  const qc = useQueryClient();
  const { data: categorias = [] } = useQuery(estoqueCategoriasQuery());
  const [nome, setNome] = useState("");
  async function criar() {
    if (!nome.trim()) return;
    const { error } = await supabase.from("estoque_categorias").insert({ nome: nome.trim() });
    if (error) return showDbError(error);
    setNome("");
    await qc.invalidateQueries({ queryKey: ["estoque_categorias"] });
    toast.success("Categoria criada.");
  }
  return (
    <div>
      <Label>Categorias</Label>
      <div className="mt-1 flex flex-wrap gap-1">
        {categorias.map((c) => <Badge key={c.id} variant="outline">{c.nome}</Badge>)}
      </div>
      <div className="mt-2 flex gap-2">
        <Input value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Nova categoria" />
        <Button variant="outline" onClick={criar}>Adicionar</Button>
      </div>
    </div>
  );
}

function Kpi({ label, value, destaque }: { label: string; value: string; destaque?: boolean }) {
  return (
    <Card className={destaque ? "border-destructive/50" : undefined}>
      <CardContent className="p-4">
        <div className="text-xs uppercase tracking-wide text-muted-foreground">{label}</div>
        <div className={`text-xl font-bold ${destaque ? "text-destructive" : ""}`}>{value}</div>
      </CardContent>
    </Card>
  );
}

function ListaItens({
  itens, categorias, onEditar, onMov, vazio = "Nenhum item encontrado.",
}: {
  itens: EstoqueItem[];
  categorias: Array<{ id: string; nome: string }>;
  onEditar: (i: EstoqueItem) => void;
  onMov: (i: EstoqueItem, t: MovTipo) => void;
  vazio?: string;
}) {
  if (itens.length === 0) {
    return <Card><CardContent className="p-6 text-sm text-muted-foreground">{vazio}</CardContent></Card>;
  }
  return (
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
      {itens.map((i) => {
        const cat = categorias.find((c) => c.id === i.categoria_id);
        const baixo = estoqueBaixo(i);
        return (
          <Card key={i.id} className={baixo ? "border-destructive/50" : undefined}>
            <CardContent className="p-4 space-y-2">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <Link to="/estoque/$id" params={{ id: i.id }} className="font-semibold hover:underline">{i.nome}</Link>
                  <div className="text-xs text-muted-foreground truncate">
                    {[i.codigo, cat?.nome, i.localizacao].filter(Boolean).join(" · ") || "Sem classificação"}
                  </div>
                </div>
                {baixo && <Badge variant="destructive">Baixo</Badge>}
              </div>
              <div className="grid grid-cols-3 gap-2 text-sm">
                <div><div className="text-xs text-muted-foreground">Saldo</div><b>{i.quantidade} {i.unidade}</b></div>
                <div><div className="text-xs text-muted-foreground">Disponível</div><b>{disponivel(i)}</b></div>
                <div><div className="text-xs text-muted-foreground">Custo</div><b>{formatBRL(Number(i.custo_medio) || Number(i.custo_unitario))}</b></div>
              </div>
              <div className="flex flex-wrap gap-2 pt-1">
                <Button size="sm" variant="outline" onClick={() => onMov(i, "entrada")}><ArrowDownToLine className="mr-1 h-3.5 w-3.5" />Entrada</Button>
                <Button size="sm" variant="outline" onClick={() => onMov(i, "saida")}><ArrowUpFromLine className="mr-1 h-3.5 w-3.5" />Saída</Button>
                <Button size="sm" variant="ghost" onClick={() => onEditar(i)}>Editar</Button>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

function TabelaMovs({
  movs, nomeItem, nomePessoa, numeroOS, vazio,
}: {
  movs: Array<{
    id: string; item_id: string; tipo: MovTipo; quantidade: number; saldo_novo: number | null;
    valor_total: number | null; motivo: string | null; os_id: string | null; usuario_id: string | null; created_at: string;
  }>;
  nomeItem: (id: string) => string;
  nomePessoa: (id: string | null) => string;
  numeroOS: (id: string | null) => string | null;
  vazio: string;
}) {
  if (movs.length === 0) {
    return <Card><CardContent className="p-6 text-sm text-muted-foreground">{vazio}</CardContent></Card>;
  }
  return (
    <Card><CardContent className="p-0">
      <div className="divide-y">
        {movs.map((m) => (
          <div key={m.id} className="flex flex-wrap items-center justify-between gap-2 p-3 text-sm">
            <div className="min-w-0">
              <div className="font-medium truncate">{nomeItem(m.item_id)}</div>
              <div className="text-xs text-muted-foreground">
                {formatDateTime(m.created_at)} · {nomePessoa(m.usuario_id)}
                {numeroOS(m.os_id) ? ` · OS ${numeroOS(m.os_id)}` : ""}
                {m.motivo ? ` · ${m.motivo}` : ""}
              </div>
            </div>
            <div className="text-right">
              <Badge variant="outline">{MOV_LABEL[m.tipo]}</Badge>
              <div className="text-xs text-muted-foreground mt-1">
                {m.quantidade} un{m.saldo_novo !== null ? ` · saldo ${m.saldo_novo}` : ""}
                {m.valor_total ? ` · ${formatBRL(Number(m.valor_total))}` : ""}
              </div>
            </div>
          </div>
        ))}
      </div>
    </CardContent></Card>
  );
}
