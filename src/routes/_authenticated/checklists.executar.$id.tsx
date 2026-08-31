import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { equipamentoQuery, statusOsQuery, urgenciasQuery } from "@/lib/queries";
import { checklistQuery, checklistItensQuery, tiposRespostaQuery } from "@/lib/checklist-queries";
import { GRAVIDADES, resumirRespostas, proximaData, periodicidadeLabel } from "@/lib/checklists";
import { supabase } from "@/integrations/supabase/client";
import { showDbError } from "@/lib/db-error";
import { toast } from "sonner";
import { ArrowLeft } from "lucide-react";

export const Route = createFileRoute("/_authenticated/checklists/executar/$id")({
  head: () => ({
    meta: [
      { title: "Executar checklist — Manutenção Xica da Silva" },
      { name: "description", content: "Execução da ficha de inspeção do equipamento com registro de não conformidades." },
      { property: "og:title", content: "Executar checklist — Manutenção Xica da Silva" },
      { property: "og:description", content: "Inspeção item a item, com fotos, gravidade e abertura de OS." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ExecutarChecklist,
});

interface RespostaState {
  valor: string;
  conforme: boolean | null;
  gravidade: string;
  descricao_problema: string;
  foto_url: string;
  necessita_manutencao: boolean;
  observacao: string;
  abrirOS: boolean;
}

const VAZIA: RespostaState = {
  valor: "", conforme: null, gravidade: "media", descricao_problema: "",
  foto_url: "", necessita_manutencao: false, observacao: "", abrirOS: false,
};

function ExecutarChecklist() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const { data: checklist } = useQuery(checklistQuery(id));
  const { data: itens = [] } = useQuery(checklistItensQuery(id));
  const { data: tipos = [] } = useQuery(tiposRespostaQuery());
  const { data: equipamento } = useQuery(equipamentoQuery(checklist?.equipamento_id ?? ""));
  const { data: statusOs = [] } = useQuery(statusOsQuery());
  const { data: urgencias = [] } = useQuery(urgenciasQuery());

  const [respostas, setRespostas] = useState<Record<string, RespostaState>>({});
  const [observacoes, setObservacoes] = useState("");
  const [salvando, setSalvando] = useState(false);

  const tipoMap = useMemo(() => new Map(tipos.map((t) => [t.chave, t])), [tipos]);
  const get = (itemId: string) => respostas[itemId] ?? VAZIA;
  const set = (itemId: string, patch: Partial<RespostaState>) =>
    setRespostas((prev) => ({ ...prev, [itemId]: { ...(prev[itemId] ?? VAZIA), ...patch } }));

  const preenchidos = itens.filter((i) => {
    const r = respostas[i.id];
    return r && (r.valor.trim() !== "" || r.conforme !== null);
  });
  const parcial = resumirRespostas(preenchidos.map((i) => get(i.id)));

  const grupos = useMemo(() => {
    const map = new Map<string, typeof itens>();
    for (const i of itens) map.set(i.componente, [...(map.get(i.componente) ?? []), i]);
    return [...map.entries()];
  }, [itens]);

  async function finalizar() {
    if (!checklist || !equipamento) return;
    const respondidos = itens.filter((i) => {
      const r = respostas[i.id];
      return r && (r.valor.trim() !== "" || r.conforme !== null);
    });
    const faltando = itens.filter((i) => i.obrigatorio && !respondidos.includes(i));
    if (faltando.length > 0) return toast.error(`Responda os ${faltando.length} itens obrigatórios pendentes.`);

    setSalvando(true);
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) { setSalvando(false); return toast.error("Sessão expirada."); }

    const resumo = resumirRespostas(respondidos.map((i) => get(i.id)));
    const { data: exec, error } = await supabase.from("checklist_execucoes").insert({
      checklist_id: checklist.id,
      equipamento_id: checklist.equipamento_id,
      usuario_id: u.user.id,
      status: "concluida",
      concluida_em: new Date().toISOString(),
      total_itens: resumo.total,
      conformes: resumo.conformes,
      nao_conformes: resumo.naoConformes,
      nao_aplicaveis: resumo.naoAplicaveis,
      percentual_conformidade: Number(resumo.percentual.toFixed(2)),
      observacoes: observacoes.trim() || null,
    }).select("id").single();
    if (error || !exec) { setSalvando(false); return showDbError(error ?? { message: "Falha ao salvar inspeção." }); }

    const statusAberta = statusOs.find((s) => s.nome.toLowerCase().includes("aberta")) ?? statusOs[0];
    const urgenciaPara = (g: string) => {
      const alvo = g === "critica" ? "urg" : g === "alta" ? "alta" : g === "baixa" ? "baixa" : "media";
      return urgencias.find((x) => x.nome.toLowerCase().includes(alvo))?.id ?? urgencias[0]?.id ?? null;
    };

    for (const [idx, item] of respondidos.entries()) {
      const r = get(item.id);
      let osId: string | null = null;
      if (r.conforme === false && r.abrirOS) {
        const { data: os, error: erroOs } = await supabase.from("ordens_servico").insert({
          tipo: "corretiva" as const,
          titulo: `${item.componente} — não conformidade (checklist)`,
          descricao: [
            `Checklist: ${checklist.nome}`,
            `Equipamento: ${equipamento.nome}`,
            `Componente: ${item.componente}`,
            `Verificação: ${item.pergunta}`,
            `Problema: ${r.descricao_problema || "não descrito"}`,
            `Gravidade: ${GRAVIDADES.find((g) => g.value === r.gravidade)?.label ?? r.gravidade}`,
            r.foto_url ? `Foto: ${r.foto_url}` : null,
            r.observacao ? `Observação: ${r.observacao}` : null,
            `Inspeção realizada em ${new Date().toLocaleString("pt-BR")}`,
          ].filter(Boolean).join("\n"),
          setor_id: equipamento.setor_id ?? null,
          equipamento_id: equipamento.id,
          local: equipamento.localizacao ?? null,
          urgencia_id: urgenciaPara(r.gravidade),
          status_id: statusAberta?.id ?? null,
          equipamento_parado: false,
          risco: "nenhum",
          solicitante_id: u.user.id,
        }).select("id").single();
        if (erroOs) showDbError(erroOs);
        osId = os?.id ?? null;
      }

      await supabase.from("checklist_respostas").insert({
        execucao_id: exec.id,
        item_id: item.id,
        componente_id: item.componente_id,
        componente: item.componente,
        pergunta: item.pergunta,
        tipo_resposta: item.tipo_resposta,
        valor: r.valor || null,
        conforme: r.conforme,
        gravidade: r.conforme === false ? r.gravidade : null,
        descricao_problema: r.descricao_problema || null,
        foto_url: r.foto_url || null,
        necessita_manutencao: r.necessita_manutencao,
        observacao: r.observacao || null,
        os_id: osId,
        ordem: idx + 1,
      });
    }

    const hojeISO = new Date().toISOString().slice(0, 10);
    await supabase.from("checklists").update({
      ultima_execucao: hojeISO,
      proxima_execucao: proximaData(checklist.periodicidade, checklist.intervalo_dias) ?? checklist.proxima_execucao,
    }).eq("id", checklist.id);

    await supabase.from("equipamento_historico").insert({
      equipamento_id: equipamento.id,
      usuario_id: u.user.id,
      tipo: "checklist",
      descricao: `${checklist.nome}: ${resumo.percentual.toFixed(1)}% de conformidade · ${resumo.naoConformes} não conformidade(s)`,
    }).then(({ error: e }) => e && console.warn(e.message));

    setSalvando(false);
    toast.success("Inspeção concluída.");
    navigate({ to: "/checklists/resultado/$id", params: { id: exec.id } });
  }

  if (!checklist) return <div className="p-4 text-sm text-muted-foreground">Carregando checklist…</div>;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Button variant="ghost" size="sm" asChild><Link to="/checklists"><ArrowLeft className="mr-1 size-4" />Voltar</Link></Button>
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-xl font-bold">{checklist.nome}</h1>
          <p className="text-sm text-muted-foreground">
            {equipamento?.nome ?? "Equipamento"} · {periodicidadeLabel(checklist.periodicidade)}
          </p>
        </div>
        <Badge variant="outline">{preenchidos.length}/{itens.length} respondidos</Badge>
        <Badge variant={parcial.naoConformes ? "destructive" : "outline"}>{parcial.naoConformes} NC</Badge>
      </div>

      {grupos.map(([componente, lista]) => (
        <Card key={componente}>
          <CardHeader className="py-3"><CardTitle className="text-base">{componente}</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            {lista.map((item) => {
              const tipo = tipoMap.get(item.tipo_resposta);
              const r = get(item.id);
              const formato = tipo?.formato ?? "opcoes";
              return (
                <div key={item.id} className="space-y-2 rounded-md border p-3">
                  <div className="text-sm font-medium">
                    {item.pergunta}{item.obrigatorio && <span className="text-destructive"> *</span>}
                  </div>

                  {formato === "opcoes" && (
                    <div className="flex flex-wrap gap-2">
                      {(tipo?.opcoes ?? []).map((o) => (
                        <Button
                          key={o.valor}
                          type="button"
                          size="sm"
                          variant={r.valor === o.valor ? (o.conforme === false ? "destructive" : "default") : "outline"}
                          onClick={() => set(item.id, { valor: o.valor, conforme: o.conforme })}
                        >
                          {o.label}
                        </Button>
                      ))}
                    </div>
                  )}

                  {(formato === "texto" || formato === "numero" || formato === "temperatura" || formato === "foto") && (
                    <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto]">
                      {formato === "texto"
                        ? <Textarea value={r.valor} onChange={(e) => set(item.id, { valor: e.target.value, conforme: r.conforme ?? true })} />
                        : <Input
                            type={formato === "foto" ? "url" : "text"}
                            inputMode={formato === "foto" ? "url" : "decimal"}
                            placeholder={formato === "temperatura" ? "°C" : formato === "foto" ? "URL da foto" : ""}
                            value={r.valor}
                            onChange={(e) => set(item.id, { valor: e.target.value, conforme: r.conforme ?? true })}
                          />}
                      <Button
                        type="button"
                        size="sm"
                        variant={r.conforme === false ? "destructive" : "outline"}
                        onClick={() => set(item.id, { conforme: r.conforme === false ? true : false })}
                      >
                        {r.conforme === false ? "Não conforme" : "Marcar não conforme"}
                      </Button>
                    </div>
                  )}

                  {item.exige_foto && formato !== "foto" && (
                    <Input placeholder="URL da foto" value={r.foto_url} onChange={(e) => set(item.id, { foto_url: e.target.value })} />
                  )}

                  {r.conforme === false && (
                    <div className="grid gap-2 rounded-md border border-destructive/40 bg-destructive/5 p-3 sm:grid-cols-2">
                      <div className="sm:col-span-2">
                        <Label>Descrição do problema *</Label>
                        <Textarea value={r.descricao_problema} onChange={(e) => set(item.id, { descricao_problema: e.target.value })} />
                      </div>
                      <div>
                        <Label>Nível de gravidade</Label>
                        <Select value={r.gravidade} onValueChange={(v) => set(item.id, { gravidade: v })}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>{GRAVIDADES.map((g) => <SelectItem key={g.value} value={g.value}>{g.label}</SelectItem>)}</SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label>Foto (URL)</Label>
                        <Input value={r.foto_url} onChange={(e) => set(item.id, { foto_url: e.target.value })} />
                      </div>
                      <div className="sm:col-span-2">
                        <Label>Observação</Label>
                        <Input value={r.observacao} onChange={(e) => set(item.id, { observacao: e.target.value })} />
                      </div>
                      <label className="flex items-center gap-2 text-sm">
                        <Checkbox checked={r.necessita_manutencao} onCheckedChange={(v) => set(item.id, { necessita_manutencao: !!v })} />
                        Necessita manutenção
                      </label>
                      <label className="flex items-center gap-2 text-sm font-medium">
                        <Checkbox checked={r.abrirOS} onCheckedChange={(v) => set(item.id, { abrirOS: !!v })} />
                        Deseja abrir uma Ordem de Serviço para esta não conformidade?
                      </label>
                    </div>
                  )}
                </div>
              );
            })}
          </CardContent>
        </Card>
      ))}

      {itens.length === 0 && (
        <Card><CardContent className="p-6 text-sm text-muted-foreground">Este checklist ainda não possui itens de verificação.</CardContent></Card>
      )}

      <Card>
        <CardHeader className="py-3"><CardTitle className="text-base">Observações gerais da inspeção</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <Textarea value={observacoes} onChange={(e) => setObservacoes(e.target.value)} />
          <div className="flex justify-end">
            <Button onClick={finalizar} disabled={salvando || itens.length === 0}>
              {salvando ? "Finalizando…" : "Finalizar inspeção"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
