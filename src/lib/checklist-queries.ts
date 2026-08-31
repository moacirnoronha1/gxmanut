import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type {
  PropriedadeTipo, EquipamentoComponente, TipoResposta, ChecklistModelo, ChecklistModeloItem,
  Checklist, ChecklistItem, ChecklistExecucao, ChecklistResposta,
} from "./checklists";

function unwrap<T>(res: { data: unknown; error: { message: string } | null }): T {
  if (res.error) throw new Error(res.error.message);
  return res.data as T;
}

export const propriedadeTiposQuery = (somenteAtivos = false) =>
  queryOptions({
    queryKey: ["propriedade_tipos", somenteAtivos],
    queryFn: async (): Promise<PropriedadeTipo[]> => {
      let q = supabase.from("propriedade_tipos").select("*").order("ordem").order("nome");
      if (somenteAtivos) q = q.eq("ativo", true);
      return unwrap(await q);
    },
  });

export const componentesQuery = (equipamentoId: string) =>
  queryOptions({
    queryKey: ["equipamento_componentes", equipamentoId],
    queryFn: async (): Promise<EquipamentoComponente[]> =>
      unwrap(
        await supabase.from("equipamento_componentes").select("*")
          .eq("equipamento_id", equipamentoId).order("ordem").order("nome"),
      ),
    enabled: !!equipamentoId,
  });

export const tiposRespostaQuery = () =>
  queryOptions({
    queryKey: ["checklist_tipos_resposta"],
    queryFn: async (): Promise<TipoResposta[]> =>
      unwrap(await supabase.from("checklist_tipos_resposta").select("*").order("ordem")),
  });

export const checklistModelosQuery = () =>
  queryOptions({
    queryKey: ["checklist_modelos"],
    queryFn: async (): Promise<ChecklistModelo[]> =>
      unwrap(await supabase.from("checklist_modelos").select("*").order("nome")),
  });

export const checklistModeloItensQuery = (modeloId: string) =>
  queryOptions({
    queryKey: ["checklist_modelo_itens", modeloId],
    queryFn: async (): Promise<ChecklistModeloItem[]> =>
      unwrap(await supabase.from("checklist_modelo_itens").select("*").eq("modelo_id", modeloId).order("ordem")),
    enabled: !!modeloId,
  });

export const checklistsQuery = (equipamentoId?: string) =>
  queryOptions({
    queryKey: ["checklists", equipamentoId ?? "todos"],
    queryFn: async (): Promise<Checklist[]> => {
      let q = supabase.from("checklists").select("*").order("nome");
      if (equipamentoId) q = q.eq("equipamento_id", equipamentoId);
      return unwrap(await q);
    },
  });

export const checklistQuery = (id: string) =>
  queryOptions({
    queryKey: ["checklist", id],
    queryFn: async (): Promise<Checklist | null> =>
      unwrap(await supabase.from("checklists").select("*").eq("id", id).maybeSingle()),
    enabled: !!id,
  });

export const checklistItensQuery = (checklistId: string) =>
  queryOptions({
    queryKey: ["checklist_itens", checklistId],
    queryFn: async (): Promise<ChecklistItem[]> =>
      unwrap(await supabase.from("checklist_itens").select("*").eq("checklist_id", checklistId).order("ordem")),
    enabled: !!checklistId,
  });

export const execucoesQuery = (filtro?: { equipamentoId?: string; checklistId?: string }) =>
  queryOptions({
    queryKey: ["checklist_execucoes", filtro?.equipamentoId ?? "", filtro?.checklistId ?? ""],
    queryFn: async (): Promise<ChecklistExecucao[]> => {
      let q = supabase.from("checklist_execucoes").select("*").order("iniciada_em", { ascending: false });
      if (filtro?.equipamentoId) q = q.eq("equipamento_id", filtro.equipamentoId);
      if (filtro?.checklistId) q = q.eq("checklist_id", filtro.checklistId);
      return unwrap(await q);
    },
  });

export const execucaoQuery = (id: string) =>
  queryOptions({
    queryKey: ["checklist_execucao", id],
    queryFn: async (): Promise<ChecklistExecucao | null> =>
      unwrap(await supabase.from("checklist_execucoes").select("*").eq("id", id).maybeSingle()),
    enabled: !!id,
  });

export const respostasQuery = (execucaoId: string) =>
  queryOptions({
    queryKey: ["checklist_respostas", execucaoId],
    queryFn: async (): Promise<ChecklistResposta[]> =>
      unwrap(await supabase.from("checklist_respostas").select("*").eq("execucao_id", execucaoId).order("ordem")),
    enabled: !!execucaoId,
  });

/** Respostas de todas as execuções de um equipamento — usado no histórico por componente. */
export const respostasDoEquipamentoQuery = (equipamentoId: string) =>
  queryOptions({
    queryKey: ["checklist_respostas", "equipamento", equipamentoId],
    queryFn: async (): Promise<(ChecklistResposta & { _data: string })[]> => {
      const execs = unwrap<ChecklistExecucao[]>(
        await supabase.from("checklist_execucoes").select("*").eq("equipamento_id", equipamentoId),
      );
      if (execs.length === 0) return [];
      const respostas = unwrap<ChecklistResposta[]>(
        await supabase.from("checklist_respostas").select("*").in("execucao_id", execs.map((e) => e.id)),
      );
      const mapa = new Map(execs.map((e) => [e.id, e.concluida_em ?? e.iniciada_em]));
      return respostas
        .map((r) => ({ ...r, _data: mapa.get(r.execucao_id) ?? r.created_at }))
        .sort((a, b) => (a._data < b._data ? 1 : -1));
    },
    enabled: !!equipamentoId,
  });
