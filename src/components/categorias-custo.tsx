import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { showDbError } from "@/lib/db-error";
import { toast } from "sonner";
import { GRUPO_LABEL, GRUPO_OPTIONS, type CustoCategoria, type CustoGrupo } from "@/lib/custos";
import { Trash2 } from "lucide-react";

export function CategoriasCustoCard({ categorias }: { categorias: CustoCategoria[] }) {
  const qc = useQueryClient();
  const [nome, setNome] = useState("");
  const [grupo, setGrupo] = useState<CustoGrupo>("material");
  const [saving, setSaving] = useState(false);

  async function criar() {
    if (!nome.trim()) return toast.error("Informe o nome da categoria.");
    setSaving(true);
    const { error } = await supabase.from("custo_categorias").insert({
      nome: nome.trim(),
      grupo,
      natureza_padrao: grupo === "mao_obra_interna" ? "interno" : "desembolso",
    });
    setSaving(false);
    if (error) return showDbError(error);
    setNome("");
    await qc.invalidateQueries({ queryKey: ["custo_categorias"] });
    toast.success("Categoria de custo criada.");
  }

  async function alternar(c: CustoCategoria) {
    const { error } = await supabase.from("custo_categorias").update({ ativo: !c.ativo }).eq("id", c.id);
    if (error) return showDbError(error);
    await qc.invalidateQueries({ queryKey: ["custo_categorias"] });
  }

  async function remover(c: CustoCategoria) {
    const { error } = await supabase.from("custo_categorias").delete().eq("id", c.id);
    if (error) return showDbError(error);
    await qc.invalidateQueries({ queryKey: ["custo_categorias"] });
    toast.success("Categoria removida.");
  }

  return (
    <Card className="md:col-span-2">
      <CardHeader><CardTitle>Categorias de custo</CardTitle></CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-2 sm:grid-cols-[2fr_1.5fr_auto] items-end">
          <div><Label>Nova categoria</Label><Input value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Ex.: Material de refrigeração" /></div>
          <div>
            <Label>Grupo</Label>
            <Select value={grupo} onValueChange={(v) => setGrupo(v as CustoGrupo)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{GRUPO_OPTIONS.map((g) => <SelectItem key={g.value} value={g.value}>{g.label}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <Button onClick={criar} disabled={saving}>Adicionar</Button>
        </div>
        <div className="divide-y">
          {categorias.map((c) => (
            <div key={c.id} className="flex items-center gap-3 py-2 text-sm">
              <div className="min-w-0 flex-1 truncate">{c.nome}</div>
              <Badge variant="secondary">{GRUPO_LABEL[c.grupo]}</Badge>
              <Switch checked={c.ativo} onCheckedChange={() => alternar(c)} />
              {!c.sistema && (
                <Button size="icon" variant="ghost" onClick={() => remover(c)}><Trash2 className="size-4" /></Button>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
