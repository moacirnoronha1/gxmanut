import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { useSessaoUsuario } from "@/lib/sessao";
import {
  CAMPOS_EDICAO_OS,
  PERFIS_EDICAO_OS,
  type CampoEdicaoOS,
  type PerfilEdicaoOS,
} from "@/lib/os-edicao";
import { showDbError } from "@/lib/db-error";

export function PermissoesEdicaoOS() {
  const qc = useQueryClient();
  const { mestre } = useSessaoUsuario();
  const { data: permissoes = [] } = useQuery({
    queryKey: ["os_edicao_permissoes"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("os_edicao_permissoes" as never)
        .select("role, campo, permitido");
      if (error) throw error;
      return (data ?? []) as unknown as Array<{
        role: PerfilEdicaoOS;
        campo: CampoEdicaoOS;
        permitido: boolean;
      }>;
    },
  });
  if (!mestre) return null;

  const ativo = (role: PerfilEdicaoOS, campo: CampoEdicaoOS) =>
    permissoes.some((p) => p.role === role && p.campo === campo && p.permitido);
  async function alterar(role: PerfilEdicaoOS, campo: CampoEdicaoOS, permitido: boolean) {
    const { error } = await supabase
      .from("os_edicao_permissoes" as never)
      .upsert({ role, campo, permitido, atualizado_em: new Date().toISOString() } as never, {
        onConflict: "role,campo",
      });
    if (error) return showDbError(error);
    await qc.invalidateQueries({ queryKey: ["os_edicao_permissoes"] });
    toast.success("Permissão atualizada.");
  }
  return (
    <Card className="md:col-span-2">
      <CardHeader>
        <CardTitle>Campos editáveis da Ordem de Serviço</CardTitle>
        <CardDescription>
          Defina quais campos cada perfil poderá alterar. O Usuário Mestre sempre pode editar todos
          os campos, inclusive após a conclusão.
        </CardDescription>
      </CardHeader>
      <CardContent className="overflow-x-auto">
        <div className="grid min-w-[680px] grid-cols-[minmax(220px,1fr)_repeat(3,160px)] gap-x-4 gap-y-3 text-sm">
          <div className="font-medium">Campo</div>
          {PERFIS_EDICAO_OS.map((p) => (
            <div key={p.role} className="font-medium text-center">
              {p.label}
            </div>
          ))}
          {CAMPOS_EDICAO_OS.map((c) => (
            <div className="contents" key={c.campo}>
              <div className="border-t py-3">{c.label}</div>
              {PERFIS_EDICAO_OS.map((p) => (
                <div key={p.role} className="flex justify-center border-t py-3">
                  <Switch
                    checked={ativo(p.role, c.campo)}
                    onCheckedChange={(v) => alterar(p.role, c.campo, v)}
                    aria-label={`${c.label} para ${p.label}`}
                  />
                </div>
              ))}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
