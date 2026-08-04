import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Periodicidade, ManutencaoPeriodica, MPLembrete, MPExecucao, MPReagendamento } from "./mp-types";

function unwrap<T>(res: { data: unknown; error: { message: string } | null }): T {
  if (res.error) throw new Error(res.error.message);
  return res.data as T;
}

export const periodicidadesQuery = () =>
  queryOptions({
    queryKey: ["periodicidades"],
    queryFn: async (): Promise<Periodicidade[]> =>
      unwrap(await supabase.from("periodicidades").select("*").eq("ativo", true).order("ordem")),
  });

export const manutencoesQuery = () =>
  queryOptions({
    queryKey: ["manutencoes_periodicas"],
    queryFn: async (): Promise<ManutencaoPeriodica[]> =>
      unwrap(await supabase.from("manutencoes_periodicas").select("*").order("proxima_execucao", { nullsFirst: false })),
  });

export const manutencaoQuery = (id: string) =>
  queryOptions({
    queryKey: ["manutencao", id],
    queryFn: async (): Promise<ManutencaoPeriodica | null> =>
      unwrap(await supabase.from("manutencoes_periodicas").select("*").eq("id", id).maybeSingle()),
  });

export const mpLembretesQuery = (id: string) =>
  queryOptions({
    queryKey: ["mp_lembretes", id],
    queryFn: async (): Promise<MPLembrete[]> =>
      unwrap(await supabase.from("mp_lembretes").select("*").eq("manutencao_id", id).order("dias_antes", { ascending: false })),
  });

export const mpExecucoesQuery = (id: string) =>
  queryOptions({
    queryKey: ["mp_execucoes", id],
    queryFn: async (): Promise<MPExecucao[]> =>
      unwrap(await supabase.from("mp_execucoes").select("*").eq("manutencao_id", id).order("data_programada", { ascending: false })),
  });

export const mpExecucoesTodasQuery = () =>
  queryOptions({
    queryKey: ["mp_execucoes", "todas"],
    queryFn: async (): Promise<MPExecucao[]> =>
      unwrap(await supabase.from("mp_execucoes").select("*").order("data_programada", { ascending: false })),
  });

export const mpReagendamentosQuery = (id: string) =>
  queryOptions({
    queryKey: ["mp_reag", id],
    queryFn: async (): Promise<MPReagendamento[]> =>
      unwrap(await supabase.from("mp_reagendamentos").select("*").eq("manutencao_id", id).order("created_at", { ascending: false })),
  });
