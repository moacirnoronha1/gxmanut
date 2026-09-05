import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ordensQuery, statusOsQuery, urgenciasQuery, equipamentosQuery } from "@/lib/queries";
import { manutencoesQuery, mpExecucoesTodasQuery } from "@/lib/mp-queries";
import { diffDias, hojeISO, statusManutencao } from "@/lib/mp-types";
import { formatDateTime } from "@/lib/db-types";
import { ClipboardList, AlertTriangle, CheckCircle2, Wrench } from "lucide-react";

export const Route = createFileRoute("/_authenticated/")({
  head: () => ({ meta: [{ title: "Painel — Manutenção Xica da Silva" }] }),
  component: Dashboard,
});

function Dashboard() {
  const { data: ordens = [] } = useQuery(ordensQuery());
  const { data: status = [] } = useQuery(statusOsQuery());
  const { data: urgencias = [] } = useQuery(urgenciasQuery());
  const { data: equipamentos = [] } = useQuery(equipamentosQuery());
  const { data: manutencoes = [] } = useQuery(manutencoesQuery());
  const { data: execucoes = [] } = useQuery(mpExecucoesTodasQuery());

  const statusMap = new Map(status.map((s) => [s.id, s]));
  const urgMap = new Map(urgencias.map((u) => [u.id, u]));

  const abertas = ordens.filter((o) => !statusMap.get(o.status_id ?? "")?.is_final).length;
  const finalizadas = ordens.filter((o) => statusMap.get(o.status_id ?? "")?.is_final).length;
  const criticas = ordens.filter((o) => {
    const u = urgMap.get(o.urgencia_id ?? "");
    const s = statusMap.get(o.status_id ?? "");
    return u && !s?.is_final && (u.nome === "Crítica" || u.nome === "Alta");
  }).length;

  const recentes = ordens.slice(0, 8);

  const dentro = (m: { proxima_execucao: string | null }, max: number) =>
    !!m.proxima_execucao && diffDias(m.proxima_execucao, hojeISO()) >= 0 && diffDias(m.proxima_execucao, hojeISO()) <= max;
  const mpHoje = manutencoes.filter((m) => statusManutencao(m) === "hoje").length;
  const mpAtrasadas = manutencoes.filter((m) => statusManutencao(m) === "atrasada").length;
  const mpSemana = manutencoes.filter((m) => dentro(m, 7)).length;
  const mpMes = manutencoes.filter((m) => dentro(m, 31)).length;
  const concluidas = execucoes.filter((e) => e.status === "concluida");
  const noPrazo = concluidas.filter((e) => !!e.concluida_em && diffDias(e.concluida_em.slice(0, 10), e.data_programada) <= 0).length;
  const cumprimento = concluidas.length ? Math.round((noPrazo / concluidas.length) * 100) : 0;
  const custoMp = concluidas.reduce((s, e) => s + Number(e.custo_total ?? 0), 0);
  const geraramCorretiva = concluidas.filter((e) => e.gerou_corretiva).length;

  const mpCards = [
    { label: "Periódicas hoje", value: mpHoje },
    { label: "Nesta semana", value: mpSemana },
    { label: "Neste mês", value: mpMes },
    { label: "Atrasadas", value: mpAtrasadas, danger: true },
    { label: "Concluídas no prazo", value: noPrazo },
    { label: "Cumprimento", value: `${cumprimento}%` },
    { label: "Custo das periódicas", value: custoMp.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }) },
    { label: "Geraram corretiva", value: geraramCorretiva },
  ];

  const cards = [
    { label: "OS abertas", value: abertas, icon: ClipboardList, color: "text-primary" },
    { label: "Críticas / Altas", value: criticas, icon: AlertTriangle, color: "text-[color:var(--danger,theme(colors.red.600))]" },
    { label: "Finalizadas", value: finalizadas, icon: CheckCircle2, color: "text-emerald-600" },
    { label: "Equipamentos", value: equipamentos.length, icon: Wrench, color: "text-muted-foreground" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Painel</h1>
          <p className="text-sm text-muted-foreground">Visão geral das ordens de serviço.</p>
        </div>
        <Button asChild><Link to="/ordens/nova">+ Nova OS</Link></Button>
      </div>

      {mestre && exclusoesPendentes > 0 && (
        <Link to="/exclusoes" className="block">
          <Card className="border-destructive/50 bg-destructive/5">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 rounded-md bg-muted text-destructive">
                <Trash2 className="size-5" />
              </div>
              <div>
                <div className="text-2xl font-bold text-destructive">{exclusoesPendentes}</div>
                <div className="text-xs text-muted-foreground">
                  EXCLUSÕES PENDENTES — {exclusoesPendentes}{" "}
                  {exclusoesPendentes === 1 ? "exclusão aguardando" : "exclusões aguardando"}{" "}
                  aprovação
                </div>
              </div>
            </CardContent>
          </Card>
        </Link>
      )}


      <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
        {cards.map((c) => (
          <Card key={c.label}>
            <CardContent className="p-4 flex items-center gap-3">
              <div className={`p-2 rounded-md bg-muted ${c.color}`}>
                <c.icon className="size-5" />
              </div>
              <div className="min-w-0">
                <div className="text-2xl font-bold">{c.value}</div>
                <div className="text-xs text-muted-foreground truncate">{c.label}</div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader className="flex-row items-center justify-between py-3">
          <CardTitle className="text-base">Manutenções periódicas</CardTitle>
          <Button asChild size="sm" variant="outline"><Link to="/manutencoes">Ver todas</Link></Button>
        </CardHeader>
        <CardContent className="grid gap-3 grid-cols-2 lg:grid-cols-4">
          {mpCards.map((c) => (
            <div key={c.label} className="rounded-md border p-3">
              <div className={`text-xl font-bold ${c.danger && Number(c.value) > 0 ? "text-red-600" : ""}`}>{c.value}</div>
              <div className="text-xs text-muted-foreground">{c.label}</div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Últimas OS</CardTitle></CardHeader>
        <CardContent className="p-0">
          <div className="divide-y">
            {recentes.length === 0 && (
              <div className="p-6 text-center text-sm text-muted-foreground">
                Nenhuma OS cadastrada ainda.{" "}
                <Link to="/ordens/nova" className="text-primary underline">Abrir a primeira</Link>
              </div>
            )}
            {recentes.map((o) => {
              const s = statusMap.get(o.status_id ?? "");
              const u = urgMap.get(o.urgencia_id ?? "");
              return (
                <Link
                  key={o.id}
                  to="/ordens/$id"
                  params={{ id: o.id }}
                  className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 p-3 hover:bg-muted/50"
                >
                  <span className="font-mono text-xs text-muted-foreground shrink-0">#{o.numero}</span>
                  <div className="min-w-0">
                    <div className="truncate font-medium">{o.titulo}</div>
                    <div className="truncate text-xs text-muted-foreground">
                      {formatDateTime(o.created_at)}
                    </div>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    {u && <Badge style={{ backgroundColor: u.cor, color: "white" }}>{u.nome}</Badge>}
                    {s && <Badge variant="outline" style={{ borderColor: s.cor, color: s.cor }}>{s.nome}</Badge>}
                  </div>
                </Link>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}