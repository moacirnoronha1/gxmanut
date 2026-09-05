import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type SolicitacaoExclusaoOS = {
  id: string;
  os_id: string;
  os_numero: number | null;
  solicitado_por: string | null;
  motivo: string;
  observacao: string | null;
  status: "pendente" | "aprovada" | "rejeitada";
  decidido_por: string | null;
  decidido_em: string | null;
  motivo_rejeicao: string | null;
  created_at: string;
  ordens_servico?: {
    id: string;
    numero: number;
    titulo: string;
    data_ocorrencia: string | null;
    created_at: string;
    solicitante_nome: string | null;
    setor_id: string | null;
    equipamento_id: string | null;
    equipamento_nao_cadastrado: string | null;
  } | null;
};

const SELECT =
  "id, os_id, os_numero, solicitado_por, motivo, observacao, status, decidido_por, decidido_em, motivo_rejeicao, created_at, ordens_servico(id, numero, titulo, data_ocorrencia, created_at, solicitante_nome, setor_id, equipamento_id, equipamento_nao_cadastrado)";

export const exclusoesOSQuery = () =>
  queryOptions({
    queryKey: ["os_exclusoes"],
    queryFn: async (): Promise<SolicitacaoExclusaoOS[]> => {
      const { data, error } = await supabase
        .from("os_exclusao_solicitacoes" as never)
        .select(SELECT)
        .order("created_at", { ascending: false });
      if (error) throw new Error(error.message);
      return (data ?? []) as unknown as SolicitacaoExclusaoOS[];
    },
  });

export const exclusaoPendenteOSQuery = (osId: string) =>
  queryOptions({
    queryKey: ["os_exclusao", osId],
    queryFn: async (): Promise<SolicitacaoExclusaoOS | null> => {
      const { data, error } = await supabase
        .from("os_exclusao_solicitacoes" as never)
        .select(SELECT)
        .eq("os_id", osId)
        .eq("status", "pendente")
        .maybeSingle();
      if (error) throw new Error(error.message);
      return (data ?? null) as unknown as SolicitacaoExclusaoOS | null;
    },
  });

/** Nomes de solicitantes já usados, para o autocomplete do campo de texto livre. */
export const solicitantesUsadosQuery = () =>
  queryOptions({
    queryKey: ["solicitantes_usados"],
    queryFn: async (): Promise<string[]> => {
      const { data, error } = await supabase
        .from("ordens_servico")
        .select("solicitante_nome")
        .not("solicitante_nome", "is", null)
        .order("created_at", { ascending: false })
        .limit(300);
      if (error) throw new Error(error.message);
      const nomes = (data ?? [])
        .map((r) => (r as { solicitante_nome: string | null }).solicitante_nome?.trim())
        .filter((n): n is string => !!n);
      return Array.from(new Set(nomes)).slice(0, 50);
    },
  });
