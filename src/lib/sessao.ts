import { queryOptions, useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { myProfileQuery, userRolesQuery, setoresQuery } from "@/lib/queries";
import type { AppRole } from "@/lib/db-types";

export const ROLE_LABEL: Record<AppRole, string> = {
  mestre: "Usuário Mestre",
  admin: "Administrador",
  gestor: "Gestor de Manutenção",
  responsavel: "Responsável de Setor",
  tecnico: "Técnico de Manutenção",
};

const ROLE_ORDER: AppRole[] = ["mestre", "admin", "gestor", "responsavel", "tecnico"];

export interface AuditoriaRegistro {
  id: string;
  ator_id: string | null;
  alvo_id: string | null;
  acao: string;
  detalhes: Record<string, unknown> | null;
  created_at: string;
}

export const minhaAuditoriaQuery = () =>
  queryOptions({
    queryKey: ["auditoria", "me"],
    queryFn: async (): Promise<AuditoriaRegistro[]> => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return [];
      const { data, error } = await supabase
        .from("usuarios_auditoria")
        .select("*")
        .or(`ator_id.eq.${u.user.id},alvo_id.eq.${u.user.id}`)
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw new Error(error.message);
      return (data ?? []) as AuditoriaRegistro[];
    },
  });

export function useSessaoUsuario() {
  const { data: perfil, isLoading: carregandoPerfil } = useQuery(myProfileQuery());
  const { data: roles = [] } = useQuery(userRolesQuery());
  const { data: setores = [] } = useQuery(setoresQuery());

  const mestre = !!perfil?.is_master || roles.includes("mestre");
  const principal: AppRole | null = mestre
    ? "mestre"
    : (ROLE_ORDER.find((r) => roles.includes(r)) ?? null);

  const setor = perfil?.setor_id ? (setores.find((s) => s.id === perfil.setor_id) ?? null) : null;
  const username = (perfil?.username ?? "").toUpperCase();
  const nomeCompleto = perfil?.nome_completo || perfil?.nome || username || "Usuário";

  return {
    perfil: perfil ?? null,
    roles,
    mestre,
    perfilLabel: principal ? ROLE_LABEL[principal] : "Sem perfil definido",
    setor,
    username,
    nomeCompleto,
    iniciais: nomeCompleto
      .split(/\s+/)
      .slice(0, 2)
      .map((p) => p[0] ?? "")
      .join("")
      .toUpperCase(),
    carregando: carregandoPerfil,
  };
}
