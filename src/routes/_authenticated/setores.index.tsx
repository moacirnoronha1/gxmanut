import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { setoresQuery } from "@/lib/queries";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/setores/")({
  head: () => ({ meta: [{ title: "Setores — Manutenção Xica da Silva" }] }),
  component: Setores,
});

function Setores() {
  const qc = useQueryClient();
  const { data: setores = [] } = useQuery(setoresQuery());
  const [open, setOpen] = useState(false);
  const [nome, setNome] = useState("");
  const [descricao, setDescricao] = useState("");

  async function save() {
    if (!nome) return toast.error("Informe o nome.");
    const { error } = await supabase.from("setores").insert({ nome, descricao: descricao || null });
    if (error) return toast.error(error.message);
    setOpen(false); setNome(""); setDescricao("");
    await qc.invalidateQueries({ queryKey: ["setores"] });
    toast.success("Setor criado.");
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Setores</h1>
          <p className="text-sm text-muted-foreground">{setores.length} cadastrados</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button>+ Novo setor</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Novo setor</DialogTitle></DialogHeader>
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
            <div key={s.id} className="p-3">
              <div className="font-medium">{s.nome}</div>
              {s.descricao && <div className="text-xs text-muted-foreground">{s.descricao}</div>}
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}