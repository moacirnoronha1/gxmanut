import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ordensQuery, statusOsQuery, urgenciasQuery, equipamentosQuery } from "@/lib/queries";
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