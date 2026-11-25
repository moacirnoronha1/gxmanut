import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface ExpedienteConfig {
  id: number;
  ativo: boolean;
  hora_inicio: string;
  hora_fim: string;
  timezone: string;
  mensagem: string;
  atualizado_em: string;
  atualizado_por: string | null;
}

export const EXPEDIENTE_PADRAO: ExpedienteConfig = {
  id: 1,
  ativo: true,
  hora_inicio: "06:00:00",
  hora_fim: "22:00:00",
  timezone: "America/Sao_Paulo",
  mensagem:
    "O sistema está bloqueado fora do horário de expediente. Retorne durante o horário de funcionamento ou acione o Usuário Mestre em caso de emergência.",
  atualizado_em: "",
  atualizado_por: null,
};

export function formatarHoraCurta(hora: string): string {
  const partes = hora.split(":");
  const h = (partes[0] ?? "00").padStart(2, "0");
  const m = (partes[1] ?? "00").padStart(2, "0");
  return `${h}:${m}`;
}

function horaParaMinutos(hora: string): number {
  const partes = hora.split(":");
  const h = Number.parseInt(partes[0] ?? "0", 10);
  const m = Number.parseInt(partes[1] ?? "0", 10);
  if (Number.isNaN(h) || Number.isNaN(m)) return 0;
  return h * 60 + m;
}

export function obterHoraAtualNoFuso(
  agora: Date = new Date(),
  timezone = "America/Sao_Paulo",
): { minutos: number; formatada: string } {
  const parts = new Intl.DateTimeFormat("pt-BR", {
    timeZone: timezone,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(agora);
  const hStr = parts.find((p) => p.type === "hour")?.value ?? "00";
  const mStr = parts.find((p) => p.type === "minute")?.value ?? "00";
  const h = Number.parseInt(hStr, 10) % 24;
  const m = Number.parseInt(mStr, 10) % 60;
  return {
    minutos: h * 60 + m,
    formatada: `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`,
  };
}

export function estaForaDoExpediente(
  config: Pick<ExpedienteConfig, "ativo" | "hora_inicio" | "hora_fim" | "timezone"> | null | undefined,
  agora: Date = new Date(),
): boolean {
  if (!config || !config.ativo) return false;
  const inicio = horaParaMinutos(config.hora_inicio);
  const fim = horaParaMinutos(config.hora_fim);
  if (inicio === fim) return false;

  const { minutos } = obterHoraAtualNoFuso(agora, config.timezone || "America/Sao_Paulo");
  if (inicio < fim) {
    const dentro = minutos >= inicio && minutos < fim;
    return !dentro;
  }
  const dentroNoturno = minutos >= inicio || minutos < fim;
  return !dentroNoturno;
}

export const expedienteConfigQuery = () =>
  queryOptions({
    queryKey: ["expediente_config"],
    queryFn: async (): Promise<ExpedienteConfig> => {
      const { data, error } = await supabase
        .from("expediente_config")
        .select("*")
        .eq("id", 1)
        .maybeSingle();
      if (error || !data) return EXPEDIENTE_PADRAO;
      return data as ExpedienteConfig;
    },
    staleTime: 60_000,
    refetchInterval: 60_000,
    refetchIntervalInBackground: false,
  });