import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ordensQuery, statusOsQuery, urgenciasQuery, setoresQuery, equipamentosQuery } from "@/lib/queries";
import { minhasEquipesQuery, tempoEmAberto, nivelUrgencia } from "@/lib/equipe-os";
import { useSessaoUsuario } from "@/lib/sessao";
import { formatDateTime } from "@/lib/db-types";
import { AlertTriangle } from "lucide-react";

export const Route = createFileRoute("/_authenticated/ordens/")({
  head: () => ({
    meta: [
      { title: "Ordens de Serviço — Manutenção Xica da Silva" },
      { name: "description", content: "OS disponíveis para todos os técnicos, minhas OS e histórico completo." },
    ],
  }),
  component: OrdensList,
});

type Aba = "disponiveis" | "minhas" | "todas";

function OrdensList() {
  const { data: ordens = [] } = useQuery(ordensQuery());
  const { data: status = [] } = useQuery(statusOsQuery());
  const { data: urgencias = [] } = useQuery(urgenciasQuery());
  const { data: setores = [] } = useQuery(setoresQuery());
  const { data: equipamentos = [] } = useQuery(equipamentosQuery());
  const { data: minhasEquipes = [] } = useQuery(minhasEquipesQuery());
  const { perfil } = useSessaoUsuario();
  const meuId = perfil?.id ?? "";

  const [aba, setAba] = useState<Aba>("disponiveis");
  const [q, setQ] = useState("");
  const [statusF, setStatusF] = useState<string>("all");
  const [urgF, setUrgF] = useState<string>("all");
  const [setorF, setSetorF] = useState<string>("all");

  const statusMap = new Map(status.map((s) => [s.id, s]));
  const urgMap = new Map(urgencias.map((u) => [u.id, u]));
  const setorMap = new Map(setores.map((s) => [s.id, s]));
  const eqMap = new Map(equipamentos.map((e) => [e.id, e]));

  const concluidaOuCancelada = (statusId: string | null) => {
    const n = (statusMap.get(statusId ?? "")?.nome ?? "").toLowerCase();
    return n.includes("conclu") || n.includes("cancel");
  };

  const disponiveis = useMemo(
    () => ordens.filter((o) => !o.assumida_por && !o.tecnico_id && !o.concluida_em && !concluidaOuCancelada(o.status_id)),
    [ordens, status],
  );
  const minhas = useMemo(
    () => ordens.filter((o) => o.assumida_por === meuId || o.tecnico_id === meuId || minhasEquipes.includes(o.id)),
    [ordens, meuId, minhasEquipes],
  );

  const base = aba === "disponiveis" ? disponiveis : aba === "minhas" ? minhas : ordens;

  const filtered = useMemo(() => {
    const lista = base.filter((o) => {
      if (statusF !== "all" && o.status_id !== statusF) return false;
      if (urgF !== "all" && o.urgencia_id !== urgF) return false;
      if (setorF !== "all" && o.setor_id !== setorF) return false;
      if (q) {
        const s = q.toLowerCase();
        if (
          !o.titulo.toLowerCase().includes(s) &&
          !String(o.numero).includes(s) &&
          !(o.descricao ?? "").toLowerCase().includes(s)
        ) return false;
      }
      return true;
    });
    return [...lista].sort((a, b) => {
      const na = nivelUrgencia(urgMap.get(a.urgencia_id ?? "")?.nome);
      const nb = nivelUrgencia(urgMap.get(b.urgencia_id ?? "")?.nome);
      if (na !== nb) return nb - na;
      return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
    });
  }, [base, q, statusF, urgF, setorF, urgencias]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Ordens de Serviço</h1>
          <p className="text-sm text-muted-foreground">{filtered.length} de {base.length}</p>
        </div>
        <Button asChild><Link to="/ordens/nova">+ Nova OS</Link></Button>
      </div>

      <Tabs value={aba} onValueChange={(v) => setAba(v as Aba)}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="disponiveis">OS Disponíveis ({disponiveis.length})</TabsTrigger>
          <TabsTrigger value="minhas">Minhas OS ({minhas.length})</TabsTrigger>
          <TabsTrigger value="todas">Todas ({ordens.length})</TabsTrigger>
        </TabsList>
      </Tabs>

      <Card>
        <CardContent className="p-3 grid gap-2 md:grid-cols-[2fr_1fr_1fr_1fr]">
          <Input placeholder="Buscar por título, número ou descrição…" value={q} onChange={(e) => setQ(e.target.value)} />
          <Select value={statusF} onValueChange={setStatusF}>
            <SelectTrigger><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os status</SelectItem>
              {status.map((s) => <SelectItem key={s.id} value={s.id}>{s.nome}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={urgF} onValueChange={setUrgF}>
            <SelectTrigger><SelectValue placeholder="Urgência" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas urgências</SelectItem>
              {urgencias.map((u) => <SelectItem key={u.id} value={u.id}>{u.nome}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={setorF} onValueChange={setSetorF}>
            <SelectTrigger><SelectValue placeholder="Setor" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos setores</SelectItem>
              {setores.map((s) => <SelectItem key={s.id} value={s.id}>{s.nome}</SelectItem>)}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          <div className="divide-y">
            {filtered.length === 0 && (
              <div className="p-8 text-center text-sm text-muted-foreground">
                {aba === "disponiveis"
                  ? "Nenhuma OS disponível no momento."
                  : aba === "minhas"
                    ? "Você ainda não assumiu nenhuma OS."
                    : "Nenhuma OS encontrada."}
              </div>
            )}
            {filtered.map((o) => {
              const s = statusMap.get(o.status_id ?? "");
              const u = urgMap.get(o.urgencia_id ?? "");
              const set = setorMap.get(o.setor_id ?? "");
              const eq = eqMap.get(o.equipamento_id ?? "");
              const nivel = nivelUrgencia(u?.nome);
              return (
                <Link
                  key={o.id}
                  to="/ordens/$id"
                  params={{ id: o.id }}
                  className={`grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 p-3 hover:bg-muted/50 ${
                    nivel === 2 && !o.assumida_por ? "border-l-4 border-destructive bg-destructive/5" : ""
                  }`}
                >
                  <span className="font-mono text-xs text-muted-foreground shrink-0">#{o.numero}</span>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1 truncate font-medium">
                      {nivel === 2 && <AlertTriangle className="size-4 shrink-0 text-destructive" />}
                      {o.titulo}
                    </div>
                    <div className="truncate text-xs text-muted-foreground">
                      {set?.nome ?? "—"} · {eq?.nome ?? o.equipamento_nao_cadastrado ?? "—"} · {formatDateTime(o.created_at)}
                    </div>
                    <div className="truncate text-xs text-muted-foreground">
                      Em aberto há {tempoEmAberto(o.created_at, o.concluida_em)}
                      {o.assumida_por ? " · Assumida" : " · Aguardando técnico"}
                    </div>
                  </div>
                  <div className="flex flex-wrap justify-end gap-1 shrink-0">
                    {u && <Badge style={{ backgroundColor: u.cor, color: "white" }}>{u.nome}</Badge>}
                    {s && <Badge variant="outline" style={{ borderColor: s.cor, color: s.cor }}>{s.nome}</Badge>}
                  </div>
                </Link>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
