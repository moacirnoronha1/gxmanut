import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { showDbError } from "@/lib/db-error";
import { formatBRL } from "@/lib/db-types";
import { PackageMinus } from "lucide-react";
import {
  custoSaida, disponivel, estoqueConfigQuery, estoqueItensQuery, registrarMovimentacao,
} from "@/lib/estoque";

const num = (v: string) => {
  const n = Number(String(v).replace(",", "."));
  return Number.isFinite(n) ? n : 0;
};

export function UsarPecaOS({ osId, equipamentoId }: { osId: string; equipamentoId?: string | null }) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [itemId, setItemId] = useState("");
  const [qtd, setQtd] = useState("1");
  const [motivo, setMotivo] = useState("");
  const [saving, setSaving] = useState(false);
  const { data: itens = [] } = useQuery(estoqueItensQuery());
  const { data: config } = useQuery(estoqueConfigQuery());

  const disponiveis = useMemo(() => itens.filter((i) => i.ativo && disponivel(i) > 0), [itens]);
  const item = itens.find((i) => i.id === itemId) ?? null;
  const custo = item ? custoSaida(item, config?.metodo_valoracao ?? "ultimo") : 0;

  async function confirmar() {
    if (!item) return toast.error("Selecione a peça.");
    const q = num(qtd);
    if (q <= 0) return toast.error("Informe a quantidade.");
    if (q > disponivel(item)) return toast.error(`Disponível apenas ${disponivel(item)} ${item.unidade}.`);
    setSaving(true);
    const { error } = await registrarMovimentacao({
      item_id: item.id,
      tipo: "saida",
      quantidade: q,
      os_id: osId,
      equipamento_id: equipamentoId ?? null,
      motivo: motivo.trim() || "Uso em ordem de serviço",
    });
    setSaving(false);
    if (error) return showDbError(error);
    setOpen(false);
    setItemId(""); setQtd("1"); setMotivo("");
    await qc.invalidateQueries({ queryKey: ["estoque_itens"] });
    await qc.invalidateQueries({ queryKey: ["estoque_movimentacoes"] });
    await qc.invalidateQueries({ queryKey: ["os_custos"] });
    await qc.invalidateQueries({ queryKey: ["os_custos_det"] });
    toast.success("Peça baixada do estoque e lançada no custo da OS.");
  }

  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
        <PackageMinus className="mr-2 h-4 w-4" />
        Usar peça do estoque
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Usar peça do estoque</DialogTitle></DialogHeader>
          <div className="grid gap-3">
            <div>
              <Label>Peça / material</Label>
              <Select value={itemId} onValueChange={setItemId}>
                <SelectTrigger><SelectValue placeholder="Selecione o item" /></SelectTrigger>
                <SelectContent>
                  {disponiveis.length === 0 && <SelectItem value="none" disabled>Nenhum item disponível</SelectItem>}
                  {disponiveis.map((i) => (
                    <SelectItem key={i.id} value={i.id}>
                      {i.nome} — {disponivel(i)} {i.unidade}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {item && (
              <div className="rounded bg-muted/50 p-2 text-xs">
                Disponível: <b>{disponivel(item)} {item.unidade}</b> · Custo unitário: <b>{formatBRL(custo)}</b>
              </div>
            )}
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Quantidade</Label><Input value={qtd} onChange={(e) => setQtd(e.target.value)} /></div>
              <div className="flex items-end text-sm">
                Total: <b className="ml-1">{formatBRL(custo * num(qtd))}</b>
              </div>
            </div>
            <div><Label>Motivo</Label><Input value={motivo} onChange={(e) => setMotivo(e.target.value)} placeholder="Ex.: troca de rolamento" /></div>
            <div className="flex justify-end">
              <Button onClick={confirmar} disabled={saving}>Confirmar baixa</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
