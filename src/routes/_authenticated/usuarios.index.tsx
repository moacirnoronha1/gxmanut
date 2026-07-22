import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { profilesQuery } from "@/lib/queries";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState } from "react";
import type { AppRole } from "@/lib/db-types";

export const Route = createFileRoute("/_authenticated/usuarios/")({
  head: () => ({ meta: [{ title: "Usuários — Manutenção Xica da Silva" }] }),
  component: Usuarios,
});

function Usuarios() {
  const { data: profiles = [] } = useQuery(profilesQuery());
  const [roles, setRoles] = useState<Record<string, AppRole[]>>({});

  useEffect(() => {
    supabase.from("user_roles").select("user_id, role").then(({ data }) => {
      const map: Record<string, AppRole[]> = {};
      (data ?? []).forEach((r: { user_id: string; role: AppRole }) => {
        map[r.user_id] ??= [];
        map[r.user_id].push(r.role);
      });
      setRoles(map);
    });
  }, [profiles.length]);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Usuários</h1>
        <p className="text-sm text-muted-foreground">{profiles.length} usuários</p>
      </div>
      <Card>
        <CardContent className="p-0 divide-y">
          {profiles.length === 0 && <div className="p-6 text-center text-sm text-muted-foreground">Nenhum usuário.</div>}
          {profiles.map((p) => (
            <div key={p.id} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 p-3">
              <div className="min-w-0">
                <div className="font-medium truncate">{p.nome}</div>
                <div className="text-xs text-muted-foreground truncate">{p.email ?? "—"}</div>
              </div>
              <div className="flex flex-wrap gap-1">
                {(roles[p.id] ?? []).map((r) => <Badge key={r} variant="outline">{r}</Badge>)}
                {!p.ativo && <Badge variant="destructive">inativo</Badge>}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}