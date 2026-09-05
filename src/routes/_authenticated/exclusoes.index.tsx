import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { exclusoesOSQuery, type SolicitacaoExclusaoOS } from "@/lib/exclusao-os";
import { aprovarExclusaoOS, rejeitarExclusaoOS } from "@/lib/exclusao-os.functions";
import { setoresQuery, equipamentosQuery, profilesQuery } from "@/lib/queries";
import { formatDateTime } from "@/lib/db-types";
import { useSessaoUsuario } from "@/lib/sessao";

export const Route = createFileRoute("/_authenticated/exclusoes/")({
  head: () => ({
    meta: [
      { title: "Solicitações de Exclusão — Manutenção Xica da Silva" },
      {
        name: "description",
        content: "Aprovação ou rejeição das solicitações de exclusão definitiva de ordens de serviço.",
      },
    ],
  }),
  component: Exclusoes,
});

function Exclusoes() {
  const { mestre, carregando } = useSessaoUsuario();
  const { data: pedidos = [] } = useQuery(exclusoesOSQuery());
  const { data: setores = [] } = useQuery(setoresQuery());
  const { data: equipamentos = [] } = useQuery(equipamentosQuery());
  const { data: profiles = [] } = useQuery(profilesQuery());

  if (carregando) return <div className="text-sm text-muted-foreground">Carregando…</div>;
  if (!mestre)
    return (
      <Card>
        <CardContent className="p-6 text-sm text-muted-foreground">
          Apenas o Usuário Mestre pode analisar solicitações de exclusão.
        </CardContent>
      </Card>
    );

  const pendentes = pedidos.filter((p) => p.status === "pendente");
  const decididos = pedidos.filter((p) => p.status !== "pendente");

  return (
    <div className="mx-auto max-w-4xl space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Solicitações de Exclusão</h1>
        <p className="text-sm text-muted-foreground">
          {pendentes.length} aguardando sua decisão.
        </p>
      </div>

      {pendentes.length === 0 && (
        <Card>
          <CardContent className="p-6 text-sm text-muted-foreground">
            Nenhuma solicitação pendente.
          </CardContent>
        </Card>
      )}

      {pendentes.map((p) => (
        <PedidoCard
          key={p.id}
          pedido={p}
          setor={setores.find((s) => s.id === p.ordens_servico?.setor_id)?.nome}
          equipamento={
            equipamentos.find((e) => e.id === p.ordens_servico?.equipamento_id)?.nome ??
            p.ordens_servico?.equipamento_nao_cadastrado ??
            undefined
          }
          usuario={
            profiles.find((u) => u.id === p.solicitado_por)?.nome_completo ??
            profiles.find((u) => u.id === p.solicitado_por)?.nome
          }
        />
      ))}

      {decididos.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Decisões anteriores</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {decididos.map((p) => (
              <div key={p.id} className="flex flex-wrap items-center gap-2 border-b pb-2 last:border-0">
                <span className="font-mono text-xs text-muted-foreground">OS #{p.os_numero}</span>
                <Badge variant={p.status === "aprovada" ? "destructive" : "outline"}>
                  {p.status === "aprovada" ? "Excluída" : "Rejeitada"}
                </Badge>
                <span className="text-xs text-muted-foreground">
                  {formatDateTime(p.decidido_em)}
                </span>
                {p.motivo_rejeicao && (
                  <span className="text-xs text-muted-foreground">— {p.motivo_rejeicao}</span>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function PedidoCard({
  pedido,
  setor,
  equipamento,
  usuario,
}: {
  pedido: SolicitacaoExclusaoOS;
  setor?: string;
  equipamento?: string;
  usuario?: string;
}) {
  const qc = useQueryClient();
  const aprovar = useServerFn(aprovarExclusaoOS);
  const rejeitar = useServerFn(rejeitarExclusaoOS);
  const [modo, setModo] = useState<"aprovar" | "rejeitar" | null>(null);
  const [senha, setSenha] = useState("");
  const [ciente, setCiente] = useState(false);
  const [motivoRejeicao, setMotivoRejeicao] = useState("");
  const [salvando, setSalvando] = useState(false);
  const os = pedido.ordens_servico;

  async function atualizar() {
    await qc.invalidateQueries({ queryKey: ["os_exclusoes"] });
    await qc.invalidateQueries({ queryKey: ["ordens_servico"] });
  }

  async function confirmarAprovacao() {
    setSalvando(true);
    try {
      await aprovar({ data: { solicitacao_id: pedido.id, senha } });
      toast.success(`OS #${pedido.os_numero} excluída definitivamente.`);
      setModo(null);
      setSenha("");
      setCiente(false);
      await atualizar();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Não foi possível excluir a OS.");
    } finally {
      setSalvando(false);
    }
  }

  async function confirmarRejeicao() {
    setSalvando(true);
    try {
      await rejeitar({ data: { solicitacao_id: pedido.id, motivo: motivoRejeicao } });
      toast.success("Solicitação rejeitada.");
      setModo(null);
      setMotivoRejeicao("");
      await atualizar();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Não foi possível rejeitar a solicitação.");
    } finally {
      setSalvando(false);
    }
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex flex-wrap items-center gap-2 text-base">
          <span className="font-mono text-sm text-muted-foreground">OS #{pedido.os_numero}</span>
          {os && (
            <Link to="/ordens/$id" params={{ id: os.id }} className="text-primary underline">
              {os.titulo}
            </Link>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        <dl className="grid grid-cols-2 gap-2">
          <Item label="Data da OS" valor={formatDateTime(os?.data_ocorrencia ?? os?.created_at)} />
          <Item label="Solicitante da OS" valor={os?.solicitante_nome ?? "—"} />
          <Item label="Equipamento" valor={equipamento ?? "—"} />
          <Item label="Setor" valor={setor ?? "—"} />
          <Item label="Pedido por" valor={usuario ?? "—"} />
          <Item label="Pedido em" valor={formatDateTime(pedido.created_at)} />
        </dl>
        <div>
          <div className="text-xs uppercase text-muted-foreground">Motivo</div>
          <div className="whitespace-pre-wrap">{pedido.motivo}</div>
          {pedido.observacao && (
            <div className="mt-1 whitespace-pre-wrap text-muted-foreground">{pedido.observacao}</div>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="destructive" onClick={() => setModo("aprovar")}>
            APROVAR EXCLUSÃO
          </Button>
          <Button variant="outline" onClick={() => setModo("rejeitar")}>
            REJEITAR EXCLUSÃO
          </Button>
        </div>
      </CardContent>

      <Dialog open={modo === "aprovar"} onOpenChange={(v) => !v && setModo(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="size-5" /> ATENÇÃO
            </DialogTitle>
            <DialogDescription>
              Esta ação excluirá definitivamente a Ordem de Serviço e seus dados relacionados. Essa
              operação não poderá ser desfeita.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <label className="flex items-start gap-2 text-sm">
              <Checkbox checked={ciente} onCheckedChange={(v) => setCiente(v === true)} />
              <span>
                Confirmo a exclusão definitiva da OS #{pedido.os_numero} e de todos os seus
                registros (histórico, comentários, anexos, custos e equipe).
              </span>
            </label>
            <div>
              <Label>Senha do Usuário Mestre *</Label>
              <Input
                type="password"
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
                autoComplete="current-password"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setModo(null)}>
              Cancelar
            </Button>
            <Button
              variant="destructive"
              disabled={salvando || !ciente || !senha}
              onClick={confirmarAprovacao}
            >
              {salvando ? "Excluindo…" : "CONFIRMAR EXCLUSÃO DEFINITIVA"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={modo === "rejeitar"} onOpenChange={(v) => !v && setModo(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rejeitar exclusão da OS #{pedido.os_numero}</DialogTitle>
          </DialogHeader>
          <div>
            <Label>Motivo da rejeição *</Label>
            <Textarea
              rows={3}
              value={motivoRejeicao}
              onChange={(e) => setMotivoRejeicao(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setModo(null)}>
              Cancelar
            </Button>
            <Button disabled={salvando || motivoRejeicao.trim().length < 3} onClick={confirmarRejeicao}>
              {salvando ? "Salvando…" : "Rejeitar exclusão"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

function Item({ label, valor }: { label: string; valor?: string | null }) {
  return (
    <div>
      <dt className="text-xs uppercase text-muted-foreground">{label}</dt>
      <dd className="font-medium">{valor || "—"}</dd>
    </div>
  );
}
