import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { UserPlus, HardHat, Trash2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { assumirOS } from "@/lib/push.functions";
import { equipeOSQuery } from "@/lib/equipe-os";
import { profilesQuery } from "@/lib/queries";
import { useSessaoUsuario } from "@/lib/sessao";
import { formatDateTime } from "@/lib/db-types";
import { showDbError } from "@/lib/db-error";

export function EquipeOSCard({
  osId,
  assumidaPor,
  assumidaEm,
}: {
  osId: string;
  assumidaPor: string | null;
  assumidaEm: string | null;
}) {
  const qc = useQueryClient();
  const assumir = useServerFn(assumirOS);
  const { data: equipe = [] } = useQuery(equipeOSQuery(osId));
  const { data: profiles = [] } = useQuery(profilesQuery());
  const { perfil, roles, mestre } = useSessaoUsuario();
  const [novo, setNovo] = useState("");
  const [carregando, setCarregando] = useState(false);

  const souTecnico = roles.includes("tecnico");
  const podeGerenciar = mestre || roles.includes("admin") || roles.includes("gestor");
  const nome = (id: string | null) => {
    const p = profiles.find((x) => x.id === id);
    return p?.nome_completo || p?.nome || "Usuário";
  };
  const principal = equipe.find((e) => e.papel === "principal");
  const apoio = equipe.filter((e) => e.papel === "apoio");

  async function handleAssumir() {
    setCarregando(true);
    try {
      const r = (await assumir({ data: { osId } })) as { jaAssumida?: boolean };
      await qc.invalidateQueries();
      if (r?.jaAssumida) toast.info("Esta OS já foi assumida por outro técnico.");
      else toast.success("Você assumiu esta OS.");
    } finally {
      setCarregando(false);
    }
  }

  async function adicionarApoio() {
    if (!novo) return;
    const { error } = await supabase.from("os_tecnicos").insert({
      os_id: osId,
      tecnico_id: novo,
      papel: "apoio",
      adicionado_por: perfil?.id ?? null,
    } as never);
    if (error) return showDbError(error);
    setNovo("");
    await qc.invalidateQueries({ queryKey: ["os_tecnicos", osId] });
    toast.success("Técnico de apoio adicionado.");
  }

  async function remover(id: string) {
    const { error } = await supabase.from("os_tecnicos").delete().eq("id", id);
    if (error) return showDbError(error);
    await qc.invalidateQueries({ queryKey: ["os_tecnicos", osId] });
    toast.success("Técnico removido.");
  }

  const disponiveis = profiles.filter((p) => !equipe.some((e) => e.tecnico_id === p.id));

  return (
    <Card>
      <CardHeader><CardTitle className="flex items-center gap-2"><HardHat className="size-4" /> Equipe da OS</CardTitle></CardHeader>
      <CardContent className="space-y-3 text-sm">
        {assumidaPor ? (
          <div className="rounded-md border bg-muted/40 p-2">
            <div className="font-medium">OS assumida por: {nome(assumidaPor)}</div>
            <div className="text-xs text-muted-foreground">Em {formatDateTime(assumidaEm)}</div>
          </div>
        ) : (
          <div className="rounded-md border border-dashed p-2 text-muted-foreground">
            OS ainda não assumida — disponível para todos os técnicos.
          </div>
        )}

        {!assumidaPor && (souTecnico || podeGerenciar) && (
          <Button className="w-full" onClick={handleAssumir} disabled={carregando}>
            ASSUMIR OS
          </Button>
        )}

        <div className="space-y-1">
          <div className="text-xs text-muted-foreground">Técnico principal</div>
          <div className="flex items-center justify-between gap-2">
            <span className="font-medium">{principal ? nome(principal.tecnico_id) : assumidaPor ? nome(assumidaPor) : "—"}</span>
            {principal && <Badge variant="secondary">Principal</Badge>}
          </div>
        </div>

        <div className="space-y-1">
          <div className="text-xs text-muted-foreground">Técnicos de apoio</div>
          {apoio.length === 0 && <div className="text-muted-foreground">Nenhum técnico de apoio.</div>}
          {apoio.map((a) => (
            <div key={a.id} className="flex items-center justify-between gap-2">
              <span>{nome(a.tecnico_id)}</span>
              {podeGerenciar && (
                <Button variant="ghost" size="icon" aria-label="Remover" onClick={() => remover(a.id)}>
                  <Trash2 className="size-4" />
                </Button>
              )}
            </div>
          ))}
        </div>

        {podeGerenciar && (
          <div className="flex gap-2">
            <Select value={novo} onValueChange={setNovo}>
              <SelectTrigger><SelectValue placeholder="Adicionar técnico de apoio" /></SelectTrigger>
              <SelectContent>
                {disponiveis.map((p) => (
                  <SelectItem key={p.id} value={p.id}>{p.nome_completo || p.nome}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button variant="outline" size="icon" onClick={adicionarApoio} aria-label="Adicionar">
              <UserPlus className="size-4" />
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
