import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useRef, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  equipamentoQuery, custosDoEquipamentoQuery, ordensDoEquipamentoQuery,
  custoCategoriasQuery, setoresQuery, statusOsQuery, profilesQuery, fornecedoresQuery,
  urgenciasQuery, categoriasQuery,
} from "@/lib/queries";
import {
  equipamentoStatusQuery, equipamentoHistoricoQuery, equipamentoDocumentosQuery, equipamentoParadasQuery,
} from "@/lib/equip-queries";
import { manutencoesQuery, periodicidadesQuery } from "@/lib/mp-queries";
import { resumirCustos, GRUPO_LABEL, type CustoGrupo } from "@/lib/custos";
import {
  calcularIndice, horasParada, horasParadaNoPeriodo, pecasDeCustos, agruparPecas,
  diasEntre, HISTORICO_LABEL, TIPOS_DOCUMENTO, MOTIVOS_PARADA, ESTADOS_CONSERVACAO,
} from "@/lib/equipamentos";
import { EquipamentoQR } from "@/components/equipamento-qr";
import { EquipamentoExcluirDialog } from "@/components/equipamento-excluir";
import { ComponentesEquipamento } from "@/components/equipamento-componentes";
import { ChecklistFormDialog } from "@/components/checklist-form";
import { propriedadeTiposQuery, checklistsQuery, execucoesQuery, respostasDoEquipamentoQuery } from "@/lib/checklist-queries";
import { diasParaVencimento, periodicidadeLabel, MANUTENCAO_RESPONSAVEL } from "@/lib/checklists";
import { useSessaoUsuario } from "@/lib/sessao";
import { formatBRL, formatDate, formatDateTime } from "@/lib/db-types";
import { supabase } from "@/integrations/supabase/client";
import { showDbError } from "@/lib/db-error";
import { toast } from "sonner";
import { ArrowLeft, QrCode, MoveRight, Power, Pencil, PauseCircle, PlayCircle, Plus, Trash2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/equipamentos/$id")({
  head: () => ({
    meta: [
      { title: "Ficha do equipamento — Manutenção Xica da Silva" },
      { name: "description", content: "Histórico, custos, falhas, peças e manutenções do equipamento." },
      { property: "og:title", content: "Ficha do equipamento — Manutenção Xica da Silva" },
      { property: "og:description", content: "Ciclo de vida completo do equipamento." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
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
  const { data: eqStatus = [] } = useQuery(equipamentoStatusQuery());
  const { data: pessoas = [] } = useQuery(profilesQuery());
  const { data: fornecedores = [] } = useQuery(fornecedoresQuery());
  const { data: urgencias = [] } = useQuery(urgenciasQuery());
  const { data: catProblema = [] } = useQuery(categoriasQuery());
  const { data: historico = [] } = useQuery(equipamentoHistoricoQuery(id));
  const { data: documentos = [] } = useQuery(equipamentoDocumentosQuery(id));
  const { data: paradas = [] } = useQuery(equipamentoParadasQuery(id));
  const { data: manutencoes = [] } = useQuery(manutencoesQuery());
  const { data: periodicidades = [] } = useQuery(periodicidadesQuery());
  const { data: propTipos = [] } = useQuery(propriedadeTiposQuery());
  const { data: checklists = [] } = useQuery(checklistsQuery(id));
  const { data: execucoes = [] } = useQuery(execucoesQuery({ equipamentoId: id }));
  const { data: respostasComp = [] } = useQuery(respostasDoEquipamentoQuery(id));
  const [checklistFormOpen, setChecklistFormOpen] = useState(false);
  const propTipo = propTipos.find((t) => t.id === (eq as { propriedade_tipo_id?: string | null } | undefined)?.propriedade_tipo_id);
  const diasContrato = diasParaVencimento((eq as { prop_contrato_fim?: string | null } | undefined)?.prop_contrato_fim ?? null);


  const [qrOpen, setQrOpen] = useState(false);
  const [transferOpen, setTransferOpen] = useState(false);
  const [baixaOpen, setBaixaOpen] = useState(false);
  const [excluirOpen, setExcluirOpen] = useState(false);
  const { mestre } = useSessaoUsuario();
  const [editOpen, setEditOpen] = useState(false);
  const [paradaOpen, setParadaOpen] = useState(false);

  const resumo = useMemo(() => resumirCustos(custos, categorias), [custos, categorias]);
  const realizados = useMemo(() => custos.filter((c) => !c.previsto), [custos]);
  const pecas = useMemo(() => pecasDeCustos(custos, categorias), [custos, categorias]);
  const pecasAgrupadas = useMemo(() => agruparPecas(pecas), [pecas]);

  const hoje = new Date();
  const mesISO = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, "0")}`;
  const anoISO = String(hoje.getFullYear());
  const dataDe = (c: { data_compra: string | null; created_at: string }) => (c.data_compra ?? c.created_at).slice(0, 10);
  const custoMes = realizados.filter((c) => dataDe(c).startsWith(mesISO)).reduce((s, c) => s + Number(c.valor_total ?? 0), 0);
  const custoAno = realizados.filter((c) => dataDe(c).startsWith(anoISO)).reduce((s, c) => s + Number(c.valor_total ?? 0), 0);

  const statusMap = new Map(status.map((s) => [s.id, s]));
  const concluidas = ordens.filter((o) => statusMap.get(o.status_id ?? "")?.is_final);
  const nOS = ordens.length;
  const custoMedio = nOS ? resumo.total / nOS : 0;
  const falhas = ordens.filter((o) => o.tipo === "corretiva").length;
  const ultimaManut = ordens.filter((o) => o.concluida_em).map((o) => o.concluida_em!).sort().at(-1) ?? null;

  const mpsDoEquip = manutencoes.filter((m) => m.equipamento_id === id);
  const proximaMP = mpsDoEquip.map((m) => m.proxima_execucao).filter(Boolean).sort()[0] ?? eq?.proxima_manutencao ?? null;

  const horasTotal = paradas.reduce((s, p) => s + horasParada(p), 0);
  const horasMes = horasParadaNoPeriodo(paradas, new Date(hoje.getFullYear(), hoje.getMonth(), 1));
  const horasAno = horasParadaNoPeriodo(paradas, new Date(hoje.getFullYear(), 0, 1));
  const paradasFechadas = paradas.filter((p) => p.fim);
  const mttr = paradasFechadas.length ? paradasFechadas.reduce((s, p) => s + horasParada(p), 0) / paradasFechadas.length : 0;
  const paradaAberta = paradas.find((p) => !p.fim) ?? null;

  const aquisicao = Number(eq?.valor_aquisicao ?? 0);
  const limite = eq?.limite_custo_percentual ?? 60;
  const indice = calcularIndice({
    valorAquisicao: aquisicao, custoAcumulado: resumo.total, qtdOS: nOS, falhas,
    horasParado: horasTotal, dataAquisicao: eq?.data_aquisicao ?? null,
    vidaUtilMeses: eq?.vida_util_meses ?? null, limitePercentual: limite,
  });

  const falhasRecorrentes = useMemo(() => {
    const map = new Map<string, { nome: string; vezes: number; custo: number; ultima: string }>();
    for (const o of ordens.filter((x) => x.tipo === "corretiva")) {
      const nome = catProblema.find((c) => c.id === o.categoria_id)?.nome ?? "Sem categoria";
      const atual = map.get(nome) ?? { nome, vezes: 0, custo: 0, ultima: o.created_at };
      atual.vezes += 1;
      atual.custo += realizados.filter((c) => c.os_id === o.id).reduce((s, c) => s + Number(c.valor_total ?? 0), 0);
      if (o.created_at > atual.ultima) atual.ultima = o.created_at;
      map.set(nome, atual);
    }
    return [...map.values()].sort((a, b) => b.vezes - a.vezes);
  }, [ordens, catProblema, realizados]);

  async function recarregar() {
    await qc.invalidateQueries({ queryKey: ["equipamento", id] });
    await qc.invalidateQueries({ queryKey: ["equipamentos"] });
    await qc.invalidateQueries({ queryKey: ["equipamento_historico", id] });
    await qc.invalidateQueries({ queryKey: ["equipamento_paradas"] });
  }

  if (!eq) return <div className="text-sm text-muted-foreground">Carregando…</div>;

  const setor = setores.find((s) => s.id === eq.setor_id);
  const responsavel = pessoas.find((p) => p.id === eq.responsavel_id);
  const tecnico = pessoas.find((p) => p.id === eq.tecnico_id);
  const stEq = eqStatus.find((s) => s.id === eq.status_id);
  const grupos = (Object.keys(GRUPO_LABEL) as CustoGrupo[]).filter((g) => resumo.porGrupo[g] > 0);
  const baixado = !!eq.baixa_em;

  async function alterarStatus(statusId: string) {
    const { error } = await supabase.from("equipamentos").update({ status_id: statusId }).eq("id", id);
    if (error) return showDbError(error);
    await recarregar();
    toast.success("Status atualizado.");
  }

  async function encerrarParada(paradaId: string) {
    const { error } = await supabase.from("equipamento_paradas").update({ fim: new Date().toISOString() }).eq("id", paradaId);
    if (error) return showDbError(error);
    const { data: u } = await supabase.auth.getUser();
    await supabase.from("equipamento_historico").insert({
      equipamento_id: id, usuario_id: u.user?.id ?? null, tipo: "retorno", descricao: "Equipamento voltou a operar",
    });
    await recarregar();
    toast.success("Retorno registrado.");
  }

  return (
    <div className="space-y-4 max-w-6xl mx-auto">
      <div className="flex items-start gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate({ to: "/equipamentos" })}><ArrowLeft className="size-4" /></Button>
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl font-bold truncate">{eq.nome}</h1>
          <p className="text-sm text-muted-foreground truncate">
            {[eq.codigo, eq.patrimonio, eq.marca, eq.modelo, setor?.nome, eq.localizacao].filter(Boolean).join(" · ") || "—"}
          </p>
        </div>
        <div className="flex flex-wrap justify-end gap-2">
          <Button variant="outline" size="sm" onClick={() => setQrOpen(true)}><QrCode className="mr-1 size-4" />QR Code</Button>
          <Button variant="outline" size="sm" onClick={() => setEditOpen(true)}><Pencil className="mr-1 size-4" />Editar</Button>
          <Button variant="outline" size="sm" onClick={() => setTransferOpen(true)}><MoveRight className="mr-1 size-4" />Transferir</Button>
          {paradaAberta
            ? <Button variant="outline" size="sm" onClick={() => encerrarParada(paradaAberta.id)}><PlayCircle className="mr-1 size-4" />Voltou a operar</Button>
            : <Button variant="outline" size="sm" onClick={() => setParadaOpen(true)}><PauseCircle className="mr-1 size-4" />Registrar parada</Button>}
          {!baixado && <Button variant="outline" size="sm" onClick={() => setBaixaOpen(true)}><Power className="mr-1 size-4" />Desativar equipamento</Button>}
          {mestre && (
            <Button variant="destructive" size="sm" onClick={() => setExcluirOpen(true)}>
              <Trash2 className="mr-1 size-4" />Excluir definitivamente
            </Button>
          )}
        </div>
      </div>

      <Card className="border-primary/40">
        <CardContent className="grid gap-4 p-4 md:grid-cols-[160px_minmax(0,1fr)]">
          <div className="flex items-center justify-center">
            {eq.foto_url
              ? <img src={eq.foto_url} alt={`Foto de ${eq.nome}`} className="h-36 w-full rounded-md border object-cover" loading="lazy" />
              : <div className="flex h-36 w-full items-center justify-center rounded-md border text-xs text-muted-foreground">Sem foto</div>}
          </div>
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <Select value={eq.status_id ?? ""} onValueChange={alterarStatus}>
                <SelectTrigger className="h-8 w-[220px]"><SelectValue placeholder="Definir status" /></SelectTrigger>
                <SelectContent>
                  {eqStatus.filter((s) => s.ativo || s.id === eq.status_id).map((s) => <SelectItem key={s.id} value={s.id}>{s.nome}</SelectItem>)}
                </SelectContent>
              </Select>
              {stEq && <Badge variant="outline" style={{ borderColor: stEq.cor, color: stEq.cor }}>{stEq.nome}</Badge>}
              {propTipo && (
                <Badge style={{ backgroundColor: propTipo.cor, color: "#fff" }}>{propTipo.nome.toUpperCase()}</Badge>
              )}
              {diasContrato !== null && diasContrato <= 30 && (
                <Badge variant="destructive">
                  {diasContrato < 0 ? `Contrato vencido há ${Math.abs(diasContrato)} d` : `Contrato vence em ${diasContrato} d`}
                </Badge>
              )}
              <Badge variant="outline" className={indice.cor}>Índice: {indice.label} ({indice.pontuacao})</Badge>
              {baixado && <Badge variant="destructive">Baixado em {formatDate(eq.baixa_em)}</Badge>}
              {paradaAberta && <Badge variant="destructive">Parado desde {formatDateTime(paradaAberta.inicio)}</Badge>}
            </div>
            <div className="grid gap-2 grid-cols-2 md:grid-cols-4">
              <Mini label="Setor" value={setor?.nome ?? "—"} />
              <Mini label="Localização" value={eq.localizacao ?? "—"} />
              <Mini label="Responsável" value={responsavel?.nome ?? "—"} />
              <Mini label="Técnico" value={tecnico?.nome ?? "—"} />
              <Mini label="Última manutenção" value={ultimaManut ? formatDate(ultimaManut) : "—"} />
              <Mini label="Próxima manutenção" value={proximaMP ? formatDate(proximaMP) : "—"} />
              <Mini label="Custo acumulado" value={formatBRL(resumo.total)} />
              <Mini label="Nº de OS" value={String(nOS)} />
              <Mini label="Tempo total parado" value={`${horasTotal.toFixed(1)} h`} />
              <Mini label="Falhas (corretivas)" value={String(falhas)} />
              <Mini label="OS concluídas" value={String(concluidas.length)} />
              <Mini label="Valor de aquisição" value={aquisicao ? formatBRL(aquisicao) : "—"} />
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="geral">
        <TabsList className="flex w-full flex-wrap justify-start h-auto">
          <TabsTrigger value="geral">Visão geral</TabsTrigger>
          <TabsTrigger value="os">Ordens de Serviço</TabsTrigger>
          <TabsTrigger value="mp">Manutenções periódicas</TabsTrigger>
          <TabsTrigger value="custos">Custos</TabsTrigger>
          <TabsTrigger value="historico">Histórico</TabsTrigger>
          <TabsTrigger value="pecas">Peças utilizadas</TabsTrigger>
          <TabsTrigger value="docs">Documentos</TabsTrigger>
          <TabsTrigger value="fotos">Fotos</TabsTrigger>
          <TabsTrigger value="indicadores">Indicadores</TabsTrigger>
        </TabsList>

        <TabsContent value="geral" className="space-y-3">
          <Card>
            <CardHeader className="py-3"><CardTitle className="text-base">Dados cadastrais</CardTitle></CardHeader>
            <CardContent className="grid gap-2 sm:grid-cols-2 text-sm">
              <Linha label="Código interno" valor={eq.codigo ?? "—"} />
              <Linha label="Patrimônio" valor={eq.patrimonio ?? "—"} />
              <Linha label="Categoria" valor={eq.categoria ?? "—"} />
              <Linha label="Tipo" valor={eq.tipo ?? "—"} />
              <Linha label="Marca / Modelo" valor={[eq.marca, eq.modelo].filter(Boolean).join(" / ") || "—"} />
              <Linha label="Número de série" valor={eq.numero_serie ?? "—"} />
              <Linha label="Aquisição" valor={formatDate(eq.data_aquisicao)} />
              <Linha label="Instalação" valor={formatDate(eq.data_instalacao)} />
              <Linha label="Fornecedor" valor={fornecedores.find((f) => f.id === eq.fornecedor_id)?.nome ?? "—"} />
              <Linha label="Garantia" valor={[eq.garantia_descricao, eq.garantia_ate ? `até ${formatDate(eq.garantia_ate)}` : null].filter(Boolean).join(" · ") || "—"} />
              <Linha label="Vida útil estimada" valor={eq.vida_util_meses ? `${eq.vida_util_meses} meses` : "—"} />
              <Linha label="Estado de conservação" valor={eq.estado_conservacao ?? "—"} />
              <Linha label="Observações" valor={eq.observacoes ?? "—"} />
              <Linha
                label="Cadastrado por"
                valor={`${pessoas.find((p) => p.id === eq.criado_por)?.nome ?? "—"}${eq.created_at ? ` · ${formatDateTime(eq.created_at)}` : ""}`}
              />


              {baixado && <Linha label="Baixa" valor={`${eq.baixa_tipo === "descarte" ? "Descartado" : "Desativado"} em ${formatDate(eq.baixa_em)} — ${eq.baixa_motivo ?? ""}`} />}
            </CardContent>
          </Card>
          {falhasRecorrentes.some((f) => f.vezes >= 2) && (
            <Card className="border-red-500/50">
              <CardHeader className="py-3"><CardTitle className="text-base text-red-600">Falhas recorrentes</CardTitle></CardHeader>
              <CardContent className="space-y-1 text-sm">
                {falhasRecorrentes.filter((f) => f.vezes >= 2).map((f) => (
                  <div key={f.nome} className="flex justify-between gap-2">
                    <span>{f.nome} — {f.vezes}x (última em {formatDate(f.ultima)})</span>
                    <span className="font-semibold">{formatBRL(f.custo)}</span>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="os">
          <Card>
            <CardContent className="p-0 divide-y">
              {ordens.length === 0 && <div className="p-4 text-sm text-muted-foreground">Nenhuma OS para este equipamento.</div>}
              {ordens.map((o) => {
                const custoOS = realizados.filter((c) => c.os_id === o.id).reduce((s, c) => s + Number(c.valor_total ?? 0), 0);
                const st = statusMap.get(o.status_id ?? "");
                const urg = urgencias.find((u) => u.id === o.urgencia_id);
                return (
                  <Link key={o.id} to="/ordens/$id" params={{ id: o.id }} className="block p-3 hover:bg-muted/50">
                    <div className="flex items-center gap-3">
                      <span className="font-mono text-xs text-muted-foreground">#{o.numero}</span>
                      <div className="min-w-0 flex-1">
                        <div className="truncate font-medium">{o.titulo}</div>
                        <div className="truncate text-xs text-muted-foreground">
                          {formatDateTime(o.created_at)} · {pessoas.find((p) => p.id === o.tecnico_id)?.nome ?? "sem técnico"}
                          {o.tempo_atendimento_min ? ` · ${(o.tempo_atendimento_min / 60).toFixed(1)} h` : ""}
                        </div>
                      </div>
                      {urg && <Badge variant="outline" style={{ borderColor: urg.cor, color: urg.cor }}>{urg.nome}</Badge>}
                      {st && <Badge variant="outline" style={{ borderColor: st.cor, color: st.cor }}>{st.nome}</Badge>}
                      <span className="font-semibold text-sm">{formatBRL(custoOS)}</span>
                    </div>
                    {(o.solucao || o.correcao) && (
                      <div className="mt-1 truncate text-xs text-muted-foreground">Solução: {o.solucao ?? o.correcao}</div>
                    )}
                  </Link>
                );
              })}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="mp">
          <Card>
            <CardHeader className="flex-row items-center justify-between py-3">
              <CardTitle className="text-base">Rotinas periódicas</CardTitle>
              <Button size="sm" variant="outline" asChild>
                <Link to="/manutencoes" search={{ novo: id } as never}><Plus className="mr-1 size-4" />Nova rotina</Link>
              </Button>
            </CardHeader>
            <CardContent className="p-0 divide-y">
              {mpsDoEquip.length === 0 && <div className="p-4 text-sm text-muted-foreground">Nenhuma manutenção periódica cadastrada para este equipamento.</div>}
              {mpsDoEquip.map((m) => {
                const per = periodicidades.find((p) => p.id === m.periodicidade_id);
                const dias = diasEntre(m.proxima_execucao);
                return (
                  <Link key={m.id} to="/manutencoes/$id" params={{ id: m.id }} className="flex items-center gap-3 p-3 text-sm hover:bg-muted/50">
                    <div className="min-w-0 flex-1">
                      <div className="truncate font-medium">{m.nome}</div>
                      <div className="truncate text-xs text-muted-foreground">
                        {per?.nome ?? "Personalizada"} · Última: {formatDate(m.ultima_execucao)} · Próxima: {formatDate(m.proxima_execucao)}
                        {" · "}{pessoas.find((p) => p.id === m.responsavel_id)?.nome ?? "sem responsável"}
                      </div>
                    </div>
                    {dias !== null && (
                      <Badge variant="outline" className={dias < 0 ? "text-red-600 border-red-600" : dias <= 7 ? "text-amber-600 border-amber-600" : ""}>
                        {dias < 0 ? `${Math.abs(dias)} dias em atraso` : `em ${dias} dias`}
                      </Badge>
                    )}
                    <Badge variant="outline">{m.situacao}</Badge>
                  </Link>
                );
              })}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="custos" className="space-y-3">
          <Card>
            <CardContent className="space-y-4 p-4">
              <div>
                <div className="text-xs uppercase text-muted-foreground">Custo acumulado de manutenção</div>
                <div className="text-4xl font-extrabold">{formatBRL(resumo.total)}</div>
              </div>
              <div className="grid gap-2 grid-cols-2 md:grid-cols-4">
                <Mini label="Custo no mês" value={formatBRL(custoMes)} />
                <Mini label="Custo no ano" value={formatBRL(custoAno)} />
                <Mini label="Custo médio por OS" value={formatBRL(custoMedio)} />
                <Mini label="Valor de aquisição" value={aquisicao ? formatBRL(aquisicao) : "—"} />
                <Mini label="Peças" value={formatBRL(resumo.porGrupo.peca)} />
                <Mini label="Materiais" value={formatBRL(resumo.porGrupo.material)} />
                <Mini label="Mão de obra" value={formatBRL(resumo.maoObra)} />
                <Mini label="Serviços externos" value={formatBRL(resumo.servicosExternos)} />
                <Mini label="Deslocamento" value={formatBRL(resumo.porGrupo.transporte)} />
                <Mini label="Outros" value={formatBRL(resumo.porGrupo.outro + resumo.porGrupo.taxa + resumo.porGrupo.locacao)} />
                <Mini label="Desembolso" value={formatBRL(resumo.desembolso)} />
                <Mini label="Custo interno" value={formatBRL(resumo.interno)} />
              </div>
              <Separator />
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Manutenção acumulada sobre o valor do equipamento</span>
                  <span className={`font-bold ${indice.percentualCusto >= limite ? "text-red-600" : ""}`}>
                    {aquisicao > 0 ? `${indice.percentualCusto.toFixed(1)}%` : "informe o valor de aquisição"}
                  </span>
                </div>
                {aquisicao > 0 && <Progress value={Math.min(indice.percentualCusto, 100)} />}
                {aquisicao > 0 && indice.percentualCusto >= limite && (
                  <div className="text-xs text-red-600">
                    Alerta: o custo de manutenção ultrapassou o limite de {limite}% configurado para este equipamento.
                  </div>
                )}
              </div>
              <div className="grid gap-1 sm:grid-cols-2 text-sm">
                {grupos.map((g) => (
                  <div key={g} className="flex justify-between">
                    <span className="text-muted-foreground">{GRUPO_LABEL[g]}</span>
                    <span className="font-medium">{formatBRL(resumo.porGrupo[g])}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="py-3"><CardTitle className="text-base">Lançamentos</CardTitle></CardHeader>
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
        </TabsContent>

        <TabsContent value="historico">
          <Card>
            <CardContent className="p-0 divide-y">
              {historico.length === 0 && <div className="p-4 text-sm text-muted-foreground">Sem eventos registrados.</div>}
              {historico.map((h) => (
                <div key={h.id} className="p-3 text-sm">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="outline">{HISTORICO_LABEL[h.tipo] ?? h.tipo}</Badge>
                    <span className="text-xs text-muted-foreground">{formatDateTime(h.created_at)}</span>
                    <span className="text-xs text-muted-foreground">
                      por {pessoas.find((p) => p.id === h.usuario_id)?.nome ?? "sistema"}
                    </span>
                  </div>
                  {(h.valor_anterior || h.valor_novo) && (
                    <div className="mt-1 text-xs">
                      {h.campo}: <span className="line-through text-muted-foreground">{h.valor_anterior ?? "—"}</span>
                      {" → "}<span className="font-medium">{h.valor_novo ?? "—"}</span>
                    </div>
                  )}
                  {h.descricao && <div className="mt-1 text-xs text-muted-foreground">{h.descricao}</div>}
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="pecas" className="space-y-3">
          <Card>
            <CardHeader className="py-3"><CardTitle className="text-base">Peças mais substituídas</CardTitle></CardHeader>
            <CardContent className="p-0 divide-y">
              {pecasAgrupadas.length === 0 && <div className="p-4 text-sm text-muted-foreground">Nenhuma peça registrada.</div>}
              {pecasAgrupadas.map((p) => (
                <div key={p.nome} className="flex items-center gap-3 p-3 text-sm">
                  <div className="min-w-0 flex-1 truncate font-medium">{p.nome}</div>
                  <Badge variant="outline">{p.vezes}x</Badge>
                  <span className="text-xs text-muted-foreground">{p.quantidade} un</span>
                  <span className="font-semibold">{formatBRL(p.valor)}</span>
                </div>
              ))}
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="py-3"><CardTitle className="text-base">Histórico de peças</CardTitle></CardHeader>
            <CardContent className="p-0 divide-y">
              {pecas.length === 0 && <div className="p-4 text-sm text-muted-foreground">Nenhuma peça utilizada.</div>}
              {pecas.map((p) => {
                const os = ordens.find((o) => o.id === p.os_id);
                return (
                  <div key={p.id} className="p-3 text-sm">
                    <div className="flex items-center gap-3">
                      <div className="min-w-0 flex-1 truncate font-medium">{p.descricao}</div>
                      <span className="text-xs text-muted-foreground">{p.quantidade} {p.unidade ?? "un"}</span>
                      <span className="font-semibold">{formatBRL(p.valor_total)}</span>
                    </div>
                    <div className="mt-1 text-xs text-muted-foreground">
                      {formatDate(dataDe(p))}
                      {os && <> · <Link to="/ordens/$id" params={{ id: os.id }} className="underline">OS #{os.numero}</Link></>}
                      {" · "}{fornecedores.find((f) => f.id === p.fornecedor_id)?.nome ?? "sem fornecedor"}
                      {" · "}{pessoas.find((x) => x.id === p.tecnico_id)?.nome ?? "—"}
                      {p.observacao && ` · ${p.observacao}`}
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="docs">
          <DocumentosPanel equipamentoId={id} documentos={documentos.filter((d) => d.tipo !== "foto")} apenasFotos={false} />
        </TabsContent>

        <TabsContent value="fotos">
          <DocumentosPanel equipamentoId={id} documentos={documentos.filter((d) => d.tipo === "foto")} apenasFotos />
        </TabsContent>

        <TabsContent value="indicadores" className="space-y-3">
          <Card>
            <CardHeader className="py-3"><CardTitle className="text-base">Índice de manutenção do equipamento</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-3">
                <span className="text-3xl font-extrabold">{indice.pontuacao}</span>
                <Badge variant="outline" className={indice.cor}>{indice.label}</Badge>
              </div>
              <Progress value={indice.pontuacao} />
              <ul className="list-disc pl-5 text-sm text-muted-foreground">
                {indice.motivos.map((m) => <li key={m}>{m}</li>)}
              </ul>
              <p className="text-xs text-muted-foreground">
                Ferramenta de apoio à decisão. A substituição do equipamento é decisão do gestor.
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="py-3"><CardTitle className="text-base">Tempo parado</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div className="grid gap-2 grid-cols-2 md:grid-cols-4">
                <Mini label="Horas no mês" value={`${horasMes.toFixed(1)} h`} />
                <Mini label="Horas no ano" value={`${horasAno.toFixed(1)} h`} />
                <Mini label="Total histórico" value={`${horasTotal.toFixed(1)} h`} />
                <Mini label="Tempo médio de reparo" value={`${mttr.toFixed(1)} h`} />
              </div>
              <div className="divide-y rounded-md border">
                {paradas.length === 0 && <div className="p-3 text-sm text-muted-foreground">Nenhuma parada registrada.</div>}
                {paradas.map((p) => (
                  <div key={p.id} className="flex flex-wrap items-center gap-2 p-3 text-sm">
                    <span>{formatDateTime(p.inicio)} → {p.fim ? formatDateTime(p.fim) : "em aberto"}</span>
                    <Badge variant="outline">{p.motivo ?? "—"}</Badge>
                    {p.os_id && <Link to="/ordens/$id" params={{ id: p.os_id }} className="text-xs underline">OS relacionada</Link>}
                    <span className="ml-auto font-semibold">{horasParada(p).toFixed(1)} h</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="py-3"><CardTitle className="text-base">Falhas por tipo de problema</CardTitle></CardHeader>
            <CardContent className="space-y-1 text-sm">
              {falhasRecorrentes.length === 0 && <div className="text-muted-foreground">Nenhuma falha registrada.</div>}
              {falhasRecorrentes.map((f) => (
                <div key={f.nome} className="flex justify-between gap-2">
                  <span>{f.nome} — {f.vezes}x</span>
                  <span className="font-medium">{formatBRL(f.custo)}</span>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <EquipamentoQR
        open={qrOpen} onOpenChange={setQrOpen} equipamentoId={id}
        nome={eq.nome} codigo={eq.codigo} setor={setor?.nome} localizacao={eq.localizacao}
      />
      <TransferirDialog
        open={transferOpen} onOpenChange={setTransferOpen} equipamentoId={id}
        setores={setores} pessoas={pessoas} onDone={recarregar}
        atual={{ setor_id: eq.setor_id, localizacao: eq.localizacao, responsavel_id: eq.responsavel_id }}
      />
      <BaixaDialog open={baixaOpen} onOpenChange={setBaixaOpen} equipamentoId={id} eqStatus={eqStatus} onDone={recarregar} />
      {mestre && <EquipamentoExcluirDialog open={excluirOpen} onOpenChange={setExcluirOpen} equipamentoId={id} nome={eq.nome} />}
      <ParadaDialog open={paradaOpen} onOpenChange={setParadaOpen} equipamentoId={id} ordens={ordens} onDone={recarregar} />
      <EditarDialog
        open={editOpen} onOpenChange={setEditOpen} equipamento={eq as unknown as { id: string } & Record<string, unknown>}
        setores={setores} pessoas={pessoas} fornecedores={fornecedores} onDone={recarregar}
      />
    </div>
  );
}

function Mini({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border p-2">
      <div className="text-[11px] uppercase text-muted-foreground truncate">{label}</div>
      <div className="text-base font-bold truncate" title={value}>{value}</div>
    </div>
  );
}

function Linha({ label, valor }: { label: string; valor: string }) {
  return (
    <div className="flex justify-between gap-2 border-b py-1 last:border-0">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right font-medium">{valor}</span>
    </div>
  );
}

function DocumentosPanel({
  equipamentoId, documentos, apenasFotos,
}: { equipamentoId: string; documentos: { id: string; tipo: string; nome: string; url: string; created_at: string }[]; apenasFotos: boolean }) {
  const qc = useQueryClient();
  const inputRef = useRef<HTMLInputElement>(null);
  const [tipo, setTipo] = useState(apenasFotos ? "foto" : "manual");
  const [busy, setBusy] = useState(false);

  async function upload(file: File) {
    setBusy(true);
    const { data: u } = await supabase.auth.getUser();
    const path = `equipamentos/${equipamentoId}/${Date.now()}-${file.name.replace(/[^\w.\-]/g, "_")}`;
    const up = await supabase.storage.from("comprovantes").upload(path, file);
    if (up.error) { setBusy(false); return showDbError(up.error); }
    const { error } = await supabase.from("equipamento_documentos").insert({
      equipamento_id: equipamentoId, tipo: apenasFotos ? "foto" : tipo, nome: file.name, url: path, autor_id: u.user?.id ?? null,
    });
    if (!error) {
      await supabase.from("equipamento_historico").insert({
        equipamento_id: equipamentoId, usuario_id: u.user?.id ?? null, tipo: "documento",
        descricao: `${apenasFotos ? "Foto" : "Documento"} anexado: ${file.name}`,
      });
    }
    setBusy(false);
    if (error) return showDbError(error);
    await qc.invalidateQueries({ queryKey: ["equipamento_documentos", equipamentoId] });
    await qc.invalidateQueries({ queryKey: ["equipamento_historico", equipamentoId] });
    toast.success("Arquivo anexado.");
  }

  async function abrir(url: string) {
    const { data, error } = await supabase.storage.from("comprovantes").createSignedUrl(url, 120);
    if (error || !data) return toast.error("Não foi possível abrir o arquivo.");
    window.open(data.signedUrl, "_blank", "noopener");
  }

  return (
    <Card>
      <CardContent className="space-y-3 p-4">
        <div className="flex flex-wrap items-end gap-2">
          {!apenasFotos && (
            <div className="w-56">
              <Label className="text-xs">Tipo do documento</Label>
              <Select value={tipo} onValueChange={setTipo}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {TIPOS_DOCUMENTO.filter((t) => t.value !== "foto").map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          )}
          <input
            ref={inputRef} type="file" className="hidden"
            accept={apenasFotos ? "image/*" : undefined}
            onChange={(e) => { const f = e.target.files?.[0]; if (f) upload(f); e.target.value = ""; }}
          />
          <Button variant="outline" disabled={busy} onClick={() => inputRef.current?.click()}>
            {busy ? "Enviando…" : apenasFotos ? "Adicionar foto" : "Anexar documento"}
          </Button>
        </div>
        <div className="divide-y rounded-md border">
          {documentos.length === 0 && <div className="p-3 text-sm text-muted-foreground">Nenhum arquivo.</div>}
          {documentos.map((d) => (
            <button key={d.id} type="button" onClick={() => abrir(d.url)} className="flex w-full items-center gap-3 p-3 text-left text-sm hover:bg-muted/50">
              <Badge variant="outline">{TIPOS_DOCUMENTO.find((t) => t.value === d.tipo)?.label ?? d.tipo}</Badge>
              <span className="min-w-0 flex-1 truncate">{d.nome}</span>
              <span className="text-xs text-muted-foreground">{formatDateTime(d.created_at)}</span>
            </button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function TransferirDialog({
  open, onOpenChange, equipamentoId, setores, pessoas, atual, onDone,
}: {
  open: boolean; onOpenChange: (v: boolean) => void; equipamentoId: string;
  setores: { id: string; nome: string }[]; pessoas: { id: string; nome: string }[];
  atual: { setor_id: string | null; localizacao: string | null; responsavel_id: string | null };
  onDone: () => Promise<void>;
}) {
  const [setorId, setSetorId] = useState(atual.setor_id ?? "none");
  const [local, setLocal] = useState(atual.localizacao ?? "");
  const [responsavel, setResponsavel] = useState(atual.responsavel_id ?? "none");
  const [data, setData] = useState(new Date().toISOString().slice(0, 10));
  const [motivo, setMotivo] = useState("");

  async function salvar() {
    if (!motivo.trim()) return toast.error("Informe o motivo da transferência.");
    const { error } = await supabase.from("equipamentos").update({
      setor_id: setorId === "none" ? null : setorId,
      localizacao: local.trim() || null,
      responsavel_id: responsavel === "none" ? null : responsavel,
    }).eq("id", equipamentoId);
    if (error) return showDbError(error);
    const { data: u } = await supabase.auth.getUser();
    await supabase.from("equipamento_historico").insert({
      equipamento_id: equipamentoId, usuario_id: u.user?.id ?? null, tipo: "transferencia",
      descricao: `Transferência em ${formatDate(data)} — ${motivo.trim()}`,
    });
    onOpenChange(false);
    setMotivo("");
    await onDone();
    toast.success("Transferência registrada.");
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>Transferir equipamento</DialogTitle></DialogHeader>
        <div className="grid gap-3">
          <div><Label className="text-xs">Novo setor</Label>
            <Select value={setorId} onValueChange={setSetorId}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Sem setor</SelectItem>
                {setores.map((s) => <SelectItem key={s.id} value={s.id}>{s.nome}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div><Label className="text-xs">Nova localização</Label><Input value={local} onChange={(e) => setLocal(e.target.value)} /></div>
          <div><Label className="text-xs">Novo responsável</Label>
            <Select value={responsavel} onValueChange={setResponsavel}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Sem responsável</SelectItem>
                {pessoas.map((p) => <SelectItem key={p.id} value={p.id}>{p.nome}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div><Label className="text-xs">Data</Label><Input type="date" value={data} onChange={(e) => setData(e.target.value)} /></div>
          <div><Label className="text-xs">Motivo *</Label><Textarea value={motivo} onChange={(e) => setMotivo(e.target.value)} /></div>
          <div className="flex justify-end"><Button onClick={salvar}>Confirmar transferência</Button></div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function BaixaDialog({
  open, onOpenChange, equipamentoId, eqStatus, onDone,
}: {
  open: boolean; onOpenChange: (v: boolean) => void; equipamentoId: string;
  eqStatus: { id: string; nome: string }[]; onDone: () => Promise<void>;
}) {
  const [tipo, setTipo] = useState("desativacao");
  const [data, setData] = useState(new Date().toISOString().slice(0, 10));
  const [motivo, setMotivo] = useState("");
  const [destino, setDestino] = useState("");
  const [valor, setValor] = useState("");
  const [obs, setObs] = useState("");

  async function salvar() {
    if (!motivo.trim()) return toast.error("Informe o motivo.");
    const { data: u } = await supabase.auth.getUser();
    const alvo = eqStatus.find((s) => s.nome === (tipo === "descarte" ? "Descartado" : "Desativado"));
    const num = Number(valor.replace(",", "."));
    const { error } = await supabase.from("equipamentos").update({
      baixa_em: new Date(`${data}T12:00:00`).toISOString(),
      baixa_tipo: tipo,
      baixa_motivo: motivo.trim(),
      baixa_destino: destino.trim() || null,
      baixa_valor: Number.isFinite(num) && valor.trim() !== "" ? num : null,
      baixa_usuario_id: u.user?.id ?? null,
      status_id: alvo?.id ?? null,
      situacao: tipo === "descarte" ? "descartado" : "inativo",
      ativo: false,
      observacoes: obs.trim() || undefined,
    }).eq("id", equipamentoId);
    if (error) return showDbError(error);
    onOpenChange(false);
    await onDone();
    toast.success(tipo === "descarte" ? "Equipamento descartado." : "Equipamento desativado.");
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>Desativar ou descartar</DialogTitle></DialogHeader>
        <div className="grid gap-3">
          <div><Label className="text-xs">Ação</Label>
            <Select value={tipo} onValueChange={setTipo}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="desativacao">Desativar equipamento</SelectItem>
                <SelectItem value="descarte">Descartar equipamento</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div><Label className="text-xs">Data</Label><Input type="date" value={data} onChange={(e) => setData(e.target.value)} /></div>
          <div><Label className="text-xs">Motivo *</Label><Textarea value={motivo} onChange={(e) => setMotivo(e.target.value)} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label className="text-xs">Destino</Label><Input value={destino} onChange={(e) => setDestino(e.target.value)} /></div>
            <div><Label className="text-xs">Valor de venda / descarte</Label><Input inputMode="decimal" value={valor} onChange={(e) => setValor(e.target.value)} /></div>
          </div>
          <div><Label className="text-xs">Observações</Label><Textarea value={obs} onChange={(e) => setObs(e.target.value)} /></div>
          <p className="text-xs text-muted-foreground">O equipamento não é apagado: todo o histórico permanece disponível para consulta.</p>
          <div className="flex justify-end"><Button onClick={salvar}>Confirmar</Button></div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function ParadaDialog({
  open, onOpenChange, equipamentoId, ordens, onDone,
}: {
  open: boolean; onOpenChange: (v: boolean) => void; equipamentoId: string;
  ordens: { id: string; numero: number; titulo: string }[]; onDone: () => Promise<void>;
}) {
  const [motivo, setMotivo] = useState(MOTIVOS_PARADA[0]);
  const [osId, setOsId] = useState("none");
  const [inicio, setInicio] = useState(() => new Date().toISOString().slice(0, 16));
  const [obs, setObs] = useState("");

  async function salvar() {
    const { data: u } = await supabase.auth.getUser();
    const { error } = await supabase.from("equipamento_paradas").insert({
      equipamento_id: equipamentoId,
      os_id: osId === "none" ? null : osId,
      inicio: new Date(inicio).toISOString(),
      motivo, observacao: obs.trim() || null,
      registrado_por: u.user?.id ?? null,
    });
    if (error) return showDbError(error);
    await supabase.from("equipamento_historico").insert({
      equipamento_id: equipamentoId, usuario_id: u.user?.id ?? null, tipo: "parada",
      descricao: `Parada registrada — ${motivo}`,
    });
    onOpenChange(false);
    setObs("");
    await onDone();
    toast.success("Parada registrada.");
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>Registrar parada</DialogTitle></DialogHeader>
        <div className="grid gap-3">
          <div><Label className="text-xs">Início</Label><Input type="datetime-local" value={inicio} onChange={(e) => setInicio(e.target.value)} /></div>
          <div><Label className="text-xs">Motivo</Label>
            <Select value={motivo} onValueChange={setMotivo}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{MOTIVOS_PARADA.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div><Label className="text-xs">OS relacionada</Label>
            <Select value={osId} onValueChange={setOsId}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Nenhuma</SelectItem>
                {ordens.map((o) => <SelectItem key={o.id} value={o.id}>#{o.numero} — {o.titulo}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div><Label className="text-xs">Observação</Label><Textarea value={obs} onChange={(e) => setObs(e.target.value)} /></div>
          <div className="flex justify-end"><Button onClick={salvar}>Registrar</Button></div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function EditarDialog({
  open, onOpenChange, equipamento, setores, pessoas, fornecedores, onDone,
}: {
  open: boolean; onOpenChange: (v: boolean) => void;
  equipamento: { id: string } & Record<string, unknown>;
  setores: { id: string; nome: string }[]; pessoas: { id: string; nome: string }[];
  fornecedores: { id: string; nome: string }[]; onDone: () => Promise<void>;
}) {
  const str = (k: string) => (equipamento[k] == null ? "" : String(equipamento[k]));
  const sel = (k: string) => (equipamento[k] == null ? "none" : String(equipamento[k]));
  const [form, setForm] = useState(() => ({
    nome: str("nome"), codigo: str("codigo"), patrimonio: str("patrimonio"), categoria: str("categoria"),
    tipo: str("tipo"), marca: str("marca"), modelo: str("modelo"), numero_serie: str("numero_serie"),
    setor_id: sel("setor_id"), localizacao: str("localizacao"), responsavel_id: sel("responsavel_id"),
    tecnico_id: sel("tecnico_id"), data_aquisicao: str("data_aquisicao").slice(0, 10),
    data_instalacao: str("data_instalacao").slice(0, 10), valor_aquisicao: str("valor_aquisicao"),
    fornecedor_id: sel("fornecedor_id"), garantia_descricao: str("garantia_descricao"),
    garantia_ate: str("garantia_ate").slice(0, 10), vida_util_meses: str("vida_util_meses"),
    estado_conservacao: sel("estado_conservacao"), limite_custo_percentual: str("limite_custo_percentual") || "60",
    foto_url: str("foto_url"), observacoes: str("observacoes"),
  }));

  async function salvar() {
    if (!form.nome.trim()) return toast.error("Informe o nome.");
    const nn = (v: string) => (v.trim() === "" ? null : v.trim());
    const pick = (v: string) => (v === "none" ? null : v);
    const num = (v: string) => { const n = Number(v.replace(",", ".")); return Number.isFinite(n) && v.trim() !== "" ? n : null; };
    const { error } = await supabase.from("equipamentos").update({
      nome: form.nome.trim(), codigo: nn(form.codigo), patrimonio: nn(form.patrimonio),
      categoria: nn(form.categoria), tipo: nn(form.tipo), marca: nn(form.marca), modelo: nn(form.modelo),
      numero_serie: nn(form.numero_serie), setor_id: pick(form.setor_id), localizacao: nn(form.localizacao),
      responsavel_id: pick(form.responsavel_id), tecnico_id: pick(form.tecnico_id),
      data_aquisicao: nn(form.data_aquisicao), data_instalacao: nn(form.data_instalacao),
      valor_aquisicao: num(form.valor_aquisicao), fornecedor_id: pick(form.fornecedor_id),
      garantia_descricao: nn(form.garantia_descricao), garantia_ate: nn(form.garantia_ate),
      vida_util_meses: num(form.vida_util_meses), estado_conservacao: pick(form.estado_conservacao),
      limite_custo_percentual: num(form.limite_custo_percentual) ?? 60,
      foto_url: nn(form.foto_url), observacoes: nn(form.observacoes),
    }).eq("id", equipamento.id);
    if (error) return showDbError(error);
    onOpenChange(false);
    await onDone();
    toast.success("Equipamento atualizado.");
  }

  const campo = (label: string, key: keyof typeof form, props: Record<string, unknown> = {}) => (
    <div>
      <Label className="text-xs">{label}</Label>
      <Input value={form[key]} onChange={(e) => setForm({ ...form, [key]: e.target.value })} {...props} />
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-auto">
        <DialogHeader><DialogTitle>Editar equipamento</DialogTitle></DialogHeader>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="sm:col-span-2">{campo("Nome *", "nome")}</div>
          {campo("Código interno", "codigo")}
          {campo("Nº de patrimônio", "patrimonio")}
          {campo("Categoria", "categoria")}
          {campo("Tipo", "tipo")}
          {campo("Marca", "marca")}
          {campo("Modelo", "modelo")}
          {campo("Número de série", "numero_serie")}
          <div><Label className="text-xs">Setor</Label>
            <Select value={form.setor_id} onValueChange={(v) => setForm({ ...form, setor_id: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Sem setor</SelectItem>
                {setores.map((s) => <SelectItem key={s.id} value={s.id}>{s.nome}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          {campo("Localização", "localizacao")}
          <div><Label className="text-xs">Responsável</Label>
            <Select value={form.responsavel_id} onValueChange={(v) => setForm({ ...form, responsavel_id: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Sem responsável</SelectItem>
                {pessoas.map((p) => <SelectItem key={p.id} value={p.id}>{p.nome}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div><Label className="text-xs">Técnico responsável</Label>
            <Select value={form.tecnico_id} onValueChange={(v) => setForm({ ...form, tecnico_id: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Sem técnico</SelectItem>
                {pessoas.map((p) => <SelectItem key={p.id} value={p.id}>{p.nome}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          {campo("Data de aquisição", "data_aquisicao", { type: "date" })}
          {campo("Data de instalação", "data_instalacao", { type: "date" })}
          {campo("Valor de aquisição (R$)", "valor_aquisicao", { inputMode: "decimal" })}
          <div><Label className="text-xs">Fornecedor</Label>
            <Select value={form.fornecedor_id} onValueChange={(v) => setForm({ ...form, fornecedor_id: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Sem fornecedor</SelectItem>
                {fornecedores.map((f) => <SelectItem key={f.id} value={f.id}>{f.nome}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          {campo("Garantia", "garantia_descricao")}
          {campo("Garantia até", "garantia_ate", { type: "date" })}
          {campo("Vida útil estimada (meses)", "vida_util_meses", { inputMode: "numeric" })}
          <div><Label className="text-xs">Estado de conservação</Label>
            <Select value={form.estado_conservacao} onValueChange={(v) => setForm({ ...form, estado_conservacao: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Não informado</SelectItem>
                {ESTADOS_CONSERVACAO.map((v) => <SelectItem key={v} value={v}>{v}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          {campo("Alerta de custo acima de (%)", "limite_custo_percentual", { inputMode: "numeric" })}
          <div className="sm:col-span-2">{campo("URL da foto principal", "foto_url")}</div>
          <div className="sm:col-span-2">
            <Label className="text-xs">Observações</Label>
            <Textarea value={form.observacoes} onChange={(e) => setForm({ ...form, observacoes: e.target.value })} />
          </div>
        </div>
        <div className="flex justify-end pt-2"><Button onClick={salvar}>Salvar alterações</Button></div>
      </DialogContent>
    </Dialog>
  );
}
