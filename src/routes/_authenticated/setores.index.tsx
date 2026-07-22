import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { setoresQuery } from "@/lib/queries";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { Setor } from "@/lib/db-types";

export const Route = createFileRoute("/_authenticated/setores/")({
  head: () => ({ meta: [{ title: "Setores — Manutenção Xica da Silva" }] }),
  component: Setores,
});

function Setores() {
  const qc = useQueryClient();
  const { data: setores = [] } = useQuery(setoresQuery());
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Setor | null>(null);
  const [nome, setNome] = useState("");
  const [descricao, setDescricao] = useState("");

  function openNew() {
    setEditing(null); setNome(""); setDescricao(""); setOpen(true);
  }
  function openEdit(s: Setor) {
    setEditing(s); setNome(s.nome); setDescricao(s.descricao ?? ""); setOpen(true);
  }

  async function save() {
    if (!nome) return toast.error("Informe o nome.");
    const payload = { nome, descricao: descricao || null };
    const { error } = editing
      ? await supabase.from("setores").update(payload).eq("id", editing.id)
      : await supabase.from("setores").insert(payload);
    if (error) return toast.error(error.message);
    setOpen(false); setEditing(null); setNome(""); setDescricao("");
    await qc.invalidateQueries({ queryKey: ["setores"] });
    toast.success(editing ? "Setor atualizado." : "Setor criado.");
  }

  async function toggleAtivo(s: Setor) {
    const { error } = await supabase.from("setores").update({ ativo: !s.ativo }).eq("id", s.id);
    if (error) return toast.error(error.message);
    await qc.invalidateQueries({ queryKey: ["setores"] });
    toast.success(!s.ativo ? "Setor ativado." : "Setor desativado.");
  }

  async function remove(s: Setor) {
    if (!confirm(`Excluir o setor "${s.nome}"? Esta ação não pode ser desfeita.`)) return;
    const { error } = await supabase.from("setores").delete().eq("id", s.id);
    if (error) return toast.error(error.message);
    await qc.invalidateQueries({ queryKey: ["setores"] });
    toast.success("Setor excluído.");
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Setores</h1>
          <p className="text-sm text-muted-foreground">{setores.length} cadastrados</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button onClick={openNew}>+ Novo setor</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>{editing ? "Editar setor" : "Novo setor"}</DialogTitle></DialogHeader>
            <div className="grid gap-3">
              <div><Label>Nome *</Label><Input value={nome} onChange={(e) => setNome(e.target.value)} /></div>
              <div><Label>Descrição</Label><Textarea value={descricao} onChange={(e) => setDescricao(e.target.value)} /></div>
              <div className="flex justify-end"><Button onClick={save}>Salvar</Button></div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
      <Card>
        <CardContent className="p-0 divide-y">
          {setores.length === 0 && <div className="p-6 text-center text-sm text-muted-foreground">Nenhum setor.</div>}
          {setores.map((s) => (
            <div key={s.id} className="p-3 flex flex-wrap items-center gap-3">
              <div className="flex-1 min-w-[200px]">
                <div className="font-medium flex items-center gap-2">
                  {s.nome}
                  {!s.ativo && <Badge variant="secondary">Inativo</Badge>}
                </div>
                {s.descricao && <div className="text-xs text-muted-foreground">{s.descricao}</div>}
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span>Ativo</span>
                <Switch checked={s.ativo} onCheckedChange={() => toggleAtivo(s)} />
              </div>
              <Button variant="outline" size="sm" onClick={() => openEdit(s)}>Editar</Button>
              <Button variant="ghost" size="sm" onClick={() => remove(s)}>Excluir</Button>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}