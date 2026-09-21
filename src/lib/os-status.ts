import type { OS, StatusOS } from "./db-types";

export function osEstaAberta(os: OS, statusMap: Map<string, StatusOS>): boolean {
  if (os.concluida_em) return false;
  return statusMap.get(os.status_id ?? "")?.is_final !== true;
}

export function osEstaFinalizada(os: OS, statusMap: Map<string, StatusOS>): boolean {
  return !osEstaAberta(os, statusMap);
}