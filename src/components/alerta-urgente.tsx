import { useEffect, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Notificacao } from "@/lib/notificacoes";

/** Aviso prioritário na tela + alerta sonoro para OS extremamente urgentes não confirmadas. */
export function AlertaUrgente({ notificacoes }: { notificacoes: Notificacao[] }) {
  const criticas = notificacoes.filter((n) => n.prioridade === "extrema" && !n.confirmada_em);
  const [silenciado, setSilenciado] = useState(false);
  const tocado = useRef<string | null>(null);

  useEffect(() => {
    const atual = criticas[0];
    if (!atual || silenciado || tocado.current === atual.id) return;
    tocado.current = atual.id;
    try {
      const Ctx = (window.AudioContext || (window as any).webkitAudioContext) as typeof AudioContext | undefined;
      if (!Ctx) return;
      const ctx = new Ctx();
      const beep = (inicio: number) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "square";
        osc.frequency.value = 880;
        gain.gain.value = 0.08;
        osc.connect(gain).connect(ctx.destination);
        osc.start(ctx.currentTime + inicio);
        osc.stop(ctx.currentTime + inicio + 0.25);
      };
      [0, 0.4, 0.8].forEach(beep);
    } catch {
      /* som opcional */
    }
  }, [criticas, silenciado]);

  if (!criticas.length || silenciado) return null;
  const n = criticas[0]!;

  return (
    <div className="mb-4 rounded-lg border-2 border-destructive bg-destructive/10 p-4 animate-pulse">
      <div className="flex flex-wrap items-start gap-3">
        <AlertTriangle className="size-6 text-destructive shrink-0" />
        <div className="min-w-0 flex-1">
          <p className="font-bold text-destructive">{n.titulo}</p>
          <p className="text-sm whitespace-pre-line">{n.mensagem}</p>
          {criticas.length > 1 && (
            <p className="text-xs text-muted-foreground mt-1">+{criticas.length - 1} outro(s) alerta(s) crítico(s)</p>
          )}
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="destructive" asChild>
            <Link to="/notificacoes">Abrir e assumir</Link>
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setSilenciado(true)}>
            Silenciar agora
          </Button>
        </div>
      </div>
    </div>
  );
}
