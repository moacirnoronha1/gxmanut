import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface OSTecnico {
  id: string;
  os_id: string;
  tecnico_id: string;
  papel: "principal" | "apoio";
  adicionado_por: string | null;
  created_at: string;
}

export const equipeOSQuery = (osId: string) =>
  queryOptions({
    queryKey: ["os_tecnicos", osId],
    queryFn: async (): Promise<OSTecnico[]> => {
      const { data, error } = await supabase
        .from("os_tecnicos")
        .select("*")
        .eq("os_id", osId)
        .order("papel")
        .order("created_at");
      if (error) throw new Error(error.message);
      return (data ?? []) as unknown as OSTecnico[];
    },
  });

export const minhasEquipesQuery = () =>
  queryOptions({
    queryKey: ["os_tecnicos", "me"],
    queryFn: async (): Promise<string[]> => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return [];
      const { data, error } = await supabase.from("os_tecnicos").select("os_id").eq("tecnico_id", u.user.id);
      if (error) throw new Error(error.message);
      return (data ?? []).map((r) => r.os_id as string);
    },
  });

/** Tempo em aberto legível (ex.: "2d 4h", "35min"). */
export function tempoEmAberto(desde: string, ate?: string | null): string {
  const ini = new Date(desde).getTime();
  const fim = ate ? new Date(ate).getTime() : Date.now();
  const min = Math.max(0, Math.floor((fim - ini) / 60000));
  if (min < 60) return `${min}min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h}h ${min % 60}min`;
  return `${Math.floor(h / 24)}d ${h % 24}h`;
}

export function nivelUrgencia(nome?: string | null): 0 | 1 | 2 {
  const n = (nome ?? "").toLowerCase();
  if (n.includes("extrem")) return 2;
  if (n.includes("urgente") && !n.includes("não") && !n.includes("nao")) return 1;
  return 0;
}
