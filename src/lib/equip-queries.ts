import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { EquipamentoStatus, EquipamentoHistorico, EquipamentoDocumento, EquipamentoParada } from "./equipamentos";
import type { CustoLancamento } from "./custos";

function unwrap<T>(res: { data: unknown; error: { message: string } | null }): T {
  if (res.error) throw new Error(res.error.message);
  return res.data as T;
}

export const equipamentoStatusQuery = (somenteAtivos = false) =>
  queryOptions({
    queryKey: ["equipamento_status", somenteAtivos],
    queryFn: async (): Promise<EquipamentoStatus[]> => {
      let q = supabase.from("equipamento_status").select("*").order("ordem").order("nome");
      if (somenteAtivos) q = q.eq("ativo", true);
      return unwrap(await q);
    },
  });

export const equipamentoHistoricoQuery = (id: string) =>
  queryOptions({
    queryKey: ["equipamento_historico", id],
    queryFn: async (): Promise<EquipamentoHistorico[]> =>
      unwrap(
        await supabase.from("equipamento_historico").select("*").eq("equipamento_id", id)
          .order("created_at", { ascending: false }),
      ),
  });

export const equipamentoDocumentosQuery = (id: string) =>
  queryOptions({
    queryKey: ["equipamento_documentos", id],
    queryFn: async (): Promise<EquipamentoDocumento[]> =>
      unwrap(
        await supabase.from("equipamento_documentos").select("*").eq("equipamento_id", id)
          .order("created_at", { ascending: false }),
      ),
  });

export const equipamentoParadasQuery = (id: string) =>
  queryOptions({
    queryKey: ["equipamento_paradas", id],
    queryFn: async (): Promise<EquipamentoParada[]> =>
      unwrap(
        await supabase.from("equipamento_paradas").select("*").eq("equipamento_id", id)
          .order("inicio", { ascending: false }),
      ),
  });

export const paradasTodasQuery = () =>
  queryOptions({
    queryKey: ["equipamento_paradas", "todas"],
    queryFn: async (): Promise<EquipamentoParada[]> =>
      unwrap(await supabase.from("equipamento_paradas").select("*").order("inicio", { ascending: false })),
  });

/** Todos os custos realizados, com o equipamento resolvido pela OS quando necessário. */
export const custosComEquipamentoQuery = () =>
  queryOptions({
    queryKey: ["custos_com_equipamento"],
    queryFn: async (): Promise<(CustoLancamento & { _equipamento_id: string | null })[]> => {
      const custos = unwrap<CustoLancamento[]>(await supabase.from("os_custos").select("*"));
      const ordens = unwrap<{ id: string; equipamento_id: string | null }[]>(
        await supabase.from("ordens_servico").select("id, equipamento_id"),
      );
      const mapa = new Map(ordens.map((o) => [o.id, o.equipamento_id]));
      return custos.map((c) => ({ ...c, _equipamento_id: c.equipamento_id ?? mapa.get(c.os_id) ?? null }));
    },
  });
