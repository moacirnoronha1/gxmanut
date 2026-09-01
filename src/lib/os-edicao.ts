import type { AppRole, OS } from "@/lib/db-types";

export const CAMPOS_EDICAO_OS = [
  { campo: "titulo", label: "Título da OS" },
  { campo: "descricao", label: "Descrição do problema" },
  { campo: "setor_id", label: "Setor" },
  { campo: "local", label: "Local" },
  { campo: "equipamento_id", label: "Equipamento" },
  { campo: "categoria_id", label: "Categoria" },
  { campo: "urgencia_id", label: "Urgência" },
  { campo: "tecnico_id", label: "Técnico responsável" },
  { campo: "tecnicos_apoio", label: "Técnicos de apoio" },
  { campo: "data_desejada", label: "Data prevista" },
  { campo: "recomendacoes", label: "Observações" },
  { campo: "anexos", label: "Fotos e anexos" },
  { campo: "status_id", label: "Status" },
] as const;

export type CampoEdicaoOS = (typeof CAMPOS_EDICAO_OS)[number]["campo"];
export type PerfilEdicaoOS = Extract<AppRole, "admin" | "responsavel" | "tecnico">;

export const PERFIS_EDICAO_OS: Array<{ role: PerfilEdicaoOS; label: string }> = [
  { role: "admin", label: "Administradores autorizados" },
  { role: "tecnico", label: "Técnicos de Manutenção" },
  { role: "responsavel", label: "Responsáveis por Setor" },
];

export type OSEditavel = Pick<
  OS,
  | "titulo"
  | "descricao"
  | "setor_id"
  | "local"
  | "equipamento_id"
  | "categoria_id"
  | "urgencia_id"
  | "tecnico_id"
  | "data_desejada"
  | "recomendacoes"
  | "status_id"
>;
