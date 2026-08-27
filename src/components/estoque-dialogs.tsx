import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/integrations/supabase/client";
import { showDbError } from "@/lib/db-error";
import { toast } from "sonner";
import { formatBRL } from "@/lib/db-types";
import { fornecedoresQuery, equipamentosQuery, ordensQuery } from "@/lib/queries";
import {
  MOV_LABEL, UNIDADES_ESTOQUE, custoSaida, disponivel, estoqueCategoriasQuery, estoqueConfigQuery,
  itemEquipamentosQuery, registrarMovimentacao,
  type EstoqueItem, type MovTipo,
} from "@/lib/estoque";

const num = (v: string) => {
  const n = Number(String(v).replace(",", "."));
  return Number.isFinite(n) ? n : 0;
};
const nn = (v: string) => (v.trim() === "" ? null : v.trim());

const vazio = {
  nome: "", codigo: "", categoria_id: "", unidade: "un", estoque_minimo: "0",
  localizacao: "", custo_unitario: "0", fornecedor_id: "", foto_url: "", observacoes: "",
  ativo: true, quantidade: "0",
};

export function ItemFormDialog({
  open, onOpenChange, item,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  item?: EstoqueItem | null;
}) {
  const qc = useQueryClient();
  const { data: categorias = [] } = useQuery(estoqueCategoriasQuery());
  const { data: fornecedores = [] } = useQuery(fornecedoresQuery());
  const { data: equipamentos = [] } = useQuery(equipamentosQuery());
  const { data: compat = [] } = useQuery({ ...itemEquipamentosQuery(item?.id ?? ""), enabled: !!item?.id });
  const [f, setF] = useState({ ...vazio });
  const [eqs, setEqs] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    if (item) {
      setF({
        nome: item.nome, codigo: item.codigo ?? "", categoria_id: item.categoria_id ?? "",
        unidade: item.unidade, estoque_minimo: String(item.estoque_minimo),
        localizacao: item.localizacao ?? "", custo_unitario: String(item.custo_unitario),
        fornecedor_id: item.fornecedor_id ?? "", foto_url: item.foto_url ?? "",
        observacoes: item.observacoes ?? "", ativo: item.ativo, quantidade: String(item.quantidade),
      });
    } else {
      setF({ ...vazio });
      setEqs([]);
    }
  }, [open, item]);

  useEffect(() => { if (item) setEqs(compat); }, [compat, item]);

  async function salvar() {
    if (!f.nome.trim()) return toast.error("Informe o nome do item.");
    setSaving(true);
    const base = {
      nome: f.nome.trim(), codigo: nn(f.codigo), categoria_id: nn(f.categoria_id),
      unidade: f.unidade, estoque_minimo: num(f.estoque_minimo), localizacao: nn(f.localizacao),
      custo_unitario: num(f.custo_unitario), fornecedor_id: nn(f.fornecedor_id),
      foto_url: nn(f.foto_url), observacoes: nn(f.observacoes), ativo: f.ativo,
    };
    let id = item?.id;
    if (item) {
      const { error } = await supabase.from("estoque_itens").update(base as never).eq("id", item.id);
      if (error) { setSaving(false); return showDbError(error); }
    } else {
      const res = await supabase
        .from("estoque_itens")
        .insert({ ...base, quantidade: num(f.quantidade) } as never)
        .select("id").maybeSingle();
      if (res.error) { setSaving(false); return showDbError(res.error); }
      id = (res.data as { id: string } | null)?.id;
    }

    if (id) {
      await supabase.from("estoque_item_equipamentos").delete().eq("item_id", id);
      if (eqs.length) {
        await supabase
          .from("estoque_item_equipamentos")
          .insert(eqs.map((e) => ({ item_id: id, equipamento_id: e })) as never);
      }
    }
    setSaving(false);
    onOpenChange(false);
    await qc.invalidateQueries({ queryKey: ["estoque_itens"] });
    await qc.invalidateQueries({ queryKey: ["estoque_item"] });
    await qc.invalidateQueries({ queryKey: ["estoque_item_equipamentos"] });
    toast.success(item ? "Item atualizado." : "Item cadastrado.");
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader><DialogTitle>{item ? "Editar item" : "Novo item de estoque"}</DialogTitle></DialogHeader>
        <div className="grid gap-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="sm:col-span-2"><Label>Nome *</Label><Input value={f.nome} onChange={(e) => setF({ ...f, nome: e.target.value })} /></div>
            <div><Label>Código interno</Label><Input value={f.codigo} onChange={(e) => setF({ ...f, codigo: e.target.value })} /></div>
            <div>
              <Label>Categoria</Label>
              <Select value={f.categoria_id} onValueChange={(v) => setF({ ...f, categoria_id: v })}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>{categorias.filter((c) => c.ativo).map((c) => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>Unidade</Label>
              <Select value={f.unidade} onValueChange={(v) => setF({ ...f, unidade: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{UNIDADES_ESTOQUE.map((u) => <SelectItem key={u} value={u}>{u}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            {!item && (
              <div><Label>Quantidade inicial</Label><Input value={f.quantidade} onChange={(e) => setF({ ...f, quantidade: e.target.value })} /></div>
            )}
            <div><Label>Estoque mínimo</Label><Input value={f.estoque_minimo} onChange={(e) => setF({ ...f, estoque_minimo: e.target.value })} /></div>
            <div><Label>Custo unitário (R$)</Label><Input value={f.custo_unitario} onChange={(e) => setF({ ...f, custo_unitario: e.target.value })} /></div>
            <div><Label>Localização</Label><Input value={f.localizacao} onChange={(e) => setF({ ...f, localizacao: e.target.value })} placeholder="Prateleira A3" /></div>
            <div>
              <Label>Fornecedor</Label>
              <Select value={f.fornecedor_id} onValueChange={(v) => setF({ ...f, fornecedor_id: v })}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>{fornecedores.map((x) => <SelectItem key={x.id} value={x.id}>{x.nome}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="sm:col-span-2"><Label>Foto (URL)</Label><Input value={f.foto_url} onChange={(e) => setF({ ...f, foto_url: e.target.value })} placeholder="https://..." /></div>
          </div>

          <div>
            <Label>Equipamentos compatíveis</Label>
            <div className="mt-1 max-h-40 overflow-y-auto rounded border p-2">
              {equipamentos.length === 0 && <div className="text-xs text-muted-foreground">Nenhum equipamento cadastrado.</div>}
              {equipamentos.map((e) => (
                <label key={e.id} className="flex items-center gap-2 py-1 text-sm">
                  <Checkbox
                    checked={eqs.includes(e.id)}
                    onCheckedChange={(v) => setEqs(v ? [...eqs, e.id] : eqs.filter((x) => x !== e.id))}
                  />
                  <span className="truncate">{e.nome}</span>
                </label>
              ))}
            </div>
          </div>

          <div><Label>Observações</Label><Textarea value={f.observacoes} onChange={(e) => setF({ ...f, observacoes: e.target.value })} /></div>
          <div className="flex items-center gap-2"><Switch checked={f.ativo} onCheckedChange={(v) => setF({ ...f, ativo: v })} /><span className="text-sm">Item ativo</span></div>
          <div className="flex justify-end"><Button onClick={salvar} disabled={saving}>Salvar</Button></div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function MovimentarDialog({
  open, onOpenChange, item, tipoInicial = "entrada",
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  item: EstoqueItem | null;
  tipoInicial?: MovTipo;
}) {
  const qc = useQueryClient();
  const { data: fornecedores = [] } = useQuery(fornecedoresQuery());
  const { data: ordens = [] } = useQuery(ordensQuery());
  const { data: equipamentos = [] } = useQuery(equipamentosQuery());
  const { data: config } = useQuery(estoqueConfigQuery());
  const [tipo, setTipo] = useState<MovTipo>(tipoInicial);
  const [qtd, setQtd] = useState("1");
  const [valor, setValor] = useState("");
  const [motivo, setMotivo] = useState("");
  const [osId, setOsId] = useState("");
  const [eqId, setEqId] = useState("");
  const [fornId, setFornId] = useState("");
  const [nota, setNota] = useState("");
  const [comprovante, setComprovante] = useState("");
  const [obs, setObs] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open || !item) return;
    setTipo(tipoInicial);
    setQtd(tipoInicial === "ajuste" ? String(item.quantidade) : "1");
    setValor(tipoInicial === "entrada" ? String(item.ultimo_custo ?? item.custo_unitario ?? "") : "");
    setMotivo(""); setOsId(""); setEqId(""); setFornId(item.fornecedor_id ?? "");
    setNota(""); setComprovante(""); setObs("");
  }, [open, item, tipoInicial]);

  if (!item) return null;
  const q = num(qtd);
  const custoRef = custoSaida(item, config?.metodo_valoracao ?? "ultimo");

  async function salvar() {
    if (!item) return;
    if (q <= 0 && tipo !== "ajuste") return toast.error("Informe uma quantidade válida.");
    setSaving(true);
    const { error } = await registrarMovimentacao({
      item_id: item.id,
      tipo,
      quantidade: q,
      motivo: nn(motivo),
      os_id: nn(osId),
      equipamento_id: nn(eqId) ?? (osId ? ordens.find((o) => o.id === osId)?.equipamento_id ?? null : null),
      fornecedor_id: nn(fornId),
      valor_unitario: valor.trim() === "" ? null : num(valor),
      nota_numero: nn(nota),
      comprovante_url: nn(comprovante),
      observacao: nn(obs),
    });
    setSaving(false);
    if (error) return showDbError(error);
    onOpenChange(false);
    await qc.invalidateQueries({ queryKey: ["estoque_itens"] });
    await qc.invalidateQueries({ queryKey: ["estoque_item"] });
    await qc.invalidateQueries({ queryKey: ["estoque_movimentacoes"] });
    await qc.invalidateQueries({ queryKey: ["os_custos"] });
    toast.success(`${MOV_LABEL[tipo]} registrada.`);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Movimentar — {item.nome}</DialogTitle></DialogHeader>
        <div className="grid gap-3">
          <div className="rounded bg-muted/50 p-2 text-xs">
            Saldo atual: <b>{item.quantidade} {item.unidade}</b> · Reservado: <b>{item.quantidade_reservada}</b> ·
            Disponível: <b>{disponivel(item)}</b> · Custo de saída: <b>{formatBRL(custoRef)}</b>
          </div>
          <div>
            <Label>Tipo de movimentação</Label>
            <Select value={tipo} onValueChange={(v) => setTipo(v as MovTipo)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {(Object.keys(MOV_LABEL) as MovTipo[]).map((t) => <SelectItem key={t} value={t}>{MOV_LABEL[t]}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>{tipo === "ajuste" ? "Novo saldo" : "Quantidade"}</Label>
              <Input value={qtd} onChange={(e) => setQtd(e.target.value)} />
            </div>
            <div>
              <Label>Valor unitário (R$)</Label>
              <Input value={valor} onChange={(e) => setValor(e.target.value)} placeholder={String(custoRef)} />
            </div>
          </div>
          {(tipo === "saida" || tipo === "reserva" || tipo === "cancelamento_reserva" || tipo === "devolucao") && (
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <Label>Ordem de Serviço</Label>
                <Select value={osId} onValueChange={setOsId}>
                  <SelectTrigger><SelectValue placeholder="Nenhuma" /></SelectTrigger>
                  <SelectContent>{ordens.slice(0, 100).map((o) => <SelectItem key={o.id} value={o.id}>#{o.numero} — {o.titulo}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label>Equipamento</Label>
                <Select value={eqId} onValueChange={setEqId}>
                  <SelectTrigger><SelectValue placeholder="Automático pela OS" /></SelectTrigger>
                  <SelectContent>{equipamentos.map((e) => <SelectItem key={e.id} value={e.id}>{e.nome}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
          )}
          {tipo === "entrada" && (
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <Label>Fornecedor</Label>
                <Select value={fornId} onValueChange={setFornId}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>{fornecedores.map((x) => <SelectItem key={x.id} value={x.id}>{x.nome}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Nota / cupom</Label><Input value={nota} onChange={(e) => setNota(e.target.value)} /></div>
              <div className="sm:col-span-2"><Label>Comprovante (URL)</Label><Input value={comprovante} onChange={(e) => setComprovante(e.target.value)} /></div>
            </div>
          )}
          <div><Label>Motivo</Label><Input value={motivo} onChange={(e) => setMotivo(e.target.value)} placeholder="Ex.: troca de rolamento" /></div>
          <div><Label>Observação</Label><Textarea value={obs} onChange={(e) => setObs(e.target.value)} /></div>
          {q > 0 && <div className="text-sm">Valor total: <b>{formatBRL((valor.trim() === "" ? custoRef : num(valor)) * q)}</b></div>}
          <div className="flex justify-end"><Button onClick={salvar} disabled={saving}>Confirmar</Button></div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
