import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Check, CheckCheck, Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { minhasNotificacoesQuery, type Notificacao } from "@/lib/notificacoes";
import { confirmarNotificacao, assumirOS } from "@/lib/push.functions";
import { supabase } from "@/integrations/supabase/client";
import { formatDateTime } from "@/lib/db-types";

export const Route = createFileRoute("/_authenticated/notificacoes/")({
  head: () => ({
    meta: [
      { title: "Central de notificações — Manutenção Xica da Silva" },
      { name: "description", content: "Acompanhe alertas de OS urgentes, manutenções periódicas e pendências em atraso." },
      { property: "og:title", content: "Central de notificações" },
      { property: "og:description", content: "Alertas de OS urgentes, manutenções periódicas e pendências em atraso." },
    ],
  }),
  component: Central,
});

function Central() {
  const qc = useQueryClient();
  const { data: notifs = [] } = useQuery(minhasNotificacoesQuery());
  const confirmar = useServerFn(confirmarNotificacao);
  const assumir = useServerFn(assumirOS);
  const [aba, setAba] = useState("nao_lidas");

  const grupos = useMemo(
    () => ({
      nao_lidas: notifs.filter((n) => !n.lida_em),
      lidas: notifs.filter((n) => !!n.lida_em),
      urgentes: notifs.filter((n) => n.prioridade !== "normal"),
      manutencoes: notifs.filter((n) => n.tipo === "mp_proxima"),
      atrasadas: notifs.filter((n) => n.tipo === "mp_atrasada"),
      historico: notifs,
    }),
    [notifs],
  );

  async function marcar(n: Notificacao, campo: "lida" | "nao_lida" | "resolvida") {
    const agora = new Date().toISOString();
    const patch =
      campo === "lida" ? { lida_em: agora } : campo === "nao_lida" ? { lida_em: null } : { resolvida_em: agora, lida_em: agora };
    const { error } = await supabase.from("notificacoes").update(patch).eq("id", n.id);
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["notificacoes"] });
  }

  async function marcarTodas() {
    const agora = new Date().toISOString();
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) return;
    await supabase.from("notificacoes").update({ lida_em: agora }).eq("user_id", u.user.id).is("lida_em", null);
    qc.invalidateQueries({ queryKey: ["notificacoes"] });
  }

  return (
    <div className="space-y-4 max-w-3xl">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl font-bold">Central de notificações</h1>
          <p className="text-sm text-muted-foreground">{grupos.nao_lidas.length} não lida(s)</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={marcarTodas}>
            <CheckCheck className="size-4" /> Marcar todas como lidas
          </Button>
          <Button size="sm" asChild>
            <Link to="/configuracoes/notificacoes">Configurar</Link>
          </Button>
        </div>
      </div>

      <Tabs value={aba} onValueChange={setAba}>
        <TabsList className="flex flex-wrap h-auto">
          <TabsTrigger value="nao_lidas">Não lidas ({grupos.nao_lidas.length})</TabsTrigger>
          <TabsTrigger value="lidas">Lidas</TabsTrigger>
          <TabsTrigger value="urgentes">Urgentes</TabsTrigger>
          <TabsTrigger value="manutencoes">Manutenções</TabsTrigger>
          <TabsTrigger value="atrasadas">Atrasadas</TabsTrigger>
          <TabsTrigger value="historico">Histórico</TabsTrigger>
        </TabsList>
        {Object.entries(grupos).map(([key, lista]) => (
          <TabsContent key={key} value={key} className="space-y-2">
            {lista.map((n) => (
              <Card key={n.id} className={n.prioridade === "extrema" ? "border-destructive" : undefined}>
                <CardContent className="p-3 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        {n.prioridade === "extrema" && <Badge variant="destructive">EXTREMA</Badge>}
                        {n.prioridade === "urgente" && <Badge className="bg-amber-500 text-white">URGENTE</Badge>}
                        {!n.lida_em && <Badge variant="secondary">nova</Badge>}
                        <span className="font-semibold">{n.titulo}</span>
                      </div>
                      <p className="text-sm whitespace-pre-line text-muted-foreground">{n.mensagem}</p>
                      <p className="text-xs text-muted-foreground mt-1">{formatDateTime(n.created_at)}</p>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {n.url && (
                      <Button size="sm" variant="outline" asChild onClick={() => marcar(n, "lida")}>
                        <a href={n.url}>Abrir</a>
                      </Button>
                    )}
                    {n.os_id && !n.confirmada_em && (
                      <Button
                        size="sm"
                        onClick={async () => {
                          await confirmar({ data: { id: n.id } });
                          qc.invalidateQueries({ queryKey: ["notificacoes"] });
                          toast.success("Recebimento confirmado.");
                        }}
                      >
                        CONFIRMAR RECEBIMENTO
                      </Button>
                    )}
                    {n.os_id && n.prioridade === "extrema" && (
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={async () => {
                          const r = await assumir({ data: { osId: n.os_id! } });
                          qc.invalidateQueries({ queryKey: ["notificacoes"] });
                          if ((r as any).jaAssumida) toast.info("Esta OS já foi assumida por outro usuário.");
                          else toast.success("Você assumiu esta OS. Alertas encerrados.");
                        }}
                      >
                        ASSUMIR ESTA OS
                      </Button>
                    )}
                    <Button size="sm" variant="ghost" onClick={() => marcar(n, n.lida_em ? "nao_lida" : "lida")}>
                      <Check className="size-4" /> {n.lida_em ? "Marcar como não lida" : "Marcar como lida"}
                    </Button>
                    {!n.resolvida_em && (
                      <Button size="sm" variant="ghost" onClick={() => marcar(n, "resolvida")}>
                        Resolvida
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
            {!lista.length && (
              <div className="flex flex-col items-center gap-2 py-10 text-muted-foreground">
                <Bell className="size-8" />
                <p className="text-sm">Nenhuma notificação aqui.</p>
              </div>
            )}
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
