import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatBRL, formatDate, formatDateTime } from "@/lib/db-types";
import { fornecedoresQuery, profilesQuery, ordensQuery, equipamentosQuery } from "@/lib/queries";
import { ItemFormDialog, MovimentarDialog } from "@/components/estoque-dialogs";
import {
  MOV_LABEL, disponivel, estoqueBaixo, estoqueCategoriasQuery, estoqueItemQuery,
  estoqueMovimentacoesQuery, itemEquipamentosQuery, sugestaoCompra, type MovTipo,
} from "@/lib/estoque";
import { ArrowLeft } from "lucide-react";

export const Route = createFileRoute("/_authenticated/estoque/$id")({
  head: () => ({
    meta: [
      { title: "Item de estoque — Manutenção Xica da Silva" },
      { name: "description", content: "Ficha do item de estoque: saldo, custos, equipamentos compatíveis e histórico de movimentações." },
      { property: "og:title", content: "Item de estoque — Manutenção Xica da Silva" },
      { property: "og:description", content: "Saldo, custos e histórico completo do item de estoque." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ItemDetalhe,
});

function ItemDetalhe() {
  const { id } = Route.useParams();
  const { data: item } = useQuery(estoqueItemQuery(id));
  const { data: movs = [] } = useQuery(estoqueMovimentacoesQuery(id));
  const { data: categorias = [] } = useQuery(estoqueCategoriasQuery());
  const { data: fornecedores = [] } = useQuery(fornecedoresQuery());
  const { data: pessoas = [] } = useQuery(profilesQuery());
  const { data: ordens = [] } = useQuery(ordensQuery());
  const { data: equipamentos = [] } = useQuery(equipamentosQuery());
  const { data: compat = [] } = useQuery(itemEquipamentosQuery(id));
  const [editar, setEditar] = useState(false);
  const [mov, setMov] = useState<MovTipo | null>(null);

  if (!item) return <div className="text-sm text-muted-foreground">Carregando…</div>;

  const cat = categorias.find((c) => c.id === item.categoria_id);
  const forn = fornecedores.find((f) => f.id === item.fornecedor_id);
  const consumo = movs.filter((m) => m.tipo === "saida");
  const totalConsumido = consumo.reduce((s, m) => s + Number(m.quantidade), 0);
  const gasto = consumo.reduce((s, m) => s + Number(m.valor_total ?? 0), 0);
  const comprado = movs.filter((m) => m.tipo === "entrada").reduce((s, m) => s + Number(m.valor_total ?? 0), 0);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" asChild><Link to="/estoque"><ArrowLeft className="h-4 w-4" /></Link></Button>
          <div>
            <h1 className="text-2xl font-bold">{item.nome}</h1>
            <p className="text-sm text-muted-foreground">
              {[item.codigo, cat?.nome, item.localizacao].filter(Boolean).join(" · ") || "Sem classificação"}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => setMov("entrada")}>Entrada</Button>
          <Button variant="outline" onClick={() => setMov("saida")}>Saída</Button>
          <Button variant="outline" onClick={() => setMov("ajuste")}>Ajuste</Button>
          <Button onClick={() => setEditar(true)}>Editar</Button>
        </div>
      </div>

      <div className="grid gap-3 grid-cols-2 lg:grid-cols-5">
        <Kpi label="Saldo" value={`${item.quantidade} ${item.unidade}`} destaque={estoqueBaixo(item)} />
        <Kpi label="Disponível" value={String(disponivel(item))} />
        <Kpi label="Custo médio" value={formatBRL(Number(item.custo_medio) || Number(item.custo_unitario))} />
        <Kpi label="Total comprado" value={formatBRL(comprado)} />
        <Kpi label="Total consumido" value={formatBRL(gasto)} />
      </div>

      {estoqueBaixo(item) && (
        <Card className="border-destructive/50">
          <CardContent className="p-4 text-sm">
            Estoque abaixo do mínimo ({item.estoque_minimo} {item.unidade}). Sugestão de compra:{" "}
            <b>{sugestaoCompra(item)} {item.unidade}</b>.
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="dados">
        <TabsList>
          <TabsTrigger value="dados">Dados</TabsTrigger>
          <TabsTrigger value="mov">Movimentações</TabsTrigger>
          <TabsTrigger value="equip">Equipamentos compatíveis</TabsTrigger>
        </TabsList>

        <TabsContent value="dados">
          <Card><CardContent className="p-4">
            <dl className="grid gap-3 sm:grid-cols-3">
              <Info label="Unidade" value={item.unidade} />
              <Info label="Estoque mínimo" value={String(item.estoque_minimo)} />
              <Info label="Reservado" value={String(item.quantidade_reservada)} />
              <Info label="Custo unitário" value={formatBRL(Number(item.custo_unitario))} />
              <Info label="Último custo" value={item.ultimo_custo ? formatBRL(Number(item.ultimo_custo)) : "—"} />
              <Info label="Última compra" value={item.ultima_compra ? formatDate(item.ultima_compra) : "—"} />
              <Info label="Fornecedor" value={forn?.nome ?? "—"} />
              <Info label="Localização" value={item.localizacao ?? "—"} />
              <Info label="Consumo total" value={`${totalConsumido} ${item.unidade}`} />
              <div className="sm:col-span-3">
                <dt className="text-xs text-muted-foreground">Observações</dt>
                <dd className="whitespace-pre-wrap">{item.observacoes || "—"}</dd>
              </div>
            </dl>
          </CardContent></Card>
        </TabsContent>

        <TabsContent value="mov">
          <Card><CardContent className="p-0">
            {movs.length === 0 && <div className="p-6 text-sm text-muted-foreground">Sem movimentações.</div>}
            <div className="divide-y">
              {movs.map((m) => {
                const o = m.os_id ? ordens.find((x) => x.id === m.os_id) : null;
                const p = pessoas.find((x) => x.id === m.usuario_id);
                return (
                  <div key={m.id} className="flex flex-wrap items-center justify-between gap-2 p-3 text-sm">
                    <div>
                      <div className="font-medium">{MOV_LABEL[m.tipo]} — {m.quantidade} {item.unidade}</div>
                      <div className="text-xs text-muted-foreground">
                        {formatDateTime(m.created_at)} · {p?.nome ?? "—"}
                        {o ? ` · OS #${o.numero}` : ""}{m.motivo ? ` · ${m.motivo}` : ""}
                      </div>
                    </div>
                    <div className="text-right text-xs text-muted-foreground">
                      {m.saldo_anterior !== null && <div>{m.saldo_anterior} → {m.saldo_novo}</div>}
                      {m.valor_total ? <div>{formatBRL(Number(m.valor_total))}</div> : null}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent></Card>
        </TabsContent>

        <TabsContent value="equip">
          <Card><CardContent className="p-4 space-y-2 text-sm">
            {compat.length === 0 && <div className="text-muted-foreground">Nenhum equipamento vinculado.</div>}
            {compat.map((eid) => {
              const e = equipamentos.find((x) => x.id === eid);
              if (!e) return null;
              return (
                <div key={eid} className="flex items-center justify-between border-b pb-2 last:border-0">
                  <Link to="/equipamentos/$id" params={{ id: e.id }} className="hover:underline">{e.nome}</Link>
                  <Badge variant="outline">{e.patrimonio ?? "sem patrimônio"}</Badge>
                </div>
              );
            })}
          </CardContent></Card>
        </TabsContent>
      </Tabs>

      <ItemFormDialog open={editar} onOpenChange={setEditar} item={item} />
      <MovimentarDialog open={!!mov} onOpenChange={(v) => !v && setMov(null)} item={item} tipoInicial={mov ?? "entrada"} />
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

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="font-medium">{value}</dd>
    </div>
  );
}
