import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { BarraConfirmacaoOS } from "@/components/confirmar-os";
import { EquipeOSCard } from "@/components/equipe-os";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import {
  osQuery,
  osCustosDetalhadosQuery,
  osComentariosQuery,
  osHistoricoQuery,
  statusOsQuery,
  urgenciasQuery,
  setoresQuery,
  equipamentosQuery,
  profilesQuery,
  categoriasQuery,
  custoCategoriasQuery,
} from "@/lib/queries";
import { CustosOSPanel, IndicadorFinanceiroOS } from "@/components/custos-os";
import { resumirCustos } from "@/lib/custos";
import { supabase } from "@/integrations/supabase/client";
import { formatBRL, formatDateTime } from "@/lib/db-types";
import { toast } from "sonner";
import { showDbError } from "@/lib/db-error";
import { ArrowLeft } from "lucide-react";
import { UsarPecaOS } from "@/components/usar-peca-os";
import { EditarOS } from "@/components/editar-os";

type ExecForm = {
  diagnostico: string;
  correcao: string;
  materiais: string;
  testes: string;
  resultado: string;
};

export const Route = createFileRoute("/_authenticated/ordens/$id")({
  head: () => ({ meta: [{ title: "OS — Manutenção Xica da Silva" }] }),
  component: OSDetail,
});


function OSDetail() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const { data: os } = useQuery(osQuery(id));
  const { data: custos = [] } = useQuery(osCustosDetalhadosQuery(id));
  const { data: coments = [] } = useQuery(osComentariosQuery(id));
  const { data: hist = [] } = useQuery(osHistoricoQuery(id));
  const { data: status = [] } = useQuery(statusOsQuery());
  const { data: urgencias = [] } = useQuery(urgenciasQuery());
  const { data: setores = [] } = useQuery(setoresQuery());
  const { data: equipamentos = [] } = useQuery(equipamentosQuery());
  const { data: profiles = [] } = useQuery(profilesQuery());
  const { data: categorias = [] } = useQuery(categoriasQuery());
  const { data: custoCategorias = [] } = useQuery(custoCategoriasQuery());

  const resumo = useMemo(() => resumirCustos(custos, custoCategorias), [custos, custoCategorias]);
  const totalCustos = resumo.total;
  const [tab, setTab] = useState("exec");
  const [exec, setExec] = useState<ExecForm | null>(null);
  const execAtual: ExecForm = exec ?? {
    diagnostico: os?.diagnostico ?? "",
    correcao: os?.correcao ?? "",
    materiais: os?.materiais_utilizados ?? "",
    testes: os?.testes_realizados ?? "",
    resultado: os?.resultado_testes ?? "",
  };


  if (!os) return <div className="text-sm text-muted-foreground">Carregando…</div>;

  const s = status.find((x) => x.id === os.status_id);
  const u = urgencias.find((x) => x.id === os.urgencia_id);
  const set = setores.find((x) => x.id === os.setor_id);
  const eq = equipamentos.find((x) => x.id === os.equipamento_id);
  const solic = profiles.find((p) => p.id === os.solicitante_id);
  const tec = profiles.find((p) => p.id === os.tecnico_id);
  const cat = categorias.find((c) => c.id === os.categoria_id);

  async function updateOS(patch: Record<string, unknown>, ok = "Atualizado.") {
    const { error } = await supabase
      .from("ordens_servico")
      .update(patch as never)
      .eq("id", id);
    if (error) return showDbError(error);
    toast.success(ok);
    await qc.invalidateQueries({ queryKey: ["os", id] });
    await qc.invalidateQueries({ queryKey: ["ordens_servico"] });
    await qc.invalidateQueries({ queryKey: ["os_hist", id] });
  }

  async function iniciar() {
    const em = status.find((x) => {
      const n = x.nome.toLowerCase();
      return n.includes("andamento") || n.includes("execu");
    });
    await updateOS(
      { status_id: em?.id ?? os!.status_id, iniciada_em: new Date().toISOString() },
      "OS iniciada.",
    );
  }
  async function salvarExecucao(form: ExecForm) {
    await updateOS(
      {
        diagnostico: form.diagnostico,
        correcao: form.correcao,
        materiais_utilizados: form.materiais,
        testes_realizados: form.testes,
        resultado_testes: form.resultado,
      },
      "Execução salva.",
    );
  }
  async function concluir(form: ExecForm) {
    const conc = status.find((x) => x.nome.toLowerCase().includes("conclu"));
    await updateOS(
      {
        status_id: conc?.id ?? os!.status_id,
        concluida_em: new Date().toISOString(),
        diagnostico: form.diagnostico,
        correcao: form.correcao,
        materiais_utilizados: form.materiais,
        testes_realizados: form.testes,
        resultado_testes: form.resultado,
      },
      "OS concluída.",
    );
  }

  async function cancelar() {
    const motivo = prompt("Motivo do cancelamento:");
    if (!motivo) return;
    const canc = status.find((x) => x.nome.toLowerCase().includes("cancel"));
    await updateOS(
      { status_id: canc?.id ?? os!.status_id, cancelada_motivo: motivo },
      "OS cancelada.",
    );
  }

  return (
    <div className="space-y-4 max-w-6xl mx-auto">
      <div className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-start gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate({ to: "/ordens" })}>
          <ArrowLeft className="size-4" />
        </Button>
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-mono text-sm text-muted-foreground">OS #{os.numero}</span>
            {u && <Badge style={{ backgroundColor: u.cor, color: "white" }}>{u.nome}</Badge>}
            {s && (
              <Badge variant="outline" style={{ borderColor: s.cor, color: s.cor }}>
                {s.nome}
              </Badge>
            )}
          </div>
          <h1 className="text-xl md:text-2xl font-bold mt-1 truncate">{os.titulo}</h1>
        </div>
        <EditarOS
          os={os}
          setores={setores}
          equipamentos={equipamentos}
          categorias={categorias}
          urgencias={urgencias}
          status={status}
          profiles={profiles}
        />
      </div>

      <BarraConfirmacaoOS osId={os.id} urgencia={u?.nome} />

      <IndicadorFinanceiroOS
        custos={custos}
        categorias={custoCategorias}
        onVerDetalhes={() => setTab("custos")}
      />

      <div className="grid gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Detalhes</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="whitespace-pre-wrap">{os.descricao}</div>
              <Separator />
              <dl className="grid grid-cols-2 gap-2">
                <Info label="Setor" value={set?.nome} />
                <Info label="Equipamento" value={eq?.nome ?? os.equipamento_nao_cadastrado} />
                <Info label="Local" value={os.local} />
                <Info label="Categoria" value={cat?.nome} />
                <Info label="Solicitante" value={solic?.nome} />
                <Info label="Técnico" value={tec?.nome ?? "—"} />
                <Info label="Aberta em" value={formatDateTime(os.created_at)} />
                <Info label="Iniciada em" value={formatDateTime(os.iniciada_em)} />
                <Info label="Concluída em" value={formatDateTime(os.concluida_em)} />
                <Info label="Equipamento parado" value={os.equipamento_parado ? "Sim" : "Não"} />
              </dl>
            </CardContent>
          </Card>

          <Tabs value={tab} onValueChange={setTab}>
            <TabsList className="grid grid-cols-4 w-full">
              <TabsTrigger value="exec">Execução</TabsTrigger>
              <TabsTrigger value="custos">Custos</TabsTrigger>
              <TabsTrigger value="coment">Comentários</TabsTrigger>
              <TabsTrigger value="hist">Histórico</TabsTrigger>
            </TabsList>

            <TabsContent forceMount value="exec" className="data-[state=inactive]:hidden">
              <ExecucaoCard
                os={os}
                form={execAtual}
                setForm={setExec}
                onSalvar={salvarExecucao}
                onConcluir={concluir}
                onIniciar={iniciar}
              />
            </TabsContent>

            <TabsContent
              forceMount
              value="custos"
              className="space-y-3 data-[state=inactive]:hidden"
            >
              <div className="flex justify-end">
                <UsarPecaOS osId={id} equipamentoId={os.equipamento_id} />
              </div>
              <CustosOSPanel osId={id} equipamentoId={os.equipamento_id} custos={custos} />
            </TabsContent>

            <TabsContent forceMount value="coment" className="data-[state=inactive]:hidden">
              <ComentariosCard osId={id} coments={coments} profiles={profiles} qc={qc} />
            </TabsContent>


            <TabsContent value="hist">
              <Card>
                <CardContent className="p-4 space-y-2 text-sm">
                  {hist.length === 0 && <div className="text-muted-foreground">Sem histórico.</div>}
                  {hist.map((h) => {
                    const p = profiles.find((x) => x.id === h.usuario_id);
                    return (
                      <div
                        key={h.id}
                        className="flex items-start gap-2 border-l-2 border-muted pl-3"
                      >
                        <div className="text-xs text-muted-foreground w-32 shrink-0">
                          {formatDateTime(h.created_at)}
                        </div>
                        <div>
                          <div className="font-medium">{h.acao}</div>
                          <div className="text-xs text-muted-foreground">
                            {p?.nome ?? "Sistema"}
                          </div>
                          <HistoricoDetalhes
                            detalhes={h.detalhes}
                            status={status}
                            urgencias={urgencias}
                            setores={setores}
                            equipamentos={equipamentos}
                            categorias={categorias}
                            profiles={profiles}
                          />
                        </div>
                      </div>
                    );
                  })}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>

        <div className="space-y-4">
          <EquipeOSCard osId={id} assumidaPor={os.assumida_por} assumidaEm={os.assumida_em} />

          <Card>
            <CardHeader>
              <CardTitle>Ações</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <Label>Status</Label>
                <Select
                  value={os.status_id ?? ""}
                  onValueChange={(v) => updateOS({ status_id: v }, "Status alterado.")}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {status.map((st) => (
                      <SelectItem key={st.id} value={st.id}>
                        {st.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Urgência</Label>
                <Select
                  value={os.urgencia_id ?? ""}
                  onValueChange={(v) => updateOS({ urgencia_id: v }, "Urgência alterada.")}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {urgencias.map((x) => (
                      <SelectItem key={x.id} value={x.id}>
                        {x.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Técnico responsável</Label>
                <Select
                  value={os.tecnico_id ?? "none"}
                  onValueChange={(v) =>
                    updateOS({ tecnico_id: v === "none" ? null : v }, "Técnico atribuído.")
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Sem técnico</SelectItem>
                    {profiles.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Separator />
              {!os.iniciada_em && (
                <Button className="w-full" onClick={iniciar}>
                  Iniciar atendimento
                </Button>
              )}
              <Button variant="destructive" className="w-full" onClick={cancelar}>
                Cancelar OS
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Resumo financeiro</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{formatBRL(totalCustos)}</div>
              <div className="text-xs text-muted-foreground">
                {resumo.lancamentos} lançamento(s)
              </div>
              <div className="mt-3 space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Desembolso</span>
                  <span>{formatBRL(resumo.desembolso)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Custo interno</span>
                  <span>{formatBRL(resumo.interno)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Comprovado</span>
                  <span>{formatBRL(resumo.comprovado)}</span>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="w-full mt-3"
                onClick={() => setTab("custos")}
              >
                Ver composição
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

const ROTULOS_HISTORICO: Record<string, string> = {
  titulo: "Título",
  descricao: "Descrição",
  setor_id: "Setor",
  local: "Local",
  equipamento_id: "Equipamento",
  categoria_id: "Categoria",
  urgencia_id: "Urgência",
  tecnico_id: "Técnico responsável",
  tecnicos_apoio: "Técnicos de apoio",
  data_desejada: "Data prevista",
  recomendacoes: "Observações",
  status_id: "Status",
  iniciada_em: "Início",
  concluida_em: "Conclusão",
  cancelada_motivo: "Motivo do cancelamento",
  diagnostico: "Diagnóstico",
  correcao: "Correção",
  materiais_utilizados: "Materiais utilizados",
  testes_realizados: "Testes realizados",
  resultado_testes: "Resultado dos testes",
};

function HistoricoDetalhes({
  detalhes,
  status,
  urgencias,
  setores,
  equipamentos,
  categorias,
  profiles,
}: {
  detalhes: Record<string, unknown> | null;
  status: Array<{ id: string; nome: string }>;
  urgencias: Array<{ id: string; nome: string }>;
  setores: Array<{ id: string; nome: string }>;
  equipamentos: Array<{ id: string; nome: string }>;
  categorias: Array<{ id: string; nome: string }>;
  profiles: Array<{ id: string; nome: string; nome_completo?: string | null }>;
}) {
  if (!detalhes) return null;
  const listas: Record<string, Array<{ id: string; nome: string }>> = {
    status_id: status,
    urgencia_id: urgencias,
    setor_id: setores,
    equipamento_id: equipamentos,
    categoria_id: categorias,
    tecnico_id: profiles.map((p) => ({ id: p.id, nome: p.nome_completo || p.nome })),
    tecnicos_apoio: profiles.map((p) => ({ id: p.id, nome: p.nome_completo || p.nome })),
  };
  const valor = (campo: string, v: unknown): string => {
    if (v === null || v === undefined || v === "") return "—";
    if (Array.isArray(v))
      return (
        v.map((x) => listas[campo]?.find((i) => i.id === x)?.nome ?? String(x)).join(", ") || "—"
      );
    if (listas[campo]) return listas[campo].find((i) => i.id === v)?.nome ?? String(v);
    if (["data_desejada", "iniciada_em", "concluida_em"].includes(campo))
      return formatDateTime(String(v));
    return String(v);
  };
  const mudancas = Object.entries(detalhes).filter(
    ([, v]) => v && typeof v === "object" && "anterior" in (v as object),
  );
  if (!mudancas.length) return null;
  return (
    <div className="mt-2 space-y-1">
      {mudancas.map(([campo, raw]) => {
        const item = raw as { anterior: unknown; novo: unknown };
        return (
          <div key={campo} className="rounded bg-muted/50 px-2 py-1 text-xs">
            <span className="font-medium">{ROTULOS_HISTORICO[campo] ?? campo}:</span>{" "}
            <span className="line-through text-muted-foreground">
              {valor(campo, item.anterior)}
            </span>{" "}
            → <span>{valor(campo, item.novo)}</span>
          </div>
        );
      })}
    </div>
  );
}

function Info({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="font-medium">{value || "—"}</dd>
    </div>
  );
}

function ExecucaoCard({
  os,
  onConcluir,
  onIniciar,
}: {
  os: {
    diagnostico: string | null;
    correcao: string | null;
    materiais_utilizados: string | null;
    testes_realizados: string | null;
    resultado_testes: string | null;
    iniciada_em: string | null;
    concluida_em: string | null;
  };
  onConcluir: (f: {
    diagnostico: string;
    correcao: string;
    materiais: string;
    testes: string;
    resultado: string;
  }) => Promise<void>;
  onIniciar: () => Promise<void>;
}) {
  const [diagnostico, setDiagnostico] = useState(os.diagnostico ?? "");
  const [correcao, setCorrecao] = useState(os.correcao ?? "");
  const [materiais, setMateriais] = useState(os.materiais_utilizados ?? "");
  const [testes, setTestes] = useState(os.testes_realizados ?? "");
  const [resultado, setResultado] = useState(os.resultado_testes ?? "");
  return (
    <Card>
      <CardContent className="p-4 space-y-3">
        {!os.iniciada_em && (
          <div className="p-3 border rounded-md bg-muted/50 text-sm flex items-center justify-between gap-3 flex-wrap">
            <span>Esta OS ainda não foi iniciada.</span>
            <Button size="sm" onClick={onIniciar}>
              Iniciar atendimento
            </Button>
          </div>
        )}
        <div>
          <Label>Diagnóstico</Label>
          <Textarea rows={3} value={diagnostico} onChange={(e) => setDiagnostico(e.target.value)} />
        </div>
        <div>
          <Label>Correção aplicada</Label>
          <Textarea rows={3} value={correcao} onChange={(e) => setCorrecao(e.target.value)} />
        </div>
        <div>
          <Label>Materiais utilizados</Label>
          <Textarea rows={2} value={materiais} onChange={(e) => setMateriais(e.target.value)} />
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <Label>Testes realizados</Label>
            <Textarea rows={2} value={testes} onChange={(e) => setTestes(e.target.value)} />
          </div>
          <div>
            <Label>Resultado dos testes</Label>
            <Textarea rows={2} value={resultado} onChange={(e) => setResultado(e.target.value)} />
          </div>
        </div>
        <div className="flex justify-end">
          <Button
            onClick={() => onConcluir({ diagnostico, correcao, materiais, testes, resultado })}
            disabled={!!os.concluida_em}
          >
            {os.concluida_em ? "Já concluída" : "Concluir OS"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function ComentariosCard({
  osId,
  coments,
  profiles,
  qc,
}: {
  osId: string;
  coments: Array<{
    id: string;
    mensagem: string;
    created_at: string;
    autor_id: string;
    interno: boolean;
  }>;
  profiles: Array<{ id: string; nome: string }>;
  qc: ReturnType<typeof useQueryClient>;
}) {
  const [msg, setMsg] = useState("");
  const [interno, setInterno] = useState(false);
  async function send() {
    if (!msg.trim()) return;
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) return;
    const { error } = await supabase.from("os_comentarios").insert({
      os_id: osId,
      autor_id: u.user.id,
      mensagem: msg.trim(),
      interno,
    });
    if (error) return showDbError(error);
    setMsg("");
    await qc.invalidateQueries({ queryKey: ["os_coment", osId] });
  }
  return (
    <Card>
      <CardContent className="p-4 space-y-3">
        <div className="space-y-2">
          {coments.length === 0 && (
            <div className="text-sm text-muted-foreground">Nenhum comentário.</div>
          )}
          {coments.map((c) => {
            const p = profiles.find((x) => x.id === c.autor_id);
            return (
              <div key={c.id} className="rounded-md border p-2 text-sm">
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>
                    {p?.nome ?? "Usuário"}
                    {c.interno && " · nota interna"}
                  </span>
                  <span>{formatDateTime(c.created_at)}</span>
                </div>
                <div className="whitespace-pre-wrap mt-1">{c.mensagem}</div>
              </div>
            );
          })}
        </div>
        <Separator />
        <Textarea
          rows={2}
          placeholder="Escreva um comentário…"
          value={msg}
          onChange={(e) => setMsg(e.target.value)}
        />
        <div className="flex items-center justify-between">
          <label className="flex items-center gap-2 text-xs text-muted-foreground">
            <input
              type="checkbox"
              checked={interno}
              onChange={(e) => setInterno(e.target.checked)}
            />
            Nota interna (apenas equipe)
          </label>
          <Button size="sm" onClick={send}>
            Enviar
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
