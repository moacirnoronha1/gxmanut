import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { fornecedoresQuery } from "@/lib/queries";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { showDbError } from "@/lib/db-error";

export const Route = createFileRoute("/_authenticated/fornecedores/")({
  head: () => ({ meta: [{ title: "Fornecedores — Manutenção Xica da Silva" }] }),
  component: Fornecedores,
});

function Fornecedores() {
  const qc = useQueryClient();
  const { data: fornecedores = [] } = useQuery(fornecedoresQuery());
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ nome: "", documento: "", telefone: "", email: "", especialidade: "", contato: "" });

  async function save() {
    if (!form.nome) return toast.error("Informe o nome.");
    const { error } = await supabase.from("fornecedores").insert(form);
    if (error) return showDbError(error);
    setOpen(false);
    setForm({ nome: "", documento: "", telefone: "", email: "", especialidade: "", contato: "" });
    await qc.invalidateQueries({ queryKey: ["fornecedores"] });
    toast.success("Fornecedor criado.");
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Fornecedores</h1>
          <p className="text-sm text-muted-foreground">{fornecedores.length} cadastrados</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button>+ Novo fornecedor</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Novo fornecedor</DialogTitle></DialogHeader>
            <div className="grid gap-3">
              <div><Label>Nome *</Label><Input value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>CNPJ/CPF</Label><Input value={form.documento} onChange={(e) => setForm({ ...form, documento: e.target.value })} /></div>
                <div><Label>Telefone</Label><Input value={form.telefone} onChange={(e) => setForm({ ...form, telefone: e.target.value })} /></div>
                <div><Label>E-mail</Label><Input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
                <div><Label>Especialidade</Label><Input value={form.especialidade} onChange={(e) => setForm({ ...form, especialidade: e.target.value })} /></div>
              </div>
              <div><Label>Contato</Label><Input value={form.contato} onChange={(e) => setForm({ ...form, contato: e.target.value })} /></div>
              <div className="flex justify-end"><Button onClick={save}>Salvar</Button></div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
      <Card>
        <CardContent className="p-0 divide-y">
          {fornecedores.length === 0 && <div className="p-6 text-center text-sm text-muted-foreground">Nenhum fornecedor.</div>}
          {fornecedores.map((f) => (
            <div key={f.id} className="p-3">
              <div className="font-medium">{f.nome}</div>
              <div className="text-xs text-muted-foreground">{[f.especialidade, f.telefone, f.email].filter(Boolean).join(" · ") || "—"}</div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}