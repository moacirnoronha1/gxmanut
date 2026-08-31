import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { showDbError } from "@/lib/db-error";
import { toast } from "sonner";
import { ChevronDown, ChevronUp, Trash2, Plus } from "lucide-react";
import { componentesQuery } from "@/lib/checklist-queries";
import { COMPONENTES_SUGERIDOS } from "@/lib/checklists";

export function ComponentesEquipamento({ equipamentoId }: { equipamentoId: string }) {
  const qc = useQueryClient();
  const { data: componentes = [] } = useQuery(componentesQuery(equipamentoId));
  const [nome, setNome] = useState("");
  const [descricao, setDescricao] = useState("");
  const [modelo, setModelo] = useState("none");

  const invalidar = () => qc.invalidateQueries({ queryKey: ["equipamento_componentes", equipamentoId] });

  async function adicionar() {
    if (!nome.trim()) return toast.error("Informe o nome do componente.");
    const { error } = await supabase.from("equipamento_componentes").insert({
      equipamento_id: equipamentoId,
      nome: nome.trim(),
      descricao: descricao.trim() || null,
      ordem: componentes.length + 1,
    });
    if (error) return showDbError(error);
    setNome("");
    setDescricao("");
    await invalidar();
    toast.success("Componente adicionado.");
  }

  async function importarSugeridos() {
    if (modelo === "none") return toast.error("Escolha um modelo de equipamento.");
    const existentes = new Set(componentes.map((c) => c.nome.toLowerCase()));
    const novos = (COMPONENTES_SUGERIDOS[modelo] ?? [])
      .filter((n) => !existentes.has(n.toLowerCase()))
      .map((n, i) => ({ equipamento_id: equipamentoId, nome: n, ordem: componentes.length + i + 1 }));
    if (novos.length === 0) return toast.info("Todos os componentes sugeridos já existem.");
    const { error } = await supabase.from("equipamento_componentes").insert(novos);
    if (error) return showDbError(error);
    await invalidar();
    toast.success(`${novos.length} componentes importados.`);
  }

  async function renomear(id: string, valor: string) {
    const { error } = await supabase.from("equipamento_componentes").update({ nome: valor }).eq("id", id);
    if (error) return showDbError(error);
    await invalidar();
  }

  async function mover(id: string, delta: number) {
    const idx = componentes.findIndex((c) => c.id === id);
    const alvo = componentes[idx + delta];
    const atual = componentes[idx];
    if (!alvo || !atual) return;
    await supabase.from("equipamento_componentes").update({ ordem: alvo.ordem }).eq("id", atual.id);
    await supabase.from("equipamento_componentes").update({ ordem: atual.ordem }).eq("id", alvo.id);
    await invalidar();
  }

  async function excluir(id: string) {
    const { error } = await supabase.from("equipamento_componentes").delete().eq("id", id);
    if (error) return showDbError(error);
    await invalidar();
    toast.success("Componente excluído.");
  }

  return (
    <Card>
      <CardHeader className="py-3">
        <CardTitle className="text-base">Componentes e periféricos</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]">
          <Input placeholder="Nome do componente (ex.: Borracha da porta)" value={nome} onChange={(e) => setNome(e.target.value)} />
          <Input placeholder="Descrição (opcional)" value={descricao} onChange={(e) => setDescricao(e.target.value)} />
          <Button onClick={adicionar}><Plus className="mr-1 size-4" />Adicionar</Button>
        </div>

        <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto]">
          <Select value={modelo} onValueChange={setModelo}>
            <SelectTrigger><SelectValue placeholder="Importar componentes sugeridos" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Importar componentes sugeridos…</SelectItem>
              {Object.keys(COMPONENTES_SUGERIDOS).map((k) => <SelectItem key={k} value={k}>{k}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={importarSugeridos}>Importar</Button>
        </div>

        <div className="divide-y rounded-md border">
          {componentes.length === 0 && (
            <div className="p-3 text-sm text-muted-foreground">Nenhum componente cadastrado para este equipamento.</div>
          )}
          {componentes.map((c, i) => (
            <div key={c.id} className="flex items-center gap-2 p-2">
              <span className="w-6 text-center text-xs text-muted-foreground">{i + 1}</span>
              <Input
                defaultValue={c.nome}
                className="h-8"
                onBlur={(e) => e.target.value.trim() && e.target.value !== c.nome && renomear(c.id, e.target.value.trim())}
              />
              <Button variant="ghost" size="icon" aria-label="Subir" onClick={() => mover(c.id, -1)}><ChevronUp className="size-4" /></Button>
              <Button variant="ghost" size="icon" aria-label="Descer" onClick={() => mover(c.id, 1)}><ChevronDown className="size-4" /></Button>
              <Button variant="ghost" size="icon" aria-label="Excluir" onClick={() => excluir(c.id)}><Trash2 className="size-4 text-destructive" /></Button>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
