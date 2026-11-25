import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Clock } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useSessaoUsuario } from "@/lib/sessao";
import {
  expedienteConfigQuery,
  formatarHoraCurta,
  estaForaDoExpediente,
} from "@/lib/expediente";
import { showDbError } from "@/lib/db-error";

export function ConfigExpediente() {
  const qc = useQueryClient();
  const { mestre, perfil } = useSessaoUsuario();
  const { data: config } = useQuery(expedienteConfigQuery());

  const [ativo, setAtivo] = useState(true);
  const [horaInicio, setHoraInicio] = useState("06:00");
  const [horaFim, setHoraFim] = useState("22:00");
  const [mensagem, setMensagem] = useState("");
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    if (!config) return;
    setAtivo(config.ativo);
    setHoraInicio(formatarHoraCurta(config.hora_inicio));
    setHoraFim(formatarHoraCurta(config.hora_fim));
    setMensagem(config.mensagem);
  }, [config]);

  if (!mestre) return null;

  const bloqueadoAgora = estaForaDoExpediente(config);

  async function salvar(e: React.FormEvent) {
    e.preventDefault();
    if (!horaInicio || !horaFim) {
      toast.error("Informe os horários de início e fim do expediente.");
      return;
    }
    if (horaInicio === horaFim) {
      toast.error("O horário de início e de fim não podem ser iguais.");
      return;
    }
    const msgLimpa = mensagem.trim();
    if (!msgLimpa) {
      toast.error("Informe a mensagem exibida fora do expediente.");
      return;
    }

    setSalvando(true);
    const { error } = await supabase
      .from("expediente_config")
      .update({
        ativo,
        hora_inicio: `${horaInicio}:00`,
        hora_fim: `${horaFim}:00`,
        mensagem: msgLimpa,
        atualizado_em: new Date().toISOString(),
        atualizado_por: perfil?.id ?? null,
      })
      .eq("id", 1);
    setSalvando(false);

    if (error) return showDbError(error);
    await qc.invalidateQueries({ queryKey: ["expediente_config"] });
    toast.success("Trava de horário de expediente salva.");
  }

  return (
    <Card className="md:col-span-2">
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle className="flex items-center gap-2">
            <Clock className="size-4" /> Trava de horário de expediente
          </CardTitle>
          <span className="text-xs text-muted-foreground">
            {!ativo
              ? "Desativada"
              : bloqueadoAgora
                ? "Bloqueio ativo agora (Mestre liberado)"
                : "Dentro do expediente"}
          </span>
        </div>
        <CardDescription>
          Bloqueia o acesso da equipe fora do horário definido (horário de Brasília). O Usuário
          Mestre mantém acesso livre em qualquer horário.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={salvar} className="space-y-4">
          <div className="flex items-center justify-between rounded-md border p-3">
            <div>
              <div className="text-sm font-medium">Ativar trava fora do expediente</div>
              <div className="text-xs text-muted-foreground">
                Bloqueia o sistema das {horaFim} às {horaInicio} para todos, exceto o Usuário Mestre.
              </div>
            </div>
            <Switch
              checked={ativo}
              onCheckedChange={setAtivo}
              aria-label="Ativar trava fora do expediente"
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="exp-inicio">Início do expediente (libera acesso)</Label>
              <Input
                id="exp-inicio"
                type="time"
                required
                value={horaInicio}
                onChange={(e) => setHoraInicio(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="exp-fim">Fim do expediente (bloqueia acesso)</Label>
              <Input
                id="exp-fim"
                type="time"
                required
                value={horaFim}
                onChange={(e) => setHoraFim(e.target.value)}
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="exp-msg">Mensagem exibida na tela de bloqueio</Label>
            <Textarea
              id="exp-msg"
              rows={2}
              required
              value={mensagem}
              onChange={(e) => setMensagem(e.target.value)}
            />
          </div>
          <div className="flex justify-end">
            <Button type="submit" disabled={salvando}>
              {salvando ? "Salvando..." : "Salvar horário de expediente"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}