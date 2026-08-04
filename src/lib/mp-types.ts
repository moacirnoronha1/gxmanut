export interface Periodicidade {
  id: string;
  nome: string;
  tipo: string;
  intervalo: number | null;
  unidade: string | null;
  ordem: number;
  sistema: boolean;
  ativo: boolean;
}

export interface ManutencaoPeriodica {
  id: string;
  nome: string;
  equipamento_id: string | null;
  setor_id: string | null;
  localizacao: string | null;
  categoria_id: string | null;
  descricao: string | null;
  procedimento: string | null;
  periodicidade_id: string | null;
  intervalo_custom: number | null;
  dias_semana: number[] | null;
  regra_mensal: string | null;
  dia_mes: number | null;
  mes_ano: number | null;
  data_inicio: string | null;
  primeira_execucao: string | null;
  proxima_execucao: string | null;
  ultima_execucao: string | null;
  horario_preferencial: string | null;
  responsavel_id: string | null;
  tecnico_id: string | null;
  tecnico_substituto_id: string | null;
  tempo_estimado_min: number | null;
  prioridade: string;
  checklist: string[];
  materiais: string | null;
  ferramentas: string | null;
  fornecedor_id: string | null;
  observacoes: string | null;
  documentos: unknown[];
  situacao: string;
  geracao_os: string;
  escalacao: unknown[];
  created_at: string;
  updated_at: string;
}

export interface MPLembrete {
  id: string;
  manutencao_id: string;
  dias_antes: number;
  canais: string[];
  destinatarios: string[];
  usuarios_extra: string[];
  ativo: boolean;
  created_at: string;
}

export interface MPExecucao {
  id: string;
  manutencao_id: string;
  os_id: string | null;
  data_programada: string;
  status: string;
  iniciada_em: string | null;
  concluida_em: string | null;
  tecnico_id: string | null;
  checklist_respostas: { item: string; ok: boolean; obs?: string }[];
  fotos_antes: unknown[];
  fotos_depois: unknown[];
  diagnostico: string | null;
  irregularidades: string | null;
  materiais_utilizados: string | null;
  correcao: string | null;
  recomendacoes: string | null;
  servico_realizado: string | null;
  executada_completa: boolean | null;
  encontrou_irregularidade: boolean | null;
  gerou_corretiva: boolean;
  os_corretiva_id: string | null;
  proxima_data: string | null;
  custo_total: number;
  created_at: string;
}

export interface MPReagendamento {
  id: string;
  manutencao_id: string;
  execucao_id: string | null;
  data_original: string | null;
  nova_data: string;
  motivo: string;
  observacao: string | null;
  usuario_id: string | null;
  created_at: string;
}

export const SITUACOES = [
  { value: "ativa", label: "Ativa" },
  { value: "pausada", label: "Pausada" },
  { value: "encerrada", label: "Encerrada" },
  { value: "cancelada", label: "Cancelada" },
];

export const PRIORIDADES = [
  { value: "baixa", label: "Baixa" },
  { value: "normal", label: "Normal" },
  { value: "alta", label: "Alta" },
  { value: "critica", label: "Crítica" },
];

export const GERACAO_OS = [
  { value: "automatica", label: "Gerar OS automaticamente" },
  { value: "autorizacao", label: "Pedir autorização do Usuário Mestre" },
  { value: "lembrete", label: "Apenas lembrete (sem OS)" },
];

export const REGRAS_MENSAIS = [
  { value: "dia_fixo", label: "Dia específico do mês" },
  { value: "primeiro_util", label: "Primeiro dia útil" },
  { value: "ultimo_util", label: "Último dia útil" },
  { value: "primeira_segunda", label: "Primeira segunda-feira" },
  { value: "ultima_sexta", label: "Última sexta-feira" },
  { value: "personalizada", label: "Regra personalizada" },
];

export const DIAS_SEMANA = [
  { value: 0, label: "Dom" },
  { value: 1, label: "Seg" },
  { value: 2, label: "Ter" },
  { value: 3, label: "Qua" },
  { value: 4, label: "Qui" },
  { value: 5, label: "Sex" },
  { value: 6, label: "Sáb" },
];

export const CANAIS_ALERTA = [
  { value: "painel", label: "Aviso no painel" },
  { value: "sistema", label: "Notificação no sistema" },
  { value: "push", label: "Notificação push" },
  { value: "som", label: "Alerta sonoro" },
  { value: "destaque", label: "Destaque na tela inicial" },
  { value: "contador", label: "Contador de pendências" },
];

export const DESTINATARIOS = [
  { value: "tecnico", label: "Técnico responsável" },
  { value: "substituto", label: "Técnico substituto" },
  { value: "responsavel", label: "Responsável pelo setor" },
  { value: "mestre", label: "Usuário Mestre" },
];

export const ANTECEDENCIAS = [0, 1, 2, 3, 7, 15, 30];

export function toISODate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function parseISODate(s: string): Date {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y ?? 1970, (m ?? 1) - 1, d ?? 1);
}

export function hojeISO(): string {
  return toISODate(new Date());
}

export function diffDias(a: string, b: string): number {
  return Math.round((parseISODate(a).getTime() - parseISODate(b).getTime()) / 86400000);
}

function addMonths(d: Date, n: number): Date {
  const r = new Date(d.getFullYear(), d.getMonth() + n, 1);
  const last = new Date(r.getFullYear(), r.getMonth() + 1, 0).getDate();
  r.setDate(Math.min(d.getDate(), last));
  return r;
}

function ehUtil(d: Date) {
  const w = d.getDay();
  return w !== 0 && w !== 6;
}

function aplicaRegraMensal(base: Date, regra: string | null, diaMes: number | null): Date {
  const y = base.getFullYear();
  const m = base.getMonth();
  switch (regra) {
    case "primeiro_util": {
      const d = new Date(y, m, 1);
      while (!ehUtil(d)) d.setDate(d.getDate() + 1);
      return d;
    }
    case "ultimo_util": {
      const d = new Date(y, m + 1, 0);
      while (!ehUtil(d)) d.setDate(d.getDate() - 1);
      return d;
    }
    case "primeira_segunda": {
      const d = new Date(y, m, 1);
      while (d.getDay() !== 1) d.setDate(d.getDate() + 1);
      return d;
    }
    case "ultima_sexta": {
      const d = new Date(y, m + 1, 0);
      while (d.getDay() !== 5) d.setDate(d.getDate() - 1);
      return d;
    }
    case "dia_fixo": {
      const last = new Date(y, m + 1, 0).getDate();
      return new Date(y, m, Math.min(diaMes ?? base.getDate(), last));
    }
    default:
      return base;
  }
}

/** Calcula a próxima data a partir de uma data base, conforme a periodicidade da manutenção. */
export function calcularProximaData(
  baseISO: string,
  per: Periodicidade | undefined,
  mp: Pick<ManutencaoPeriodica, "intervalo_custom" | "dias_semana" | "regra_mensal" | "dia_mes" | "mes_ano">,
): string | null {
  if (!per) return null;
  const base = parseISODate(baseISO);

  if (per.tipo === "data_personalizada" || per.tipo === "horas_funcionamento" || per.tipo === "utilizacoes") {
    return null; // definida manualmente / por uso
  }

  const n = per.intervalo ?? mp.intervalo_custom ?? 1;

  if (mp.dias_semana && mp.dias_semana.length > 0 && (per.tipo === "dias" || per.tipo === "semanas")) {
    const d = new Date(base);
    for (let i = 1; i <= 14; i++) {
      d.setDate(d.getDate() + 1);
      if (mp.dias_semana.includes(d.getDay())) return toISODate(d);
    }
  }

  if (per.tipo === "dias") {
    const d = new Date(base);
    d.setDate(d.getDate() + n);
    return toISODate(d);
  }
  if (per.tipo === "semanas") {
    const d = new Date(base);
    d.setDate(d.getDate() + n * 7);
    return toISODate(d);
  }
  if (per.tipo === "meses") {
    let d = addMonths(base, n);
    if (n === 12 && mp.mes_ano) d = new Date(base.getFullYear() + 1, mp.mes_ano - 1, mp.dia_mes ?? base.getDate());
    if (mp.regra_mensal) d = aplicaRegraMensal(d, mp.regra_mensal, mp.dia_mes);
    return toISODate(d);
  }
  return null;
}

export function statusManutencao(mp: ManutencaoPeriodica): "hoje" | "atrasada" | "proxima" | "suspensa" | "encerrada" | "sem_data" {
  if (mp.situacao === "pausada") return "suspensa";
  if (mp.situacao === "encerrada" || mp.situacao === "cancelada") return "encerrada";
  if (!mp.proxima_execucao) return "sem_data";
  const d = diffDias(mp.proxima_execucao, hojeISO());
  if (d < 0) return "atrasada";
  if (d === 0) return "hoje";
  return "proxima";
}

export function grupoPeriodicidade(per: Periodicidade | undefined): string {
  if (!per) return "Personalizadas";
  const map: Record<string, string> = {
    Diária: "Diárias",
    Semanal: "Semanais",
    "A cada duas semanas": "Quinzenais",
    Mensal: "Mensais",
    Bimestral: "Bimestrais",
    Trimestral: "Trimestrais",
    Semestral: "Semestrais",
    Anual: "Anuais",
  };
  return map[per.nome] ?? "Personalizadas";
}

export function formatarSituacao(s: string): string {
  return SITUACOES.find((x) => x.value === s)?.label ?? s;
}
