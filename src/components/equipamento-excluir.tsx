import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { AlertTriangle } from "lucide-react";
import { contarVinculosEquipamento, excluirEquipamentoDefinitivo } from "@/lib/equipamentos.functions";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  equipamentoId: string;
  nome: string;
}

type Vinculos = {
  ordens: number; custos: number; manutencoes: number; planos: number;
  historico: number; documentos: number; paradas: number; fotos: number;
};

const LABELS: Record<keyof Vinculos, string> = {
  ordens: "Ordens de serviço",
  custos: "Lançamentos de custo",
  manutencoes: "Manutenções periódicas",
  planos: "Planos preventivos",
  historico: "Registros de histórico",
  documentos: "Documentos e fotos anexadas",
  paradas: "Registros de parada",
  fotos: "Foto do cadastro",
};

export function EquipamentoExcluirDialog({ open, onOpenChange, equipamentoId, nome }: Props) {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const contar = useServerFn(contarVinculosEquipamento);
  const excluir = useServerFn(excluirEquipamentoDefinitivo);

  const [vinculos, setVinculos] = useState<Vinculos | null>(null);
  const [carregando, setCarregando] = useState(false);
  const [motivo, setMotivo] = useState("");
  const [senha, setSenha] = useState("");
  const [cienteIrreversivel, setCienteIrreversivel] = useState(false);
  const [cienteVinculos, setCienteVinculos] = useState(false);
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    if (!open) {
      setMotivo(""); setSenha(""); setCienteIrreversivel(false); setCienteVinculos(false); setVinculos(null);
      return;
    }
    setCarregando(true);
    contar({ data: { equipamento_id: equipamentoId } })
      .then((r) => setVinculos(r.vinculos as Vinculos))
      .catch((e: unknown) => toast.error(e instanceof Error ? e.message : "Falha ao verificar vínculos."))
      .finally(() => setCarregando(false));
  }, [open, equipamentoId]);

  const itens = vinculos ? (Object.keys(LABELS) as (keyof Vinculos)[]).filter((k) => vinculos[k] > 0) : [];
  const temVinculos = itens.length > 0;
  const podeExcluir =
    !salvando && motivo.trim().length >= 5 && senha.length > 0 && cienteIrreversivel && (!temVinculos || cienteVinculos);

  async function confirmar() {
    setSalvando(true);
    try {
      await excluir({ data: { equipamento_id: equipamentoId, senha, motivo } });
      toast.success("Equipamento excluído definitivamente.");
      onOpenChange(false);
      await qc.invalidateQueries({ queryKey: ["equipamentos"] });
      navigate({ to: "/equipamentos" });
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Não foi possível excluir o equipamento.");
    } finally {
      setSalvando(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="size-5" /> Excluir definitivamente
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3 text-sm">
          <div className="rounded-md border border-destructive/50 bg-destructive/10 p-3">
            <p className="font-medium">Esta ação é irreversível.</p>
            <p className="text-muted-foreground">
              O equipamento <strong>{nome}</strong> será removido permanentemente do banco de dados. Se quiser preservar
              todo o histórico, use a opção <strong>Desativar equipamento</strong>.
            </p>
          </div>

          <div className="rounded-md border p-3">
            <div className="mb-1 text-xs uppercase text-muted-foreground">Registros vinculados</div>
            {carregando && <div className="text-muted-foreground">Verificando…</div>}
            {!carregando && !temVinculos && <div className="text-muted-foreground">Nenhum registro vinculado.</div>}
            {!carregando && temVinculos && (
              <ul className="space-y-0.5">
                {itens.map((k) => (
                  <li key={k} className="flex justify-between gap-2">
                    <span>{LABELS[k]}</span>
                    <span className="font-medium">{vinculos![k]}</span>
                  </li>
                ))}
              </ul>
            )}
            {!carregando && temVinculos && (
              <p className="mt-2 text-xs text-muted-foreground">
                As ordens de serviço e os custos serão mantidos, mas ficarão desvinculados (identificados apenas pelo nome
                do equipamento). Histórico, paradas, documentos e planos preventivos serão apagados.
              </p>
            )}
          </div>

          <div>
            <Label className="text-xs">Motivo da exclusão *</Label>
            <Textarea value={motivo} onChange={(e) => setMotivo(e.target.value)} placeholder="Ex.: cadastro duplicado criado por engano" />
          </div>

          <div>
            <Label className="text-xs">Senha do Usuário Mestre *</Label>
            <Input type="password" value={senha} onChange={(e) => setSenha(e.target.value)} autoComplete="current-password" />
          </div>

          <label className="flex items-start gap-2">
            <Checkbox checked={cienteIrreversivel} onCheckedChange={(v) => setCienteIrreversivel(v === true)} />
            <span>Confirmo que entendo que a exclusão é definitiva e não pode ser desfeita.</span>
          </label>
          {temVinculos && (
            <label className="flex items-start gap-2">
              <Checkbox checked={cienteVinculos} onCheckedChange={(v) => setCienteVinculos(v === true)} />
              <span>Confirmo que estou ciente dos registros vinculados listados acima.</span>
            </label>
          )}
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button variant="destructive" disabled={!podeExcluir} onClick={confirmar}>
            {salvando ? "Excluindo…" : "Excluir definitivamente"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
