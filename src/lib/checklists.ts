// Domínio de Checklists por equipamento e classificação de propriedade

export interface PropriedadeTipo {
  id: string;
  nome: string;
  chave: string;
  cor: string;
  ordem: number;
  sistema: boolean;
  ativo: boolean;
}

export interface EquipamentoComponente {
  id: string;
  equipamento_id: string;
  nome: string;
  descricao: string | null;
  ordem: number;
  ativo: boolean;
  criado_por: string | null;
  created_at: string;
}

export interface TipoResposta {
  id: string;
  chave: string;
  nome: string;
  formato: string;
  opcoes: OpcaoResposta[];
  ordem: number;
  sistema: boolean;
  ativo: boolean;
}

export interface OpcaoResposta {
  valor: string;
  label: string;
  conforme: boolean | null;
}

export interface ChecklistModelo {
  id: string;
  nome: string;
  descricao: string | null;
  categoria: string | null;
  periodicidade: string;
  intervalo_dias: number | null;
  ativo: boolean;
  criado_por: string | null;
  created_at: string;
}

export interface ChecklistModeloItem {
  id: string;
  modelo_id: string;
  componente: string;
  pergunta: string;
  tipo_resposta: string;
  obrigatorio: boolean;
  exige_foto: boolean;
  ordem: number;
}

export interface Checklist {
  id: string;
  equipamento_id: string;
  modelo_id: string | null;
  nome: string;
  descricao: string | null;
  periodicidade: string;
  intervalo_dias: number | null;
  proxima_execucao: string | null;
  ultima_execucao: string | null;
  ativo: boolean;
  criado_por: string | null;
  created_at: string;
}

export interface ChecklistItem {
  id: string;
  checklist_id: string;
  componente_id: string | null;
  componente: string;
  pergunta: string;
  tipo_resposta: string;
  obrigatorio: boolean;
  exige_foto: boolean;
  ordem: number;
}

export interface ChecklistExecucao {
  id: string;
  checklist_id: string;
  equipamento_id: string;
  usuario_id: string | null;
  status: string;
  iniciada_em: string;
  concluida_em: string | null;
  total_itens: number;
  conformes: number;
  nao_conformes: number;
  nao_aplicaveis: number;
  percentual_conformidade: number;
  observacoes: string | null;
  created_at: string;
}

export interface ChecklistResposta {
  id: string;
  execucao_id: string;
  item_id: string | null;
  componente_id: string | null;
  componente: string;
  pergunta: string;
  tipo_resposta: string;
  valor: string | null;
  conforme: boolean | null;
  gravidade: string | null;
  descricao_problema: string | null;
  foto_url: string | null;
  necessita_manutencao: boolean;
  observacao: string | null;
  os_id: string | null;
  ordem: number;
  created_at: string;
}

export const PERIODICIDADES = [
  { value: "diario", label: "Diário", dias: 1 },
  { value: "semanal", label: "Semanal", dias: 7 },
  { value: "quinzenal", label: "Quinzenal", dias: 15 },
  { value: "mensal", label: "Mensal", dias: 30 },
  { value: "trimestral", label: "Trimestral", dias: 90 },
  { value: "semestral", label: "Semestral", dias: 180 },
  { value: "anual", label: "Anual", dias: 365 },
  { value: "sob_demanda", label: "Sob demanda", dias: null as number | null },
  { value: "personalizado", label: "Personalizado", dias: null as number | null },
];

export const GRAVIDADES = [
  { value: "baixa", label: "Baixa" },
  { value: "media", label: "Média" },
  { value: "alta", label: "Alta" },
  { value: "critica", label: "Crítica" },
];

export function periodicidadeLabel(v: string): string {
  return PERIODICIDADES.find((p) => p.value === v)?.label ?? v;
}

export function diasDaPeriodicidade(periodicidade: string, intervaloDias: number | null): number | null {
  if (periodicidade === "personalizado") return intervaloDias && intervaloDias > 0 ? intervaloDias : null;
  return PERIODICIDADES.find((p) => p.value === periodicidade)?.dias ?? null;
}

export function proximaData(periodicidade: string, intervaloDias: number | null, base = new Date()): string | null {
  const dias = diasDaPeriodicidade(periodicidade, intervaloDias);
  if (!dias) return null;
  const d = new Date(base);
  d.setDate(d.getDate() + dias);
  return d.toISOString().slice(0, 10);
}

export interface ResumoExecucao {
  total: number;
  conformes: number;
  naoConformes: number;
  naoAplicaveis: number;
  percentual: number;
}

export function resumirRespostas(
  respostas: { conforme: boolean | null; valor?: string | null }[],
): ResumoExecucao {
  const total = respostas.length;
  const conformes = respostas.filter((r) => r.conforme === true).length;
  const naoConformes = respostas.filter((r) => r.conforme === false).length;
  const naoAplicaveis = respostas.filter((r) => r.conforme === null).length;
  const avaliados = conformes + naoConformes;
  return {
    total,
    conformes,
    naoConformes,
    naoAplicaveis,
    percentual: avaliados ? (conformes / avaliados) * 100 : 0,
  };
}

/** Componentes sugeridos por tipo de equipamento — ponto de partida editável. */
export const COMPONENTES_SUGERIDOS: Record<string, string[]> = {
  "Câmara Fria": [
    "Painel de controle", "Controlador de temperatura", "Sensor de temperatura", "Porta", "Tranca",
    "Dobradiças", "Borracha de vedação da porta", "Grelhas", "Ventoinhas", "Evaporador", "Dreno",
    "Compressor", "Condensador", "Tubulações", "Iluminação interna", "Parte elétrica",
    "Ruídos anormais", "Vibrações", "Vazamentos", "Temperatura interna", "Estado geral de limpeza",
  ],
  Coifa: ["Filtros", "Motor exaustor", "Correias", "Dutos", "Iluminação", "Painel de comando", "Limpeza geral", "Ruídos anormais"],
  "Ar-condicionado": ["Filtros", "Evaporadora", "Condensadora", "Dreno", "Controle remoto", "Gás refrigerante", "Ruídos anormais", "Limpeza geral"],
  Freezer: ["Porta", "Borracha de vedação", "Termostato", "Compressor", "Condensador", "Dreno", "Temperatura interna", "Limpeza geral"],
  Geladeira: ["Porta", "Borracha de vedação", "Termostato", "Compressor", "Prateleiras", "Iluminação interna", "Temperatura interna", "Limpeza geral"],
  Gerador: ["Nível de óleo", "Nível de combustível", "Bateria", "Filtros", "Radiador", "Painel de comando", "Escapamento", "Teste de partida"],
  Bomba: ["Motor", "Selo mecânico", "Rolamentos", "Tubulações", "Válvulas", "Vazamentos", "Ruídos anormais", "Vibrações"],
  Forno: ["Queimadores", "Termostato", "Porta", "Vedação", "Painel de controle", "Parte elétrica", "Limpeza geral"],
  "Máquina de gelo": ["Filtro de água", "Evaporador", "Condensador", "Bomba de água", "Reservatório", "Dreno", "Limpeza geral"],
  Veículo: ["Pneus", "Freios", "Óleo do motor", "Água do radiador", "Bateria", "Luzes", "Documentação", "Limpeza geral"],
  "Equipamento elétrico": ["Cabos", "Tomadas", "Disjuntores", "Aterramento", "Painel", "Aquecimento anormal", "Isolamento"],
};

export const PERGUNTAS_PADRAO = [
  "Está íntegro?",
  "Está funcionando normalmente?",
  "Existe ruído anormal?",
  "Existe vibração?",
  "Existe vazamento?",
  "Está limpo?",
];

export const MANUTENCAO_RESPONSAVEL = [
  { value: "empresa", label: "Empresa (nós)" },
  { value: "locadora", label: "Locadora / Proprietária" },
  { value: "compartilhada", label: "Compartilhada" },
];

/** Dias até o vencimento do contrato (negativo = vencido). */
export function diasParaVencimento(dataISO: string | null | undefined): number | null {
  if (!dataISO) return null;
  const d = new Date(`${dataISO.slice(0, 10)}T00:00:00`);
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  return Math.round((d.getTime() - hoje.getTime()) / 86_400_000);
}
