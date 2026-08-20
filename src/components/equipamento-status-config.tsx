import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { showDbError } from "@/lib/db-error";
import { toast } from "sonner";
import { equipamentoStatusQuery } from "@/lib/equip-queries";
import { STATUS_CATEGORIAS } from "@/lib/equipamentos";

export function EquipamentoStatusConfig({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const qc = useQueryClient();
  const { data: status = [] } = useQuery(equipamentoStatusQuery());
  const [nome, setNome] = useState("");
  const [cor, setCor] = useState("#64748b");
  const [categoria, setCategoria] = useState("operando");

  async function recarregar() {
    await qc.invalidateQueries({ queryKey: ["equipamento_status"] });
  }

  async function criar() {
    if (!nome.trim()) return toast.error("Informe o nome do status.");
    const ordem = (status.at(-1)?.ordem ?? 0) + 1;
    const { error } = await supabase.from("equipamento_status")
      .insert({ nome: nome.trim(), cor, categoria, ordem });
    if (error) return showDbError(error);
    setNome("");
    await recarregar();
    toast.success("Status criado.");
  }

  async function atualizar(id: string, campos: { nome?: string; cor?: string; categoria?: string; ativo?: boolean; ordem?: number }) {
    const { error } = await supabase.from("equipamento_status").update(campos).eq("id", id);
    if (error) return showDbError(error);
    await recarregar();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader><DialogTitle>Status de equipamento</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-[minmax(0,1fr)_110px_170px_auto] items-end gap-2">
            <div><Label className="text-xs">Novo status</Label><Input value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Ex.: Em teste" /></div>
            <div><Label className="text-xs">Cor</Label><Input type="color" value={cor} onChange={(e) => setCor(e.target.value)} /></div>
            <div><Label className="text-xs">Comportamento</Label>
              <Select value={categoria} onValueChange={setCategoria}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{STATUS_CATEGORIAS.map((c) => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <Button onClick={criar}>Adicionar</Button>
          </div>

          <div className="divide-y rounded-md border max-h-[50vh] overflow-auto">
            {status.map((s) => (
              <div key={s.id} className="flex items-center gap-2 p-2">
                <input
                  type="color" value={s.cor} className="size-7 rounded border bg-transparent"
                  onChange={(e) => atualizar(s.id, { cor: e.target.value })}
                />
                <Input
                  defaultValue={s.nome} className="h-8 flex-1"
                  onBlur={(e) => e.target.value.trim() && e.target.value !== s.nome && atualizar(s.id, { nome: e.target.value.trim() })}
                />
                <Select value={s.categoria} onValueChange={(v) => atualizar(s.id, { categoria: v })}>
                  <SelectTrigger className="h-8 w-[160px]"><SelectValue /></SelectTrigger>
                  <SelectContent>{STATUS_CATEGORIAS.map((c) => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}</SelectContent>
                </Select>
                {s.sistema && <Badge variant="outline" className="text-[10px]">padrão</Badge>}
                <Switch checked={s.ativo} onCheckedChange={(v) => atualizar(s.id, { ativo: v })} />
              </div>
            ))}
          </div>
          <p className="text-xs text-muted-foreground">
            Desligue a chave para desativar um status sem perder o histórico dos equipamentos que já o utilizaram.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
