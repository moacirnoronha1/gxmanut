import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { setoresQuery, equipamentosQuery, urgenciasQuery, statusOsQuery, categoriasQuery } from "@/lib/queries";
import { supabase } from "@/integrations/supabase/client";
import { RISCO_OPTIONS } from "@/lib/db-types";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";
import { notificarOS } from "@/lib/push.functions";
import { showDbError } from "@/lib/db-error";

export const Route = createFileRoute("/_authenticated/ordens/nova")({
  head: () => ({ meta: [{ title: "Nova OS — Manutenção Xica da Silva" }] }),
  component: NovaOS,
});

function NovaOS() {
  const navigate = useNavigate();
  const notificar = useServerFn(notificarOS);
  const { data: setores = [] } = useQuery(setoresQuery());
  const { data: equipamentos = [] } = useQuery(equipamentosQuery());
  const { data: urgencias = [] } = useQuery(urgenciasQuery());
  const { data: status = [] } = useQuery(statusOsQuery());
  const { data: categorias = [] } = useQuery(categoriasQuery());

  const agora = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  const [titulo, setTitulo] = useState("");
  const [descricao, setDescricao] = useState("");
  const [dataOS, setDataOS] = useState(
    `${agora.getFullYear()}-${pad(agora.getMonth() + 1)}-${pad(agora.getDate())}`,
  );
  const [horaOS, setHoraOS] = useState(`${pad(agora.getHours())}:${pad(agora.getMinutes())}`);
  const [solicitanteNome, setSolicitanteNome] = useState("");
  const [setorId, setSetorId] = useState<string>("");
  const [equipamentoId, setEquipamentoId] = useState<string>("nao");
  const [equipamentoLivre, setEquipamentoLivre] = useState("");
  const [local, setLocal] = useState("");
  const [categoriaId, setCategoriaId] = useState<string>("");
  const [urgenciaId, setUrgenciaId] = useState<string>("");
  const [dataDesejada, setDataDesejada] = useState("");
  const [parado, setParado] = useState(false);
  const [risco, setRisco] = useState("nenhum");
  const [saving, setSaving] = useState(false);


  const equipsFiltrados = setorId
    ? equipamentos.filter((e) => e.setor_id === setorId)
    : equipamentos;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!titulo || !descricao || !urgenciaId) {
      toast.error("Preencha título, descrição e urgência.");
      return;
    }
    setSaving(true);
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) { setSaving(false); return toast.error("Sessão expirada."); }
    const statusAberta = status.find((s) => s.nome.toLowerCase().includes("aberta")) ?? status[0];

    const payload = {
      tipo: "corretiva" as const,
      titulo,
      descricao,
      setor_id: setorId || null,
      equipamento_id: equipamentoId !== "nao" ? equipamentoId : null,
      equipamento_nao_cadastrado: equipamentoId === "nao" ? equipamentoLivre || null : null,
      local: local || null,
      categoria_id: categoriaId || null,
      urgencia_id: urgenciaId,
      status_id: statusAberta?.id ?? null,
      data_desejada: dataDesejada || null,
      equipamento_parado: parado,
      risco,
      data_ocorrencia: new Date(`${dataOS}T${horaOS || "00:00"}`).toISOString(),
      solicitante_nome: solicitanteNome.trim() || null,
      registrado_por: u.user.id,
      solicitante_id: u.user.id,
    };

    const { data, error } = await supabase.from("ordens_servico").insert(payload).select("id").single();
    setSaving(false);
    if (error) return showDbError(error);
    try {
      await notificar({ data: { osId: data.id } });
    } catch {
      toast.warning("OS criada, mas não foi possível enviar as notificações agora.");
    }
    toast.success("OS aberta com sucesso!");
    navigate({ to: "/ordens/$id", params: { id: data.id } });
  }

  return (
    <div className="max-w-3xl mx-auto space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Nova Ordem de Serviço</h1>
        <p className="text-sm text-muted-foreground">Descreva o problema com o máximo de detalhes.</p>
      </div>

      <form onSubmit={submit} className="space-y-4">
        <Card>
          <CardHeader><CardTitle>Identificação</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Título *</Label>
              <Input value={titulo} onChange={(e) => setTitulo(e.target.value)} placeholder="Ex.: Vazamento na câmara fria" />
            </div>
            <div>
              <Label>Descrição do problema *</Label>
              <Textarea rows={4} value={descricao} onChange={(e) => setDescricao(e.target.value)} placeholder="Descreva o problema, quando começou, ruídos, sintomas..." />
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <div>
                <Label>Data da OS *</Label>
                <Input type="date" value={dataOS} onChange={(e) => setDataOS(e.target.value)} />
              </div>
              <div>
                <Label>Hora da OS *</Label>
                <Input type="time" value={horaOS} onChange={(e) => setHoraOS(e.target.value)} />
              </div>
              <div>
                <Label>Solicitante</Label>
                <Input
                  list="solicitantes-anteriores"
                  value={solicitanteNome}
                  onChange={(e) => setSolicitanteNome(e.target.value)}
                  placeholder="Ex.: João – Cozinha"
                />
                <datalist id="solicitantes-anteriores">
                  {solicitantes.map((s) => (
                    <option key={s} value={s} />
                  ))}
                </datalist>
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              A data e a hora acima são a data da ocorrência (pode ser retroativa). O sistema
              registra separadamente quem cadastrou{nomeCompleto ? ` (${nomeCompleto})` : ""} e o
              momento do cadastro.
            </p>

            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <Label>Setor</Label>
                <Select value={setorId} onValueChange={setSetorId}>
                  <SelectTrigger><SelectValue placeholder="Selecionar" /></SelectTrigger>
                  <SelectContent>
                    {setores.map((s) => <SelectItem key={s.id} value={s.id}>{s.nome}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Local (sala, prateleira)</Label>
                <Input value={local} onChange={(e) => setLocal(e.target.value)} />
              </div>
              <div>
                <Label>Equipamento</Label>
                <Select value={equipamentoId} onValueChange={setEquipamentoId}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="nao">Não cadastrado / Descrever</SelectItem>
                    {equipsFiltrados.map((e) => <SelectItem key={e.id} value={e.id}>{e.nome}{e.patrimonio ? ` · ${e.patrimonio}` : ""}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              {equipamentoId === "nao" && (
                <div>
                  <Label>Descreva o equipamento</Label>
                  <Input value={equipamentoLivre} onChange={(e) => setEquipamentoLivre(e.target.value)} />
                </div>
              )}
              <div>
                <Label>Categoria do problema</Label>
                <Select value={categoriaId} onValueChange={setCategoriaId}>
                  <SelectTrigger><SelectValue placeholder="Selecionar" /></SelectTrigger>
                  <SelectContent>
                    {categorias.map((c) => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Urgência *</Label>
                <Select value={urgenciaId} onValueChange={setUrgenciaId}>
                  <SelectTrigger><SelectValue placeholder="Selecionar" /></SelectTrigger>
                  <SelectContent>
                    {urgencias.map((u) => <SelectItem key={u.id} value={u.id}>{u.nome}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Data desejada</Label>
                <Input type="datetime-local" value={dataDesejada} onChange={(e) => setDataDesejada(e.target.value)} />
              </div>
              <div>
                <Label>Risco</Label>
                <Select value={risco} onValueChange={setRisco}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {RISCO_OPTIONS.map((r) => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <label className="flex items-center gap-2 text-sm">
              <Checkbox checked={parado} onCheckedChange={(v) => setParado(Boolean(v))} />
              Equipamento está parado
            </label>
          </CardContent>
        </Card>

        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={() => navigate({ to: "/ordens" })}>Cancelar</Button>
          <Button type="submit" disabled={saving}>{saving ? "Salvando…" : "Abrir OS"}</Button>
        </div>
      </form>
    </div>
  );
}