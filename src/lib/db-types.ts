// Tipos auxiliares para o domínio (o Database é gerado automaticamente)
export type AppRole = "mestre" | "admin" | "gestor" | "responsavel" | "tecnico";

export interface Profile {
  id: string;
  nome: string;
  email: string | null;
  telefone: string | null;
  avatar_url: string | null;
  ativo: boolean;
  username?: string | null;
  nome_completo?: string | null;
  funcao?: string | null;
  setor_id?: string | null;
  is_master?: boolean;
  must_change_password?: boolean;
  bloqueado?: boolean;
  bloqueado_ate?: string | null;
  tentativas_falhas?: number;
  ultimo_acesso?: string | null;
}

export interface Setor {
  id: string;
  nome: string;
  descricao: string | null;
  responsavel_id: string | null;
  ativo: boolean;
}

export interface Urgencia {
  id: string;
  nome: string;
  cor: string;
  ordem: number;
  prazo_horas: number | null;
  requer_confirmacao: boolean;
  alerta_sonoro: boolean;
  escalar: boolean;
  ativo: boolean;
}

export interface StatusOS {
  id: string;
  nome: string;
  cor: string;
  ordem: number;
  is_final: boolean;
  ativo: boolean;
}

export interface CategoriaProblema {
  id: string;
  nome: string;
  ativo: boolean;
}

export interface Fornecedor {
  id: string;
  nome: string;
  documento: string | null;
  telefone: string | null;
  email: string | null;
  especialidade: string | null;
  contato: string | null;
  observacoes: string | null;
  ativo: boolean;
}

export interface Equipamento {
  id: string;
  nome: string;
  codigo?: string | null;
  tipo?: string | null;
  status_id?: string | null;
  vida_util_meses?: number | null;
  estado_conservacao?: string | null;
  garantia_descricao?: string | null;
  limite_custo_percentual?: number;
  baixa_em?: string | null;
  baixa_tipo?: string | null;
  baixa_motivo?: string | null;
  baixa_destino?: string | null;
  baixa_valor?: number | null;
  baixa_usuario_id?: string | null;
  patrimonio: string | null;
  categoria: string | null;
  marca: string | null;
  modelo: string | null;
  numero_serie: string | null;
  setor_id: string | null;
  localizacao: string | null;
  data_aquisicao: string | null;
  valor_aquisicao?: number | null;
  data_instalacao: string | null;
  fornecedor_id: string | null;
  garantia_ate: string | null;
  responsavel_id: string | null;
  tecnico_id: string | null;
  frequencia_preventiva: string | null;
  proxima_manutencao: string | null;
  situacao: "ativo" | "inativo" | "em_manutencao" | "descartado";
  foto_url: string | null;
  observacoes: string | null;
  ativo: boolean;
}

export interface OS {
  id: string;
  numero: number;
  tipo: "corretiva" | "preventiva";
  titulo: string;
  descricao: string;
  categoria_id: string | null;
  setor_id: string | null;
  local: string | null;
  equipamento_id: string | null;
  equipamento_nao_cadastrado: string | null;
  solicitante_id: string;
  tecnico_id: string | null;
  urgencia_id: string | null;
  status_id: string | null;
  data_desejada: string | null;
  equipamento_parado: boolean;
  risco: string | null;
  confirmada_em: string | null;
  previsao_atendimento: string | null;
  iniciada_em: string | null;
  diagnostico: string | null;
  causa: string | null;
  correcao: string | null;
  solucao: string | null;
  materiais_utilizados: string | null;
  testes_realizados: string | null;
  resultado_testes: string | null;
  situacao_final: string | null;
  recomendacoes: string | null;
  tempo_atendimento_min: number | null;
  tempo_parado_min: number | null;
  concluida_em: string | null;
  confirmacao_solicitante: "resolvido" | "parcial" | "nao_resolvido" | null;
  avaliacao: number | null;
  avaliacao_comentario: string | null;
  reaberta_de: string | null;
  cancelada_motivo: string | null;
  created_at: string;
  updated_at: string;
}

export interface OSCusto {
  id: string;
  os_id: string;
  tipo: "peca" | "material" | "mao_obra" | "servico_externo" | "transporte" | "outro";
  descricao: string;
  quantidade: number;
  unidade: string | null;
  valor_unitario: number;
  valor_total: number;
  fornecedor_id: string | null;
  data_compra: string | null;
  forma_pagamento: string | null;
  nota_numero: string | null;
  comprovante_url: string | null;
  registrado_por: string | null;
  observacao: string | null;
  created_at: string;
}

export interface OSComentario {
  id: string;
  os_id: string;
  autor_id: string;
  mensagem: string;
  interno: boolean;
  anexo_url: string | null;
  created_at: string;
}

export interface OSHistorico {
  id: string;
  os_id: string;
  usuario_id: string | null;
  acao: string;
  detalhes: Record<string, unknown> | null;
  created_at: string;
}

export const RISCO_OPTIONS = [
  { value: "nenhum", label: "Nenhum" },
  { value: "pessoas", label: "Risco a pessoas" },
  { value: "alimentos", label: "Risco a alimentos" },
  { value: "operacao", label: "Parada de operação" },
  { value: "patrimonio", label: "Risco ao patrimônio" },
];

export const TIPO_CUSTO_OPTIONS = [
  { value: "peca", label: "Peça" },
  { value: "material", label: "Material" },
  { value: "mao_obra", label: "Mão de obra" },
  { value: "servico_externo", label: "Serviço externo" },
  { value: "transporte", label: "Transporte" },
  { value: "outro", label: "Outro" },
];

export function formatBRL(v: number | null | undefined): string {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v ?? 0);
}

export function formatDateTime(v: string | null | undefined): string {
  if (!v) return "—";
  return new Date(v).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
}

export function formatDate(v: string | null | undefined): string {
  if (!v) return "—";
  return new Date(v).toLocaleDateString("pt-BR");
}