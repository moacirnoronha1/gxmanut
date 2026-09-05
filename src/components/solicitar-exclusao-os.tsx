import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Trash2, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { solicitarExclusaoOS } from "@/lib/exclusao-os.functions";
import { exclusaoPendenteOSQuery } from "@/lib/exclusao-os";

export function SolicitarExclusaoOS({ osId, numero }: { osId: string; numero: number }) {
  const qc = useQueryClient();
  const solicitar = useServerFn(solicitarExclusaoOS);
  const { data: pendente } = useQuery(exclusaoPendenteOSQuery(osId));
  const [aberto, setAberto] = useState(false);
  const [motivo, setMotivo] = useState("");
  const [observacao, setObservacao] = useState("");
  const [enviando, setEnviando] = useState(false);

  if (pendente) {
    return (
      <Badge variant="outline" className="border-destructive text-destructive">
        <AlertTriangle className="mr-1 size-3" /> Exclusão pendente de aprovação
      </Badge>
    );
  }

  async function enviar() {
    setEnviando(true);
    try {
      await solicitar({ data: { os_id: osId, motivo, observacao: observacao || undefined } });
      toast.success("Solicitação enviada ao Usuário Mestre para aprovação.");
      setAberto(false);
      setMotivo("");
      setObservacao("");
      await qc.invalidateQueries({ queryKey: ["os_exclusao", osId] });
      await qc.invalidateQueries({ queryKey: ["os_exclusoes"] });
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Não foi possível enviar a solicitação.");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <Dialog open={aberto} onOpenChange={setAberto}>
      <Button variant="outline" className="w-full text-destructive" onClick={() => setAberto(true)}>
        <Trash2 className="size-4" /> Solicitar exclusão definitiva
      </Button>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Solicitar exclusão da OS #{numero}</DialogTitle>
          <DialogDescription>
            A exclusão definitiva só é feita após a aprovação do Usuário Mestre.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Motivo da exclusão *</Label>
            <Textarea
              rows={3}
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              placeholder="Ex.: OS aberta em duplicidade"
            />
          </div>
          <div>
            <Label>Observação</Label>
            <Textarea rows={2} value={observacao} onChange={(e) => setObservacao(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setAberto(false)}>
            Cancelar
          </Button>
          <Button disabled={enviando || motivo.trim().length < 5} onClick={enviar}>
            {enviando ? "Enviando…" : "Enviar solicitação"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
