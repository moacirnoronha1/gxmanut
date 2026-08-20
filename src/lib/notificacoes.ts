import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type PushDevice = {
  id: string;
  user_id: string;
  nome: string;
  endpoint: string;
  user_agent: string | null;
  ativo: boolean;
  ultimo_acesso: string;
  ultimo_envio_em: string | null;
  ultimo_teste_em: string | null;
  ultima_confirmacao_em: string | null;
  ultimo_erro: string | null;
  created_at: string;
};

export type Notificacao = {
  id: string;
  user_id: string;
  tipo: string;
  prioridade: "normal" | "urgente" | "extrema";
  titulo: string;
  mensagem: string;
  url: string | null;
  os_id: string | null;
  manutencao_id: string | null;
  lida_em: string | null;
  confirmada_em: string | null;
  resolvida_em: string | null;
  created_at: string;
};

export const TIPOS_NOTIFICACAO: { key: string; label: string; bloqueado?: boolean }[] = [
  { key: "os_nova", label: "Nova OS" },
  { key: "os_urgente", label: "OS urgente" },
  { key: "os_extrema", label: "OS extremamente urgente", bloqueado: true },
  { key: "mp_proxima", label: "Manutenção periódica próxima" },
  { key: "mp_atrasada", label: "Manutenção atrasada" },
  { key: "os_atribuida", label: "OS atribuída a mim" },
  { key: "os_reaberta", label: "OS reaberta" },
  { key: "material_disponivel", label: "Material disponível" },
  { key: "os_status", label: "Alteração de status" },
  { key: "os_comentario", label: "Comentário ou menção" },
  { key: "aprovacao", label: "Solicitação de aprovação" },
  { key: "os_pendentes", label: "Lembrete diário de pendências" },
];

function throwIfError<T>(res: { data: unknown; error: { message: string } | null }): T {
  if (res.error) throw new Error(res.error.message);
  return res.data as T;
}

export const meusDispositivosQuery = () =>
  queryOptions({
    queryKey: ["push_devices", "me"],
    queryFn: async (): Promise<PushDevice[]> => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return [];
      return throwIfError(
        await supabase.from("push_devices").select("*").eq("user_id", u.user.id).order("created_at", { ascending: false }),
      );
    },
  });

export const todosDispositivosQuery = () =>
  queryOptions({
    queryKey: ["push_devices", "todos"],
    queryFn: async (): Promise<(PushDevice & { profiles: { nome_completo: string | null; nome: string } | null })[]> =>
      throwIfError(
        await supabase
          .from("push_devices")
          .select("*, profiles:user_id(nome, nome_completo)")
          .order("created_at", { ascending: false }),
      ),
  });

export const minhasNotificacoesQuery = () =>
  queryOptions({
    queryKey: ["notificacoes", "me"],
    refetchInterval: 30_000,
    queryFn: async (): Promise<Notificacao[]> => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return [];
      return throwIfError(
        await supabase
          .from("notificacoes")
          .select("*")
          .eq("user_id", u.user.id)
          .order("created_at", { ascending: false })
          .limit(200),
      );
    },
  });

export const minhasPreferenciasQuery = () =>
  queryOptions({
    queryKey: ["notificacao_preferencias", "me"],
    queryFn: async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return null;
      const res = await supabase.from("notificacao_preferencias").select("*").eq("user_id", u.user.id).maybeSingle();
      return throwIfError<{
        tipos: Record<string, boolean>;
        silencio_ativo: boolean;
        silencio_inicio: string;
        silencio_fim: string;
        som_urgente: boolean;
      } | null>(res);
    },
  });

export const configNotificacaoQuery = () =>
  queryOptions({
    queryKey: ["notificacao_config"],
    queryFn: async () =>
      throwIfError<{
        urgente_reforco_min: number;
        urgente_mestre_min: number;
        extrema_repeticao_min: number;
        mp_atraso_repetir_dias: number;
        os_nao_urgente_lembrete_diario: boolean;
      }>(await supabase.from("notificacao_config").select("*").eq("id", true).single()),
  });
