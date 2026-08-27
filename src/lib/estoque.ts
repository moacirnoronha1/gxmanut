import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

function throwIfError<T>(res: { data: unknown; error: { message: string } | null }): T {
  if (res.error) throw new Error(res.error.message);
  return res.data as T;
}

export type MovTipo = "entrada" | "saida" | "ajuste" | "devolucao" | "reserva" | "cancelamento_reserva";

export const MOV_LABEL: Record<MovTipo, string> = {
  entrada: "Entrada",
  saida: "Saída",
  ajuste: "Ajuste",
  devolucao: "Devolução",
  reserva: "Reserva para OS",
  cancelamento_reserva: "Cancelamento de reserva",
};

export type MetodoValoracao = "ultimo" | "medio" | "manual";

export const METODO_LABEL: Record<MetodoValoracao, string> = {
  ultimo: "Último custo de compra",
  medio: "Custo médio",
  manual: "Custo definido manualmente",
};

export const UNIDADES_ESTOQUE = ["un", "pç", "cx", "m", "m²", "kg", "L", "par", "rolo", "litro", "galão"];

export interface EstoqueCategoria {
  id: string;
  nome: string;
  ordem: number;
  sistema: boolean;
  ativo: boolean;
}

export interface EstoqueItem {
  id: string;
  nome: string;
  codigo: string | null;
  categoria_id: string | null;
  unidade: string;
  quantidade: number;
  quantidade_reservada: number;
  estoque_minimo: number;
  localizacao: string | null;
  custo_unitario: number;
  custo_medio: number;
  ultimo_custo: number | null;
  ultima_compra: string | null;
  fornecedor_id: string | null;
  foto_url: string | null;
  observacoes: string | null;
  ativo: boolean;
  criado_por: string | null;
  created_at: string;
}

export interface EstoqueMovimentacao {
  id: string;
  item_id: string;
  tipo: MovTipo;
  quantidade: number;
  saldo_anterior: number | null;
  saldo_novo: number | null;
  valor_unitario: number | null;
  valor_total: number | null;
  motivo: string | null;
  os_id: string | null;
  manutencao_id: string | null;
  equipamento_id: string | null;
  reserva_id: string | null;
  fornecedor_id: string | null;
  data: string;
  nota_numero: string | null;
  comprovante_url: string | null;
  observacao: string | null;
  usuario_id: string | null;
  created_at: string;
}

export interface EstoqueReserva {
  id: string;
  item_id: string;
  os_id: string | null;
  manutencao_id: string | null;
  quantidade: number;
  status: "ativa" | "consumida" | "cancelada";
  motivo: string | null;
  usuario_id: string | null;
  created_at: string;
}

export type FerramentaStatus =
  | "disponivel" | "em_uso" | "emprestada" | "em_manutencao" | "danificada" | "perdida";

export const FERRAMENTA_STATUS_LABEL: Record<FerramentaStatus, string> = {
  disponivel: "Disponível",
  em_uso: "Em uso",
  emprestada: "Emprestada",
  em_manutencao: "Em manutenção",
  danificada: "Danificada",
  perdida: "Perdida",
};

export const FERRAMENTA_STATUS_COR: Record<FerramentaStatus, string> = {
  disponivel: "text-emerald-600 border-emerald-600",
  em_uso: "text-sky-600 border-sky-600",
  emprestada: "text-amber-600 border-amber-600",
  em_manutencao: "text-orange-600 border-orange-600",
  danificada: "text-red-600 border-red-600",
  perdida: "text-red-700 border-red-700",
};

export interface Ferramenta {
  id: string;
  nome: string;
  codigo: string | null;
  categoria: string | null;
  marca: string | null;
  modelo: string | null;
  numero_serie: string | null;
  localizacao: string | null;
  setor_id: string | null;
  fornecedor_id: string | null;
  valor_aquisicao: number | null;
  data_aquisicao: string | null;
  status: FerramentaStatus;
  foto_url: string | null;
  observacoes: string | null;
  ativo: boolean;
  created_at: string;
}

export interface FerramentaEmprestimo {
  id: string;
  ferramenta_id: string;
  usuario_id: string | null;
  registrado_por: string | null;
  os_id: string | null;
  retirada_em: string;
  previsao_devolucao: string | null;
  devolvido_em: string | null;
  estado_devolucao: string | null;
  observacao: string | null;
}

// ---------- Queries ----------
export const estoqueCategoriasQuery = () =>
  queryOptions({
    queryKey: ["estoque_categorias"],
    queryFn: async (): Promise<EstoqueCategoria[]> =>
      throwIfError(await supabase.from("estoque_categorias").select("*").order("ordem").order("nome")),
  });

export const estoqueItensQuery = () =>
  queryOptions({
    queryKey: ["estoque_itens"],
    queryFn: async (): Promise<EstoqueItem[]> =>
      throwIfError(await supabase.from("estoque_itens").select("*").order("nome")),
  });

export const estoqueItemQuery = (id: string) =>
  queryOptions({
    queryKey: ["estoque_item", id],
    queryFn: async (): Promise<EstoqueItem | null> =>
      throwIfError(await supabase.from("estoque_itens").select("*").eq("id", id).maybeSingle()),
  });

export const estoqueMovimentacoesQuery = (itemId?: string) =>
  queryOptions({
    queryKey: ["estoque_movimentacoes", itemId ?? "todas"],
    queryFn: async (): Promise<EstoqueMovimentacao[]> => {
      let q = supabase.from("estoque_movimentacoes").select("*").order("created_at", { ascending: false }).limit(500);
      if (itemId) q = q.eq("item_id", itemId);
      return throwIfError(await q);
    },
  });

export const estoqueReservasQuery = () =>
  queryOptions({
    queryKey: ["estoque_reservas"],
    queryFn: async (): Promise<EstoqueReserva[]> =>
      throwIfError(await supabase.from("estoque_reservas").select("*").order("created_at", { ascending: false })),
  });

export const estoqueConfigQuery = () =>
  queryOptions({
    queryKey: ["estoque_config"],
    queryFn: async (): Promise<{ metodo_valoracao: MetodoValoracao }> => {
      const row = throwIfError<{ metodo_valoracao: MetodoValoracao } | null>(
        await supabase.from("estoque_config").select("metodo_valoracao").maybeSingle(),
      );
      return row ?? { metodo_valoracao: "ultimo" };
    },
  });

export const itemEquipamentosQuery = (itemId: string) =>
  queryOptions({
    queryKey: ["estoque_item_equipamentos", itemId],
    queryFn: async (): Promise<string[]> => {
      const rows = throwIfError<{ equipamento_id: string }[]>(
        await supabase.from("estoque_item_equipamentos").select("equipamento_id").eq("item_id", itemId),
      );
      return rows.map((r) => r.equipamento_id);
    },
  });

export const ferramentasQuery = () =>
  queryOptions({
    queryKey: ["ferramentas"],
    queryFn: async (): Promise<Ferramenta[]> =>
      throwIfError(await supabase.from("ferramentas").select("*").order("nome")),
  });

export const ferramentaEmprestimosQuery = () =>
  queryOptions({
    queryKey: ["ferramenta_emprestimos"],
    queryFn: async (): Promise<FerramentaEmprestimo[]> =>
      throwIfError(
        await supabase.from("ferramenta_emprestimos").select("*").order("retirada_em", { ascending: false }).limit(300),
      ),
  });

// ---------- Helpers ----------
export const disponivel = (i: EstoqueItem) => Number(i.quantidade) - Number(i.quantidade_reservada);
export const estoqueBaixo = (i: EstoqueItem) => Number(i.quantidade) <= Number(i.estoque_minimo);
export const sugestaoCompra = (i: EstoqueItem) =>
  Math.max(0, Math.ceil(Number(i.estoque_minimo) * 2 - Number(i.quantidade)));

export function custoSaida(i: EstoqueItem, metodo: MetodoValoracao): number {
  if (metodo === "medio") return Number(i.custo_medio) || Number(i.custo_unitario) || 0;
  if (metodo === "ultimo") return Number(i.ultimo_custo ?? i.custo_unitario) || 0;
  return Number(i.custo_unitario) || 0;
}

export interface MovInput {
  item_id: string;
  tipo: MovTipo;
  quantidade: number;
  motivo?: string | null;
  os_id?: string | null;
  manutencao_id?: string | null;
  equipamento_id?: string | null;
  reserva_id?: string | null;
  fornecedor_id?: string | null;
  valor_unitario?: number | null;
  data?: string | null;
  nota_numero?: string | null;
  comprovante_url?: string | null;
  observacao?: string | null;
}

/** Insere a movimentação; o banco atualiza saldo, custos, custo da OS e auditoria. */
export async function registrarMovimentacao(input: MovInput) {
  const { data: u } = await supabase.auth.getUser();
  const payload = {
    ...input,
    usuario_id: u.user?.id ?? null,
    data: input.data || new Date().toISOString().slice(0, 10),
  };
  return supabase.from("estoque_movimentacoes").insert(payload as never).select("*").maybeSingle();
}
