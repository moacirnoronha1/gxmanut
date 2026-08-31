import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { equipamentosQuery, setoresQuery, profilesQuery, fornecedoresQuery, ordensQuery, custoCategoriasQuery } from "@/lib/queries";
import { equipamentoStatusQuery, custosComEquipamentoQuery, paradasTodasQuery } from "@/lib/equip-queries";
import { manutencoesQuery } from "@/lib/mp-queries";
import { EquipamentoStatusConfig } from "@/components/equipamento-status-config";
import { calcularIndice, horasParada, diasEntre, ESTADOS_CONSERVACAO } from "@/lib/equipamentos";
import { propriedadeTiposQuery } from "@/lib/checklist-queries";
import { MANUTENCAO_RESPONSAVEL, diasParaVencimento } from "@/lib/checklists";
import { formatBRL, formatDate } from "@/lib/db-types";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { showDbError } from "@/lib/db-error";
import { Settings2, QrCode } from "lucide-react";

export const Route = createFileRoute("/_authenticated/equipamentos/")({
  head: () => ({
    meta: [
      { title: "Equipamentos — Manutenção Xica da Silva" },
      { name: "description", content: "Ficha de vida completa dos equipamentos: localização, status, custos, falhas e manutenções." },
      { property: "og:title", content: "Equipamentos — Manutenção Xica da Silva" },
      { property: "og:description", content: "Gestão completa do ciclo de vida dos equipamentos." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Equipamentos,
});

const FILTROS = [
  { value: "todos", label: "Todos" },
  { value: "operando", label: "Em funcionamento" },
  { value: "manutencao", label: "Em manutenção" },
  { value: "parado", label: "Parados" },
  { value: "peca", label: "Aguardando peça" },
  { value: "atrasada", label: "Preventiva atrasada" },
  { value: "custo", label: "Alto custo" },
  { value: "falhas", label: "Muitas falhas" },
  { value: "garantia", label: "Garantia vencendo" },
  { value: "inativos", label: "Desativados" },
];

const EMPTY_FORM = {
  nome: "", codigo: "", patrimonio: "", categoria: "", tipo: "", marca: "", modelo: "", numero_serie: "",
  setor_id: "none", localizacao: "", responsavel_id: "none", tecnico_id: "none",
  data_aquisicao: "", data_instalacao: "", valor_aquisicao: "", fornecedor_id: "none",
  garantia_descricao: "", garantia_ate: "", vida_util_meses: "", estado_conservacao: "none",
  status_id: "none", limite_custo_percentual: "60", observacoes: "",
  propriedade_tipo_id: "", nota_fiscal: "", prop_empresa: "", prop_contrato_numero: "",
  prop_contrato_inicio: "", prop_contrato_fim: "", prop_valor_mensal: "", prop_responsavel_id: "none",
  prop_manutencao_por: "none", prop_telefone: "", prop_condicoes: "", prop_observacoes: "",
};

function Equipamentos() {
  const qc = useQueryClient();
  const { data: equipamentos = [] } = useQuery(equipamentosQuery());
  const { data: setores = [] } = useQuery(setoresQuery());
  const { data: pessoas = [] } = useQuery(profilesQuery());
  const { data: fornecedores = [] } = useQuery(fornecedoresQuery());
  const { data: status = [] } = useQuery(equipamentoStatusQuery());
  const { data: ordens = [] } = useQuery(ordensQuery());
  const { data: custos = [] } = useQuery(custosComEquipamentoQuery());
  const { data: paradas = [] } = useQuery(paradasTodasQuery());
  const { data: manutencoes = [] } = useQuery(manutencoesQuery());
  useQuery(custoCategoriasQuery());

  const [q, setQ] = useState("");
  const [filtro, setFiltro] = useState("todos");
  const [setorFiltro, setSetorFiltro] = useState("todos");
  const [statusFiltro, setStatusFiltro] = useState("todos");
  const [open, setOpen] = useState(false);
  const [configOpen, setConfigOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);

  const { data: propTipos = [] } = useQuery(propriedadeTiposQuery());
  const chaveProp = propTipos.find((t) => t.id === form.propriedade_tipo_id)?.chave ?? "";

  const statusMap = useMemo(() => new Map(status.map((s) => [s.id, s])), [status]);

  const metricas = useMemo(() => {
    const map = new Map<string, {
      custo: number; os: number; falhas: number; horasParado: number;
      ultima: string | null; proxima: string | null; atrasada: boolean;
    }>();
    for (const e of equipamentos) {
      map.set(e.id, { custo: 0, os: 0, falhas: 0, horasParado: 0, ultima: null, proxima: null, atrasada: false });
    }
    for (const c of custos) {
      if (c.previsto || !c._equipamento_id) continue;
      const m = map.get(c._equipamento_id);
      if (m) m.custo += Number(c.valor_total ?? 0);
    }
    for (const o of ordens) {
      if (!o.equipamento_id) continue;
      const m = map.get(o.equipamento_id);
      if (!m) continue;
      m.os += 1;
      if (o.tipo === "corretiva") m.falhas += 1;
      if (o.concluida_em && (!m.ultima || o.concluida_em > m.ultima)) m.ultima = o.concluida_em;
    }
    for (const p of paradas) {
      const m = map.get(p.equipamento_id);
      if (m) m.horasParado += horasParada(p);
    }
    for (const mp of manutencoes) {
      if (!mp.equipamento_id) continue;
      const m = map.get(mp.equipamento_id);
      if (!m || !mp.proxima_execucao) continue;
      if (!m.proxima || mp.proxima_execucao < m.proxima) m.proxima = mp.proxima_execucao;
      const d = diasEntre(mp.proxima_execucao);
      if (d !== null && d < 0) m.atrasada = true;
    }
    return map;
  }, [equipamentos, custos, ordens, paradas, manutencoes]);

  const indices = useMemo(() => {
    const map = new Map<string, ReturnType<typeof calcularIndice>>();
    for (const e of equipamentos) {
      const m = metricas.get(e.id);
      map.set(e.id, calcularIndice({
        valorAquisicao: Number(e.valor_aquisicao ?? 0),
        custoAcumulado: m?.custo ?? 0,
        qtdOS: m?.os ?? 0,
        falhas: m?.falhas ?? 0,
        horasParado: m?.horasParado ?? 0,
        dataAquisicao: e.data_aquisicao,
        vidaUtilMeses: e.vida_util_meses ?? null,
        limitePercentual: e.limite_custo_percentual ?? 60,
      }));
    }
    return map;
  }, [equipamentos, metricas]);

  const filtered = equipamentos.filter((e) => {
    const termo = q.trim().toLowerCase();
    const st = statusMap.get(e.status_id ?? "");
    const setor = setores.find((s) => s.id === e.setor_id);
    const resp = pessoas.find((p) => p.id === e.responsavel_id);
    if (termo) {
      const alvo = [e.nome, e.codigo, e.patrimonio, e.marca, e.modelo, e.numero_serie, e.localizacao,
        e.categoria, e.tipo, setor?.nome, resp?.nome, st?.nome].filter(Boolean).join(" ").toLowerCase();
      if (!alvo.includes(termo)) return false;
    }
    if (setorFiltro !== "todos" && e.setor_id !== setorFiltro) return false;
    if (statusFiltro !== "todos" && e.status_id !== statusFiltro) return false;

    const m = metricas.get(e.id);
    const idx = indices.get(e.id);
    const gDias = diasEntre(e.garantia_ate);
    switch (filtro) {
      case "operando": return st?.categoria === "operando";
      case "manutencao": return st?.categoria === "manutencao";
      case "parado": return st?.categoria === "parado";
      case "peca": return (st?.nome ?? "").toLowerCase().includes("peça");
      case "atrasada": return !!m?.atrasada;
      case "custo": return (idx?.classificacao === "alto_custo" || idx?.classificacao === "substituir");
      case "falhas": return (m?.falhas ?? 0) >= 3;
      case "garantia": return gDias !== null && gDias >= 0 && gDias <= 60;
      case "inativos": return st?.categoria === "inativo";
      default: return true;
    }
  });

  const kpis = useMemo(() => {
    const cat = (e: { status_id?: string | null }) => statusMap.get(e.status_id ?? "")?.categoria;
    return {
      total: equipamentos.length,
      ativos: equipamentos.filter((e) => cat(e) === "operando").length,
      parados: equipamentos.filter((e) => cat(e) === "parado").length,
      emManutencao: equipamentos.filter((e) => cat(e) === "manutencao").length,
      atrasadas: equipamentos.filter((e) => metricas.get(e.id)?.atrasada).length,
      garantia: equipamentos.filter((e) => { const d = diasEntre(e.garantia_ate); return d !== null && d >= 0 && d <= 60; }).length,
      substituir: equipamentos.filter((e) => indices.get(e.id)?.classificacao === "substituir").length,
    };
  }, [equipamentos, statusMap, metricas, indices]);

  const topCusto = [...equipamentos].sort((a, b) => (metricas.get(b.id)?.custo ?? 0) - (metricas.get(a.id)?.custo ?? 0)).slice(0, 3);
  const topFalhas = [...equipamentos].sort((a, b) => (metricas.get(b.id)?.falhas ?? 0) - (metricas.get(a.id)?.falhas ?? 0)).slice(0, 3);
  const topParado = [...equipamentos].sort((a, b) => (metricas.get(b.id)?.horasParado ?? 0) - (metricas.get(a.id)?.horasParado ?? 0)).slice(0, 3);

  async function save() {
    if (!form.nome.trim()) return toast.error("Informe o nome.");
    if (!form.propriedade_tipo_id) return toast.error("Informe o tipo de propriedade.");
    const nn = (v: string) => (v.trim() === "" ? null : v.trim());
    const sel = (v: string) => (v === "none" ? null : v);
    const num = (v: string) => { const n = Number(v.replace(",", ".")); return Number.isFinite(n) && v.trim() !== "" ? n : null; };
    const payload = {
      propriedade_tipo_id: form.propriedade_tipo_id,
      nota_fiscal: nn(form.nota_fiscal),
      prop_empresa: nn(form.prop_empresa),
      prop_contrato_numero: nn(form.prop_contrato_numero),
      prop_contrato_inicio: nn(form.prop_contrato_inicio),
      prop_contrato_fim: nn(form.prop_contrato_fim),
      prop_valor_mensal: num(form.prop_valor_mensal),
      prop_responsavel_id: sel(form.prop_responsavel_id),
      prop_manutencao_por: sel(form.prop_manutencao_por),
      prop_telefone: nn(form.prop_telefone),
      prop_condicoes: nn(form.prop_condicoes),
      prop_observacoes: nn(form.prop_observacoes),
      nome: form.nome.trim(),
      codigo: nn(form.codigo),
      patrimonio: nn(form.patrimonio),
      categoria: nn(form.categoria),
      tipo: nn(form.tipo),
      marca: nn(form.marca),
      modelo: nn(form.modelo),
      numero_serie: nn(form.numero_serie),
      setor_id: sel(form.setor_id),
      localizacao: nn(form.localizacao),
      responsavel_id: sel(form.responsavel_id),
      tecnico_id: sel(form.tecnico_id),
      data_aquisicao: nn(form.data_aquisicao),
      data_instalacao: nn(form.data_instalacao),
      valor_aquisicao: num(form.valor_aquisicao),
      fornecedor_id: sel(form.fornecedor_id),
      garantia_descricao: nn(form.garantia_descricao),
      garantia_ate: nn(form.garantia_ate),
      vida_util_meses: num(form.vida_util_meses),
      estado_conservacao: sel(form.estado_conservacao),
      status_id: sel(form.status_id) ?? status.find((s) => s.categoria === "operando" && s.ativo)?.id ?? null,
      limite_custo_percentual: num(form.limite_custo_percentual) ?? 60,
      observacoes: nn(form.observacoes),
    };
    const { error } = await supabase.from("equipamentos").insert(payload);
    if (error) return showDbError(error);
    setOpen(false);
    setForm(EMPTY_FORM);
    await qc.invalidateQueries({ queryKey: ["equipamentos"] });
    toast.success("Equipamento cadastrado.");
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Equipamentos</h1>
          <p className="text-sm text-muted-foreground">Ficha de vida completa de cada equipamento</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setConfigOpen(true)}><Settings2 className="mr-2 size-4" />Status</Button>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild><Button>+ Novo equipamento</Button></DialogTrigger>
            <DialogContent className="max-w-3xl max-h-[85vh] overflow-auto">
              <DialogHeader><DialogTitle>Novo equipamento</DialogTitle></DialogHeader>
              <div className="grid gap-3 sm:grid-cols-2">
                <Campo label="Nome *" className="sm:col-span-2"><Input value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} /></Campo>
                <Campo label="Código interno"><Input value={form.codigo} onChange={(e) => setForm({ ...form, codigo: e.target.value })} /></Campo>
                <Campo label="Nº de patrimônio"><Input value={form.patrimonio} onChange={(e) => setForm({ ...form, patrimonio: e.target.value })} /></Campo>
                <Campo label="Categoria"><Input value={form.categoria} onChange={(e) => setForm({ ...form, categoria: e.target.value })} /></Campo>
                <Campo label="Tipo de item">
                  <Selecao value={form.tipo || "none"} onChange={(v) => setForm({ ...form, tipo: v === "none" ? "" : v })}
                    itens={[{ value: "Equipamento", label: "Equipamento" }, { value: "Instalação", label: "Instalação" }]} vazio="Não informado" />
                </Campo>

                <Campo label="Tipo de propriedade *" className="sm:col-span-2">
                  <Selecao value={form.propriedade_tipo_id || "none"}
                    onChange={(v) => setForm({ ...form, propriedade_tipo_id: v === "none" ? "" : v })}
                    itens={propTipos.filter((t) => t.ativo).map((t) => ({ value: t.id, label: t.nome }))}
                    vazio="Selecione (obrigatório)" />
                </Campo>

                {chaveProp === "proprio" && (
                  <Campo label="Nota fiscal" className="sm:col-span-2">
                    <Input placeholder="Número ou link da NF" value={form.nota_fiscal} onChange={(e) => setForm({ ...form, nota_fiscal: e.target.value })} />
                  </Campo>
                )}

                {(chaveProp === "alugado" || chaveProp === "consignado") && (
                  <>
                    <Campo label={chaveProp === "alugado" ? "Empresa locadora" : "Empresa proprietária"}>
                      <Input value={form.prop_empresa} onChange={(e) => setForm({ ...form, prop_empresa: e.target.value })} />
                    </Campo>
                    <Campo label="Número do contrato / documento">
                      <Input value={form.prop_contrato_numero} onChange={(e) => setForm({ ...form, prop_contrato_numero: e.target.value })} />
                    </Campo>
                    <Campo label="Data de início">
                      <Input type="date" value={form.prop_contrato_inicio} onChange={(e) => setForm({ ...form, prop_contrato_inicio: e.target.value })} />
                    </Campo>
                    {chaveProp === "alugado" && (
                      <>
                        <Campo label="Data final">
                          <Input type="date" value={form.prop_contrato_fim} onChange={(e) => setForm({ ...form, prop_contrato_fim: e.target.value })} />
                        </Campo>
                        <Campo label="Valor mensal (R$)">
                          <Input inputMode="decimal" value={form.prop_valor_mensal} onChange={(e) => setForm({ ...form, prop_valor_mensal: e.target.value })} />
                        </Campo>
                      </>
                    )}
                    <Campo label="Responsável pelo contrato">
                      <Selecao value={form.prop_responsavel_id} onChange={(v) => setForm({ ...form, prop_responsavel_id: v })}
                        itens={pessoas.map((p) => ({ value: p.id, label: p.nome }))} vazio="Não definido" />
                    </Campo>
                    <Campo label="Manutenção é responsabilidade de">
                      <Selecao value={form.prop_manutencao_por} onChange={(v) => setForm({ ...form, prop_manutencao_por: v })}
                        itens={MANUTENCAO_RESPONSAVEL} vazio="Não definido" />
                    </Campo>
                    <Campo label="Telefone de contato">
                      <Input value={form.prop_telefone} onChange={(e) => setForm({ ...form, prop_telefone: e.target.value })} />
                    </Campo>
                    <Campo label={chaveProp === "alugado" ? "Documentos (link)" : "Contrato / documento (link)"}>
                      <Input value={form.nota_fiscal} onChange={(e) => setForm({ ...form, nota_fiscal: e.target.value })} />
                    </Campo>
                    {chaveProp === "consignado" && (
                      <Campo label="Condições da consignação" className="sm:col-span-2">
                        <Textarea value={form.prop_condicoes} onChange={(e) => setForm({ ...form, prop_condicoes: e.target.value })} />
                      </Campo>
                    )}
                    <Campo label="Observações da propriedade" className="sm:col-span-2">
                      <Textarea value={form.prop_observacoes} onChange={(e) => setForm({ ...form, prop_observacoes: e.target.value })} />
                    </Campo>
                  </>
                )}


                <Campo label="Marca"><Input value={form.marca} onChange={(e) => setForm({ ...form, marca: e.target.value })} /></Campo>
                <Campo label="Modelo"><Input value={form.modelo} onChange={(e) => setForm({ ...form, modelo: e.target.value })} /></Campo>
                <Campo label="Número de série"><Input value={form.numero_serie} onChange={(e) => setForm({ ...form, numero_serie: e.target.value })} /></Campo>
                <Campo label="Setor">
                  <Selecao value={form.setor_id} onChange={(v) => setForm({ ...form, setor_id: v })}
                    itens={setores.map((s) => ({ value: s.id, label: s.nome }))} vazio="Sem setor" />
                </Campo>
                <Campo label="Localização"><Input value={form.localizacao} onChange={(e) => setForm({ ...form, localizacao: e.target.value })} /></Campo>
                <Campo label="Responsável">
                  <Selecao value={form.responsavel_id} onChange={(v) => setForm({ ...form, responsavel_id: v })}
                    itens={pessoas.map((p) => ({ value: p.id, label: p.nome }))} vazio="Sem responsável" />
                </Campo>
                <Campo label="Técnico responsável">
                  <Selecao value={form.tecnico_id} onChange={(v) => setForm({ ...form, tecnico_id: v })}
                    itens={pessoas.map((p) => ({ value: p.id, label: p.nome }))} vazio="Sem técnico" />
                </Campo>
                <Campo label="Data de aquisição"><Input type="date" value={form.data_aquisicao} onChange={(e) => setForm({ ...form, data_aquisicao: e.target.value })} /></Campo>
                <Campo label="Data de instalação"><Input type="date" value={form.data_instalacao} onChange={(e) => setForm({ ...form, data_instalacao: e.target.value })} /></Campo>
                <Campo label="Valor de aquisição (R$)"><Input inputMode="decimal" value={form.valor_aquisicao} onChange={(e) => setForm({ ...form, valor_aquisicao: e.target.value })} /></Campo>
                <Campo label="Fornecedor">
                  <Selecao value={form.fornecedor_id} onChange={(v) => setForm({ ...form, fornecedor_id: v })}
                    itens={fornecedores.map((f) => ({ value: f.id, label: f.nome }))} vazio="Sem fornecedor" />
                </Campo>
                <Campo label="Garantia"><Input placeholder="Ex.: 12 meses balcão" value={form.garantia_descricao} onChange={(e) => setForm({ ...form, garantia_descricao: e.target.value })} /></Campo>
                <Campo label="Garantia até"><Input type="date" value={form.garantia_ate} onChange={(e) => setForm({ ...form, garantia_ate: e.target.value })} /></Campo>
                <Campo label="Vida útil estimada (meses)"><Input inputMode="numeric" value={form.vida_util_meses} onChange={(e) => setForm({ ...form, vida_util_meses: e.target.value })} /></Campo>
                <Campo label="Estado de conservação">
                  <Selecao value={form.estado_conservacao} onChange={(v) => setForm({ ...form, estado_conservacao: v })}
                    itens={ESTADOS_CONSERVACAO.map((v) => ({ value: v, label: v }))} vazio="Não informado" />
                </Campo>
                <Campo label="Situação atual">
                  <Selecao value={form.status_id} onChange={(v) => setForm({ ...form, status_id: v })}
                    itens={status.filter((s) => s.ativo).map((s) => ({ value: s.id, label: s.nome }))} vazio="Operando normalmente" />
                </Campo>
                <Campo label="Alerta de custo acima de (%)"><Input inputMode="numeric" value={form.limite_custo_percentual} onChange={(e) => setForm({ ...form, limite_custo_percentual: e.target.value })} /></Campo>
                <Campo label="Observações" className="sm:col-span-2"><Textarea value={form.observacoes} onChange={(e) => setForm({ ...form, observacoes: e.target.value })} /></Campo>
              </div>
              <div className="flex justify-end pt-2"><Button onClick={save}>Salvar equipamento</Button></div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="grid gap-2 grid-cols-2 md:grid-cols-4 lg:grid-cols-7">
        <Kpi label="Total" value={kpis.total} />
        <Kpi label="Operando" value={kpis.ativos} />
        <Kpi label="Em manutenção" value={kpis.emManutencao} />
        <Kpi label="Parados" value={kpis.parados} />
        <Kpi label="Preventiva atrasada" value={kpis.atrasadas} />
        <Kpi label="Garantia vencendo" value={kpis.garantia} />
        <Kpi label="Avaliar substituição" value={kpis.substituir} />
      </div>

      <div className="grid gap-2 md:grid-cols-3">
        <Ranking titulo="Maior custo" itens={topCusto.map((e) => ({ id: e.id, nome: e.nome, valor: formatBRL(metricas.get(e.id)?.custo ?? 0) }))} />
        <Ranking titulo="Mais falhas" itens={topFalhas.map((e) => ({ id: e.id, nome: e.nome, valor: `${metricas.get(e.id)?.falhas ?? 0} falhas` }))} />
        <Ranking titulo="Mais tempo parado" itens={topParado.map((e) => ({ id: e.id, nome: e.nome, valor: `${(metricas.get(e.id)?.horasParado ?? 0).toFixed(1)} h` }))} />
      </div>

      <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_180px_200px]">
        <Input placeholder="Buscar por nome, código, patrimônio, série, marca, setor…" value={q} onChange={(e) => setQ(e.target.value)} />
        <Selecao value={setorFiltro} onChange={setSetorFiltro} itens={setores.map((s) => ({ value: s.id, label: s.nome }))} vazio="Todos os setores" valorVazio="todos" />
        <Selecao value={statusFiltro} onChange={setStatusFiltro} itens={status.map((s) => ({ value: s.id, label: s.nome }))} vazio="Todos os status" valorVazio="todos" />
      </div>

      <div className="flex flex-wrap gap-2">
        {FILTROS.map((f) => (
          <Button key={f.value} size="sm" variant={filtro === f.value ? "default" : "outline"} onClick={() => setFiltro(f.value)}>
            {f.label}
          </Button>
        ))}
      </div>

      <Card>
        <CardContent className="p-0 divide-y">
          {filtered.length === 0 && <div className="p-6 text-center text-sm text-muted-foreground">Nenhum equipamento encontrado.</div>}
          {filtered.map((e) => {
            const set = setores.find((s) => s.id === e.setor_id);
            const st = statusMap.get(e.status_id ?? "");
            const m = metricas.get(e.id);
            const idx = indices.get(e.id);
            return (
              <Link key={e.id} to="/equipamentos/$id" params={{ id: e.id }} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 p-3 hover:bg-muted/50">
                <div className="min-w-0">
                  <div className="font-medium truncate">
                    {e.nome}
                    {e.codigo && <span className="ml-2 font-mono text-xs text-muted-foreground">{e.codigo}</span>}
                    {e.patrimonio && <span className="ml-2 text-xs text-muted-foreground">· {e.patrimonio}</span>}
                  </div>
                  <div className="text-xs text-muted-foreground truncate">
                    {[e.marca, e.modelo, set?.nome, e.localizacao].filter(Boolean).join(" · ") || "—"}
                  </div>
                  <div className="mt-1 flex flex-wrap gap-2 text-[11px] text-muted-foreground">
                    <span>{m?.os ?? 0} OS</span>
                    <span>{formatBRL(m?.custo ?? 0)}</span>
                    <span>{(m?.horasParado ?? 0).toFixed(1)} h parado</span>
                    {m?.proxima && <span>Próxima: {formatDate(m.proxima)}</span>}
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1">
                  {st && <Badge variant="outline" style={{ borderColor: st.cor, color: st.cor }}>{st.nome}</Badge>}
                  {idx && <Badge variant="outline" className={idx.cor}>{idx.label}</Badge>}
                  {(() => {
                    const pt = propTipos.find((t) => t.id === (e as { propriedade_tipo_id?: string | null }).propriedade_tipo_id);
                    const d = diasParaVencimento((e as { prop_contrato_fim?: string | null }).prop_contrato_fim ?? null);
                    return (
                      <>
                        {pt && <Badge variant="secondary">{pt.nome}</Badge>}
                        {d !== null && d <= 30 && (
                          <Badge variant="destructive">{d < 0 ? "Contrato vencido" : `Contrato vence em ${d} d`}</Badge>
                        )}
                      </>
                    );
                  })()}
                </div>
              </Link>
            );
          })}
        </CardContent>
      </Card>

      <p className="flex items-center gap-2 text-xs text-muted-foreground">
        <QrCode className="size-4" /> Abra um equipamento para gerar e imprimir o QR Code de identificação.
      </p>

      <EquipamentoStatusConfig open={configOpen} onOpenChange={setConfigOpen} />
    </div>
  );
}

function Campo({ label, children, className }: { label: string; children: React.ReactNode; className?: string }) {
  return <div className={className}><Label className="text-xs">{label}</Label>{children}</div>;
}

export function Selecao({
  value, onChange, itens, vazio, valorVazio = "none",
}: { value: string; onChange: (v: string) => void; itens: { value: string; label: string }[]; vazio: string; valorVazio?: string }) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger><SelectValue placeholder={vazio} /></SelectTrigger>
      <SelectContent>
        <SelectItem value={valorVazio}>{vazio}</SelectItem>
        {itens.map((i) => <SelectItem key={i.value} value={i.value}>{i.label}</SelectItem>)}
      </SelectContent>
    </Select>
  );
}

function Kpi({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-md border p-2">
      <div className="text-[11px] uppercase text-muted-foreground truncate">{label}</div>
      <div className="text-xl font-bold">{value}</div>
    </div>
  );
}

function Ranking({ titulo, itens }: { titulo: string; itens: { id: string; nome: string; valor: string }[] }) {
  return (
    <Card>
      <CardContent className="p-3">
        <div className="text-xs uppercase text-muted-foreground mb-1">{titulo}</div>
        {itens.length === 0 && <div className="text-sm text-muted-foreground">—</div>}
        {itens.map((i) => (
          <Link key={i.id} to="/equipamentos/$id" params={{ id: i.id }} className="flex justify-between gap-2 py-0.5 text-sm hover:underline">
            <span className="truncate">{i.nome}</span>
            <span className="font-medium shrink-0">{i.valor}</span>
          </Link>
        ))}
      </CardContent>
    </Card>
  );
}
