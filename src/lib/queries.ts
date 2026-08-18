import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { AppRole, Setor, Urgencia, StatusOS, CategoriaProblema, Equipamento, Fornecedor, Profile, OS, OSCusto, OSComentario, OSHistorico } from "./db-types";

function throwIfError<T>(res: { data: unknown; error: { message: string } | null }): T {
  if (res.error) throw new Error(res.error.message);
  return res.data as T;
}

export const userRolesQuery = () =>
  queryOptions({
    queryKey: ["user_roles", "me"],
    queryFn: async (): Promise<AppRole[]> => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return [];
      const rows = throwIfError<{ role: AppRole }[]>(await supabase.from("user_roles").select("role").eq("user_id", u.user.id));
      return rows.map((r) => r.role);
    },
  });

export const myProfileQuery = () =>
  queryOptions({
    queryKey: ["profile", "me"],
    queryFn: async (): Promise<Profile | null> => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return null;
      const res = await supabase.from("profiles").select("*").eq("id", u.user.id).maybeSingle();
      return throwIfError(res);
    },
  });

export const setoresQuery = () =>
  queryOptions({
    queryKey: ["setores"],
    queryFn: async (): Promise<Setor[]> =>
      throwIfError(await supabase.from("setores").select("*").order("nome")),
  });

export const urgenciasQuery = () =>
  queryOptions({
    queryKey: ["urgencias"],
    queryFn: async (): Promise<Urgencia[]> =>
      throwIfError(await supabase.from("urgencias").select("*").eq("ativo", true).order("ordem")),
  });

export const statusOsQuery = () =>
  queryOptions({
    queryKey: ["status_os"],
    queryFn: async (): Promise<StatusOS[]> =>
      throwIfError(await supabase.from("status_os").select("*").eq("ativo", true).order("ordem")),
  });

export const categoriasQuery = () =>
  queryOptions({
    queryKey: ["categorias_problema"],
    queryFn: async (): Promise<CategoriaProblema[]> =>
      throwIfError(await supabase.from("categorias_problema").select("*").eq("ativo", true).order("nome")),
  });

export const fornecedoresQuery = () =>
  queryOptions({
    queryKey: ["fornecedores"],
    queryFn: async (): Promise<Fornecedor[]> =>
      throwIfError(await supabase.from("fornecedores").select("*").order("nome")),
  });

export const equipamentosQuery = () =>
  queryOptions({
    queryKey: ["equipamentos"],
    queryFn: async (): Promise<Equipamento[]> =>
      throwIfError(await supabase.from("equipamentos").select("*").order("nome")),
  });

export const equipamentoQuery = (id: string) =>
  queryOptions({
    queryKey: ["equipamento", id],
    queryFn: async (): Promise<Equipamento | null> =>
      throwIfError(await supabase.from("equipamentos").select("*").eq("id", id).maybeSingle()),
  });

export const profilesQuery = () =>
  queryOptions({
    queryKey: ["profiles"],
    queryFn: async (): Promise<Profile[]> =>
      throwIfError(await supabase.from("profiles").select("*").order("nome")),
  });

export const ordensQuery = () =>
  queryOptions({
    queryKey: ["ordens_servico"],
    queryFn: async (): Promise<OS[]> =>
      throwIfError(await supabase.from("ordens_servico").select("*").order("numero", { ascending: false })),
  });

export const osQuery = (id: string) =>
  queryOptions({
    queryKey: ["os", id],
    queryFn: async (): Promise<OS | null> =>
      throwIfError(await supabase.from("ordens_servico").select("*").eq("id", id).maybeSingle()),
  });

export const osCustosQuery = (osId: string) =>
  queryOptions({
    queryKey: ["os_custos", osId],
    queryFn: async (): Promise<OSCusto[]> =>
      throwIfError(await supabase.from("os_custos").select("*").eq("os_id", osId).order("created_at")),
  });

export const osComentariosQuery = (osId: string) =>
  queryOptions({
    queryKey: ["os_coment", osId],
    queryFn: async (): Promise<OSComentario[]> =>
      throwIfError(await supabase.from("os_comentarios").select("*").eq("os_id", osId).order("created_at")),
  });

export const osHistoricoQuery = (osId: string) =>
  queryOptions({
    queryKey: ["os_hist", osId],
    queryFn: async (): Promise<OSHistorico[]> =>
      throwIfError(await supabase.from("os_historico").select("*").eq("os_id", osId).order("created_at", { ascending: false })),
  });
// ---------- Custos reais ----------
import type { CustoCategoria, CustoLancamento, CustoEvidencia } from "./custos";

export const custoCategoriasQuery = () =>
  queryOptions({
    queryKey: ["custo_categorias"],
    queryFn: async (): Promise<CustoCategoria[]> =>
      throwIfError(await supabase.from("custo_categorias").select("*").order("ordem").order("nome")),
  });

export const osCustosDetalhadosQuery = (osId: string) =>
  queryOptions({
    queryKey: ["os_custos", osId],
    queryFn: async (): Promise<CustoLancamento[]> =>
      throwIfError(await supabase.from("os_custos").select("*").eq("os_id", osId).order("created_at")),
  });

export const custoEvidenciasQuery = (osId: string) =>
  queryOptions({
    queryKey: ["custo_evidencias", osId],
    queryFn: async (): Promise<CustoEvidencia[]> => {
      const ids = throwIfError<{ id: string }[]>(await supabase.from("os_custos").select("id").eq("os_id", osId));
      if (ids.length === 0) return [];
      return throwIfError(
        await supabase.from("os_custo_evidencias").select("*").in("custo_id", ids.map((r) => r.id)).order("created_at"),
      );
    },
  });

export const custosDoEquipamentoQuery = (equipamentoId: string) =>
  queryOptions({
    queryKey: ["custos_equipamento", equipamentoId],
    queryFn: async (): Promise<CustoLancamento[]> => {
      const oss = throwIfError<{ id: string }[]>(
        await supabase.from("ordens_servico").select("id").eq("equipamento_id", equipamentoId),
      );
      const osIds = oss.map((o) => o.id);
      const filtro = osIds.length
        ? `equipamento_id.eq.${equipamentoId},os_id.in.(${osIds.join(",")})`
        : `equipamento_id.eq.${equipamentoId}`;
      return throwIfError(await supabase.from("os_custos").select("*").or(filtro).order("created_at"));
    },
  });

export const ordensDoEquipamentoQuery = (equipamentoId: string) =>
  queryOptions({
    queryKey: ["ordens_equipamento", equipamentoId],
    queryFn: async (): Promise<OS[]> =>
      throwIfError(
        await supabase.from("ordens_servico").select("*").eq("equipamento_id", equipamentoId).order("numero", { ascending: false }),
      ),
  });
