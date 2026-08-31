import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/integrations/supabase/client";
import { showDbError } from "@/lib/db-error";
import { toast } from "sonner";
import { Trash2, Plus } from "lucide-react";
import { componentesQuery, tiposRespostaQuery, checklistModelosQuery, checklistItensQuery } from "@/lib/checklist-queries";
import { PERIODICIDADES, PERGUNTAS_PADRAO, proximaData, type Checklist, type ChecklistModeloItem } from "@/lib/checklists";

interface ItemForm {
  componente: string;
  componente_id: string | null;
  pergunta: string;
  tipo_resposta: string;
  obrigatorio: boolean;
  exige_foto: boolean;
}

export function ChecklistFormDialog({
  equipamentoId, checklist, open, onOpenChange,
}: {
  equipamentoId: string;
  checklist?: Checklist | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const qc = useQueryClient();
  const { data: componentes = [] } = useQuery(componentesQuery(equipamentoId));
  const { data: tipos = [] } = useQuery(tiposRespostaQuery());
  const { data: modelos = [] } = useQuery(checklistModelosQuery());
  const { data: itensExistentes = [] } = useQuery(checklistItensQuery(checklist?.id ?? ""));

  const [nome, setNome] = useState("");
  const [descricao, setDescricao] = useState("");
  const [periodicidade, setPeriodicidade] = useState("mensal");
  const [intervalo, setIntervalo] = useState("");
  const [proxima, setProxima] = useState("");
  const [itens, setItens] = useState<ItemForm[]>([]);
  const [modeloSel, setModeloSel] = useState("none");
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    if (!open) return;
    setNome(checklist?.nome ?? "");
    setDescricao(checklist?.descricao ?? "");
    setPeriodicidade(checklist?.periodicidade ?? "mensal");
    setIntervalo(checklist?.intervalo_dias ? String(checklist.intervalo_dias) : "");
    setProxima(checklist?.proxima_execucao ?? "");
    setModeloSel("none");
  }, [open, checklist]);

  useEffect(() => {
    if (!open) return;
    if (checklist) {
      setItens(itensExistentes.map((i) => ({
        componente: i.componente, componente_id: i.componente_id, pergunta: i.pergunta,
        tipo_resposta: i.tipo_resposta, obrigatorio: i.obrigatorio, exige_foto: i.exige_foto,
      })));
    } else {
      setItens([]);
    }
  }, [open, checklist, itensExistentes]);

  function addItem(componente = "", componenteId: string | null = null) {
    setItens((prev) => [...prev, {
      componente, componente_id: componenteId, pergunta: "", tipo_resposta: "conformidade",
      obrigatorio: true, exige_foto: false,
    }]);
  }

  function gerarDosComponentes() {
    if (componentes.length === 0) return toast.error("Cadastre componentes do equipamento primeiro.");
    setItens((prev) => [
      ...prev,
      ...componentes.map((c) => ({
        componente: c.nome, componente_id: c.id, pergunta: "Está em boas condições?",
        tipo_resposta: "conformidade", obrigatorio: true, exige_foto: false,
      })),
    ]);
  }

  async function aplicarModelo(id: string) {
    setModeloSel(id);
    if (id === "none") return;
    const { data, error } = await supabase.from("checklist_modelo_itens").select("*").eq("modelo_id", id).order("ordem");
    if (error) return showDbError(error);
    const modelo = modelos.find((m) => m.id === id);
    const mapaComp = new Map(componentes.map((c) => [c.nome.toLowerCase(), c.id]));
    setItens((prev) => [
      ...prev,
      ...((data ?? []) as ChecklistModeloItem[]).map((i) => ({
        componente: i.componente,
        componente_id: mapaComp.get(i.componente.toLowerCase()) ?? null,
        pergunta: i.pergunta,
        tipo_resposta: i.tipo_resposta,
        obrigatorio: i.obrigatorio,
        exige_foto: i.exige_foto,
      })),
    ]);
    if (!nome && modelo) setNome(modelo.nome);
    if (modelo) {
      setPeriodicidade(modelo.periodicidade);
      setIntervalo(modelo.intervalo_dias ? String(modelo.intervalo_dias) : "");
    }
    toast.success("Modelo aplicado. Personalize à vontade.");
  }

  async function salvar() {
    if (!nome.trim()) return toast.error("Informe o nome do checklist.");
    const validos = itens.filter((i) => i.pergunta.trim() && i.componente.trim());
    if (validos.length === 0) return toast.error("Adicione pelo menos um item de verificação.");
    setSalvando(true);
    const intervaloNum = intervalo.trim() ? Number(intervalo) : null;
    const payload = {
      equipamento_id: equipamentoId,
      modelo_id: modeloSel !== "none" ? modeloSel : (checklist?.modelo_id ?? null),
      nome: nome.trim(),
      descricao: descricao.trim() || null,
      periodicidade,
      intervalo_dias: Number.isFinite(intervaloNum as number) ? intervaloNum : null,
      proxima_execucao: proxima || proximaData(periodicidade, intervaloNum),
    };

    let checklistId = checklist?.id ?? "";
    if (checklist) {
      const { error } = await supabase.from("checklists").update(payload).eq("id", checklist.id);
      if (error) { setSalvando(false); return showDbError(error); }
      await supabase.from("checklist_itens").delete().eq("checklist_id", checklist.id);
    } else {
      const { data: u } = await supabase.auth.getUser();
      const { data, error } = await supabase.from("checklists")
        .insert({ ...payload, criado_por: u.user?.id ?? null }).select("id").single();
      if (error || !data) { setSalvando(false); return showDbError(error ?? { message: "Falha ao salvar" }); }
      checklistId = data.id;
    }

    const { error: erroItens } = await supabase.from("checklist_itens").insert(
      validos.map((i, idx) => ({
        checklist_id: checklistId,
        componente_id: i.componente_id,
        componente: i.componente.trim(),
        pergunta: i.pergunta.trim(),
        tipo_resposta: i.tipo_resposta,
        obrigatorio: i.obrigatorio,
        exige_foto: i.exige_foto,
        ordem: idx + 1,
      })),
    );
    setSalvando(false);
    if (erroItens) return showDbError(erroItens);
    await qc.invalidateQueries({ queryKey: ["checklists"] });
    await qc.invalidateQueries({ queryKey: ["checklist_itens", checklistId] });
    onOpenChange(false);
    toast.success(checklist ? "Checklist atualizado." : "Checklist criado.");
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[88vh] overflow-auto">
        <DialogHeader>
          <DialogTitle>{checklist ? "Editar checklist" : "Novo checklist do equipamento"}</DialogTitle>
        </DialogHeader>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Label>Nome do checklist *</Label>
            <Input value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Ex.: Inspeção semanal — Câmara Fria 01" />
          </div>
          <div className="sm:col-span-2">
            <Label>Descrição</Label>
            <Textarea value={descricao} onChange={(e) => setDescricao(e.target.value)} />
          </div>
          <div>
            <Label>Periodicidade</Label>
            <Select value={periodicidade} onValueChange={setPeriodicidade}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {PERIODICIDADES.map((p) => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          {periodicidade === "personalizado" && (
            <div>
              <Label>Intervalo (dias)</Label>
              <Input inputMode="numeric" value={intervalo} onChange={(e) => setIntervalo(e.target.value)} />
            </div>
          )}
          <div>
            <Label>Próxima inspeção</Label>
            <Input type="date" value={proxima} onChange={(e) => setProxima(e.target.value)} />
          </div>
          <div className="sm:col-span-2">
            <Label>Aplicar modelo pronto</Label>
            <Select value={modeloSel} onValueChange={aplicarModelo}>
              <SelectTrigger><SelectValue placeholder="Selecionar modelo" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Sem modelo</SelectItem>
                {modelos.filter((m) => m.ativo).map((m) => <SelectItem key={m.id} value={m.id}>{m.nome}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 pt-2">
          <span className="text-sm font-semibold">Itens de verificação ({itens.length})</span>
          <div className="flex-1" />
          <Button size="sm" variant="outline" onClick={gerarDosComponentes}>Gerar dos componentes</Button>
          <Button size="sm" variant="outline" onClick={() => addItem()}><Plus className="mr-1 size-4" />Item</Button>
        </div>

        <div className="space-y-2">
          {itens.map((it, idx) => (
            <div key={idx} className="grid gap-2 rounded-md border p-2 sm:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)_minmax(0,1fr)_auto]">
              <Select
                value={it.componente_id ?? (it.componente ? `livre:${it.componente}` : "")}
                onValueChange={(v) => setItens((p) => p.map((x, i) => i === idx
                  ? (v.startsWith("livre:")
                    ? { ...x, componente: v.slice(6), componente_id: null }
                    : { ...x, componente_id: v, componente: componentes.find((c) => c.id === v)?.nome ?? x.componente })
                  : x))}
              >
                <SelectTrigger><SelectValue placeholder="Componente" /></SelectTrigger>
                <SelectContent>
                  {componentes.map((c) => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}
                  {it.componente && !it.componente_id && (
                    <SelectItem value={`livre:${it.componente}`}>{it.componente}</SelectItem>
                  )}
                  <SelectItem value="livre:Geral">Geral</SelectItem>
                </SelectContent>
              </Select>

              <div className="flex gap-1">
                <Input
                  placeholder="Pergunta de verificação"
                  value={it.pergunta}
                  onChange={(e) => setItens((p) => p.map((x, i) => (i === idx ? { ...x, pergunta: e.target.value } : x)))}
                />
                <Select value="" onValueChange={(v) => setItens((p) => p.map((x, i) => (i === idx ? { ...x, pergunta: v } : x)))}>
                  <SelectTrigger className="w-9 px-0" aria-label="Perguntas padrão"><span className="mx-auto text-xs">…</span></SelectTrigger>
                  <SelectContent>
                    {PERGUNTAS_PADRAO.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              <Select
                value={it.tipo_resposta}
                onValueChange={(v) => setItens((p) => p.map((x, i) => (i === idx ? { ...x, tipo_resposta: v } : x)))}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {tipos.filter((t) => t.ativo).map((t) => <SelectItem key={t.chave} value={t.chave}>{t.nome}</SelectItem>)}
                </SelectContent>
              </Select>

              <div className="flex items-center gap-2">
                <label className="flex items-center gap-1 text-xs">
                  <Checkbox
                    checked={it.exige_foto}
                    onCheckedChange={(v) => setItens((p) => p.map((x, i) => (i === idx ? { ...x, exige_foto: !!v } : x)))}
                  />
                  Foto
                </label>
                <Button variant="ghost" size="icon" aria-label="Remover item" onClick={() => setItens((p) => p.filter((_, i) => i !== idx))}>
                  <Trash2 className="size-4 text-destructive" />
                </Button>
              </div>
            </div>
          ))}
          {itens.length === 0 && (
            <p className="text-sm text-muted-foreground">
              Nenhum item ainda. Use “Gerar dos componentes” ou aplique um modelo.
            </p>
          )}
        </div>

        <div className="flex justify-end pt-2">
          <Button onClick={salvar} disabled={salvando}>{salvando ? "Salvando…" : "Salvar checklist"}</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
