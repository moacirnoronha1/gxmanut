import { Clock, LogOut } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  type ExpedienteConfig,
  formatarHoraCurta,
  obterHoraAtualNoFuso,
} from "@/lib/expediente";

interface Props {
  config: ExpedienteConfig;
  agora: Date;
  nomeUsuario: string;
  onSignOut: () => void;
}

export function BloqueioExpediente({ config, agora, nomeUsuario, onSignOut }: Props) {
  const { formatada } = obterHoraAtualNoFuso(agora, config.timezone);
  const inicio = formatarHoraCurta(config.hora_inicio);
  const fim = formatarHoraCurta(config.hora_fim);

  return (
    <div className="min-h-screen grid place-items-center bg-muted/40 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center space-y-2">
          <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-muted">
            <Clock className="size-6 text-muted-foreground" />
          </div>
          <CardTitle className="text-xl">Sistema fora do expediente</CardTitle>
          <CardDescription>
            Manutenção Xica da Silva · Horário de funcionamento: {inicio} às {fim}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 text-center">
          <p className="text-sm text-foreground">{config.mensagem}</p>
          <div className="rounded-md bg-muted px-3 py-2 text-xs text-muted-foreground space-y-1">
            <div>
              Horário atual (Brasília): <span className="font-semibold text-foreground">{formatada}</span>
            </div>
            <div>
              Período bloqueado: <span className="font-semibold text-foreground">{fim} às {inicio}</span>
            </div>
            <div>Usuário conectado: {nomeUsuario}</div>
          </div>
          <Button variant="outline" className="w-full" onClick={onSignOut}>
            <LogOut className="size-4" /> Sair do sistema
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}