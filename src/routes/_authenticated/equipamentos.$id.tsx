import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import {
  equipamentoQuery, custosDoEquipamentoQuery, ordensDoEquipamentoQuery,
  custoCategoriasQuery, setoresQuery, statusOsQuery,
} from "@/lib/queries";
import { resumirCustos, GRUPO_LABEL, type CustoGrupo } from "@/lib/custos";
import { formatBRL, formatDate, formatDateTime } from "@/lib/db-types";
import { supabase } from "@/integrations/supabase/client";
import { showDbError } from "@/lib/db-error";
import { toast } from "sonner";
import { ArrowLeft } from "lucide-react";

export const Route = createFileRoute("/_authenticated/equipamentos/$id")({
  head: () => ({
    meta: [
      { title: "Equipamento — Manutenção Xica da Silva" },
      { name: "description", content: "Histórico financeiro e de manutenções do equipamento." },
    ],
  }),
  component: EquipamentoDetalhe,
});

function EquipamentoDetalhe() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { data: eq } = useQuery(equipamentoQuery(id));
  const { data: custos = [] } = useQuery(custosDoEquipamentoQuery(id));
  const { data: ordens = [] } = useQuery(ordensDoEquipamentoQuery(id));
  const { data: categorias = [] } = useQuery(custoCategoriasQuery());
  const { data: setores = [] } = useQuery(setoresQuery());
  const { data: status = [] } = useQuery(statusOsQuery());
  const [valor, setValor] = useState("");

  const resumo = useMemo(() => resumirCustos(custos, categorias), [custos, categorias]);

  const hoje = new Date();
  const mesISO = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, "0")}`;
  const anoISO = String(hoje.getFullYear());
  const dataDe = (c: { data_compra: string | null; created_at: string }) => (c.data_compra ?? c.created_at).slice(0, 10);
  const realizados = custos.filter((c) => !c.previsto);
  const custoMes = realizados.filter((c) => dataDe(c).startsWith(mesISO)).reduce((s, c) => s + Number(c.valor_total ?? 0), 0);
  const custoAno = realizados.filter((c) => dataDe(c).startsWith(anoISO)).reduce((s, c) => s + Number(c.valor_total ?? 0), 0);

  const statusMap = new Map(status.map((s) => [s.id, s]));
  const concluidas = ordens.filter((o) => statusMap.get(o.status_id ?? "")?.is_final);
  const nOS = ordens.length;
  const custoMedio = nOS ? resumo.total / nOS : 0;
  const falhas = ordens.filter((o) => o.tipo === "corretiva").length;
  const horasManut = ordens.reduce((s, o) => s + (o.tempo_atendimento_min ?? 0), 0) / 60;

  const aquisicao = Number(eq?.valor_aquisicao ?? 0);
  const percentual = aquisicao > 0 ? (resumo.total / aquisicao) * 100 : 0;

  async function salvarValor() {
    const v = Number(valor.replace(",", "."));
    if (!Number.isFinite(v) || v < 0) return toast.error("Informe um valor válido.");
    const { error } = await supabase.from("equipamentos").update({ valor_aquisicao: v }).eq("id", id);
    if (error) return showDbError(error);
    setValor("");
    await qc.invalidateQueries({ queryKey: ["equipamento", id] });
    await qc.invalidateQueries({ queryKey: ["equipamentos"] });
    toast.success("Valor de aquisição atualizado.");
  }

  if (!eq) return <div className="text-sm text-muted-foreground">Carregando…</div>;
  const setor = setores.find((s) => s.id === eq.setor_id);

  const grupos = (Object.keys(GRUPO_LABEL) as CustoGrupo[]).filter((g) => resumo.porGrupo[g] > 0);

  return (
    <div className="space-y-4 max-w-5xl mx-auto">
      <div className="flex items-start gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate({ to: "/equipamentos" })}><ArrowLeft className="size-4" /></Button>
        <div className="min-w-0">
          <h1 className="text-2xl font-bold truncate">{eq.nome}</h1>
          <p className="text-sm text-muted-foreground truncate">
            {[eq.patrimonio, eq.marca, eq.modelo, setor?.nome, eq.localizacao].filter(Boolean).join(" · ") || "—"}
          </p>
        </div>
        <Badge className="ml-auto" variant={eq.situacao === "ativo" ? "default" : "outline"}>{eq.situacao}</Badge>
      </div>

      <Card className="border-primary/40">
        <CardContent className="p-4 space-y-4">
          <div>
            <div className="text-xs uppercase text-muted-foreground">Custo acumulado de manutenção</div>
            <div className="text-4xl font-extrabold">{formatBRL(resumo.total)}</div>
          </div>
          <div className="grid gap-2 grid-cols-2 md:grid-cols-4">
            <Mini label="Custo no mês" value={formatBRL(custoMes)} />
            <Mini label="Custo no ano" value={formatBRL(custoAno)} />
            <Mini label="Custo médio por OS" value={formatBRL(custoMedio)} />
            <Mini label="Valor de aquisição" value={aquisicao ? formatBRL(aquisicao) : "—"} />
            <Mini label="Peças e materiais" value={formatBRL(resumo.materiaisPecas)} />
            <Mini label="Mão de obra" value={formatBRL(resumo.maoObra)} />
            <Mini label="Terceiros" value={formatBRL(resumo.servicosExternos)} />
            <Mini label="Desembolso / interno" value={`${formatBRL(resumo.desembolso)} / ${formatBRL(resumo.interno)}`} />
            <Mini label="Nº de OS" value={String(nOS)} />
            <Mini label="Falhas (corretivas)" value={String(falhas)} />
            <Mini label="OS concluídas" value={String(concluidas.length)} />
            <Mini label="Horas de manutenção" value={`${horasManut.toFixed(1)} h`} />
          </div>

          <Separator />
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Manutenção acumulada sobre o valor do equipamento</span>
              <span className={`font-bold ${percentual >= 60 ? "text-red-600" : ""}`}>
                {aquisicao > 0 ? `${percentual.toFixed(1)}%` : "informe o valor de aquisição"}
              </span>
            </div>
            {aquisicao > 0 && <Progress value={Math.min(percentual, 100)} />}
            {aquisicao > 0 && percentual >= 60 && (
              <div className="text-xs text-red-600">
                Atenção: a manutenção já consumiu boa parte do valor do bem. Avalie a substituição.
              </div>
            )}
            <div className="flex items-end gap-2 pt-1">
              <div className="w-48">
                <Label className="text-xs">Valor de aquisição (R$)</Label>
                <Input inputMode="decimal" placeholder={aquisicao ? String(aquisicao) : "0,00"} value={valor} onChange={(e) => setValor(e.target.value)} />
              </div>
              <Button variant="outline" onClick={salvarValor}>Salvar</Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="py-3"><CardTitle className="text-base">Composição por categoria</CardTitle></CardHeader>
        <CardContent className="grid gap-1 sm:grid-cols-2 text-sm">
          {grupos.length === 0 && <div className="text-muted-foreground">Nenhum custo lançado ainda.</div>}
          {grupos.map((g) => (
            <div key={g} className="flex justify-between">
              <span className="text-muted-foreground">{GRUPO_LABEL[g]}</span>
              <span className="font-medium">{formatBRL(resumo.porGrupo[g])}</span>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="py-3"><CardTitle className="text-base">Ordens de serviço</CardTitle></CardHeader>
        <CardContent className="p-0 divide-y">
          {ordens.length === 0 && <div className="p-4 text-sm text-muted-foreground">Nenhuma OS para este equipamento.</div>}
          {ordens.map((o) => {
            const custoOS = realizados.filter((c) => c.os_id === o.id).reduce((s, c) => s + Number(c.valor_total ?? 0), 0);
            const st = statusMap.get(o.status_id ?? "");
            return (
              <Link key={o.id} to="/ordens/$id" params={{ id: o.id }} className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 p-3 hover:bg-muted/50">
                <span className="font-mono text-xs text-muted-foreground">#{o.numero}</span>
                <div className="min-w-0">
                  <div className="truncate font-medium">{o.titulo}</div>
                  <div className="truncate text-xs text-muted-foreground">{formatDateTime(o.created_at)}</div>
                </div>
                <div className="flex items-center gap-2">
                  {st && <Badge variant="outline" style={{ borderColor: st.cor, color: st.cor }}>{st.nome}</Badge>}
                  <span className="font-semibold text-sm">{formatBRL(custoOS)}</span>
                </div>
              </Link>
            );
          })}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="py-3"><CardTitle className="text-base">Lançamentos de custo</CardTitle></CardHeader>
        <CardContent className="p-0 divide-y">
          {realizados.length === 0 && <div className="p-4 text-sm text-muted-foreground">Sem lançamentos.</div>}
          {realizados.map((c) => {
            const cat = categorias.find((k) => k.id === c.categoria_id);
            return (
              <div key={c.id} className="flex items-center gap-3 p-3 text-sm">
                <Badge variant="outline">{cat?.nome ?? c.tipo}</Badge>
                <div className="min-w-0 flex-1 truncate">{c.descricao}</div>
                <span className="text-xs text-muted-foreground">{formatDate(dataDe(c))}</span>
                <span className="font-semibold">{formatBRL(c.valor_total)}</span>
              </div>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
}

function Mini({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border p-2">
      <div className="text-[11px] uppercase text-muted-foreground truncate">{label}</div>
      <div className="text-base font-bold truncate">{value}</div>
    </div>
  );
}
