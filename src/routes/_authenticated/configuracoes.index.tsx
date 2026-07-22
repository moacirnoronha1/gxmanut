import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { urgenciasQuery, statusOsQuery, categoriasQuery } from "@/lib/queries";

export const Route = createFileRoute("/_authenticated/configuracoes/")({
  head: () => ({ meta: [{ title: "Configurações — Manutenção Xica da Silva" }] }),
  component: Config,
});

function Config() {
  const { data: urgencias = [] } = useQuery(urgenciasQuery());
  const { data: status = [] } = useQuery(statusOsQuery());
  const { data: categorias = [] } = useQuery(categoriasQuery());
  return (
    <div className="space-y-4 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold">Configurações</h1>
        <p className="text-sm text-muted-foreground">Parâmetros do sistema.</p>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Níveis de urgência</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {urgencias.map((u) => (
              <div key={u.id} className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <span className="size-3 rounded-full" style={{ backgroundColor: u.cor }} />
                  {u.nome}
                </div>
                <span className="text-xs text-muted-foreground">{u.prazo_horas ? `${u.prazo_horas}h` : "—"}</span>
              </div>
            ))}
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Status de OS</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {status.map((s) => (
              <div key={s.id} className="flex items-center justify-between text-sm">
                <Badge variant="outline" style={{ borderColor: s.cor, color: s.cor }}>{s.nome}</Badge>
                <span className="text-xs text-muted-foreground">{s.is_final ? "Final" : "Em andamento"}</span>
              </div>
            ))}
          </CardContent>
        </Card>
        <Card className="md:col-span-2">
          <CardHeader><CardTitle>Categorias de problema</CardTitle></CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {categorias.map((c) => <Badge key={c.id} variant="secondary">{c.nome}</Badge>)}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}