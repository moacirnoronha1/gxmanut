import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { equipamentosQuery, setoresQuery } from "@/lib/queries";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/equipamentos/")({
  head: () => ({ meta: [{ title: "Equipamentos — Manutenção Xica da Silva" }] }),
  component: Equipamentos,
});

function Equipamentos() {
  const qc = useQueryClient();
  const { data: equipamentos = [] } = useQuery(equipamentosQuery());
  const { data: setores = [] } = useQuery(setoresQuery());
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);

  const [form, setForm] = useState({ nome: "", patrimonio: "", categoria: "", marca: "", modelo: "", setor_id: "none", localizacao: "", observacoes: "" });

  const filtered = equipamentos.filter((e) =>
    !q || e.nome.toLowerCase().includes(q.toLowerCase()) || (e.patrimonio ?? "").toLowerCase().includes(q.toLowerCase())
  );

  async function save() {
    if (!form.nome) return toast.error("Informe o nome.");
    const payload = { ...form, setor_id: form.setor_id === "none" ? null : form.setor_id };
    const { error } = await supabase.from("equipamentos").insert(payload);
    if (error) return toast.error(error.message);
    setOpen(false);
    setForm({ nome: "", patrimonio: "", categoria: "", marca: "", modelo: "", setor_id: "none", localizacao: "", observacoes: "" });
    await qc.invalidateQueries({ queryKey: ["equipamentos"] });
    toast.success("Equipamento cadastrado.");
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Equipamentos</h1>
          <p className="text-sm text-muted-foreground">{equipamentos.length} cadastrados</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button>+ Novo equipamento</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Novo equipamento</DialogTitle></DialogHeader>
            <div className="grid gap-3">
              <div><Label>Nome *</Label><Input value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Patrimônio</Label><Input value={form.patrimonio} onChange={(e) => setForm({ ...form, patrimonio: e.target.value })} /></div>
                <div><Label>Categoria</Label><Input value={form.categoria} onChange={(e) => setForm({ ...form, categoria: e.target.value })} /></div>
                <div><Label>Marca</Label><Input value={form.marca} onChange={(e) => setForm({ ...form, marca: e.target.value })} /></div>
                <div><Label>Modelo</Label><Input value={form.modelo} onChange={(e) => setForm({ ...form, modelo: e.target.value })} /></div>
              </div>
              <div><Label>Setor</Label>
                <Select value={form.setor_id} onValueChange={(v) => setForm({ ...form, setor_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Selecionar" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Sem setor</SelectItem>
                    {setores.map((s) => <SelectItem key={s.id} value={s.id}>{s.nome}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div><Label>Localização</Label><Input value={form.localizacao} onChange={(e) => setForm({ ...form, localizacao: e.target.value })} /></div>
              <div><Label>Observações</Label><Textarea value={form.observacoes} onChange={(e) => setForm({ ...form, observacoes: e.target.value })} /></div>
              <div className="flex justify-end"><Button onClick={save}>Salvar</Button></div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Input placeholder="Buscar equipamento…" value={q} onChange={(e) => setQ(e.target.value)} />

      <Card>
        <CardContent className="p-0 divide-y">
          {filtered.length === 0 && <div className="p-6 text-center text-sm text-muted-foreground">Nenhum equipamento.</div>}
          {filtered.map((e) => {
            const set = setores.find((s) => s.id === e.setor_id);
            return (
              <div key={e.id} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 p-3">
                <div className="min-w-0">
                  <div className="font-medium truncate">{e.nome} {e.patrimonio && <span className="text-xs text-muted-foreground">· {e.patrimonio}</span>}</div>
                  <div className="text-xs text-muted-foreground truncate">
                    {[e.marca, e.modelo, set?.nome, e.localizacao].filter(Boolean).join(" · ") || "—"}
                  </div>
                </div>
                <Badge variant={e.situacao === "ativo" ? "default" : "outline"}>{e.situacao}</Badge>
              </div>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
}