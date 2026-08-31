import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { execucaoQuery, respostasQuery, checklistQuery } from "@/lib/checklist-queries";
import { equipamentoQuery, profilesQuery, ordensQuery } from "@/lib/queries";
import { GRAVIDADES } from "@/lib/checklists";
import { formatDateTime } from "@/lib/db-types";
import { ArrowLeft } from "lucide-react";

export const Route = createFileRoute("/_authenticated/checklists/resultado/$id")({
  head: () => ({
    meta: [
      { title: "Resultado da inspeção — Manutenção Xica da Silva" },
      { name: "description", content: "Resumo da inspeção: itens verificados, conformidade, não conformidades e OS geradas." },
      { property: "og:title", content: "Resultado da inspeção — Manutenção Xica da Silva" },
      { property: "og:description", content: "Percentual de conformidade e problemas identificados no checklist." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ResultadoChecklist,
});

function ResultadoChecklist() {
  const { id } = Route.useParams();
  const { data: exec } = useQuery(execucaoQuery(id));
  const { data: respostas = [] } = useQuery(respostasQuery(id));
  const { data: checklist } = useQuery(checklistQuery(exec?.checklist_id ?? ""));
  const { data: equipamento } = useQuery(equipamentoQuery(exec?.equipamento_id ?? ""));
  const { data: pessoas = [] } = useQuery(profilesQuery());
  const { data: ordens = [] } = useQuery(ordensQuery());

  if (!exec) return <div className="p-4 text-sm text-muted-foreground">Carregando resultado…</div>;

  const naoConformes = respostas.filter((r) => r.conforme === false);
  const osGeradas = naoConformes.filter((r) => r.os_id);
  const usuario = pessoas.find((p) => p.id === exec.usuario_id);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Button variant="ghost" size="sm" asChild><Link to="/checklists"><ArrowLeft className="mr-1 size-4" />Voltar</Link></Button>
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-xl font-bold">{checklist?.nome ?? "Checklist"}</h1>
          <p className="text-sm text-muted-foreground">
            {equipamento?.nome ?? "Equipamento"} · {usuario?.nome ?? "—"} · {formatDateTime(exec.concluida_em ?? exec.iniciada_em)}
          </p>
        </div>
      </div>

      <Card>
        <CardHeader className="py-3"><CardTitle className="text-base">Resultado da inspeção</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="grid gap-2 grid-cols-2 md:grid-cols-5">
            <Mini label="Itens verificados" value={String(exec.total_itens)} />
            <Mini label="Conformes" value={String(exec.conformes)} />
            <Mini label="Não conformes" value={String(exec.nao_conformes)} />
            <Mini label="Não aplicáveis" value={String(exec.nao_aplicaveis)} />
            <Mini label="OS geradas" value={String(osGeradas.length)} />
          </div>
          <div>
            <div className="mb-1 flex justify-between text-sm">
              <span>Conformidade</span>
              <span className="font-semibold">{Number(exec.percentual_conformidade).toFixed(1)}%</span>
            </div>
            <Progress value={Number(exec.percentual_conformidade)} />
          </div>
          {exec.observacoes && <p className="text-sm text-muted-foreground">{exec.observacoes}</p>}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="py-3"><CardTitle className="text-base">Problemas identificados</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {naoConformes.length === 0 && <p className="text-sm text-muted-foreground">Nenhuma não conformidade registrada.</p>}
          {naoConformes.map((r) => {
            const os = ordens.find((o) => o.id === r.os_id);
            return (
              <div key={r.id} className="rounded-md border border-destructive/40 p-3 text-sm">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-medium">{r.componente}</span>
                  <span className="text-muted-foreground">— {r.pergunta}</span>
                  <Badge variant="destructive">{GRAVIDADES.find((g) => g.value === r.gravidade)?.label ?? "Não conforme"}</Badge>
                  {r.necessita_manutencao && <Badge variant="outline">Necessita manutenção</Badge>}
                  {os && (
                    <Button asChild size="sm" variant="outline">
                      <Link to="/ordens/$id" params={{ id: os.id }}>OS #{os.numero}</Link>
                    </Button>
                  )}
                </div>
                {r.descricao_problema && <p className="mt-1">{r.descricao_problema}</p>}
                {r.observacao && <p className="text-xs text-muted-foreground">{r.observacao}</p>}
                {r.foto_url && (
                  <img src={r.foto_url} alt={`Foto da não conformidade em ${r.componente}`} className="mt-2 max-h-48 rounded-md border object-cover" loading="lazy" />
                )}
              </div>
            );
          })}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="py-3"><CardTitle className="text-base">Itens verificados</CardTitle></CardHeader>
        <CardContent className="divide-y p-0 text-sm">
          {respostas.map((r) => (
            <div key={r.id} className="flex flex-wrap items-center gap-2 p-3">
              <div className="min-w-0 flex-1">
                <div className="truncate font-medium">{r.componente}</div>
                <div className="truncate text-xs text-muted-foreground">{r.pergunta}</div>
              </div>
              <Badge variant={r.conforme === false ? "destructive" : "outline"}>
                {r.conforme === true ? "Conforme" : r.conforme === false ? "Não conforme" : "Não se aplica"}
              </Badge>
              {r.valor && <span className="text-xs text-muted-foreground">{r.valor}</span>}
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

function Mini({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border p-2">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="text-lg font-semibold">{value}</div>
    </div>
  );
}
