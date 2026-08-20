import type { CustoLancamento, CustoCategoria } from "./custos";
import { grupoDoCusto } from "./custos";

export interface EquipamentoStatus {
  id: string;
  nome: string;
  cor: string;
  categoria: string;
  ordem: number;
  sistema: boolean;
  ativo: boolean;
}

export interface EquipamentoHistorico {
  id: string;
  equipamento_id: string;
  usuario_id: string | null;
  tipo: string;
  campo: string | null;
  valor_anterior: string | null;
  valor_novo: string | null;
  descricao: string | null;
  os_id: string | null;
  created_at: string;
}

export interface EquipamentoDocumento {
  id: string;
  equipamento_id: string;
  tipo: string;
  nome: string;
  url: string;
  observacao: string | null;
  autor_id: string | null;
  created_at: string;
}

export interface EquipamentoParada {
  id: string;
  equipamento_id: string;
  os_id: string | null;
  inicio: string;
  fim: string | null;
  motivo: string | null;
  observacao: string | null;
  registrado_por: string | null;
  created_at: string;
}

export const STATUS_CATEGORIAS = [
  { value: "operando", label: "Operando" },
  { value: "atencao", label: "Atenção" },
  { value: "manutencao", label: "Em manutenção" },
  { value: "parado", label: "Parado" },
  { value: "inativo", label: "Inativo / baixado" },
];

export const ESTADOS_CONSERVACAO = ["Novo", "Ótimo", "Bom", "Regular", "Ruim", "Sucata"];

export const TIPOS_DOCUMENTO = [
  { value: "foto", label: "Foto" },
  { value: "manual", label: "Manual" },
  { value: "nota_fiscal", label: "Nota fiscal" },
  { value: "certificado", label: "Certificado" },
  { value: "outro", label: "Outro documento" },
];

export const MOTIVOS_PARADA = [
  "Falha do equipamento",
  "Aguardando peça",
  "Aguardando fornecedor",
  "Manutenção preventiva",
  "Manutenção corretiva",
  "Falta de energia",
  "Outro",
];

export const HISTORICO_LABEL: Record<string, string> = {
  cadastro: "Cadastro inicial",
  setor: "Mudança de setor",
  localizacao: "Alteração de localização",
  responsavel: "Mudança de responsável",
  tecnico: "Mudança de técnico",
  status: "Mudança de status",
  situacao: "Mudança de situação",
  os_aberta: "Abertura de OS",
  os_concluida: "Manutenção realizada",
  parada: "Parada registrada",
  retorno: "Reativação / retorno",
  transferencia: "Transferência",
  desativacao: "Desativação",
  descarte: "Descarte",
  documento: "Documento anexado",
  peca: "Troca de peça",
  baixa: "Baixa do equipamento",
};

/** Horas de parada considerando o intervalo informado (paradas abertas contam até agora). */
export function horasParada(p: EquipamentoParada, ate = new Date()): number {
  const ini = new Date(p.inicio).getTime();
  const fim = p.fim ? new Date(p.fim).getTime() : ate.getTime();
  return Math.max(0, (fim - ini) / 3_600_000);
}

export function horasParadaNoPeriodo(paradas: EquipamentoParada[], desde: Date, ate = new Date()): number {
  let total = 0;
  for (const p of paradas) {
    const ini = Math.max(new Date(p.inicio).getTime(), desde.getTime());
    const fim = Math.min(p.fim ? new Date(p.fim).getTime() : ate.getTime(), ate.getTime());
    if (fim > ini) total += (fim - ini) / 3_600_000;
  }
  return total;
}

export type ClassificacaoIndice = "saudavel" | "atencao" | "alto_custo" | "substituir";

export interface IndiceManutencao {
  pontuacao: number;
  classificacao: ClassificacaoIndice;
  label: string;
  cor: string;
  motivos: string[];
  percentualCusto: number;
  idadeMeses: number | null;
  vidaUtilConsumida: number | null;
}

const CLASSIFICACAO_META: Record<ClassificacaoIndice, { label: string; cor: string }> = {
  saudavel: { label: "Saudável", cor: "text-emerald-600 border-emerald-600" },
  atencao: { label: "Atenção", cor: "text-amber-600 border-amber-600" },
  alto_custo: { label: "Alto custo", cor: "text-orange-600 border-orange-600" },
  substituir: { label: "Avaliar substituição", cor: "text-red-600 border-red-600" },
};

export function calcularIndice(params: {
  valorAquisicao: number;
  custoAcumulado: number;
  qtdOS: number;
  falhas: number;
  horasParado: number;
  dataAquisicao: string | null;
  vidaUtilMeses: number | null;
  limitePercentual: number;
}): IndiceManutencao {
  const {
    valorAquisicao, custoAcumulado, qtdOS, falhas, horasParado,
    dataAquisicao, vidaUtilMeses, limitePercentual,
  } = params;

  const percentualCusto = valorAquisicao > 0 ? (custoAcumulado / valorAquisicao) * 100 : 0;
  const idadeMeses = dataAquisicao
    ? Math.max(0, Math.round((Date.now() - new Date(dataAquisicao).getTime()) / (1000 * 60 * 60 * 24 * 30.44)))
    : null;
  const vidaUtilConsumida = vidaUtilMeses && idadeMeses !== null ? (idadeMeses / vidaUtilMeses) * 100 : null;

  const motivos: string[] = [];
  let pontos = 0;

  if (valorAquisicao > 0) {
    if (percentualCusto >= 100) { pontos += 45; motivos.push("Manutenção já superou o valor do equipamento"); }
    else if (percentualCusto >= limitePercentual) { pontos += 30; motivos.push(`Manutenção em ${percentualCusto.toFixed(0)}% do valor de aquisição`); }
    else if (percentualCusto >= limitePercentual / 2) { pontos += 15; motivos.push(`Custo acumulado em ${percentualCusto.toFixed(0)}% do valor`); }
  }
  if (falhas >= 8) { pontos += 25; motivos.push(`${falhas} falhas registradas`); }
  else if (falhas >= 4) { pontos += 15; motivos.push(`${falhas} falhas registradas`); }
  else if (falhas >= 2) { pontos += 7; }

  if (qtdOS >= 10) { pontos += 10; motivos.push(`${qtdOS} ordens de serviço no histórico`); }
  else if (qtdOS >= 5) { pontos += 5; }

  if (horasParado >= 200) { pontos += 15; motivos.push(`${horasParado.toFixed(0)} h de parada acumuladas`); }
  else if (horasParado >= 72) { pontos += 8; motivos.push(`${horasParado.toFixed(0)} h de parada acumuladas`); }

  if (vidaUtilConsumida !== null) {
    if (vidaUtilConsumida >= 100) { pontos += 20; motivos.push("Vida útil estimada ultrapassada"); }
    else if (vidaUtilConsumida >= 75) { pontos += 10; motivos.push(`${vidaUtilConsumida.toFixed(0)}% da vida útil consumida`); }
  }

  const pontuacao = Math.min(100, pontos);
  const classificacao: ClassificacaoIndice =
    pontuacao >= 65 ? "substituir" : pontuacao >= 45 ? "alto_custo" : pontuacao >= 25 ? "atencao" : "saudavel";

  if (motivos.length === 0) motivos.push("Sem indicadores críticos no momento.");

  return {
    pontuacao,
    classificacao,
    ...CLASSIFICACAO_META[classificacao],
    motivos,
    percentualCusto,
    idadeMeses,
    vidaUtilConsumida,
  };
}

export interface PecaUtilizada {
  custo: CustoLancamento;
  grupo: string;
}

export function pecasDeCustos(custos: CustoLancamento[], categorias: CustoCategoria[]): CustoLancamento[] {
  return custos.filter((c) => !c.previsto && ["peca", "material"].includes(grupoDoCusto(c, categorias)));
}

export function agruparPecas(pecas: CustoLancamento[]): { nome: string; vezes: number; quantidade: number; valor: number }[] {
  const map = new Map<string, { nome: string; vezes: number; quantidade: number; valor: number }>();
  for (const p of pecas) {
    const chave = p.descricao.trim().toLowerCase();
    const atual = map.get(chave) ?? { nome: p.descricao.trim(), vezes: 0, quantidade: 0, valor: 0 };
    atual.vezes += 1;
    atual.quantidade += Number(p.quantidade ?? 0);
    atual.valor += Number(p.valor_total ?? 0);
    map.set(chave, atual);
  }
  return [...map.values()].sort((a, b) => b.vezes - a.vezes || b.valor - a.valor);
}

export function diasEntre(dataISO: string | null | undefined): number | null {
  if (!dataISO) return null;
  const d = new Date(`${dataISO.slice(0, 10)}T00:00:00`);
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  return Math.round((d.getTime() - hoje.getTime()) / 86_400_000);
}
