export type CustoGrupo =
  | "peca" | "material" | "mao_obra_interna" | "mao_obra_externa"
  | "servico_terceiro" | "transporte" | "locacao" | "ferramenta" | "taxa" | "outro";

export type CustoNatureza = "desembolso" | "interno";
export type CustoOrigem = "compra" | "estoque" | "mao_obra_interna" | "servico_externo" | "outro";
export type CustoComprovacao =
  | "com_comprovante" | "sem_comprovante" | "pendente" | "em_conferencia" | "conferido" | "divergente";

export interface CustoCategoria {
  id: string;
  nome: string;
  grupo: CustoGrupo;
  natureza_padrao: CustoNatureza;
  ordem: number;
  sistema: boolean;
  ativo: boolean;
}

export interface CustoLancamento {
  id: string;
  os_id: string;
  tipo: string;
  categoria_id: string | null;
  equipamento_id: string | null;
  descricao: string;
  quantidade: number;
  unidade: string | null;
  valor_unitario: number;
  valor_total: number;
  natureza: CustoNatureza;
  origem: CustoOrigem;
  comprovacao: CustoComprovacao;
  previsto: boolean;
  prestador: string | null;
  tecnico_id: string | null;
  comprador_id: string | null;
  hora_inicio: string | null;
  hora_fim: string | null;
  fornecedor_id: string | null;
  data_compra: string | null;
  forma_pagamento: string | null;
  nota_numero: string | null;
  registrado_por: string | null;
  observacao: string | null;
  created_at: string;
}

export interface CustoEvidencia {
  id: string;
  custo_id: string;
  tipo: string;
  nome: string;
  url: string;
  observacao: string | null;
  autor_id: string | null;
  created_at: string;
}

export const GRUPO_LABEL: Record<CustoGrupo, string> = {
  peca: "Peças",
  material: "Materiais",
  mao_obra_interna: "Mão de obra interna",
  mao_obra_externa: "Mão de obra externa",
  servico_terceiro: "Serviços terceiros",
  transporte: "Transporte / deslocamento",
  locacao: "Locação",
  ferramenta: "Ferramentas",
  taxa: "Taxas",
  outro: "Outros",
};

export const GRUPO_OPTIONS = (Object.keys(GRUPO_LABEL) as CustoGrupo[]).map((g) => ({ value: g, label: GRUPO_LABEL[g] }));

export const COMPROVACAO_LABEL: Record<CustoComprovacao, string> = {
  com_comprovante: "Com comprovante",
  sem_comprovante: "Sem comprovante",
  pendente: "Comprovante pendente",
  em_conferencia: "Em conferência",
  conferido: "Conferido",
  divergente: "Divergente",
};

export const COMPROVACAO_OPTIONS = (Object.keys(COMPROVACAO_LABEL) as CustoComprovacao[])
  .map((v) => ({ value: v, label: COMPROVACAO_LABEL[v] }));

export const COMPROVACAO_COR: Record<CustoComprovacao, string> = {
  com_comprovante: "text-emerald-600 border-emerald-600",
  conferido: "text-emerald-700 border-emerald-700",
  sem_comprovante: "text-muted-foreground",
  pendente: "text-amber-600 border-amber-600",
  em_conferencia: "text-sky-600 border-sky-600",
  divergente: "text-red-600 border-red-600",
};

export const ORIGEM_LABEL: Record<CustoOrigem, string> = {
  compra: "Compra (desembolso)",
  estoque: "Material do estoque",
  mao_obra_interna: "Mão de obra interna",
  servico_externo: "Serviço externo",
  outro: "Outro",
};

export const EVIDENCIA_TIPOS = [
  "Nota fiscal", "Cupom", "Recibo", "Orçamento aprovado", "Comprovante de PIX",
  "Comprovante de transferência", "Boleto", "Fatura", "Ordem de compra",
  "Foto do produto", "Contrato", "Recibo do prestador", "Documento do fornecedor", "Outro comprovante",
];

export const FORMAS_PAGAMENTO = [
  "Dinheiro", "PIX", "Cartão de débito", "Cartão de crédito", "Boleto",
  "Transferência", "Faturado", "Não se aplica",
];

export const UNIDADES = ["un", "pç", "cx", "m", "m²", "kg", "L", "h", "serviço", "verba"];

export interface ResumoCusto {
  total: number;
  desembolso: number;
  interno: number;
  previsto: number;
  comprovado: number;
  semComprovante: number;
  porGrupo: Record<CustoGrupo, number>;
  materiaisPecas: number;
  maoObra: number;
  servicosExternos: number;
  estoque: number;
  maoObraInterna: number;
  lancamentos: number;
}

export function grupoDoCusto(c: CustoLancamento, categorias: CustoCategoria[]): CustoGrupo {
  const cat = categorias.find((k) => k.id === c.categoria_id);
  if (cat) return cat.grupo;
  const t = (c.tipo ?? "") as string;
  if (t === "peca") return "peca";
  if (t === "material") return "material";
  if (t === "mao_obra") return "mao_obra_interna";
  if (t === "servico_externo") return "servico_terceiro";
  if (t === "transporte") return "transporte";
  return "outro";
}

export function resumirCustos(custos: CustoLancamento[], categorias: CustoCategoria[]): ResumoCusto {
  const porGrupo = Object.fromEntries(
    (Object.keys(GRUPO_LABEL) as CustoGrupo[]).map((g) => [g, 0]),
  ) as Record<CustoGrupo, number>;

  const r: ResumoCusto = {
    total: 0, desembolso: 0, interno: 0, previsto: 0, comprovado: 0, semComprovante: 0,
    porGrupo, materiaisPecas: 0, maoObra: 0, servicosExternos: 0, estoque: 0, maoObraInterna: 0,
    lancamentos: 0,
  };

  for (const c of custos) {
    const v = Number(c.valor_total ?? 0);
    if (c.previsto) { r.previsto += v; continue; }
    r.lancamentos += 1;
    r.total += v;
    if (c.natureza === "interno") r.interno += v; else r.desembolso += v;
    if (c.comprovacao === "com_comprovante" || c.comprovacao === "conferido") r.comprovado += v;
    else r.semComprovante += v;
    if (c.origem === "estoque") r.estoque += v;
    if (c.origem === "mao_obra_interna") r.maoObraInterna += v;

    const g = grupoDoCusto(c, categorias);
    porGrupo[g] += v;
  }

  r.materiaisPecas = porGrupo.peca + porGrupo.material + porGrupo.ferramenta;
  r.maoObra = porGrupo.mao_obra_interna + porGrupo.mao_obra_externa;
  r.servicosExternos = porGrupo.servico_terceiro;
  return r;
}

/** Horas entre dois horários HH:MM (suporta virada de dia). */
export function horasEntre(inicio: string, fim: string): number {
  const p = (v: string) => {
    const [h, m] = v.split(":").map(Number);
    return (h || 0) * 60 + (m || 0);
  };
  let d = p(fim) - p(inicio);
  if (d < 0) d += 24 * 60;
  return Math.round((d / 60) * 100) / 100;
}
