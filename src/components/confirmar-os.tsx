import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { BellRing } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { confirmarNotificacao, assumirOS } from "@/lib/push.functions";
import { formatDateTime } from "@/lib/db-types";

/** Confirmação de recebimento e "assumir" para OS urgentes/extremas abertas pela notificação. */
export function BarraConfirmacaoOS({ osId, urgencia }: { osId: string; urgencia?: string | null }) {
  const qc = useQueryClient();
  const confirmar = useServerFn(confirmarNotificacao);
  const assumir = useServerFn(assumirOS);
  const nome = (urgencia ?? "").toLowerCase();
  const extrema = nome.includes("extrem");
  const urgente = extrema || (nome.includes("urgente") && !nome.includes("não") && !nome.includes("nao"));

  const { data } = useQuery({
    queryKey: ["os-alerta", osId],
    queryFn: async () => {
      const { data: u } = await supabase.auth.getUser();
      const os = await supabase
        .from("ordens_servico")
        .select("confirmada_em, assumida_em, assumida_por, profiles:assumida_por(nome, nome_completo)")
        .eq("id", osId)
        .maybeSingle();
      const notif = u.user
        ? await supabase
            .from("notificacoes")
            .select("id")
            .eq("os_id", osId)
            .eq("user_id", u.user.id)
            .is("confirmada_em", null)
            .limit(1)
            .maybeSingle()
        : { data: null };
      return { os: os.data as any, notificacaoId: (notif.data as any)?.id as string | undefined };
    },
  });

  if (!urgente || !data?.os) return null;
  const { os, notificacaoId } = data;

  return (
    <div className={`rounded-lg border p-3 ${extrema ? "border-destructive bg-destructive/10" : "bg-muted/40"}`}>
      <div className="flex flex-wrap items-center gap-3">
        <BellRing className={`size-5 ${extrema ? "text-destructive" : ""}`} />
        <div className="min-w-0 flex-1 text-sm">
          {os.assumida_por ? (
            <span>
              Assumida por <strong>{os.profiles?.nome_completo ?? os.profiles?.nome ?? "usuário"}</strong> em{" "}
              {formatDateTime(os.assumida_em)}.
            </span>
          ) : os.confirmada_em ? (
            <span>Recebimento confirmado em {formatDateTime(os.confirmada_em)}.</span>
          ) : (
            <span>{extrema ? "OS extremamente urgente aguardando alguém assumir." : "OS urgente aguardando confirmação do técnico."}</span>
          )}
        </div>
        <div className="flex gap-2">
          {!os.confirmada_em && (
            <Button
              size="sm"
              onClick={async () => {
                if (notificacaoId) await confirmar({ data: { id: notificacaoId } });
                else await supabase.from("ordens_servico").update({ confirmada_em: new Date().toISOString() }).eq("id", osId);
                qc.invalidateQueries();
                toast.success("Recebimento confirmado.");
              }}
            >
              CONFIRMAR RECEBIMENTO
            </Button>
          )}
          {extrema && !os.assumida_por && (
            <Button
              size="sm"
              variant="destructive"
              onClick={async () => {
                const r = await assumir({ data: { osId } });
                qc.invalidateQueries();
                if ((r as any).jaAssumida) toast.info("Esta OS já foi assumida.");
                else toast.success("Você assumiu esta OS.");
              }}
            >
              ASSUMIR ESTA OS
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
